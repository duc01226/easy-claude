---
name: workflow-code-to-spec
description: '[Workflow] Use when authoring or maintaining the configured canonical feature/spec artifact from existing code, keeping its native contract, implementation, and tests in sync. For idea-to-spec use workflow-idea-to-spec.'
disable-model-invocation: false
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

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Workflow steps follow the guided contract in `$start-workflow` → Step Execution Protocol: `gate` steps are fixed; other steps may flex with a logged reason.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **Renamed:** formerly `workflow-build-specs` — now `$workflow-code-to-spec`. The old name no longer resolves as a slash command.

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
- Confirm mode by asking the user directly BEFORE any action — NEVER skip Step 0
- Each step that runs invokes its skill invocation; a step that does not run follows the guided contract in `$start-workflow` → Step Execution Protocol — NEVER batch-complete validation gates
- Spawn sub-agents for 4+ capabilities in ONE message — NEVER sequential
- Every spec captures required intent, applicable contracts, acceptance, and test/evidence coverage in the native profile or local artifact contract. Preserve UI/UX intent through its project-declared owner for UI-bearing features; the framework default uses §1-7, §6.2-6.5, and §8, but a native artifact contract must not be forced into those section numbers.
- Trace the FULL vertical chain (UI → API → handler → domain → event → read model → UI) per capability and reconcile it (Step 1-INIT.4.6) — a layer-parallel inventory silently misses seam behavior; nothing-missed requires the end-to-end trace
- For multi-bucket/whole-project scope, maintain the resumable Coverage Ledger (Step B.3) and clear the Whole-Project Completeness Gate before `$workflow-end`
- Apply the configured prose policy by section role: intent sections stay tech-agnostic when required, while native contract/evidence sections retain allowed technical detail. Keep a contract's domain model/ERD inline only when its configured template requires that; do not create a parallel artifact.
- Write findings incrementally after each section — NEVER hold in memory
- If shared skills/workflows/hooks/sync tooling changed, run `$sync-codex` before `$workflow-end` or record explicit N/A evidence; verify generated mirrors are current.

---

## Step 0 — Mode Detection (MANDATORY FIRST)

Use ask the user directly to confirm mode before any action.

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

$investigate
  → Holistic codebase map — capability registry, entry points, integration boundaries
  → Identify the set of capabilities in scope (one canonical spec per independently named capability)
  → **Full-chain awareness:** map not just backend layers but the complete vertical slice per
     capability — UI view/action → API → handler → domain entity/rule → event → consumer/read model
     → UI outcome. The detailed per-capability trace + reconciliation gate runs inside
     `$spec [mode=init]` Step 1-INIT.4.6 (use `graph-connect-api` for frontend→backend links,
     `graph-trace` for backend flow); investigate just confirms both ends (frontend + backend) are in scope
     so no seam is invisible at planning time.
  → Task tracking: "investigate — enumerate capabilities + full FE→BE→domain entry points for {Bucket}"

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
5. **[BLOCKING] Whole-Project Completeness Gate (before `$workflow-end`):** every row is `REVIEWED`,
   OR carries an explicit, recorded deferral reason. A bucket/capability discovered in investigate but
   absent from the business spec root (default `docs/specs/**`; `specRoots.business.path` in `docs/project-config.json` overrides) with no deferral reason = the workflow is NOT complete. Report the
   final coverage as `{reviewed}/{total} capabilities` in `$watzup`.

Task tracking: "size-evaluation — classify scope breadth, count capabilities, build coverage ledger (whole-project), decide split strategy"

## Step C — Plan

$plan
  → ONE task per capability canonical spec; map its native-contract-defined intent, contract, acceptance, and evidence roles.
  → Core domain capabilities first, supporting ones last
  → Verify the current task list count ≥ capability_count before proceeding (BLOCKING gate)
  → Task tracking: "plan — produce per-capability authoring plan"

## Step D — Plan Review

$plan-review
  → Validate: every in-scope capability has an authoring task, no gaps
  → Verify: no sub-agent handles >3 capabilities; each capability within caps
  → Task tracking: "plan-review — validate capability coverage + caps"

## Step E — Plan Validation

$plan-validate
  → User confirms: bucket, capability list, scope, split strategy
  → Task tracking: "plan-validate — user confirms scope and split strategy"

$spec [mode=init]
  → Author one canonical project spec PER capability using the configured template, profile sections, identifiers, and evidence/test carriers.
  → Preserve independent intent, applicable contracts, acceptance, and verification obligations in their configured native roles; code-derived facts require source evidence.
  → Default format only when neither a native profile nor local artifact contract applies: `{Bucket}/README.{Feature}.md`, tech-free Sections 1–7, mandatory inline §5 Mermaid ERD, §6.2–§6.5 for UI-bearing features, and Section 8 `TC-{FEATURE}-{NNN}` cases with the default case fields defined above.
  → Output at the configured canonical path; update or generate indexes only when the project contract declares them (default: bucket `INDEX.md`).
  → Sub-agents for 4+ capabilities (BLOCKING: ONE message spawn); each prompt includes capability name, output path, tech-agnostic contract, SYNC protocols
  → No line-count cap applies — split by independently nameable capabilities; the `TCs>40` heuristic is default-only and does not override native scenario ownership

