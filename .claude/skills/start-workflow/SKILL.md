---
name: start-workflow
version: 1.0.0
description: '[Skill Management] Use when starting a detected workflow, initializing workflow state, or activating a workflow sequence.'
---

## Quick Summary

**Goal:** Detect intent, auto-select the direct/skill/workflow/custom route, then activate the canonical contract with a complete TaskCreate plan.

**Summary:** Use the static catalog only for route selection, then resolve the exact canonical workflow mode through the shared manifest resolver—including non-empty `preActions.injectContext`—before creating tasks on both Claude and Codex, with or without hooks. Persist the resolver fingerprint and occurrence IDs with the run so resume cannot silently switch modes or sequences.

**Workflow:**

1. **Detect** — Execute explicit `/workflow-*` or `/start-workflow <id>` directly; otherwise match prompt against workflow catalog and skill list
2. **Auto-select** — Choose direct execution, a skill, a standard workflow, or a custom pipeline without asking the user to pick the path
3. **Activate** — Resolve the selected mode/output to a complete canonical manifest (ordered occurrence IDs, skill/args, applicability, barriers, fingerprint and context); create ALL TaskCreate items for the selected occurrences; materialize every declared `parallelGroups` group as a wave; mark first `in_progress`

**Key Rules:**

- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.

- MUST ATTENTION auto-select the best execution path for ordinary prompts. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
- Explicit `/workflow-*` or `/start-workflow <id>` invocation counts as the user choosing that workflow; execute it directly.
- Propose Custom Pipeline when no catalog workflow is a strong fit (>80% steps relevant = use catalog)
- `workflows.json` `workflows` field is an **OBJECT** — use `workflows[workflowId]`, NEVER `.find()` or `[index]`; resolve `variants[mode]` through `.claude/scripts/lib/workflow-manifest.cjs`
- Create ALL `TaskCreate` items BEFORE marking the first task `in_progress` — batch creation, then execute
- Read the selected manifest's `occurrences` and `parallelGroups` at activation and tag its member tasks as one wave — 1:1 occurrence tasks still stand (a group never collapses members into one task)
- No `parallelGroups` = `sequence` is the order — surface only adjacent read-only steps as a `Candidate wave`, NEVER a wave that contradicts `sequence`
- NEVER mark a task `completed` without invoking its `Skill` tool, except when the selected canonical `preActions.injectContext` explicitly authorizes an evidence-backed conditional skip — use `in_progress` → cited comment → `completed`; never delete the task
- ALWAYS check context for `## Workflow Catalog` first (Tier 1), then load and resolve the complete selected canonical entry (Tier 2) before TaskCreate for EVERY standard workflow. `preActions.injectContext` is required execution context, not optional hook output; this rule applies to Claude and Codex with or without hooks. Never expose the full `workflows.json` to context
- EVERY workflow entry MUST have a non-empty `preActions.injectContext`; a missing or blank value is catalog drift and blocks activation
- If another workflow is active, it auto-switches (ends current, starts new) — no manual cleanup needed

**NOT for:** Manual step execution (follow TaskCreate items), workflow design (use `plan`), catalog management.

**Related:** `/start-workflow <workflowId>` | Catalog: host-specific static workflow-catalog surfaces derived from `.claude/workflows.json` (no router/tracker hooks)

---

## Custom Pipeline Option

When the prompt doesn't cleanly match a single catalog workflow — or combining steps from multiple workflows serves the request better — the AI MAY propose a **Custom Pipeline** alongside the catalog option.

### When to propose

| Condition                                    | Example                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| No catalog workflow matches well             | "Review hook changes and update skill docs" — spans review + docs                    |
| Best-match has significant unnecessary steps | Quick investigate + fix, but `workflow-bugfix` includes full TDD + integration cycle |
| Prompt combines 2+ workflow domains          | "Audit performance and write integration tests for the slow query"                   |
| User explicitly requests a step sequence     | "Just run investigate, plan, and feature-implement — nothing else"                         |

**Do NOT propose** when a catalog workflow is a strong match (>80% of its steps are relevant). Catalog workflows encode validated best-practice sequences — prefer them.

