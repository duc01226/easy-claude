---
name: seed-test-data
version: 2.2.0
description: '[Dev Data] Use when a workflow step or the user asks for test-data seeders for QC happy paths. --mode=review audits a seeder read-only.'
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TaskCreate, Agent
---

<!-- REVIEW-POLICY-SOURCES:START -->
```json
{
  "version": 1,
  "defaultMode": "generate",
  "modes": {
    "generate": [],
    "review": [
      ".claude/skills/seed-test-data/references/seed-test-data-skill-review.md"
    ]
  }
}
```
<!-- REVIEW-POLICY-SOURCES:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Build configurable, local-development-only (default-enabled) seeders that exercise each feature's happy-path scenarios through public entry-point commands like a real user/QC tester (NEVER direct domain DB writes), repeat a configurable small-default count for case coverage and realistic data volume, remain idempotent and restart-safe, and ALWAYS follow the project's existing seed-data convention FIRST.

**Summary:**
- **Testability contract:** resolve Unit/Integration/System/E2E applicability from runner/config evidence; record owner/root/data, copy-ready full + focused commands, zero-match behavior, CI/simple Windows/macOS/Linux entry, unique run/data identity, and repeat proof; unresolved applicable fields block handoff, while non-applicable tiers require evidence-backed `N/A`.

- **Find the existing convention FIRST.** Before designing anything, discover the project's seeder base class, env-gate key, count config key, and registration with `file:line` evidence (Step 1) — match it exactly; never invent a parallel mechanism.
- Seeders orchestrate the real app pipeline like a real user: invoke the **public entry-point application commands** (which own validation, domain logic, and event side-effects) — never repo/DB inserts for domain entities, never duplicate command logic in the seeder.
- **Dual purpose, one mechanism — a configurable count:** repeat each happy-path scenario N times to (a) self-test the main cases (QC mimic) and (b) enrich data volume for many-users / performance / first-init realism. Read the count from config (never hardcode); **default small** when unset; zero → no-op.
- Four non-negotiable gates in order: (1) **environment gate** as the FIRST check (local-dev/enabled-config only), (2) **count-before-seed idempotency** (no re-seed when already seeded), (3) **restart-safe loop** from `existing_count` to `target_count` (never 0 — resume the remainder after stop/restart), (4) scoped DI per iteration — a shared scope silently corrupts the DbContext/session.
- Always pre-read `seed-test-data-reference.md` (project-reference docs root — default `docs/project-reference/`; path from `docsRoots.projectReference.path` in `docs/project-config.json`) + project-config `Data Seeders` group, then close with a fresh zero-memory `code-reviewer` round; re-review fully only after a validated fix.
- **Two modes — surface the flag:** default **Generate** (implement / enhance / fix a seeder); **`--mode=review`** = READ-ONLY convention audit grading a target (prompt → current changes → work-context) against EVERY universal rule + project conventions with `file:line` PASS/FAIL — routes confirmed fixes back to Generate, NEVER edits the seeder itself.
- **Main steps to run (Generate, in order — do not skip):** Phase 0 detect task type (new/enhance/fix) → Step 1 discover conventions (base class, env-gate key, count key, registration) → Step 1.5 verify dev-config keys exist → Step 2 feature scope + application commands → Step 3 find/create seeder → Step 4 implement (env-gate FIRST → config count → idempotency → restart-safe loop → scoped DI) → Step 5 validate every gate with `file:line` → Step 7 `--mode=review` self-audit on the changed code → fresh `code-reviewer` round → `/changes-review` (final).

**Workflow:**

Generate mode is the default; `--mode=review` remains read-only and routes confirmed fixes back to Generate.

1. **Phase 0** — Detect seeder task type (new / enhance / fix)
2. **Step 1** — Discover project seeder patterns, env gate key, count key
3. **Step 2** — Analyze feature scope + application commands
4. **Step 3** — Find or create seeder file
5. **Step 4** — Implement using language-agnostic algorithm
6. **Step 5** — Validate against universal rules
7. **Self-Review** — Re-run THIS skill in `--mode=review` over the changed seeder code (convention gate)
8. **Review** — Fresh sub-agent review round, then hand off to `/changes-review`

**Modes:**