$spec [mode=tests]
  → Reconcile the changed behavior's test/evidence cases in the native-contract-defined carrier, preserve its identifiers and one-to-many ownership, and link each case to the executing proof. The Section 8 `TC-{FEATURE}-{NNN}` fields are default-only.

$artifact-review --type=spec-tests
  → Review configured cases/evidence for invariant coverage, observable expected outcomes, unresolved evidence, and duplicate native IDs

$artifact-review
  → Quality check the Feature Spec(s):
    - Apply the active artifact contract's prose policy to its intent roles; preserve permitted technical detail in contract/evidence roles
    - Check domain and interaction coverage in the locations required by the configured template
    - Check each case/evidence carrier against its configured fields; verify linked requirement/acceptance/scenario IDs and observable outcomes where declared, require status only when the carrier defines it, and trace claimed outcomes to executing proof where required
    - YAML frontmatter present when required by the template; no line-count cap applied
  → PASS criteria: zero [UNVERIFIED] without exclusion reason + complete native-contract-defined role and evidence coverage; for the no-native-contract default, zero technical terms in §1–7, required inline §5 ERD, complete UI sections where applicable, and every Section 8 case has its required intent/BDD/evidence/coverage fields
  → Gap found → validate findings → fix only validated gaps that block the current round → restart full artifact-review pass from the first check; Round 2 LOW-only gaps are recorded as deferred and do not trigger another cycle, while binary gates remain blocking

$docs-update
  → Near-final synchronization sweep across project docs, canonical specs, and configured test/evidence carriers
  → MUST run after artifact-review fixes and before $workflow-end
  → (Optional) regenerate only project-declared derived indexes / ERDs via $spec-index
  → Report skipped sub-phases explicitly when no impacted docs exist

$workflow-end

$watzup
  → Session summary: capabilities authored, files written, ~lines, native case/evidence counts (TC counts only for the no-native-contract default), coverage gaps, open questions (confidence < 80%), plus the $understand handoff when $watzup's large-change threshold is met
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
$workflow-review-changes
  → Full code review cycle + docs-update (Phase 2 spec diff-scoped sync)
  → Produces: impact map (capabilities affected, native spec roles and evidence carriers to update)

$spec [mode=update]
  → Update only impacted native contract sections/roles of each affected canonical spec (full profile pass with 3-pass verification when restructuring)
  → SKIP if docs-update Phase 2 completed with zero gaps — mark "Skipped: docs-update Phase 2 sufficient"

$spec [mode=tests]
  → **EXPLICIT TEST/EVIDENCE STEP — required when behavior changes**
  → SKIP if changes are purely cosmetic (CSS, comments, config) — mark "Skipped: no behavioral impact"
  → Mode detection: new behavior → implement-first or TDD-first per project cycle; test-evidence-only edits → update
  → Write/update cases in the profile's declared carrier; check existing IDs and variants before assigning; never overwrite tested evidence

$artifact-review --type=spec-tests
  → Review updated/planned cases for invariant coverage, observable outcomes, stale evidence, duplicate native IDs, and test/code/spec drift
  → SKIP if $spec [mode=tests] skipped — mark "Skipped: no native-contract case/evidence changes"
  → BLOCK sync if review finds missing invariants, ambiguous behavior, or native evidence/code/spec drift

$spec [mode=sync]
  → Refresh configured derived indexes from the canonical spec/test-evidence sources; never create a parallel registry
  → SKIP if no native-contract-owned case/evidence or derived-index changes occurred in this cycle

> **UI-intent maintenance (conditional)** — runs alongside `$spec [mode=sync]` / spec authoring only when changed code carries user-facing behavior. Refresh the interaction-intent owner defined by the native profile or local artifact contract and link its design-spec/mockup where the project contract expects that. For the no-native-contract default, this is §6's View Inventory, Key UI States, and per-story click-path with `US-`/`OP-`/`BR-` references. Do not invent a numbered UI section for a native profile that has no such section; surface the missing UX owner as a gap. Follow `SYNC:ui-intent-layer` below.

$docs-update
  → Near-final synchronization sweep across project docs, canonical specs, and configured test/evidence carriers
  → MUST run after the spec [mode=sync] step and before $workflow-end
  → Report skipped sub-phases explicitly when no impacted docs exist

$workflow-end

