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
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
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

**Situation-based docs:**
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `configured styling reference`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
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
- Invoke skill invocation for EACH step — NEVER batch-complete or mark done without invocation
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
  → Session summary: capabilities authored, files written, ~lines, native case/evidence counts (TC counts only for the no-native-contract default), coverage gaps, open questions (confidence < 80%), plus final $understand handoff
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
  → Summary: capabilities updated, native spec roles changed, cases/evidence added or reconciled, new open questions, plus final $understand handoff
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
  → Run final $understand handoff
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

> **[BLOCKING]** Invoke skill invocation for EACH step — NEVER batch-complete, NEVER mark done without skill invocation.
> **[BLOCKING]** Confirm mode by asking the user directly BEFORE any action — NEVER skip Step 0.
> **[BLOCKING]** Spawn sub-agents for 4+ capabilities in ONE message — NEVER sequential spawning.
> **[BLOCKING — Context Compaction / Session Resume]** At any session start or after context compaction: (1) the current task list FIRST — resume existing, NEVER create duplicates; (2) re-enumerate the configured business root using its canonical naming/layout rule to see which capabilities already have a spec — skip those; (3) NEVER re-run `$investigate` or `$plan` in a resumed session.
> **[BLOCKING]** Read `{REF_DOCS_ROOT}/spec-principles.md` before any author/update/audit step. Apply its prose rules and banned-token checks only to roles/fields designated by the active artifact contract; preserve permitted detail in contract/evidence roles.

> **Goal Contract propagation (workflow-owned):** At workflow start, resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root, default `plans/`, relocated by `docsRoots.plans.path` in `docs/project-config.json` → create from the spec request). Map each spec/test/code cycle output (canonical specs authored, native cases/evidence reconciled, audit findings fixed) to the saved success criteria and append the evidence to the goal file's Iteration Log per cycle. Before `$workflow-end`, emit the Goal Satisfaction matrix (PASS/FAIL/BLOCKED); completion requires every required criterion PASS or BLOCKED with a user-facing escalation.

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call the current task list first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] /skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** the current task list done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

<!-- SYNC:ui-intent-layer -->

