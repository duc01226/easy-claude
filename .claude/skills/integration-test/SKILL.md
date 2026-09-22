---
name: integration-test
version: 2.2.1
description: '[Testing] Use when generating or reviewing integration tests.'
execution-mode: subagent
context-budget: high
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **Sub-Agent Selection:** Integration work routes to `integration-tester`; specialized work uses matching agents; parallel waves require disjoint writes and all-return barriers.
> **MUST ATTENTION READ** `.claude/skills/shared/sub-agent-selection-guide.md` before delegating.
>
> **Overlay Registry:** Exact > glob > all; derive bodies from `Name` inside the protocols directory; overlays add constraints and never waive framework gates.
> **MUST ATTENTION READ** `.claude/skills/project-skill-protocol/references/registry.md` when resolving overlays.

## Quick Summary

**Goal:** Generate/review integration tests across 5 modes (from-changes · from-prompt · review · diagnose · verify-traceability) that exercise the project's actual integration boundary and assert system-owned outcomes, so each test protects a profile-owned behavior contract and fails only when protected intent breaks.

## Case Contract Profile Gate (BLOCKING)

Before mode detection, test generation, or any spec/test mutation, read `docs/project-config.json`, `docs/project-reference/docs-index-reference.md`, `docs/project-reference/lessons.md`, the required local spec/integration-test references, and this skill's matching references. Resolve one profile:

- **Strict TC default:** neither config nor required project references explicitly declares a different canonical case owner, identity, carrier, section role, or case-to-test relation. Use the default Section 8 / `TC-{FEATURE}-{NNN}` procedure below.
- **Native profile:** config or a required project reference explicitly declares a different case contract. A missing optional profile field in config does not erase an explicit contract in a required reference. Use the native owner and the declarations below; do not create Section 8 or a duplicate TC registry.
- **Unresolved:** config is invalid/incomplete, required references conflict, or owner/identity/carrier/cardinality cannot be resolved. Report `BLOCKED`/`UNKNOWN`; do not infer a profile, fall back to TCs, generate tests from guessed intent, or claim coverage.

A changed root, template, filename, or test directory alone does not select a native case profile. Under a native profile, apply this crosswalk:

| Concern | Native-profile rule |
| --- | --- |
| Canonical owner and scope | Resolve the business root and canonical owner from config plus required references; read the owner's declared scenario/requirement contract. |
| Identity | MUST ATTENTION preserve the full owner-qualified case identity, including each declared variant. NEVER mint TC IDs or convert native IDs. |
| Test carrier | Use the configured/project-declared test carrier and every matched additive overlay requirement; do not require default `.NET` annotations unless the selected profile declares them. |
| Cardinality | Follow the profile's declared relation. A native profile may explicitly declare many-to-many: one aggregate executor can cover several listed scenarios, and one scenario may have several variant rows or tests. Do not force 1:1 or infer an undeclared relation. |
| Coverage proof | For each mapped identity, MUST ATTENTION inspect the actual executor and assertion, and record its observed result when run. An aggregate proves only the listed cases its inspected path/assertions cover; never invent per-variant reporter outcomes. A link, ID, comment, or generated matrix is not execution proof. |
| Reports and matrices | MUST ATTENTION substitute the native owner, case, variant, carrier, and result fields in every output table. `TC`, Section 8, and default annotation labels below are strict-default examples. |
| Missing or changed intent | Update only the canonical owner through its declared authoring procedure. Do not auto-create a TC/Section 8 shadow; unresolved intent or unavailable owner procedure is `SPEC-GAP`/`BLOCKED`. |
| Test result | MUST ATTENTION separate mapped, executed, and passed states. Only the configured runner's observed result proves execution; `UNKNOWN` is never `PASS`. |

The semantic floor is identical in every profile: MUST ATTENTION retain authored expected outcomes, assertions that fail when protected intent breaks, property plus boundary coverage for universal invariants, relevant authorization and preservation cases, real production paths, repeatability, operation authority, and spec/test/code drift adjudication. The strict-default procedures and report examples later in this file are conditional on selecting that profile; adapt their evidence and output fields to a native profile without dropping these gates. Matched project overlays add constraints and cannot waive a shared skill gate.

**Summary:**
- **Testability contract:** resolve Unit/Integration/System/E2E applicability from runner/config evidence; record owner/root/data, copy-ready full/focused commands, zero-match behavior, CI/simple-Windows entry, run/data identity, and repeat proof; missing applicable fields block handoff; non-applicable tiers need evidence-backed `N/A`.
- **Test fidelity:** trace the production entry path and invariant owner; assert meaningful outcomes (including persisted fields when persistence is part of the contract), never smoke-only setup checks; wait/poll only for documented asynchronous or eventual outcomes; use supported fixtures for preconditions without bypassing the boundary under test.
- **Traceability + conventions:** resolve the case profile first; use its owner, identities, carriers, and cardinality. The strict default uses `TestSpec`/`TechnicalSpec` and permits one business TC to map to many integration/unit tests; never impose that representation on a native profile. Search same-service tests and read `references/integration-test-patterns.md`; match local helpers/base/collection and organize by domain feature, never CQRS type.
- **Main steps (MANDATORY order):** (1) FIRST — read the selected canonical case owner and resolve needed scenario coverage; only the strict default creates/updates Section 8 TCs; (2) MIDDLE — implement locally patterned tests with the selected traceability carrier; (3) FINAL — reconcile changed behavior and the full affected owner/case scope across relevant test tiers using actual executor/assertion evidence, preserving declared variants/cardinality. Every mode: Detect → Find targets → Gather context → Execute → Report. Apply the repeat policy from `integrationTestVerify.guidance` (default: two fresh no-reset runs for persistent/shared-state suites); run the named coverage task and emit zero `GAP`/`UNKNOWN` results on every workflow/git-change/user-request run.

**Workflow:** Detect mode → Find targets → Gather context → Execute → Report

**Key Rules:**

- NEVER write smoke-only tests — trace the affected production boundary and assert the externally observable contract or relevant persisted state
- For async/eventually consistent outcomes, use the configured synchronization/polling helper; for synchronous persistence, assert with the project's normal deterministic read path
- Use the production entry path when that is the behavior under test; use project builders/factories/fixtures or other valid setup for unrelated preconditions, without skipping the tested contract
- MUST ATTENTION apply the Real-World Fidelity Gate BEFORE writing setup — a sequence, pacing, or data shape production can never reach proves nothing when green; fix the SCENARIO, never the assertion
- MUST ATTENTION search existing patterns FIRST before generating any test
- MUST ATTENTION READ `references/integration-test-patterns.md` before writing
- Organize tests using the project's established domain/module convention; do not impose CQRS folders or feature folders when the project has no such organization
- Every test method MUST carry the traceability form required by the selected profile. The strict default uses `TestSpec` for business §8 coverage and `TechnicalSpec` for technical-only regression coverage; only that profile auto-creates a Section 8 case for genuinely uncovered business behavior.
- Derive case count from distinct behaviors, invariants, risk, and meaningful boundaries; do not enforce an arbitrary minimum per command or endpoint
- Follow `integrationTestVerify.guidance`; when absent, require two fresh no-reset runs for suites with persistent/shared state before declaring that scope repeatable

---

**Prerequisites — MUST ATTENTION READ before executing:**

> **`references/integration-test-patterns.md`** — canonical templates: collection attributes, base classes, default traceability annotations, async polling, unique names, DB assertions. Read before writing ANY test and apply project-declared carriers when a native profile is selected.
>
> **The canonical business owner root** (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides the path) — read its existing cases and identity rules before generation. The strict default uses TC IDs.

- MUST ATTENTION READ `references/integration-test-patterns.md`, `domain-entities-reference.md` from the configured reference-docs root, and the canonical business owner root before generation; use the pattern doc for code conventions and the selected owner for case traceability. The strict default checks Section 8 TCs.

> **CRITICAL: Search existing patterns FIRST.** Grep same-service integration tests before generating; read ≥1 to match namespace/imports, collection, base class, and helpers. NEVER contradict established patterns.

> **CRITICAL: NO Smoke/Fake/Useless Tests.** Each test MUST cross the actual integration boundary it claims to cover and assert a meaningful system-owned outcome. Before assertions, trace the production entry point, contract owner, and observable effects; inspect handlers, entities, events, messages, or persisted records when those concepts exist in the selected architecture.

> **CRITICAL: Synchronize with asynchronous outcomes.** When the selected behavior completes through background work or eventual consistency, wait on an observable completion signal with the configured helper and bounded diagnostics. For synchronous behavior, use the project's normal deterministic assertion path. Never retry a failing final assertion to hide a product defect.

> **For test specifications and test case generation from PBIs, use `/spec [mode=tests]` skill instead.**

> **Invariant coverage.** For rules that must hold across a broad input domain, prefer property/metamorphic checks plus relevant boundary counter-cases when the project's test tools support them; retain example-based cases for concrete user scenarios. Trace each check through the selected canonical carrier, and use Section 8's Invariant/Property TC only under the strict default profile. Use mutation results as evidence of assertion strength, not as a universal required tool.

> **External Memory:** Complex/lengthy work → write findings to `tmp/reports/` to survive context loss.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim needs `file:line` or traced evidence; confidence >80% acts, <80% verifies first.

## First Principle — Easy to Change

> **Success metric:** _future change cost_. DRY, SRP, abstraction, patterns, naming, layering, and tests exist to **make the next change cheaper.**

Ask of every code, refactor, test, or abstraction: **does this make the next change cheaper or more expensive?**

- Reject practices raising change cost: premature abstraction, speculative generality, leaky indirection, ceremony without payoff.
- Name the enemies: **coupling, hidden state, duplicated knowledge, unclear intent, irreversible decisions exposed too early**.
- Simple, changeable design beats sophistication.

Apply this lens **before** any rule, pattern, or checklist; if a downstream rule raises change cost, this principle wins.

---

## Project Pattern Discovery

Before implementation, search codebase for patterns:

- Search: `IntegrationTest`, `TestFixture`, `TestUserContext`, `IntegrationTestBase`
- Look for: existing test projects, collection definitions, service-specific base classes

> **MANDATORY IMPORTANT MUST ATTENTION** plan task to READ `integration-test-reference.md` for project-specific patterns and code examples. If not found, continue with search-based discovery.

**Workflow:**

1. **Detect mode** — See Mode Detection below
2. **Find targets** — Identify test/command/query files
3. **Gather context** — Read relevant files for detected mode
4. **Execute** — Generate, review, diagnose, or verify
5. **Report** — Build check (generate), quality report (review), root cause (diagnose)

**Key Rules:**

