---
name: integration-test-review
version: 1.3.1
description: '[Code Quality] Use when reviewing integration tests for assertion quality, bug protection, and repeatability, and verifying changed code has spec-traceable coverage.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Ensure changed production behavior is covered by tests that protect real business behavior with correct data assertions, repeatability, and canonical-owner alignment — integration-first, with justified unit fallback — so the selected contract, tests, and code stay aligned.

## Case Contract Profile Gate (BLOCKING)

Before collecting cases or judging traceability, read `docs/project-config.json`, `docs/project-reference/docs-index-reference.md`, `docs/project-reference/lessons.md`, the required local spec/integration-test references, and this skill's matching references. Resolve one profile:

- **Strict TC default:** neither config nor required project references explicitly declares a different canonical case owner, identity, carrier, section role, or case-to-test relation. The Section 8 / `TC-{FEATURE}-{NNN}` rules below apply.
- **Native profile:** config or a required reference explicitly declares a different case contract. An absent optional profile field in config does not erase an explicit owner contract in a required reference. Use its canonical owner and case identities; do not create a TC/Section 8 shadow or duplicate coverage registry.
- **Unresolved:** invalid/incomplete config, conflicting references, or unresolved owner/identity/carrier/cardinality means `BLOCKED`/`UNKNOWN`; never infer the default or claim coverage.

A root/template/file-name change alone does not select a native case model. On a native profile, use the configured source-of-truth hierarchy and apply this crosswalk:

| Concern | Native-profile review rule |
| --- | --- |
| Canonical contract | Resolve the affected owner and business requirements/scenarios from config and required references. Generated indexes or technical projections are not a replacement owner. |
| Identity and cardinality | Key each row by owner + logical case + declared variant. Respect configured many-to-many relations; do not force 1:1 or collapse variants. |
| Gate 5 traceability | Follow the configured test carrier to the actual executor, then inspect the assertion. IDs/comments/links alone are not proof. |
| Gate 6 alignment | Compare the canonical owner, implementation, and test. Use configured owner precedence; never let green code/tests ratify behavior that conflicts with unresolved canonical intent. |
| Gate 7 coverage | Map every behavior-changing file and every case/variant in the full affected owner scope to actual executors/assertions. An aggregate executor proves only the listed cases whose paths/assertions were inspected; never invent per-variant reporter results. |
| Reports and results | Replace `TC`, Section 8, default annotations, and sample fields below with native IDs/carriers. Separate mapped, executed, and passed; only observed runner output proves execution, and `UNKNOWN` never passes. |

Keep every profile's semantic and authority gates: mutation-killing assertions, business-state checks, repeatability, required property/boundary and preservation coverage, conflict escalation, user-confirmation, and scoped fixes. The TC-shaped procedures and report examples later in this file are strict-default behavior only; matched overlays add constraints and cannot waive a shared gate.

**Summary:**
- **Testability contract:** resolve Unit/Integration/System/E2E applicability from runner/config evidence; record owner/root/data, copy-ready full + focused commands, zero-match behavior, CI/simple-Windows entry, identity or isolation guarantee, and repeat proof; unresolved applicable fields block handoff, while non-applicable tiers require evidence-backed `N/A`.

- **Purpose:** Review target is the CHANGE (collect BOTH changed production code AND changed test files), never just the test files — Gates 1-6 and 8 judge test quality, Gate 7 maps every behavior-changing production file to a covering test (integration-first; unit only with recorded justification) + the selected canonical case. Uncovered changed behavior = HIGH finding minimum.
- **The 8 Gates (main review steps):** G1 Assertion Value — mutation-score when available, otherwise an evidence-backed mutation probe; G2 Owned Outcome — assert the system-owned result at the selected boundary; G3 Repeatability — verify project-configured isolation/repeat behavior; G4 Behavior Ownership — compare assertions with the actual contract owner; G5 Spec Traceability — configured test carrier → canonical case (strict default only; native cardinality is preserved); G6 Three-Way Sync — canonical owner > implementation > test, with configured derived views at their declared authority; G7 Change Coverage — every behavior-changing file → covering test + applicable canonical case; G8 Scenario Fidelity — setup sequence, pacing, and data must fit the actual production path; use an ARRANGE barrier only for genuinely asynchronous outcomes.
- **The phase pipeline (run ALL, `TaskCreate` each):** P0 Scope-detect → P1 Collect (split prod vs test files) → P2 Gate Review (Gates 1-6 + 8 per file, Gate 7 across set) → P3 Spec Cross-Check (both directions) → P4 Initial Report → P5 Fix validated findings that block the current round + WRITE missing tests → P6 Validated-fix + full fresh re-review until the current severity bar is clear → P7 Build & run ALL tests → P8 Failure Investigation → P9 Why-Review self-validation.
- **Read the canonical owner and relevant production source BEFORE judging any assertion.** FAIL smoke-only, existence-only (not-null), dead (always-true), or copy-paste assertions when they do not prove the claimed contract. A dependency-container resolution test is valid only when wiring itself is the selected contract — why: assertion quality is unknowable without intended behavior and its owner.
- **Don't just report gaps — fix them.** Gate 6: NEVER fix a test to match broken code, NEVER self-resolve a three-way conflict (escalate via `AskUserQuestion`). Phase 5 WRITES a missing test and uses the canonical owner's declared authoring procedure for a validated SPEC-GAP; the strict default uses `/spec [mode=tests]`. A full fresh re-review runs after every validated fix cycle until the current round's bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred).
- **MANDATORY full affected-owner case audit (Phase 1 task + Phase 3 addendum):** Gate 7 alone is diff-scoped — it can miss an existing canonical case/variant that lost coverage outside the diff. Every review enumerates the full case set in the implicated owner scope, not only diff-touched cases, into the same Coverage Mapping Table; zero `GAP` or `UNKNOWN` rows are required before PASS. The strict default enumerates Section 8 TCs.

**Scope:** The FULL change set — changed production code AND changed test files — from uncommitted changes (default), user-specified files, or a user-specified diff (branch/PR). The review target is never "just the test files".

**Workflow:** Phase 0 Detect → Collect → Coverage Map (Gate 7) → 8-Gate Review → Spec Cross-Check → Report → validate findings → fix only validated findings that block the current round (including writing missing tests) → full re-review after fixes → Build & verify → If fail: investigate + fix plan. Round 1 blocks on every validated severity; Round 2 blocks only CRITICAL/HIGH/MEDIUM, LOW-only is deferred, and failed binary gates always block.

**Key Rules (non-negotiable):**

- MUST collect BOTH changed production code AND changed test files — coverage of the change is part of the review, not an optional extra
- MUST verify every behavior-changing production change maps to a test at the appropriate boundary — use integration coverage for cross-component behavior and unit/component coverage for isolated logic; justify a missing or unsuitable tier from project architecture (Gate 7)
- MUST treat an uncovered changed behavior as a HIGH finding minimum — fix by writing the missing test in Phase 5, not just reporting
- MUST verify canonical owner↔test↔code alignment for changed code, not only existing tests — a changed behavior with no applicable case in the selected contract is a spec-gap finding
- MUST trace the relevant entry point, contract owner, and source behavior BEFORE judging test assertions; read handler/service code when those are the project's actual boundary
- MUST flag smoke-only tests (no-exception-only checks) as FAIL
- MUST flag a dependency-resolution-only test as insufficient for a business-behavior claim; accept it when container/wiring behavior is itself the intended contract
- MUST verify test-data isolation for the project's supported repeat/concurrency model; generated IDs are required when tests share a namespace, not for every disposable fixture
- MUST use a bounded configured wait for genuinely asynchronous outcomes; synchronous persistence does not require polling
- MUST flag setup that bypasses the behavior or invariant under test; supported builders/factories/fixtures may arrange unrelated preconditions
- MUST treat an unrealistic setup as a review finding (Gate 8) — compressed pacing between actor steps, a fixed sleep standing in for a real observable, a widened assertion timeout replacing an ARRANGE barrier, or a retry wrapped around a failing assertion
- MUST require the repeat evidence declared by `integrationTestVerify.guidance`; absent guidance, repeat persistent/shared-state suites twice with no destructive reset of shared data
- NEVER accept assertions that always pass regardless of handler correctness
- **NO smoke/fake/useless tests** — every test MUST cross its claimed integration boundary and assert a meaningful system-owned outcome

- `integration-test-reference.md` in the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) — Integration test patterns, fixture setup, seeder conventions, lessons learned (MUST READ before reviewing)

---

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

When evaluating code, refactor, test, or abstraction, ask:
**does this make next change cheaper or more expensive?**

- Reject "best practices" raising change cost (premature abstraction,
  speculative generality, leaky indirection, ceremony without payoff).
- Name real enemies in findings: **coupling, hidden state, duplicated
  knowledge, unclear intent, irreversible decisions exposed too early**.
- Simpler design easy to change beats sophisticated design that isn't.

Apply this lens **before** invoking any specific rule, pattern, or checklist
below — if downstream rule would raise change cost, this principle wins.

---

## Phase 0: Scope Detection

Classify BEFORE any gate review. Route wrong → waste all effort.

| Signal                                       | Classification      | Action                                                                                                       |
| -------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------ |
| No user-specified files                      | Uncommitted changes | Run `git diff --name-only` (staged + unstaged) to collect scope — BOTH production code AND test files         |
| User specifies files/diff (branch, PR, etc.) | Explicit scope      | Use provided list/diff directly — still split into production vs test files                                   |
| 10+ test files                               | Large scope         | Parallel sub-agents grouped by module                                                                        |
| 1-9 test files                               | Normal scope        | Single review pass                                                                                           |
| 0 test files BUT production code changed     | Coverage-gap review | Gate 7 IS the review — map every changed behavior to existing tests; uncovered behavior = finding. Do NOT exit |
| 0 changes at all                             | Empty target        | Ask user for explicit scope via `AskUserQuestion`                                                            |

**The review target is the CHANGE, not the test files.** Changed test files are reviewed for quality (Gates 1-6 and 8); changed production files are checked for coverage and spec alignment (Gate 7). Both halves are mandatory.

**Search for test reference docs** — NEVER hardcode paths. Grep for `integration-test-reference`, `test-patterns`, `integration-test-guide` near changed test files to discover project-specific conventions before starting gate review.

## Test Architecture Contract Preflight (cross-cutting; before Gate 1)

This is a non-numbered preflight alongside the eight quality gates. Review the matrix and evidence before judging individual assertions, then carry its findings into the same report; it does not replace or renumber Gates 1–8.

| Tier | Applicability evidence | Owner / test root | Runner/framework | Full command | Focused/partial command | Zero-match behavior | Data and repeat evidence | Parallel isolation | Simple/Windows entry point |
| ---- | ---------------------- | ----------------- | ---------------- | ------------ | ------------------------ | ------------------- | ------------------------ | ------------------ | --------------------------- |
| Unit | `APPLICABLE` + `{file:line}` or `N/A — {evidence}` | `{owner}` / `{path}` | `{configured runner/framework}` | `{command}` | `{command or N/A + evidence}` | `{documented non-zero behavior}` | `{identity or isolation strategy}` | `{supported concurrency/isolation}` | `{entry point or N/A + evidence}` |
| Integration/System | `APPLICABLE` + `{file:line}` or `N/A — {evidence}` | `{owner}` / `{path}` | `{configured runner/framework}` | `{command}` | `{command or N/A + evidence}` | `{documented non-zero behavior}` | `{identity or isolation strategy}` | `{supported concurrency/isolation}` | `{entry point or N/A + evidence}` |
| E2E | `APPLICABLE` + `{file:line}` or `N/A — {evidence}` | `{owner}` / `{path}` | `{configured runner/framework}` | `{command}` | `{command or N/A + evidence}` | `{documented non-zero behavior}` | `{identity or isolation strategy}` | `{supported concurrency/isolation}` | `{entry point or N/A + evidence}` |

Review the contract as a cross-cutting concern alongside the existing gates:

1. **Command validity:** resolve full and focused/partial commands from project config, reference docs, or runner scripts; verify copy-ready syntax, scope, and exit status. A focused selection that matches zero tests must fail or use the runner's documented non-green behavior; never count a zero-match run as green. Missing or unverifiable command evidence is a finding.
2. **Data and repeatability:** verify the project's fixture/identity strategy, supported setup path, realistic valid state, and isolation/cleanup policy. Use distinct IDs when runs share a namespace; stable IDs are acceptable in isolated fixtures. Cleanup may remove only current-run resources the test owns; preserve shared/user data and follow the configured reset policy.
3. **Parallel isolation:** when the configured runner supports concurrency, verify tests/workers cannot corrupt one another's mutable state; inspect shared roots and cross-cutting consumers when relevant. Record sequential-only execution when that is the project's supported mode.
4. **Applicability:** mark a tier `APPLICABLE` only with runner/framework/configuration evidence. Otherwise record `N/A — <evidence>` and do not request fabricated tests or commands. A project E2E N/A is valid when the configured stack is absent.

Missing applicable matrix fields, invalid command behavior, unclear data isolation, or unsafe supported concurrency are cross-cutting findings and must be reflected in the report without weakening the no-smoke, assertion-value, spec/code/test triangulation, or configured repeatability gates.

---

## The 8 Quality Gates

> Gates 1-6 and Gate 8 apply per changed/target TEST file. Gate 7 applies to the CHANGE SET — every behavior-changing production file must map to a covering test and a spec TC.

### Gate 1: Assertion Value — "Would this catch the bug?" (MUTATION-SCORE gate)

> **Think:** If a single line of the handler's core logic were changed (a `>` flipped to `>=`, a field assignment removed, a boolean negated), would at least one assertion FAIL? If NONE → FAIL. This is the mutation-testing question, made automatic.

**#1 AI failure:** hallucination assertions — look real, verify nothing.

**Operationalized — run the project's mutation tool (PRIMARY).** "Would this catch the bug?" is exactly the mutation-score question. Mechanize it instead of eyeballing it:

1. **Discover the configured mutation tool** from `docs/project-config.json`, dependency manifests, and CI config. Common per stack: **Stryker** (JS/TS, .NET — StrykerNet), **PITest** (Java/JVM), **mutmut** or **cosmic-ray** (Python). Cite the local config or command if one exists.
2. **Run it scoped to the CHANGED handler/service** (mutate only the production files in the review target — never the whole repo) against the covering tests from Gate 7.
3. **Read the surviving-mutant report.** Each **surviving mutant = a missing invariant = an assertion gap** → a **HIGH finding minimum** (CRITICAL when the mutated line touches authorization, money, or data integrity).
4. **Fix in Phase 5 by WRITING the killing test** — the assertion or property that fails on that mutant. Re-run until the changed code's mutants are killed (or each survivor has a recorded justification, e.g. equivalent mutant). Raising the line-coverage number is NOT a fix — coverage that executes a line without asserting its effect leaves the mutant alive.