### How to build

1. **Valid steps only** — Use only canonical step ids — those appearing in a resolved workflow manifest's `occurrences` (legacy `sequence` entries are normalized by the resolver; variant entries are selected by mode). Each maps to a real `.claude/skills/<step>/SKILL.md` and is invoked with the active host's syntax. No invented step names.
2. **Logical order** — Investigate → Plan → Implement → Test. Never reverse dependency order.
3. **Minimal** — Include only steps the prompt needs. No "just in case" additions.
4. **Name it** — Short descriptive name: "Quick Fix + Docs", "Audit + Test Coverage".

### How to present (AskUserQuestion format)

Show full step sequences for ALL options so the user compares scope:

```
Option A — Activate "Bug Fix" workflow (Recommended)
  Steps: /investigate → /debug-investigate → /plan → /fix → /prove-fix → /test → ...

Option B — Custom Pipeline: "Quick Fix + Docs"
  Steps: /investigate → /fix → /docs-update
  Rationale: Prompt targets a known location — full TDD cycle is over-engineered here.

```

**Rules:**

- Always show full step list per option
- One-sentence AI rationale for the custom pipeline
- Catalog workflow = "(Recommended)" unless custom pipeline confidence is clearly higher
- NEVER present custom pipeline as the only option — always include the catalog option
- For project-specific architecture, test, documentation, naming, or workflow rules, read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`; keep this reusable start-workflow protocol generic.

### Task creation for Custom Pipeline

Same 1:1 protocol — one `TaskCreate` per step. Use `[Custom]` prefix to distinguish from catalog tasks:

```
TaskCreate: subject="[Custom] {step-name} — {brief description}", description="Custom pipeline step N/{total}.", activeForm="Executing {step-name}"
```

---

## Workflow Lookup — Tier 1 Selection, Tier 2 Execution

Use Tier 1 to select every route. Use Tier 2 before TaskCreate for EVERY standard workflow to materialize the complete selected-mode execution contract, including ordered `occurrences`, non-empty `preActions.injectContext`, `parallelGroups`, and the resume `fingerprint`. Static catalogs are route-selection aids only; hooks may accelerate this read but are never required.

### Tier 1: Context (FREE — no file reads)

The workflow catalog is already present in static host context — derived into `CLAUDE.md`, `AGENTS.md`, and Codex context rather than injected by a hook. Its headings and row grammar vary by host.

1. Search the available catalog surface for the exact workflow ID: `{workflowId}`.
2. Use its name and `whenToUse` summary only to confirm the route.
3. Do NOT parse a static catalog sequence or command syntax for TaskCreate; Tier 1 is route selection only for every standard workflow.

✅ Use Tier 1 for: route selection only.
⚠️ Tier 2 is required immediately after selection and **before TaskCreate for every standard workflow**. The complete canonical entry resolves the requested `--mode`/`--output`, loads ordered `occurrences`, non-empty `preActions.injectContext`, `parallelGroups`, and a `fingerprint`.

### Tier 2: Complete Canonical Entry Read (JSON-aware)

After Tier 1 identifies any standard workflow, use this selected-entry read before creating tasks. The static catalog is a route-selection aid; the selected canonical entry remains the execution contract:

```
node .claude/scripts/codex/read-workflow-entry.mjs <workflowId> [--mode <mode> | --output <mode>]
```

This JSON-aware helper resolves the complete selected manifest and prints the parent entry plus `mode`, `fingerprint`, `occurrences`, `sequence`, `parallelGroups`, and `stepMeta`. It accepts the exact Tier-1-selected workflow ID and mode as data arguments; it does not interpolate them into a shell command.
Parse: the returned `occurrences` array → one stable occurrence ID, skill and opaque args per task; `applicability` → exact run/skip condition and cited skip reason; `parallelGroups` → all-return waves; `fingerprint` → the run/resume identity; and non-empty `preActions.injectContext` → workflow-level execution input. Invoke each skill with the active host's command syntax.

### Tier 3: Missing Entry (stop)

If the JSON-aware lookup cannot return the exact selected entry, stop and report catalog drift or a missing canonical workflow. Do not fall back to a fixed-context grep, and do not expose the full file to context.

---

## After Activation — Task Creation Protocol (ZERO TOLERANCE)

**Active-goal resolution (BEFORE child task creation):** resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` — active plan `goal.md`, else `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`, else create one from the current user request using `.claude/templates/goal-contract-template.md`. Record the resolved goal path and pass it to every child step/sub-agent so the whole workflow executes against the same saved success criteria. The workflow may end only when the goal's Goal Satisfaction matrix passes or a blocker is escalated.

