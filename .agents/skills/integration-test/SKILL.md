---
name: integration-test
description: '[Testing] Use when a workflow step or the user asks for integration tests. Generates or reviews integration tests.'
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
- **Testability contract:** resolve Unit/Integration/System/E2E applicability from runner/config evidence; record owner/root/data, copy-ready full/focused commands, zero-match behavior, CI/simple Windows/macOS/Linux entry, run/data identity, and repeat proof; missing applicable fields block handoff; non-applicable tiers need evidence-backed `N/A`.
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

> **For test specifications and test case generation from PBIs, use `$spec [mode=tests]` skill instead.**

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
- For comprehensive spec generation before coding → `$spec [mode=tests]` first

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

    > **MANDATORY task — "Validate: no missing integration tests" (non-skippable inside a workflow, with staged/unstaged git changes, or by direct request — essentially every run; only exception: narrow read-only single-TC lookup with no generation).** Create as its OWN named task tracking item, not folded into step 3. Run the same bidirectional logic as VERIFY-TRACEABILITY, scoped to the feature area:
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
Args = command/query name (e.g., "$integration-test CreateOrderCommand")
  → FROM-PROMPT mode: generate tests for the specified command/query

No args (e.g., "$integration-test")
  → FROM-CHANGES mode: detect changed command/query files from git

Args = "review" (e.g., "$integration-test review Orders")
  → REVIEW mode: audit existing test quality, find flaky patterns, check best practices

Args = "diagnose" (e.g., "$integration-test diagnose OrderCommandIntegrationTests")
  → DIAGNOSE mode: analyze why tests fail — determine test bug vs code bug

Args = "verify" (e.g., "$integration-test verify {Service}")
  → VERIFY-TRACEABILITY mode: check test code matches specs and feature docs
```

> **Modes vs. sibling skills (name-collision note).** `review` and `verify` are lightweight inline branches, not standalone `$integration-test-review` (deep quality) or `$integration-test-verify` (full traceability) workflow steps. In `$integration-test → $integration-test-review → $integration-test-verify`, invoke the standalone skills; use modes for quick mid-generation passes.

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
- Missing Section 8 → run `$spec [mode=tests]` first.

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

| Tier | Applicability + evidence | Owner | Runner/framework | Test root | Fixture/data strategy | Full command | Focused/partial command | Zero-match behavior | CI gate | Simple Windows/macOS/Linux entry point |
| ---- | ------------------------- | ----- | ---------------- | --------- | --------------------- | ------------ | ------------------------ | ------------------- | -------- | --------------------------- |
| Unit | `APPLICABLE` + `{file:line}` or `N/A — {evidence}` | `{owner}` | `{configured runner/framework}` | `{path}` | `{strategy}` | `{copy-ready command}` | `{copy-ready command or N/A + evidence}` | `{non-zero / configured behavior}` | `{gate}` | `{configured entry point or N/A + evidence}` |
| Integration/System | `APPLICABLE` + `{file:line}` or `N/A — {evidence}` | `{owner}` | `{configured runner/framework}` | `{path}` | `{strategy}` | `{copy-ready command}` | `{copy-ready command or N/A + evidence}` | `{non-zero / configured behavior}` | `{gate}` | `{configured entry point or N/A + evidence}` |
| E2E | `APPLICABLE` + `{file:line}` or `N/A — {evidence}` | `{owner}` | `{configured runner/framework}` | `{path}` | `{strategy}` | `{copy-ready command}` | `{copy-ready command or N/A + evidence}` | `{non-zero / configured behavior}` | `{gate}` | `{configured entry point or N/A + evidence}` |

- Record unique run-identity source/format and business-data suffix before generation; carry both into the report. Mark `APPLICABLE` only with runner/framework/config evidence; otherwise record `N/A — <file:line evidence>` and do not fabricate tests.
- Verify every command from project config, reference docs, or runner script. If focused scope is supported, provide its command; otherwise record `N/A` with evidence. Invalid/zero-match selections must fail or use documented non-green behavior; zero matches never pass.
- Record supported public-path setup, realistic valid data, `count-before-create` idempotent reference setup, keyed/additive persistent data, and per-test/worker isolation. Shared mutable state is not run identity.
- Matrix + run identity are required output evidence even for generate/review modes; execution results belong to `$integration-test-verify`.

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

Build test project via project's build tool (see `$integration-test-verify` for config-driven build).

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
$integration-test CreateOrderCommand
```

→ Reads Section 8 TCs, generates test file with TC annotations

**Case: Generate tests from git changes (default)**

```
$integration-test
```

→ Detects changed command/query files, checks Section 8 for matching TCs, generates tests