- MUST ATTENTION search existing test patterns in same service BEFORE generating
- MUST ATTENTION READ `references/integration-test-patterns.md` before writing any test
- **Organize by domain feature, NEVER by type** — command + query tests for same domain → same folder (e.g., `Orders/OrderCommandIntegrationTests.*`). NEVER create `Queries/` or `Commands/` folder.
- Use project's unique name generator for ALL string test data
- Use project's entity assertion helpers for DB verification with async polling
- **CRITICAL MUST ATTENTION:** Mirror real workflows. When a command/query/seeder path exists, NEVER create or edit domain data through repositories; shortcut state is a test bug.
- **CRITICAL MUST ATTENTION:** ALWAYS wrap ALL DB assertions in async polling/retry — every assertion, not only async handlers. **DB data assertion → async polling. No exceptions.**
- **CRITICAL MUST ATTENTION:** Before assertions, READ handler/entity/event source; identify changed fields, created/updated/deleted entities, and fired handlers. **Smoke-only is FORBIDDEN** unless side effect is truly unobservable.
- **CRITICAL MUST ATTENTION:** Verification requires 2 consecutive successful suite/project runs without reset. One green run proves only the current run.
- Minimum 3 test methods: happy path, validation failure, DB state check
- **Authorization tests:** Multiple user contexts — authorized succeeds AND unauthorized rejected
- **Strict default only:** every business test method has `// TC-{FEATURE}-{NNN}: Description` + `TestSpec`; technical-only tests use `TechnicalSpec`; one TC may map to many methods.
- **Strict default only:** when a genuinely uncovered business behavior has no TC in the feature doc, add it to Section 8 before generation; never mirror a method already covered by an existing TC. Native profiles update only their declared owner/carrier through the native-profile sequence above.
- For comprehensive spec generation before coding → `/spec [mode=tests]` first

## Native-Profile Task Ordering

When the profile is native, perform the same quality sequence without executing the default-only Section 8/TC instructions below:

1. **FIRST: resolve canonical owner cases.** Read the affected owner and every applicable requirement/scenario, including declared variants. Record the owner-qualified identities and the configured case-to-test carrier. If the owner or required evidence field is missing, conflicting, or cannot be read, stop `BLOCKED`/`UNKNOWN`.
2. **MIDDLE: implement tests.** Exercise real production paths, use the profile's test carrier plus additive overlay requirements, and author expected outcomes that can fail when the protected intent breaks. For universal invariants, add the required property and boundary cases.
3. **FINAL: reconcile both directions.** Map each changed behavior to every applicable owner case and each affected owner case/variant to its actual executor and inspected assertion across integration and unit tests. Follow configured cardinality, including many-to-many mappings; an aggregate executor proves only the cases its actual path/assertions cover. Do not invent per-variant runner outcomes.
4. **Coverage task:** emit one owner/case/variant-to-executor/assertion matrix for the full affected owner scope, with `COVERED`, `GAP`, or `UNKNOWN`; zero `GAP`/`UNKNOWN` results are required for a pass. A mapped case is not an executed or passed case.
5. **Missing or stale contract:** do not create TC IDs, Section 8, or another registry. Route an actual owner change through its declared authoring procedure; preserve user confirmation and operation authority. If that procedure or intent is unavailable, leave the finding blocked.

## Mandatory Task Ordering (Strict TC Default Only)

ALWAYS create and execute tasks in this exact order:

1. **FIRST: Verify/upsert test specs in feature docs**
    - Read feature doc Section 8 (`{App}/README.{Feature}.md` under the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) for the target domain.
    - Verify matching `TC-{FEATURE}-{NNN}` for each test case.
    - Missing → create Section 8 entry with Priority, Status, GIVEN/WHEN/THEN, Evidence.
    - Incorrect → update to current behavior.
    - Output TC → test-method mapping. **One TC may map to many methods** across components/services; `TestSpec` is the join key.

2. **MIDDLE: Implement integration tests**
    - Generate files from task 1's TC mapping.
    - Put the configured test-framework TC annotation before each method, outside its body.
    - Follow existing test base-class patterns.

3. **FINAL: Verify traceability (1 TC : N tests) — WHOLE feature area, not only this run's TCs**
    - Grep test-spec annotations across **all** integration **and** unit suites; integration-only searches falsely orphan unit-covered TCs.
    - Grep **every** `TC-{FEATURE}-{NNN}` in Section 8 of all implicated feature docs, including untouched/pre-existing TCs.
    - Verify: each business method → **exactly one** doc TC (`TestSpec`); each technical-only method → `TechnicalSpec`; each doc TC → **≥1** test. **Many methods may cover one TC**; NEVER require 1:1 or split/technicalize a business TC (M1/M5; see `tc-format.md` → TC ↔ Test Code Cardinality).
    - Flag orphans: `TestSpec` TC absent from §8; technical-only method with business `TestSpec`; doc TC with **zero** tests. Many tests sharing one TC is NOT an orphan/duplicate.
    - Update each TC's `CoveredBy` with `{File}::{MethodName}` comma-separated **on one line**, or a large-set filter (field representative; code annotation authoritative). Unit tests MAY be included. Legacy `IntegrationTest:` is migration input only.

    > **MANDATORY task — "Validate: no missing integration tests" (non-skippable inside a workflow, with staged/unstaged git changes, or by direct request — essentially every run; only exception: narrow read-only single-TC lookup with no generation).** Create as its OWN named `TaskCreate` item, not folded into step 3. Run the same bidirectional logic as VERIFY-TRACEABILITY, scoped to the feature area:
    >
    > 1. Every changed command/query/handler/entity/event-handler file has **≥1** covering test (grep + read; name match alone NOT coverage).
    > 2. Every `TC-{FEATURE}-{NNN}` in the FULL Section 8 set of implicated feature docs has **≥1** covering test.
    > 3. Emit a table; require **zero GAP rows** before done:
    >
    > | TC / Changed File | Covering Test(s) | Status |
    > | ------------------ | ----------------- | ------------------------ |
    > | TC-{FEATURE}-{NNN} or {file:line} | {file}::{method}[, …] / NONE | COVERED / GAP |
    >
    > Any `GAP` row → generate the missing test (return to Step 3) before marking the task `completed`. Do NOT report done with an open GAP.

## Module Abbreviation Registry

| Module                  | Abbreviation | Test Folder      |
| ----------------------- | ------------ | ---------------- |
| Order Management        | OM           | `Orders/`        |
| Inventory               | INV          | `Inventory/`     |
| User Profiles           | UP           | `UserProfiles/`  |
| Notification Management | NM           | `Notifications/` |
| Report Generation       | RG           | `Reports/`       |
| Feedback                | FB           | `Feedback/`      |
| Background Jobs         | BJ           | —                |

## TC Code Numbering Rules (Strict TC Default Only)

Creating new `TC-{FEATURE}-{NNN}` codes:

1. Check feature doc first — `{App}/README.{Feature}.md` under the business spec root (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) has existing codes. New codes must not collide.
2. Decade-based grouping — e.g., OM: 001-004 (CRUD), 011-013 (validation), 021-023 (permissions), 031-033 (events). Find next free decade.
3. Unavoidable collision → renumber in doc only. Keep test-spec annotation unchanged; add renumbering note in doc.
4. Feature doc = canonical registry. Test-spec annotation = traceability only, not numbering source.

# Integration Test Generation

## Mode Detection

```
Args = command/query name (e.g., "/integration-test CreateOrderCommand")
  → FROM-PROMPT mode: generate tests for the specified command/query

No args (e.g., "/integration-test")
  → FROM-CHANGES mode: detect changed command/query files from git

Args = "review" (e.g., "/integration-test review Orders")
  → REVIEW mode: audit existing test quality, find flaky patterns, check best practices

Args = "diagnose" (e.g., "/integration-test diagnose OrderCommandIntegrationTests")
  → DIAGNOSE mode: analyze why tests fail — determine test bug vs code bug

Args = "verify" (e.g., "/integration-test verify {Service}")
  → VERIFY-TRACEABILITY mode: check test code matches specs and feature docs
```

> **Modes vs. sibling skills (name-collision note).** `review` and `verify` are lightweight inline branches, not standalone `/integration-test-review` (deep quality) or `/integration-test-verify` (full traceability) workflow steps. In `/integration-test → /integration-test-review → /integration-test-verify`, invoke the standalone skills; use modes for quick mid-generation passes.

## Step 1: Find Targets

### From-Changes Mode (default)

Run via Bash tool:

```bash
git diff --name-only; git diff --cached --name-only
```

Filter command/query files by project naming conventions (e.g., `*Command.*`, `*Query.*`). Use `docs/project-config.json` → `modules` or `backendServices` path patterns to derive service:

| Path pattern                                        | Service   | Test project                                         |
| --------------------------------------------------- | --------- | ---------------------------------------------------- |
| Per `docs/project-config.json` service path pattern | {Service} | `{Service}.IntegrationTests` (or project equivalent) |

Search for existing `*.IntegrationTests.*` projects to confirm mapping.

If no test project exists: inform user "No integration test project for {service}. See CLAUDE.md Integration Testing section to create one."

If test file already exists: ask user overwrite or skip.

### From-Prompt Mode

User specifies command/query name. Use Grep (NOT bash grep):

```
Grep pattern="{CommandName}" path="{configured-source-root}" glob="{configured-source-glob}"
```

## Step 2: Gather Context

For each target, read in parallel:

1. **Command/query file** — extract: class name, result type, DTO properties, entity type
2. **Existing test files in same service** — Glob `{Service}.IntegrationTests/**/*IntegrationTests.*`, read ≥1 for conventions (collection/suite name, test annotations, namespace/imports, base class)
3. **Service integration test base class** — grep: `class.*ServiceIntegrationTestBase`
4. **`references/integration-test-patterns.md`** — canonical templates (adapt {Service} placeholders)

## Step 2b: Look Up TC Codes (Strict TC Default Only)

For each target domain, read:

- `{App}/README.{Feature}.md` Section 8 under the business spec root (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) — primary source

Build mapping: test-case description → TC code (e.g., "create valid order" → TC-OM-001).

- No TC → **CREATE IT** in Section 8 before generation.
- Outdated/incorrect TC → **UPDATE IT** first.
- Missing Section 8 → run `/spec [mode=tests]` first.

## Step 2c: Real-World Fidelity Check (BEFORE any test code is written)

MUST ATTENTION answer BEFORE the Arrange block exists — never after failure:

> **"Can this sequence, timing, and data actually occur in production?"**

For each test, state:

- **Sequence** — can a real actor reach these steps in this order through the tested paths?
- **Pacing** — how far apart are production actor actions (milliseconds, seconds, minutes, hours)? Back-to-back distinct actions in one millisecond are a fidelity defect, NOT a speed-up.
- **Data shape** — can a real use-case path reach every seeded value (see direct-repository-write ban)?
- **Barrier** — for each actor-step gap, name the observable proving the prior step settled (persisted state, audit/version stamp, queue/worker idle marker, completion event) and poll it in ARRANGE.

Any "no" → fix the SCENARIO before writing; NEVER widen an assertion timeout afterward. Full contract: `SYNC:real-world-fidelity-testing`; barrier shape: `references/integration-test-patterns.md` → Pattern 10.

## Test Architecture Contract Preflight (before Step 3)

Before writing code, complete and preserve this additive matrix; it does not replace real-DI, TC-traceability, async-polling, or Real-World Fidelity gates.