> **[BLOCKING] Capture a tech-agnostic UI/UX intent layer in every UI-bearing spec — a reader must be able to visualize how the feature works without naming any technology.** When the feature has a user interface, the spec MUST ATTENTION carry an interaction-surface section so the application — not just its API — can be rebuilt on any stack:
>
> **Native-first resolution.** A native contract may be declared by config or local references. Before authoring, resolve the configured profile's intent/evidence section roles, logical IDs, and carrier from `docs/project-config.json` (`specArtifacts`) and the required local references, and map every item below onto them. An unresolved owner, role, ID, carrier, or companion link stays `UNKNOWN`/`BLOCKED` — never guessed.
>
> 1. **View Inventory** — list each view/screen by its UX ROLE and purpose (e.g. "list of items", "item editor", "confirmation step") and what information it presents. Describe by role, never by an implementation name. Per view, record its **information priority** — each piece of information and each input the user meets is classified `now` (the view's task needs it), `later` (deferred to a follow-up view or step), or `not here` (belongs elsewhere) — and its **container role** (full view · focused dialog · side panel · stepped flow · inline edit), chosen for the task, never by habit.
> 2. **Navigation Map** — how a user moves between views: entry points, transitions, and exits. Trace how this surface connects to neighboring features already in the system.
> 3. **Key observable states** — the distinct states a user can observe per view (empty, loading, populated, error, success, permission-denied, etc.) — described as what the user perceives, not how it is rendered.
> 4. **Per-story action flows** — for each user story, the step-by-step click/action path from intent to outcome, cross-referenced to the logical IDs the configured profile owns.
> 5. **Couple to the companion design artifact** — keep deep visual fidelity (layout, tokens, pixel detail) OUT of the spec; it lives in the linked companion design artifact. Record that artifact's path in the spec frontmatter so the spec stays the navigable hub.
>
> **M1-clean (NON-NEGOTIABLE):** the prose names ZERO frameworks, routes/URLs, CSS, or component-class names — only roles, information, states, and action flows. Technology detail belongs in the companion design artifact, never here.
>
> **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** cross-reference each action flow to the default logical IDs `US-`/`OP-`/`BR-`, and record the companion artifact in the default `design_spec:`/`mockup:` frontmatter keys.
>
> **Skip ONLY** when the feature is backend-only (no UI) — state that reason explicitly in the section.

<!-- /SYNC:ui-intent-layer -->

<!-- SYNC:session-goal-ledger -->

> **Session Goal Ledger** — Never lose the user's original request or any later prompt, however long the session runs. Hook-independent: binds every host; a prompt-ledger hook is only an accelerator.
>
> 1. **Pin before acting.** Before the first tool call, write `Original goal: <user's request, verbatim or faithfully condensed>` and keep it as the first task-list item. For workflow or plan work, copy it verbatim into the Goal Contract `## Original Request`.
> 2. **Track every prompt.** Keep `User prompts this session: P1…Pn` — one line per user prompt or input, marked `extends` / `narrows` / `changes` / `answers`. A prompt that changes direction updates the goal explicitly — never silently.
> 3. **Re-anchor.** Re-read the original goal and the prompt list at every workflow step, before delegating (the sub-agent brief carries the verbatim goal), and after compaction, resume, or a `[[prompt-ledger@…]]` reminder. When `tmp/prompt-ledger/<session>/ledger.md` exists it is the durable record — read it after compaction.
> 4. **Verify before done.** Map the final result to the original goal and every prompt: `P# → done | deferred (reason) | not applicable`. An unaddressed prompt blocks completion.
> 5. **Security.** NEVER copy secrets, tokens, or credentials into goal lines, task lists, briefs, or reports — redact them.
>
> **Blocked until:** original goal pinned · prompt list current · final result mapped to every prompt.

<!-- /SYNC:session-goal-ledger -->

<!-- SYNC:workflow-registry-binding -->

> **Workflow ⇄ Registry Two-Way Binding** — a workflow is defined in TWO places that MUST agree: the machine registry `.claude/workflows.json` → `workflows.<workflow-id>`, and this skill's `SKILL.md`. Neither is complete alone. Read BOTH before executing, in this order.
>
> **1. Registry → skill (what the registry owns).** Before the first step, read `.claude/workflows.json` → `workflows.<workflow-id>` and treat it as CANONICAL for:
>
> | Registry field | Governs | Rule |
> | --- | --- | --- |
> | `sequence` | the ordered step list | Execute 1:1. NEVER improvise, reorder, add, or drop a step. |
> | `sequence[].applicability` | every conditional step | `when` is the ONLY run condition; on skip, record `skipReason` VERBATIM as the step's evidence. |
> | `sequence[].args` | step flags | Pass exactly as declared. |
> | `parallelGroups` | all-return barriers | Spawn all members in ONE message; advance only after EVERY member returns. |
> | `stepMeta` | inline vs sub-agent, context budget | Overrides the skill's own front matter. |
> | `preActions.injectContext` | mandatory pre-read context | Apply before step 1. |
> | `variants` / `defaultMode` | mode selection | A variant is a COMPLETE sequence; it inherits nothing from the base. |
>
> **2. Skill → registry (what this SKILL.md owns).** The registry declares WHICH steps run in WHAT order; this SKILL.md declares HOW each step executes — protocols, gates, loops, evidence bars, escalation. Each `sequence[].skill` resolves to `.claude/skills/<skill>/SKILL.md`; the workflow's `preActions.readFiles` names this file as the reverse pointer. Read a step's own SKILL.md before running it.
>
> **3. Precedence on conflict.** Registry WINS on step identity, order, args, applicability, barriers and execution mode. SKILL.md WINS on how to perform a step and on the quality bar it must clear. A genuine contradiction between the two — a step in one and not the other, a different order, or an applicability note whose meaning differs — is DRIFT: note the mismatch in your evidence, continue under the precedence above, and report it when the run ends. NEVER silently pick a side, and NEVER edit one side to match without saying so.
>
> **4. Keep both sides equal when editing either.** Changing a sequence, an occurrence ID, or an `applicability` note in `workflows.json` REQUIRES the matching update in this SKILL.md, and vice versa. Specifically: the `**IMPORTANT MANDATORY Steps:**` line MUST remain a clean `->` chain equal to the registry `sequence` (it is parsed, not prose — annotations there break the gate), any conditional step's note here MUST carry the registry's `skipReason` verbatim, and the step-task table's `Conditional?` column MUST match the presence of `applicability`. After editing either side, re-mirror with `$sync-codex` (`node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`).
>
> **Blocked until:** the registry entry for this workflow has been read, its `sequence` reproduced 1:1 into the task list, and every `applicability` condition evaluated with its verdict recorded.

<!-- /SYNC:workflow-registry-binding -->

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

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `spawn_agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
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

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

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
- **[BLOCKING]** Invoke skill invocation for EACH step — NEVER batch-complete or mark done without invocation
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
## Common AI Mistake Prevention (System Lessons)

- **Resolve project applicability before using framework examples.** Read the project config and relevant references, then inspect local evidence; honor explicit N/A and never impose a language, framework, architecture layer, styling method, tool, or runtime surface the project does not use.
- **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
- **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **Ownership before action.** When investigating a failure, ask which part owns the behavior before changing anything. Trace the wrong state to the component responsible for its invariant, then make one authoritative correction there.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec if one exists (the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, and state). Verify each against evidence, not intuition. Ask "what would falsify this?" — if nothing, it is not a hypothesis. The most expensive failure is going deeper into an assumed area while the real issue sits in an unexamined condition.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem; avoid unrelated cleanup. For review or enhancement work, announce improvements beyond the main request rather than silently expanding scope. Ask: "Would this change exist if I were not addressing this request?" — if not, remove it or disclose it.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Judge the environment before judging the code — a competing hypothesis, not a fallback.** A bug, failed test, error, or odd output is NOT proof of a code defect. Before deep tracing and before any verdict, sweep environment preconditions (toolchain/dependency/lockfile state, stale build or cache artifacts, env vars and config profile, service dependencies up-migrated-seeded, ports/network/clock, OS-path/locale, permissions and locks, leftover processes/containers/test data) AND transient resource pressure (RAM/OOM, CPU saturation under parallel workers, disk/temp exhaustion, handle and connection-pool limits, network flakiness, a timeout that is really slowness). Tell-tale shape: non-deterministic, timing-dependent, passes alone but fails in parallel, fails only on one machine or only on CI, or an error naming resources rather than business rules. Cite the discriminator you ran (clean environment? did code on the failing path change since it last passed? one machine or all? concurrency 1 or a clean rebuild?) — a verdict without one is a guess, for code as much as for the environment. Fix an environment cause in the environment or setup; NEVER edit product code or weaken/skip a test to absorb it, and a failure that vanishes on retry stays unexplained until its mechanism is named. — why: forcing green against an environment fault hides the real defect and permanently rots the test.
- **Cross-platform execution is a required contract.** Before authoring or changing a tool, script, process launcher, path assertion, or filesystem test, name the supported Windows, macOS, and Linux behaviors. Use platform-neutral Node APIs and literal argv vectors; never infer shell, temporary-path, executable-extension, ACL, or symlink semantics from the current host. Canonicalize existing paths before identity, hashing, or equality checks; test native Windows and POSIX seams when behavior differs; keep CI platform matrices authoritative. Preserve fail-closed security boundaries — repair the fixture or platform branch, never weaken the guard just to make one OS green.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
