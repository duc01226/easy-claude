---
name: integration-test-review
description: '[Code Quality] Use when a workflow step or the user asks for an integration test review. Checks assertion quality, bug protection, repeatability, and spec-traceable coverage of changed code.'
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
- **Testability contract:** resolve Unit/Integration/System/E2E applicability from runner/config evidence; record owner/root/data, copy-ready full + focused commands, zero-match behavior, CI/simple Windows/macOS/Linux entry, identity or isolation guarantee, and repeat proof; unresolved applicable fields block handoff, while non-applicable tiers require evidence-backed `N/A`.

- **Purpose:** Review target is the CHANGE (collect BOTH changed production code AND changed test files), never just the test files — Gates 1-6 and 8 judge test quality, Gate 7 maps every behavior-changing production file to a covering test (integration-first; unit only with recorded justification) + the selected canonical case. Uncovered changed behavior = HIGH finding minimum.
- **The 8 Gates (main review steps):** G1 Assertion Value — mutation-score when available, otherwise an evidence-backed mutation probe; G2 Owned Outcome — assert the system-owned result at the selected boundary; G3 Repeatability — verify project-configured isolation/repeat behavior; G4 Behavior Ownership — compare assertions with the actual contract owner; G5 Spec Traceability — configured test carrier → canonical case (strict default only; native cardinality is preserved); G6 Three-Way Sync — canonical owner > implementation > test, with configured derived views at their declared authority; G7 Change Coverage — every behavior-changing file → covering test + applicable canonical case; G8 Scenario Fidelity — setup sequence, pacing, and data must fit the actual production path; use an ARRANGE barrier only for genuinely asynchronous outcomes.
- **The phase pipeline (run ALL, task tracking each):** P0 Scope-detect → P1 Collect (split prod vs test files) → P2 Gate Review (Gates 1-6 + 8 per file, Gate 7 across set) → P3 Spec Cross-Check (both directions) → P4 Initial Report → P5 Fix validated findings that block the current round + WRITE missing tests → P6 Validated-fix + full fresh re-review until the current severity bar is clear → P7 Build & run ALL tests → P8 Failure Investigation → P9 Why-Review self-validation.
- **Read the canonical owner and relevant production source BEFORE judging any assertion.** FAIL smoke-only, existence-only (not-null), dead (always-true), or copy-paste assertions when they do not prove the claimed contract. A dependency-container resolution test is valid only when wiring itself is the selected contract — why: assertion quality is unknowable without intended behavior and its owner.
- **Don't just report gaps — fix them.** Gate 6: NEVER fix a test to match broken code, NEVER self-resolve a three-way conflict (escalate by asking the user directly). Phase 5 WRITES a missing test and uses the canonical owner's declared authoring procedure for a validated SPEC-GAP; the strict default uses `$spec [mode=tests]`. A full fresh re-review runs after every validated fix cycle until the current round's bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred).
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
| 0 changes at all                             | Empty target        | Ask user for explicit scope by asking the user directly                                                            |

**The review target is the CHANGE, not the test files.** Changed test files are reviewed for quality (Gates 1-6 and 8); changed production files are checked for coverage and spec alignment (Gate 7). Both halves are mandatory.

**Search for test reference docs** — NEVER hardcode paths. Grep for `integration-test-reference`, `test-patterns`, `integration-test-guide` near changed test files to discover project-specific conventions before starting gate review.

## Test Architecture Contract Preflight (cross-cutting; before Gate 1)

This is a non-numbered preflight alongside the eight quality gates. Review the matrix and evidence before judging individual assertions, then carry its findings into the same report; it does not replace or renumber Gates 1–8.

| Tier | Applicability evidence | Owner / test root | Runner/framework | Full command | Focused/partial command | Zero-match behavior | Data and repeat evidence | Parallel isolation | Simple Windows/macOS/Linux entry point |
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
- NEVER self-resolve a three-way conflict — always escalate by asking the user directly
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
- **SPEC-GAP (FAIL)** — behavior has no applicable canonical case, OR a covering test exists but its mapped case still describes old/superseded intent. Use the canonical owner's authoring procedure; the strict default uses `$spec [mode=tests]` UPDATE.
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
| **Retry wrapped around a failing assertion** — a retry/loop added around the ACT+ASSERT pair after a red run                                                               | CRITICAL                                                                       | Revert the retry; adjudicate the intermittency (`$integration-test-verify`) before any change                                             |
| **Fidelity improvement that weakened the protected invariant** — the scenario became realistic and the assertion became looser in the same change                          | HIGH                                                                           | Keep the assertion; find a DIFFERENT realistic scenario that still exercises the rule                                                     |

