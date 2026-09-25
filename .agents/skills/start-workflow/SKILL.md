---
name: start-workflow
description: '[Skill Management] Use when starting a detected workflow, initializing workflow state, or activating a workflow sequence.'
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->
## Codex Project-Reference Loading (Hook-Independent)

Claude and Codex use static project-reference loading as the authority; hooks may accelerate discovery but never replace the explicit read.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**
- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$ai-context-refresh`) before ordinary project-specific work. A full `$sync-codex` run preflights `CLAUDE.md`; a completed `$ai-context-refresh` run may invoke the standalone runner with `--skip=claude-md` after final source edits. Markerless roots need AI smart-merge unless `portability.requireUniversalGuides: false` is explicit.

**Situation-based docs** (pick by the phase you are about to enter — plan/investigate, edit, test, spec/doc, review — and read only docs the project selects in `referenceDocs` that exist):
- Planning, investigation, or design: `project-structure-reference.md`, `domain-entities-reference.md`, plus the docs below for every file type the plan touches
- Editing or writing code: `code-review-rules.md` plus the backend or frontend docs below for the file type
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md` (or the configured styling reference), `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Test-data seeders: `seed-test-data-reference.md`
- Code review/audit work: `code-review-rules.md` plus the docs above for every file type under review
- Per-file conventions (`contextGroups[]`): before editing an unfamiliar path class, run `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`

**Dedup:** a doc counts as loaded only when your own read returned its full content to this context after the last compaction and within roughly the last 200K tokens, and it has not changed since — cite it `(loaded)` instead of re-reading. A hook reminder, a summary, or a prior mention never counts; a delegated sub-agent starts empty, so name the resolved doc paths in its brief.

Never read all docs blindly: route from `docs-index-reference.md` and open only what the task needs.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

## Quick Summary

**Goal:** Activate a selected workflow or custom pipeline from its canonical contract with a complete task tracking plan.

**Summary:** Accept an explicitly named workflow or a workflow selected by the opt-in runtime route payload, then resolve the exact canonical mode through the shared manifest resolver—including non-empty `preActions.injectContext`—before creating tasks on every host. Persist the resolver fingerprint and occurrence IDs with the run so resume cannot silently switch modes or sequences.

**Workflow:**

1. **Select** — Use the exact workflow named by the user or selected by the opt-in runtime route payload
2. **Confirm identity** — Resolve the workflow ID and requested mode/output; when neither source supplies an ID, stop and request the missing workflow identity
3. **Activate** — Resolve the selected mode/output to a complete canonical manifest (`intent`, `outcomeGates`, ordered occurrence IDs with `role`, skill/args, applicability, barriers, fingerprint and context); create ALL task tracking items for the selected occurrences; materialize every declared `parallelGroups` group as a wave; mark first `in_progress`
4. **Execute intent-first** — `gate` steps always run; `core` and `optional` steps are recommendations; every deviation is logged (Step Execution Protocol)

**Key Rules:**

- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.

- MUST ATTENTION automatic selection applies only when the runtime route payload is present. When it is absent, this skill requires an explicit workflow ID.
- Explicit `/workflow-*` or `$start-workflow <id>` invocation counts as the user choosing that workflow; execute it directly.
- **Activation tier** — use the selected workflow's effective tier before activating: the tier its runtime catalog row shows (the entry's `activation`, absent = `auto`, which project config `portability.workflowActivation` may tighten or override; resolver `resolveActivationTier` in `.claude/scripts/lib/workflow-routing-config.cjs`). `manual`: activate only on an explicit user request (a `/workflow-*` or `$start-workflow <id>` call, the user asking in words, or the user picking it in a question); never on your own selection — take the best non-manual route and name the manual workflow in the route declaration. `confirm`: on your own selection, ask ONCE before activating — the workflow with its step count, or your lean custom-simple route with its steps — then follow the answer; an explicit request skips the question. A `$start-workflow <id>` call you issue yourself — including a workflow skill's hand-off after you invoked that skill — is your own selection, never an explicit request.
- **Mid-session: never auto-activate a workflow.** Auto-activation applies only to the first task of a session (its first user prompt; compaction or resume does not reset it). Once work is under way (follow-up, correction, next step, or a new ask), do it directly or with the best-fit skill or a lean chain of at most 3 skills; required gates (root-cause investigation for a bug, test, review, spec/doc sync, and any other required quality gate) still run and do not count toward that cap, and continuing a workflow already running is not activating one. An explicit workflow request always runs, mid-session included — a `/workflow-*` or `$start-workflow <id>` call, or the user asking in words to use a workflow; follow it.
- Auto-select a Custom Pipeline when no catalog workflow is a strong fit (>80% of its unconditional steps do real work = use catalog); declare it, never ask the user to choose
- `workflows.json` `workflows` field is an **OBJECT** — use `workflows[workflowId]`, NEVER `.find()` or `[index]`; resolve `variants[mode]` through `.claude/scripts/lib/workflow-manifest.cjs`
- Create ALL task tracking items BEFORE marking the first task `in_progress` — batch creation, then execute
- Read the selected manifest's `occurrences` and `parallelGroups` at activation and tag its member tasks as one wave — 1:1 occurrence tasks still stand (a group never collapses members into one task)
- No `parallelGroups` = `sequence` is the order — surface only adjacent read-only steps as a `Candidate wave`, NEVER a wave that contradicts `sequence`
- **Intent-first step contract** — read the manifest's `intent` and `outcomeGates` first. `gate` steps always run. `core` and `optional` steps are recommendations: skip, merge, simplify or reorder one only when the outcome gates stay satisfiable and data dependencies hold. Log every deviation in the run's deviation log; never delete a task. Full rule: Step Execution Protocol (this skill is its single owner)
- When the runtime `## Workflow Catalog` is present, use it for Tier 1. Otherwise use the exact user-supplied workflow ID. Then load and resolve the complete selected canonical entry (Tier 2) before task tracking for EVERY standard workflow. `preActions.injectContext` is required execution context, not optional hook output; this rule applies to every host. Never expose the full `workflows.json` to context
- EVERY workflow entry MUST have a non-empty `preActions.injectContext`; a missing or blank value is catalog drift and blocks activation
- If another workflow is active, it auto-switches (ends current, starts new) — no manual cleanup needed