**Owned-baseline capture (BEFORE child task creation):** create a run-scoped metadata baseline with
`.claude/scripts/lib/workflow-baseline.cjs capture` (or its equivalent API) before any step runs. Capture
the starting HEAD, index identity, tracked/untracked status metadata, selected mode, manifest
fingerprint, goal path, and an explicit empty/approved ownership scope. Do not read or hash repository
content at activation. A nested workflow inherits the parent run ID and may expand ownership only
through an explicit `claim`; it never claims all current dirty files by default. Optional before-images
require an approved regular UTF-8 path and the bounded policy (≤256 KiB/file, ≤2 MiB/run, ≤64 files)
in a user-private OS temp directory; otherwise remain metadata-only.

FIRST action after activation: create EXACTLY one `TaskCreate` for EACH entry in the selected manifest's `occurrences` array. The task subject carries the stable occurrence ID; the task description carries the resolved skill, opaque args, applicability and workflow fingerprint. Persist the run ID, mode, fingerprint and ordered occurrence IDs with the task ledger before marking the first task `in_progress`.

### How to read `workflows.json` — CRITICAL SCHEMA

**`workflows.json` is a JSON OBJECT, not an array.** Most common AI mistake.

```
{
  "settings":       { ... },
  "workflows":      { <workflowId>: WorkflowEntry }   ← OBJECT, keyed by ID
}
```

**Lookup algorithm:**

```
workflow = workflows[workflowId]           // key lookup — NOT .find(), NOT [index]
manifest = resolveWorkflowManifest(workflowsDoc, workflowId, { mode })
occurrences = manifest.occurrences      // ordered stable IDs + skill + opaque args
invocation = resolveActiveHostSyntax(occurrence.skill, occurrence.args)
```

**WorkflowEntry fields:**

| Field            | Type     | Notes                                                                                     |
| ---------------- | -------- | ----------------------------------------------------------------------------------------- |
| `name`           | string   | Display name                                                                              |
| `sequence`       | (legacy) string[] or explicit occurrence[] | Ordered compatibility input; normalized by the resolver |
| `variants`       | object   | Complete named mode/output entries; each variant owns its full occurrence list             |
| `defaultMode`    | string   | Required when `variants` exists; names the default variant                                  |
| `whenToUse`      | string   | Natural language intent matching                                                          |
| `preActions`     | object   | **Required** — non-empty `injectContext`; optional `readFiles`                           |
| `parallelGroups` | object[] | Optional all-return barrier groups — `{id, members: occurrence IDs[], barrier:true, conditionalMembers[]}` |

**FORBIDDEN (common mistakes):**

```
// ❌ WRONG
workflows.find(w => w.id === workflowId)
workflows[0]

// ✅ CORRECT
workflows[workflowId]
Object.keys(workflows)   // list all IDs
```

### Task creation steps

1. **Tier 1 first (no file read):** search the available static catalog surface for `{workflowId}` only to select the route.
2. **Tier 2 required before TaskCreate for every standard workflow:** `node .claude/scripts/codex/read-workflow-entry.mjs <workflowId> [--mode <mode> | --output <mode>]` → treat the complete selected manifest's `occurrences`, non-empty `preActions.injectContext`, `parallelGroups`, `applicability`, and `fingerprint` as canonical. If the static preview differs, stop and report catalog drift rather than choosing one silently.
3. **Apply selected-workflow pre-actions to task context:** preserve the selected entry's `preActions.injectContext` as workflow-level execution context. For every conditional step it governs, put the exact run condition and evidence-backed skip transition in that task's description; never infer or drop a predicate because the static catalog rendered only a step name.
4. Create one `TaskCreate` per selected manifest occurrence IN ORDER; persist the manifest fingerprint and ordered occurrence IDs in the workflow run record before the first step starts.