| Tier | Applicability + evidence | Owner | Runner/framework | Test root | Fixture/data strategy | Full command | Focused/partial command | Zero-match behavior | CI gate | Simple/Windows entry point |
| ---- | ------------------------- | ----- | ---------------- | --------- | --------------------- | ------------ | ------------------------ | ------------------- | -------- | --------------------------- |
| Unit | `APPLICABLE` + `{file:line}` or `N/A — {evidence}` | `{owner}` | `{configured runner/framework}` | `{path}` | `{strategy}` | `{copy-ready command}` | `{copy-ready command or N/A + evidence}` | `{non-zero / configured behavior}` | `{gate}` | `{configured entry point or N/A + evidence}` |
| Integration/System | `APPLICABLE` + `{file:line}` or `N/A — {evidence}` | `{owner}` | `{configured runner/framework}` | `{path}` | `{strategy}` | `{copy-ready command}` | `{copy-ready command or N/A + evidence}` | `{non-zero / configured behavior}` | `{gate}` | `{configured entry point or N/A + evidence}` |
| E2E | `APPLICABLE` + `{file:line}` or `N/A — {evidence}` | `{owner}` | `{configured runner/framework}` | `{path}` | `{strategy}` | `{copy-ready command}` | `{copy-ready command or N/A + evidence}` | `{non-zero / configured behavior}` | `{gate}` | `{configured entry point or N/A + evidence}` |

- Record unique run-identity source/format and business-data suffix before generation; carry both into the report. Mark `APPLICABLE` only with runner/framework/config evidence; otherwise record `N/A — <file:line evidence>` and do not fabricate tests.
- Verify every command from project config, reference docs, or runner script. If focused scope is supported, provide its command; otherwise record `N/A` with evidence. Invalid/zero-match selections must fail or use documented non-green behavior; zero matches never pass.
- Record supported public-path setup, realistic valid data, `count-before-create` idempotent reference setup, keyed/additive persistent data, and per-test/worker isolation. Shared mutable state is not run identity.
- Matrix + run identity are required output evidence even for generate/review modes; execution results belong to `/integration-test-verify`.

## Step 3: Generate Test File

**File path:** `{project-test-dir}/{Service}.IntegrationTests/{Domain}/{CommandName}IntegrationTests{ext}` (adapt path/extension per `docs/project-config.json` → `integrationTestVerify.testProjectPattern`)

> **Folder = domain feature.** `{Domain}` = business domain (Orders, Inventory, Notifications, UserProfiles), NOT CQRS type. Command and query tests for same domain live in same folder.

**Structure:** adapt layout, imports, fixtures, assertions, and markers from existing tests in the configured project.

```csharp
namespace {Service}.IntegrationTests.{Domain};

[Collection({Service}IntegrationTestCollection.Name)]
[Trait("Category", "Command")]  // or "Query"
public class {CommandName}IntegrationTests : {Service}ServiceIntegrationTestBase
{
    // Minimum 3 tests: happy path, validation failure, DB state verification
}
```

**Test method naming:** `{CommandName}_When{Condition}_Should{Expectation}`

**Required patterns per command type:**

| Command type | Required tests                                     |
| ------------ | -------------------------------------------------- |
| Save/Create  | Happy path + validation failure + DB state         |
| Update       | Create-then-update + verify updated fields in DB   |
| Delete       | Create-then-delete + `AssertEntityDeletedAsync`    |
| Query        | Filter returns results + pagination + empty result |
| **Owns a universal hard rule or invariant in the selected profile** (orthogonal to the rows above — applies to the same command/query) | **+ Pattern 9 property/metamorphic test** plus boundary counter-case, tied to the profile's canonical invariant case. The strict default uses a §8 Invariant/Property TC; a native profile uses its declared identity/carrier. FORCED, not optional — a mutation of the invariant must fail an assertion. |

> **[FORCED BRANCH — property apparatus]** Pattern 9 is not a "nice-to-have reference". For ANY command/query that enforces a universal hard rule or invariant in the selected profile, example-based rows are NOT sufficient — generate the Pattern 9 property test and boundary counter-case. The strict default maps these to `[HARD]` §4 / §5 and its §8 property TC; a native profile uses its declared rule, case identity, and carrier. Skipping the property or boundary assertion leaves the invariant over-fitted to examples.

> **[REVIEW-BAR ALIGNMENT — write to the wider bar]** The property apparatus above is scoped to `[HARD]` §4 rules and §5 invariants, but the bar this suite is GRADED against is wider: `integration-test-review` **Gate 1** requires a killing assertion for **every changed core-logic line** and records a *Mutation Probe Ledger* with a `KILLED`/`SURVIVOR` verdict per line — no ledger, no PASS. So for each core-logic line the handler changes, ask now *"if I deleted or inverted this, which assertion fails?"* and add the missing assertion, rather than discovering the survivor in review. — why: authoring to a narrower bar than the reviewer grades guarantees a rework round on every change.

## Step 4: Verify

Build test project via project's build tool (see `/integration-test-verify` for config-driven build).

MUST ATTENTION verify ALL of the following:

- Test collection/group attribute present with correct collection name
- Test category annotation present
- All string test data uses project's unique name generator
- User context created via project's user context factory
- DB assertions use project's entity assertion helpers with async polling
- No mocks — real DI only
- Every test method has the traceability form required by the selected profile. The strict default uses `// TC-{FEATURE}-{NNN}: Description` plus its test-spec annotation.

## Example Files to Study

Search codebase for existing integration test files:

```bash
find . -name "*IntegrationTests.*" -type f
find . -name "*IntegrationTestBase.*" -type f
find . -name "*IntegrationTestFixture.*" -type f
```

| Pattern                                                            | Shows                        |
| ------------------------------------------------------------------ | ---------------------------- |
| `{Service}.IntegrationTests/{Domain}/*CommandIntegrationTests.*`   | Create + update + validation |
| `{Service}.IntegrationTests/{Domain}/*QueryIntegrationTests.*`     | Query with create-then-query |
| `{Service}.IntegrationTests/{Domain}/Delete*IntegrationTests.*`    | Delete + cascade             |
| `{Service}.IntegrationTests/{Service}ServiceIntegrationTestBase.*` | Service base class pattern   |

### How to Use for Each Case

**Case: Generate tests from existing test specs (feature docs Section 8)**

```
/integration-test CreateOrderCommand
```

→ Reads Section 8 TCs, generates test file with TC annotations

**Case: Generate tests from git changes (default)**

```
/integration-test
```

→ Detects changed command/query files, checks Section 8 for matching TCs, generates tests

**Case: Generate tests after /spec [mode=tests] created new TCs**

```
/spec [mode=tests] → /integration-test
```

→ spec [mode=tests] writes TCs to Section 8, then integration-test generates tests from those TCs

**Case: Review existing tests for quality**

```
/integration-test review Orders
```

→ Audits test quality, finds flaky patterns, checks best practices

**Case: Diagnose test failures**

```
/integration-test diagnose OrderCommandIntegrationTests
```

→ Analyzes failures, determines test bug vs code bug

**Case: Verify test-spec traceability**

```
/integration-test verify {Service}
```

→ Checks test code matches specs and feature docs bidirectionally

---

# REVIEW Mode — Test Quality Audit

Mode = REVIEW: audit existing integration tests for quality, flaky patterns, best practices.

## Sub-Agent Routing

| Input type                                        | Sub-agent            | Why                                                                                                                                |
| ------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Test file quality audit                           | `integration-tester` | Purpose-built for spec generation, TC traceability, and test patterns — catches integration-specific issues `code-reviewer` misses |
| Security-sensitive test data (PII, auth fixtures) | `security-auditor`   | Detects PII leakage in test fixtures                                                                                               |

## Sub-Agent Type Override

> **MANDATORY:** Integration test REVIEW mode spawns `integration-tester` sub-agent (`subagent_type: "integration-tester"`), NOT `code-reviewer`.
> **Rationale:** `integration-tester` specializes in test spec generation, TC traceability, CQRS test patterns, async-polling / eventual-consistency assertion correctness, and cross-service integration context — areas `code-reviewer` does not cover at depth.

**Fresh Eyes Protocol:** Run Round 1 inline. If findings are LOW confidence or contradictory → spawn fresh `integration-tester` sub-agent (zero memory of Round 1) for Round 2. Main agent reads report, NEVER filters findings. Max 2 rounds, then escalate.

## Review Workflow

1. **Find test files** — Glob `{Service}.IntegrationTests/{Domain}/**/*IntegrationTests.*`
2. **Read each test file** — analyze for quality issues (persist findings after each file per SYNC:incremental-persistence)
3. **Generate quality report** — categorized findings with severity
4. **Round 2 (if low confidence):** Spawn fresh sub-agent with report path — NEVER re-examine with main context

## Review Dimensions

**Dimension 1: Reliability** — Think: What causes intermittent failures?