**NOT for:** Manual step execution (follow task tracking items), workflow design (use `plan`), catalog management.

**Related:** `$start-workflow <workflowId>` | Catalog: opt-in runtime route payload derived from `.claude/workflows.json`

---

## Custom Pipeline Option

When the prompt doesn't cleanly match a single catalog workflow — or combining steps from multiple workflows serves the request better — the AI auto-selects a **Custom Pipeline** instead of the catalog workflow.

### When to choose

| Condition                                    | Example                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| No catalog workflow matches well             | "Review hook changes and update skill docs" — spans review + docs                    |
| Best-match has significant unnecessary steps | Focused policy change in one module; `workflow-feature` adds spec, scenario, seed-data and demo steps that would do no real work |
| Prompt combines 2+ workflow domains          | "Audit performance and write integration tests for the slow query"                   |
| User explicitly requests a step sequence     | "Just run investigate, plan, and feature-implement — nothing else"                         |

**Use the catalog workflow** when it is a strong match (>80% of its unconditional steps would do real work for this request). The gate's Signals → Route table is the default; catalog fit may downgrade it to a custom pipeline, trimming only steps that would do no real work. Catalog workflows encode validated best-practice sequences — prefer them.

### How to build

1. **Valid steps only** — Use only canonical step ids — those appearing in a resolved workflow manifest's `occurrences` (legacy `sequence` entries are normalized by the resolver; variant entries are selected by mode). Each maps to a real `.claude/skills/<step>/SKILL.md` and is invoked with the active host's syntax. No invented step names.
2. **Logical order** — Investigate → Plan → Implement → Test. Never reverse dependency order.
3. **Minimal** — Include only steps the prompt needs. No "just in case" additions.
4. **Keep required gates** — A behavior change keeps its test and review steps; a downgraded route also keeps root-cause investigation for bugs and spec/doc sync when behavior or a public contract changes (`investigate`/`debug-investigate`, `spec`/`docs-update` per the project's spec-test-code cycle reference). A custom pipeline never drops a quality gate the change still requires.
5. **Name it** — Short descriptive name: "Quick Fix + Docs", "Audit + Test Coverage".

### How to declare (auto-select, no confirmation prompt)

Declare the chosen route with its full step list and key signals, then activate it immediately. Do NOT use ask the user directly to choose between the catalog workflow and the custom pipeline — the declaration is the user's override point. The single exception is the one activation question a `confirm`-tier catalog workflow requires (Key Rules → Activation tier).

```
Route: custom-simple "Quick Fix + Docs" [investigate → fix → test → changes-review → docs-update] — because known location, one module, no contract change; workflow-bugfix adds spec, integration-test and demo steps this request does not need
```

**Rules:**

- Always show the full step list and one-sentence rationale naming the key signals
- Name the closest catalog workflow in the rationale when you skipped it, so the user can override
- If the user redirects to the catalog workflow (or other steps), re-route and continue — no re-confirmation
- For project-specific architecture, test, documentation, naming, or workflow rules, read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`; keep this reusable start-workflow protocol generic.

### Task creation for Custom Pipeline

Same 1:1 protocol — one task tracking per step. Use `[Custom]` prefix to distinguish from catalog tasks:

```
Task tracking: subject="[Custom] {step-name} — {brief description}", description="Custom pipeline step N/{total}.", activeForm="Executing {step-name}"
```

---

## Workflow Lookup — Tier 1 Selection, Tier 2 Execution

Use Tier 1 only when the opt-in runtime catalog is present; an exact user-supplied workflow ID is also sufficient. Use Tier 2 before task tracking for EVERY standard workflow to materialize the complete selected-mode execution contract, including ordered `occurrences`, non-empty `preActions.injectContext`, `parallelGroups`, and the resume `fingerprint`.

### Tier 1: Runtime Context or Explicit ID

When automatic routing is enabled, the prompt hook supplies the workflow catalog in runtime context. When it is disabled, the user must name the workflow ID explicitly.

1. Search the available catalog surface for the exact workflow ID: `{workflowId}`.
2. Use its name and `whenToUse` summary only to confirm the route.
3. Do NOT parse the runtime catalog sequence or command syntax for task tracking; Tier 1 is route selection only for every standard workflow.

✅ Use Tier 1 for: route selection only.
⚠️ Tier 2 is required immediately after selection and **before task tracking for every standard workflow**. The complete canonical entry resolves the requested `--mode`/`--output`, loads ordered `occurrences`, non-empty `preActions.injectContext`, `parallelGroups`, and a `fingerprint`.

### Tier 2: Complete Canonical Entry Read (JSON-aware)

After Tier 1 or an explicit ID identifies a standard workflow, use this selected-entry read before creating tasks. The selected canonical entry remains the execution contract:

```
node .claude/scripts/codex/read-workflow-entry.mjs <workflowId> [--mode <mode> | --output <mode>]
```

This JSON-aware helper resolves the complete selected manifest and prints the parent entry plus `mode`, `fingerprint`, `intent`, `outcomeGates`, `occurrences`, `sequence`, `parallelGroups`, and `stepMeta`. It accepts the exact Tier-1-selected workflow ID and mode as data arguments; it does not interpolate them into a shell command.
Parse: `intent` → the goal the run must achieve; `outcomeGates` → the results `workflow-end` must prove (`[]` when undeclared); the returned `occurrences` array → one stable occurrence ID, `role` (`gate` | `core` | `optional`), skill and opaque args per task; `applicability` → exact run/skip condition and cited skip reason; `parallelGroups` → all-return waves; `fingerprint` → the run/resume identity; and non-empty `preActions.injectContext` → workflow-level execution input. Invoke each skill with the active host's command syntax.

### Tier 3: Missing Entry (stop)

If the JSON-aware lookup cannot return the exact selected entry, stop and report catalog drift or a missing canonical workflow. Do not fall back to a fixed-context grep, and do not expose the full file to context.

---

## After Activation — Task Creation Protocol (ZERO TOLERANCE)

**Active-goal resolution (BEFORE child task creation):** resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` — active plan `goal.md`, else `goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root (default `plans/`; `docsRoots.plans.path` in `docs/project-config.json` overrides), else create one from the current user request using `.claude/templates/goal-contract-template.md`. Record the resolved goal path and pass it to every child step/sub-agent so the whole workflow executes against the same saved success criteria. The workflow may end only when the goal's Goal Satisfaction matrix passes or a blocker is escalated.

**Owned-baseline capture (BEFORE child task creation):** create a run-scoped metadata baseline with
`.claude/scripts/lib/workflow-baseline.cjs capture` (or its equivalent API) before any step runs. Capture
the starting HEAD, index identity, tracked/untracked status metadata, selected mode, manifest
fingerprint, goal path, and an explicit empty/approved ownership scope. Do not read or hash repository
content at activation. A nested workflow inherits the parent run ID and may expand ownership only
through an explicit `claim`; it never claims all current dirty files by default. Optional before-images
require an approved regular UTF-8 path and the bounded policy (≤256 KiB/file, ≤2 MiB/run, ≤64 files)
in a user-private OS temp directory; otherwise remain metadata-only.

FIRST action after activation: create EXACTLY one task tracking for EACH entry in the selected manifest's `occurrences` array. The task subject carries the stable occurrence ID; the task description carries the resolved skill, opaque args, applicability and workflow fingerprint. Persist the run ID, mode, fingerprint and ordered occurrence IDs with the task ledger before marking the first task `in_progress`.

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
| `intent`         | string   | One sentence: the goal the run must achieve                                               |
| `outcomeGates`   | object[] | Results that must hold at close — `{id, satisfiedBy: skill[], when?}`                     |
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
2. **Tier 2 required before task tracking for every standard workflow:** `node .claude/scripts/codex/read-workflow-entry.mjs <workflowId> [--mode <mode> | --output <mode>]` → treat the complete selected manifest's `occurrences`, non-empty `preActions.injectContext`, `parallelGroups`, `applicability`, and `fingerprint` as canonical. If the static preview differs, stop and report catalog drift rather than choosing one silently.
3. **Apply selected-workflow pre-actions to task context:** preserve the selected entry's `preActions.injectContext` as workflow-level execution context. For every conditional step it governs, put the exact run condition and evidence-backed skip transition in that task's description; never infer or drop a predicate because the static catalog rendered only a step name.
4. Create one task tracking per selected manifest occurrence IN ORDER; persist the manifest fingerprint and ordered occurrence IDs in the workflow run record before the first step starts.

> See **Workflow Lookup — Token-Efficient (3-Tier Strategy)** above for full lookup rules and fallback chain.

**Task format:**

```
Task tracking: subject="[Workflow] [{role}] {step-name} — {brief description}", description="Workflow step N/{total}. {conditional note}", activeForm="Executing {step-name}"
```

**Rules (NON-NEGOTIABLE):**

- **1:1 mapping** — each selected occurrence entry = exactly one task, even when the skill repeats with different args. No consolidation, no invented tasks. A merge or skip later changes a task's status, never the task list.
- **Role per task** — every subject shows its occurrence `role` (`gate`, `core` or `optional`) so the unskippable steps stay visible.
- **Conditional steps still get tasks** — add the exact canonical run condition and evidence-backed skip transition to the description; a skip then follows the Step Execution Protocol. Never use a generic skip label.
- **Selected-workflow pre-actions are mandatory execution input** — after Tier 1 selects any standard workflow, Tier 2 must load its non-empty `preActions.injectContext` before task tracking. A conditional step's task description must state its canonical run condition and evidence-backed skip transition.
- **Recursive self-calls get tasks** — e.g., `[Workflow] $workflow-review-changes — Recursive re-review (conditional)`
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
skipped or merged occurrence is still recorded as `skipped` with its deviation kind and counts
as returned for any barrier.

### Parallel waves from `parallelGroups` (compute at activation, BEFORE the first task runs)

A workflow MAY declare barrier groups in `parallelGroups` (schema: `.claude/workflows.schema.json` → `WorkflowEntry.parallelGroups`; live example: `workflow-review-changes`, groups `initial-reviews` and `reviewers`). Materialize each declared group as a wave IN THE TASK LIST, so the barrier is visible in the tasks and not only in prose.

1. **Read `parallelGroups` alongside `occurrences`.** Tier 1 (`## Workflow Catalog` in `CLAUDE.md`) renders members FLAT and carries no group data. Tier 2's JSON-aware selected-manifest lookup supplies barrier member occurrence IDs with the ordered list.
2. **Expand any barrier token you were given.** The Codex mirrors (`AGENTS.md`, `.codex/CODEX_CONTEXT.md`) collapse a group into ONE `[parallel ⇉ all-return barrier: a, b*]` token (`*` = conditional member). That token is a barrier marker, NOT a step — expand it back to its member steps and create one task per member.
3. **Task count is still `len(manifest.occurrences)`.** A group NEVER collapses its members into a single task; it only adds wave metadata to the member tasks.
4. **Tag each member task** — subject `[Workflow] [{role}] [wave: {groupId}] /{step} — {brief description}`, description `Workflow step N/{total}. Parallel group '{groupId}' — spawned together with {other members}; barrier: advance only after ALL members return. {conditional note}`.
5. **Conditional members still get their own task** — add "Conditional — a skipped member still counts as returned for the barrier"; skip via `in_progress` → comment → deviation-log line → `completed`, never delete.
6. **Execute a group as ONE wave** — spawn every member in ONE message, barrier on all returns, then advance to the first step after the group. That next step is a SEQ boundary: never start it — and never start any code-mutating step — while a member is still in flight.
7. **Malformed group → STOP, do not repair.** An occurrence ID absent from the selected manifest, an occurrence in two groups, or `barrier ≠ true` means the workflow definition is broken: report it and run the occurrence list strictly in order rather than guessing the intended grouping.

### When a workflow declares NO `parallelGroups`

`sequence` is the source of truth. Absence of `parallelGroups` is NOT permission to invent groups.

- **NEVER** co-schedule steps in a self-authored wave that contradicts `sequence` — no such wave may run a step ahead of a step that precedes it in `sequence`. Reordering, merging or skipping a `core`/`optional` step is governed only by the Step Execution Protocol (outcome gates, data dependencies, deviation log), never by inferred independence.
- **DO surface a candidate wave** when adjacent steps are obviously independent — ALL of: (a) contiguous in `sequence`, (b) read-only / report-producing (review, scan, investigation, research — each writes only its own `tmp/reports/` file), (c) neither consumes the other's output. Announce it as `Candidate wave (not declared): [...]` and keep the 1:1 tasks unchanged.
- **NEVER** put in a candidate wave: any step that writes source files, any gate awaiting user approval, any step consuming a previous step's output, or any non-adjacent pair. When in doubt → run sequentially; a wrong wave silently reorders the workflow, a missed wave only costs time.
- **Persist what proves right** — if a candidate wave was correct, tell the user to add a `parallelGroups` entry to `.claude/workflows.json` (never edit it mid-run). An undeclared wave must never become the de-facto sequence.

Create ALL tasks first → then `TaskUpdate` first task to `in_progress`.

---

## Step Execution Protocol

This section is the single owner of the flex rules (BR-GWF-16); `workflows.json` supplies their data (`intent`, `outcomeGates`, per-occurrence `role`). Wrappers and hooks carry at most a one-line pointer here, never a copy.

1. **Intent first.** Before the first step, read the manifest's `intent` (the goal) and `outcomeGates` (the results `workflow-end` must prove). Choose steps to reach that intent.
2. **`gate` steps ALWAYS run and are NEVER skipped, merged away, simplified away or reordered** (BR-GWF-01). They invoke their skill invocation in every run. Gate outcomes never flex: changed behaviour is tested and green, the review converged, the spec is synced when behaviour or a public contract changed, a bug has a root-cause trace, and the run closes.
3. **`core` and `optional` steps are recommendations** (BR-GWF-13). Intent first, you may skip, merge, simplify or reorder one when every applicable outcome gate can still be satisfied and the data dependencies hold. An `optional` step whose `applicability.when` is false is skipped with its declared `skipReason`; when it holds, the step flexes like a `core` step. Unannotated steps are `core`.
4. **Data dependencies never flex** (BR-GWF-14): a change is made before it is reviewed and before its tests run; the spec sync runs before the review that checks it; the close runs last; a nested `workflow-review-changes` runs inline. A reorder or merge that breaks one of these is not allowed.
5. **Tests are recommendations of which, never of whether** (BR-GWF-15). The choice of test steps and test cases may flex; every behaviour the run changed is covered by tests that ran green in this run. A skip or merge that would leave changed behaviour untested or failing is not allowed.
6. **Deviation log (the skip log) — every deviation writes one line** to `tmp/workflow-runs/<runId>/skips.md`: `<occurrence-id> · <deviation-kind> · <evidence>` (BR-GWF-08). `runId` is the baseline run id captured at activation (a nested workflow writes to its parent's log); there is no other id format. Deviation kinds (closed set; the reason code): `when-false` (an optional step's `applicability.when` was false; its `skipReason` applies) · `pre-action` (skip pre-authorized by the selected `preActions.injectContext`) · `intent-skip` (a step the intent does not need) · `merged` (folded into another occurrence; the evidence names it) · `simplified` (run in a reduced form; the evidence says how) · `reordered` (run at another position; the evidence names the new neighbour) · `review-report` (written only by `workflow-end`). `evidence` is a short note; never write secrets. With no recorded baseline run, the task comment is the only record — say so at close.
7. **Mechanics.** Run: `TaskUpdate in_progress` → **invoke skill invocation** → `TaskUpdate completed`. Skip or merge: `TaskUpdate in_progress` → comment "Skipped — {deviation-kind}: {evidence}" → deviation-log line → `TaskUpdate completed`. A skipped or merged task, including a conditionally skipped task, completes without invoking its skill invocation only after both the comment and the deviation-log line. Simplified and reordered steps still invoke their skill invocation and add their line. Never delete a task.
8. **Validation gates** (`$plan-validate`, `$plan-review`, `$why-review`) MUST use explicit evidence and local project protocol — NEVER auto-approve inferred decisions. Explicit user approval in the prompt may satisfy the gate only when the gate's skill permits it.
9. **Close.** `workflow-end` checks evidence for every outcome gate before the run closes.

---

## Workflow-in-Workflow Gate (HARD GATE)

Some workflow steps ARE themselves full workflows. The DEFAULT for a step that activates a multi-step workflow is sub-agent delegation — running it inline causes the parent session to absorb the entire nested workflow's tool calls, file reads, and sub-agent reports (context overflow on long sequences). The sub-agent runs the nested workflow in isolation and returns ONLY a `SYNC:subagent-return-contract` summary (full findings to `tmp/reports/`).

**Default protocol (sub-agent delegation) for a nested-workflow step:**

1. NEVER invoke via inline skill invocation call
2. Spawn via `spawn_agent` tool with the appropriate `agent_type`
3. Agent prompt must include: current git diff context + feature/task description
4. Sub-agent runs the full nested workflow in its isolated context
5. Return ONLY SYNC:subagent-return-contract summary — write full findings to `tmp/reports/`
6. Main agent reads the full `tmp/reports/` file before synthesis, acceptance, deduplication, or repair planning, including every severity and all findings beyond the envelope cap. The bounded envelope limits transport, never report consumption.

**EXCEPTION — `workflow-review-changes` runs INLINE in the main session (never a sub-agent):**

| Step                       | Workflow activated        | Execution mode                  | Why                                                                                          |
| -------------------------- | ------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------- |
| `$workflow-review-changes` | `workflow-review-changes` | **INLINE — main session agent** | Its Step 0 `/goal` gate binds the session Stop hook + its step-14 re-review is inline by design; a sub-agent cannot own the Stop hook, so delegating it silently breaks the unabandonable review→fix→re-review loop. Context stays bounded because its OWN step 2 and steps 3–9 reviewers are sub-agents writing to `tmp/reports/`. |

When `$workflow-review-changes` appears in any workflow sequence (e.g. `workflow-feature`, `workflow-bugfix`, `workflow-refactor`), invoke it via the skill invocation INLINE — do NOT spawn it as an `spawn_agent` sub-agent.

> The ⚠️ **[WORKFLOW-IN-WORKFLOW GATE]** is model-driven: apply it (default sub-agent, or the `workflow-review-changes` inline exception) yourself whenever the next step activates a nested workflow — no hook emits this warning.

---

**IMPORTANT MANDATORY Steps:** detect-workflow -> analyze-best-match -> auto-select-execution-path -> activate-workflow -> create-task-tracking -> execute-sequence

**IMPORTANT MANDATORY Steps:** detect-workflow -> analyze-best-match -> auto-select-execution-path -> activate-workflow -> create-task-tracking -> execute-sequence

> **[MANDATORY]** task tracking FIRST — break every workflow into tasks before any action. NEVER skip.
> **[MANDATORY]** Auto-select the best path for auto-detected workflows; do not use ask the user directly for workflow-selection confirmation, except the single question a `confirm`-tier workflow requires. Never auto-activate a `manual`-tier workflow. Explicit workflow invocation executes directly.
> **[MANDATORY]** skill invocation REQUIRED for every step that runs. A step completes without it only when skipped or merged with a deviation-log line; `gate` steps never skip.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Detect intent, auto-select the direct/skill/workflow/custom route, then activate the canonical contract with a complete task tracking plan.

**IMPORTANT MUST ATTENTION — Main steps (execute in order, NEVER skip/merge):** detect workflow or route → analyze the best match → auto-select direct/skill/standard/custom execution → load Tier 1 catalog context and Tier 2 complete canonical selected-mode manifest (`occurrences`, non-empty `preActions.injectContext`, `parallelGroups`, `fingerprint`) → create exactly one task per occurrence → materialize declared waves and barriers → execute intent-first: `gate` steps always, `core`/`optional` steps as recommendations, every deviation logged, task status synchronized.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced `file:line` proof, confidence >80%; NEVER present guess as fact.
- **Incremental Persistence:** append findings to report per file; NEVER hold in memory.
- **Sub-Agent Return Contract:** sub-agents return summary only; NEVER inline full output.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**MUST ATTENTION** auto-select the best path for ordinary prompts; explicit `/workflow-*` or `$start-workflow <id>` invocation executes directly. Do not ask for workflow-selection confirmation, except the one question a `confirm`-tier workflow requires; never auto-activate a `manual`-tier workflow. Mid-session, never auto-activate a workflow — do the work directly or with a lean skill chain; required gates still run.
**MUST ATTENTION** `workflows` is an OBJECT — `workflows[workflowId]`, NEVER `.find()` / `[index]` / `.forEach()`
**MUST ATTENTION** create ALL task tracking items for the full sequence BEFORE marking the first task `in_progress`
**MUST ATTENTION** `gate` steps never skip; a `core`/`optional` step completes without its skill invocation only when skipped or merged with a deviation-log line (`<occurrence-id> · <deviation-kind> · <evidence>` in `tmp/workflow-runs/<runId>/skips.md`) and the outcome gates still hold; simplified and reordered steps log too — never delete a task — why: an unlogged deviation is invisible to review and to the close check
**MUST ATTENTION** custom pipeline steps must be canonical step ids (each maps to a real `.claude/skills/<step>/SKILL.md`) — never invent step names
**MUST ATTENTION** use Tier 1 context selection FIRST, then Tier 2 JSON-aware complete canonical-entry read before task tracking for EVERY standard workflow — resolve the selected mode and load `occurrences`, non-empty `preActions.injectContext`, `parallelGroups`, and `fingerprint`; never use fixed-context grep output
**MUST ATTENTION** every executable workflow entry must carry a non-empty `preActions.injectContext`; missing context is catalog drift and blocks activation. This is host- and hook-independent.
**MUST ATTENTION** materialize every declared `parallelGroups` group as a wave in the task list — one task per member, wave-tagged, spawned in ONE message, all-return barrier before the next step — why: a barrier that lives only in prose gets executed one step at a time
**MUST ATTENTION** no `parallelGroups` → `sequence` IS the order — never invent a group that contradicts it; only adjacent read-only steps may be surfaced as a `Candidate wave (not declared)` — why: a self-authored wave silently reorders a validated workflow, and that costs more than the time it saves

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Static Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs` (static quality-protocol composer)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Resolve `specArtifacts` before selecting identity or carrier: use a valid profile, use strict-default TC/test identity only when the profile is absent, and block a malformed or unsupported declaration. Trace every requirement or invariant through decision, task, configured case/test identity and inspected assertion evidence, then carry it through source evidence and canonical docs/spec updates.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Resolve and validate `specArtifacts`: use valid native owner/case/variant identity and assertion-bearing evidence; use strict-default TC/TestSpec only when the profile is absent; block a malformed or unsupported declaration without fallback.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, analyze the task graph (output dependencies, shared write targets) into ordered parallel waves per PARALLELIZE before starting any task, then keep it synchronized as each step starts/completes. Preserve fixed ordering when a skill or workflow explicitly fixes it.
- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.
## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**
1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/a linter catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.
**Judgement integrity:** For theory checks, judgements, evaluations and gap hunts, the prompt's premise is a hypothesis — test it AND its opposite with one evidence bar (web-verify external facts), why-review the draft as an inline self-check (run the `why-review` skill only for a formal review/audit/gap-hunt deliverable or a MEDIUM+/consequential issue the inline pass cannot settle), never invent findings or manufacture disagreement ("no material issues" is a valid verdict); end with a `Bias check:` line (`SYNC:judgement-integrity`).
## Common AI Mistake Prevention (System Lessons)

- **Resolve project applicability before using framework examples.** Read the project config and relevant references, then inspect local evidence; honor explicit N/A and never impose a language, framework, architecture layer, styling method, tool, or runtime surface the project does not use.
- **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
- **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
- **Re-read and re-verify after context compaction or resume.** Compaction wipes read state and memory; summaries describe intent, not environment state. Re-read before editing, audit current state (git status, files) before creating anything new, grep-verify sub-agent output — every "completed" claim is a hypothesis until evidence confirms it.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace every consumer before and after a change.** Map referencing files before deleting; after bulk replacements, renames, or extractions, grep ALL consumer file types (templates, configs, catalogs and generated files fail silently) for every old or removed name; trace the full dependency chain of an edited definition; update docs that embed canonical data alongside their source.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Sub-agents: inherit, cover, persist.** Sub-agents know only their agent .md definition — use custom agent types, not built-in Explore. Reconcile the union of assignments against the full target list — category splits miss boundary items. Make the report write the first deliverable, appended per file/section with bounded scope; a truncated run with no report → spawn a narrower scope, never the same prompt.
- **Ownership before action.** When investigating a failure, ask which part owns the behavior before changing anything. Trace the wrong state to the component responsible for its invariant, then make one authoritative correction there.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec if one exists (the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting any constant/limit/flag/cutoff, read comments, git blame, the CALLER's ordering (the guarantee usually runs immediately BEFORE the cited line), and 2+ sibling call sites. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, state) and verify each against evidence. Ask "what would falsify this?" — if nothing, it is not a hypothesis.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem: "Would this change exist if I were not addressing this request?" — if not, remove or disclose it; never silently expand scope.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort ("(1) [N h], (2) [N h]. Which matters?"), list assumptions, name a simpler path when one exists.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC: steel-man a rejected alternative, invert each reason ("what does it sacrifice?"), stress-test the top 2-3 assumptions, run a pre-mortem. Quality = causal reasoning + mitigations + evidence, not section presence.
- **OOM/memory: check row count before row size.** An unbounded query (no DB filter for the trigger) → push the filter to the DB; then large rows → projection. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** For async work (queues, retries, background jobs, caches, replication) assert the final business/entity state — NEVER delivery bookkeeping (consume/send status, attempt counts, last-error, broker/scheduler/outbox rows) that ANY co-running process can write: green alone, flaky once anything shares that broker + database. Gate: "would this hold no matter WHICH process did the work?" Process-local fault injection is a stress amplifier (arm → bounded window → disarm → assert convergence), never a precondition.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Judge the environment before judging the code — a competing hypothesis, not a fallback.** A bug, failed test, error, or odd output is NOT proof of a code defect. Before any verdict, sweep environment preconditions (toolchain/lockfile state, stale build/cache artifacts, env vars and config, service dependencies, ports/clock, OS path/locale, permissions, leftover processes/test data) AND transient resource pressure (RAM/OOM, CPU, disk/temp, handle and connection-pool limits, network, a timeout that is really slowness). Tell-tale: non-deterministic, fails only in parallel, on one machine or only on CI, or an error naming resources. Cite the discriminator you ran (clean environment? path changed? concurrency 1?) — a verdict without one is a guess. Fix an environment cause in the environment; NEVER edit product code or weaken/skip a test to absorb it; a failure that vanishes on retry stays unexplained until its mechanism is named.
- **Cross-platform execution is a required contract.** Before authoring or changing a tool, script, process launcher, path assertion, or filesystem test, name the supported Windows, macOS, and Linux behaviors. Use platform-neutral APIs and literal argv vectors; never infer shell, temp-path, executable-extension, ACL, or symlink semantics from the current host. A documented command gives its Windows, macOS, and Linux form (Python: `py -3` on Windows, `python3` on macOS/Linux; shell: PowerShell/`.cmd` beside POSIX `sh`) or one platform-neutral runner such as `node <script>`. Canonicalize existing paths before identity, hashing, or equality checks; test native Windows and POSIX seams when behavior differs; keep CI platform matrices authoritative. Preserve fail-closed security boundaries — repair the fixture or platform branch, never weaken the guard just to make one OS green.
- **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer must reference NO consumer-specific domain concept (tenant/customer/product IDs, business entities, feature rules); such a leak compiles, runs, and passes review while coupling the layer to one consumer. Push domain fields/logic down into the consumer via subclass/composition.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
