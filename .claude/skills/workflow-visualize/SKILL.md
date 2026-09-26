---
name: workflow-visualize
version: 1.0.0
description: "[Workflow] Use when creating Excalidraw diagrams from codebase investigation or web research."
disable-model-invocation: false
---

## Quick Summary

**Goal:** Produce an Excalidraw diagram that accurately depicts its subject: this codebase (`--mode=codebase`, default) or an external topic researched on the web (`--mode=knowledge`). Every drawn element traces to evidence, and the rendered image passes the render-view-fix loop.

**Use it when** someone asks to visualize, diagram or draw a flow, architecture, concept or research finding and wants a durable `.excalidraw` file. **Use a sibling instead** for a written explanation with no diagram (`/investigate`), or for a cited written report (`workflow-research`).

**IMPORTANT MANDATORY Steps:** resolve the `workflow-visualize` manifest variant first, then create one task per returned occurrence (default: /investigate -> /excalidraw-diagram -> /workflow-end -> /watzup).

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

Activate with `/start-workflow workflow-visualize`, passing the user's prompt as context.

## Mode & Size Triage (first action)

Record the result in the workflow report.

| Axis | Values                                                                                                                                                 | Effect                                                                                                                                                                                                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mode | **codebase**: the subject lives in this project · **knowledge**: an external subject                                                                   | `codebase` runs `/investigate → /excalidraw-diagram`. `knowledge` runs `/web-research → /deep-research (optional) → /excalidraw-diagram`. Ask only when the subject is genuinely ambiguous.                                                                                                               |
| Size | **Small**: one flow, one component, or a few named files · **Medium**: one module or feature slice · **Large**: a multi-module system or a broad topic | Small: a focused investigation inline, one diagram. Medium: a traced investigation (graph trace when `.code-graph/graph.db` exists), one comprehensive diagram built section by section. Large: agree on the cut first (overview plus drill-downs), then one diagram per cut, each with its own evidence. |
| Risk | The diagram will guide design decisions or onboarding                                                                                                  | Trace every relationship end to end and state uncertainty on the canvas instead of drawing a guess.                                                                                                                                                                                                       |

## Required Quality Gates

| Gate                      | Evidence that proves it                                                                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fidelity                  | Every labeled element and relationship maps to evidence recorded in the workflow report: `file:line` in codebase mode, a cited source in knowledge mode. Nothing is drawn from assumption; unverified parts are marked as such. |
| Rendered and validated    | `/excalidraw-diagram` render-view-fix loop passed: PNG rendered, read, audited against the design, and fixed until the vision and defect checks pass.                                                                           |
| Conventions               | Palette and element templates from the `excalidraw-diagram` references; output path per that skill (or the path the user named).                                                                                                |
| Run closed (`run-closed`) | `/workflow-end` ran last.                                                                                                                                                                                                       |

## Recommended Skills

| Skill                 | Role                 | When it earns its cost                                                                                                                                                                                                                                                                                                | Proves / feeds                                       |
| --------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `/investigate`        | core (codebase)      | Always in codebase mode; depth per size.                                                                                                                                                                                                                                                                              | Traced structure and flow with `file:line` evidence. |
| `/web-research`       | core (knowledge)     | Always in knowledge mode.                                                                                                                                                                                                                                                                                             | Tiered source map.                                   |
| `/deep-research`      | optional (knowledge) | The diagram must depict mechanisms, data or relationships that the web-research source map does not already establish from Tier 1-2 sources. Skip reason: The web-research source map already establishes every element and relationship the diagram depicts from Tier 1-2 sources, so no source deep-dive is needed. | Source-level evidence for the depicted detail.       |
| `/excalidraw-diagram` | core                 | Always.                                                                                                                                                                                                                                                                                                               | The diagram and its render-view-fix record.          |
| `/workflow-end`       | gate                 | Always, last.                                                                                                                                                                                                                                                                                                         | `run-closed`.                                        |
| `/watzup`             | core                 | Always.                                                                                                                                                                                                                                                                                                               | Handoff with the diagram path and its evidence map.  |

## Orchestration

You choose inline vs sub-agent and batching to minimize wall-clock and tokens at equal quality. Small subjects run inline. For large subjects, independent drill-down investigations can run as one parallel wave of read-only sub-agents, then feed the diagram step.

Fixed data dependencies: evidence is gathered before the diagram depicts it; the render-view-fix loop runs on the final JSON; `/workflow-end` runs last.

## Memory & Reporting

- Create one task per resolved occurrence. `/excalidraw-diagram` expands its own phases under the parent row.
- Create the workflow report FIRST at `tmp/reports/workflow-visualize-{YYMMDD}-{HHmm}-{slug}.md`: mode, triage, resolver fingerprint, the evidence map (element → `file:line` or source), render iterations, and deviations. Append after each step.
- After compaction, re-read `TaskList` and the workflow report before continuing.

## Fix Path

- A fidelity defect found at any point (an element with no evidence, a relationship the trace contradicts) is fixed at its source: re-trace or re-research the gap, then correct the diagram JSON and re-render.
- The render-view-fix loop is owned by `/excalidraw-diagram` (usually 2–4 iterations). When it stops converging, report the remaining defects and escalate via `AskUserQuestion` instead of shipping a broken render.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** an `.excalidraw` diagram whose every element traces to evidence and whose rendered image passed the render-view-fix loop.

- **MUST ATTENTION** resolve the mode and triage the subject size FIRST; the size sets investigation depth and whether the output splits into several diagrams.
- **MUST ATTENTION** record an evidence map (element → `file:line` or cited source). NEVER draw a relationship from assumption; mark what is unverified.
- **MUST ATTENTION** finish only after `/excalidraw-diagram`'s render-view-fix loop passes on the final JSON.
- **MUST ATTENTION Variant closure:** record the resolved mode, resolver fingerprint, ordered occurrence IDs, render/validation results and every deviation before `/workflow-end`.

**Protocols in force (digest; the guide entries above point to the full text):** Nested Task Creation · Critical Thinking · AI Mistake Prevention · Incremental Persistence · Sub-Agent Return Contract · Session Goal Ledger · Workflow Registry Binding.