**Manual fallback (when NO mutation tool is configured or addable).** Apply the single-mutation thought experiment by hand: read the handler source, then for each core-logic line ask "if I deleted or inverted this, which assertion fails?" If the answer is NONE for any business-critical line → FAIL. Prefer recommending the stack-appropriate mutation tool as a harness add so the gate becomes automatic next time.

**PASS:** Every changed core-logic line is killed by ≥1 assertion — no surviving mutant on the changed code (mutation tool), or the manual single-mutation check finds a failing assertion for each (fallback) — **AND the Mutation Probe Ledger (below) is recorded in the report** with a KILLED/SURVIVOR verdict per changed core-logic line. No ledger → no PASS, regardless of how clean the eyeball check felt.

**FAIL:**

- A surviving mutant on a changed core-logic line with no killing test (or no recorded equivalent-mutant justification)
- No-exception as ONLY assertion
- Not-null without content check
- Assertions on fields handler doesn't modify
- Dead assertions: `x >= 0` where x always >= 0, `count >= 0`, string not-empty on required fields

**Verify:** Run the mutation tool on the changed handler → list surviving mutants → each survivor is a missing assertion to write. When no tool is available: read handler source → list fields/branches it changes → check at least one assertion would fail if each were mutated.

**Recorded artifact — Mutation Probe Ledger (REQUIRED, non-skippable, BOTH paths).** "I checked it mentally" is not evidence. Gate 1 cannot be marked PASS without this ledger written into the review report — it is the proof the probe ran, identical in obligation whether a tool ran or the manual fallback did:

| Changed core-logic line (`file:line`, abstract) | Mutation applied (`>`→`>=`, assignment dropped, boolean negated, branch removed) | Killing assertion / test (owner + case + variant identity when applicable; strict default: TC ID; + `file:line`) | Verdict |
| --- | --- | --- | --- |
| {the line} | {the mutant} | {the assertion that fails on it} | KILLED |
| {the line} | {the mutant} | — none — | **SURVIVOR → finding** (or recorded equivalent-mutant justification) |

Rules: (1) every changed core-logic line gets a row — no sampling, no "representative subset". (2) Tool path: rows come from the surviving-mutant report; manual fallback: rows come from the line-by-line thought experiment — same table, same columns. (3) A `SURVIVOR` row with no killing assertion is a HIGH finding minimum (CRITICAL on auth/money/data-integrity lines) UNLESS it carries a written equivalent-mutant justification. (4) An empty or absent ledger = Gate 1 **FAIL** (not "skipped") — the gate is unproven, so it cannot pass.

### Gate 2: Owned Outcome — "Does it assert what the system owns?"

> **Think:** Does this test prove the behavior the system owns, or just that the call completed?

**PASS:** The test asserts a meaningful observable outcome at the selected contract boundary. Assert persisted fields when persistence is part of the behavior; otherwise assert the relevant API, file, emitted domain outcome, UI state, or other project-owned result.

**FAIL:**

- Only checks that a call does not throw or that an object exists, without asserting the promised outcome
- Checks an intermediate infrastructure record instead of the system-owned result
- Reads an eventually consistent outcome before the configured completion signal, or retries a failing final assertion rather than synchronizing setup

**Exception:** Smoke-only ONLY when side effect truly unobservable. MUST include explicit justification comment.

Use the configured bounded polling/wait helper only when the production contract is asynchronous or eventually consistent. For synchronous behavior, assert through the project's normal deterministic read path.

### Gate 3: Repeatability — "Does this survive supported reruns and concurrency?"

> **Think:** If this test runs N times in a shared database, does it get noisier each run? Would run #2 fail?

**FAIL:** Mutable shared data leaks across tests/runs, broad cleanup deletes another test's data, order dependence, or fixture setup bypasses an invariant that the test claims to exercise. Use generated IDs/business keys only when the configured store/namespace is shared; stable IDs are fine in an isolated disposable fixture.

Project-authorized cleanup may remove resources created and owned by the current test/run. Follow the project's transaction, disposable-database, namespace, or teardown model; never delete another run's or user's data.

**FAIL (not safe under configured concurrency — see `SYNC:test-data-isolation`):** An assertion depends on mutable shared state another test or cross-cutting consumer can change. Verify relevant writers/consumers and isolate the smallest state owner required by the configured concurrency.

**Verify:** Read `integrationTestVerify.guidance` and report the repeat/reset/concurrency evidence it requires. When no repeat policy is declared, use two fresh runs for persistent/shared-state suites without destructive reset of shared data.

### Gate 4: Behavior Ownership — "Does the test match the actual contract?"

> **Think:** Did I trace the actual entry point and invariant owner? Do the assertions match the resulting behavior and its observable boundary?

**PASS:** Assertions match the contract owner and effects confirmed from relevant source. Covers the primary business rule and applicable validation/access paths.

**FAIL:** Assertions on unrelated state, a missing primary outcome, or a downstream handler/event/message test that never reaches its trigger.

**Verify:** Trace the project's real call path and state/side-effect owner; compare those behaviors with the assertions.

**Also check:**

- Authorization: test verifies both authorized AND unauthorized access paths?
- Coverage: add scenarios for distinct, applicable risks/invariants; do not require an arbitrary count per command or endpoint

### Gate 5: Spec Traceability — "Is this tracked?"

> **Think:** Can I trace the selected profile's owner-qualified case identity from the configured test carrier → canonical owner → inspected assertion in one unbroken chain?

**PASS:** A business test's configured carrier links to a case in its canonical owner, and source inspection confirms the test reaches an assertion for that case. Under the strict default, the carrier is `TestSpec` and the identity is a TC. A native profile may use another carrier and declared many-to-many relation; preserve owner/scenario/variant identities and never infer per-variant test results. A technical-only test follows the selected profile's explicit non-business convention and does not claim business-case coverage.

**FAIL (WARN, not BLOCK):** Missing/mismatched configured carrier, orphaned case identity, a non-business test claiming business-case coverage, or the canonical owner marks the case planned/unverified while the review claims execution. **NOT a finding:** a method name differing from the case identity, or any cardinality explicitly allowed by the selected profile when each relation is backed by an inspected assertion.

### Gate 6: Three-Way Sync — "Do test, code, and docs agree?"

> **Think:** Have I read ALL 3 sources? Where exactly do they disagree? Does evidence support a verdict, or must I escalate?

Hardest gate. Identify discrepancy, classify using source-of-truth hierarchy — NEVER silently pick winner. Always state the resolved source with `file:line` evidence — why: a winner picked without evidence hides bugs.

#### Source of Truth Hierarchy (highest → lowest)

| Priority | Source | Why |
| --- | --- | --- |
| 1 (Highest) | Canonical business owner selected by config and required project references | Defines the accepted business behavior and case identities |
| 2 | Any configured derivative test-spec/index view, if one exists | Supports navigation or verification only at its declared authority |
| 3 | Implementation code (handler/entity/service) | What WAS built — may expose a defect or an intentional update missing from the owner |
| 4 (Lowest) | Integration test code | What IS being tested — must be traced to an inspected assertion |

For the strict default, the canonical feature spec's Section 8 TCs and its configured test-spec docs fill priorities 1–2. A native profile supplies its own owner and declared projections; do not assume a second test-spec plane.

**Rule:** The selected canonical owner governs intended behavior; compare implementation and tests against it. Apply only derivative-view authority declared by the profile; the strict default gives feature specs precedence over test-spec docs. Never resolve an owner conflict from implementation/test agreement alone.

#### Conflict Classification

| Pattern | Canonical owner | Implementation | Test code | Verdict | Action |
| --- | --- | --- | --- | --- | --- |
| All agree | ✓ | ✓ | ✓ | PASS | None |
| Owner missing or intent unresolved | — / ambiguous | ✓ / ? | ✓ / ? | SPEC-GAP / BLOCKED | Resolve the declared owner and intent; do not create a parallel case registry or claim coverage. |
| Possible stale owner | ? / older contract | ✓ | ✓ | AMBIGUOUS until supersession is evidenced | Verify an authorized owner update; code/test agreement alone does not prove intent changed. |
| Wrong test | ✓ | ✓ | ✗ | Test wrong | Fix test assertions to match the owner and code. |
| Code bug | ✓ | ✗ | ✓ | Code has bug | Report as BUG — do NOT fix test to match code. |
| Test + code diverge from owner | ✓ | ✗ | ✗ | Code bug + wrong test | Fix the test to match the owner; report the code bug. |
| Owner, code, and test conflict | ✗ | ✗ | ✗ | ESCALATE | Cannot self-resolve — ask the user. |

**CRITICAL rules:**

- NEVER fix a test to match broken code — that hides bugs
- NEVER assume docs are wrong without evidence they were intentionally superseded
- NEVER self-resolve a three-way conflict — always escalate via `AskUserQuestion`
- `SPEC-STALE` requires explicit evidence that the owner contract was intentionally superseded; code/test agreement alone is insufficient.
- When escalating, include the owner-qualified case identity (strict default: TC ID), what each source says, and evidence found.

#### Verify Each Source

1. **Canonical owner:** Read the profile-selected case — identity/variant, preconditions, behavior, and expected result. Strict default: Section 8.
2. **Configured derivative view:** Inspect only if the profile declares one; compare it with its stated authority. Strict default: locate the corresponding TC in any test-spec doc.
3. **Implementation code:** Read handler/entity/service — fields written, events fired, validation rules
4. **Test code:** Read test method — arrange, execute, assert

Compare each pair with `file:line` evidence for each source.

**PASS:** All three agree. **WARN:** Minor wording, same semantic. **FAIL:** Semantic disagreement on field/rule/outcome. **ESCALATE:** All three differ and evidence cannot resolve.

### Gate 7: Change Coverage — "Is every changed behavior tested AND specced?"

> **Think:** For each behavior-changing production file in the review target, which test would FAIL if this change were broken? If NONE → coverage gap. Which canonical owner case describes this behavior? If NONE → spec gap.

This gate makes the skill verify the REVIEW TARGET has coverage — not merely review tests that happen to exist.

> **Scope note:** the first pass is diff-scoped (changed behavior → canonical case). It does NOT by itself prove complete affected-owner coverage — an existing case/variant that lost its covering test may sit outside the diff. **Phase 3 addendum — Full Affected-Owner Case Audit** (below) closes that gap: inspect every case/variant in the implicated owner scope, not only diff-touched cases; both passes feed the SAME Coverage Mapping Table and zero-GAP/UNKNOWN exit bar. Strict default enumerates all Section 8 TCs.

**Protocol:**

1. **Collect changed production files** from the review target (Phase 0 scope): commands, queries, handlers, entities, services, event handlers, consumers, controllers, frontend services/stores with business logic.
2. **Filter to behavior-changing files.** Exclude: migrations (one-time execution paths), generated code, pure renames/formatting, config-only, DI registration-only changes. Record each exclusion with reason.
3. **Find covering tests** per changed behavior — use graph (`query tests_for <fn>`, `trace <file> --direction both`) plus grep for the handler/class name under test directories. A test COVERS a change only if it exercises the changed path and asserts the changed outcome — read the test; name match alone is NOT coverage.
4. **Choose the test type by boundary:** use integration/system coverage for behavior crossing real component or service boundaries; use unit/component coverage for isolated logic and local contracts. Record why a different tier would not prove the behavior when the expected tier is unavailable or unsuitable.
5. **Check owner alignment for the change — existence AND correctness.** Each changed behavior must map to an applicable case in the selected canonical owner. Finding an ID is NOT enough: read the case and confirm it describes current intent. New behavior with no case, or a case that describes old/superseded behavior → spec gap. A behavior is fully covered only when a test exercises it and the canonical case describes current intent. Strict default uses feature-doc Section 8 / test-spec docs.

**Coverage Mapping Table (MANDATORY output):**

> Rows are keyed by **changed production behavior**, not by test count. A behavior is COVERED only when ≥1 inspected executor asserts its outcome and the mapped canonical case is current. Preserve the selected profile's relation; native cases may be many-to-many. List actual executors and key rows by owner + case + declared variant. Never force 1:1, collapse declared variants, or invent per-variant runner outcomes.

| Changed File / Behavior | Owner / Case / Variant (strict default: Spec TC) | Covering Test(s) / Assertion | Test Type | Verdict |
| --- | --- | --- | --- | --- |
| {file:line — behavior} | {owner}:{case}:{variant} / MISSING | {test file:method + assertion}[, …] / NONE | integration / unit (justified) / — | COVERED / COVERED-UNIT / GAP / SPEC-GAP / UNKNOWN |

**Verdicts:**

- **COVERED** — integration test exercises the changed path with data-state assertions AND the mapped canonical case describes current behavior. A stale/mismatched case is NOT covered — record `SPEC-GAP`.
- **COVERED-UNIT** — unit test covers it, integration infeasible, justification recorded, and the mapped canonical case is current (the same stale-case rule applies).
- **GAP (FAIL)** — no test would fail if the change broke. Severity: HIGH minimum; CRITICAL when the change touches authorization, money, or data integrity. Fix in Phase 5 by WRITING the missing test (integration-first) — reporting alone does not clear this gate
- **SPEC-GAP (FAIL)** — behavior has no applicable canonical case, OR a covering test exists but its mapped case still describes old/superseded intent. Use the canonical owner's authoring procedure; the strict default uses `/spec [mode=tests]` UPDATE.
- **UNKNOWN** — the profile, owner, carrier, case identity, cardinality, or assertion cannot be resolved from evidence. UNKNOWN never passes and must not be downgraded to a warning to clear the gate.

**FAIL:**

- Changed handler/command/entity rule with zero covering test
- Unit test substituted where an integration test is feasible, with no justification
- Test exists but does not assert the changed outcome (stale coverage counted as coverage)
- New/changed behavior absent from the selected canonical owner, or a case describing superseded behavior
- A COVERED row marked COVERED without reading its mapped canonical case and assertion — identity existence is not proof of current intent or execution