**PASS:** Every actor step in ARRANGE could occur in production in that order and at that pacing; every wait is an ARRANGE-phase barrier on a real observable (or a commented fixed delay where no observable exists); any deliberately impossible state carries a comment naming WHY production could reach it (upstream bug, partial write, legacy data).

**FAIL:** Any trigger row fires with no recorded justification.

**Verify:** Read the test end-to-end as a production trace — per actor step ask "what separates this from the previous step in real life, and what does the test wait on?" Then grep the test file (and, when reviewing a change, its diff) for sleep/delay calls, retry/poll wrappers, and enlarged timeout arguments; every hit is a candidate row above. A trigger that fires in the DIFF (a wait that grew, a retry that appeared) outranks one that merely pre-existed — it is evidence of masking in progress.

---

## Review Protocol (9 Phases)

Use task tracking for EACH phase before starting.

**Phase 1 — Collect:** Split the change set: production files (Gate 7 coverage targets) vs test files. Categorize test files: new (full review), modified (changed methods only), new projects (infra + samples). Categorize production files: behavior-changing vs excluded (with reason).

> **MANDATORY task — "Validate full affected-owner case coverage."** Create as its own named task tracking item in Phase 1. Non-skippable whenever this review runs inside a workflow, current git changes are present, or the user requests review; the only exception is a user-narrowed single-case/test review. Resolve every canonical owner implicated by the change set and inspect its full affected case/variant set, independent of which cases the diff touches. The strict default enumerates all Section 8 TCs. A native profile uses its configured owner and case identities. Record owner + case + variant, actual executor, inspected assertion, and status in the same Coverage Mapping Table.

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
8. New behavior with no canonical case → `SPEC-GAP` (Gate 7); route correction through the selected owner's authoring procedure. The strict default uses `$spec [mode=tests]` and `$spec` when business rules changed.

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
3. **Gate 7 GAP fixes:** WRITE the missing test — integration test first (route through `$integration-test` patterns); unit test only with recorded justification. SPEC-GAP fixes: update the selected canonical owner through its declared procedure; the strict default uses `$spec [mode=tests]` UPDATE before or alongside the test.
4. **Gate 8 fidelity fixes:** repair the SCENARIO, never the assertion — add the ARRANGE-phase settle barrier on a real observable, restore any widened assertion timeout to its original window, remove any retry wrapped around a failing assertion, and comment a deliberate impossible-state setup with why production could reach it
5. NEVER weaken assertions to make tests pass — fix root cause (timing, data, setup) instead
6. Re-read changed files to verify fix correctness
7. Record each fix with `file:line` under `## Fixes Applied`

**Phase 6 — Validated Fix + Full Re-Review (MANDATORY when fixes are applied):**

Do not spawn a fresh reviewer to re-review the same findings before validation/fix. After Phase 5 applies validated fixes, run a full fresh review over the current test scope. When that review uses sub-agents, spawn fresh `integration-tester` sub-agents (parallel by module for 10+ files; single agent otherwise) using canonical Agent template from `SYNC:review-protocol-injection`. Each sub-agent re-reads ALL target test files from scratch with ZERO memory of Phase 2/5. When constructing Agent call prompt:

1. Copy Agent call shape from `SYNC:review-protocol-injection` template verbatim
2. Set `agent_type: "integration-tester"`
3. Embed full verbatim body of 9 SYNC blocks (all present inline in this skill file): `SYNC:evidence-based-reasoning`, `SYNC:bug-detection`, `SYNC:design-patterns-quality`, `SYNC:logic-and-intention-review`, `SYNC:test-spec-verification`, `SYNC:fix-layer-accountability`, `SYNC:rationalization-prevention`, `SYNC:graph-assisted-investigation`, `SYNC:understand-code-first`
4. Task field: `"Resolve the selected case profile, then run a full fresh integration-test review pass over {file-list} after validated fixes. Review all 8 quality gates: assertion value, owned outcome, repeatability, behavior ownership, traceability, three-way sync, change coverage, scenario fidelity. Read the canonical owner and relevant production source BEFORE judging assertions. Flag smoke-only, existence-only, dead assertions, and setup that bypasses the behavior under test. Gate 3 uses the project's configured repeat/concurrency policy and isolates shared mutable state. Gate 7: map every behavior-changing file in {changed-production-file-list} and every case/variant in the full affected owner scope to the actual executor and inspected assertion, using the test tier appropriate to the project architecture; strict default uses Section 8 TCs. Preserve configured cardinality, including declared many-to-many mappings; never invent per-variant runner results. Uncovered behavior is a HIGH finding minimum; missing/stale cases are SPEC-GAP; unresolved evidence is UNKNOWN, never PASS. Gate 8: flag unreachable setup, unsupported pacing, blind sleeps, widened assertion timeouts, and retries around failing assertions. Source-of-truth follows the configured canonical owner and declared projections; classify disagreements and escalate unresolved intent."`
5. Target Files: explicit file list (never pass inline contents)
6. Reference Docs: include `integration-test-reference.md` from the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path)
7. Report path: `tmp/reports/integration-test-review-rerun{N}-{date}.md`

After sub-agents return:

1. **Read** each sub-agent's report
2. **Integrate** findings as `## Re-Review {N} Findings` — DO NOT filter or override
3. **If new CRITICAL/HIGH:** validate the new finding set before any additional fixes
4. **Repeat only after another fix cycle:** restart the full review again after validated fixes are applied; if the same blocker repeats across 2 full invocations with no progress, escalate by asking the user directly
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

> **MANDATORY — NO EXCEPTIONS:** If NOT already in a workflow, MUST use ask the user directly to ask user:
>
> 1. **Activate `workflow-write-integration-test` workflow** (Recommended) — investigate → spec [mode=tests] → artifact-review --type=spec-tests → integration-test → integration-test-review → integration-test-verify → spec [mode=sync] → docs-update → workflow-end → watzup
> 2. **Execute `$integration-test-review` directly** — run standalone

---

## Phase 9: Why-Review Self-Validation Gate (MANDATORY when findings exist)

> **Purpose:** Adversarial validation of own findings BEFORE handoff. Catches over-flagged Highs, false positives, and severity inflation at the source rather than letting them propagate downstream.

**Trigger:** Any finding produced (Critical, High, Medium, OR Low). Skip ONLY when the report's verdict is unconditional PASS with literally zero findings.

**Protocol:**

1. Read own finalized report from `tmp/reports/{skill}-{date}-{slug}.md`
2. Invoke `$why-review` skill with arg: `validate findings in tmp/reports/{skill}-{date}-{slug}.md — verify each finding has file:line proof, steel-man each rejected interpretation, and stress-test severity classifications`
3. Read the validation verdict path returned by why-review, expected as `tmp/reports/why-review-validate-{date}.md`
4. **If why-review demotes/removes any finding:** UPDATE own finalized report with revised severities, remove false positives, and add a `## Why-Review Validation Notes` section citing what changed and why
5. **If why-review confirms all findings:** Append `## Why-Review Validation` line to own report stating "All N findings re-validated against actual code; no severity changes."

**Skip conditions (record explicit reason if skipping):**

- Verdict is unconditional PASS with zero findings → log "Skipped — no findings to validate"
- Why-review skill itself is the active context (avoid recursion)

**Why this exists:** AI sub-agent reports inherit confirmation bias — the orchestrator absorbs severity claims as ground truth. The 2026-05-09 review incident produced 5 Highs; adversarial validation demoted 3 of them. Codify this as standard practice.

---

## Next Steps

**MANDATORY — NO EXCEPTIONS** after completing, MUST use ask the user directly:

- **"$integration-test-verify (Recommended)"** — Run integration tests to verify all pass
- **"$workflow-review-changes"** — Review all changes before committing
- **"Skip, continue manually"** — user decides

---

## Related Skills

