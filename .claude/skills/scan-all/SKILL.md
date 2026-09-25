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

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-discovery-doc-quality` — Keep AI-read docs discoverable: rules first, routed pointers, closing reminders; writing a doc that an agent reads → .claude/skills/shared/protocols/ai-discovery-doc-quality.md
- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `output-quality-principles` — Token-efficient output without losing quality; writing generated docs or reports → .claude/skills/shared/protocols/output-quality-principles.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md

<!-- PROTOCOL-GUIDES:END -->

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