**Case: Generate tests after $spec [mode=tests] created new TCs**

```
$spec [mode=tests] → $integration-test
```

→ spec [mode=tests] writes TCs to Section 8, then integration-test generates tests from those TCs

**Case: Review existing tests for quality**

```
$integration-test review Orders
```

→ Audits test quality, finds flaky patterns, checks best practices

**Case: Diagnose test failures**

```
$integration-test diagnose OrderCommandIntegrationTests
```

→ Analyzes failures, determines test bug vs code bug

**Case: Verify test-spec traceability**

```
$integration-test verify {Service}
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

> **MANDATORY:** Integration test REVIEW mode spawns `integration-tester` sub-agent (`agent_type: "integration-tester"`), NOT `code-reviewer`.
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
| TC-OM-005 | Section 8    | P0       | Generate test via $integration-test |

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

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** NOT in workflow? ask the user directly — do NOT decide complexity yourself. User decides:
>
> 1. **`workflow-write-integration-test` workflow** (Recommended) — investigate → spec [mode=tests] → artifact-review --type=spec-tests → integration-test → integration-test-review → integration-test-verify → spec [mode=sync] → docs-update → workflow-end → watzup
> 2. **`$integration-test` directly** — standalone

---

## Test Execution & Failure Diagnosis (MANDATORY)

> **IMPORTANT MUST ATTENTION:** After generating/modifying integration tests, MUST:
>
> 1. **Run tests:** `$integration-test-verify` (reads `quickRunCommand` from `docs/project-config.json`)
> 2. **If tests fail:** Diagnose root cause — (a) wrong test setup/assertions → fix test, or (b) service bug → report as finding
> 3. **NEVER mark done until tests pass.** Unrun tests have zero value.
> 4. **Iterate:** Fix → rerun → verify until all pass or failures confirmed as service bugs

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing, use ask the user directly to present:

- **"$integration-test-verify (Recommended)"** — Run integration tests to verify they pass
- **"$workflow-review-changes"** — Review all changes before committing
- **"Skip, continue manually"** — user decides

## Related Skills

| Skill                        | Relationship                                                                         | When to Call                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `$spec [mode=tests]`                  | **Producer** — TCs in feature doc Section 8 are the source for test generation       | Must run spec [mode=tests] before integration-test (CREATE or UPDATE mode). TCs must exist before generating tests. |
| `$artifact-review --type=spec-tests`           | **Upstream reviewer** — validates TC quality before test generation                  | Run before integration-test to ensure TCs have real assertion value                                        |
| `$spec [mode=sync]` | **Sync** — reconciles §8 TCs ↔ executing test code after tests are linked          | Run after integration-test to update the §8 `CoveredBy:` fields with the covering test links         |
| `$spec`              | **TC host** — Section 8 of feature doc is where TCs live                             | If feature doc is missing or Section 8 is empty → run $spec first                                  |
| `$spec-index`                | **Derived index** — regenerable navigation catalog over the Feature Specs (never a source of truth) | After §8 changes, to refresh the bucket `INDEX.md` TC counts                          |
| `$integration-test-review`   | **Reviewer** — 7-gate quality audit of generated tests + change coverage             | Always call after generating integration tests                                                             |
| `$integration-test-verify`   | **Runner** — executes tests and reports pass/fail                                    | Always call after integration-test-review clears                                                           |
| `$docs-update`               | **Orchestrator** — calls spec [mode=sync] (Phase 4) with test traceability              | Run for full doc sync after integration test files updated                                                 |

## Standalone Chain

> **When called outside a workflow**, follow this chain to complete the integration test authoring cycle.

```
integration-test (you are here)
  │
  ├─ PREREQUISITE: TCs must exist in feature doc Section 8
  │    [REQUIRED] Verify: {Bucket}/README.{Feature}.md in the business spec root
  │                 (default docs/specs; specRoots.business.path in docs/project-config.json overrides it)
  │                 Section 8 has TC-{FEATURE}-{NNN} entries
  │    If empty → run $spec [mode=tests] [CREATE mode] first
  │
  ├─ [REQUIRED] → $integration-test-review
  │     7-gate quality audit: assertion value, data state, repeatability, domain logic, traceability, three-way sync, change coverage.
  │     Never skip — Gate 6 (three-way sync) is the only place where spec/code/test conflicts surface,
  │     and Gate 7 (change coverage) is the only place where untested changed behavior surfaces.
  │
  ├─ [REQUIRED] → $integration-test-verify
  │     Runs tests and reports pass/fail counts. Never mark complete without real runner output.
  │
  ├─ [REQUIRED] → $spec [mode=sync]
  │     Updates the §8 TCs' CoveredBy: file::method traceability links.
  │
  ├─ [RECOMMENDED] → $docs-update
  │     Updates feature doc evidence fields and version history if test coverage changed materially.
  │
  └─ [RECOMMENDED] → $artifact-review --type=spec-tests
        Re-run if integration-test-review (Gate 6) flagged TC issues requiring TC edits.