| Skill                      | Relationship                                                           | When to Call                                                                   |
| -------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `$integration-test`        | **Producer** — generates tests this skill reviews                      | Always preceded by $integration-test                                           |
| `$integration-test-verify` | **Successor** — runs tests after review clears                         | Call after review passes all 8 gates                                           |
| `$spec [mode=tests]`                | **Case producer** — reads/updates the selected canonical owner; strict default uses Section 8 TCs | If Gate 5 finds an orphan or stale case → use the selected profile's `$spec [mode=tests]` update path |
| `$spec-index`              | **Derived view** — refreshes a declared navigation/index projection; it never replaces the canonical owner | Refresh only when the selected profile declares the view and its inputs changed |
| `$spec`            | **Canonical owner procedure** — Gate 6 compares implementation/tests with the profile-selected owner | If Gate 6 finds conflict, use its declared authority and escalation rules |
| `$docs-update`             | **Documentation sync** — updates only the configured affected doc owners | Call for confirmed downstream documentation changes; preserve the canonical owner's authoring procedure |

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
  │    │    → Write the missing test — integration-first via $integration-test
  │    │    → Unit test fallback ONLY when integration infeasible — record justification
  │    │    → User waiver (verbatim, with reason) is the only alternative
  │    │
  │    └─ SPEC-GAP (changed behavior, no/stale canonical case):
  │         → use the selected owner's authoring procedure ($spec [mode=tests] UPDATE for the strict default)
  │         → use $spec [update] when business rules changed
  │         → link the corrected owner/case identity to its inspected executor and assertion (Gate 5)
  │
  ├─ Gate 6 (Three-Way Sync) conflict resolution:
  │    │
  │    ├─ Test code ≠ canonical owner (contract says behavior A, test asserts behavior B):
  │    │    → Apply the profile's owner hierarchy; unresolved intent stays AMBIGUOUS and requires user confirmation.
  │    │    → If the owner governs: fix the test to match it → re-run $integration-test.
  │    │    → If a confirmed intent change makes the owner stale: update the owner via its declared procedure, then reconcile tests; strict default: $spec [update] → $spec [mode=tests] [UPDATE].
  │    │
  │    ├─ Test code ≠ implementation (test asserts X, code does Y):
  │    │    → If CODE is correct: fix the test; update the canonical owner only if an authorized decision confirms its contract is stale (strict default: $spec [mode=tests] UPDATE)
  │    │    → If TEST is correct (code bug): do NOT update test → fix code → re-run tests
  │    │
  │    └─ Derived view ≠ canonical owner:
  │         → Use the profile-declared owner and derived-view authority; the strict default's Feature Spec outranks its index/ERD.
  │         → Re-derive the view only through its declared generator (strict default: $spec-index).
  │         → Do NOT self-resolve an ambiguous owner conflict — escalate to the user.
  │
  ├─ [REQUIRED] → $integration-test-verify
  │     After all fixes, run actual tests to confirm all gates pass.
  │
  ├─ [REQUIRED] → selected owner/test sync procedure (strict default: $spec [mode=sync])
  │     If canonical cases were updated (Gate 5/6 fix), reconcile the selected owner ↔ executing test code.
  │
  └─ [RECOMMENDED] → $docs-update
        Use only for confirmed affected downstream documentation; the selected canonical owner keeps its declared authoring/sync procedure.
