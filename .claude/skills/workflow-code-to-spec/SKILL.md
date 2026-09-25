---
name: workflow-code-to-spec
version: 3.0.0
description: '[Workflow] Use when authoring or maintaining the configured canonical feature/spec artifact from existing code, keeping its native contract, implementation, and tests in sync. For idea-to-spec use workflow-idea-to-spec.'
disable-model-invocation: false
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Workflow steps follow the guided contract in `/start-workflow` → Step Execution Protocol: `gate` steps are fixed; other steps may flex with a logged reason.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **Renamed:** formerly `workflow-build-specs` — now `/workflow-code-to-spec`. The old name no longer resolves as a slash command.

## Quick Summary

**Goal:** Keep one canonical project spec per capability synchronized with implementation, test evidence, and project docs through the correct init-full/update/audit workflow; derive only configured indexes and never create a parallel spec plane.

**Summary:** Confirm mode and scope, resolve `init-full|update|audit` to the complete canonical workflow manifest before creating tasks, then investigate, author/update/audit the canonical spec and configured test/evidence carriers, review artifacts, synchronize docs/derived aids, and close with coverage evidence.

**Workflow:** Confirm mode/capability → resolve the selected `init-full`, `update`, or `audit` manifest (fingerprint + occurrence IDs) → trace the full vertical chain → create tasks/ledger → invoke exactly the declared spec/test/review/docs gates → report coverage and close. **MUST ATTENTION** keep steps ordered and evidence-backed.

> **[SINGLE HOME]** There is ONE canonical project spec artifact per capability, authored by `spec` under the configured business root. Resolve `specRoots.business.path`, `workflowPatterns.featureDocTemplate`, `docsRoots.projectReference.path`, and `specArtifacts` when present in `docs/project-config.json`; read the configured template and local `spec-system-reference.md`. The configured business root and feature template determine the canonical path. The native `specArtifacts` profile or local artifact contract defines section roles, identifiers, ownership, and test/evidence carriers. Follow it exactly; do not invent a README, section, ID registry, or second engineering-spec tree. The portable `{SPEC_ROOT}/{Bucket}/README.{Feature}.md`, tech-free eight-section shape, and Section 8 `TC-{FEATURE}-{NNN}` registry apply only when no native profile or local artifact contract exists. Code remains the technical source of truth; the canonical spec remains the requirements/behavior source of truth. Indexes and ERDs are derived only when the project contract declares them so.

### Canonical Artifact Profile

Before selecting a mode, read the configured template and project spec references. Map intent, technical contracts, acceptance, and verification to the native section roles and test/evidence carriers. Apply tech-agnostic prose rules only to sections designated for intent; preserve allowed technical detail in contract/evidence sections. Keep `spec [mode=tests]`, test-spec review, artifact review, docs sync, and the existing mode order even when proof is stored in executable tests or another native carrier. Missing/unmapped coverage is UNKNOWN/BLOCKED, not NOT-APPLICABLE or PASS. A malformed or conflicting declared profile blocks authoring; never fall back silently.

When no native profile or local artifact contract exists, preserve the portable default exactly: Sections 1–7 are tech-free; §5 contains the mandatory inline Mermaid ERD; UI-bearing features cover §6.2–§6.5, while backend-only scope records the reason for skipping them; Section 8 uses `TC-{FEATURE}-{NNN}` cases with user-visible GIVEN/WHEN/THEN, `Business Intent / Invariant Guarded`, `Evidence: [Source: namespace/service/id]`, `CoveredBy`, and applicable status. Mark unverified claims explicitly. This default remains strict; only its paths, sections, and carriers yield to a declared native contract. Separate index/ERD aids are optional and project-declared.

### One Canonical Artifact + Derived Aids

| Artifact                         | Path/shape                                                                            | Canonical?                                      | Maintained By          |
| -------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------- |
| **Canonical project spec**      | Under `{SPEC_ROOT}`, using the configured template and native artifact contract (default: `{Bucket}/README.{Feature}.md` only when neither a native profile nor local artifact contract applies) | **Yes — single source of truth**                | `spec`                 |
| Test/scenario evidence          | Native contract's configured case/test carriers (default: Section 8 TC registry only when neither a native profile nor local artifact contract applies)       | Canonical only where declared by local contract | `spec [mode=tests]`    |
| Derived index/catalog/ERD       | Project-declared output only (default: bucket `INDEX.md` when configured)             | Derived — regenerable, never a second spec      | `spec` / `spec-index`  |