> See **Workflow Lookup — Token-Efficient (3-Tier Strategy)** above for full lookup rules and fallback chain.

**Task format:**

```
TaskCreate: subject="[Workflow] {step-name} — {brief description}", description="Workflow step N/{total}. {conditional note}", activeForm="Executing {step-name}"
```

**Rules (NON-NEGOTIABLE):**

- **1:1 mapping** — each selected occurrence entry = exactly one task, even when the skill repeats with different args. No consolidation, no invented tasks.
- **Conditional steps still get tasks** — add the exact canonical run condition and evidence-backed skip transition to the description; when the selected canonical `preActions.injectContext` authorizes that skip, it may complete without a Skill invocation after the cited comment. Never use a generic skip label.
- **Selected-workflow pre-actions are mandatory execution input** — after Tier 1 selects any standard workflow, Tier 2 must load its non-empty `preActions.injectContext` before TaskCreate. A conditional step's task description must state its canonical run condition and evidence-backed skip transition.
- **Recursive self-calls get tasks** — e.g., `[Workflow] /workflow-review-changes — Recursive re-review (conditional)`
- **Count verification** — after creation: `task count == len(manifest.occurrences)` and the ordered task occurrence IDs exactly equal the manifest IDs. Fix mismatch before proceeding.

### Resume and mode-integrity contract

Persist a small run record before executing the first occurrence:

```json
{
  "workflow": "workflow-id",
  "mode": "selected-mode",
  "fingerprint": "manifest sha256",
  "occurrenceIds": ["stable-id-1", "stable-id-2"],
  "status": "active"
}
```

On resume, resolve the workflow again with the recorded mode/output and compare the new fingerprint
and ordered occurrence IDs before restoring task state. A changed fingerprint, missing occurrence,
or changed order invalidates the prior run and stops activation; never silently resume the old task
list or fall back to the default mode. Record the mismatch and require a fresh activation. A
conditionally skipped occurrence is still recorded as `skipped` with its canonical reason and counts
as returned for any barrier.

### Parallel waves from `parallelGroups` (compute at activation, BEFORE the first task runs)

A workflow MAY declare barrier groups in `parallelGroups` (schema: `.claude/workflows.schema.json` → `WorkflowEntry.parallelGroups`; live example: `workflow-review-changes`, groups `initial-reviews` and `reviewers`). Materialize each declared group as a wave IN THE TASK LIST, so the barrier is visible in the tasks and not only in prose.

1. **Read `parallelGroups` alongside `occurrences`.** Tier 1 (`## Workflow Catalog` in `CLAUDE.md`) renders members FLAT and carries no group data. Tier 2's JSON-aware selected-manifest lookup supplies barrier member occurrence IDs with the ordered list.
2. **Expand any barrier token you were given.** The Codex mirrors (`AGENTS.md`, `.codex/CODEX_CONTEXT.md`) collapse a group into ONE `[parallel ⇉ all-return barrier: a, b*]` token (`*` = conditional member). That token is a barrier marker, NOT a step — expand it back to its member steps and create one task per member.
3. **Task count is still `len(manifest.occurrences)`.** A group NEVER collapses its members into a single task; it only adds wave metadata to the member tasks.
4. **Tag each member task** — subject `[Workflow] [wave: {groupId}] /{step} — {brief description}`, description `Workflow step N/{total}. Parallel group '{groupId}' — spawned together with {other members}; barrier: advance only after ALL members return. {conditional note}`.
5. **Conditional members still get their own task** — add "Conditional — a skipped member still counts as returned for the barrier"; skip via `in_progress` → comment → `completed`, never delete.
6. **Execute a group as ONE wave** — spawn every member in ONE message, barrier on all returns, then advance to the first step after the group. That next step is a SEQ boundary: never start it — and never start any code-mutating step — while a member is still in flight.
7. **Malformed group → STOP, do not repair.** An occurrence ID absent from the selected manifest, an occurrence in two groups, or `barrier ≠ true` means the workflow definition is broken: report it and run the occurrence list strictly in order rather than guessing the intended grouping.