```

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.
> **A test that cannot fail is not a test — it is decoration.** Every test MUST earn existence by proving it would FAIL if the protected business rule/invariant changed or the bug it guards were reintroduced.
> Every finding requires `file:line` proof with confidence >80%.

<!-- OVERRIDE:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable.
>
> **Why:** The main agent knows what it (or `$feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** After a validated-finding fix cycle, or to satisfy an explicitly declared independent-pass `minRounds`. A review round that finds zero issues ENDS the loop once that persisted minimum is met — do NOT invent a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `spawn_agent` tool calls — use `integration-tester` agent_type (integration-test reviews ALWAYS spawn `integration-tester`, NOT `code-reviewer`)
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. A reviewer prompt carries every protocol body inline and is never handed a path to go read (the reviewer-prompt rule of `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `tmp/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior full review found zero issues AND the persisted `minRounds` is met (no fixes or required independent pass = nothing new to verify)
> - NEVER skip the full review restart after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `spawn_agent` call
> - Continue until a complete full review pass clears the current round's exit bar and persisted `minRounds` (round 1: zero findings; round 2 and the conditional round 3: zero CRITICAL/HIGH/MEDIUM, LOW deferred). The budget is 2 rounds plus ONE extension to round 3, granted only when round 2 leaves a validated CRITICAL/HIGH open (a failed non-test binary gate counts as CRITICAL); round 3 is the review hard cap. A failing test gate is not budgeted — keep fixing and re-running until the tests pass, never forcing green. If the same validated blocker repeats across 2 full invocations with no progress, or the budget is spent with blocking findings open, escalate by asking the user directly
> - Persist completed rounds, repeated blockers, findings and the explicit minimum in the owning run's `review-policy.cjs` record. Resume that record after interruption; target changes invalidate evidence and acceptance but preserve the bounded round budget. In-flight attempt IDs may be session-local; they do not replace or reset completed-round state

<!-- /OVERRIDE:fresh-context-review -->

## Sub-Agent Type Override

> **MANDATORY:** Integration-test reviews spawn the `integration-tester` sub-agent, NOT `code-reviewer`.
> Keep `agent_type: "integration-tester"` from the canonical template below; NEVER revert to `code-reviewer`.
> **Rationale:** `integration-tester` specializes in integration-test generation, case-contract traceability, CQRS test patterns, async-polling / eventual-consistency assertion correctness, and cross-service integration context — areas `code-reviewer` does not cover at depth.

<!-- OVERRIDE:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 11 protocol blocks VERBATIM, copied WHOLESALE and unmodified. They are the review-tier renderings of their canonical `SYNC:` tags, not literal copies; when a canonical protocol changes, update the matching body here in the same edit. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** A fresh reviewer must hold every rule it reviews against from its first token; a path or a placeholder would make it depend on a file read, or on a hook that may not fire for it. Reviewer prompts are therefore the one place the hybrid policy (`SYNC:shared-protocol-duplication-policy`) always keeps full bodies: the template carries all 11 protocol bodies pre-embedded, and the orchestrator copies it wholesale.

### Subagent Type Selection

- `integration-tester` — ALWAYS for integration-test reviews (test files, profile-owned case traceability, CQRS/async assertion correctness)
- `code-reviewer` — for general code-quality reviews only (NOT integration tests)

### Canonical Agent Call Template (Copy Verbatim)

```
spawn_agent({
  description: "Fresh Round {N} review",
  agent_type: "integration-tester",
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
- "Just do it" → Still need task tracking. Skip depth, never skip tracking.
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
- Test Architecture Contract: matrix (tier applicability, owner/root, runner, full/focused commands, zero-match behavior, CI/simple Windows/macOS/Linux entry point), command-validity result, unique/additive data result, parallel-isolation result, and exact execution evidence or explicit N/A
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
- DO choose `integration-tester` agent_type — integration-test reviews ALWAYS use `integration-tester`, never `code-reviewer`
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /OVERRIDE:review-protocol-injection -->

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `category-review-thinking` — Derive review concerns per category of changed files from domain knowledge; reviewing a changeset that spans several file categories → .claude/skills/shared/protocols/category-review-thinking.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `double-round-trip-review` — Validated-finding fix loop: review, validate, fix, then a fresh full re-review, capped at two rounds; running a review that fixes findings and must re-review until the severity bar clears → .claude/skills/shared/protocols/double-round-trip-review.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `goal-contract-satisfaction-loop` — Save the goal in a file and loop until every saved criterion passes; executing work against a user goal → .claude/skills/shared/protocols/goal-contract-satisfaction-loop.md
- `integration-test-execution-discipline` — How integration tests are written, reviewed, run, diagnosed and cleared; working in the integration-test skill family → .claude/skills/shared/protocols/integration-test-execution-discipline.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `real-world-fidelity-testing` — Integration, E2E and system tests exercise real boundaries; authoring, reviewing or repairing integration, E2E or system tests → .claude/skills/shared/protocols/real-world-fidelity-testing.md
- `repeatable-test-principle` — Same contract result across fresh runs and supported concurrency; writing or reviewing tests → .claude/skills/shared/protocols/repeatable-test-principle.md
- `review-principle-awareness` — Classify the change context first, then apply the current principles that fit it; starting any review → .claude/skills/shared/protocols/review-principle-awareness.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md
- `spec-drift-adjudication` — Decide code-wrong versus spec-stale from evidence, never silently; behavior diverges from its spec → .claude/skills/shared/protocols/spec-drift-adjudication.md
- `spec-tests-code-triangulation` — Review spec, tests and code together for mutual consistency first; reviewing behavior that has a spec → .claude/skills/shared/protocols/spec-tests-code-triangulation.md
- `systematic-review-batching` — Map-reduce review: size-capped batches, one sub-agent per batch, then reduce; reviewing a large changeset → .claude/skills/shared/protocols/systematic-review-batching.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
- `test-data-isolation` — Tests stay independent across the supported concurrency modes; writing stateful tests → .claude/skills/shared/protocols/test-data-isolation.md
- `test-failure-fault-adjudication` — Decide whether the source or the test is at fault before editing either; a test fails → .claude/skills/shared/protocols/test-failure-fault-adjudication.md
- `trade-off-interrogation-gate` — Three trade-off questions before any verdict, score or recommendation; rendering a verdict or recommending an option → .claude/skills/shared/protocols/trade-off-interrogation-gate.md

<!-- PROTOCOL-GUIDES:END -->

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

- **MANDATORY IMPORTANT MUST ATTENTION** run the review loop (aka **Self-Review Convergence Loop**): review → validate findings → fix validated blocking findings → FULL re-review. Any newly produced output/judgment gets ≥1 self-review, and any new judgment ≥1 `$why-review --validate-findings` pass, before it is treated as final.
- **MANDATORY severity floor:** round 1 exits only on zero findings at any severity; from round 2 the bar is zero CRITICAL/HIGH/MEDIUM, so a LOW-only round ENDS the loop once the persisted `minRounds` is met — list every deferred LOW in the report. NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to reach the exit, and NEVER apply the floor to a binary gate (test-green, security must-fix).
- **MANDATORY round cap of 2, extendable ONCE to round 3 — a ceiling, NEVER a target.** A clean pass ends the loop once the persisted `minRounds` is met (default 1; explicit 2 requires an independent pass). Round 2 ending with a validated CRITICAL/HIGH still open (a failed non-test binary gate counts as CRITICAL) grants exactly ONE extra round; round 2 ending with only MEDIUM/`NOT VERIFIABLE` open, or round 3 ending with any review blocker open → **STOP and escalate by asking the user directly**, never a silent PASS. The 2-repeated-no-progress blocker rule escalates earlier if it trips first. A failing TEST gate has NO round cap and buys no extension — keep fixing and re-running until tests pass, never forcing green.

<!-- /SYNC:double-round-trip-review:reminder -->




<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm by asking the user directly BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** ask the user directly reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

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

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** Testability contract: resolve evidence-backed Unit/Integration/System/E2E rows, copy-ready full/focused commands, zero-match failures, owner/root/data, CI/simple Windows/macOS/Linux entry, unique run identity, and repeat proof before claiming setup, review, or test completion.
**IMPORTANT MUST ATTENTION Goal:** Ensure changed behavior is covered by tests that protect the selected contract with meaningful owned outcomes, configured repeatability, and canonical-owner alignment; choose the test tier that fits the project's architecture.

**IMPORTANT MUST ATTENTION 8 Gates (judge every one):** G1 Assertion Value (mutation evidence when available, otherwise a manual probe) · G2 Owned Outcome (assert the project-owned result at the selected boundary) · G3 Repeatability (configured identity/isolation and rerun policy) · G4 Behavior Ownership (trace relevant source and owner) · G5 Traceability (configured carrier → owner-qualified case when a case profile applies) · G6 Three-Way Sync (canonical owner > implementation > test; escalate conflicts) · G7 Change Coverage (every behavior-changing file and affected owner case set → inspected executor + assertion) · G8 Scenario Fidelity (setup fits production; synchronize genuinely asynchronous outcomes in ARRANGE).

**IMPORTANT MUST ATTENTION Phases (run ALL, task tracking each, one `in_progress`):** P0 Scope-detect → P1 Collect (split prod vs test) → P2 Gate Review → P3 Spec Cross-Check (both directions) → P4 Initial Report → P5 Fix validated findings that block the current round + WRITE missing tests → P6 Validated-fix + full fresh re-review until the current severity bar is clear → P7 Build & run ALL tests → P8 Failure Investigation → P9 Why-Review self-validation.

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
**IMPORTANT MUST ATTENTION** bootstrap task tracking for ALL 9 phases BEFORE starting; on context loss call the current task list first and resume, never duplicate — why: phase tracking is the only recovery anchor after compaction
**IMPORTANT MUST ATTENTION** search 3+ existing test patterns and the project's test reference docs (`integration-test-reference.md` via grep, NEVER hardcoded paths) before judging conventions; evaluate pattern FIT (same base class, scope, DI path) before copying a nearby example — why: local conventions override generic framework defaults
**IMPORTANT MUST ATTENTION** every behavior-changing production change needs a covering test at an appropriate boundary; missing coverage is a HIGH finding minimum (CRITICAL on auth/money/data-integrity), fixed by WRITING the test in Phase 5, not just reporting
**IMPORTANT MUST ATTENTION** resolve the profile and run the Phase 1 full affected-owner case task + Phase 3 addendum EVERY review (inside a workflow, current git changes present, or by user request) — enumerate the full owner case/variant set, not only diff-touched cases, into the SAME Coverage Mapping Table; strict default means the full Section 8 TC list; require zero `GAP`/`UNKNOWN` rows before PASS — why: Gate 7 alone is diff-scoped and misses a pre-existing case whose covering test regressed outside the diff
**IMPORTANT MUST ATTENTION** Gate 1 mutation probe is non-skippable — record the Mutation Probe Ledger (KILLED/SURVIVOR per changed core-logic line); no ledger = Gate 1 FAIL, not "skipped" — why: a surviving mutant is a fakeable test that protects no invariant
**IMPORTANT MUST ATTENTION** contract alignment runs BOTH directions — from test carriers to canonical cases AND from changed code back to the selected owner; missing or stale-but-covered case = SPEC-GAP — why: a covering test whose owner contract documents old behavior passes a spec gap silently
**IMPORTANT MUST ATTENTION** a test that cannot fail is decoration — if it cannot catch the protected business rule/invariant breaking, delete or fix it; flag smoke-only/existence-only/dead assertions as FAIL unless justified by explicit design comment
**IMPORTANT MUST ATTENTION** tests MUST follow project-supported isolation/repeat policy; use unique IDs for shared namespaces, owned cleanup where configured, and bounded synchronization for asynchronous outcomes; verification follows `integrationTestVerify.guidance` — why: repeatability must reflect how this project actually runs tests
**IMPORTANT MUST ATTENTION** Gate 3 also enforces parallel-safe isolation — FAIL any test hanging assertions off a shared mutable entity another test can change, or off a parent a bulk cross-cutting consumer (re-sync/recompute/rebuild/cascade) can wipe even without this test mutating it; require fresh per-test data and prove isolation by grepping other tests on that shared data AND every consumer over it; on a contradiction between a provably-innocent path and wrong state, suspect contamination FIRST — why: shared mutable state lets another test silently corrupt your data and the innocent path takes the blame
**IMPORTANT MUST ATTENTION** Gate 8 — an unrealistic setup is a REVIEW FINDING, not a tolerable quirk: flag actor actions chained with no settle barrier where production separates them by seconds/minutes/hours, a fixed sleep standing in for a real observable, an assertion timeout widened instead of an ARRANGE barrier added, a retry wrapped around a failing assertion, and a setup state with no explanation of how production reaches it — fix the SCENARIO, NEVER the assertion — why: a scenario production can never meet proves nothing when green and blames the product when red
**IMPORTANT MUST ATTENTION** Gate 6 — read ALL three sources before classifying (never two); NEVER fix a test to match broken code (report the code bug instead); NEVER self-resolve a three-way conflict (escalate by asking the user directly); "stale docs" requires BOTH impl code AND test to agree — why: a winner picked without evidence hides bugs
**IMPORTANT MUST ATTENTION** fix ALL blocking issues (Phase 5 NOT optional); validate findings via `$why-review` before fixing; after validated fixes rerun a full fresh review until the current round's bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred) — why: every fix invalidates the prior verdict
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
| "My finding list is obviously right"      | AI reports inherit confirmation bias. Validate via `$why-review` before fixing. |
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
