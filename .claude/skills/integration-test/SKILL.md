---
name: integration-test
version: 1.0.0
description: '[Testing] Generate or review integration tests. Modes: generate (from git changes or prompt), review (quality audit of existing tests), diagnose (analyze test failures). Subcutaneous tests with real DI, no mocks.'
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Task, TaskCreate, AskUserQuestion
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

**Prerequisites:** **MUST ATTENTION READ** before executing:

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->

- `references/integration-test-patterns.md`
- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)
- `docs/test-specs/` — Test specifications by module (read existing TCs for expected behavior; verify test-to-spec traceability)

<!-- SYNC:graph-impact-analysis -->

> **Graph Impact Analysis** — When `.code-graph/graph.db` exists, run `blast-radius --json` to detect ALL files affected by changes (7 edge types: CALLS, MESSAGE_BUS, API_ENDPOINT, TRIGGERS_EVENT, PRODUCES_EVENT, TRIGGERS_COMMAND_EVENT, INHERITS). Compute gap: impacted_files - changed_files = potentially stale files. Risk: <5 Low, 5-20 Medium, >20 High. Use `trace --direction downstream` for deep chains on high-impact files.

<!-- /SYNC:graph-impact-analysis -->

> **CRITICAL: Search existing patterns FIRST.** Before generating ANY test, grep for existing integration test files in the same service. Read at least 1 existing test file to match conventions (namespace, usings, collection name, base class, helper usage). Never generate tests that contradict established patterns in the codebase.

> **CRITICAL: NO Smoke/Fake/Useless Tests.** Every test MUST execute actual commands/handlers and verify data state in the database — like a QC tester testing the real system. NO DI-resolution-only tests (`GetRequiredService + NotBeNull`). NO exception-check-only tests (`exception.Should().BeNull()` alone). Before writing assertions: READ the handler/entity/event source to understand WHAT fields change, WHAT entities are created/updated/deleted, WHAT event handlers fire. Assert specific field values in the database.

> **CRITICAL: Async Polling for ALL Data Assertions.** ALWAYS wrap data state assertions in the project's async polling/retry helper. This is the DEFAULT for ALL data verification — not just "async event handlers". Data persistence may be delayed by entity event handlers, message bus consumers, background jobs, or DB write latency. Async polling retries with timeout and is always safe. **Rule: If you assert data in the database, use async polling. No exceptions.**

<!-- SYNC:repeatable-test-principle -->

> **Infinitely Repeatable Tests** — Tests MUST run N times without failure. Like manual QC — run the suite 100 times, each run just adds more data.
>
> 1. **Unique data per run:** Use the project's unique ID generator for ALL entity IDs created in tests. NEVER hardcode IDs.
> 2. **Additive only:** Tests create data, never delete/reset. Prior test runs MUST NOT interfere with current run.
> 3. **No schema rollback dependency:** Tests work with current schema only. Never rely on schema rollback or migration reversals.
> 4. **Idempotent seeders:** Fixture-level seeders use create-if-missing pattern (check existence before insert). Test-level data uses unique IDs per execution.
> 5. **No cleanup required:** No teardown, no database reset between runs. Each test is isolated by unique seed data, not by cleanup.
> 6. **Unique names/codes:** When entities require unique names/codes, append a unique suffix using the project's ID generator.

<!-- /SYNC:repeatable-test-principle -->

> **For test specifications and test case generation from PBIs, use `/tdd-spec` skill (preferred) or `/test-spec` skill instead.**

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

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

## Quick Summary

**Goal:** Generate integration test files for commands/queries using real DI (no mocks).

## Project Pattern Discovery

Before implementation, search your codebase for project-specific patterns:

- Search for: `IntegrationTest`, `TestFixture`, `TestUserContext`, `IntegrationTestBase`
- Look for: existing test projects, test collection definitions, service-specific test base classes

> **MANDATORY IMPORTANT MUST ATTENTION** Plan ToDo Task to READ `integration-test-reference.md` for project-specific patterns and code examples.
> If file not found, continue with search-based discovery above.

**Five modes:** (1) From git changes (default) — detects uncommitted command/query files and generates matching tests. (2) From prompt — user specifies what to test. (3) Review — audit existing tests for quality, best practices, and flaky patterns. (4) Diagnose — analyze test failures to determine root cause (test bug vs code bug). (5) Verify-traceability — check test code matches test specs and feature docs.