$watzup
  → Summary: capabilities updated, native spec roles changed, cases/evidence added or reconciled, new open questions, plus the $understand handoff when $watzup's large-change threshold is met
```

### New PBI / Requirement Update Protocol

Triggering update from new PBI or requirement (not code change):

```
After $workflow-review-changes:
  → User provides PBI text or requirement description
  → Map requirement → affected domain entities → affected capabilities
  → $dor-gate: required when a new/changed PBI is being made implementation-ready; PASS or WARN before planned specs/TCs become guidance
  → $pbi-mockup: required when the PBI changes user-facing UI/journeys; skip with reason for backend-only requirements
  → Treat as a speculative update: record planned intent/contracts in the native-contract-defined canonical roles and use its planned-state convention
  → Add or reconcile planned test/evidence cases in their native-contract-defined carriers; use `TC-` and `Status: Planned` only for the no-native-contract default
  → $artifact-review --type=spec-tests: review planned TCs before refreshing the derived index
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
$investigate
  → Quick codebase scan: current state of entities, commands, controllers (lightweight, 30min max)

$spec [mode=audit]
  → Compare each Feature Spec's last_updated vs git log of the source it documents
  → Output: stale capabilities/sections table with recommended update scope

$artifact-review
  → Consolidated audit report
  → Produce: tmp/reports/spec-audit-{date}-{Bucket}.md
  → Include: total stale coverage %, estimated update effort, priority order
  → (Optional) $spec-index [mode=audit] — report which DERIVED index/ERD aids lag their source specs

$docs-update
  → Near-final synchronization sweep; MUST run after artifact-review conclusions and before $workflow-end
  → Report skipped sub-phases explicitly when no impacted docs exist

$workflow-end

$watzup
  → Present action plan: which capabilities to update first
  → Recommend: run update mode scoped to stale capabilities
  → Run the $understand handoff when $watzup's large-change threshold is met