- MUST ATTENTION flag **missing async polling** — DB assertions after async handlers without an await-until-condition poll (the project's async-assertion helper) → WILL flake
- MUST ATTENTION flag **missing retry for eventual consistency** — message bus / event handler / background job state without polling wrapper
- MUST ATTENTION flag **hardcoded delays** — `Thread.Sleep()`, `Task.Delay()` instead of condition-based polling
- MUST ATTENTION flag **race conditions** — tests modifying shared state without isolation (same entity ID, same user context)
- MUST ATTENTION flag **shared mutable data** (see `SYNC:test-data-isolation`) — assertions hung off a shared mutable entity another test can change, OR off a parent a bulk re-sync/recompute/rebuild/cascade consumer can wipe → not parallel-safe, even without your test mutating it
- MUST ATTENTION flag **non-unique test data** — hardcoded strings/IDs instead of unique generators
- MUST ATTENTION flag **time-dependent assertions** — `DateTime.Now` without time abstraction

**Dimension 2: Assertion Value** — Think: Does the test actually verify anything?

- MUST ATTENTION flag DI-resolution-only tests — smoke tests that just resolve services → HIGH severity
- MUST ATTENTION flag exception-check-only tests — `exception.Should().BeNull()` alone → HIGH severity
- MUST ATTENTION verify test reads handler/entity/event source and asserts specific field values
- MUST ATTENTION verify minimum 3 tests per command (happy path, validation failure, DB state)

**Dimension 3: Conventions** — Think: Does test follow project patterns?

- MUST ATTENTION verify collection/group attribute — correct collection name for shared fixture
- MUST ATTENTION verify category annotation or equivalent test-category marker when the project uses one
- MUST ATTENTION verify TC annotation — every test method has a TC code comment + the test-spec annotation
- MUST ATTENTION verify no mocks — real DI only
- MUST ATTENTION verify unique test data — all string data uses unique generators
- MUST ATTENTION verify user context — via factory, not hardcoded
- MUST ATTENTION verify DB assertions — uses entity assertion helpers, not raw DB queries

**Dimension 4: Code Quality** — Think: Maintainability and isolation?

- MUST ATTENTION verify method naming — `{Action}_When{Condition}_Should{Expectation}`
- MUST ATTENTION verify explicit Given-When-Then — map Arrange to Given, Act to When, and Assert to Then; the three phases must be clear and labeled
- MUST ATTENTION flag logic in tests — conditionals, loops, complex setup in test methods
- MUST ATTENTION verify test independence — each test runs in isolation

## Review Report Format

```markdown
# Integration Test Quality Report — {Domain}

## Summary

- Tests scanned: {N}
- Issues found: {N} (HIGH: {n}, MEDIUM: {n}, LOW: {n})
- Overall quality: {GOOD|NEEDS_WORK|CRITICAL}

## HIGH Severity Issues (Flaky Risk)

| Test         | Issue                                            | Fix                                    |
| ------------ | ------------------------------------------------ | -------------------------------------- |
| {MethodName} | DB assertion without polling after async handler | Wrap in project's async polling helper |

## MEDIUM Severity Issues (Best Practice)

| Test | Issue | Fix |
| ---- | ----- | --- |

## LOW Severity Issues (Style)

| Test | Issue | Fix |
| ---- | ----- | --- |

## Recommendations

1. {Prioritized fix suggestions}
```

---

# DIAGNOSE Mode — Test Failure Root Cause Analysis

Mode = DIAGNOSE: analyze failing tests to determine test bug vs application code bug.

## Diagnose Workflow

1. **Identify failing tests** — User provides test class name or run test suite to collect failures
2. **Read test code** — understand what test expects
3. **Read application code** — trace the command/query handler path
4. **Compare expected vs actual** — determine root cause
5. **Classify** — Test bug vs code bug vs infrastructure issue
6. **Report** — Root cause + recommended fix

## Root Cause Decision Tree

```
Test fails
├── Compilation error?
│   ├── Missing type/method → Code changed, test not updated → TEST BUG
│   └── Wrong import/namespace → TEST BUG
├── Timeout/hang?
│   ├── Missing async/await → TEST BUG
│   ├── Deadlock in handler → CODE BUG
│   └── Infrastructure down → INFRA ISSUE
├── Assertion failure?
│   ├── Expected value wrong?
│   │   ├── Test hardcoded old behavior → TEST BUG
│   │   └── Business logic changed → CODE BUG (if unintended) or TEST BUG (if intended change)
│   ├── Null/empty result?
│   │   ├── Entity not found → Check if create step succeeded → TEST BUG (setup) or CODE BUG (handler)
│   │   └── Query returns empty → Check filters/predicates → CODE BUG
│   ├── Intermittent (passes sometimes)?
│   │   ├── Async assertion without polling → TEST BUG (add async polling/retry)
│   │   ├── Non-unique test data collision → TEST BUG (use unique name generator)
│   │   └── Race condition in handler → CODE BUG
│   └── Wrong/empty count when path under test is provably innocent?
│       ├── Test data leak from other tests → TEST BUG (isolation: own fresh per-test data, not a shared mutable entity)
│       ├── Shared parent wiped by cross-cutting consumer (bulk re-sync, recompute, cascade) → TEST BUG (isolation) — suspect FIRST, grep other tests + consumers before blaming code
│       └── Logic error in query → CODE BUG
├── Validation error (expected success)?
│   ├── Test sends invalid data → TEST BUG
│   └── Validation rule too strict → CODE BUG
└── Exception thrown?
    ├── Known exception type in handler → CODE BUG
    └── DI/config error → INFRA ISSUE
```

## Diagnose Report Format

```markdown
# Test Failure Diagnosis — {TestClass}

## Failing Tests

| Test Method | Error Type        | Root Cause    | Classification              |
| ----------- | ----------------- | ------------- | --------------------------- |
| {Method}    | {AssertionFailed} | {Description} | TEST BUG / CODE BUG / INFRA |

## Detailed Analysis

### {MethodName}

**Error:** {error message}
**Expected:** {what test expected}
**Actual:** {what happened}
**Root Cause:** {explanation with code evidence}
**Classification:** TEST BUG | CODE BUG | INFRA ISSUE
**Evidence:** `{file}:{line}` — {what the code does}
**Recommended Fix:** {specific fix with code location}

## Summary

- Test bugs: {N} — fix in test code
- Code bugs: {N} — fix in application code
- Infra issues: {N} — fix in configuration/environment
```

---

# VERIFY-TRACEABILITY Mode — Test ↔ Spec ↔ Feature Doc Verification

Mode = VERIFY: bidirectional traceability check between test code, test specs, feature docs.

> **Relationship to Mandatory "no missing integration tests" task (Mandatory Task Ordering, step 3).** That task already runs SAME bidirectional logic, feature-area-scoped, EVERY run (workflow / git-changes-present / user-request) — not only when user explicitly types `verify`. This standalone VERIFY mode exists for on-demand, potentially broader (multi-feature-doc or whole-service) traceability sweep user invokes by name — not a separate, narrower obligation. Both apply same run → audit once, satisfy both.

## Verify Workflow

1. **Collect test methods** — Grep for test-spec annotations across all test projects/suites (integration **and** unit)
2. **Collect doc TCs** — Read feature doc Section 8 for all TC entries
3. **Build 3-way matrix** — Test code ↔ specs/ ↔ feature doc Section 8
4. **Identify mismatches** — Orphans, stale references, behavior drift
5. **Classify mismatches** — Which source is correct?
6. **Report** — Traceability matrix + recommended fixes

## Mismatch Classification

| Scenario                                          | Likely Correct Source                 | Action                                                                 |
| ------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| Test passes, spec describes different behavior    | Adjudication required                 | Compare against canonical product/spec intent before changing anything |
| Test fails, spec describes expected behavior      | Spec, unless spec intent is disproved | Update test to match intended spec behavior                            |
| Test exists, no spec                              | Adjudication required                 | Create spec from test only after confirming the test protects intent   |
| Spec exists, no test                              | Spec                                  | Generate test from spec                                                |
| Test and spec agree, but code behaves differently | Spec, unless both are stale           | Fix code or update spec+test after intent adjudication                 |

**Rule:** Passing code or tests NEVER automatically outrank canonical product/spec intent. NEVER update spec, test, or code on a behavior-changing mismatch until it reaches adjudication-required status with explicit evidence. — why: a green test can encode a regression, so code agreement alone cannot ratify a spec change.

## Verification Requirements

MUST ATTENTION verify ALL of the following:

- Every test method has matching TC in feature doc Section 8
- Every TC in Section 8 has matching test method (or marked `Status: Untested`)
- TC descriptions in docs match what test actually validates
- Evidence file paths in TCs point to current (not stale) code locations
- Business `TestSpec` annotations match TC IDs (no typos, no orphaned IDs); technical-only tests use `TechnicalSpec` and do not create §8 obligations
- Priority levels in docs match test categorization
- The business spec root dashboard (default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) is in sync with feature doc Section 8

## Verify Report Format

```markdown
# Traceability Report — {Service}

## Summary

- TCs in feature docs: {N}
- Test methods with TC annotations: {N}
- Fully traced (both directions): {N}
- Orphaned tests (no matching TC): {N}
- Orphaned TCs (no matching test): {N}
- Mismatched behavior: {N}

## Traceability Matrix

| TC ID     | Feature Doc? | Test Code? | Dashboard? | Status       |
| --------- | ------------ | ---------- | ---------- | ------------ |
| TC-OM-001 | ✅           | ✅         | ✅         | Traced       |
| TC-OM-005 | ✅           | ❌         | ✅         | Missing test |
| TC-OM-010 | ❌           | ✅         | ❌         | Missing spec |

## Orphaned Tests (no matching TC in docs)

| Test File | Method   | Annotation | Action                   |
| --------- | -------- | ---------- | ------------------------ |
| {file}    | {method} | TC-OM-010  | Create TC in feature doc |

## Orphaned TCs (no matching test)

| TC ID     | Doc Location | Priority | Action                              |
| --------- | ------------ | -------- | ----------------------------------- |
| TC-OM-005 | Section 8    | P0       | Generate test via /integration-test |

## Behavior Mismatches

| TC ID | Doc Says | Test Does | Correct Source | Action |
| ----- | -------- | --------- | -------------- | ------ |

## Recommendations

1. {Prioritized actions}
```

---

## Test Data Setup Guidelines

| Pattern             | When to Use                        | Example                                                      |
| ------------------- | ---------------------------------- | ------------------------------------------------------------ |
| **Per-test inline** | Simple tests, unique data          | `var order = new CreateOrderCommand { Name = UniqueName() }` |
| **Factory methods** | Repeated entity creation           | `TestDataFactory.CreateValidOrder()`                         |
| **Builder pattern** | Complex entities with many fields  | `new OrderBuilder().WithStatus(Active).WithItems(3).Build()` |
| **Shared fixture**  | Reference data needed by all tests | `CollectionFixture.SeedReferenceData()`                      |

**Rules:**

- Every test creates own data — no shared mutable state between tests
- Unique identifiers for ALL string data (search test utilities for unique name/data generator helper)
- Factory methods return valid entities by default — tests override only what they test
- Cross-entity dependencies: create parent first, then child (e.g., User → Order)
- Feature requires reference/lookup data → set up in collection fixture or per-test preconditions

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** NOT in workflow? `AskUserQuestion` — do NOT decide complexity yourself. User decides:
>
> 1. **`workflow-write-integration-test` workflow** (Recommended) — investigate → spec [mode=tests] → artifact-review --type=spec-tests → integration-test → integration-test-review → integration-test-verify → spec [mode=sync] → docs-update → workflow-end → watzup
> 2. **`/integration-test` directly** — standalone

---

## Test Execution & Failure Diagnosis (MANDATORY)

> **IMPORTANT MUST ATTENTION:** After generating/modifying integration tests, MUST:
>
> 1. **Run tests:** `/integration-test-verify` (reads `quickRunCommand` from `docs/project-config.json`)
> 2. **If tests fail:** Diagnose root cause — (a) wrong test setup/assertions → fix test, or (b) service bug → report as finding
> 3. **NEVER mark done until tests pass.** Unrun tests have zero value.
> 4. **Iterate:** Fix → rerun → verify until all pass or failures confirmed as service bugs

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing, use `AskUserQuestion` to present:

- **"/integration-test-verify (Recommended)"** — Run integration tests to verify they pass
- **"/workflow-review-changes"** — Review all changes before committing
- **"Skip, continue manually"** — user decides

## Related Skills

| Skill                        | Relationship                                                                         | When to Call                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `/spec [mode=tests]`                  | **Producer** — TCs in feature doc Section 8 are the source for test generation       | Must run spec [mode=tests] before integration-test (CREATE or UPDATE mode). TCs must exist before generating tests. |
| `/artifact-review --type=spec-tests`           | **Upstream reviewer** — validates TC quality before test generation                  | Run before integration-test to ensure TCs have real assertion value                                        |
| `/spec [mode=sync]` | **Sync** — reconciles §8 TCs ↔ executing test code after tests are linked          | Run after integration-test to update the §8 `CoveredBy:` fields with the covering test links         |
| `/spec`              | **TC host** — Section 8 of feature doc is where TCs live                             | If feature doc is missing or Section 8 is empty → run /spec first                                  |
| `/spec-index`                | **Derived index** — regenerable navigation catalog over the Feature Specs (never a source of truth) | After §8 changes, to refresh the bucket `INDEX.md` TC counts                          |
| `/integration-test-review`   | **Reviewer** — 7-gate quality audit of generated tests + change coverage             | Always call after generating integration tests                                                             |
| `/integration-test-verify`   | **Runner** — executes tests and reports pass/fail                                    | Always call after integration-test-review clears                                                           |
| `/docs-update`               | **Orchestrator** — calls spec [mode=sync] (Phase 4) with test traceability              | Run for full doc sync after integration test files updated                                                 |

## Standalone Chain

> **When called outside a workflow**, follow this chain to complete the integration test authoring cycle.

```
integration-test (you are here)
  │
  ├─ PREREQUISITE: TCs must exist in feature doc Section 8
  │    [REQUIRED] Verify: {Bucket}/README.{Feature}.md in the business spec root
  │                 (default docs/specs; specRoots.business.path in docs/project-config.json overrides it)
  │                 Section 8 has TC-{FEATURE}-{NNN} entries
  │    If empty → run /spec [mode=tests] [CREATE mode] first
  │
  ├─ [REQUIRED] → /integration-test-review
  │     7-gate quality audit: assertion value, data state, repeatability, domain logic, traceability, three-way sync, change coverage.
  │     Never skip — Gate 6 (three-way sync) is the only place where spec/code/test conflicts surface,
  │     and Gate 7 (change coverage) is the only place where untested changed behavior surfaces.
  │
  ├─ [REQUIRED] → /integration-test-verify
  │     Runs tests and reports pass/fail counts. Never mark complete without real runner output.
  │
  ├─ [REQUIRED] → /spec [mode=sync]
  │     Updates the §8 TCs' CoveredBy: file::method traceability links.
  │
  ├─ [RECOMMENDED] → /docs-update
  │     Updates feature doc evidence fields and version history if test coverage changed materially.
  │
  └─ [RECOMMENDED] → /artifact-review --type=spec-tests
        Re-run if integration-test-review (Gate 6) flagged TC issues requiring TC edits.

### Mode-Specific Chains

| Mode | Pre-step | Post-step |
|------|---------|-----------|
| from-changes | verify TCs updated (run /spec [mode=tests] UPDATE first) | /integration-test-review → /verify → /sync |
| from-prompt | confirm TC exists for target feature | /integration-test-review → /verify → /sync |
| review | N/A (read-only) | report findings → /spec [mode=tests] UPDATE if TCs need fixes |
| diagnose | run /test to see failures first | fix identified issue → re-run /integration-test-verify |
| verify-traceability | N/A (read-only) | if orphaned TCs: /spec [mode=tests] UPDATE → /integration-test [from-prompt] |
```

> **[IMPORTANT]** `TaskCreate` — break ALL work into small tasks BEFORE starting. NEVER skip task creation.

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

<!-- SYNC:test-failure-fault-adjudication -->

> **Test-Failure Fault Adjudication** — When a test fails (or you are debugging or fixing a failure), the job is to determine *who is at fault — the source code or the test code*. Getting that verdict right matters more than turning the suite green. Binds every debug / fix / test skill identically.
>
> 1. **Provisional verdict before touching either side.** Classify the observed evidence as SOURCE-WRONG, TEST-WRONG, TEST-NOT-OPTIMAL, ENVIRONMENT-BLOCKED, or AMBIGUOUS; then `/debug-investigate` and trace end-to-start before editing. A green-again suite is NOT the goal.
> 2. **Triangulate against the owner artifact AND the source.** Use the business root selected by `specRoots.business.path`, following the framework config loader's fallback only when the project leaves it unset. Resolve `specArtifacts`: when valid, read its configured `intent/contracts/evidence` sections and locate native cases through configured carriers; when absent, use the strict-default §3 AC / §4 BR / §5 invariant / §8 TC sections. A malformed or unsupported declaration blocks without fallback. Inspect the assertion tied to owner + case/scenario ID + optional variant. The canonical intent decides expected behavior — compare BOTH production source and failing test against it. With no spec, use documented intent / acceptance criteria / caller contract and name that limit. Decide from evidence whether SOURCE or TEST is wrong.
> 3. **Classify who is at fault, then fix the wrong side at its root:**
>     - **SOURCE-WRONG** — production code violates the spec's intended behavior or a clear invariant → fix the source at the owning layer; keep or strengthen the test that caught it.
>     - **TEST-WRONG** — the test encodes a stale or incorrect assertion, setup, or expectation that contradicts intended behavior → fix the test at its root. NEVER weaken an assertion, add a skip, or relax a timeout to force green.
>     - **TEST-NOT-OPTIMAL** — intended behavior is valid but the test seam, timing, or assertion signal is fragile → improve the test without weakening the invariant.
>     - **ENVIRONMENT-BLOCKED** — infrastructure, setup, or external state — including transient resource pressure (RAM/OOM, CPU saturation, disk or temp exhaustion, handle and connection-pool limits, network flakiness, a timeout that is really slowness) — prevents a source/test verdict → preserve diagnostics (exact command, exit code, full output, resource evidence), name the environment remedy, and STOP mutating source or tests until the environment is healthy. This verdict is a FIRST-CLASS candidate weighed in step 1 alongside SOURCE-WRONG and TEST-WRONG — never a fallback reached only after the code looks fine; run `SYNC:environment-fault-hypothesis` to rule it in or out with a stated discriminator. A failure that vanishes on retry stays UNEXPLAINED until its mechanism is named — "flaky" is a symptom, not a verdict.
>     - **AMBIGUOUS** — evidence or intended behavior does not safely select an owner → ask the user or canonical owner before editing.
>     - NEVER change a test to match broken source, and NEVER change source to satisfy a broken test. (Migration code excluded — schema/data migrations are one-time execution paths, not core application logic.)
> 4. **Ask the user when intended behavior is unclear.** If no owner artifact covers the behavior, the configured sections are silent, or the owner is ambiguous about which side is correct, STOP and ask the user or canonical spec owner before editing either side — never silently pick source or test just to make the suite pass.
>
> Reconcile to intended behavior, never to whichever side currently passes — green can encode the very bug.
>
> **Read-only/report-only role boundary:** when this block is carried by a report-only role (`code-reviewer`, `spec-compliance-reviewer`, `tester`, and any other agent whose definition declares it never edits source), "fix the wrong side" means RETURN the adjudicated verdict and the proposed repair to the parent — do not modify source, tests, generated carriers, or user data. The adjudication is the deliverable; the edit is the caller's. Without this sentence the block's step-3 imperatives read as write authority and directly contradict those agents' own declarations (e.g. `tester.md` "NEVER implement fixes"), which is the sibling `SYNC:double-round-trip-review` boundary applied to the same class of carrier.

<!-- /SYNC:test-failure-fault-adjudication -->

<!-- SYNC:spec-tests-code-triangulation -->

> **Spec ↔ Tests ↔ Code Triangulation** — The unit of review is the WHOLE PACKAGE (spec + tests + code), not the diff alone. Load all three faces together and reason mutual-consistency FIRST, before any isolated per-file check.
>
> 1. **Locate all three faces** for the changed behavior. Resolve `docs/project-config.json → specArtifacts`: use its configured `sections.intent/contracts/evidence`, business owner path, and test-carrier dialects only when valid; use the strict default Feature Spec sections (§3 ACs / §4 BRs / §5 invariants / §8 TCs) only when the profile is absent. A malformed or unsupported declaration blocks and never falls back. Load the tests and production code with the owner artifact; a missing face is a finding (SPEC-GAP / TEST-GAP / DEAD-SPEC).
> 2. **Triangulate pairwise** — classify which face is wrong on every disagreement:
>     - code vs spec → CODE-EXTRA / SPEC-STALE / CODE-WRONG (a hard rule in the configured `contracts` role, or strict-default §4/§5 invariant, with no enforcing path is CODE-WRONG).
>     - tests vs spec → TEST-GAP / SPEC-SILENT; with a native profile, check owner + case/scenario ID + optional variant against the actual executor and inspected assertion, not an ID match alone.
>     - tests vs code → TEST-GAP / WEAK-TEST (a test that survives a deliberately broken invariant).
> 3. **Capture hidden rules** — an invariant the code enforces but the spec never states (SPEC-SILENT) is surfaced as a finding, added to the configured `intent` or `contracts` section and represented in its `evidence` section with a guarding native case/test; without a profile, use strict-default §3/§4/§8 and TC. This is the enrichment loop, never a silent pass.
> 4. **Re-review after enrichment** — when triangulation adds spec content or a test, re-review the package against the enriched spec; converge only when a full pass surfaces no new disagreement.
>
> NEVER mark PASS while any face disagrees without a logged finding. The diff is the entry point; the package is the unit of judgment.

<!-- /SYNC:spec-tests-code-triangulation -->

<!-- SYNC:spec-drift-adjudication -->

> **Spec drift adjudication (code-wrong vs spec-stale).** Whenever behavior diverges from a canonical owner artifact under the configured business root (`specRoots.business.path`, default `docs/specs`), you MUST NOT silently pick a side. Resolve and validate `specArtifacts` from `docs/project-config.json`: when valid, use its `intent/contracts/evidence` section roles and native case carriers; only when absent, use the strict-default Feature Spec sections (§3 AC, §4 BR, §5 invariant, §8 TC). A malformed or unsupported declaration blocks; never fall back. Adjudicate per `shared/sdd-artifact-contract.md` → **Drift Gates**:
>
> 1. **Detect** — compare the change against the owner's documented intent/contracts and linked evidence. No divergence → record `Spec in sync` and move on.
> 2. **Classify** the divergence:
>    - **CODE-WRONG** — the owner artifact correctly states intended behavior and the change violates it → BLOCKING finding; fix the code/test against intended behavior, creating or updating a regression case in the configured native carrier (strict-default TC when no profile exists).
>    - **SPEC-STALE** — the change is the new intended behavior and the owner now documents the old/wrong behavior → update the canonical owner FIRST through the configured spec workflow, then synchronize its evidence/test carriers. Without a profile, use `/spec [mode=update]`, `/spec [mode=tests]`, then `/spec [mode=sync]`.
>    - **AMBIGUOUS** — intended behavior is unclear → ask the user or canonical spec owner before editing either side.
>    - **SPEC-SILENT** — code correctly enforces an invariant/behavior absent from the owner artifact → not drift but an UNWRITTEN rule. Prove it is always-true (≥2 enforcement points or a rejecting guard), express it as a universally-quantified property, add it to the configured `intent` or `contracts` section, and link it from `evidence` to a native case with an inspected assertion. Without a profile, use the invariant-harvest workflow to add the rule to strict-default §4 (or §3/§5) and a guarding §8 TC. A discovered invariant left only in code or tests is INCOMPLETE.
> 3. **Never normalize drift just because code/tests are green** — green can encode the drift itself. Reconcile to canonical intent, never to whichever side currently passes.
>
> A behavior-changing review/implementation that leaves a spec divergence unadjudicated is INCOMPLETE; an unwritten-but-enforced invariant left uncaptured in the configured owner and case evidence (strict-default §4/§8) is equally INCOMPLETE.

<!-- /SYNC:spec-drift-adjudication -->

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:understand-code-first -->

> **Understand Existing Code First** — For code changes, read and trace the target before planning or editing; do not apply a code workflow to work with no code surface.
>
> 1. Search for relevant existing implementations and cite `file:line`; aim for 3+ comparable examples when they exist, and record when the project has fewer or none.
> 2. Read the target area and its configured project references; identify actual structure, owners, and conventions without assuming a framework, layer model, or base class.
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists and the task concerns code relationships.
> 4. Map affected dependencies and callers with available repository tools; do not block on an absent graph or unsupported tool.
> 5. Write investigation to `tmp/analysis/` for non-trivial tasks (3+ files).
> 6. Re-read the analysis before implementing; update it when evidence changes.
> 7. Follow a fitting local pattern, or state why no suitable pattern exists and justify a project-appropriate choice.
>
> **BLOCKED until:** target and relevant existing patterns are inspected, applicable dependencies are traced, and material assumptions have evidence. If an item does not apply or the repository has no comparable implementation, record that fact rather than fabricating a gate result.

<!-- /SYNC:understand-code-first -->

<!-- SYNC:graph-impact-analysis -->

> **Graph Impact Analysis** — When `.code-graph/graph.db` exists, run `blast-radius --json` to detect ALL files affected by changes (7 edge types: CALLS, MESSAGE_BUS, API_ENDPOINT, TRIGGERS_EVENT, PRODUCES_EVENT, TRIGGERS_COMMAND_EVENT, INHERITS). Compute gap: impacted_files - changed_files = potentially stale files. Risk: <5 Low, 5-20 Medium, >20 High. Use `trace --direction downstream` for deep chains on high-impact files.

<!-- /SYNC:graph-impact-analysis -->

<!-- SYNC:repeatable-test-principle -->

> **Repeatable Tests** — A test suite should produce the same contract result across normal fresh runs and supported concurrency. Use the project's runner and isolation policy; a fixed no-reset database procedure does not fit every harness.
>
> 1. Isolate mutable test data from other tests and runs. Use generated identities when the configured environment shares a namespace or data store; stable IDs are fine in an isolated disposable database or deterministic fixture.
> 2. Cleanup may remove only resources created and owned by that test/run. Use transactions, ephemeral databases, namespaces, teardown, or additive fixtures according to the project's harness; never reset shared or user-owned state.
> 3. Make shared fixture setup idempotent when the runner may repeat it. Keep schema/migration testing when it is part of the project contract; follow the project's migration harness and never use rollback assumptions that the production system does not support.
> 4. Verify repeatability at the level required by `integrationTestVerify.guidance`. If absent, use two fresh runs when persistent/shared state or asynchronous effects make one run insufficient; stateful verification must not rely on deleting another run's data.

<!-- /SYNC:repeatable-test-principle -->

<!-- SYNC:test-data-isolation -->

> **Test Data Isolation** — Tests MUST remain independent across the concurrency modes the project supports. Stateful suites should not depend on test order or mutate data another test/run owns.
>
> 1. **Use the isolation boundary the harness supports:** transactions, per-test databases/schemas, namespaces, fixtures, or unique data as appropriate. Unique IDs are essential when tests share a namespace; stable IDs are fine inside isolated disposable fixtures.
> 2. **Isolate mutable state when tests can observe or alter it concurrently.** Shared mutable state is safe only when the runner/project provides an explicit isolation guarantee; immutable reference data may be shared.
> 3. **Account for cross-cutting consumers when they are relevant:** a bulk rebuild, recompute, or cascade can rewrite descendants of a shared parent; inspect that path if another test/run's work could affect the assertion.
> 4. **On an intermittent contradiction, test contamination as a competing cause.** Trace the path first, then inspect other writers/consumers of shared state before attributing the wrong outcome to product code.
> 5. **Prove the relevant isolation claim with a scoped search.** Inspect other tests and consumers that can touch the shared data in question; do not demand a repository-wide search when the test owns an isolated store/transaction.

<!-- /SYNC:test-data-isolation -->

<!-- SYNC:real-world-fidelity-testing -->

> **Real-World Fidelity Gate** — MANDATORY when authoring, reviewing, or repairing any integration / E2E / system test.
>
> A test earns trust by reproducing a situation the system can actually meet in production. A scenario that could never occur in real life proves nothing when it passes, and wastes hours when it fails.
>
> 1. **Ask the fidelity question BEFORE writing the setup:** *"Can this sequence, timing, and data actually occur in production?"* If no, the test is mis-specified — fix the SCENARIO, never the assertion.
> 2. **Model only real actor pacing.** Preserve delays present in the real journey; add presentation pacing only when the project contract configures it. Never add a fixed delay to make readiness or settling appear reliable.
> 2a. **Use the runner's synchronization idiom.** Before an action, use the browser/device runner's native wait or an evidenced project helper for applicable readiness and actionability. Bound custom waits and include useful diagnostics; do not require a helper API or object model the project does not use.
> 2b. **Observe → act → observe.** After an action, wait for the expected positive or negative postcondition before the next dependent action, using observable state and the configured runner. Keep the final business assertion in the test. A timeout is a test failure with diagnostics, not permission to weaken the assertion.
> 3. **Wait on a real signal, never a blind sleep.** Find an observable proving the prior step finished — a persisted state change, an audit/version stamp, a queue/worker idle marker, a completion event — and poll until it settles (unchanged across a short stability window). Use a fixed delay ONLY when no observable exists, and say so in a comment. A browser action delay MUST never replace a readiness/actionability wait.
> 4. **Barriers belong in ARRANGE, never in ASSERT.** Waiting for a precondition is fidelity. Widening an assertion's timeout, loosening a comparison, adding a retry around a failing assertion, or skipping the test is masking. NEVER do the latter to force green.
> 5. **Distinguish harness-amplified from real.** Test topologies (shared infra, fan-out consumers, parallel suites, cold starts) can make a rare production race routine locally. Before filing a product defect, state whether the trigger exists in production and at what likelihood.
> 6. **Keep the protected invariant intact.** Improving fidelity must NEVER reduce what the test protects. If a realistic scenario no longer exercises the rule, the rule needs a DIFFERENT realistic scenario — not a weaker assertion.
> 7. **Deliberate impossible-state tests are allowed, but MUST be labelled.** Corruption-repair, migration, and fail-safe tests intentionally construct states production should never reach; comment WHY the state is reachable (upstream bug, partial write, legacy data), so they are never confused with unrealistic setups.
> 8. **Visible browser evidence is part of fidelity.** When the project contract calls for human-QC on a web surface, use its configured visible browser runner or control path when supported; attach runtime/network listeners before interaction and capture/read the configured screenshots, traces, or video. Follow the runner's native waits or an evidenced bounded project helper, and redact sensitive evidence. An unread artifact is not an observation.

<!-- /SYNC:real-world-fidelity-testing -->

<!-- SYNC:integration-test-execution-discipline -->

> **Integration Test Execution Discipline** — How the integration-test family (write · review · verify) runs, diagnoses, and clears a suite. Binds `/integration-test`, `/integration-test-review`, and `/integration-test-verify` identically.
>
> 1. **Verify the configured relevant suite, not a convenient sample.** Resolve test projects/suites from project config and the requested scope. A focused run is diagnostic unless the task explicitly asks for that scope; report actual runner output and do not claim broader coverage than it proves.
> 2. **Set up valid state without bypassing the contract under test.** Exercise the production entry path when that path is being tested. For unrelated preconditions, use the project's builders, factories, fixtures, seeders, APIs, or persistence setup when they preserve invariants. Never use a shortcut that skips the behavior the assertion is meant to protect.
> 3. **On ANY failure → `/debug-investigate` the root cause BEFORE any fix.** Do not guess, do not patch the symptom site. Trace the failure end-to-start and classify whose fault it is: test code (wrong assertion/setup), source/production code (real defect), or environment/infrastructure/data. Then route: test-code fault → `/integration-test-review` to fix the test at the root (never weaken assertions or add skips); source-code fault → fix the production defect at the owning layer and report it; environment fault → mark BLOCKED and point at the startup script. NEVER change a test to match broken code.
> 4. **Use project timeouts as budgets, not as fixes.** Investigate a timeout or slow test for deadlock, unbounded work, missing synchronization, or an unavailable dependency. Do not widen an assertion timeout or retry a failing assertion to hide a defect; adjust execution budgets only when evidence shows the configured budget is inappropriate for this environment.
> 5. **Follow the configured repeat policy.** Read `integrationTestVerify.guidance` and report its required fresh runs, state-reset policy, concurrency, and scope. When no policy is declared, use two fresh green runs for suites with persistent/shared state; use the runner's normal clean/isolated setup and never reset data owned by another run. Preserve executed coverage and disclose what each run proves.

<!-- /SYNC:integration-test-execution-discipline -->

<!-- SYNC:red-flag-stop-conditions -->

> **Red Flag Stop Conditions** — STOP and escalate to user via AskUserQuestion when:
>
> 1. Confidence drops below 60% on any critical decision
> 2. Changes would affect >20 files (blast radius too large)
> 3. Cross-service boundary is being crossed
> 4. Security-sensitive code (auth, crypto, PII handling)
> 5. Breaking change detected (interface, API contract, DB schema)
> 6. Test coverage would decrease after changes
> 7. Approach requires technology/pattern not in the project
>
> **NEVER proceed past a red flag without explicit user approval.**

<!-- /SYNC:red-flag-stop-conditions -->

<!-- SYNC:rationalization-prevention -->

> **Rationalization Prevention** — AI skips steps via these evasions. Recognize and reject:
>
> | Evasion                      | Rebuttal                                                      |
> | ---------------------------- | ------------------------------------------------------------- |
> | "Too simple for a plan"      | Simple + wrong assumptions = wasted time. Plan anyway.        |
> | "I'll test after"            | RED before GREEN. Write/verify test first.                    |
> | "Already searched"           | Show grep evidence with `file:line`. No proof = no search.    |
> | "Just do it"                 | Still need TaskCreate. Skip depth, never skip tracking.       |
> | "Just a small fix"           | Small fix in wrong location cascades. Verify file:line first. |
> | "Code is self-explanatory"   | Future readers need evidence trail. Document anyway.          |
> | "Combine steps to save time" | Combined steps dilute focus. Each step has distinct purpose.  |

<!-- /SYNC:rationalization-prevention -->

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

<!-- SYNC:sub-agent-selection -->

> **Sub-Agent Selection** — Full routing contract: `.claude/skills/shared/sub-agent-selection-guide.md`
> **Rule:** Route specialized domains (architecture, security, performance, DB, E2E, integration-test, git) to the matching specialist agent (see guide above) — NEVER use `code-reviewer` for these. — why: `code-reviewer` lacks each domain's checklist, so specialized issues slip through.

<!-- /SYNC:sub-agent-selection -->

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] /skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate (static JIT)** — Run after task-tracking bootstrap and immediately before target/source file reads, grep, edits, tests, or analysis. Project docs override generic framework assumptions; hooks may remind or accelerate this gate, but never prove that it ran.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. **Read the configured project-config file first, if it exists.** Resolve its path through the project-config loader (default `docs/project-config.json`). **The project config is OPTIONAL: a project with no config is a supported, first-class state, not an error.** When it is absent, run on the framework's portable defaults and derive project facts (paths, run commands, conventions, architecture, test and spec layout) from repository evidence — manifests, lockfiles, scripts, CI definitions, directory layout, root instruction files — stating the assumption whenever one is material; do not block, and do not demand a bootstrap route before ordinary work. When it IS present, the minimum valid shape has a non-empty `project.name`; omitted optional capability properties use neutral defaults or skip that capability. A section its author DECLARED but left malformed or incomplete is a configuration error: fail closed on that section and run `/project-init` or `/project-config` before relying on it, because silently substituting defaults would present wrong project facts as authoritative. Use valid config for the adopter's paths, commands, architecture, specs, tests, and workflows, then verify material hints against repository evidence; never assume generic defaults are project facts.
> 3. **Always-on vs task-specific references:** Project initialization owns and ensures the project's `lessons.md` and docs-index inputs at their configured owner paths. Read them under the static project-context contract independently of task-specific `referenceDocs`; do not append them to that selection. For task-specific docs, when the configured `referenceDocs` property is an array, follow it exactly, including subsets and `[]`. When absent, use the runtime capability-aware resolver: its portable baseline plus only configuration- or repository-evidenced capabilities; a minimal project with no capability evidence may resolve to an empty task-specific set. The full scan-target manifest is a registry of metadata/aliases, not a default selection. Resolve configured paths using `docsRoots.projectReference.path` when present (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A custom reference doc declares `filename` and `purpose`, with optional `sections`, `templatePath`, and `scanTarget`. Built-in filenames keep their exact framework-owned target; other custom docs default to manual ownership, while `scanTarget: "generic"` opts one exact selected file into evidence-based scanning. Manual docs are not freshness-tracked or impact-routed. Never infer a target by basename; config and runtime path resolution reject lexical traversal and physical symlink escapes.
> 4. Read selected task-specific docs just in time before target work, then state: `Reference docs read: ... | Not applicable: ...`; an explicit empty selection means no task-specific docs are selected by the catalog. Still honor separately required references named by the active skill or task. An absent project config is not a missing doc: proceed on repository evidence and, at most, OFFER `/project-init` or `/project-config` as an optional one-time recording of those facts. If an always-on input or a selected/otherwise required doc is missing or stale, or a declared config section is malformed, use `/project-init` or the narrow owner route (`/project-config`, `/docs-init`, `/scan --target=<key>`, `/ai-context-refresh`) before relying on that input. If Codex mirrors are stale, use the explicit `/sync-codex` route or its documented `/ai-context-refresh` completion handoff for the active source-authoring task. After compaction, resume, delegation, or material context change, repeat selection and reading; prior conversation and hook output are not proof of current loading.
>
> **Ready when:** scope evaluated, the configured project-config file consulted or its absence recorded and the portable-defaults fallback applied, root always-on inputs are confirmed (completing project initialization if they are missing or stale), the declared task-specific `referenceDocs` selection is applied exactly or, when absent, the runtime capability-aware resolver output is applied (which may be empty), selected docs are read or an explicit empty selection is recorded, and the citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `tmp/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: tmp/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:test-architecture-execution-contract -->

> **Test Architecture & Execution Contract** — Treat testability as a setup/architecture acceptance condition. Identify the test types and execution modes required by the project contract and task risk; examples include unit, integration/system, E2E, and performance/scale. Record `APPLICABLE` only with evidence of a relevant runner/framework/configuration; otherwise record `N/A — <evidence>` and never fabricate coverage or impose a universal tier threshold.
>
> 0. **Make the protected intent explicit in the project's test format.** Every assertion-bearing test states the behavior or technical invariant it protects and makes its relevant inputs, trigger, and owned outcome understandable. Use `Given / When / Then` when the project's spec/config selects it or when it fits the test; otherwise preserve the project's native organization. Property/fuzz tests may describe an input space or generator and the property checked; harness and mutation tests may use their native contract. Do not rewrite a test solely to adopt a framework-wide syntax.
>    Link the case to the configured owner/case/scenario identity and its `intent` or `contracts` role when `specArtifacts` is valid; when absent, record `Business Intent / Invariant Guarded` (or the technical contract). A malformed declared profile blocks without fallback. Keep one behavior per case and split unrelated outcomes. The final assertion must prove the outcome the test owns, not only an internal call, delivery bookkeeping, or setup side effect. Fixture/runner glue is exempt only when it contains no test assertion; every assertion-bearing test entry point is in scope. Convert legacy brownfield cases when touched; a broader migration is a named owned opportunity, while a safety-critical case without clear phases is `BLOCKED`.
>
> 1. **Matrix before implementation:** For each required test type, record applicability, owner, runner/framework, test root, fixture/data strategy, full command, focused/partial command, zero-match behavior, CI gate, a simple/platform-appropriate entry point when useful, each supported execution mode, and the environments the project promises to support.
> 1a. **E2E profile handoff:** For E2E, also record the selected `surfaceIds[]`, the linked `localRun` owner, auth mode/reference, seed/data mode, browser runner/engine/headed setting, action-delay policy, evidence root/capture/redaction policy, and convergence cap. Missing fields remain explicit blockers or N/A; they are never filled from generic browser defaults.
> 2. **Runnable scopes:** Full and focused commands must be copy-ready, fail on invalid or zero-match selections, report exact counts and exit status, and be safe to repeat. E2E uses configured browser/service commands and the project's documented synchronization strategy. Browser UI actions should wait for bounded, observable readiness and outcome conditions using runner-native waits or a configured helper; apply action delays only when the project contract specifies them.
> 2a. **E2E organization gate (when E2E is applicable):** Inspect the configured/discovered local test organization and reuse it — fixtures, shared helpers, scoped locator handles, page objects, or another evidenced structure. Record actual owners and boundaries; describe tiers or base abstractions only when the project uses them. A Page Object Model is one valid pattern, never a universal requirement.
> 2b. **E2E reuse and DRY gate:** Keep shared lifecycle, locator, readiness, auth, data, and evidence behavior at the project's existing reusable owner; keep final outcome assertions in the test. Reuse or compose existing helpers/objects before creating new ones, preserve one canonical owner for each selector/action/wait, and treat duplicated wrappers or setup as a review signal; use occurrence counts only as evidence, and extract when a shared owner reduces change cost without crossing project boundaries.
> 2c. **E2E test layering:** Test reusable shared behavior at its actual owner where the harness supports it; feature tests cover user outcomes and local composition. Do not invent component tiers or require lower-tier contract tests when the project has no such model.
> 2d. **E2E synchronization:** Use bounded runner-native waits or the configured project helper for observable preconditions and postconditions where the runner supports them. Include useful timeout diagnostics; keep the final business assertion in the test and avoid fixed sleeps as readiness evidence.
> 3. **Fresh valid state (when mutable or shared state applies):** Isolate each test/run using the project's supported setup and public paths where applicable. Use unique identities for shared mutable data, realistic valid data for behavior under test, and idempotent/restart-safe setup when fixtures or seeders can persist. Intentional accumulation is additive and integrity-checked; never hide contamination with destructive reset.
>    Run-scoped cleanup, when supported, is opt-in and idempotent: after evidence capture it may remove only ephemeral resources owned by the current run; it must never delete persistent/additive data or another run's data, reset shared state, or replace no-reset proof.
> 4. **Isolation and fidelity:** When tests touch mutable/shared state, isolate their data and parallel workers; share only immutable/reference data. Use realistic input and observable arrange barriers where the behavior depends on them. Do not widen retries or weaken assertions to make a scenario pass.
> 5. **Evidence gate:** Report command, scope, relevant identity/data mode, exact result, and repeat proof. For persistent-state suites, verify repeatability without destructive reset at the level required by the project gate. Treat line coverage as diagnostic only; use meaningful property/invariant, mutation, change, or behavior signals when supported by the project's tooling.
> 6. **Execution modes and environment reach:** Exercise each mode and environment the project declares it supports (for example host/container or local/CI); parameterize supported targets when that fits the existing test architecture instead of maintaining needless forks. Record unexercised declared capabilities as a gap. A production-shaped target is applicable only when the project requires it; tests that can reach production need an enforced safe scope, and must report `ENVIRONMENT-BLOCKED` when it is missing. Pin dependencies and declare external prerequisites where the project's reproducibility contract requires them. Depth → `SYNC:engineering-foundation-gate` **F1/F2/F3**.
>
> **Ownership:** Architecture/harness defines the matrix; scaffold/workflow makes it runnable; test writers implement tier-specific cases; reviewers verify the contract; the runner reports; seed-data owners preserve uniqueness, idempotency, realism, and accumulation integrity. Missing required evidence blocks setup completion.

<!-- /SYNC:test-architecture-execution-contract -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code/conventions BEFORE any modification or explanation. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:graph-impact-analysis:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** run `blast-radius` when graph.db exists. Flag impacted files NOT in changeset as potentially stale.
<!-- /SYNC:graph-impact-analysis:reminder -->

<!-- SYNC:red-flag-stop-conditions:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** STOP after 3 failed fix attempts. Report all attempts, ask user before continuing.
<!-- /SYNC:red-flag-stop-conditions:reminder -->

<!-- SYNC:rationalization-prevention:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** follow ALL steps regardless of perceived simplicity. "Too simple to plan" is an evasion, not a reason.
<!-- /SYNC:rationalization-prevention:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Before project-specific work, load the OPTIONAL project-config (default `docs/project-config.json`) via its loader. No config is supported — fall back to portable defaults plus repository evidence, state material assumptions, never block. When present: require non-empty `project.name`, use neutral defaults/skips for omitted optional capabilities, and fail closed on a declared malformed section.
- **MANDATORY** Apply an explicit `referenceDocs` array exactly, including `[]`; when absent use only the capability-aware resolver output, which may be empty. Cite `Reference docs read: ...` and note the selected or empty set.
- **MANDATORY** Load detail JUST IN TIME, immediately before the first target read/grep/edit/test — a hook event or a prior turn is NEVER evidence that the current files were read. Re-resolve selection and re-read after compaction, resume, delegation, or a context change.
- **MANDATORY** The project-init-owned `lessons.md` and docs-index inputs are always-on at their configured owner paths, read independently of task-specific `referenceDocs`. A missing/stale root instruction file or required reference doc, or a malformed declared config section → auto-run `/project-init` (or the narrow lower-level route) before relying on that input. An absent config never gates work — offer `/project-init` or `/project-config` once. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

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

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** Testability contract: resolve Unit/Integration/System/E2E applicability, copy-ready full/focused commands, zero-match failures, owner/root/data, CI/simple-Windows entry, unique run identity, and repeat proof before completion.
**IMPORTANT MUST ATTENTION Goal:** Generate/review real-DI integration tests across 5 modes (from-changes · from-prompt · review · diagnose · verify-traceability) that exercise production paths and assert specific DB fields, so each test protects the selected canonical case contract, survives no-reset repeats, and fails only when protected intent breaks.

**IMPORTANT MUST ATTENTION** Main order: (1) FIRST read the selected canonical owner and resolve required case coverage; only the strict default upserts Section 8 TCs; (2) MIDDLE implement real-path tests with the selected traceability carrier; (3) FINAL reconcile changed behavior and the full affected owner/case scope across integration + unit. Per mode: Detect → Find targets → Gather context → Execute → Report.
**IMPORTANT MUST ATTENTION** Modes: `from-changes`/`from-prompt` generate; `review` audits; `diagnose` classifies failures; `verify-traceability` audits test↔spec↔feature-doc links. In-workflow standalone `/integration-test-review` and `/integration-test-verify` remain the heavier gates.
**IMPORTANT MUST ATTENTION** Gates: real DI; specific DB fields; async polling; real use-case setup; fidelity barriers; property/mutation coverage; zero-GAP changed-file + full affected-owner case audit under the selected profile; 2 no-reset runs; review → verify → owner sync.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries) — MUST ATTENTION each canonical body below is in force; this digest is the signpost, NEVER the substitute:**

- **Source/Test Drift Check:** on source change, adjudicate whether tests or source is wrong.
- **Spec↔Tests↔Code Triangulation:** the unit of judgment is the WHOLE PACKAGE (spec §3/§4/§8 + tests + code) — load all three, reason mutual-consistency first; a disagreeing or missing face is a logged finding, NEVER a silent pass.
- **Spec Drift Adjudication:** on behavior divergence from a canonical spec, classify CODE-WRONG / SPEC-STALE / AMBIGUOUS / SPEC-SILENT and harvest unwritten invariants into §4/§8 + a guarding test — NEVER normalize drift to whichever side is green.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** every claim needs traced proof; never present a guess as fact.
- **Understand Code First:** read existing code and grep 3+ patterns before writing.
- **Graph Impact Analysis:** run blast-radius when graph.db exists; flag stale impacted files.
- **Repeatable Test Principle:** follow the configured isolation and repeat policy; use unique data where runs share mutable state; never reset data owned by another run.
- **Test Data Isolation:** isolate mutable data at the boundary required by the project's supported concurrency; inspect cross-cutting consumers when state unexpectedly changes.
- **Real-World Fidelity Gate:** only test sequences, pacing, and data production can actually reach; barriers wait on a real settle signal in ARRANGE — never a widened assertion.
- **Red Flag Stop Conditions:** escalate on low confidence, large blast radius, breaking change.
- **Rationalization Prevention:** reject step-skipping evasions; show grep evidence, plan anyway.
- **Incremental Persistence:** persist findings to `tmp/reports/` after each file, never in memory.
- **Sub-Agent Return Contract:** sub-agents return only the summary shape, detail on disk.
- **Sub-Agent Selection:** route specialized domains to matching specialists, never `code-reviewer`.
- **Nested Task Creation:** child skills expand visible phase tasks and link the parent.
- **Project Reference Docs Guide:** read required project-reference docs (always `lessons.md`) before target work.
- **Task Tracking & External Report:** bootstrap task breakdown, transition one task at a time.

- **MANDATORY IMPORTANT MUST ATTENTION** NEVER write smoke-only tests — instead read handler/entity/event source, assert specific changed field values — why: DI-resolution / exception-null-only tests pass while the behavior is broken
- **MANDATORY IMPORTANT MUST ATTENTION** ALWAYS use async polling for EVERY DB assertion — no exceptions, not just async handlers — why: event handlers, message-bus consumers, background jobs, write latency delay persistence
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER fabricate state by direct repository writes — instead drive state through real command/query/seeder paths or valid seeded fixtures — why: shortcut data creates invalid state the suite then certifies
- **MANDATORY IMPORTANT MUST ATTENTION** search 3+ existing tests in the SAME service and READ `references/integration-test-patterns.md` BEFORE writing — match collection, base class, helpers, unique-name generators — why: local conventions override generic templates
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence (confidence >80% to act, <60% do NOT recommend) for every claim about field changes, entities, or handler behavior — why: AI hallucinates APIs/signatures; grep to confirm before asserting
- **MANDATORY IMPORTANT MUST ATTENTION** `TaskCreate` — break ALL work into small tasks BEFORE starting; transition one task at a time, add a final review task — why: tracking survives context loss/compaction
- **MANDATORY IMPORTANT MUST ATTENTION** execute the main task ordering IN ORDER — (1) FIRST verify/upsert TCs in feature-doc §8 for business-visible behavior, or record `TECHNICAL-ONLY` for non-business behavior, (2) MIDDLE implement tests with the correct annotation, (3) FINAL verify traceability, feature-area-WIDE, across integration + unit suites — and run the per-mode loop Detect mode → Find targets → Gather context → Execute → Report — why: implementing before traceability exists produces orphans and skipping FINAL leaves drift undetected
- **MANDATORY IMPORTANT MUST ATTENTION** run the named "Validate: no missing integration tests" `TaskCreate` item — non-skippable inside a workflow, with current git changes present, or by user request (essentially every run) — every changed file covered AND every §8 TC in the WHOLE feature area covered, zero GAP rows before marking done — why: a diff-scoped-only check misses pre-existing orphaned TCs outside this run
- **MANDATORY IMPORTANT MUST ATTENTION** every test method carries a traceability annotation: `TestSpec=TC-{FEATURE}-{NNN}` for business §8 coverage, or `TechnicalSpec=...` for technical-only regression coverage. Auto-create in Section 8 ONLY for genuinely uncovered business behavior — why: the annotation is the join key for traceability
- **MANDATORY IMPORTANT MUST ATTENTION** one business TC maps to MANY tests (1:N, integration + unit) — NEVER split or technicalize a TC to force 1:1 — why: 1:1 splitting breaks the spec's business/user-story orientation (M1/M5)
- **MANDATORY IMPORTANT MUST ATTENTION** for any handler enforcing a `[HARD]` §4 rule or §5 invariant, generate a Pattern 9 property/metamorphic test + boundary counter-case tied to a §8 Invariant/Property TC — why: example tests guard fixed points; the rule must fail across its whole input domain (mutation-kill, not line-coverage)
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER create `Queries/` or `Commands/` folders — instead organize by domain feature — why: CQRS-type folders fragment a domain across directories
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER mark done after one green run — verification requires 2 consecutive `/integration-test-verify` passes WITHOUT a DB reset — why: one run proves only the current run, not repeatability
- **MANDATORY IMPORTANT MUST ATTENTION** make every test parallel-safe — own fresh per-test data down to the root it asserts on, NEVER a shared mutable entity; account for cross-cutting consumers (bulk re-sync/recompute/rebuild/cascade) that wipe a shared parent; on a contradiction between a provably-innocent path and wrong state, suspect cross-test interference FIRST and prove isolation by grepping other tests + consumers — why: shared mutable state lets another test silently corrupt your data and the innocent path takes the blame
- **MANDATORY IMPORTANT MUST ATTENTION** apply the Real-World Fidelity Gate BEFORE writing any setup — ask "can this sequence, timing, and data actually occur in production?", model real pacing between distinct actor actions instead of firing them in the same millisecond, and wait on an observable settle signal in ARRANGE; NEVER widen an assertion timeout, loosen a comparison, or wrap a failing assertion in a retry to compensate — why: a scenario production can never reach proves nothing when it passes and manufactures phantom "product defects" when it fails
- **MANDATORY IMPORTANT MUST ATTENTION** `review`/`verify` are lightweight in-skill MODES — invoke the standalone `/integration-test-review` and `/integration-test-verify` skills for the heavier workflow gates — why: name-collision; modes are not the sibling skills
- **MANDATORY IMPORTANT MUST ATTENTION** `AskUserQuestion` — validate workflow/route decisions with the user. NEVER auto-decide complexity.
- **MANDATORY IMPORTANT MUST ATTENTION** passing code/tests NEVER outrank canonical spec intent — instead reach adjudication-required with evidence before changing spec/test/code on a behavior mismatch — why: a green test can encode a regression
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**Anti-Rationalization:**

| Evasion                            | Rebuttal                                                                                             |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| "Test is simple, skip TC lookup"   | TC traceability = test value. Skip = untraceable test.                                               |
| "Async polling not needed here"    | Poll only for an asynchronous/eventually consistent contract; synchronous persistence should use deterministic reads. |
| "Already searched patterns"        | Show `file:line` evidence. No proof = no search.                                                     |
| "Smoke test is fine for now"       | Smoke-only FORBIDDEN. Assert specific field values.                                                  |
| "Repo setup is faster"             | Use the production path for the behavior under test; use valid project fixtures for unrelated preconditions. |
| "One green run is enough"          | Follow the configured repeat policy; absent guidance, repeat fresh runs for suites with shared or persistent state. |
| "It shares an existing entity, that's fine" | Shared mutable state is the single point another test corrupts. Own fresh per-test data; only immutable lookup data may be shared. |
| "My path doesn't mutate that parent" | A cross-cutting consumer can wipe the shared parent without you touching it. Sharing it is unsafe even without direct mutation. |
| "The path under test is correct, so the test is right" | Provably-innocent path + wrong state = suspect cross-test interference FIRST. Grep other tests + cross-cutting consumers before blaming the code. |
| "REVIEW: one pass is enough"       | Low confidence → spawn fresh sub-agent. Never declare PASS after Round 1.                            |
| "Skip task creation, it's obvious" | TaskCreate is non-negotiable. Tracking prevents context loss.                                        |
| "Split this TC so tests map 1:1"   | Preserve the selected profile's declared case-to-test cardinality; strict default allows one business TC to cover multiple tests. |
| "Example tests cover the rule"     | Use property/metamorphic tests when a rule must hold across a broad input domain; retain focused examples for concrete scenarios. |
| "Run `review` mode, it's the gate" | `review`/`verify` modes are inline passes; the workflow gates are the standalone `/integration-test-review` + `/integration-test-verify` skills. |

**IMPORTANT MUST ATTENTION** Apply the Easy-to-Change lens: every test/design choice must make the next change cheaper; reject coupling, hidden state, duplicated knowledge, and unclear intent.
**IMPORTANT MUST ATTENTION** Final guard: use production-like wiring at the tested integration boundary; assert system-owned outcomes; follow the selected case carrier and configured repeat/isolation policy; retain zero-GAP/UNKNOWN coverage for the declared scope.