**Explicit user waiver** (recorded verbatim in the report with the user's reason) is the ONLY alternative to closing a GAP.

### Gate 8: Scenario Fidelity — "Could production ever reach this setup?"

> **Think:** Read the ARRANGE block as a production trace. Could this exact sequence, timing, and data actually occur in the running system? If no, the test is mis-specified — the finding lands on the SCENARIO, never on the assertion.

An unrealistic setup proves nothing when it passes and burns hours when it fails. Judge fidelity BEFORE judging assertion strength — a strong assertion over an impossible scenario is still a defective test. Applies per changed/target TEST file, alongside Gates 1-6.

**Finding triggers — mechanically checkable; each fires as a finding with severity + `file:line` evidence:**

| Trigger (what to look for in the test)                                                                                                                                     | Severity                                                                       | Fix direction                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Chained actor actions with no settle barrier** — two or more distinct actor actions issued back-to-back that production separates by seconds, minutes, or hours          | HIGH (CRITICAL when an in-flight async message can land between them and clobber state) | Add an ARRANGE barrier that polls a real observable proving the prior action finished                                                     |
| **Fixed sleep standing in for a real observable** — a hardcoded delay where a persisted state change, version/audit stamp, queue/worker idle marker, or completion event exists | MEDIUM (HIGH when the delay is what keeps a race from firing)                  | Replace with poll-until-settled on that observable; a fixed delay is acceptable ONLY when no observable exists AND a comment says so       |
| **Widened assertion timeout instead of an added precondition** — the ASSERT-side wait grew, or a retry/poll wrapper appeared there, rather than an ARRANGE barrier being added | HIGH                                                                           | Move the wait into ARRANGE and restore the original assertion window                                                                      |
| **Unreachable setup state with no explanation** — ARRANGE constructs a state and nothing records how production could reach it                                             | MEDIUM (HIGH when the asserted outcome depends on that state)                  | Reach the state through real use-case paths, or label it a deliberate impossible-state test with the reason it is reachable               |
| **Retry wrapped around a failing assertion** — a retry/loop added around the ACT+ASSERT pair after a red run                                                               | CRITICAL                                                                       | Revert the retry; adjudicate the intermittency (`/integration-test-verify`) before any change                                             |
| **Fidelity improvement that weakened the protected invariant** — the scenario became realistic and the assertion became looser in the same change                          | HIGH                                                                           | Keep the assertion; find a DIFFERENT realistic scenario that still exercises the rule                                                     |

**PASS:** Every actor step in ARRANGE could occur in production in that order and at that pacing; every wait is an ARRANGE-phase barrier on a real observable (or a commented fixed delay where no observable exists); any deliberately impossible state carries a comment naming WHY production could reach it (upstream bug, partial write, legacy data).

**FAIL:** Any trigger row fires with no recorded justification.

**Verify:** Read the test end-to-end as a production trace — per actor step ask "what separates this from the previous step in real life, and what does the test wait on?" Then grep the test file (and, when reviewing a change, its diff) for sleep/delay calls, retry/poll wrappers, and enlarged timeout arguments; every hit is a candidate row above. A trigger that fires in the DIFF (a wait that grew, a retry that appeared) outranks one that merely pre-existed — it is evidence of masking in progress.

---

## Review Protocol (9 Phases)

Use `TaskCreate` for EACH phase before starting.

**Phase 1 — Collect:** Split the change set: production files (Gate 7 coverage targets) vs test files. Categorize test files: new (full review), modified (changed methods only), new projects (infra + samples). Categorize production files: behavior-changing vs excluded (with reason).

> **MANDATORY task — "Validate full affected-owner case coverage."** Create as its own named `TaskCreate` item in Phase 1. Non-skippable whenever this review runs inside a workflow, current git changes are present, or the user requests review; the only exception is a user-narrowed single-case/test review. Resolve every canonical owner implicated by the change set and inspect its full affected case/variant set, independent of which cases the diff touches. The strict default enumerates all Section 8 TCs. A native profile uses its configured owner and case identities. Record owner + case + variant, actual executor, inspected assertion, and status in the same Coverage Mapping Table.

**Phase 2 — Gate Review:** Per test file, apply Gates 1-6 and Gate 8. Apply Gate 7 once across the change set and produce the Coverage Mapping Table. Record per-file verdict table:

| Gate                              | Verdict                 | Evidence    |
| --------------------------------- | ----------------------- | ----------- |
| 1. Assertion Value                | PASS/FAIL               | {file:line} |
| 2. Data State                     | PASS/FAIL               | {file:line} |
| 3. Repeatability                  | PASS/FAIL               | {file:line} |
| 4. Domain Logic                   | PASS/FAIL               | {file:line} |
| 5. Traceability                   | PASS/WARN               | {file:line} |
| 6. Three-Way Sync                 | PASS/WARN/FAIL/ESCALATE | {file:line} |
| 7. Change Coverage (per change set) | COVERED/COVERED-UNIT/GAP/SPEC-GAP/UNKNOWN | {coverage mapping table} |
| 8. Scenario Fidelity              | PASS/FAIL               | {file:line} |

**Phase 3 — Spec Cross-Check + Three-Way Diff:** Two directions — from tests AND from changed code.

For each case identity in code using the selected profile's traceability carrier (strict default: TC ID):

1. Verify the canonical owner contains that case identity and inspect any profile-declared derivative test-spec view. Strict default: find the TC in feature Section 8 and test-spec docs under the configured business root.
2. Read what the canonical case and any derivative view describe
3. Read what implementation code actually does
4. Read what test asserts
5. Classify conflict pattern (Gate 6 table) and record action
6. Flag gaps both directions: case identity in code but absent from the canonical owner, or an implemented owner case without an actual executor/assertion

For each behavior-changing production file in the review target (reverse direction — spec-driven development check):

7. Verify a canonical case exists for each changed behavior AND read it to confirm current intent — even when a covering test was already found. A stale case is `SPEC-GAP`; a test never excuses re-checking its owner's correctness.
8. New behavior with no canonical case → `SPEC-GAP` (Gate 7); route correction through the selected owner's authoring procedure. The strict default uses `/spec [mode=tests]` and `/spec` when business rules changed.

**Phase 3 addendum — Full Affected-Owner Case Audit (MANDATORY; satisfies the Phase 1 coverage task).** Steps 1-8 above map changed production files → cases. This addendum case-scoped instead and includes existing cases the diff never touched:

9. Enumerate every case and declared variant in each affected canonical owner; strict default: every Section 8 TC.
10. For each case/variant not resolved by steps 1-8, find the actual covering executor and assertion (graph query/grep plus source read; name match alone is NOT coverage) and confirm the owner describes current intent.
11. Classify it using the Gate 7 verdicts and append it to the SAME Coverage Mapping Table, keyed by owner + case + variant. Respect configured many-to-many mappings; an aggregate may cover several listed cases, while several test variants may cover one scenario.
12. A `GAP` found here carries the same Phase 5 missing-test obligation as a diff-touched gap — not a lesser finding because the diff missed it. Severity: HIGH minimum per Gate 7.
13. Zero `GAP` or `UNKNOWN` rows across the WHOLE unified table are required before Gate 7 / the Phase 1 task can pass. Never manufacture individual test outcomes for cases mapped to one aggregate executor.

**Phase 4 — Initial Report:** Write to `tmp/reports/integration-test-review-{date}-{slug}.md`

**Phase 5 — Fix validated findings that block the current round (MANDATORY — fix ONLY findings already validated per the embedded `double-round-trip-review` validate-before-fix contract):** Round 1 fixes every validated finding, including LOW. From round 2 onward, fix validated CRITICAL/HIGH/MEDIUM findings; a LOW-only result is recorded under `## Deferred LOW Findings (severity floor, round ≥2)` and does not start another fix/review cycle. MEDIUM cannot be silently converted to tech debt to clear the bar: if it cannot be fixed in scope, escalate with the residual-risk and owner decision explicitly recorded. Failed binary gates remain blocking at every round.

1. Prioritize: CRITICAL → HIGH → MEDIUM → LOW (LOW is actionable in round 1; record/defer it from round 2 onward)
2. Per fix: read handler source, understand domain logic, write/fix assertion
3. **Gate 7 GAP fixes:** WRITE the missing test — integration test first (route through `/integration-test` patterns); unit test only with recorded justification. SPEC-GAP fixes: update the selected canonical owner through its declared procedure; the strict default uses `/spec [mode=tests]` UPDATE before or alongside the test.
4. **Gate 8 fidelity fixes:** repair the SCENARIO, never the assertion — add the ARRANGE-phase settle barrier on a real observable, restore any widened assertion timeout to its original window, remove any retry wrapped around a failing assertion, and comment a deliberate impossible-state setup with why production could reach it
5. NEVER weaken assertions to make tests pass — fix root cause (timing, data, setup) instead
6. Re-read changed files to verify fix correctness
7. Record each fix with `file:line` under `## Fixes Applied`

**Phase 6 — Validated Fix + Full Re-Review (MANDATORY when fixes are applied):**

Do not spawn a fresh reviewer to re-review the same findings before validation/fix. After Phase 5 applies validated fixes, run a full fresh review over the current test scope. When that review uses sub-agents, spawn fresh `integration-tester` sub-agents (parallel by module for 10+ files; single agent otherwise) using canonical Agent template from `SYNC:review-protocol-injection`. Each sub-agent re-reads ALL target test files from scratch with ZERO memory of Phase 2/5. When constructing Agent call prompt:

1. Copy Agent call shape from `SYNC:review-protocol-injection` template verbatim
2. Set `subagent_type: "integration-tester"`
3. Embed full verbatim body of 9 SYNC blocks (all present inline in this skill file): `SYNC:evidence-based-reasoning`, `SYNC:bug-detection`, `SYNC:design-patterns-quality`, `SYNC:logic-and-intention-review`, `SYNC:test-spec-verification`, `SYNC:fix-layer-accountability`, `SYNC:rationalization-prevention`, `SYNC:graph-assisted-investigation`, `SYNC:understand-code-first`
4. Task field: `"Resolve the selected case profile, then run a full fresh integration-test review pass over {file-list} after validated fixes. Review all 8 quality gates: assertion value, owned outcome, repeatability, behavior ownership, traceability, three-way sync, change coverage, scenario fidelity. Read the canonical owner and relevant production source BEFORE judging assertions. Flag smoke-only, existence-only, dead assertions, and setup that bypasses the behavior under test. Gate 3 uses the project's configured repeat/concurrency policy and isolates shared mutable state. Gate 7: map every behavior-changing file in {changed-production-file-list} and every case/variant in the full affected owner scope to the actual executor and inspected assertion, using the test tier appropriate to the project architecture; strict default uses Section 8 TCs. Preserve configured cardinality, including declared many-to-many mappings; never invent per-variant runner results. Uncovered behavior is a HIGH finding minimum; missing/stale cases are SPEC-GAP; unresolved evidence is UNKNOWN, never PASS. Gate 8: flag unreachable setup, unsupported pacing, blind sleeps, widened assertion timeouts, and retries around failing assertions. Source-of-truth follows the configured canonical owner and declared projections; classify disagreements and escalate unresolved intent."`
5. Target Files: explicit file list (never pass inline contents)
6. Reference Docs: include `integration-test-reference.md` from the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path)
7. Report path: `tmp/reports/integration-test-review-rerun{N}-{date}.md`

After sub-agents return:

1. **Read** each sub-agent's report
2. **Integrate** findings as `## Re-Review {N} Findings` — DO NOT filter or override
3. **If new CRITICAL/HIGH:** validate the new finding set before any additional fixes
4. **Repeat only after another fix cycle:** restart the full review again after validated fixes are applied; if the same blocker repeats across 2 full invocations with no progress, escalate via `AskUserQuestion`
5. **Exit criteria:** Apply `blocking_findings(round, findings)` from `SYNC:double-round-trip-review`: round 1 requires zero validated findings at any severity; round 2 requires zero validated CRITICAL/HIGH/MEDIUM findings, with LOW findings listed as deferred. Failed binary gates remain blocking regardless of round.

**Phase 7 — Build & Run Tests (MANDATORY):** Build and run ALL changed/reviewed test files.

1. Build test project
2. Run changed tests (filter by reviewed test classes)
3. NEVER mark review complete until all tests pass — unverified reviews have zero value
4. Record results under `## Test Execution Results`

**Phase 8 — Failure Investigation (if Phase 7 fails):** Investigate systematically (classify → root-cause → fix plan), never just retry.

1. **Classify failure:** Test bug (assertion/setup wrong) vs Service bug (handler broken) vs Environment (service not running, DB timeout)
2. **Root cause:** Read failing output, trace handler source, identify exact mismatch
3. **Fix plan per failure:** failing test (`file:line`, owner-qualified case identity when applicable), error summary, root cause + confidence %, proposed fix
4. **Apply and rerun** — loop until pass or environment blockers identified
5. **Environment blockers:** Document as `BLOCKED — requires running system`; do NOT mark as test failures
6. Append under `## Failure Investigation`

**10+ files:** Parallel sub-agents grouped by module. Each gets file list + 8 gates + handler paths + canonical owner paths + the changed-production-file list for its module (Gate 7). Consolidate into single report — the orchestrator merges per-module coverage tables into ONE Coverage Mapping Table covering the whole change set.

---

## Common Anti-Patterns

| Anti-Pattern                                                         | Why It's Bad                                         |
| -------------------------------------------------------------------- | ---------------------------------------------------- |
| **Smoke-only** (no-exception alone)                                  | Proves no crash, not correctness                     |
| **Existence-only** (not-null)                                        | Proves data exists, not handler set it correctly     |
| **Dead assertion** (`count >= 0`, always true)                       | Tests nothing                                        |
| **Framework testing** (assert auto-set fields)                       | Tests framework, not handler                         |
| **Copy-paste assertions** (wrong entity fields)                      | Assertions don't match handler                       |
| **Hardcoded ID** (`Id = "test-001"`)                                 | Fails on second run                                  |
| **Broad/destructive cleanup dependency** (deletes persistent/shared/other-run data, or a pass depends on cleanup) | Can erase another test's state, hide contamination, or replace no-reset proof |
| **Order dependency** (test B needs A first)                          | Parallel execution breaks                            |
| **Shared mutable entity** (assertions on data another test can change) | Not parallel-safe — another test corrupts the shared state; own fresh per-test data |
| **Cross-cutting consumer blind spot** (shared parent wiped by bulk re-sync/recompute/rebuild/cascade) | A consumer empties your data without this test touching the parent — sharing is unsafe even without direct mutation |
| **Repository data hacks** (direct create/update bypassing use cases) | Leaves impossible state and hides real workflow bugs |
| **Compressed actor pacing** (distinct actor actions fired microseconds apart that production separates by minutes) | Manufactures a race the system was never designed to survive — reported as a product defect when it is a test-fidelity defect |
| **Blind sleep instead of a settle barrier** (fixed delay where an observable exists) | Passes or fails by luck; hides the real completion signal the test should wait on |
| **Widened assertion timeout as the fix** (ASSERT-side wait grown instead of an ARRANGE precondition added) | Masks the fidelity defect and stretches every future run — the barrier belongs in ARRANGE |
| **Missing await** (unchecked async exception)                        | Exception swallowed silently                         |
| **Event not triggered** (query, never fire)                          | Tests seeder, not handler                            |
| **Test fixed to match broken code**                                  | Hides the bug — docs still say it's wrong            |
| **Self-resolved three-way conflict**                                 | AI picked winner without evidence — silent lie       |
| **Stale docs assumed without two-source proof**                      | Docs may be right; code may be the bug               |
| **Test-files-only scope** (production changes ignored)               | Reviews tests that exist, misses behavior with none  |
| **Name-match counted as coverage** (test never reads changed path)   | Stale coverage — test passes while change is broken  |
| **Unjustified unit-test substitution**                               | Skips DI/data-state verification integration gives   |
| **Unowned behavior change** (no canonical case for new/changed behavior) | Breaks spec-driven development — behavior drifts silently |
| **Stale case counted as covered** (covering test found, owner case never re-read) | Canonical owner documents old behavior — coverage path passes a spec gap silently; downgrade to SPEC-GAP |
| **Surviving mutant left unkilled** (Gate 1 mutation tool not run, or survivor ignored) | A changed line whose mutation no assertion catches = a fakeable, over-fitted test that protects no invariant |
| **1:1 case↔test demanded** (or profile-declared many-to-many mapping flagged as duplicate) | Forces splitting/technicalizing business cases and erases declared variants. Follow profile cardinality and prove each mapped case through its actual executor/assertion. |