### App Bucket Mapping

Resolve service→capability ownership from the App Bucket Mapping in `{REF_DOCS_ROOT}/spec-system-reference.md`, where `{REF_DOCS_ROOT}` is `docsRoots.projectReference.path` from `docs/project-config.json` (portable default: `docs/project-reference/`). Do not inline project-specific names in this skill.

**Mode Routing:**

| Mode        | When to Use                                  | Step Sequence                                                                                                                                                                                                                           |
| ----------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init-full` | Zero — no canonical project spec for target scope      | investigate → **size-evaluation** → **plan** → **plan-review** → **plan-validate** → spec [mode=init] → **spec [mode=tests]** → **artifact-review --type=spec-tests** → artifact-review → **docs-update(final sync)** → workflow-end → watzup |
| `update`    | Code changed, new requirement, new PBI       | workflow-review-changes → spec [mode=update] → **spec [mode=tests]** → **artifact-review --type=spec-tests** → spec [mode=sync] → **docs-update(final sync)** → workflow-end → watzup                                  |
| `audit`     | Quarterly health check, verify doc freshness | investigate → spec [mode=audit] → artifact-review → **docs-update(final sync)** → workflow-end → watzup                                                                                                                                       |

**Key Rules:**

- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- Confirm mode via `AskUserQuestion` BEFORE any action — NEVER skip Step 0
- Each step that runs invokes its `Skill` tool; a step that does not run follows the guided contract in `/start-workflow` → Step Execution Protocol — NEVER batch-complete validation gates
- Spawn sub-agents for 4+ capabilities in ONE message — NEVER sequential
- Every spec captures required intent, applicable contracts, acceptance, and test/evidence coverage in the native profile or local artifact contract. Preserve UI/UX intent through its project-declared owner for UI-bearing features; the framework default uses §1-7, §6.2-6.5, and §8, but a native artifact contract must not be forced into those section numbers.
- Trace the FULL vertical chain (UI → API → handler → domain → event → read model → UI) per capability and reconcile it (Step 1-INIT.4.6) — a layer-parallel inventory silently misses seam behavior; nothing-missed requires the end-to-end trace
- For multi-bucket/whole-project scope, maintain the resumable Coverage Ledger (Step B.3) and clear the Whole-Project Completeness Gate before `/workflow-end`
- Apply the configured prose policy by section role: intent sections stay tech-agnostic when required, while native contract/evidence sections retain allowed technical detail. Keep a contract's domain model/ERD inline only when its configured template requires that; do not create a parallel artifact.
- Write findings incrementally after each section — NEVER hold in memory
- If shared skills/workflows/hooks/sync tooling changed, run `/sync-codex` before `/workflow-end` or record explicit N/A evidence; verify generated mirrors are current.

---

## Step 0 — Mode Detection (MANDATORY FIRST)

Use `AskUserQuestion` to confirm mode before any action.

**Auto-detection rules** (resolve the configured business spec root and native artifact contract first; use the framework config loader's fallback only when no root is configured):

```
IF the configured canonical artifact location has NO current spec for the target scope
  → Suggest: init-full

IF git diff has service/frontend changes touching an already-spec'd capability
  → Suggest: update

IF explicit --audit flag OR user says "audit" / "check freshness" / "are docs stale"
  → Suggest: audit