### Mode-Specific Chains

| Mode | Pre-step | Post-step |
|------|---------|-----------|
| from-changes | verify TCs updated (run $spec [mode=tests] UPDATE first) | $integration-test-review → /verify → /sync |
| from-prompt | confirm TC exists for target feature | $integration-test-review → /verify → /sync |
| review | N/A (read-only) | report findings → $spec [mode=tests] UPDATE if TCs need fixes |
| diagnose | run $test to see failures first | fix identified issue → re-run $integration-test-verify |
| verify-traceability | N/A (read-only) | if orphaned TCs: $spec [mode=tests] UPDATE → $integration-test [from-prompt] |
```

> **[IMPORTANT]** task tracking — break ALL work into small tasks BEFORE starting. NEVER skip task creation.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `graph-impact-analysis` — Blast-radius query that finds the files a change affects and flags stale ones; assessing change impact while the code graph exists → .claude/skills/shared/protocols/graph-impact-analysis.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `integration-test-execution-discipline` — How integration tests are written, reviewed, run, diagnosed and cleared; working in the integration-test skill family → .claude/skills/shared/protocols/integration-test-execution-discipline.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `rationalization-prevention` — Recognize and reject the evasions used to skip required steps; tempted to skip a step, a test or a review → .claude/skills/shared/protocols/rationalization-prevention.md
- `real-world-fidelity-testing` — Integration, E2E and system tests exercise real boundaries; authoring, reviewing or repairing integration, E2E or system tests → .claude/skills/shared/protocols/real-world-fidelity-testing.md
- `red-flag-stop-conditions` — Conditions that require stopping and escalating to the user; debugging or testing stalls or the risk rises → .claude/skills/shared/protocols/red-flag-stop-conditions.md
- `repeatable-test-principle` — Same contract result across fresh runs and supported concurrency; writing or reviewing tests → .claude/skills/shared/protocols/repeatable-test-principle.md
- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md
- `spec-drift-adjudication` — Decide code-wrong versus spec-stale from evidence, never silently; behavior diverges from its spec → .claude/skills/shared/protocols/spec-drift-adjudication.md
- `spec-tests-code-triangulation` — Review spec, tests and code together for mutual consistency first; reviewing behavior that has a spec → .claude/skills/shared/protocols/spec-tests-code-triangulation.md
- `sub-agent-selection` — Pick the sub-agent type from the routing guide; choosing which sub-agent to spawn → .claude/skills/shared/protocols/sub-agent-selection.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
- `test-data-isolation` — Tests stay independent across the supported concurrency modes; writing stateful tests → .claude/skills/shared/protocols/test-data-isolation.md
- `test-failure-fault-adjudication` — Decide whether the source or the test is at fault before editing either; a test fails → .claude/skills/shared/protocols/test-failure-fault-adjudication.md
- `understand-code-first` — Read and trace the target and existing patterns before changing code; planning or editing code → .claude/skills/shared/protocols/understand-code-first.md

<!-- PROTOCOL-GUIDES:END -->

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

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `$project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

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

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** Testability contract: resolve Unit/Integration/System/E2E applicability, copy-ready full/focused commands, zero-match failures, owner/root/data, CI/simple Windows/macOS/Linux entry, unique run identity, and repeat proof before completion.
**IMPORTANT MUST ATTENTION Goal:** Generate/review real-DI integration tests across 5 modes (from-changes · from-prompt · review · diagnose · verify-traceability) that exercise production paths and assert specific DB fields, so each test protects the selected canonical case contract, survives no-reset repeats, and fails only when protected intent breaks.

