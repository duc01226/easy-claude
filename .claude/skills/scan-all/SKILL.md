---
name: scan-all
version: 1.0.0
description: '[Documentation] Use when refreshing every selected, evidence-applicable reference-doc scan target at once. One doc: scan; first-time setup: docs-manager --mode=init.'
---

## Quick Summary

**Goal:** Refresh selected, evidence-applicable built-in and explicitly generic custom reference docs while preserving truthful freshness and project ownership.

**Summary:** Resolve config and exact selection → classify ownership and capability → run disjoint scans → reconcile results and freshness → report. Keep always-on inputs separate; unsupported capabilities and manual docs receive explicit dispositions. Graph refresh remains conditional.

**Workflow:**

1. **Validate** — Support absent config; validate present config and use the runtime evidence-based resolver.
2. **Resolve** — Read always-on inputs separately and resolve the effective task-specific `referenceDocs` selection.
3. **Filter** — Resolve exact built-in targets, selected generic custom docs, and manually owned docs; verify capability evidence for each scan.
4. **Scan** — Run eligible targets in parallel only when their output write sets are disjoint.
5. **Summarize** — Report refreshed, unchanged, skipped, blocked, and manual docs with evidence.

**Key Rules:**

- Treat the target registry as options, never a required scan list; explicit `referenceDocs` arrays, including `[]`, are exact.
- Keep project-init-owned lessons/index inputs separate and custom docs manual unless explicitly `scanTarget: "generic"`.
- Write reference docs only; broader setup and graph work have separate owners. Scan only evidenced capabilities and exact outputs; clear staleness only after verification.

## When to Use or Skip

Use for a reference-doc staleness gate, initial reference population in a content-bearing project, periodic refresh after significant changes, or an explicit `/scan-all` request. First-time project setup belongs to `/docs-manager --mode=init`.

Skip capability scans for empty/greenfield projects without evidence; project-init handles always-on inputs. Skip the run when no selected applicable docs are stale and always-on inputs are current.

## Execution

### 1. Validate and resolve config

Resolve config through `.claude/hooks/lib/project-config-loader.cjs` (default `docs/project-config.json`). Absent config uses portable defaults and repository evidence. Present config needs a valid schema and non-empty `project.name`; omitted optional capabilities are allowed, but declared incomplete/unsupported sections block until repaired.

Resolve effective `referenceDocs` through `.claude/hooks/lib/session-init-helpers.cjs`, never by copying the registry:

- Absent selection: evidence-supported baseline/capabilities only; a minimal project may resolve to no task-specific docs.
- Explicit array, including `[]`: exact task-specific selection.
- Project-init-owned `lessons.md` and docs-index inputs: confirm through their owner, separately from task-specific work.

### 2. Map selected docs to targets

**Target registry** owns filename mapping, custom-doc safety and capability gates. Read `.claude/skills/scan/references/targets.md` when mapping selected docs; resolve every filename exactly. Built-in filenames use only their framework-owned manifest target; never infer a built-in target from a custom basename; a custom filename with `scanTarget: "generic"` uses `/scan --target=generic-reference-doc --filename="<filename>"`; a custom filename with no target or `scanTarget: "manual"` remains under curated project ownership. Resolve the containing root from `docsRoots.projectReference.path` in `docs/project-config.json` (default `docs/project-reference/`).

- Custom `referenceDocs` entries require `filename` and `purpose`, with optional `sections`, `templatePath`, and `scanTarget`. Config validation rejects unknown targets and unsafe paths; runtime path resolution also rejects physical symlink escapes.
- [BLOCKING] Before launching a built-in target, read the head of `.claude/skills/scan/references/targets/<key>.md` (its `applies when` and `skip when` lines) and apply its gate; the index is insufficient. Config guides selection/search, but source examples and patterns still require verification.
- If a selected built-in target's capability is absent, report `SKIPPED` with the config/source paths checked. Do not create a placeholder or claim the doc is refreshed. Generic scans use their configured `purpose` and optional `sections`, write only that exact filename, and retain conservative non-disposable repository-wide impact routing. Manual docs are not scanned, freshness-tracked or impact-routed.
- Do not launch `ui-system` alongside its child targets. `scan-all` selects individual docs from the effective list; an explicitly routed UI orchestration can fan out only to applicable children.
- Record one coverage-ledger disposition per exact selected output: eligible, manual, skipped or blocked. Reconcile the union of assignments against that set, including nested/boundary paths; `[]` creates no task-specific scans. Deduplicate identical targets. Run disjoint output owners in parallel and shared owners once.

### 3. Run and verify

For each eligible built-in or generic target, invoke its exact scan command and accept only its evidence-backed result. Generic targets include their configured filename. A scan can finish as `UPDATED`, `UNCHANGED`, `SKIPPED`, or `BLOCKED`; preserve the target report and surface every non-complete status.

Reconcile every selected output against returned reports at the all-return barrier before dependent writes. Check final content-value/semantic-retention reviews after enhancement, baseline reconciliation and truthful operation stamps. Check the exact selected outputs and the always-on owner inputs. Clear `.claude/.scan-stale` only after the selected automatically scannable docs are current and project-init-owned inputs are confirmed; skipped or stale docs keep the result open. Manual docs do not enter the automated freshness gate. Use the owner helper only after this check:

```bash
node -e "require('./.claude/hooks/lib/session-init-helpers.cjs').refreshScanStaleFlag()"
```

Each changed output follows its target's enhancement rule; verify it in the returned result. Do not run a second enhancement list or rewrite unchanged/skipped docs.

## Optional Graph Refresh

A graph is not a universal scan prerequisite. If the project config and repository show a supported code graph is part of this project, run its owning graph workflow when the graph is stale or the setup explicitly requests refresh. Otherwise report graph work as not applicable; never block documentation scans on an absent graph.

## Summary Output

Report each selected target with its status, output path, and evidence-backed reason. List always-on inputs checked, manual docs left to their owner, and any blocked stale gate. Do not claim all docs are refreshed when optional targets were skipped or unselected.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `output-quality-principles` — Useful, readable guidance without lost conditions; writing generated docs or reports → .claude/skills/shared/protocols/output-quality-principles.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** lead with useful guidance and readable priorities; preserve action-changing conditions/numbers and required structures. Remove report bulk from guides, use verified discovery, and judge semantic value rather than word or warning counts.

<!-- /SYNC:output-quality-principles:reminder -->


## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Refresh selected, evidence-applicable built-in and explicitly generic custom reference docs while preserving truthful freshness and project ownership.

**IMPORTANT MUST ATTENTION Main steps:** resolve config/selection → classify ownership/capability → run disjoint scans → reconcile results/freshness → report; refresh a graph only through its conditional owner.

- Keep exact selection and always-on inputs separate; custom docs default to manual ownership.
- Read each target's applicability header; use evidence rather than catalog membership.
- Reconcile every output and target quality gate before refreshing the stale flag; retain skips/blockers.
- Track tasks before work, cite `file:line` evidence (>80% confidence to act), and finish with a consistency review. Search 3+ fitting patterns before creating code.

| Evasion | Required action |
| --- | --- |
| "Selected means applicable" | Verify the target's capability gate against config and source. |
| "All agents returned, so clear staleness" | Reconcile each output, enhancement/retention review, operation stamp and always-on input first. |