```

**Canonical path + capability confirmation:**

- Enumerate the configured business root using the project's canonical filename/layout rule; use `{Bucket}/README.*.md` only when the no-native-contract default applies.
- Map changed services to their documented capability owner; use the local domain/bucket map when one is declared.
- Confirm the capability name and canonical target path with the user when ownership or naming is ambiguous.

Present the detected mode with reasoning. User confirms before proceeding.

---

## MODE: init-full

### When to Use

Starting from zero: no canonical artifact for the target scope under the configured business root and active artifact contract.

### Step Sequence

````
## Step A — Discovery (investigate)

/investigate
  → Holistic codebase map — capability registry, entry points, integration boundaries
  → Identify the set of capabilities in scope (one canonical spec per independently named capability)
  → **Full-chain awareness:** map not just backend layers but the complete vertical slice per
     capability — UI view/action → API → handler → domain entity/rule → event → consumer/read model
     → UI outcome. The detailed per-capability trace + reconciliation gate runs inside
     `/spec [mode=init]` Step 1-INIT.4.6 (use `graph-connect-api` for frontend→backend links,
     `graph-trace` for backend flow); investigate just confirms both ends (frontend + backend) are in scope
     so no seam is invisible at planning time.
  → TaskCreate: "investigate — enumerate capabilities + full FE→BE→domain entry points for {Bucket}"

## Step B — Size Evaluation and Divide-and-Conquer Planning (MANDATORY — runs BEFORE plan)

**[BLOCKING GATE]** Before writing any plan, evaluate scope and recursively decompose until
each capability is an independently authorable canonical project spec. **The task may be huge — an entire
project's worth of code-to-spec is the explicit worst case. Size it honestly first, then break it
into many small, independently-completable units; never start authoring against an unsized scope.**

### B.1 — Classify scope breadth FIRST

| Scope | Signal | Strategy |
| ----- | ------ | -------- |
| **Single capability** | one feature named / one diff | single-session authoring |
| **Single bucket** | one module/service | per-capability decomposition within the bucket |
| **Whole project** | "all specs", "the whole project", "every feature", no bucket named | **enumerate ALL buckets × ALL capabilities → build the Coverage Ledger (B.3) → run bucket-by-bucket across resumable sessions** |

### B.2 — Estimate per run

```
capability_count = count of distinct capabilities in the current scope
  IF capability_count > 10:  → SPLIT into groups: max 10 capabilities per run, run groups sequentially
  IF 4 ≤ capability_count ≤ 10: → Sub-agents mandatory (one spec sub-agent per capability)
  IF capability_count ≤ 3:   → Single-session authoring