---

## Workflow Recommendation

> **MANDATORY — NO EXCEPTIONS:** If NOT already in a workflow, MUST use `AskUserQuestion` to ask user:
>
> 1. **Activate `workflow-write-integration-test` workflow** (Recommended) — investigate → spec [mode=tests] → artifact-review --type=spec-tests → integration-test → integration-test-review → integration-test-verify → spec [mode=sync] → docs-update → workflow-end → watzup
> 2. **Execute `/integration-test-review` directly** — run standalone

---

## Phase 9: Why-Review Self-Validation Gate (MANDATORY when findings exist)

> **Purpose:** Adversarial validation of own findings BEFORE handoff. Catches over-flagged Highs, false positives, and severity inflation at the source rather than letting them propagate downstream.

**Trigger:** Any finding produced (Critical, High, Medium, OR Low). Skip ONLY when the report's verdict is unconditional PASS with literally zero findings.

**Protocol:**

1. Read own finalized report from `tmp/reports/{skill}-{date}-{slug}.md`
2. Invoke `/why-review` skill with arg: `validate findings in tmp/reports/{skill}-{date}-{slug}.md — verify each finding has file:line proof, steel-man each rejected interpretation, and stress-test severity classifications`
3. Read the validation verdict path returned by why-review, expected as `tmp/reports/why-review-validate-{date}.md`
4. **If why-review demotes/removes any finding:** UPDATE own finalized report with revised severities, remove false positives, and add a `## Why-Review Validation Notes` section citing what changed and why
5. **If why-review confirms all findings:** Append `## Why-Review Validation` line to own report stating "All N findings re-validated against actual code; no severity changes."

**Skip conditions (record explicit reason if skipping):**

- Verdict is unconditional PASS with zero findings → log "Skipped — no findings to validate"
- Why-review skill itself is the active context (avoid recursion)

**Why this exists:** AI sub-agent reports inherit confirmation bias — the orchestrator absorbs severity claims as ground truth. The 2026-05-09 review incident produced 5 Highs; adversarial validation demoted 3 of them. Codify this as standard practice.

---

## Next Steps

**MANDATORY — NO EXCEPTIONS** after completing, MUST use `AskUserQuestion`:

- **"/integration-test-verify (Recommended)"** — Run integration tests to verify all pass
- **"/workflow-review-changes"** — Review all changes before committing
- **"Skip, continue manually"** — user decides

---

## Related Skills

| Skill                      | Relationship                                                           | When to Call                                                                   |
| -------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `/integration-test`        | **Producer** — generates tests this skill reviews                      | Always preceded by /integration-test                                           |
| `/integration-test-verify` | **Successor** — runs tests after review clears                         | Call after review passes all 8 gates                                           |
| `/spec [mode=tests]`                | **Case producer** — reads/updates the selected canonical owner; strict default uses Section 8 TCs | If Gate 5 finds an orphan or stale case → use the selected profile's `/spec [mode=tests]` update path |
| `/spec-index`              | **Derived view** — refreshes a declared navigation/index projection; it never replaces the canonical owner | Refresh only when the selected profile declares the view and its inputs changed |
| `/spec`            | **Canonical owner procedure** — Gate 6 compares implementation/tests with the profile-selected owner | If Gate 6 finds conflict, use its declared authority and escalation rules |
| `/docs-update`             | **Documentation sync** — updates only the configured affected doc owners | Call for confirmed downstream documentation changes; preserve the canonical owner's authoring procedure |

## Standalone Chain

> When called outside a workflow, follow this chain after running integration-test-review.

```
integration-test-review (you are here)
  │
  ├─ SCOPE: the full change set — changed production code AND changed test files
  │    Tests may NOT exist yet for changed code — that is a Gate 7 finding, not an exit condition
  │
  ├─ Gate 1-5 findings → fix tests (re-run integration-test if test code needs regeneration)
  │
  ├─ Gate 8 (Scenario Fidelity) findings → repair the SCENARIO, never the assertion:
  │    → Add the ARRANGE-phase settle barrier on a real observable between chained actor actions
  │    → Restore any widened assertion timeout; remove any retry wrapped around a failing assertion
  │    → Label a deliberate impossible-state setup with why production could reach it
  │    → If the realistic scenario no longer exercises the rule, find a DIFFERENT realistic scenario — never a weaker assertion
  │
  ├─ Gate 7 (Change Coverage) gap resolution:
  │    │
  │    ├─ GAP (changed behavior, no covering test):
  │    │    → Write the missing test — integration-first via /integration-test
  │    │    → Unit test fallback ONLY when integration infeasible — record justification
  │    │    → User waiver (verbatim, with reason) is the only alternative
  │    │
  │    └─ SPEC-GAP (changed behavior, no/stale canonical case):
  │         → use the selected owner's authoring procedure (/spec [mode=tests] UPDATE for the strict default)
  │         → use /spec [update] when business rules changed
  │         → link the corrected owner/case identity to its inspected executor and assertion (Gate 5)
  │
  ├─ Gate 6 (Three-Way Sync) conflict resolution:
  │    │
  │    ├─ Test code ≠ canonical owner (contract says behavior A, test asserts behavior B):
  │    │    → Apply the profile's owner hierarchy; unresolved intent stays AMBIGUOUS and requires user confirmation.
  │    │    → If the owner governs: fix the test to match it → re-run /integration-test.
  │    │    → If a confirmed intent change makes the owner stale: update the owner via its declared procedure, then reconcile tests; strict default: /spec [update] → /spec [mode=tests] [UPDATE].
  │    │
  │    ├─ Test code ≠ implementation (test asserts X, code does Y):
  │    │    → If CODE is correct: fix the test; update the canonical owner only if an authorized decision confirms its contract is stale (strict default: /spec [mode=tests] UPDATE)
  │    │    → If TEST is correct (code bug): do NOT update test → fix code → re-run tests
  │    │
  │    └─ Derived view ≠ canonical owner:
  │         → Use the profile-declared owner and derived-view authority; the strict default's Feature Spec outranks its index/ERD.
  │         → Re-derive the view only through its declared generator (strict default: /spec-index).
  │         → Do NOT self-resolve an ambiguous owner conflict — escalate to the user.
  │
  ├─ [REQUIRED] → /integration-test-verify
  │     After all fixes, run actual tests to confirm all gates pass.
  │
  ├─ [REQUIRED] → selected owner/test sync procedure (strict default: /spec [mode=sync])
  │     If canonical cases were updated (Gate 5/6 fix), reconcile the selected owner ↔ executing test code.
  │
  └─ [RECOMMENDED] → /docs-update
        Use only for confirmed affected downstream documentation; the selected canonical owner keeps its declared authoring/sync procedure.
```

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.
> **A test that cannot fail is not a test — it is decoration.** Every test MUST earn existence by proving it would FAIL if the protected business rule/invariant changed or the bug it guards were reintroduced.
> Every finding requires `file:line` proof with confidence >80%.