**IMPORTANT MUST ATTENTION** Main order: (1) FIRST read the selected canonical owner and resolve required case coverage; only the strict default upserts Section 8 TCs; (2) MIDDLE implement real-path tests with the selected traceability carrier; (3) FINAL reconcile changed behavior and the full affected owner/case scope across integration + unit. Per mode: Detect → Find targets → Gather context → Execute → Report.
**IMPORTANT MUST ATTENTION** Modes: `from-changes`/`from-prompt` generate; `review` audits; `diagnose` classifies failures; `verify-traceability` audits test↔spec↔feature-doc links. In-workflow standalone `$integration-test-review` and `$integration-test-verify` remain the heavier gates.
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
- **MANDATORY IMPORTANT MUST ATTENTION** task tracking — break ALL work into small tasks BEFORE starting; transition one task at a time, add a final review task — why: tracking survives context loss/compaction
- **MANDATORY IMPORTANT MUST ATTENTION** execute the main task ordering IN ORDER — (1) FIRST verify/upsert TCs in feature-doc §8 for business-visible behavior, or record `TECHNICAL-ONLY` for non-business behavior, (2) MIDDLE implement tests with the correct annotation, (3) FINAL verify traceability, feature-area-WIDE, across integration + unit suites — and run the per-mode loop Detect mode → Find targets → Gather context → Execute → Report — why: implementing before traceability exists produces orphans and skipping FINAL leaves drift undetected
- **MANDATORY IMPORTANT MUST ATTENTION** run the named "Validate: no missing integration tests" task tracking item — non-skippable inside a workflow, with current git changes present, or by user request (essentially every run) — every changed file covered AND every §8 TC in the WHOLE feature area covered, zero GAP rows before marking done — why: a diff-scoped-only check misses pre-existing orphaned TCs outside this run
- **MANDATORY IMPORTANT MUST ATTENTION** every test method carries a traceability annotation: `TestSpec=TC-{FEATURE}-{NNN}` for business §8 coverage, or `TechnicalSpec=...` for technical-only regression coverage. Auto-create in Section 8 ONLY for genuinely uncovered business behavior — why: the annotation is the join key for traceability
- **MANDATORY IMPORTANT MUST ATTENTION** one business TC maps to MANY tests (1:N, integration + unit) — NEVER split or technicalize a TC to force 1:1 — why: 1:1 splitting breaks the spec's business/user-story orientation (M1/M5)
- **MANDATORY IMPORTANT MUST ATTENTION** for any handler enforcing a `[HARD]` §4 rule or §5 invariant, generate a Pattern 9 property/metamorphic test + boundary counter-case tied to a §8 Invariant/Property TC — why: example tests guard fixed points; the rule must fail across its whole input domain (mutation-kill, not line-coverage)
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER create `Queries/` or `Commands/` folders — instead organize by domain feature — why: CQRS-type folders fragment a domain across directories
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER mark done after one green run — verification requires 2 consecutive `$integration-test-verify` passes WITHOUT a DB reset — why: one run proves only the current run, not repeatability
- **MANDATORY IMPORTANT MUST ATTENTION** make every test parallel-safe — own fresh per-test data down to the root it asserts on, NEVER a shared mutable entity; account for cross-cutting consumers (bulk re-sync/recompute/rebuild/cascade) that wipe a shared parent; on a contradiction between a provably-innocent path and wrong state, suspect cross-test interference FIRST and prove isolation by grepping other tests + consumers — why: shared mutable state lets another test silently corrupt your data and the innocent path takes the blame
- **MANDATORY IMPORTANT MUST ATTENTION** apply the Real-World Fidelity Gate BEFORE writing any setup — ask "can this sequence, timing, and data actually occur in production?", model real pacing between distinct actor actions instead of firing them in the same millisecond, and wait on an observable settle signal in ARRANGE; NEVER widen an assertion timeout, loosen a comparison, or wrap a failing assertion in a retry to compensate — why: a scenario production can never reach proves nothing when it passes and manufactures phantom "product defects" when it fails
- **MANDATORY IMPORTANT MUST ATTENTION** `review`/`verify` are lightweight in-skill MODES — invoke the standalone `$integration-test-review` and `$integration-test-verify` skills for the heavier workflow gates — why: name-collision; modes are not the sibling skills
- **MANDATORY IMPORTANT MUST ATTENTION** ask the user directly — validate workflow/route decisions with the user. NEVER auto-decide complexity.
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
| "Skip task creation, it's obvious" | task tracking is non-negotiable. Tracking prevents context loss.                                        |
| "Split this TC so tests map 1:1"   | Preserve the selected profile's declared case-to-test cardinality; strict default allows one business TC to cover multiple tests. |
| "Example tests cover the rule"     | Use property/metamorphic tests when a rule must hold across a broad input domain; retain focused examples for concrete scenarios. |
| "Run `review` mode, it's the gate" | `review`/`verify` modes are inline passes; the workflow gates are the standalone `$integration-test-review` + `$integration-test-verify` skills. |

**IMPORTANT MUST ATTENTION** Apply the Easy-to-Change lens: every test/design choice must make the next change cheaper; reject coupling, hidden state, duplicated knowledge, and unclear intent.
**IMPORTANT MUST ATTENTION** Final guard: use production-like wiring at the tested integration boundary; assert system-owned outcomes; follow the selected case carrier and configured repeat/isolation policy; retain zero-GAP/UNKNOWN coverage for the declared scope.

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