```

**Recursive decomposition rule:** Do not impose a line-count cap. Split when distinct independently nameable capabilities emerge; use the size/cardinality rule declared by the native profile or local artifact contract. The `>40` TC trigger is a framework-default heuristic only and must not create extra specs when a native profile owns scenario identity.

### B.3 — Whole-Project Coverage Ledger [BLOCKING for whole-project scope; recommended for multi-bucket]

When the scope spans more than one bucket, a single session cannot hold it — so coverage MUST be
tracked in a **persistent, resumable ledger on disk**, not in memory or the task list alone. This is
the guard for "the whole-project code-to-spec works flawlessly and nothing is missed."

1. **Enumerate the full target set:** for every bucket (App Bucket Mapping), list every capability
   discovered in investigate. This is the denominator — the complete set that MUST end with a reviewed canonical spec or a recorded deferral.
2. **Write the ledger** to `tmp/reports/code-to-spec-coverage-{date}.md`:

   | Owner | Capability | Canonical spec path | Intent/requirements | Contracts | Test/evidence coverage | Chain trace | Status |
   | ----- | ---------- | ------------------- | ------------------- | --------- | ---------------------- | ----------- | ------ |
   | {Owner} | {Capability} | Native-contract-defined path under `{SPEC_ROOT}` (default: `{Bucket}/README.{Feature}.md`) | ⬜ | ⬜ | ⬜ | ⬜ | NOT STARTED |

3. **Update the ledger row after each capability completes** (incremental persistence — never batch).
   `Status` ∈ NOT STARTED → IN PROGRESS → SPEC DONE → REVIEWED. Mark UI intent `n/a` only for backend-only scope.
4. **Resume rule:** on any session start / after compaction, read the ledger FIRST, re-glob
   the business spec root (default `docs/specs/**`; `specRoots.business.path` in `docs/project-config.json` overrides) to confirm, and continue from the first non-REVIEWED row — NEVER re-author a done
   capability, NEVER re-run investigate for already-enumerated buckets.
5. **[BLOCKING] Whole-Project Completeness Gate (before `/workflow-end`):** every row is `REVIEWED`,
   OR carries an explicit, recorded deferral reason. A bucket/capability discovered in investigate but
   absent from the business spec root (default `docs/specs/**`; `specRoots.business.path` in `docs/project-config.json` overrides) with no deferral reason = the workflow is NOT complete. Report the
   final coverage as `{reviewed}/{total} capabilities` in `/watzup`.

TaskCreate: "size-evaluation — classify scope breadth, count capabilities, build coverage ledger (whole-project), decide split strategy"

## Step C — Plan

/plan
  → ONE task per capability canonical spec; map its native-contract-defined intent, contract, acceptance, and evidence roles.
  → Core domain capabilities first, supporting ones last
  → Verify TaskList count ≥ capability_count before proceeding (BLOCKING gate)
  → TaskCreate: "plan — produce per-capability authoring plan"

## Step D — Plan Review

/plan-review
  → Validate: every in-scope capability has an authoring task, no gaps
  → Verify: no sub-agent handles >3 capabilities; each capability within caps
  → TaskCreate: "plan-review — validate capability coverage + caps"

## Step E — Plan Validation

/plan-validate
  → User confirms: bucket, capability list, scope, split strategy
  → TaskCreate: "plan-validate — user confirms scope and split strategy"

/spec [mode=init]
  → Author one canonical project spec PER capability using the configured template, profile sections, identifiers, and evidence/test carriers.
  → Preserve independent intent, applicable contracts, acceptance, and verification obligations in their configured native roles; code-derived facts require source evidence.
  → Default format only when neither a native profile nor local artifact contract applies: `{Bucket}/README.{Feature}.md`, tech-free Sections 1–7, mandatory inline §5 Mermaid ERD, §6.2–§6.5 for UI-bearing features, and Section 8 `TC-{FEATURE}-{NNN}` cases with the default case fields defined above.
  → Output at the configured canonical path; update or generate indexes only when the project contract declares them (default: bucket `INDEX.md`).
  → Sub-agents for 4+ capabilities (BLOCKING: ONE message spawn); each prompt includes capability name, output path, tech-agnostic contract, SYNC protocols
  → No line-count cap applies — split by independently nameable capabilities; the `TCs>40` heuristic is default-only and does not override native scenario ownership

/spec [mode=tests]
  → Reconcile the changed behavior's test/evidence cases in the native-contract-defined carrier, preserve its identifiers and one-to-many ownership, and link each case to the executing proof. The Section 8 `TC-{FEATURE}-{NNN}` fields are default-only.

/artifact-review --type=spec-tests
  → Review configured cases/evidence for invariant coverage, observable expected outcomes, unresolved evidence, and duplicate native IDs

/artifact-review
  → Quality check the Feature Spec(s):
    - Apply the active artifact contract's prose policy to its intent roles; preserve permitted technical detail in contract/evidence roles
    - Check domain and interaction coverage in the locations required by the configured template
    - Check each case/evidence carrier against its configured fields; verify linked requirement/acceptance/scenario IDs and observable outcomes where declared, require status only when the carrier defines it, and trace claimed outcomes to executing proof where required
    - YAML frontmatter present when required by the template; no line-count cap applied
  → PASS criteria: zero [UNVERIFIED] without exclusion reason + complete native-contract-defined role and evidence coverage; for the no-native-contract default, zero technical terms in §1–7, required inline §5 ERD, complete UI sections where applicable, and every Section 8 case has its required intent/BDD/evidence/coverage fields
  → Gap found → validate findings → fix only validated gaps that block the current round → restart full artifact-review pass from the first check; Round 2 LOW-only gaps are recorded as deferred and do not trigger another cycle, while binary gates remain blocking

/docs-update
  → Near-final synchronization sweep across project docs, canonical specs, and configured test/evidence carriers
  → MUST run after artifact-review fixes and before /workflow-end
  → (Optional) regenerate only project-declared derived indexes / ERDs via /spec-index
  → Report skipped sub-phases explicitly when no impacted docs exist

/workflow-end

/watzup
  → Session summary: capabilities authored, files written, ~lines, native case/evidence counts (TC counts only for the no-native-contract default), coverage gaps, open questions (confidence < 80%), plus the /understand handoff when /watzup's large-change threshold is met
````

---

## MODE: update

### When to Use

Code changed (new feature, bug fix, refactor, new PBI). Sync the canonical spec and configured test/evidence carriers incrementally.

### Scope Sources

1. Auto-detect from `git diff --name-only HEAD` (default)
2. Explicit capability list from user
3. New PBI or requirement description (map to affected capabilities manually)

### Step Sequence

```
/workflow-review-changes
  → Full code review cycle + docs-update (Phase 2 spec diff-scoped sync)
  → Produces: impact map (capabilities affected, native spec roles and evidence carriers to update)

/spec [mode=update]
  → Update only impacted native contract sections/roles of each affected canonical spec (full profile pass with 3-pass verification when restructuring)
  → SKIP if docs-update Phase 2 completed with zero gaps — mark "Skipped: docs-update Phase 2 sufficient"

/spec [mode=tests]
  → **EXPLICIT TEST/EVIDENCE STEP — required when behavior changes**
  → SKIP if changes are purely cosmetic (CSS, comments, config) — mark "Skipped: no behavioral impact"
  → Mode detection: new behavior → implement-first or TDD-first per project cycle; test-evidence-only edits → update
  → Write/update cases in the profile's declared carrier; check existing IDs and variants before assigning; never overwrite tested evidence

/artifact-review --type=spec-tests
  → Review updated/planned cases for invariant coverage, observable outcomes, stale evidence, duplicate native IDs, and test/code/spec drift
  → SKIP if /spec [mode=tests] skipped — mark "Skipped: no native-contract case/evidence changes"
  → BLOCK sync if review finds missing invariants, ambiguous behavior, or native evidence/code/spec drift

/spec [mode=sync]
  → Refresh configured derived indexes from the canonical spec/test-evidence sources; never create a parallel registry
  → SKIP if no native-contract-owned case/evidence or derived-index changes occurred in this cycle

> **UI-intent maintenance (conditional)** — runs alongside `/spec [mode=sync]` / spec authoring only when changed code carries user-facing behavior. Refresh the interaction-intent owner defined by the native profile or local artifact contract and link its design-spec/mockup where the project contract expects that. For the no-native-contract default, this is §6's View Inventory, Key UI States, and per-story click-path with `US-`/`OP-`/`BR-` references. Do not invent a numbered UI section for a native profile that has no such section; surface the missing UX owner as a gap. Follow `SYNC:ui-intent-layer` below.

/docs-update
  → Near-final synchronization sweep across project docs, canonical specs, and configured test/evidence carriers
  → MUST run after the spec [mode=sync] step and before /workflow-end
  → Report skipped sub-phases explicitly when no impacted docs exist

/workflow-end

/watzup
  → Summary: capabilities updated, native spec roles changed, cases/evidence added or reconciled, new open questions, plus the /understand handoff when /watzup's large-change threshold is met
```

### New PBI / Requirement Update Protocol

Triggering update from new PBI or requirement (not code change):

```
After /workflow-review-changes:
  → User provides PBI text or requirement description
  → Map requirement → affected domain entities → affected capabilities
  → /dor-gate: required when a new/changed PBI is being made implementation-ready; PASS or WARN before planned specs/TCs become guidance
  → /pbi-mockup: required when the PBI changes user-facing UI/journeys; skip with reason for backend-only requirements
  → Treat as a speculative update: record planned intent/contracts in the native-contract-defined canonical roles and use its planned-state convention
  → Add or reconcile planned test/evidence cases in their native-contract-defined carriers; use `TC-` and `Status: Planned` only for the no-native-contract default
  → /artifact-review --type=spec-tests: review planned TCs before refreshing the derived index
  → These become implementation guidance, not verified spec
```

---

## MODE: audit

### When to Use

Periodic health check (quarterly or before major release). Verify the Feature Specs are current.

### Audit Time Estimation

```
audit_effort = capability_count × 8min_per_capability
example: 8 capabilities × 8min = ~1h (AI-assisted)
```

Budget multiplier: If last audit was >90 days ago → ×1.5 (more drift expected).

### Step Sequence

```
/investigate
  → Quick codebase scan: current state of entities, commands, controllers (lightweight, 30min max)

/spec [mode=audit]
  → Compare each Feature Spec's last_updated vs git log of the source it documents
  → Output: stale capabilities/sections table with recommended update scope

/artifact-review
  → Consolidated audit report
  → Produce: tmp/reports/spec-audit-{date}-{Bucket}.md
  → Include: total stale coverage %, estimated update effort, priority order
  → (Optional) /spec-index [mode=audit] — report which DERIVED index/ERD aids lag their source specs

/docs-update
  → Near-final synchronization sweep; MUST run after artifact-review conclusions and before /workflow-end
  → Report skipped sub-phases explicitly when no impacted docs exist

/workflow-end

/watzup
  → Present action plan: which capabilities to update first
  → Recommend: run update mode scoped to stale capabilities
  → Run the /understand handoff when /watzup's large-change threshold is met
```

---

## Conditional Skip Rules

| Step                                           | Skip When                                                                                                      |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| §5 Mermaid ERD in no-native-contract init / native model role in profile init | Never skip the default inline §5 ERD; follow native requirements and block review when required model coverage is missing |
| `/spec [mode=tests]` in init                   | User explicitly requests a behavior/spec-only pass and the project contract permits test/evidence cases to be deferred to a later cycle |
| `/dor-gate` in update                          | Update source is code diff only, existing PBI is already DoR-ready, or no PBI readiness decision is being made |
| `/pbi-mockup` in update                        | Backend-only/non-UI requirement, code diff only, or existing mockup already covers the change                  |
| `/artifact-review --type=spec-tests` in update | `/spec [mode=tests]` skipped because no native-contract-owned case/evidence changed                                    |
| `/spec [mode=sync]`                            | No native-contract-owned case/evidence or declared derived output changed                                              |
| `/docs-update` near-final sync                 | Never skip entirely; sub-phases may be skipped only with explicit reason in the docs-update report             |
| `/artifact-review` audit pass                  | No stale specs found AND no UNVERIFIED items                                                                   |
| `/spec-index` (derived)                        | No derived index/ERD is maintained for this bucket, or it is already current                                   |

---

## Sub-Agent Coordination Protocol (init-full, 4+ capabilities)

1. `/investigate` + `/plan` in main context → capability registry + per-capability task list
2. Spawn `spec` sub-agents (one per capability) in ONE message
3. Wait for all sub-agents to complete
4. Spawn `spec [mode=tests]` sub-agents (one per capability) in ONE message to populate/reconcile native test-evidence carriers
5. Main context assembles + verifies in `/artifact-review`

Each `spec` sub-agent receives:

- Capability name + bucket
- Output path: the canonical path selected by configured paths and the local artifact contract; use `{Bucket}/README.{Feature}.md` only for the no-native-contract default
- Native-contract-defined prose and evidence contract; keep designated intent roles tech-agnostic and preserve permitted technical detail in contract/evidence roles. For the no-native-contract default, include the mandatory §5 inline ERD, UI-bearing §6 interaction sections, and Section 8 case fields defined above.
- Incremental persistence instruction (write after each section)

---

## Integration with docs-update workflow step

`docs-update` called as a workflow step (not standalone) synchronizes the single native-contract-owned canonical artifact and its declared test/evidence carriers:

```
docs-update (as workflow step):
  Phase 1: Project docs (inline — unchanged)
  Phase 2: /spec update mode (impacted native roles of the canonical spec)
  Phase 3: /spec [mode=tests] (native-contract-defined test/evidence cases; default: Section 8 TCs)
  Phase 3.5: /artifact-review --type=spec-tests (required when Phase 3 changes cases/evidence)
  Phase 4: /spec [mode=sync] (refresh only declared derived indexes/evidence links)
  Phase 4.5: /spec-index (OPTIONAL — regenerate derived bucket INDEX / ERD if one is maintained)
```

The canonical project spec and its required test/evidence carriers stay in sync on every feature/bugfix/refactor workflow.

---

## When to Use vs When NOT to Use

### Use This Workflow

- First-time Feature Spec authoring for a capability or full bucket
- After significant code changes (new feature, major refactor)
- Onboarding new team to a capability — the Feature Spec as knowledge handoff artifact
- Before tech migration or re-implementation (pair with a derived reimplementation guide)
- Quarterly spec health audits
- After new PBIs groomed for implementation
- Compliance documentation — prove system behavior in plain language
- Verify design intent — compare the Feature Spec against original vision

### Use Standalone Skills Instead

| Goal                                                | Use                           |
| --------------------------------------------------- | ----------------------------- |
| Update one specific Feature Spec after small change | `/spec` directly              |
| Add/sync configured test/evidence cases             | `/spec [mode=tests]` directly |
| Regenerate a derived bucket index / ERD             | `/spec-index` directly        |
| Understand one specific feature                     | `/investigate`                |
| Write integration tests from existing case contracts | `/integration-test`           |

---

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

---

**IMPORTANT MANDATORY Steps:** /investigate -> /plan -> /plan-review -> /plan-validate -> /spec -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /artifact-review -> /docs-update -> /workflow-end -> /watzup

> **[BLOCKING]** Each step that runs invokes its `Skill` tool; every other deviation follows `/start-workflow` → Step Execution Protocol. NEVER batch-complete validation gates.
> **[BLOCKING]** Confirm mode via `AskUserQuestion` BEFORE any action — NEVER skip Step 0.
> **[BLOCKING]** Spawn sub-agents for 4+ capabilities in ONE message — NEVER sequential spawning.
> **[BLOCKING — Context Compaction / Session Resume]** At any session start or after context compaction: (1) `TaskList` FIRST — resume existing, NEVER create duplicates; (2) re-enumerate the configured business root using its canonical naming/layout rule to see which capabilities already have a spec — skip those; (3) NEVER re-run `/investigate` or `/plan` in a resumed session.
> **[BLOCKING]** Read `{REF_DOCS_ROOT}/spec-principles.md` before any author/update/audit step. Apply its prose rules and banned-token checks only to roles/fields designated by the active artifact contract; preserve permitted detail in contract/evidence roles.

> **Goal Contract propagation (workflow-owned):** At workflow start, resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root, default `plans/`, relocated by `docsRoots.plans.path` in `docs/project-config.json` → create from the spec request). Map each spec/test/code cycle output (canonical specs authored, native cases/evidence reconciled, audit findings fixed) to the saved success criteria and append the evidence to the goal file's Iteration Log per cycle. Before `/workflow-end`, emit the Goal Satisfaction matrix (PASS/FAIL/BLOCKED); completion requires every required criterion PASS or BLOCKED with a user-facing escalation.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `ui-intent-layer` — Tech-agnostic UI intent layer in every UI-bearing spec; writing a spec for a feature with a user interface → .claude/skills/shared/protocols/ui-intent-layer.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views with information priority now/later/not-here and container role + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** workflow steps follow the guided contract in `/start-workflow` — `gate` steps are fixed; other steps may flex only with a logged reason
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

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

**IMPORTANT MUST ATTENTION Goal:** Keep one canonical project spec per capability synchronized with implementation, required test/evidence, and project docs through the correct init-full/update/audit workflow; honor the configured roles and derive only declared outputs.

**IMPORTANT MUST ATTENTION Main steps:** Step 0 confirm mode → resolve the selected manifest → invoke its exact occurrence list: `init-full` (investigate → plan → plan-review → plan-validate → spec init → spec tests → artifact reviews → docs-update → workflow-end → watzup), `update` (workflow-review-changes → spec update/tests → TC review → spec sync → docs-update → workflow-end → watzup), or `audit` (investigate → spec audit → artifact-review → docs-update → workflow-end → watzup). **NEVER** skip gates, vertical-chain reconciliation, or coverage closure; record the resolver fingerprint and every returned occurrence. **MUST ATTENTION** resolve native section and evidence mappings first; unknown required coverage stays blocked.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Nested Task Creation:** expand child phases, link parent when nested; NEVER batch transitions.
- **Critical Thinking:** traced proof per claim, confidence >80% to act; NEVER present guess as fact.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Incremental Persistence:** persist findings to `tmp/reports/` per section; NEVER hold in memory.
- **Sub-Agent Return Contract:** sub-agents return summary only; NEVER request full output inline.

- **[BLOCKING]** Confirm mode via `AskUserQuestion` BEFORE any action — NEVER skip Step 0
- **[BLOCKING]** Each step that runs invokes its `Skill` tool; every other deviation follows `/start-workflow` → Step Execution Protocol — NEVER batch-complete validation gates
- **[BLOCKING]** Spawn sub-agents for 4+ capabilities in ONE message — NEVER sequential spawning
- **[BLOCKING]** ONE canonical artifact per capability — use the path, section roles, identifiers, ownership, and evidence/test carriers declared by the active artifact contract; the portable README/eight-section/TC format applies only when neither a native profile nor local artifact contract exists. Do not create a parallel spec tree.
- **[BLOCKING]** investigate holistically FIRST — capability registry MUST exist before plan creation; NEVER re-run investigate or plan in a resumed session
- **[BLOCKING]** Trace the FULL vertical chain per capability (UI → API → handler → domain/rule → event → consumer → read model → UI) and pass the Step 1-INIT.4.6 reconciliation gate — no orphan UI, no orphan operation, event + read-side closure; a BROKEN chain is a spec-correctness finding, never silently dropped
- **[BLOCKING]** Every spec covers required intent, applicable contracts, acceptance, UI interaction intent when applicable, and test/evidence proof in their native-contract-defined roles; missing mappings or required coverage block review. In the no-native-contract default, keep §1–7 tech-free, include the mandatory inline §5 ERD, cover §6.2–§6.5 for UI features, and populate Section 8 cases with the required default fields.
- **[BLOCKING]** Whole-project / multi-bucket scope → size it via Step B (classify breadth → build the resumable Coverage Ledger), and clear the Whole-Project Completeness Gate (every capability REVIEWED or explicitly deferred) before `/workflow-end` — report `{reviewed}/{total}` in `/watzup`
- **[BLOCKING]** Plan decomposes big→small — ONE task per independently nameable capability spec; apply native split/cardinality rules, using the `>40` TC heuristic only when neither a native profile nor local artifact contract applies.
- **[BLOCKING]** Per-section authoring: write each section immediately — NEVER accumulate across sections
- **[REQUIRED]** Apply prose policy by native role: designated intent remains tech-agnostic, while allowed technical detail stays in contract/evidence roles; put identifiers and source evidence in configured carriers and mark unknown claims `[UNVERIFIED]`, never blank.
- **[REQUIRED]** Each sub-agent prompt MUST include: capability name, output path, tech-agnostic contract, SYNC protocols (critical-thinking, evidence-based, incremental-persistence, cross-scope boundary)
- **[BLOCKING]** Context compaction / session resume → `TaskList` first, re-glob existing Feature Specs, skip done capabilities — NEVER re-run investigate or plan
- **[BLOCKING]** artifact-review: PASS requires zero `[UNVERIFIED]` without exclusion reason and complete native role/evidence coverage; apply tech-term checks only to designated intent roles. Gap found → validate findings → fix only validated gaps that block the current round → restart the full artifact-review pass from the first check; Round 2 LOW-only findings are recorded as deferred and do not trigger another cycle, while binary gates remain blocking
- **[BLOCKING]** Verify TaskList count ≥ capability_count before any authoring begins — this is the plan completeness gate
- **[REQUIRED]** Apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
- **[REQUIRED]** Apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
> **Anti-Rationalization:**

| Evasion                                 | Rebuttal                                                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| "Purpose obvious"                       | Anchor it anyway — primacy/recency keeps outcome active through long prompts.                               |
| "Existing reminders enough"             | Echo Goal in Closing Reminders — bottom anchor prevents drift.                                              |
| "Skip evidence for prompt edits"        | Cite changed file evidence and verify no stale protocol text remains.                                       |
| "Create a second engineering-spec tree" | Keep one native-contract-owned canonical spec per capability; retain technical detail only in its declared contract/evidence roles and generate only declared derived views. |
