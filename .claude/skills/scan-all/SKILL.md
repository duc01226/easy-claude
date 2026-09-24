---
name: scan-all
version: 1.0.0
description: '[Documentation] Use when refreshing all selected and evidence-applicable reference-doc scan targets.'
---

## Quick Summary

**Goal:** Discover and refresh selected, evidence-applicable built-in targets and explicitly generic custom reference docs without assuming every project has every capability.

**Workflow:**

1. **Validate** — Require a schema-valid project-config file with a non-empty `project.name`.
2. **Resolve** — Read always-on inputs separately and resolve the effective task-specific `referenceDocs` selection.
3. **Filter** — Resolve exact built-in targets, selected generic custom docs, and manually owned docs; verify capability evidence for each scan.
4. **Scan** — Run eligible targets in parallel only when their output write sets are disjoint.
5. **Verify** — Check every result and skip; clear stale status only after all required owners are current; run the AI-discovery gate across the refreshed set.
6. **Summarize** — Report refreshed, unchanged, skipped, blocked, and manual docs with evidence.

**Key Rules:**

- The registered targets are an option catalog, not a required scan list.
- `referenceDocs` absent resolves to no task-specific docs for a minimal project, adding only refs supported by config/repository evidence. An explicit array, including `[]`, is exact.
- `lessons.md` and the docs index are project-init-owned always-on context inputs; they are outside task-specific selection.
- Each built-in scanner writes only its manifest `doc`. A custom doc defaults to manual ownership; only `scanTarget: "generic"` opts it into an evidence-based generic scan. Never infer a built-in target from a basename.
- The generic scanner writes only the exact selected filename and uses its configured `purpose` and optional `sections`. Generic docs receive conservative non-disposable repository-wide impact routing; manual docs are not auto-scanned, freshness-tracked, or impact-routed.
- Optional capabilities that are not evidenced are skipped with the checked config/source evidence.
- Scans update reference documentation only. Graph work or any broader setup is conditional on project capability and a separate owner.

## When to Use

- Staleness gate blocks prompts ("BLOCKED: Reference docs are stale")
- First time initializing reference documentation for a content-bearing project
- Periodic refresh when codebase has changed significantly
- User runs `/scan-all` manually

## When to Skip

- Empty/greenfield project without evidenced capabilities; project-init handles its always-on context and no capability scans run.
- No selected applicable docs are stale and project-init-owned always-on inputs are current.

## Execution

### 1. Validate and resolve config

Resolve the configured project-config file through `.claude/hooks/lib/project-config-loader.cjs` (default `docs/project-config.json`). Require a valid schema and non-empty `project.name`; repair a missing or invalid file through project initialization before scanning. Optional capability sections may be omitted. A declared incomplete or unsupported section blocks the run.

Use `.claude/hooks/lib/session-init-helpers.cjs` to resolve the effective `referenceDocs` selection; do not copy the full registry into this skill:

- When `referenceDocs` is absent, the resolver supplies only the portable baseline and capability references supported by config/repository evidence. A minimal project with no evidenced capability resolves to no task-specific references.
- When `referenceDocs` is an explicit array, including `[]`, the array is the exact task-specific selection.
- The always-on `lessons.md` and docs-index inputs are owned by project initialization and remain outside this selection. Confirm those inputs through their owner; do not append them to task-specific work.

### 2. Map selected docs to targets

Read `.claude/skills/scan/references/targets.md`. Resolve each selected filename exactly. Built-in filenames use only their framework-owned manifest target; a custom filename with `scanTarget: "generic"` uses `/scan --target=generic-reference-doc --filename="<filename>"`; a custom filename with no target or `scanTarget: "manual"` remains under curated project ownership. Resolve the containing root from `docsRoots.projectReference.path` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it).

- Custom `referenceDocs` entries require `filename` and `purpose`, with optional `sections`, `templatePath`, and `scanTarget`. Config validation rejects unknown targets and unsafe paths; runtime path resolution also rejects physical symlink escapes.
- Registered targets are optional capabilities. Apply each entry's `applies when` and `skip when` evidence before launching it. Config can select a scan or guide source search, but source examples and patterns must still be verified.
- If a selected built-in target's capability is absent, report `SKIPPED` with the config/source paths checked. Do not create a placeholder or claim the doc is refreshed. Generic scans use only their configured purpose and selected output; manual docs are not scan candidates.
- Do not launch `ui-system` alongside its child targets. `scan-all` selects individual docs from the effective list; an explicitly routed UI orchestration can fan out only to applicable children.
- Deduplicate identical targets. Targets with different owned output docs may run in parallel; shared output owners run once.

### 3. Run and verify

For each eligible built-in or generic target, invoke its exact scan command and accept only its evidence-backed result. Generic targets include their configured filename. A scan can finish as `UPDATED`, `UNCHANGED`, `SKIPPED`, or `BLOCKED`; preserve the target report and surface every non-complete status.

Check the exact selected outputs and the always-on owner inputs. Clear `.claude/.scan-stale` only after the selected automatically scannable docs are current and project-init-owned inputs are confirmed; skipped or stale docs keep the result open. Manual docs do not enter the automated freshness gate. Use the owner helper only after this check:

```bash
node -e "require('./.claude/hooks/lib/session-init-helpers.cjs').refreshScanStaleFlag()"
```

Each changed scan output follows its target's enhancement rule. Verify that enhancement in the scan result; do not run a second hardcoded enhancement list or rewrite unchanged/skipped docs.

**AI-discovery gate across the set (`SYNC:ai-discovery-doc-quality`).** Per-doc quality belongs to each scan; this run checks what no single scan sees: the docs index and root context route to every refreshed or selected doc through a `read <path> when <situation>` trigger, no route points at a missing or not-applicable doc, and no selected doc is an orphan. A routing gap is fixed by the docs-index target scan, or — for the root context — a `referenceDocs` entry via `/project-config` followed by `/ai-context-refresh`, never by hand-editing generated output.

## Optional Graph Refresh

A graph is not a universal scan prerequisite. If the project config and repository show a supported code graph is part of this project, run its owning graph workflow when the graph is stale or the setup explicitly requests refresh. Otherwise report graph work as not applicable; never block documentation scans on an absent graph.

## Summary Output

Report each selected target with its status, output path, and evidence-backed reason. List always-on inputs checked, manual docs left to their owner, and any blocked stale gate. Do not claim all docs are refreshed when optional targets were skipped or unselected.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:output-quality-principles -->

> **Output Quality** — Token efficiency without sacrificing quality.
>
> 1. No inventories/counts — AI can `grep | wc -l`. Counts go stale instantly
> 2. No directory trees — AI can `glob`/`ls`. Use 1-line path conventions
> 3. No TOCs — AI reads linearly. TOC wastes tokens
> 4. No examples that repeat what rules say — one example only if non-obvious
> 5. Lead with answer, not reasoning. Skip filler words and preamble
> 6. Sacrifice grammar for concision in reports
> 7. Unresolved questions at end, if any

<!-- /SYNC:output-quality-principles -->

<!-- SYNC:ai-discovery-doc-quality -->

> **AI-Discovery Doc Quality** — Applies to every doc an AI agent reads to do its job: root instruction files (`CLAUDE.md`, `AGENTS.md`) and their templates, project-reference docs, the docs index, `lessons.md`, and prompt/protocol registries. Such a doc is a routing prompt: the agent must find the right fact fast and never miss a critical rule. Doc layouts differ per project — resolve roots from project config (framework default as fallback) and discover docs by glob; never assume a fixed file set.
>
> 1. **Top (primacy):** the first screen states the doc's purpose, when to read it, and its 1–3 most critical rules — before any detail.
> 2. **Bottom (recency):** a long doc (roughly >150 lines) or one carrying MUST/NEVER rules ends with closing reminders that repeat the goal and those critical rules.
> 3. **Navigate with triggers:** point to another doc as `read <path> when <situation>`, never a bare link or "see also". A root or index doc routes every question/task class to one doc; every AI-read doc is reachable from the root or index — no orphans.
> 4. **Existing targets only:** glob-verify every referenced path and drop dead rows; name a not-applicable doc once as a skip, never as a route.
> 5. **One owner per fact:** state a fact where it is owned and route elsewhere with a trigger. Generated sections and mirrors are fixed at their source (generator, template, config) and regenerated — never hand-edited.
> 6. **Token-efficient:** apply `/prompt-enhance` principles — compress prose, lead with the answer, no counts/trees/TOCs an agent can derive (unless a repository-owned check or ADR requires them, e.g. `<!-- COUNT:… -->` markers), one example per non-obvious rule. Never compress code, tables, paths, commands or evidence; never lower rule density.
> 7. **Truncating readers:** when a host reads only a byte budget, place routing and irreversible-action guardrails first and measure their offsets.
>
> **Final gate (each changed doc, before reporting done):** purpose + critical rules on the first screen · reminders at the end when long · every cross-doc pointer has a trigger and an existing target · no orphan doc · hand-owned doc enhanced with `/prompt-enhance` unless the owning skill records a documented skip (e.g. a stamp/count-only edit, or the user asked for no enhance); a generated doc → enhance its source or template, then regenerate. Surgical: apply to what the change touched plus the top/bottom anchors — never a license to rewrite a whole doc.

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

<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** follow output quality rules: no counts/trees/TOCs, rules > descriptions, 1 example per pattern, primacy-recency anchoring.

<!-- /SYNC:output-quality-principles:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-discovery-doc-quality:reminder -->

**MUST ATTENTION** AI-read docs: purpose + critical rules on top, closing reminders at the bottom when long; route to other docs as `read <path> when <situation>` with existing targets only, no orphan docs, N/A named once as a skip; token-efficient per `/prompt-enhance`; fix generated docs at their source; run the final gate on every changed doc.

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

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries) — MUST ATTENTION honor each canonical body:**

- **Critical Thinking:** MUST ATTENTION traced `file:line` proof per claim, confidence >80% to act.
- **Output Quality:** MUST ATTENTION no counts/trees/TOCs, rules over prose, primacy-recency anchoring.
- **AI-Discovery Doc Quality:** MUST ATTENTION the docs index and root context route every refreshed doc by trigger; no orphan, dead or not-applicable route.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