### When a workflow declares NO `parallelGroups`

`sequence` is the source of truth. Absence of `parallelGroups` is NOT permission to invent groups.

- **NEVER** reorder, merge, drop, or co-schedule steps in any way that contradicts `sequence` — no self-authored wave may run a step ahead of a step that precedes it in `sequence`, and a workflow's fixed order overrides any independence you infer.
- **DO surface a candidate wave** when adjacent steps are obviously independent — ALL of: (a) contiguous in `sequence`, (b) read-only / report-producing (review, scan, investigation, research — each writes only its own `tmp/reports/` file), (c) neither consumes the other's output. Announce it as `Candidate wave (not declared): [...]` and keep the 1:1 tasks unchanged.
- **NEVER** put in a candidate wave: any step that writes source files, any gate awaiting user approval, any step consuming a previous step's output, or any non-adjacent pair. When in doubt → run sequentially; a wrong wave silently reorders the workflow, a missed wave only costs time.
- **Persist what proves right** — if a candidate wave was correct, tell the user to add a `parallelGroups` entry to `.claude/workflows.json` (never edit it mid-run). An undeclared wave must never become the de-facto sequence.

Create ALL tasks first → then `TaskUpdate` first task to `in_progress`.

---

## Step Execution Protocol

Per required (non-skipped) step: `TaskUpdate in_progress` → **invoke `Skill` tool** → complete skill → `TaskUpdate completed`.

- Completing a task without invoking its `Skill` tool = **workflow violation**, except for a conditionally skipped task explicitly authorized by the selected canonical pre-action, which may complete without invoking its Skill tool after its cited comment
- Validation gates (`/plan-validate`, `/plan-review`, `/why-review`) MUST use explicit evidence and local project protocol — NEVER auto-approve inferred decisions. Explicit user approval in the prompt may satisfy the gate only when the gate's skill permits it.
- To skip a conditionally authorized step: `TaskUpdate in_progress` → cited comment "Skipped — {reason}" → `TaskUpdate completed` without invoking its Skill tool. Never delete.

---

## Workflow-in-Workflow Gate (HARD GATE)

Some workflow steps ARE themselves full workflows. The DEFAULT for a step that activates a multi-step workflow is sub-agent delegation — running it inline causes the parent session to absorb the entire nested workflow's tool calls, file reads, and sub-agent reports (context overflow on long sequences). The sub-agent runs the nested workflow in isolation and returns ONLY a `SYNC:subagent-return-contract` summary (full findings to `tmp/reports/`).

**Default protocol (sub-agent delegation) for a nested-workflow step:**

1. NEVER invoke via inline `Skill` tool call
2. Spawn via `Agent` tool with the appropriate `subagent_type`
3. Agent prompt must include: current git diff context + feature/task description
4. Sub-agent runs the full nested workflow in its isolated context
5. Return ONLY SYNC:subagent-return-contract summary — write full findings to `tmp/reports/`
6. Main agent reads the full `tmp/reports/` file before synthesis, acceptance, deduplication, or repair planning, including every severity and all findings beyond the envelope cap. The bounded envelope limits transport, never report consumption.

**EXCEPTION — `workflow-review-changes` runs INLINE in the main session (never a sub-agent):**

| Step                       | Workflow activated        | Execution mode                  | Why                                                                                          |
| -------------------------- | ------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------- |
| `/workflow-review-changes` | `workflow-review-changes` | **INLINE — main session agent** | Its Step 0 `/goal` gate binds the session Stop hook + its step-15 re-review is inline by design; a sub-agent cannot own the Stop hook, so delegating it silently breaks the unabandonable review→fix→re-review loop. Context stays bounded because its OWN step 2 and steps 4–10 reviewers are sub-agents writing to `tmp/reports/`. |