```

---

## Conditional Skip Rules

| Step                                           | Skip When                                                                                                      |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| §5 Mermaid ERD in no-native-contract init / native model role in profile init | Never skip the default inline §5 ERD; follow native requirements and block review when required model coverage is missing |
| `$spec [mode=tests]` in init                   | User explicitly requests a behavior/spec-only pass and the project contract permits test/evidence cases to be deferred to a later cycle |
| `$dor-gate` in update                          | Update source is code diff only, existing PBI is already DoR-ready, or no PBI readiness decision is being made |
| `$pbi-mockup` in update                        | Backend-only/non-UI requirement, code diff only, or existing mockup already covers the change                  |
| `$artifact-review --type=spec-tests` in update | `$spec [mode=tests]` skipped because no native-contract-owned case/evidence changed                                    |
| `$spec [mode=sync]`                            | No native-contract-owned case/evidence or declared derived output changed                                              |
| `$docs-update` near-final sync                 | Never skip entirely; sub-phases may be skipped only with explicit reason in the docs-update report             |
| `$artifact-review` audit pass                  | No stale specs found AND no UNVERIFIED items                                                                   |
| `$spec-index` (derived)                        | No derived index/ERD is maintained for this bucket, or it is already current                                   |

---

## Sub-Agent Coordination Protocol (init-full, 4+ capabilities)

1. `$investigate` + `$plan` in main context → capability registry + per-capability task list
2. Spawn `spec` sub-agents (one per capability) in ONE message
3. Wait for all sub-agents to complete
4. Spawn `spec [mode=tests]` sub-agents (one per capability) in ONE message to populate/reconcile native test-evidence carriers
5. Main context assembles + verifies in `$artifact-review`

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
  Phase 2: $spec update mode (impacted native roles of the canonical spec)
  Phase 3: $spec [mode=tests] (native-contract-defined test/evidence cases; default: Section 8 TCs)
  Phase 3.5: $artifact-review --type=spec-tests (required when Phase 3 changes cases/evidence)
  Phase 4: $spec [mode=sync] (refresh only declared derived indexes/evidence links)
  Phase 4.5: $spec-index (OPTIONAL — regenerate derived bucket INDEX / ERD if one is maintained)
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
| Update one specific Feature Spec after small change | `$spec` directly              |
| Add/sync configured test/evidence cases             | `$spec [mode=tests]` directly |
| Regenerate a derived bucket index / ERD             | `$spec-index` directly        |
| Understand one specific feature                     | `$investigate`                |
| Write integration tests from existing case contracts | `$integration-test`           |

---

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

---

**IMPORTANT MANDATORY Steps:** $investigate -> $plan -> $plan-review -> $plan-validate -> $spec -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $artifact-review -> $docs-update -> $workflow-end -> $watzup

> **[BLOCKING]** Each step that runs invokes its skill invocation; every other deviation follows `$start-workflow` → Step Execution Protocol. NEVER batch-complete validation gates.
> **[BLOCKING]** Confirm mode by asking the user directly BEFORE any action — NEVER skip Step 0.
> **[BLOCKING]** Spawn sub-agents for 4+ capabilities in ONE message — NEVER sequential spawning.
> **[BLOCKING — Context Compaction / Session Resume]** At any session start or after context compaction: (1) the current task list FIRST — resume existing, NEVER create duplicates; (2) re-enumerate the configured business root using its canonical naming/layout rule to see which capabilities already have a spec — skip those; (3) NEVER re-run `$investigate` or `$plan` in a resumed session.
> **[BLOCKING]** Read `{REF_DOCS_ROOT}/spec-principles.md` before any author/update/audit step. Apply its prose rules and banned-token checks only to roles/fields designated by the active artifact contract; preserve permitted detail in contract/evidence roles.

> **Goal Contract propagation (workflow-owned):** At workflow start, resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root, default `plans/`, relocated by `docsRoots.plans.path` in `docs/project-config.json` → create from the spec request). Map each spec/test/code cycle output (canonical specs authored, native cases/evidence reconciled, audit findings fixed) to the saved success criteria and append the evidence to the goal file's Iteration Log per cycle. Before `$workflow-end`, emit the Goal Satisfaction matrix (PASS/FAIL/BLOCKED); completion requires every required criterion PASS or BLOCKED with a user-facing escalation.

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

**IMPORTANT MUST ATTENTION** workflow steps follow the guided contract in `$start-workflow` — `gate` steps are fixed; other steps may flex only with a logged reason
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

- **[BLOCKING]** Confirm mode by asking the user directly BEFORE any action — NEVER skip Step 0
- **[BLOCKING]** Each step that runs invokes its skill invocation; every other deviation follows `$start-workflow` → Step Execution Protocol — NEVER batch-complete validation gates
- **[BLOCKING]** Spawn sub-agents for 4+ capabilities in ONE message — NEVER sequential spawning
- **[BLOCKING]** ONE canonical artifact per capability — use the path, section roles, identifiers, ownership, and evidence/test carriers declared by the active artifact contract; the portable README/eight-section/TC format applies only when neither a native profile nor local artifact contract exists. Do not create a parallel spec tree.
- **[BLOCKING]** investigate holistically FIRST — capability registry MUST exist before plan creation; NEVER re-run investigate or plan in a resumed session
- **[BLOCKING]** Trace the FULL vertical chain per capability (UI → API → handler → domain/rule → event → consumer → read model → UI) and pass the Step 1-INIT.4.6 reconciliation gate — no orphan UI, no orphan operation, event + read-side closure; a BROKEN chain is a spec-correctness finding, never silently dropped
- **[BLOCKING]** Every spec covers required intent, applicable contracts, acceptance, UI interaction intent when applicable, and test/evidence proof in their native-contract-defined roles; missing mappings or required coverage block review. In the no-native-contract default, keep §1–7 tech-free, include the mandatory inline §5 ERD, cover §6.2–§6.5 for UI features, and populate Section 8 cases with the required default fields.
- **[BLOCKING]** Whole-project / multi-bucket scope → size it via Step B (classify breadth → build the resumable Coverage Ledger), and clear the Whole-Project Completeness Gate (every capability REVIEWED or explicitly deferred) before `$workflow-end` — report `{reviewed}/{total}` in `$watzup`
- **[BLOCKING]** Plan decomposes big→small — ONE task per independently nameable capability spec; apply native split/cardinality rules, using the `>40` TC heuristic only when neither a native profile nor local artifact contract applies.
- **[BLOCKING]** Per-section authoring: write each section immediately — NEVER accumulate across sections
- **[REQUIRED]** Apply prose policy by native role: designated intent remains tech-agnostic, while allowed technical detail stays in contract/evidence roles; put identifiers and source evidence in configured carriers and mark unknown claims `[UNVERIFIED]`, never blank.
- **[REQUIRED]** Each sub-agent prompt MUST include: capability name, output path, tech-agnostic contract, SYNC protocols (critical-thinking, evidence-based, incremental-persistence, cross-scope boundary)
- **[BLOCKING]** Context compaction / session resume → the current task list first, re-glob existing Feature Specs, skip done capabilities — NEVER re-run investigate or plan
- **[BLOCKING]** artifact-review: PASS requires zero `[UNVERIFIED]` without exclusion reason and complete native role/evidence coverage; apply tech-term checks only to designated intent roles. Gap found → validate findings → fix only validated gaps that block the current round → restart the full artifact-review pass from the first check; Round 2 LOW-only findings are recorded as deferred and do not trigger another cycle, while binary gates remain blocking
- **[BLOCKING]** Verify the current task list count ≥ capability_count before any authoring begins — this is the plan completeness gate
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