<!-- OVERRIDE:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable.
>
> **Why:** The main agent knows what it (or `/feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** After a validated-finding fix cycle, or to satisfy an explicitly declared independent-pass `minRounds`. A review round that finds zero issues ENDS the loop once that persisted minimum is met — do NOT invent a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `Agent` tool calls — use `integration-tester` subagent_type (integration-test reviews ALWAYS spawn `integration-tester`, NOT `code-reviewer`)
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `tmp/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior full review found zero issues AND the persisted `minRounds` is met (no fixes or required independent pass = nothing new to verify)
> - NEVER skip the full review restart after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `Agent` call
> - Continue until a complete full review pass clears the current round's exit bar and persisted `minRounds` (round 1: zero findings; round 2 and the conditional round 3: zero CRITICAL/HIGH/MEDIUM, LOW deferred). The budget is 2 rounds plus ONE extension to round 3, granted only when round 2 leaves a validated CRITICAL/HIGH open (a failed non-test binary gate counts as CRITICAL); round 3 is the review hard cap. A failing test gate is not budgeted — keep fixing and re-running until the tests pass, never forcing green. If the same validated blocker repeats across 2 full invocations with no progress, or the budget is spent with blocking findings open, escalate via `AskUserQuestion`
> - Persist completed rounds, repeated blockers, findings and the explicit minimum in the owning run's `review-policy.cjs` record. Resume that record after interruption; target changes invalidate evidence and acceptance but preserve the bounded round budget. In-flight attempt IDs may be session-local; they do not replace or reset completed-round state

<!-- /OVERRIDE:fresh-context-review -->

## Sub-Agent Type Override

> **MANDATORY:** Integration-test reviews spawn the `integration-tester` sub-agent, NOT `code-reviewer`.
> Keep `subagent_type: "integration-tester"` from the canonical template below; NEVER revert to `code-reviewer`.
> **Rationale:** `integration-tester` specializes in integration-test generation, case-contract traceability, CQRS test patterns, async-polling / eventual-consistency assertion correctness, and cross-service integration context — areas `code-reviewer` does not cover at depth.

<!-- OVERRIDE:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 11 protocol blocks VERBATIM, copied WHOLESALE and unmodified. They are the review-tier renderings of their canonical `SYNC:` tags, not literal copies; when a canonical protocol changes, update the matching body here in the same edit. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 11 protocol bodies pre-embedded.

### Subagent Type Selection

- `integration-tester` — ALWAYS for integration-test reviews (test files, profile-owned case traceability, CQRS/async assertion correctness)
- `code-reviewer` — for general code-quality reviews only (NOT integration tests)

### Canonical Agent Call Template (Copy Verbatim)

```
Agent({
  description: "Fresh Round {N} review",
  subagent_type: "integration-tester",
  prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Review plan files under {plan-dir}" | "Review integration tests in {path}"}

## Round
Round {N}. You have ZERO memory of prior rounds. Re-read all target files from scratch via your own tool calls. Do NOT trust anything from the main agent beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Spec ↔ Tests ↔ Code Triangulation
DO THIS FIRST — before any per-protocol check below. The review target is the WHOLE PACKAGE, not the diff alone. Read `docs/project-config.json` and resolve `specArtifacts`: a valid profile selects its configured `intent/contracts/evidence` section roles, identifiers, ownership rule, and test-carrier dialects; only an absent profile selects the strict-default business-spec shape (§3 ACs / §4 BRs / §5 invariants / §8 TCs). A malformed or unsupported declaration is `BLOCKED`; never treat it as absent or fall back. Load the governing artifact, its tests, and the changed code TOGETHER, and reason about their mutual consistency BEFORE judging any one in isolation.
1. Locate all three faces: the canonical owner section(s), the tests that guard them, and the production code that implements them. With a native profile, preserve owner path + case/scenario ID + optional variant and resolve each through its configured carrier to the actual test. A missing face is itself a finding (SPEC-GAP / TEST-GAP / DEAD-SPEC).
2. Triangulate pairwise — every disagreement is a finding; classify which face is wrong:
   - code vs spec: behavior the code does that no configured `intent/contracts` rule (or strict-default §3/§4/§5/§8 rule) describes → CODE-EXTRA or SPEC-STALE; a hard contract/invariant with no enforcing path → CODE-WRONG.
   - tests vs spec: a configured native case with no executing assertion, or a test asserting behavior no native rule/case names → TEST-GAP or SPEC-SILENT. Without `specArtifacts`, check strict-default §8 TCs.
   - tests vs code: a changed code path with no covering test → TEST-GAP; a test that still passes against a deliberately broken invariant → WEAK-TEST (apply the mutation thinking in Bug Detection).
3. Hidden-rule capture: any invariant the code enforces but the spec never states (SPEC-SILENT) MUST be surfaced as a finding, added to the profile's configured `intent` or `contracts` section, and linked from its `evidence` section to a native case whose executing assertion is inspected. Without a profile, use strict-default §3/§4/§5/§8 and TC. This is the enrichment loop, never a silent pass.
4. Only after the three faces agree — or every disagreement is logged as a finding — proceed to the per-protocol checks below; when enrichment adds spec/test content, re-review the package against the enriched spec.
NEVER mark review PASS while any spec/test/code face disagrees without a logged finding. The diff is the entry point; the package is the unit of judgment.

### Evidence-Based Reasoning
Speculation is FORBIDDEN. Every claim needs proof.
1. Cite file:line, grep results, or framework docs for EVERY claim
2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
3. Cross-service validation required for architectural changes
4. "I don't have enough evidence" is valid and expected output
BLOCKED until: Evidence file path (file:line) provided; Grep search performed; 3+ similar patterns found; Confidence level stated.
Forbidden without proof: "obviously", "I think", "should be", "probably", "this is because".
If incomplete → output: "Insufficient evidence. Verified: [...]. Not verified: [...]."

### Bug Detection
MUST check categories 1-4 for EVERY review. Never skip.
1. Null Safety: Can params/returns be null? Are they guarded? Optional chaining gaps? .find() returns checked?
2. Boundary Conditions: Off-by-one (< vs <=)? Empty collections handled? Zero/negative values? Max limits?
3. Error Handling: Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
4. Resource Management: Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
5. Concurrency (if async): Missing await? Race conditions on shared state? Stale closures? Retry storms?
6. Stack-Specific: Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
Classify every finding by consequence (never by effort): CRITICAL = immediate material security/safety/data-loss risk or failed binary gate → block; HIGH = material correctness, contract, privacy, or authority risk → must fix; MEDIUM = bounded consequential edge/resilience/maintainability gap → must clear the current round, or escalate with an explicit residual-risk follow-up that does not create a clean pass; LOW = non-blocking polish with no credible present impact → record/defer from round 2; `NOT VERIFIABLE` is unresolved evidence, not LOW.

### Design Patterns Quality
Priority checks for every code change:
1. Consistency and reuse: follow documented local patterns; extract a shared abstraction only when repetition or a demonstrated consumer need justifies its cost. Similar names alone do not require a shared base class.
2. Responsibility: follow the architecture established by project configuration, references, accepted decisions, and existing code. Place behavior with its actual owner; do not presume an entity/service/controller hierarchy or forbid a layer without project evidence.
3. Apply cohesion, coupling, and dependency-management principles when their assumptions fit the project's paradigm. SOLID is useful for object-oriented boundaries, not a mandatory checklist for every language or codebase.
4. After extraction/move/rename: Grep ENTIRE scope for dangling references. Zero tolerance.
5. YAGNI gate: Treat repeated patterns as evidence to evaluate extraction, not a numeric threshold. Extract when a shared reason to change, real consumers, or an evidenced ownership/substitution boundary lowers total change cost; do not create patterns for hypothetical future use.
6. Purpose-oriented naming: Name public or cross-layer abstractions by the capability, domain purpose, or contract consumers rely on—not the current provider, SDK, framework, database, or transport. `IStorage`/`Storage` → `AzureBlobStorage`; use `IAzureStorage` only when Azure-specific semantics are intentionally part of the contract.
7. Contract-fit check: Read callers and every implementation before judging a name; narrow an over-broad abstraction (`IObjectStore`, `DocumentStore`) instead of rewarding a generic name that lies about behavior.
8. Mechanism/generic-name smell: Treat `Manager`, `Helper`, `Utils`, `Data`, `Thing`, `Service`, `Interface`, type decorations, and unexplained abbreviations as review signals—not automatic defects; flag them only when they hide purpose, scope, or responsibility.
9. Concrete implementation names: Provider, strategy, transport, or test-double names are valid on concrete types when they distinguish real behavior (`AzureBlobStorage`, `InMemoryStorage`, `RetryingStorage`); keep those details out of the caller-facing contract unless the contract promises them.
10. Language convention: Preserve local interface syntax and naming style; `.NET` `I` prefixes and Google TypeScript's unmarked interfaces are both valid local conventions.
Anti-patterns to flag: God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

### Logic & Intention Review
Verify WHAT code does matches WHY it was changed.
1. Change Intention Check: Every changed file MUST serve the stated purpose. Flag unrelated changes as scope creep.
2. Happy Path Trace: Walk through one complete success scenario through changed code.
3. Error Path Trace: Walk through one failure/edge case scenario through changed code.
4. Acceptance Mapping: If plan context available, map every acceptance criterion to a code change.
5. Tests Verify Intent: For test/spec changes, verify tests name the protected business rule or invariant and would fail if that intent breaks.
6. Migration Test Exclusion: Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.
NEVER mark review PASS without completing both traces (happy + error path).

### Test Spec Verification
Map changed code to test specifications.
1. Identify the project's test/spec format from existing docs, test-case files, BDD feature files, or spec folders.
2. Every changed code path MUST map to a corresponding test case/spec (or flag as "needs test case").
3. New functions/endpoints/handlers → flag for test spec creation.
4. Migration files are excluded from test/spec creation; schema/data migrations are one-time execution paths, not core application logic.
5. If spec evidence fields exist, verify they point to actual code (file:line, not stale references).
6. Verify each meaningful test case names the business intent/invariant; flag behavior-only cases that only mirror implementation details.
7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
8. If no specs exist for a changed path → log the gap and recommend the project's test-spec workflow.
NEVER skip test mapping. Untested code paths are the #1 source of production bugs.

### Behavioral Delta Matrix
MANDATORY for any bugfix review. Produce input-state × pre-fix × post-fix × delta table BEFORE writing verdict.
- Minimum 3 rows; include at least one row OUTSIDE the original bug report.
- Any "REGRESSION" delta → review returns FAIL until a preservation test is added.
- Narrative descriptions do NOT substitute for the matrix.
Example rows (external-record sync fix):
| Input                 | Pre-fix | Post-fix                  | Delta      |
| --------------------- | ------- | ------------------------- | ---------- |
| Record exists (valid) | Reused  | Always recreated → orphan | REGRESSION |
| Record missing (404)  | Error   | Recreated                 | Fixed      |

### Fix-Layer Accountability
Do not assume the crash site owns the defect. Trace the actual execution and data flow, then fix the component that owns the violated contract.
MANDATORY before ANY fix:
1. Trace the affected path — map the real origin, transformations, boundaries, and observed failure in the surfaces this project uses. Do not invent absent layers.
2. Identify the contract owner — use project architecture and code evidence to find which component is responsible for the invalid state or behavior.
3. Choose the correction point — fix the authoritative owner and retain any validation required at untrusted boundaries. A multi-file correction can be valid; justify it by the contracts each file owns rather than a file-count threshold.
4. Check bypass paths — inspect relevant constructors, adapters, parsers, caches, persistence, or other entry points that actually exist in the affected flow.
BLOCKED until: The affected path is traced; the owner is supported by file:line evidence; relevant consumers and bypass paths are checked; and the correction point fits the project's architecture.
Anti-patterns (REJECT): assuming the symptom site is the owner; scattering workarounds without tracing the contract; assuming the lowest technical layer is always authoritative; removing validation from a real trust boundary to force a single correction point.

### Rationalization Prevention
AI skips steps via these evasions. Recognize and reject:
- "Too simple for a plan" → Simple + wrong assumptions = wasted time. Plan anyway.
- "I'll test after" → RED before GREEN. Write/verify test first.
- "Already searched" → Show grep evidence with file:line. No proof = no search.
- "Just do it" → Still need TaskCreate. Skip depth, never skip tracking.
- "Just a small fix" → Small fix in wrong location cascades. Verify file:line first.
- "Code is self-explanatory" → Future readers need evidence trail. Document anyway.
- "Combine steps to save time" → Combined steps dilute focus. Each step has distinct purpose.

### Graph-Assisted Investigation
MANDATORY when .code-graph/graph.db exists.
HARD-GATE: MUST run at least ONE graph command on key files before concluding any investigation.
Pattern: Grep finds files → trace --direction both reveals full system flow → Grep verifies details.
- Investigation: trace --direction both on 2-3 entry files
- Fix/Debug: callers_of on buggy function + tests_for
- Feature/Enhancement: connections on files to be modified
- Code Review: tests_for on changed functions
- Blast Radius: trace --direction downstream
CLI: python .claude/scripts/code_graph {command} --json. Use --node-mode file first (10-30x less noise), then --node-mode function for detail.

### Understand Code First
HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
1. Search 3+ similar patterns (grep/glob) — cite file:line evidence.
2. Read existing files in target area — understand structure, base classes, conventions.
3. Run python .claude/scripts/code_graph trace <file> --direction both --json when .code-graph/graph.db exists.
4. Map dependencies via connections or callers_of — know what depends on your target.
5. Write investigation to tmp/analysis/ for non-trivial tasks (3+ files).
6. Re-read analysis file before implementing — never work from memory alone.
7. NEVER invent new patterns when existing ones work — match exactly or document deviation.
BLOCKED until: Read target files; Grep 3+ patterns; Graph trace (if graph.db exists); Assumptions verified with evidence.

## Reference Docs (READ before reviewing)
- code-review-rules.md, in the reference-docs root (default docs/project-reference; docsRoots.projectReference.path in docs/project-config.json overrides it)
- {skill-specific reference docs — e.g., integration-test-reference.md for integration-test-review; backend-patterns-reference.md for backend reviews; frontend-patterns-reference.md for frontend reviews}

## Target Files
{explicit file list OR "run git diff to see uncommitted changes" OR "read all files under {plan-dir}"}

## Output
Write a structured report to tmp/reports/{review-type}-round{N}-{date}.md with sections:
- Status: PASS | FAIL
- Issue Count: {number}
- Test Architecture Contract: matrix (tier applicability, owner/root, runner, full/focused commands, zero-match behavior, CI/simple-Windows entry point), command-validity result, unique/additive data result, parallel-isolation result, and exact execution evidence or explicit N/A
- Critical Issues (with file:line evidence)
- High Priority Issues (with file:line evidence)
- Medium / Low Issues
- Cross-cutting findings

Return the report path and status to the main agent.
Every finding MUST have file:line evidence. Speculation is forbidden.
`
})
```

### Rules

- DO copy the template wholesale — including all 11 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO choose `integration-tester` subagent_type — integration-test reviews ALWAYS use `integration-tester`, never `code-reviewer`
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /OVERRIDE:review-protocol-injection -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Do not present inference as fact; ground material claims in evidence appropriate to the task.
>
> 1. Cite `file:line` for repository claims, configuration or reference paths for project rules, and URLs or artifact locations for external or observed claims.
> 2. State confidence when a conclusion is uncertain; verify material assumptions before acting and withhold recommendations when evidence is insufficient.
> 3. Trace the consumers, boundaries, or dependencies that exist in the affected path; do not assume services, modules, or architectural styles that the project does not use.
> 4. "I don't have enough evidence" is valid and expected output.
>
> **BLOCKED until:** material claims have traceable evidence, relevant searches are complete, and uncertainties are stated. Search comparable patterns when the task has existing implementations; record when none are available.
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

<!-- SYNC:double-round-trip-review -->

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle or an explicitly declared independent-pass minimum, not by a round number alone. Review purpose: `review → validate findings → fix validated findings that block the current round → full re-review` until a complete review pass clears the round's exit bar (see **Severity floor** below). **A clean review ENDS the loop once the persisted `minRounds` is met (default 1); an explicitly declared minimum such as 2 still requires that independent pass.**
>
> _aka **Self-Review Convergence Loop**._ The name is historical — "double-round-trip" means a validated-finding fix cycle forces at least one fresh re-review. It runs until the current round's exit bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred), bounded by the **2-round ceiling — extendable ONCE to round 3 when CRITICAL/HIGH remain** — defined below. A failing **test gate** (a suite that must actually pass) is outside that ceiling: the loop keeps fixing and re-running until the tests pass.
>
> **Round cap — 2 rounds MAX, extendable ONCE to round 3 (a ceiling, NEVER a target).** A clean pass ENDS the loop at ANY round once `round >= minRounds` — round 1 included with the default minimum; the cap never obliges an extra round. What happens when round 2 completes with blocking findings still open (severity floor applied) depends on WHAT is still open:
>
> - **Validated CRITICAL or HIGH still open → ONE extra round is granted (round 3, the review hard cap).** A failed non-test binary gate (security must-fix, required artifact, generated parity, policy compliance) counts as a CRITICAL blocker here. The extension is earned by that evidence alone, is never a default, is granted at most once per run, and never renews. Record the granting findings in the run record and report.
> - **Only MEDIUM (or an unresolved `NOT VERIFIABLE`) still open → NO extension.** → **STOP and escalate via `AskUserQuestion`** with the still-open findings listed.
> - **Round 3 completes with ANY review blocker still open → STOP and escalate via `AskUserQuestion`.** Round 3 is the review hard cap; no review finding or non-test gate opens a round 4.
> - **A failing TEST gate → NO round cap, at any round.** Failing tests never escalate for budget or no-progress and never buy or spend the extension: run the failed-test investigation gate, fix at the owning layer, and re-run until the tests pass — past round 3 if needed. NEVER weaken an assertion, add a skip, or relax a timeout to force green. Review blockers open beside failing tests still follow the bullets above.
>
> NEVER emit a silent "good enough" PASS on cap exhaustion, NEVER let the cap substitute for the clean-review requirement, and NEVER loop past round 3 on review blockers — only failing test gates continue beyond it. The 2-repeated-no-progress blocker rule stays an EARLIER exit — escalate at whichever trips first.
>
> **Severity floor — from round 2, LOW stops blocking.** The exit bar tightens after the first review pass, so the loop converges on consequence instead of spinning on polish:

> Define one predicate everywhere: `blocking_findings(round, findings)` returns all validated findings in round 1 and only validated CRITICAL/HIGH/MEDIUM findings from round 2 onward. A binary gate (test-green, security must-fix, required artifact) is exempt only when its owning invariant explicitly says so; in practice binary gates always remain blocking when they fail.
>
> | Round | Exit bar — loop ENDS when the fresh full review has… | Must be fixed to continue |
> | --- | --- | --- |
> | 1 | zero validated findings at ANY severity | CRITICAL · HIGH · MEDIUM · LOW |
> | 2 | zero validated CRITICAL / HIGH / MEDIUM findings — **LOW-only clears the severity bar** | CRITICAL · HIGH · MEDIUM only |
> | 3 — extension round, reachable ONLY when round 2 left CRITICAL/HIGH open (or failing tests were the only blocker) | zero validated CRITICAL / HIGH / MEDIUM findings — **LOW-only clears the severity bar** | CRITICAL · HIGH · MEDIUM only |
> | 4+ — test-gate continuation, reachable ONLY while failing test gates were the sole blocker | the tests pass and no review blocker is open | failing tests; any review blocker here escalates |
>
> From round 2 onward LOW findings are **NOT required to be fixed**: a round whose validated findings are ALL LOW **ENDS the loop once the persisted minimum is met** — do not open another fix/re-review round for them. Severity tiers are `SYNC:severity-rubric` (CRITICAL block-merge · HIGH must-fix · MEDIUM must clear the current round · LOW record/defer); round 1 remains strict, so a LOW found initially is still validated and fixed when warranted before the floor can apply.
>
> **Severity-floor rules:**
>
> - **Never silently drop a deferred LOW.** Every unfixed LOW is listed in the final report under `## Deferred LOW Findings (severity floor, round ≥2)` with file, line, and description, so the owner can schedule it. Dropping it from the report is a protocol violation, not a clean pass.
> - **Never re-tier a finding to trigger the exit.** Downgrading a real CRITICAL/HIGH/MEDIUM to LOW so the loop can end is a FALSE PASS. Severity is set by consequence per `SYNC:severity-rubric` before the round bar is applied — never after, and never with the exit in view. — why: a floor that can be reached by relabeling is not a floor.
> - **Never re-tier a finding to reach — or to dodge — the extension.** The extension is unlocked by a real CRITICAL/HIGH, so promoting a MEDIUM to HIGH to buy round 3, or demoting a real CRITICAL/HIGH to MEDIUM to force an earlier escalation, are both FALSE classifications. Severity is set by consequence before the round bar and the extension test are applied. — why: an extension that can be reached by relabeling bounds nothing.
> - **The floor bounds the loop, not the standard.** It ends *iteration*; it never authorizes shipping a known CRITICAL/HIGH/MEDIUM, and it never lowers the finding-survival bar that admits a finding in the first place.
> - **The floor never applies to a hard gate.** Test-green gates (a suite must actually pass), security must-fix gates, and any gate whose criterion is binary rather than severity-rated are unaffected — a failing test is a failure, not a LOW finding.
>
> **Universal scope (any new output/judgment):** any newly produced output or judgment gets **≥1 self-review**; any **new judgment** gets **≥1 `/why-review --validate-findings` pass**; anything flagged to re-check is re-checked **≥1 time** — before that output is treated as final. This loop is the default convergence contract for ANY work-producing skill, not review skills only.
>
> **Routing invariant (author-facing):** a skill that validates findings MUST route them through `/why-review --validate-findings` (the terminal validator) — NEVER fork an inline finding-validation. Routing through why-review is what makes the finding-survival bar and this loop apply; the `verify-review-validate-coverage` sensor enforces this exact route mechanically.
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS if `round >= minRounds`; otherwise perform the explicitly required independent pass. Do NOT invent a confirmation pass.
> - **`blocking_findings(round, findings)` is non-empty** → run the active review skill's findings-validation gate first; for review skills the default gate is `/why-review --validate-findings <report-path>`. Fix only validated findings that block the current round, then restart the full review protocol from the beginning with a fresh task breakdown.
>
> **Fresh full re-review after every fix cycle:** Re-run the whole review protocol over the current full target. When sub-agents are part of that protocol, spawn NEW `Agent` calls — never reuse prior agents. Reviewers re-read ALL files from scratch with ZERO memory of prior rounds. See `SYNC:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. Each fresh full review must catch:
>
> - Cross-cutting concerns missed in the prior round
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the prior round rationalized away
> - Regressions introduced by the fixes themselves
>
> **Loop termination:** After each full re-review, repeat the same decision against **that round's exit bar**: bar cleared and persisted minimum met → END; blocking findings remain → validate findings → fix → restart from the first review phase. Round 1 clears only on zero findings at any severity; **from round 2 the bar is zero CRITICAL/HIGH/MEDIUM, so a LOW-only round ENDS the loop once the persisted minimum is met** (deferred LOWs go in the report). Capped at **2 rounds, extendable ONCE to round 3 when round 2 leaves validated CRITICAL/HIGH open**. Escalate via `AskUserQuestion` at whichever comes first: the same validated finding repeats for 2 full invocations with no progress · a fix requires product/owner input · round 2 completes with MEDIUM-only (or `NOT VERIFIABLE`) blocking, which earns no extension · round 3 completes with any review blocker still open. A failing test gate triggers none of these escalations — it loops until green. NEVER loop past round 3 on review blockers, and NEVER convert cap exhaustion into a PASS.
>
> **Rules:**
>
> - A clean Round 1 ENDS the review when `minRounds=1`; an explicitly declared `minRounds=2` requires the independent second pass
> - From round 2 on, a round whose validated findings are ALL LOW ENDS the loop once the persisted minimum is met — never open round N+1 to fix LOW alone; list those LOWs as deferred instead
> - NEVER re-tier a CRITICAL/HIGH/MEDIUM down to LOW to reach the round-2 exit — severity is assigned by consequence before the bar is applied
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - Every surviving finding must additionally clear the **finding-survival bar** defined in why-review's Findings Validation Routine (a deliberately higher bar than the generic act-gate — "keep this finding?" is a stricter question than "act on this evidence?"); a finding below the bar is demoted or dropped, not kept
> - NEVER skip the full re-review after a fix cycle (every fix invalidates the prior verdict)
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns NEW Agent calls
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - The round cap NEVER replaces the clean-review requirement — it bounds runaway looping, it does not authorize shipping an un-clean review; a clean pass ends the loop early once the persisted minimum is met, and cap exhaustion escalates rather than passes
> - Enforce the base cap of 2 rounds, the single conditional extension to round 3 (unlocked ONLY by validated CRITICAL/HIGH open at round 2; a failed non-test binary gate counts as CRITICAL), and the 2 repeated-no-progress blocker rule together; all three are escalation triggers for review blockers, none is a completion criterion
> - The extension is granted at most ONCE per run and never renews — round 3 is the review hard cap regardless of what it finds
> - Failing test gates are outside the round budget: never escalate them for budget or no-progress, never let them buy the extension, and keep fixing and re-running until the tests pass — never forcing green
> - Persist completed rounds, repeated blockers, findings and the explicit minimum in the owning run's `review-policy.cjs` record. Resume that record after interruption; target changes invalidate evidence and acceptance but preserve the bounded round budget. In-flight attempt IDs may be session-local; they do not replace or reset completed-round state
> - Final verdict must incorporate ALL rounds executed
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2 that was executed, plus `## Deferred LOW Findings (severity floor, round ≥2)` whenever the loop ended on the severity floor with LOWs still open. When round 3 ran, the report must name the CRITICAL/HIGH findings that granted the extension; when rounds continued on failing tests, it must name the failing test gates of each such round.**