When `/workflow-review-changes` appears in any workflow sequence (e.g. `workflow-feature`, `workflow-bugfix`, `workflow-refactor`), invoke it via the `Skill` tool INLINE — do NOT spawn it as an `Agent` sub-agent.

> The ⚠️ **[WORKFLOW-IN-WORKFLOW GATE]** is model-driven: apply it (default sub-agent, or the `workflow-review-changes` inline exception) yourself whenever the next step activates a nested workflow — no hook emits this warning.

---

**IMPORTANT MANDATORY Steps:** detect-workflow -> analyze-best-match -> auto-select-execution-path -> activate-workflow -> create-task-tracking -> execute-sequence

**IMPORTANT MANDATORY Steps:** detect-workflow -> analyze-best-match -> auto-select-execution-path -> activate-workflow -> create-task-tracking -> execute-sequence

> **[MANDATORY]** `TaskCreate` FIRST — break every workflow into tasks before any action. NEVER skip.
> **[MANDATORY]** Auto-select the best path for auto-detected workflows; do not use `AskUserQuestion` for workflow-selection confirmation. Explicit workflow invocation executes directly.
> **[MANDATORY]** `Skill` tool REQUIRED for every non-skipped step. The sole exception is an evidence-backed conditional skip explicitly authorized by the selected canonical `preActions.injectContext`.

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
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, `plans/`, `team-artifacts/`, or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:incremental-persistence -->

> **Incremental Result Persistence** — MANDATORY for every visual-artifact review and for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `tmp/reports/{skill}-{date}-{slug}.md` and record Run ID, Task ID, Attempt ID, target scope, and target fingerprint. When visual artifacts are in scope, also record their ordered inventory and total; identify each screenshot, image, photo, or snapshot by path/name plus state and viewport when known.
> 2. **Checkpoint each review unit:** After each file or section, append findings, evidence, changed paths, and gaps immediately. For visual artifacts, open exactly ONE artifact, inspect it, and append its record BEFORE opening the next artifact. Each record includes artifact identity, state/viewport, inspection status, observations, severity-tagged issues with evidence, an explicit `none` when no issue exists, and any gap. NEVER batch multiple visual artifacts into one later write and never hold their findings in memory.
> 2a. **Resume from disk:** Treat the report's artifact records as the progress ledger. After interruption or context loss, read the report, derive processed and remaining artifacts from the ordered inventory, and continue at the first unprocessed artifact without duplicating completed records.
> 3. **Delegated return:** A sub-agent emits only the structured `SYNC:subagent-return-contract` envelope with exact totals, salient Critical/High findings (maximum ten), current attempt, and `Full report:` path. **Inline user-facing output:** Preserve the skill's requested explanation or teaching, with links to the persisted evidence; the delegated transport limit does not replace that deliverable. Do not paste a full review report into an envelope.
> 4. **Parent synthesis from persisted evidence:** The main agent reads the full report for synthesis, acceptance, deduplication, and repair planning — not only when a named blocker exists. For visual review, reconcile the ordered inventory against the artifact records before concluding; a missing record is incomplete review, never a clean result. Preserve all severities beyond the transport cap.
> 5. **Read-only boundary:** A read-only leaf may write its report/repair proposal but MUST NOT edit source, generated output, or user data; the parent/owner performs repairs after acceptance.
> 6. **Advancement gate:** The parent records `ACCEPTED` for the current Attempt ID only after reconciling target, totals, gaps, and changed paths; stale or late attempts cannot advance dependent work.
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings, and a large image set makes a final batch write especially fragile. Each per-unit disk write survives compaction. Partial results are better than no results, while explicit identity prevents a late result or a resumed image from being mistaken for the current run.
>
> **Report naming:** `tmp/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

<!-- /SYNC:incremental-persistence -->

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY the structured envelope below. Main agent reads the envelope first, then opens the referenced report for synthesis, acceptance, deduplication, or repair planning; a full report is never pasted inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
> Run ID: [stable run identifier]
> Task ID: [parent task or phase identifier]
> Attempt ID: [monotonic attempt/revision identifier]
> Target: [exact files/paths or scope] @ [target fingerprint/commit]
> Changed paths: [none | exact paths]
> Finding totals: Critical=[n] | High=[n] | Medium=[n] | Low=[n]
> Acceptance: PENDING | ACCEPTED | REJECTED — parent records the decision
>
> ### Findings (Critical/High surfaced — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Gaps / Unverified
>
> - [missing host, runtime, coverage, or evidence limitation]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description, or `none`]
>
> Full report: tmp/reports/[skill-name]-[date]-[slug].md
> ```
>
> The ten-bullet limit is a transport limit, not a visibility limit: the full report may contain more than ten Medium/Low findings when no named blocker exists, and the parent MUST read it when synthesizing or deduplicating. The parent MUST reject a stale, duplicate, or superseded `Attempt ID` and MUST accept the current attempt before advancing a dependent step. Read-only leaves write repair proposals/reports only; they do not edit source, generated carriers, or user files.
>
> **Context budget** — the return payload is a SUMMARY, not a transcript: no raw file contents / full diffs / verbatim logs inline, no re-pasted source. Everything beyond the envelope lives in the incrementally-written report. A sub-agent that would exceed the summary shape MUST persist the detail and return only the pointer; bounded transport must never become bounded visibility.

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `Agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `tmp/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