- **Default (generate)** — implement / enhance / fix seeders. Everything in the Generate-mode Protocol below applies. The generate-mode task plan MUST end by re-running this skill in `--mode=review` (Step 7) BEFORE the `/changes-review` hand-off.
- **`--mode=review`** (read-only convention audit) — review a target against EVERY universal seed-data rule AND the project-specific seeder conventions, with `file:line` evidence and a PASS/FAIL verdict. Makes NO code changes; reports findings and routes confirmed defects back to generate mode for the fix. See [Mode: Review](#mode-review-seed-data-convention-audit).

**Key Rules:**

- ALWAYS find the project's existing seed-data convention FIRST — read `seed-test-data-reference.md` (project-reference docs root — default `docs/project-reference/`; path from `docsRoots.projectReference.path` in `docs/project-config.json`) and `docs/project-config.json` (`Data Seeders` context group) before writing any seeder changes; match the discovered pattern, never invent a new one
- ENABLE seeding by default ONLY on a local/development environment — the environment gate is the FIRST check, NEVER production
- SEED like a real user / QC tester — call the public entry-point application commands; NEVER call repository/DB directly for domain data
- NEVER duplicate command logic — seeder orchestrates, commands own validation
- ALWAYS make the seed count configurable and read it from config (NEVER hardcode); **default to a small number when nothing is configured**; zero → no-op
- A configurable count serves BOTH goals — self-test the main happy-path cases AND enrich data volume (many simulated users) for performance testing and realistic first-time-init data. **This count IS the volume knob `performance-review` measures against** (`SYNC:engineering-foundation-gate` **F5**): a perf claim needs ≥2 volumes ~10× apart to expose super-linear growth, and realistic **shape** — distribution, cardinality, skew — not N identical rows, because a hot-path query behaves differently against uniform data than against real skew
- GUARANTEE idempotency — check count before seeding; never re-seed already-seeded data on restart
- ALWAYS loop from `existing_count` to `target_count` so stop/restart resumes the remainder (target X, at 50% → continue until X), never re-seeding from 0
- SEED only states the application could actually produce — application-level operations guarantee reachability by construction; a direct store write fabricating an otherwise-unreachable state MUST be commented with why it is legitimate, and seeded entities MUST carry plausible relative timing rather than one shared instant

## Mode Routing (FIRST decision)

Before Phase 0, route on the invocation flag:

| Signal                                                                 | Mode                | Go to                                                    |
| ---------------------------------------------------------------------- | ------------------- | ------------------------------------------------------- |
| `--mode=review` flag, OR prompt asks to review/audit/check a seeder    | **Review**          | [Mode: Review](#mode-review-seed-data-convention-audit) |
| Any other invocation (implement / enhance / fix a seeder)              | **Generate** (default) | Phase 0 below                                           |

> **MUST ATTENTION** Generate mode OWNS the fix; Review mode is READ-ONLY and only reports. When Review mode finds a defect, it routes the fix back through Generate mode — it never edits the seeder itself.

## Phase 0: Detect Seeder Task Type _(Generate mode)_

Before any other step, classify the request:

| Task Type        | Detection                                      | Action                                         |
| ---------------- | ---------------------------------------------- | ---------------------------------------------- |
| New seeder       | No existing seeder for feature area            | Create following discovered base class pattern |
| Enhance existing | Seeder exists, needs new scenarios             | Read existing seeder, add without breaking     |
| Fix broken       | Seeder fails env gate / idempotency / DI scope | Diagnose via Universal Rules, fix at root      |
| Unknown          | Request ambiguous                              | Ask user — NEVER assume                        |

```bash
rg "{Feature}Seeder|{Feature}SeedData|{Feature}TestData" {configured-source-roots} -l
```

## Universal Seed Data Rules

> **Rule 0 — Convention First (priority before all others):** ALWAYS discover and follow the project's EXISTING seed-data convention before doing anything — base class, env-gate key, count config key, registration, seeder marker. Match it with `file:line` evidence; never invent a parallel mechanism. If no convention exists, propose the smallest one that fits the project's stack.

1. **Environment Gate (local-dev default-only)** — First check in seeder. Enabled by DEFAULT only on a local/development environment (or an explicit enable-config flag). NEVER seeds in production. The purpose is auto-setting-up feature test data on local/first-init, not a production data path.
2. **Command-Based (mimic a real user / QC tester)** — Seeds by calling the same PUBLIC entry-point application commands a real user or QC engineer would invoke, via the full pipeline (validation + domain logic + events). This is automated happy-path self-testing. NEVER direct DB/repo writes for domain entities.
3. **No Duplicate Logic** — Seeder provides realistic inputs. Commands own validation, domain logic, event side-effects.
4. **Idempotency (no re-seed when already seeded)** — Check existing count → calculate remaining → seed only the difference. On restart with data already seeded, seed NOTHING. Running N times converges to the target, never duplicating.
5. **Count-Configurable (dual purpose, small default)** — Read the seed count/times from the project config key (discovered Step 1); NEVER hardcode. **Default to a small number when nothing is configured.** The same count serves BOTH goals: repeating each scenario like a QC tester running it many times exercises the main cases AND enriches data volume (many simulated users) for performance testing and realistic first-time-init data. Zero → no-op.
6. **Restart-Safe (resume from last count)** — Supports stop/start/restart any number of times: the loop runs from `existing_count` to `target_count`, so if the target is X and only 50% of X is currently seeded, it continues until X is reached — never restarting from 0.
7. **Real-World Reachable State (seed only what the app could produce)** — Every seeded entity MUST represent a state the application itself could have produced. This is the deeper reason Rule 2 exists: an application-level operation can only ever leave reachable state behind. Where a direct store write is genuinely unavoidable, it MUST carry a comment stating WHY that state is legitimate (bootstrapping legacy/migrated data, an externally-owned record, a deliberately corrupt fixture for repair testing) — unexplained, it is a defect, not a fixture. Seeded entities MUST also carry **plausible relative timing**: stagger creation/update/activity stamps across a realistic span instead of stamping every record with one shared instant. — why: a corpus the application could never produce makes every test over it prove nothing, and a corpus where everything happened in the same millisecond hides ordering defects and makes time-window, sort, and pagination behaviour untestable.
8. **Spec-Consistent (Spec-Loop Discipline — tailored)** — Seeders are orchestration, NOT business logic, so property/metamorphic generation and the MUTATION-SCORE gate are **N/A here** — do not force them. Apply the dual-feedback half: every seeded scenario MUST stay consistent with the **§5 invariants** (commands own validation; a seeder that produces state violating an invariant is a bug, not a fixture). If a seeder encodes a **domain rule** — a required precondition, a status/relationship the scenario assumes, a business default — that rule belongs in the **spec**, not silently in the seeder: feed it into BOTH the spec (the rule) AND, where it is testable, the tests — never a seeder-only fix.

## Persistent Seed Run Contract

For every persistent-data run, record this contract before Step 3 and carry it into the seeder's verification report:

- **Public-path setup:** arrange prerequisites and domain data through supported public application commands/queries like a real user or QC tester. Direct repository/DB writes are not an ordinary seed path; any documented impossible-state exception remains labelled and justified.
- **Unique run identity:** create one unique, non-sensitive `runIdentity` per invocation and include it in synthetic business keys/values. A restart of the same run reuses that identity; an additive restart never mints a new batch.
- **Count-before-seed idempotency:** query `existing_count` by the deterministic seeder marker before creating anything, calculate the remainder, and no-op at/above the target. The target-mode loop starts at `existing_count`, never zero.
- **Restart safety:** after interruption, reuse the marker/run identity and create only missing keyed records; do not reset or delete persistent data to recover.
- **Realistic valid data:** every input must be valid and reachable through normal application behavior, with realistic relative timestamps/pacing rather than one shared synthetic instant.
- **Explicit additive accumulation:** declare `target` or `additive` mode. `target` converges to the configured count; `additive` is allowed only when explicitly required, preserves prior runs, appends new deterministic keys, and count-checks the current run batch for restart safety.
- **Integrity checks:** report `before`, `created`, `after`, the expected count equation, marker/key uniqueness, command success, and domain/reference invariants; any mismatch blocks completion.
- **Redaction:** reports and logs contain only counts/status and a safe opaque run identity; redact credentials, tokens, authorization headers, connection strings, PII, and full fixture payloads.

## Protocol _(Generate mode)_

### Generate-mode Task Plan (TaskCreate — required)

> **MUST ATTENTION** `TaskCreate` ALL of these BEFORE the first edit. The plan ALWAYS ends with a `--mode=review` self-audit, and `--mode=review` ALWAYS precedes the `/changes-review` hand-off — changes-review stays the final step.

1. Discover seeder patterns, env-gate key, count key (Step 1) — `file:line` evidence.
2. Verify dev config has env-gate + count keys (Step 1.5).
3. Analyze feature scope + application commands (Step 2).
4. Find or create the seeder file (Step 3).
5. Implement using the language-agnostic algorithm (Step 4).
6. Validate against the universal rules (Step 5) — `file:line` for every gate.
7. **Self-review the changed seeder code by re-running THIS skill in `--mode=review`** (convention gate over the just-changed code — MUST be a task, not optional). Fix any FAIL through this generate flow, then re-review.
8. Fresh zero-memory `code-reviewer` round (Review Loop).
9. Hand off to `/changes-review` (final step — review all changes before commit).
10. Analyze AI mistakes & lessons learned.

### Step 1: Discover Seeder Patterns

Search for project seeder conventions:

```bash
# Search configured source roots using the repository's discovered seed-data naming conventions
rg "{configured-seeder-interface-or-base-patterns}|seeder|SeedData|DataSeed" {configured-source-roots} -l
```

Record with `file:line` evidence:

- Seeder base class / interface
- Seeder registration mechanism (DI, module, startup hook)
- Environment gate method/key name
- Count multiplier config key name

### Step 1.5: Verify Dev Config Keys

Confirm dev config has both env gate key and count key. If absent, add following project's dev config convention. — why: missing keys silently disable the gate or count, producing no-op or unbounded seeding.

### Step 2: Feature Scope Analysis

Identify before writing any code:

1. **Feature area** — domain entity/aggregate being seeded
2. **Application commands** — `rg "{Feature}.*Command|{configured-command-handler-patterns}" {configured-source-roots} -l`
3. **Dependencies** — data must exist (users, orgs, prerequisite records)
4. **Scenarios** — 3–5 realistic variations (standard, boundary, multi-actor)
5. **Target count** — clarify: 1 scenario or N repetitions per scenario

### Step 3: Find or Create Seeder

```bash
rg "{Feature}TestSeeder|{Feature}SeedingHelper|{Feature}TestDataSeeder" {configured-source-roots} -l
```

- **Exists** → enhance with new scenarios, do NOT break existing ones
- **Absent** → create following discovered base class pattern

### Step 4: Implement

**Algorithm (language-agnostic):**

```
seeder():
  if not is_local_development_environment(): return   # default-enabled on local/dev only, NEVER prod
  if not seed_enabled_in_config(): return             # explicit enable flag (default on for local)
  target = config.get("SeedCount", SMALL_DEFAULT)     # configurable; small default when unset
  if target <= 0: return                              # zero → no-op
  existing = count_by_seeder_marker()                 # how much is already seeded
  if existing >= target: return                       # idempotent: already seeded → seed NOTHING
  for i from existing to target:                      # restart-safe: resume the remainder (e.g. 50% → target)
    call_application_command(build_scenario_input(i)) # public entry command, like a real user / QC tester
```

**Seeder marker** — stable predicate identifying seeded vs user data:

- Email prefix, created-by field, name prefix, or dedicated boolean flag
- MUST be deterministic across restarts

### Step 5: Validate

MUST ATTENTION verify all before complete:

- MUST ATTENTION environment gate is FIRST check — `file:line` evidence required
- MUST ATTENTION count-before-seed idempotency gate present — `file:line` evidence
- MUST ATTENTION loop starts at `existing_count`, not 0 — `file:line` evidence
- MUST ATTENTION only application-layer commands used for domain entities — NEVER repo/DB
- MUST ATTENTION no business logic or validation duplicated in seeder
- MUST ATTENTION seeder registered via project DI mechanism — `file:line` evidence
- MUST ATTENTION count config key read correctly (zero → no-op, NEVER hardcoded)
- MUST ATTENTION scoped DI per iteration — shared scope = DbContext/session corruption
- MUST ATTENTION every seeded state is one the application could actually produce; any unavoidable direct store write carries a comment justifying WHY that state is legitimate — `file:line` evidence
- MUST ATTENTION seeded entities carry plausible relative timing (staggered stamps), NEVER one shared instant
- MUST ATTENTION run identity, public-path setup, explicit target/additive mode, before/created/after integrity checks, and redacted evidence are present

## Sub-Agent Routing

| Task                                              | Sub-Agent               | When                        |
| ------------------------------------------------- | ----------------------- | --------------------------- |
| Discover seeders + commands across large codebase | `general-purpose`       | Steps 1-2                   |
| Review seeder compliance                          | `code-reviewer`         | Round 1 post-implementation |
| Seeder handles credentials/PII                    | `security-auditor`      | Security-sensitive patterns |
| Seeder runs 1000+ records                         | `performance-optimizer` | Performance-intensive       |

**All sub-agent prompts MUST include:**

```
Optional (a stale-able hint; graph DB active and the blast radius looks high-risk). After grep finds key files:
python .claude/scripts/code_graph trace <file> --direction both --json
Pattern (when used): grep → optional trace → grep verify.
```

## Anti-Patterns

| Anti-Pattern                            | Correct                                                               |
| --------------------------------------- | --------------------------------------------------------------------- |
| Direct repo insert for domain entities  | Call application command                                              |
| Seeder validates business rules         | Command owns validation; seeder provides valid inputs                 |
| No idempotency check                    | Check count first; seed only remaining                                |
| Hardcoded count (`for i in 0..10`)      | Read count from config key (discovered Step 1)                        |
| No environment gate                     | Check project env gate key first                                      |
| Shared DI scope across loop iterations  | Use project's scoped DI per iteration (prevents DbContext corruption) |
| Seeded state no application operation could produce | Seed it through an application-level operation; if a direct write is unavoidable, comment WHY that state is legitimate |
| Every seeded record sharing one creation instant    | Stagger stamps across a realistic span so ordering / time-window behaviour stays testable |
| Batch-all-then-write sub-agent findings | Persist findings per file; NEVER batch at end                         |

## Review Loop

**Round 1:** After implementation, spawn fresh `code-reviewer` sub-agent with zero memory of implementation:

```
Review seeder at [file:path]. Verify with file:line evidence for each:
1. Environment gate is FIRST check
2. Idempotency: count-before-seed pattern present
3. Loop starts at existing_count not 0
4. Zero application-layer command bypasses (direct repo/DB = FAIL)
5. No hardcoded count — config key read
6. Scoped DI per iteration
Report: PASS or FAIL with file:line for each finding.
```

**Fix loop:** If FAIL → validate findings → fix validated findings that block the current round → restart full review from first phase. Round 1 treats every open validated finding as blocking (Round-1 LOW closure); from round 2 onward, a LOW-only result ends the loop with LOWs recorded under `## Deferred LOW Findings (severity floor, round ≥2)`, while CRITICAL/HIGH/MEDIUM and failed binary gates remain blocking. When restarted review uses sub-agents, NEVER reuse them across rounds. If the same blocker repeats across 2 full invocations with no progress, escalate to user.
NEVER fix unvalidated findings. Do not spawn a fresh sub-agent only to re-review known findings before validation/fix.

---

## Mode: Review (seed-data convention audit)

**Seeder source review only:** after R0 resolves concrete seeder code, follow `.claude/skills/shared/review-preparation.md` before audit. Use the actual skill/mode and selected required documents; inherit the parent decision, including explicit `--provider-decision skip` on children/rechecks, under the recipe’s read-only-leaf and exact-target limits. Generate mode and data execution are excluded.

**Read when `--mode=review` is selected or Generate reaches its required self-audit:** load [the complete read-only audit protocol](references/seed-test-data-skill-review.md) before resolving the target or grading any rule. It owns R0–R3, the full checklist and review task plan; Universal Rules above remain mandatory.

---

## Next Steps

> **Inside a workflow** (THIS run is a step of a `[Workflow]` row: its own phase tasks are linked to that parent row, `nested=true` — a `[Workflow]` row that merely exists in `TaskList`, such as an abandoned one, does not count): skip the prompt below — the workflow's own next step is the next action. **Otherwise (standalone, or only an unrelated `[Workflow]` row exists):**
>
> **MUST ATTENTION** after completing (Generate mode): use `AskUserQuestion` — do NOT skip. Step 7 self-review (`--mode=review`) MUST have run on the changed code BEFORE these:

- **"/workflow-review-changes (Recommended)"** — final step: review all changes before commit (runs AFTER the `--mode=review` convention self-audit)
- **"/integration-test"** — write tests verifying idempotency and count compliance
- **"Skip, continue manually"** — user decides

---

> **[IMPORTANT]** `TaskCreate` for ALL tasks BEFORE starting. For simple tasks, ask user whether to skip.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `measured-capacity-engineering` — Model demand, reduce measured work safely and prove capacity before scaling; planning, building, testing or reviewing hot paths, caches or capacity → .claude/skills/shared/protocols/measured-capacity-engineering.md
- `real-world-fidelity-testing` — Integration, E2E and system tests exercise real boundaries; authoring, reviewing or repairing integration, E2E or system tests → .claude/skills/shared/protocols/real-world-fidelity-testing.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
- `understand-code-first` — Read and trace the target and existing patterns before changing code; planning or editing code → .claude/skills/shared/protocols/understand-code-first.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code/conventions BEFORE any modification or explanation. The code graph is optional advice for high-risk blast radius (a hint that may be stale), never a requirement.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->


<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

<!-- SYNC:measured-capacity-engineering:reminder -->

**MUST ATTENTION** capacity work: model demand/SLO and distinguish sessions from RPS/in-flight work; disclose load model and offered vs achieved demand; reduce measured work at a safe owner; preserve cache authorization/freshness/bounds; prove cold-state, overload recovery and justified headroom before scaling. Static review returns a verification plan, not invented throughput. Retain the hosting skill's scores, gates and authority.

<!-- /SYNC:measured-capacity-engineering:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** Testability contract: resolve evidence-backed Unit/Integration/System/E2E rows, copy-ready full/focused commands, zero-match failures, owner/root/data, CI/simple Windows/macOS/Linux entry, unique run identity, and repeat proof before claiming setup, review, or test completion.
**IMPORTANT MUST ATTENTION Goal:** Build configurable, local-development-only (default-enabled) seeders that exercise each feature's happy-path scenarios through public entry-point commands like a real user/QC tester (NEVER direct domain DB writes), repeat a configurable small-default count for case coverage and realistic data volume, remain idempotent and restart-safe, and ALWAYS follow the project's existing seed-data convention FIRST.

**IMPORTANT MUST ATTENTION — Main steps (execute in order, NEVER skip/merge):** (1) Route `--mode=review` to the read-only audit or default to Generate → (2) detect new/enhance/fix task type → (3) discover the project's seeder base, env gate, count key, marker, registration, and dev-config keys → (4) analyze feature scope, public commands, dependencies, scenarios, and target count → (5) find/create the seeder → (6) implement env gate first, configurable count, idempotency, restart-safe loop, public commands, and scoped DI → (7) validate every universal/project rule with `file:line` evidence → (8) run the `--mode=review` self-audit → (9) run a fresh zero-memory review and `/changes-review`; if findings exist, validate before fixing and full-re-review after fixes → (10) persist lessons and unresolved gaps.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Understand Code First:** ALWAYS search 3+ patterns and read code before writing.
- **Evidence:** MUST ATTENTION cite `file:line` per claim; declare confidence; "insufficient evidence" valid.
- **Real-World Fidelity:** seed only states the application could actually produce; realistic relative timing; label any deliberately unreachable fixture.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** FIND the project's existing seed-data convention FIRST (base class, env-gate key, count key, registration, marker) and MATCH it — never invent a parallel mechanism — why: a divergent seeder fragments the codebase and silently breaks the project's restart/idempotency guarantees
**IMPORTANT MUST ATTENTION** ENABLE by default ONLY on a local/development environment (env gate is the FIRST check) — auto-setup for local/first-init, NEVER production
**IMPORTANT MUST ATTENTION** SEED like a real user / QC tester — call the PUBLIC entry-point application commands; NEVER call repo/DB directly for domain data — why: bypassing the command pipeline skips validation, domain logic, and event side-effects, producing invalid state that passes silently
**IMPORTANT MUST ATTENTION** GUARANTEE idempotency — check count before seeding; on restart with data already seeded, seed NOTHING — why: re-seeding duplicates data and breaks the QC/perf baseline
**IMPORTANT MUST ATTENTION** loop from `existing_count` to `target_count` — NEVER from 0 — supports stop/restart any number of times: target X at 50% → continue until X — why: looping from 0 re-seeds on every restart and breaks restart-safety
**IMPORTANT MUST ATTENTION** scoped DI per iteration — shared DI scope = silent DbContext/session corruption
**IMPORTANT MUST ATTENTION** ALWAYS make the count configurable and read it from the discovered config key — NEVER hardcode; **default to a SMALL number when nothing is configured** (zero → no-op, never unbounded loop); the same count serves BOTH self-testing the main cases AND enriching volume for performance / many-users / first-init realism
**IMPORTANT MUST ATTENTION** NEVER duplicate command logic in the seeder — seeder provides realistic inputs, commands own validation/domain/events
**IMPORTANT MUST ATTENTION** SEED only states the application could actually produce — application-level operations guarantee reachability by construction; a direct store write fabricating an otherwise-unreachable state MUST carry a comment saying why it is legitimate, and seeded entities MUST carry plausible relative timing rather than one shared instant — why: a corpus the application could never produce makes every test over it prove nothing, and same-instant data hides ordering and time-window defects
**IMPORTANT MUST ATTENTION** every seeded scenario MUST stay consistent with the §5 universal invariants; if a seeder encodes a domain rule (precondition, status, default) feed it into the spec — and tests where testable — NEVER a seeder-only fix — why: a hidden rule in a seeder drifts from the spec and breaks future readers

**IMPORTANT MUST ATTENTION Evidence gate:** cite `file:line` for the env gate, count gate, loop start, DI scope, and seeder registration — confidence >80% to act, <60% DO NOT recommend; "Insufficient evidence" is valid output
**IMPORTANT MUST ATTENTION** search 3+ existing seeder patterns and READ them before writing — match the discovered base class / env-gate / count-key conventions exactly; verify the copied pattern shares the same preconditions (base class, scope, lifetime) before reuse
**IMPORTANT MUST ATTENTION** read `seed-test-data-reference.md` (project-reference docs root — default `docs/project-reference/`; path from `docsRoots.projectReference.path` in `docs/project-config.json`) + `docs/project-config.json` (`Data Seeders` group) BEFORE any seeder change — project conventions override generic defaults
**IMPORTANT MUST ATTENTION** `TaskCreate` — break all work into tasks BEFORE starting; transition one task at a time, evidence per completed step
**IMPORTANT MUST ATTENTION** close with a fresh zero-memory `code-reviewer` round; full re-review is required after a validated fix cycle or an explicitly declared independent-pass minimum — a clean review pass ENDS the review once the persisted `minRounds` is met; NEVER fix unvalidated findings
**IMPORTANT MUST ATTENTION Modes:** default = **Generate** (implement/enhance/fix); `--mode=review` = READ-ONLY convention audit (resolve target: prompt → current changes → work-context; read the reference doc + Universal Rules FIRST; grade every rule with `file:line`; route fixes back to Generate — NEVER edit in review mode)
**IMPORTANT MUST ATTENTION** the Generate-mode task plan MUST end with a `--mode=review` self-audit over the changed seeder code, and that self-audit MUST run BEFORE the `/changes-review` hand-off — `/changes-review` stays the final step

**Anti-Rationalization:**

| Evasion                                      | Rebuttal                                                       |
| -------------------------------------------- | ------------------------------------------------------------- |
| "Simple seeder, skip review loop"            | Idempotency bugs are silent. Run Round 1 always.              |
| "Skip the `--mode=review` self-audit"        | It's a required task — convention gate runs BEFORE `/changes-review`, never instead of it. |
| "Review mode can just fix the seeder"        | Review is READ-ONLY. Route the fix back through Generate mode, then re-review. |
| "Already know the base class"                | Show `file:line`. No proof = no knowledge.                    |
| "Environment gate is obvious"                | Verify it's FIRST check with `file:line` evidence.            |
| "Just hardcode count for now"                | NEVER — config key required. Find it in Step 1.               |
| "Seeder can validate this quickly"           | NEVER duplicate logic — command owns validation; seeder feeds inputs. |
| "Skip the reference docs, I know seeders"    | Project conventions override generic patterns. Read them first. |
| "Existing scenarios look fine, skip enhance" | Read all scenarios; enhancement may conflict — verify first.  |

**[TASK-PLANNING]** Before acting, break task into small todo tasks using `TaskCreate`.

**IMPORTANT MUST ATTENTION** apply every Universal Seed Data Rule and the Persistent Seed Run Contract above; closing priorities remain convention-first, env-gate FIRST, public commands, small configurable count, idempotency/restart safety, and evidence per gate.