<!-- /SYNC:double-round-trip-review -->


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

<!-- SYNC:integration-test-execution-discipline -->

> **Integration Test Execution Discipline** — How the integration-test family (write · review · verify) runs, diagnoses, and clears a suite. Binds `/integration-test`, `/integration-test-review`, and `/integration-test-verify` identically.
>
> 1. **Verify the configured relevant suite, not a convenient sample.** Resolve test projects/suites from project config and the requested scope. A focused run is diagnostic unless the task explicitly asks for that scope; report actual runner output and do not claim broader coverage than it proves.
> 2. **Set up valid state without bypassing the contract under test.** Exercise the production entry path when that path is being tested. For unrelated preconditions, use the project's builders, factories, fixtures, seeders, APIs, or persistence setup when they preserve invariants. Never use a shortcut that skips the behavior the assertion is meant to protect.
> 3. **On ANY failure → `/debug-investigate` the root cause BEFORE any fix.** Do not guess, do not patch the symptom site. Trace the failure end-to-start and classify whose fault it is: test code (wrong assertion/setup), source/production code (real defect), or environment/infrastructure/data. Then route: test-code fault → `/integration-test-review` to fix the test at the root (never weaken assertions or add skips); source-code fault → fix the production defect at the owning layer and report it; environment fault → mark BLOCKED and point at the startup script. NEVER change a test to match broken code.
> 4. **Use project timeouts as budgets, not as fixes.** Investigate a timeout or slow test for deadlock, unbounded work, missing synchronization, or an unavailable dependency. Do not widen an assertion timeout or retry a failing assertion to hide a defect; adjust execution budgets only when evidence shows the configured budget is inappropriate for this environment.
> 5. **Follow the configured repeat policy.** Read `integrationTestVerify.guidance` and report its required fresh runs, state-reset policy, concurrency, and scope. When no policy is declared, use two fresh green runs for suites with persistent/shared state; use the runner's normal clean/isolated setup and never reset data owned by another run. Preserve executed coverage and disclose what each run proves.

<!-- /SYNC:integration-test-execution-discipline -->

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

<!-- SYNC:systematic-review-batching -->