<!-- /SYNC:parallel-subagent-dispatch -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Detect intent, auto-select the direct/skill/workflow/custom route, then activate the canonical contract with a complete TaskCreate plan.

**IMPORTANT MUST ATTENTION — Main steps (execute in order, NEVER skip/merge):** detect workflow or route → analyze the best match → auto-select direct/skill/standard/custom execution → load Tier 1 catalog context and Tier 2 complete canonical selected-mode manifest (`occurrences`, non-empty `preActions.injectContext`, `parallelGroups`, `fingerprint`) → create exactly one task per occurrence → materialize declared waves and barriers → execute the occurrence list with Skill invocation, evidence-backed conditional skips, and synchronized task status.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced `file:line` proof, confidence >80%; NEVER present guess as fact.
- **Incremental Persistence:** append findings to report per file; NEVER hold in memory.
- **Sub-Agent Return Contract:** sub-agents return summary only; NEVER inline full output.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**MUST ATTENTION** auto-select the best path for ordinary prompts; explicit `/workflow-*` or `/start-workflow <id>` invocation executes directly. Do not ask for workflow-selection confirmation.
**MUST ATTENTION** `workflows` is an OBJECT — `workflows[workflowId]`, NEVER `.find()` / `[index]` / `.forEach()`
**MUST ATTENTION** create ALL `TaskCreate` items for the full sequence BEFORE marking the first task `in_progress`
**MUST ATTENTION** never mark a task `completed` without invoking its `Skill` tool, except an evidence-backed conditional skip explicitly authorized by selected canonical `preActions.injectContext` — cite comment + completed, never delete
**MUST ATTENTION** custom pipeline steps must be canonical step ids (each maps to a real `.claude/skills/<step>/SKILL.md`) — never invent step names
**MUST ATTENTION** use Tier 1 context selection FIRST, then Tier 2 JSON-aware complete canonical-entry read before TaskCreate for EVERY standard workflow — resolve the selected mode and load `occurrences`, non-empty `preActions.injectContext`, `parallelGroups`, and `fingerprint`; never use fixed-context grep output
**MUST ATTENTION** every executable workflow entry must carry a non-empty `preActions.injectContext`; missing context is catalog drift and blocks activation. This is host- and hook-independent.
**MUST ATTENTION** materialize every declared `parallelGroups` group as a wave in the task list — one task per member, wave-tagged, spawned in ONE message, all-return barrier before the next step — why: a barrier that lives only in prose gets executed one step at a time
**MUST ATTENTION** no `parallelGroups` → `sequence` IS the order — never invent a group that contradicts it; only adjacent read-only steps may be surfaced as a `Candidate wave (not declared)` — why: a self-authored wave silently reorders a validated workflow, and that costs more than the time it saves

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