**Workflow:**

1. **Detect mode** — See Mode Detection section below
2. **Find targets** — Identify test/command/query files
3. **Gather context** — Read relevant files for the detected mode
4. **Execute** — Generate, review, diagnose, or verify depending on mode
5. **Report** — Build check (generate), quality report (review), root cause (diagnose)

**Key Rules:**

- MUST ATTENTION search for existing test patterns in the same service BEFORE generating
- MUST ATTENTION READ `references/integration-test-patterns.md` before writing any test
- **Organize by domain feature, NOT by type** — command and query tests for the same domain go in the same folder (e.g., `Orders/OrderCommandIntegrationTests.*` + `Orders/OrderQueryIntegrationTests.*`). NEVER create a `Queries/` or `Commands/` folder.
- Use the project's unique name generator for ALL string test data (search test utilities for unique name helpers)
- Use the project's entity assertion helpers for DB verification with built-in async polling (search test base classes for `AssertEntity*` or equivalent patterns)
- **CRITICAL MUST ATTENTION ENSURE:** ALWAYS wrap ALL data state assertions in the project's async polling/retry helper. This is the DEFAULT — not just for "async" handlers. Data may be delayed by entity event handlers, message bus consumers, or background jobs. Async polling retries with timeout and is always safe. **If you assert data in DB → use async polling. No exceptions.**
- **CRITICAL MUST ATTENTION ENSURE:** Before writing assertions, READ the handler/entity/event source code. Understand WHAT fields change, WHAT entities are created/updated/deleted, WHAT event handlers fire. Assert specific field values, not just non-null. Smoke-only is FORBIDDEN unless side effect is truly unobservable.
- Minimum 3 test methods: happy path, validation failure, DB state check
- **Authorization tests:** Include tests with multiple user contexts (use the project's user context factory) — verify authorized access succeeds AND unauthorized access is rejected
- Every test method MUST ATTENTION have `// TC-{FEATURE}-{NNN}: Description` comment AND a test-spec annotation (e.g., `[Trait("TestSpec", "TC-{FEATURE}-{NNN}")]` in xUnit — adapt to your framework) — placed before the test method, outside method body
- If no TC exists in feature docs, **auto-create** it in Section 15 before generating the test
- For comprehensive test spec generation before coding, use `/tdd-spec` first

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Mandatory Task Ordering (MUST ATTENTION FOLLOW)

When generating integration tests, ALWAYS create and execute tasks in this exact order:

1. **FIRST task: Verify/upsert test specs in feature docs**
    - Read feature doc Section 15 (`docs/business-features/{App}/detailed-features/`) for the target domain
    - Read test-specs doc (`docs/test-specs/{App}/README.md`) if exists
    - For each test case to generate: verify a matching `TC-{FEATURE}-{NNN}` exists in docs
    - If TC is MISSING: create the TC entry in Section 15 with Priority, Status, GIVEN/WHEN/THEN, Evidence
    - If TC is INCORRECT: update it to reflect current command/query behavior
    - Output: a TC mapping list (TC code → test method name) for subsequent tasks

2. **MIDDLE tasks: Implement integration tests**
    - Generate test files using the TC mapping from task 1
    - Each test method gets a TC annotation before it (outside method body) — **adapt to your test framework** (C#/xUnit example):
        ```csharp
        // TC-OM-001: Create valid order — happy path
        [Trait("TestSpec", "TC-OM-001")]
        [Fact]
        public async Task CreateOrder_WhenValidData_ShouldCreateSuccessfully()
        ```
    - Follow all existing patterns from the project's test base classes (collection/group, category, unique data helpers, assertion helpers, etc.)

3. **FINAL task: Verify bidirectional traceability**
    - Grep for test-spec annotations in the test project (e.g., `[Trait("TestSpec", ...)]` in xUnit, `@Tag` in JUnit — adapt to your framework)
    - Grep all `TC-{FEATURE}-{NNN}` in feature doc Section 15 / test-specs doc
    - Verify every test method links to a doc TC, and every doc TC links back to a test
    - Flag orphans: tests without doc TCs, or doc TCs without matching tests
    - Update `IntegrationTest` field in feature doc TCs with `{File}::{MethodName}`

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

## TC Code Numbering Rules

When creating new `TC-{FEATURE}-{NNN}` codes:

1. **Always check the feature doc's first** — `docs/business-features/{App}/detailed-features/` contains existing TC codes. New codes must not collide.
2. **Existing docs use decade-based grouping** — e.g., OM: 001-004 (CRUD), 011-013 (validation), 021-023 (permissions), 031-033 (events). Find the next free decade.
3. **If a collision is unavoidable** — renumber in the doc side only (e.g., TC-OM-031 → TC-OM-034). Keep the test-spec annotation in the test file unchanged and add a renumbering note in the doc.
4. **Feature doc is the canonical registry** — the test-spec annotation in test files is for traceability, not the source of truth for numbering.

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

## Step 1: Find Targets

### From-Changes Mode (default)

Run via Bash tool:

```bash
git diff --name-only; git diff --cached --name-only
```

Filter for command/query files using the project's naming conventions (e.g., `*Command.*`, `*Query.*`). Path patterns for services and test projects come from `docs/project-config.json` → `modules` or `backendServices`. Extract service from path:

| Path pattern                                        | Service   | Test project                                         |
| --------------------------------------------------- | --------- | ---------------------------------------------------- |
| Per `docs/project-config.json` service path pattern | {Service} | `{Service}.IntegrationTests` (or project equivalent) |

Search your codebase for existing `*.IntegrationTests.*` projects to find the correct mapping.

If no test project exists: inform user "No integration test project for {service}. See CLAUDE.md Integration Testing section to create one."

If test file already exists: ask user overwrite or skip.

### From-Prompt Mode

User specifies command/query name. Use Grep tool (NOT bash grep):

```
Grep pattern="class {CommandName}" path="." glob="*.cs" (adapt path and extension to your project)
```

## Step 2: Gather Context

For each target, read these files (in parallel):

1. **Command/query file** — extract: class name, result type, DTO property, entity type
2. **Existing test files in same service** — use Glob `{Service}.IntegrationTests/**/*IntegrationTests.*`, read 1+ for conventions (collection name, trait, namespace, usings, base class)
3. **Service integration test base class** — grep: `class.*ServiceIntegrationTestBase`
4. **`references/integration-test-patterns.md`** — canonical templates (adapt {Service} placeholders)

## Step 2b: Look Up TC Codes

For each target domain, read the matching test spec:

- `docs/business-features/{App}/detailed-features/` Section 15 (primary source of truth)
- `docs/test-specs/{App}/README.md` (secondary reference)

Build a mapping: test case description → TC code (e.g., "create valid order" → TC-OM-001).
If no TC exists, **CREATE IT** in the feature doc Section 15 before generating the test.
If TC is outdated or incorrect, **UPDATE IT** first.
This is NOT optional — the doc is the source of truth and must be correct before tests reference it.
If no TC exists and feature doc Section 15 is missing, run `/tdd-spec` first to generate test specifications.

## Step 3: Generate Test File

**File path:** `{project-test-dir}/{Service}.IntegrationTests/{Domain}/{CommandName}IntegrationTests{ext}` (adapt path and extension to your project's conventions — see `docs/project-config.json` → `integrationTestVerify.testProjectPattern`)

> **Folder = domain feature.** `{Domain}` is the business domain (Orders, Inventory, Notifications, UserProfiles, etc.), NOT the CQRS type. Both command and query tests for the same domain live in the same folder.

**Structure (C#/xUnit example — adapt namespace, collection/group attribute, category annotation, and base class to your framework):**

```csharp
#region
using FluentAssertions;
// ... service-specific usings (copy from existing tests)
#endregion

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

## Step 4: Verify

Build the test project using your project's build tool (see `/integration-test-verify` for config-driven build and run).

Check:

- [ ] Test collection/group attribute present with correct collection name (framework-specific: `[Collection]`, `@Nested`, etc.)
- [ ] Test category annotation present (framework-specific: `[Trait("Category", ...)]`, `@Tag`, `@Category`, etc.)
- [ ] All string test data uses the project's unique name generator
- [ ] User context created via the project's user context factory
- [ ] DB assertions use the project's entity assertion helpers with async polling
- [ ] No mocks — real DI only
- [ ] Every test method has `// TC-{FEATURE}-{NNN}: Description` comment + test-spec annotation (adapt to your framework)

## Example Files to Study

Search your codebase for existing integration test files to use as reference (adapt file extension to your project):

```bash
# Find existing integration test files (adapt path and extension to your project)
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

## Related

| Skill             | Relationship                                         | When to Use                                                               |
| ----------------- | ---------------------------------------------------- | ------------------------------------------------------------------------- |
| `tdd-spec`        | TC source — generates test specs this skill consumes | Run FIRST to create TCs in feature doc Section 15 before generating tests |
| `test-spec`       | Heavyweight planning — feeds test strategies         | Use for complex test planning requiring deep investigation                |
| `test-specs-docs` | Dashboard sync — keeps docs/test-specs/ in sync      | Run AFTER generating tests to update the cross-module dashboard           |
| `test`            | Test runner — executes the generated tests           | Run AFTER generating tests to verify they pass                            |
| `review-changes`  | Change review — reviews uncommitted changes          | Run to review test files before committing                                |

### How to Use for Each Case

**Case: Generate tests from existing test specs (feature docs Section 15)**

```
/integration-test CreateOrderCommand
```

→ Reads Section 15 TCs, generates test file with TC annotations

**Case: Generate tests from git changes (default)**

```
/integration-test
```

→ Detects changed command/query files, checks Section 15 for matching TCs, generates tests

**Case: Generate tests after /tdd-spec created new TCs**

```
/tdd-spec → /integration-test
```

→ tdd-spec writes TCs to Section 15, then integration-test generates tests from those TCs

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

When mode = REVIEW, audit existing integration tests for quality, flaky patterns, and best practices.

## Review Workflow

1. **Find test files** — Glob `{Service}.IntegrationTests/{Domain}/**/*IntegrationTests.*`
2. **Read each test file** — analyze for quality issues
3. **Generate quality report** — categorized findings with severity

## Review Checklist

### Flaky Test Detection (CRITICAL)

These patterns cause intermittent failures — flag as HIGH severity:

- [ ] **Missing async polling** — DB assertions after async event handlers without async polling/retry (e.g., `WaitUntilAsync()` or equivalent). Direct assertions on state changed by background threads WILL flake.
- [ ] **Missing retry for eventual consistency** — Any assertion that checks state modified by message bus consumers, event handlers, or background jobs without polling/retry wrapper
- [ ] **Hardcoded delays** — `Thread.Sleep()`, `Task.Delay()` instead of condition-based polling (`WaitUntil`, retry loops with timeout)
- [ ] **Race conditions** — Multiple tests modifying shared state without isolation (e.g., same entity ID, same user context)
- [ ] **Non-unique test data** — Hardcoded strings/IDs instead of unique generators (search your test utilities for a unique name helper, e.g., `IntegrationTestHelper.UniqueName()` or equivalent)
- [ ] **Time-dependent assertions** — Tests that depend on `DateTime.Now` without time abstraction

### Best Practice Checks

- [ ] **Collection/group attribute** — All test classes have correct collection/group for shared fixture
- [ ] **Category trait** — `[Trait("Category", "Command")]` or equivalent categorization present
- [ ] **TC annotation** — Every test method has TC code comment + test spec trait/attribute
- [ ] **Minimum test coverage** — At least 3 tests per command: happy path, validation, DB state
- [ ] **No mocks** — Real DI only, no mock frameworks in integration tests
- [ ] **Unique test data** — All string data uses unique generators
- [ ] **User context** — Test user context via factory, not hardcoded
- [ ] **DB assertions** — Uses entity assertion helpers (not raw DB queries)
- [ ] **Cleanup** — Tests don't leave orphaned data that affects other tests

### Code Quality Checks

- [ ] **Method naming** — Follows `{Action}_When{Condition}_Should{Expectation}` pattern
- [ ] **Arrange-Act-Assert** — Clear separation in test methods
- [ ] **No logic in tests** — No conditionals, loops, or complex setup in test methods
- [ ] **Test independence** — Each test can run in isolation

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

When mode = DIAGNOSE, analyze failing tests to determine whether the failure is a test bug or an application code bug.

## Diagnose Workflow

1. **Identify failing tests** — User provides test class name or run test suite to collect failures
2. **Read test code** — Understand what the test expects
3. **Read application code** — Trace the command/query handler path
4. **Compare expected vs actual** — Determine root cause
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
│   └── Wrong count/order?
│       ├── Test data leak from other tests → TEST BUG (isolation)
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

When mode = VERIFY, perform bidirectional traceability check between test code, test specifications, and feature documentation.

## Verify Workflow

1. **Collect test methods** — Grep for test spec annotations in test project
2. **Collect doc TCs** — Read feature doc Section 15 for all TC entries
3. **Build 3-way matrix** — Test code ↔ test-specs/ ↔ feature doc Section 15
4. **Identify mismatches** — Orphans, stale references, behavior drift
5. **Classify mismatches** — Which source is correct?
6. **Report** — Traceability matrix + recommended fixes

## Mismatch Classification

When test code and spec disagree, determine which is correct:

| Scenario                                          | Likely Correct Source         | Action                       |
| ------------------------------------------------- | ----------------------------- | ---------------------------- |
| Test passes, spec describes different behavior    | Test (reflects current code)  | Update spec to match test    |
| Test fails, spec describes expected behavior      | Spec (test is stale)          | Update test to match spec    |
| Test exists, no spec                              | Test (spec was never written) | Create spec from test        |
| Spec exists, no test                              | Spec (test was never written) | Generate test from spec      |
| Test and spec agree, but code behaves differently | Spec (code has regression)    | Fix code or update spec+test |

## Verification Checklist

- [ ] Every test method has a matching TC in feature doc Section 15
- [ ] Every TC in Section 15 has a matching test method (or is marked `Status: Untested`)
- [ ] TC descriptions in docs match what the test actually validates
- [ ] Evidence file paths in TCs point to current (not stale) code locations
- [ ] Test annotations match TC IDs (no typos, no orphaned IDs)
- [ ] Priority levels in docs match test categorization
- [ ] `docs/test-specs/` dashboard is in sync with feature doc Section 15

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
| TC-OM-005 | Section 15   | P0       | Generate test via /integration-test |

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

- Every test creates its own data — no shared mutable state between tests
- Use unique identifiers for ALL string data (search your test utilities for a unique name/data generator helper)
- Factory methods return valid entities by default — tests override only what they test
- Cross-entity dependencies: create parent first, then child (e.g., create User, then create Order for that User)
- **Seed data:** If the feature requires reference/lookup data, set up seed data in the collection fixture or per-test preconditions

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `test-to-integration` workflow** (Recommended) — scout → integration-test → test
> 2. **Execute `/integration-test` directly** — run this skill standalone

---

## Test Execution & Failure Diagnosis (MANDATORY)

> **IMPORTANT MUST ATTENTION:** After generating/modifying integration tests, you MUST:
>
> 1. **Run tests:** Use `/integration-test-verify` (reads `quickRunCommand` from `docs/project-config.json`)
> 2. **If tests fail:** Diagnose root cause — is the failure because (a) test code has wrong setup/assertions → fix test code, or (b) actual service code has a bug → report as finding
> 3. **Never mark done until tests pass.** Unrun tests have zero value.
> 4. **Iterate:** Fix → rerun → verify until all tests pass or failures are confirmed as service bugs

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/integration-test-verify (Recommended)"** — Run integration tests to verify they all pass
- **"/workflow-review-changes"** — Review all changes before committing
- **"Skip, continue manually"** — user decides

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

<!-- SYNC:understand-code-first:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
  <!-- /SYNC:understand-code-first:reminder -->
  <!-- SYNC:graph-impact-analysis:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** run `blast-radius` when graph.db exists. Flag impacted files NOT in changeset as potentially stale.
  <!-- /SYNC:graph-impact-analysis:reminder -->
  <!-- SYNC:red-flag-stop-conditions:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** STOP after 3 failed fix attempts. Report all attempts, ask user before continuing.
  <!-- /SYNC:red-flag-stop-conditions:reminder -->
  <!-- SYNC:rationalization-prevention:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** follow ALL steps regardless of perceived simplicity. "Too simple to plan" is an evasion, not a reason.
      <!-- /SYNC:rationalization-prevention:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** READ `references/integration-test-patterns.md` before starting