> **Systematic Review Batching (map-reduce)** — When a changeset is large, do NOT review files one-by-one. Partition into size-capped batches, fire one specialized sub-agent per batch in parallel, then reduce. This bounds EVERY context — each batch agent AND the orchestrator — so coverage stays complete as file count grows.
>
> **Trigger ladder (one ordered escalation — not competing thresholds):**
>
> 1. **< 10 changed files** → sequential per-file review (default; no batching).
> 2. **≥ 10 changed files** → switch to systematic parallel mode. Announce: `"Detected {N} changed files. Switching to systematic parallel review protocol."` Then: categorize → size-capped batches → flat consolidation.
> 3. **categories > 6 OR files > 40** → additionally insert the hierarchical synthesis tier (below). Everything from rung 2 still applies.
>
> **Step 1 — Categorize.** Group changed files into logical categories derived from the project's actual structure (not forced). Category is the *concern axis*; orient with these examples, derive what fits the repository:
>
> | Category Type | Example Groupings |
> | --- | --- |
> | Agent/Tooling | AI scripts, hooks, skill definitions, workflow configs, linting rules |
> | Root config/docs | Root README, project config, CI/CD pipeline configs |
> | Reference docs | Architecture docs, patterns references, setup guides |
> | Feature/domain docs | Business feature documentation, spec files, ADRs |
> | Backend logic | Service/handler/controller source (infer from project structure) |
> | Frontend logic | UI component/state/API source (infer from project structure) |
> | Data/Schema | Migrations, schema files, seed data |
> | Tests | Unit, integration, E2E test files |
> | Infrastructure | Docker, k8s, CI/CD, cloud manifests |
>
> **Step 2 — Size-capped batches.** One sub-agent per batch of **≤8 files OR ≤2000 diff-lines**, whichever hits first. Category stays the concern axis, but any category exceeding a cap splits into multiple size-capped batches (30 backend files → 4 batches). Size caps — not category caps — make "many files" safe: a category cap alone lets one giant category blow a single agent's context.
>
> **Step 2a — Sub-agent type per batch** (match the batch's dominant concern):
>
> - Code logic (any stack) → `code-reviewer`
> - Security-sensitive changes → `security-auditor`
> - Performance-critical paths → `performance-optimizer`
> - Docs, plans, specs, configs, infra → `general-purpose`
>
> Each batch sub-agent receives: its full file list; `SYNC:category-review-thinking` as its primary thinking model — derive each category's concerns from first principles, NOT a fixed checklist (if the consuming skill does not carry that block, apply category-first thinking directly); project reference docs relevant to its concern (discover via `*patterns*`, `*conventions*`, `*style-guide*`); cross-reference verification instructions (counts, tables, links). All batch agents run in parallel and write findings to `tmp/reports/` (per `SYNC:task-tracking-external-report`); reducers read from disk, never from memory.
>
> **Step 3 — Reduce.**
>
> - **Flat reduction (rung 2, ≤6 categories AND ≤40 files):** the orchestrator collects each batch report, cross-references counts/tables/contracts ACROSS batches, detects gaps visible only across categories (feature in code but missing from docs; new API endpoint with no client call), and consolidates into one categorized holistic report.
> - **Hierarchical reduction (rung 3, > 6 categories OR > 40 files):** insert a mid-tier — each concern gets ONE synthesizer agent that reads only its own batch reports and emits a single concern-synthesis. The orchestrator reads the **concern-syntheses (~5)**, never the raw batch reports — keeping the reducer's context O(#concerns), not O(#files).
>   - **Cross-concern interaction pass (mandatory at rung 3 — closes the synthesis-tier blind spot):** concern-siloed synthesis can drop an interaction spanning two concerns AND two batches (tainted source in data-layer/batch 7 → sink in api/batch 3). So: (a) each concern-synthesizer MUST emit an explicit **"cross-concern interaction candidates"** list — entities/symbols/contracts it touched that plausibly bind to another concern (shared DTOs, event names, table/collection names, exported symbols); (b) the orchestrator MUST run the Step-3 cross-reference/gap step **over those candidate lists across all concern-syntheses**, not only within a batch, before concluding. Without this pass the tier trades completeness for context-bounding on exactly the large diffs it targets.
>
> **Step 4 — Holistic assessment.** With all findings combined, judge: overall coherence as a unified intent; cross-category sync (docs match code? contracts match callers?); risk areas where categories interact; missing doc/spec updates for changed artifacts.
>
> **No silent truncation.** If any cap forces sampling or a batch is dropped for budget, ANNOUNCE the dropped/sampled scope explicitly — bounded coverage must never read as complete coverage.

<!-- /SYNC:systematic-review-batching -->

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Classify every finding by consequence, not by effort, reviewer preference, or how annoying the fix is. One scale applies to every review, skill, agent, workflow, and host so a tier has the same meaning everywhere. Choose the highest credible consequence supported by evidence; do not lower a tier to make a round pass.
>
> **Finding vs observation (required):** An observation becomes a finding only when it names the affected user/system/data/contract, the shipped consequence, the evidence location, and the normalized tier. `INFO`, advice, preference, duplicate wording, or an unsubstantiated concern is not a finding and must not reopen a loop. If the concern might affect a required behavior or gate but evidence is incomplete, emit `NOT VERIFIABLE` with the missing evidence and keep it unresolved; never silently convert uncertainty into LOW.
>
> | Severity | Action | Definition and examples |
> | --- | --- | --- |
> | CRITICAL | Block immediately; escalate | Immediate material risk if shipped: authentication/authorization or safety bypass; secrets/PII exposure; irreversible destructive action; data loss/corruption; or a silent failure on a critical path. A failed binary gate that makes the result untrustworthy is represented as a separate synthetic blocker by the executable policy (not as an ordinary severity judgment). |
> | HIGH | Must fix before PASS/merge | Material correctness or contract risk: wrong behavior on a supported path; violated business/data invariant; meaningful privacy or authority gap; breaking API/schema/compatibility change; likely harm to users/downstream systems; or a missing proof for a behavior-changing fix. |
> | MEDIUM | Must clear the current round; escalate if the fix needs an owner decision | Bounded but consequential risk: an edge case, resilience/observability/testability/maintainability gap, credible future defect, or local architectural drift whose impact is real but not immediate material loss. An explicit follow-up records the escalation/residual risk; it does not make an open MEDIUM a clean pass. |
> | LOW | Record and defer; never open another fix/re-review round from round 2 onward, and never counts toward the round-3 extension | Non-blocking polish with no credible present correctness, security, privacy, authority, availability, or data-integrity impact: wording/formatting, minor documentation or convention drift, optional defensive cleanup, or a cosmetic/refinement suggestion. |
>
> **Consequence decision tree (apply in order):** (1) Is a binary gate failed? Keep it as a separate hard blocker (the executable helper represents it as synthetic CRITICAL); do not use the ordinary severity label to hide what failed. Otherwise, would shipping permit immediate material security/safety/authority harm, irreversible destruction, data loss/corruption, or a critical-path silent failure? → **CRITICAL**. (2) Otherwise, does a supported path, invariant, public contract, privacy/authority boundary, compatibility promise, or behavior-changing proof fail with material user/downstream impact? → **HIGH**. (3) Otherwise, is there a bounded but consequential edge, resilience, observability, testability, maintainability, or architectural gap with a credible impact? → **MEDIUM**. (4) Otherwise, is the evidence sufficient to show only non-blocking polish with no credible present material impact? → **LOW**. (5) If the evidence needed to choose between steps 1–4 is missing, → **NOT VERIFIABLE**, not LOW. When multiple tiers fit, select the highest credible consequence; effort, implementation cost, reviewer discomfort, frequency alone, proximity to the round cap, and whether a tier would unlock or forfeit the conditional round-3 extension never decide the tier.
>
> **Boundary examples (normalize before applying the round predicate):** an auth bypass, exposed secret/PII, destructive command without an authority gate, or failed required test/generation/parity gate is **CRITICAL**; a wrong supported response, broken invariant/API/schema, meaningful privacy/authority defect, or unproven behavior-changing fix is **HIGH**; a bounded retry/timeout/alert/testability gap or credible maintainability drift is **MEDIUM**; a typo, formatting inconsistency, optional cleanup, or cosmetic suggestion proven not to affect present behavior is **LOW**. A missing fact about any of those boundaries is **NOT VERIFIABLE** until evidence or an explicitly documented residual-risk decision exists.
>
> **Classification procedure (required for every finding):** (1) state the affected user, system, data, contract, or gate; (2) assess consequence if the issue ships; (3) assess exposure/likelihood and reversibility/detectability; (4) select the highest tier justified by those facts; (5) cite `file:line` or equivalent evidence and a confidence percentage. Effort, implementation cost, reviewer discomfort, and proximity to the round cap are never severity inputs. `NOT VERIFIABLE` is a pending evidence state, not one of the four tiers and never a LOW escape hatch: if the unresolved claim could affect required behavior, security, privacy, authority, availability, data integrity, or a binary gate, it remains an open evidence blocker until resolved or explicitly owner-accepted with documented residual risk. Classify an item LOW only when evidence supports the absence of credible present material impact.
>
> **Hard-gate rule:** Binary gates (tests, required artifacts, security must-fix checks, generated parity, policy compliance) are not ordinary severity-rated findings. The executable helper records a failed gate as a synthetic CRITICAL blocker solely so one predicate can carry it; the report must still name the gate and failure evidence. A failed gate blocks at every round, including when all ordinary findings are LOW; never disguise a failed gate as LOW. A failed non-test gate counts as CRITICAL for the round-3 extension; a failing test gate is outside the round budget and loops until the tests pass.
>
> **Score-based skills** map their numeric scale onto these tiers — do not invent a parallel vocabulary:
>
> - **0-2 criterion scoring** (e.g. production-readiness-review): `0` = CRITICAL/HIGH (criterion unmet, blocks readiness), `1` = MEDIUM (partial, consequential gap), `2` = pass (no finding). If the criterion is only polish, use LOW rather than forcing a `0`.
> - **Two-axis scoring** (e.g. performance-review, impact × likelihood): high impact + high exposure → CRITICAL/HIGH; material impact with bounded exposure → HIGH/MEDIUM; low impact and low exposure → LOW. Record the axes and why the selected tier is the highest credible consequence.
> - **Scorecards / `/20` grades** (e.g. architecture-scalability-review): the aggregate score and verdict band are separate from finding severity. A sub-80 area is evidence to investigate, not an automatic CRITICAL/HIGH/MEDIUM/LOW label; classify each underlying gap by the consequence decision tree and keep advisory score deductions separate from blocking findings.
>
> **Domain-vocabulary normalization (mandatory):** Specialized skills may keep a local reporting vocabulary, but it MUST feed this same four-tier round predicate — never a second severity system:
>
> - `BLOCKED`, `HARD FAIL`, or `FAIL` is a blocking local verdict, not an automatic CRITICAL label. Classify the underlying consequence as CRITICAL when it is an immediate material risk or failed binary gate; otherwise classify it as HIGH or MEDIUM with evidence, while preserving the local block until the owning gate is satisfied.
> - `WARN` is not permission to ignore a finding. Map it to MEDIUM when the gap is consequential, to LOW only when evidence supports no credible present material impact, or upward to HIGH/CRITICAL when the consequence warrants it. `PASS`/compliant is not a finding.
> - UI `P0`/`P1`/`P2`/`P3`/`P4` map to CRITICAL/HIGH/MEDIUM/LOW/LOW respectively as a starting point; override upward only when the evidence shows a higher shipped consequence. A P0/P1 accessibility or task-completion floor remains a blocking gate even when a local UI report calls it a priority rather than a severity.
> - Numeric SRE/readiness or impact/likelihood scores are evidence inputs, not replacement tiers. Emit the score, the consequence, and the normalized CRITICAL/HIGH/MEDIUM/LOW tier together. `INFO`/advisory observations are not findings unless the evidence shows a material consequence.
>
> A finding's tier drives the gate: CRITICAL/HIGH/MEDIUM remain actionable and blocking under the round policy, and only an open CRITICAL/HIGH at round 2 (a failed non-test binary gate counts as CRITICAL) unlocks the single conditional extension round; LOW may be tracked as a follow-up and, from round 2, does not by itself justify another fix/re-review. An owner decision may explain or schedule an open MEDIUM but does not turn it into a clean pass; owner acceptance never makes a failed binary gate pass and must record scope, rationale, and residual risk.

<!-- /SYNC:severity-rubric -->


<!-- SYNC:category-review-thinking -->

> **Category Review Thinking** — A thinking framework for reviewing any category of changed files. NOT a fixed checklist — derive concerns from domain knowledge; the examples are starting points only. Your knowledge of the category exceeds any list here — trust it.
>
> **Step 1 — Understand the category's role.** What is this category responsible for in the overall system? What invariants must it uphold? What are its consumer contracts (who depends on it, what do they expect)?
>
> **Step 2 — Read project conventions for this category.** Search for reference docs, style guides, ADRs, or READMEs specific to this area. Grep 3+ existing similar files — extract naming conventions, structural patterns, shared base classes. If no docs exist, derive conventions empirically from existing code.
>
> **Step 3 — Derive concerns from first principles.** Apply all that are relevant; expand beyond this list based on the actual category:
>
> - **Correctness:** Does the logic match the intent? Trace happy path AND error path.
> - **Boundary contracts:** Are interfaces/APIs/events/protocols honored? No implicit coupling introduced?
> - **Project conventions:** Does new code follow the patterns found in Step 2? Evidence-confirmed, not assumed.
> - **Security:** Auth enforced at every entry point? Input validated at boundaries? No secrets in the diff?
> - **Performance:** Unbounded operations? N+1 patterns? Blocking calls in async context? Unindexed queries?
> - **Maintainability:** DRY? Single responsibility? Complexity within reason? Names reveal intent?
> - **Boundary naming:** When the category exposes public or cross-layer types, APIs, events, or modules, verify that names describe the capability, domain purpose, or contract rather than the current provider/framework/transport; concrete adapters may carry those details. Check callers and implementations before flagging a name, and treat generic names (`Manager`, `Helper`, `Utils`, `Data`) as signals rather than automatic violations.
> - **Test coverage:** Are the changed paths covered by tests? Are existing tests still valid after the change?
> - **Documentation:** Do related docs, specs, or READMEs reflect the changes?
>
> **Step 4 — Create sub-tasks and execute.** For each identified concern: create a `TaskCreate` sub-task, work through it with `file:line` evidence, mark done. No findings without proof.
>
> **Illustrative concern examples by category type** (not exhaustive — trust your knowledge beyond this):
>
> - _Server-side logic:_ handler/service structure conventions, validation layer placement, side-effect isolation, cross-service boundary enforcement, data-access layer separation, error propagation strategy
> - _Client-side logic:_ component lifecycle management, resource cleanup (subscriptions, listeners, timers), state management patterns, API integration layer separation, reactive stream composition
> - _Data/Schema:_ migration reversibility (rollback script), lock impact on table volume, backfill idempotency, index coverage for query patterns, deployment ordering
> - _Configuration:_ present in ALL environments? No secrets in diff? App fails fast if config missing (not silently null)? Documented in setup guide?
> - _Infrastructure:_ dev/prod parity? No hardcoded dev values (localhost, debug flags)? Pinned image/dependency versions? CI/CD secret requirements documented?
> - _Styles/Assets:_ follows project naming conventions? Uses design variables/tokens (no hardcoded magic values)? Correct scope (no global side effects from component styles)?
> - _Documentation:_ accurate? Links valid? Examples still match current code/behavior? Covers new scenarios?
> - _Tests:_ assertions verify specific outcomes (not just "no exception")? Idempotent (repeatable N times)? Covers edge cases, not just happy path?
> - _Security artifacts:_ all code paths reach the gate? Negative tests exist (unauthorized denied)? Both enforcement AND display control updated?
> - _Build/Tooling:_ rule changes apply consistently? No exceptions that silently swallow violations? Impact on CI runtime documented?

<!-- /SYNC:category-review-thinking -->

<!-- SYNC:goal-contract-satisfaction-loop -->

> **Goal Contract Satisfaction Loop** — Persist the user goal in an external file, execute against it, and loop review/fix until every saved required criterion passes or a blocker escalates. Bounded closed loop — NEVER open-ended autonomous exploration.
>
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md` (plans root default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
> 2. **Required sections:** Original Request, Purpose, Success Criteria (checkboxes; mark required vs optional), Constraints, Evidence Required, Iteration Log, Goal Satisfaction matrix.
> 3. **Before work:** read the active goal and map planned work to saved success criteria — execution serves the saved criteria, never chat memory alone.
> 4. **After execution/verification:** append an Iteration Log entry — result, evidence references (`file:line`, command output, report path), remaining gaps.
> 5. **Review gate:** emit a Goal Satisfaction matrix — `| Success Criterion | Evidence | Status |` with PASS/FAIL/BLOCKED. Overall PASS requires every required criterion PASS.
> 6. **Loop rule (retry):** required criterion FAIL → validate the gap is real → fix → re-review only the affected criteria. Stop cleanly when all required criteria PASS.
> 7. **Escalation rule (stop):** two consecutive iterations with no criterion progressing, or a blocker needing user input → mark the criterion BLOCKED with a user-facing reason and escalate. NEVER loop indefinitely.
> 8. **Skip rule:** tiny conversational tasks may skip the goal file ONLY with a recorded one-line reason. User-accepted gate skips are recorded in the goal file with reason and scope.
> 9. **Security:** NEVER store secrets, tokens, credentials, or private customer data in goal files — store evidence references and redact sensitive values.
>
> **Blocked until:** active goal resolved (or skip reason recorded) · saved success criteria read before edits · iteration evidence appended after execution · Goal Satisfaction matrix emitted before any PASS verdict.

<!-- /SYNC:goal-contract-satisfaction-loop -->

<!-- SYNC:trade-off-interrogation-gate -->

> **Trade-Off Interrogation Gate** — ALWAYS ask these THREE questions before ANY verdict, score, finding, or recommendation — about the thing under review AND about every recommendation YOU make. — why: naming a benefit without its price is an endorsement, not a review; the costliest trade-offs are the ones nobody wrote down.
>
> 1. **Is there any trade-off?** Name what it SACRIFICES. "None" / "pure win" is an unfinished analysis, NOT an answer — to claim none, state which dimensions you checked and why each is unaffected: future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.
> 2. **Is it worth it?** Weigh gain against sacrifice EXPLICITLY — what is gained (with a metric) · what it costs · WHO pays · WHEN it comes due — then emit **WORTH IT / NOT WORTH IT / UNCLEAR**. "Better" with no metric and no cost FAILS this question. NOT WORTH IT → withdraw or replace the recommendation, never keep it as-is.
> 3. **Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. **MATERIAL** when ANY holds: irreversible / one-way door (data migration, public contract, storage format, vendor lock-in) · cost shifted onto someone else (another team, ops/on-call, future maintainer, end user) · one quality attribute traded for another (correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility) · a boundary crossed (client↔server tier, service contract, event contract, shared library) · a high-consequence path (auth, money, data integrity, breaking change, High/Medium residual risk) · the worth-it verdict is UNCLEAR.
>
> **MATERIAL → STOP and confirm via `AskUserQuestion` BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it via `AskUserQuestion` on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

<!-- /SYNC:trade-off-interrogation-gate -->

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

<!-- SYNC:systematic-review-batching:reminder -->

- **MANDATORY** Large changeset → batch by size cap (≤8 files OR ≤2000 diff-lines), one parallel sub-agent per batch; never review many files one-by-one.
- **MANDATORY** > 6 categories OR > 40 files → add the hierarchical synthesis tier; each concern-synthesizer emits cross-concern interaction candidates and the orchestrator runs the cross-concern pass before concluding.

<!-- /SYNC:systematic-review-batching:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->


<!-- SYNC:category-review-thinking:reminder -->

- **MANDATORY** Derive review categories from file language + directory semantics + change nature; create a sub-task per category.
- **MANDATORY** Derive each category's concerns from first principles with `file:line` evidence — never a fixed checklist.

<!-- /SYNC:category-review-thinking:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:double-round-trip-review:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** run the review loop (aka **Self-Review Convergence Loop**): review → validate findings → fix validated blocking findings → FULL re-review. Any newly produced output/judgment gets ≥1 self-review, and any new judgment ≥1 `/why-review --validate-findings` pass, before it is treated as final.
- **MANDATORY severity floor:** round 1 exits only on zero findings at any severity; from round 2 the bar is zero CRITICAL/HIGH/MEDIUM, so a LOW-only round ENDS the loop once the persisted `minRounds` is met — list every deferred LOW in the report. NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to reach the exit, and NEVER apply the floor to a binary gate (test-green, security must-fix).
- **MANDATORY round cap of 2, extendable ONCE to round 3 — a ceiling, NEVER a target.** A clean pass ends the loop once the persisted `minRounds` is met (default 1; explicit 2 requires an independent pass). Round 2 ending with a validated CRITICAL/HIGH still open (a failed non-test binary gate counts as CRITICAL) grants exactly ONE extra round; round 2 ending with only MEDIUM/`NOT VERIFIABLE` open, or round 3 ending with any review blocker open → **STOP and escalate via `AskUserQuestion`**, never a silent PASS. The 2-repeated-no-progress blocker rule escalates earlier if it trips first. A failing TEST gate has NO round cap and buys no extension — keep fixing and re-running until tests pass, never forcing green.

<!-- /SYNC:double-round-trip-review:reminder -->




<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `AskUserQuestion` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

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

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.
<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

<!-- SYNC:review-principle-awareness -->

> **Review Applicability / Current-Principles Awareness** — Every review must first classify the change context (greenfield foundation, brownfield feature/refactor, test/docs/config/UI/infra, or actor-facing/machine surface) and take notice of the applicable current principles below. This is an evidence-gated applicability check, not a mandate to flag or build every item.
>
> **Detailed protocol routing — read/apply only when warranted:**
> - `SYNC:scale-ready-foundation` — greenfield foundation is blocking; big-feature brownfield fit/adapt/defer; architecture review is advisory when auditing. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`.
> - `SYNC:test-architecture-execution-contract` — assertion-bearing tests use the project's configured/native format, name the guarded intent/technical contract, and assert an owned outcome; GWT is one valid format. Detailed carriers: `integration-test`, `workflow-greenfield-init`, and the test-architecture review path.
> - `SYNC:ai-agent-as-user-access` — when an AI/machine actor or future contract is evidenced, inspect identity/delegation, capability boundaries, selected API/CLI/MCP/WebMCP/event/SDK surface, safety/consent, audit/observability, and native-format contract tests. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`, `architecture-review`.
> - `SYNC:design-system-check` — when UI changes, inspect the design-system and component-contract obligations; route visual/UX depth to the owning UI review.
>
> **Review behavior:** Check only principles applicable to the reviewed scope; record `APPLY-NOW`, `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, `BLOCKED`, or `UNVERIFIED` with `file:line`/config/CI evidence, status/severity, owner/route, and next step/revisit trigger. Do not invent findings from a generic checklist, flag unrelated pre-existing gaps as regressions, silently expand the requested scope, or mutate a parent gate merely because advice exists.
>
> **Ownership:** `changes-review` coordinates the applicability pass and routes depth to the owning specialist (`architecture-review`, `integration-test-review`, `security-review`, `performance-review`, `ui-review`, `production-readiness-review`, or another matching review). A specialist reports its own lens and does not duplicate or override another review's verdict; existing brownfield gaps stay advisory unless new, safety-relevant, or explicitly in scope.
>
> **Required review note:** `context/scope | principle/protocol checked | evidence | status/verdict | severity | owner/route | next step/revisit trigger`.
>
> **BLOCKED when:** an applicable principle is required for safety/correctness but missing, unowned, or untestable. Otherwise record an evidence-backed `NOT-APPLICABLE`, advisory, `DEFER-AS-OPPORTUNITY`, or `UNVERIFIED` result according to the lifecycle and change context; creating a greenfield foundation remains subject to its own blocking protocol.

<!-- /SYNC:review-principle-awareness -->

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** Testability contract: resolve evidence-backed Unit/Integration/System/E2E rows, copy-ready full/focused commands, zero-match failures, owner/root/data, CI/simple-Windows entry, unique run identity, and repeat proof before claiming setup, review, or test completion.
**IMPORTANT MUST ATTENTION Goal:** Ensure changed behavior is covered by tests that protect the selected contract with meaningful owned outcomes, configured repeatability, and canonical-owner alignment; choose the test tier that fits the project's architecture.

**IMPORTANT MUST ATTENTION 8 Gates (judge every one):** G1 Assertion Value (mutation evidence when available, otherwise a manual probe) · G2 Owned Outcome (assert the project-owned result at the selected boundary) · G3 Repeatability (configured identity/isolation and rerun policy) · G4 Behavior Ownership (trace relevant source and owner) · G5 Traceability (configured carrier → owner-qualified case when a case profile applies) · G6 Three-Way Sync (canonical owner > implementation > test; escalate conflicts) · G7 Change Coverage (every behavior-changing file and affected owner case set → inspected executor + assertion) · G8 Scenario Fidelity (setup fits production; synchronize genuinely asynchronous outcomes in ARRANGE).

**IMPORTANT MUST ATTENTION Phases (run ALL, `TaskCreate` each, one `in_progress`):** P0 Scope-detect → P1 Collect (split prod vs test) → P2 Gate Review → P3 Spec Cross-Check (both directions) → P4 Initial Report → P5 Fix validated findings that block the current round + WRITE missing tests → P6 Validated-fix + full fresh re-review until the current severity bar is clear → P7 Build & run ALL tests → P8 Failure Investigation → P9 Why-Review self-validation.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** Traced `file:line` proof per claim; confidence >80% to act.
- **Evidence:** Speculation forbidden; cite evidence, state confidence, NEVER guess.
- **Double Round-Trip Review:** Validate findings, fix only current-round blocking findings, then full fresh re-review until the severity bar is clear (Round 1: zero findings; Round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred; binary gates always block).
- **Repeatable Test Principle:** Unique IDs, additive-only, no cleanup; ALWAYS async-poll DB asserts.
- **Parallel-Safe Test Isolation:** Own fresh per-test data; never a shared mutable entity; account for cross-cutting consumers wiping a shared parent; suspect contamination FIRST on contradiction; prove isolation by grep.
- **Real-World Fidelity:** the setup's sequence, pacing, and data must be reachable in production; settle barriers on a real observable belong in ARRANGE — NEVER a widened assertion timeout, a blind sleep, or a retry around a failing assertion; label deliberate impossible-state tests with why the state is reachable.
- **Source/Test Drift Check:** Source change → reinspect affected tests for intended behavior.
- **Spec↔Tests↔Code Triangulation:** the unit of review is the WHOLE PACKAGE (selected canonical owner + tests + code) — load all three, reason mutual-consistency first; a disagreeing or missing face is a logged finding, NEVER a silent PASS.
- **Spec Drift Adjudication:** on behavior divergence from the canonical owner, classify CODE-WRONG / SPEC-STALE / AMBIGUOUS / SPEC-SILENT and route any unwritten invariant to the owner's declared contract plus a guarding test — NEVER normalize drift to whichever side is green.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** Expand child phases, link parent, one `in_progress`.
- **Project Reference Docs Guide:** Read required project docs (ALWAYS `lessons.md`) before target work.
- **Task Tracking External Report:** Bootstrap tasks; persist findings to `tmp/reports/` incrementally.
- **Systematic Review Batching:** Large changeset → size-capped parallel batches; NEVER one-by-one.
- **Severity Rubric:** Classify by consequence using `SYNC:severity-rubric`; round 1 blocks on every validated finding, round 2 blocks only CRITICAL/HIGH/MEDIUM, LOW is recorded/deferred, and failed binary gates always block.
- **Category Review Thinking:** Derive each category's concerns from first principles, NEVER a fixed checklist.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** scope = the CHANGE SET (production + test files) — NEVER review only the test files; Gate 7 coverage mapping is NOT optional — why: a test-files-only scope reviews tests that exist and misses changed behavior that has none
**IMPORTANT MUST ATTENTION** read the selected canonical owner and handler/service source BEFORE judging any assertion — cannot review what you have not read — why: assertion quality is unknowable without knowing intended behavior and what the handler actually writes
**IMPORTANT MUST ATTENTION** every finding requires `file:line` proof with confidence >80% to act, 60-80% verify first, <60% DO NOT report — NEVER speculate; "Insufficient evidence" is valid output — why: AI reports inherit confirmation bias; unproven severities propagate downstream as ground truth
**IMPORTANT MUST ATTENTION** bootstrap `TaskCreate` for ALL 9 phases BEFORE starting; on context loss call `TaskList` first and resume, never duplicate — why: phase tracking is the only recovery anchor after compaction
**IMPORTANT MUST ATTENTION** search 3+ existing test patterns and the project's test reference docs (`integration-test-reference.md` via grep, NEVER hardcoded paths) before judging conventions; evaluate pattern FIT (same base class, scope, DI path) before copying a nearby example — why: local conventions override generic framework defaults
**IMPORTANT MUST ATTENTION** every behavior-changing production change needs a covering test at an appropriate boundary; missing coverage is a HIGH finding minimum (CRITICAL on auth/money/data-integrity), fixed by WRITING the test in Phase 5, not just reporting
**IMPORTANT MUST ATTENTION** resolve the profile and run the Phase 1 full affected-owner case task + Phase 3 addendum EVERY review (inside a workflow, current git changes present, or by user request) — enumerate the full owner case/variant set, not only diff-touched cases, into the SAME Coverage Mapping Table; strict default means the full Section 8 TC list; require zero `GAP`/`UNKNOWN` rows before PASS — why: Gate 7 alone is diff-scoped and misses a pre-existing case whose covering test regressed outside the diff
**IMPORTANT MUST ATTENTION** Gate 1 mutation probe is non-skippable — record the Mutation Probe Ledger (KILLED/SURVIVOR per changed core-logic line); no ledger = Gate 1 FAIL, not "skipped" — why: a surviving mutant is a fakeable test that protects no invariant
**IMPORTANT MUST ATTENTION** contract alignment runs BOTH directions — from test carriers to canonical cases AND from changed code back to the selected owner; missing or stale-but-covered case = SPEC-GAP — why: a covering test whose owner contract documents old behavior passes a spec gap silently
**IMPORTANT MUST ATTENTION** a test that cannot fail is decoration — if it cannot catch the protected business rule/invariant breaking, delete or fix it; flag smoke-only/existence-only/dead assertions as FAIL unless justified by explicit design comment
**IMPORTANT MUST ATTENTION** tests MUST follow project-supported isolation/repeat policy; use unique IDs for shared namespaces, owned cleanup where configured, and bounded synchronization for asynchronous outcomes; verification follows `integrationTestVerify.guidance` — why: repeatability must reflect how this project actually runs tests
**IMPORTANT MUST ATTENTION** Gate 3 also enforces parallel-safe isolation — FAIL any test hanging assertions off a shared mutable entity another test can change, or off a parent a bulk cross-cutting consumer (re-sync/recompute/rebuild/cascade) can wipe even without this test mutating it; require fresh per-test data and prove isolation by grepping other tests on that shared data AND every consumer over it; on a contradiction between a provably-innocent path and wrong state, suspect contamination FIRST — why: shared mutable state lets another test silently corrupt your data and the innocent path takes the blame
**IMPORTANT MUST ATTENTION** Gate 8 — an unrealistic setup is a REVIEW FINDING, not a tolerable quirk: flag actor actions chained with no settle barrier where production separates them by seconds/minutes/hours, a fixed sleep standing in for a real observable, an assertion timeout widened instead of an ARRANGE barrier added, a retry wrapped around a failing assertion, and a setup state with no explanation of how production reaches it — fix the SCENARIO, NEVER the assertion — why: a scenario production can never meet proves nothing when green and blames the product when red
**IMPORTANT MUST ATTENTION** Gate 6 — read ALL three sources before classifying (never two); NEVER fix a test to match broken code (report the code bug instead); NEVER self-resolve a three-way conflict (escalate via `AskUserQuestion`); "stale docs" requires BOTH impl code AND test to agree — why: a winner picked without evidence hides bugs
**IMPORTANT MUST ATTENTION** fix ALL blocking issues (Phase 5 NOT optional); validate findings via `/why-review` before fixing; after validated fixes rerun a full fresh review until the current round's bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred) — why: every fix invalidates the prior verdict
**IMPORTANT MUST ATTENTION** integration-test reviews ALWAYS spawn the `integration-tester` sub-agent, NEVER `code-reviewer`, with all protocol bodies embedded VERBATIM — why: `code-reviewer` lacks case-contract traceability and async-polling assertion depth, and file-path indirection drops compliance ~40%
**IMPORTANT MUST ATTENTION** build and run ALL changed/reviewed tests after fixes (Phase 7 NOT optional) — unverified reviews have zero value; if tests fail, classify (test bug vs service bug vs environment) and root-cause in Phase 8, NEVER retry blindly
**IMPORTANT MUST ATTENTION** write findings to `tmp/reports/integration-test-review-{date}-{slug}.md` incrementally — never just return text — why: long sub-agents hit cutoffs before a final batch write and lose findings
**IMPORTANT MUST ATTENTION** every finding requires `file:line` proof with confidence >80%; scope = the CHANGE SET, never just tests; read the relevant production path BEFORE judging assertions
**IMPORTANT MUST ATTENTION** preserve the complete change-set scope, evidence-backed Gate 1–8 review, and two-round validation bar before reporting PASS.

**Anti-Rationalization:**

| Evasion                                   | Rebuttal                                                          |
| ----------------------------------------- | ----------------------------------------------------------------- |
| "Smoke test is fine for now"              | No smoke test earns its place. Fix or delete.                     |
| "Handler source too long to read"         | Cannot judge assertion quality without reading. REQUIRED.         |
| "Re-review after fixes is overkill"       | Fixes changed the target. A full fresh review is required before PASS. |
| "Tests were passing before"               | Passing ≠ correct. Dead assertions always pass.                   |
| "Conflict is obvious, I can self-resolve" | Three-way conflict requires escalation. NEVER self-resolve.       |
| "Phase 6/7/8 optional for small fixes"    | No exceptions. Every validated fix requires full re-review + build verification. |
| "0 test files, nothing to review"         | Production changes without tests ARE the review — run Gate 7 coverage mapping. |
| "A unit test is enough here"              | Integration-first. Unit fallback requires recorded infeasibility justification. |
| "Test with matching name exists = covered" | Read it. Coverage means it exercises the changed path and asserts the changed outcome. |
| "Specs can be updated later"              | Spec-driven development: missing/stale TC is a SPEC-GAP finding, fixed in this review. |
| "I checked the mutants mentally"          | No ledger = Gate 1 FAIL. The Mutation Probe Ledger is the only proof the probe ran. |
| "My finding list is obviously right"      | AI reports inherit confirmation bias. Validate via `/why-review` before fixing. |
| "Name match counts as coverage"           | Read the test — coverage requires exercising the changed path AND asserting its outcome. |
| "It shares an existing entity, that's fine" | Shared mutable state is the single point another test corrupts. Require fresh per-test data; only immutable lookup data may be shared. |
| "This test never mutates that parent"     | A cross-cutting consumer wipes the shared parent without this test touching it. Sharing is unsafe even without direct mutation. |
| "The path under test is correct, test passes elsewhere" | Provably-innocent path + wrong state = suspect cross-test interference FIRST. Grep other tests + cross-cutting consumers before clearing. |
| "The setup is unrealistic but the assertion is strong" | A strong assertion over a scenario production can never reach is still a defective test. Gate 8 finding — fix the scenario. |
| "It just needed a longer timeout"         | A widened assertion timeout is masking, not a fix. The barrier belongs in ARRANGE, on a real observable. |
| "A sleep there is harmless"               | A blind sleep passes or fails by luck. Name the observable that proves the prior step finished, or comment why none exists. |

---

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.
