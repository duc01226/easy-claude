---
name: integration-test-verify
description: '[Testing] Use when verifying integration tests pass after writing and reviewing them.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Prove reviewed integration tests pass repeatably: run each relevant suite twice without DB reset using configured commands and verified doc-declared preconditions, then report actual runner evidence or an owning-layer failure verdict.

**Summary:** read-this-if-nothing-else digest —
- **MUST ATTENTION — Contract first:** read `integrationTestVerify` and its docs; derive evidence-backed Unit/Integration/System/E2E applicability, owner/root/data, full/focused commands, zero-match behavior, CI/simple-Windows entry, run identity, repeat proof, and supported host/container/environment reach. Unresolved applicable fields block; non-applicable tiers need evidence-backed `N/A`.
- **MUST ATTENTION — Steps 1–2:** harvest every documented environment precondition into a cited checklist, run `systemCheckCommand`, settle every row, and STOP `ENVIRONMENT-BLOCKED` on any unmet item; use `startupScript` or documented setup evidence.
- **MUST ATTENTION — Steps 3–4:** discover touched projects by `testProjectPattern` > `testProjects` > git fallback; run applicable focused scope, then each relevant full suite twice without DB reset. Fan out one `integration-tester` per project/group only with isolated mutable state, wait for all returns before aggregation, and run shared-DB suites sequentially.
- **MUST ATTENTION — Step 5 + failures:** report exact Passed/Failed/Skipped counts, names, exit status, checklist, identity, and Goal Contract evidence; adjudicate before edits, fix test faults at root, report service faults, and recommend `/workflow-integration-test-green` unless this run is already its round.

**Workflow:**

1. **Read Config + Reference Docs** — Load `docs/project-config.json` → `integrationTestVerify`, read the project's integration-test reference docs, harvest the Environment Precondition Checklist
2. **System Check + Precondition Gate** — Verify the system is healthy AND every harvested precondition is met before running
3. **Determine Test Projects** — Discover via `testProjectPattern` glob, `testProjects` list, or git auto-detect
4. **Run Tests** — Execute `quickRunCommand` on determined test projects for 2 consecutive runs; fan out parallel `integration-tester` sub-agents when many isolated projects must run
5. **Report** — Pass/fail counts, failed test names, next steps on failure

**Key Rules:**

- MUST read project config `integrationTestVerify` section before doing anything else
- MUST read project-specific reference docs named by `integrationTestVerify.referenceDocs` or the project's integration-test doc path before running tests
- MUST harvest an explicit Environment Precondition Checklist from those docs — derive each item from what the doc declares, NEVER from a fixed list in this skill — and verify every item before the first test command
- Use `quickRunCommand` from config — NEVER hardcode `dotnet test` or any language-specific command
- If system check fails → instruct user how to start system (reference `startupScript` from config)
- Any harvested precondition unmet → STOP, mark ENVIRONMENT-BLOCKED, cite the precondition + its doc line, and point the user at the setup step — NEVER run the suite anyway and NEVER report an environment failure as a failing test
- If config says local infrastructure, databases, services, or full system startup is required, treat that as a blocking prerequisite
- On test failure → diagnose root cause: test bug or service bug. NEVER weaken assertions.
- ANY failing test at the end of the run → recommend `/workflow-integration-test-green` as the next step (it owns the converge-to-green loop); omit that recommendation when this run is itself a round of that loop
- On an INTERMITTENT failure (red in one run, green in another) → adjudicate the cause first — (a) unrealistic scenario / compressed pacing, (b) harness topology amplification, or (c) genuine product race — and record the verdict with evidence BEFORE any change. NEVER resolve a flake by widening a timeout, adding a retry, or skipping
- Verification only passes after 2 consecutive successful runs of each relevant suite/project without DB reset
- When many independent, isolated test projects must run, fan out one `integration-tester` sub-agent per project (or balanced group) in parallel to speed it up — barrier on all returns, then aggregate; fall back to sequential when suites share a DB or aren't isolated
- Always report exact failure counts and names — "all passed" requires evidence

**Be skeptical. Apply critical thinking. Every pass/fail claim needs actual test runner output.**

---

## First Principle — Easy to Change

> **Success metric: future change cost.** DRY, SRP, abstraction, patterns,
> naming, layering, and tests serve one goal: **make the next change cheaper**.

Ask before applying any rule: **does this make the next change cheaper or more expensive?**

- Reject "best practices" that raise change cost: premature abstraction,
  speculative generality, leaky indirection, or ceremony without payoff.
- Name the real enemies: **coupling, hidden state, duplicated knowledge,
  unclear intent, and irreversible decisions exposed too early**.
- Prefer simple designs that are easy to change over sophisticated ones that are not.

Apply this lens **before** any rule, pattern, or checklist below; it wins when a downstream rule raises change cost.

---

## Step 1: Read Project Config + Reference Docs

Read `docs/project-config.json`; extract `integrationTestVerify`.

```
Expected config shape:
{
  "integrationTestVerify": {
    "guidance":             string   — instructions for the project's test run approach
    "referenceDocs":        string[] — project docs that explain integration-test setup/run prerequisites
    "quickRunCommand":      string   — test runner command (e.g., "dotnet test --no-build", "npm test", "pytest")
    "testProjectPattern":   string   — glob pattern to discover test projects (e.g., "**/*.IntegrationTests.csproj", "**/*.integration.spec.ts")
    "testProjects":         string[] — explicit list of test project paths (fallback if no pattern)
    "systemCheckCommand":   string   — shell command to check system readiness
    "runScript":            string   — path to CI-style full run script (reference only)
    "startupScript":        string   — path to system startup script (reference only)
  }
}
```

**Config priority:** `testProjectPattern` (glob) > `testProjects` (explicit list) > git auto-detect.

**Missing `integrationTestVerify`:** use [Fallback Mode](#fallback-mode-no-project-config).

**If present:** display `guidance` verbatim; it contains intentional project instructions.

Read project setup guidance before any system check or test command:

1. Read every file in `integrationTestVerify.referenceDocs`, when present.
2. Otherwise read any integration-test reference path elsewhere in `docs/project-config.json`.
3. If `runScript` or `startupScript` is named, read it as evidence for startup, health checks, arguments, or labels.
4. If no project reference exists, use only explicit config values and tell the user to add `referenceDocs`.

### Step 1b: Harvest the Environment Precondition Checklist (BLOCKING — before any command)

**Extract environment requirements, not just read the reference.** From the docs/scripts, derive every test-run precondition and carry the checklist into Step 2.

**Derive, never enumerate.** Use only what THIS project's docs declare; never apply a fixed stack-specific list. Possible declarations include healthy services/containers; reachable, migrated, seeded DB; broker/queue/cache; env vars, connections, ports, credentials, certificates; required startup/bootstrap; build/restore; per-suite isolation; fixtures; external stubs.

Record before proceeding:

```
### Environment Precondition Checklist (harvested)

| # | Precondition | Declared by (doc:line / script) | How to verify | Status |
|---|--------------|---------------------------------|---------------|--------|
| 1 | {what must be true} | {file:line} | {command / observable} | PENDING |
```

Rules:

- MUST cite `file:line` or script path for every item; no source means assumption, not precondition.
- No reference doc or no declared prerequisite → record `No environment preconditions declared — proceeding on config values only` and name the checked doc. NEVER invent rows — why: fabricated prerequisites block healthy runs and train users to ignore the gate.
- Record unverifiable items as `UNVERIFIABLE` and surface them; a documentation gap is not permission to skip the gate.

---

## Step 2: System Check + Environment Precondition Gate

**If config has `systemCheckCommand`:**

Run the system check via Bash:

```bash
{systemCheckCommand}
```

Evaluate output:

- **Healthy** → proceed to the precondition gate.
- **Partially healthy / no containers** → tell the user: > "System not fully ready. To start: run `{startupScript}` (or follow the guidance above). Wait for all services to be healthy, then re-run `/integration-test-verify`."
    > **STOP** — do not run tests against an unhealthy system. Results would be unreliable.

**If absent:**

- If `guidance`, reference docs, `runScript`, or `startupScript` require local infrastructure/services, STOP: config needs a concrete readiness check before AI verification.
- Otherwise proceed to the precondition gate and report that no system check is configured.

### Precondition gate (BLOCKING — every harvested item, evidence-backed)

A green `systemCheckCommand` does NOT discharge Step 1b: it covers only encoded checks; docs contain runner assumptions. Settle every row.

1. **Verify each item with real evidence** — command output, port/process/container check, config/env read, or query. NEVER mark it met because it "should" be up.
2. **Mark each row** `MET` (with the evidence) · `UNMET` (with what is missing) · `UNVERIFIABLE` (no observable exists — surface it).
3. **Any `UNMET` → STOP before the first test command.** Report `ENVIRONMENT-BLOCKED`, name the precondition and declaring `file:line`, and give the concrete setup step (`startupScript`, doc section, or missing env var). NEVER run the suite — why: half-ready infrastructure turns setup faults into test failures.
4. **Never fix an environment gap in tests.** Report the user setup action or config gap; do not weaken assertions, add skips, or relax timeouts.
5. **Emit the settled checklist** (rows, statuses, evidence) in the Step 5 report; it proves the run's environment was ready.

All rows `MET` (or the explicit `no preconditions declared` record) → proceed to Step 3.

---

## Step 3: Determine Test Projects

**Priority:** `testProjectPattern` (glob) > `testProjects` (explicit list) > git auto-detect.

**If `testProjectPattern` exists:**

Run a glob search for the pattern:

```bash
# Example (testProjectPattern from project config, e.g. "**/*.IntegrationTests.csproj")
find . -path "{testProjectPattern}" -type f
# or use language-appropriate glob tool
```

Use discovered `.csproj` files (or equivalent); exclude paths outside the pattern scope.

**If no pattern but `testProjects` exists:**

Use the config list.

**If neither exists — auto-detect from git:**

```bash
# Auto-detect changed test projects
git diff --name-only HEAD | grep -i "IntegrationTest" | sed 's|/[^/]*$||' | sort -u
```

If auto-detect finds nothing, ask: "No changed test files detected. Run all test projects or skip?"

**Filter:** Run only projects relevant to the current change, unless the user explicitly asks for all.

### Step 3b: Test Architecture Contract Scope (before Step 4)

Before the first test command, record the applicable tier matrix and required report evidence:

| Tier | Applicability + evidence | Full command | Focused/partial command | Zero-match behavior | Run identity / data mode | Parallel isolation |
| ---- | ------------------------- | ------------ | ------------------------ | ------------------- | ------------------------ | ------------------ |
| Unit | `APPLICABLE` + `{file:line}` or `N/A — {evidence}` | `{copy-ready command or N/A + evidence}` | `{copy-ready command or N/A + evidence}` | `{documented non-zero behavior}` | `{unique identity; reference/additive mode}` | `{worker/root strategy}` |
| Integration/System | `APPLICABLE` + `{file:line}` or `N/A — {evidence}` | `{copy-ready command}` | `{copy-ready command or N/A + evidence}` | `{documented non-zero behavior}` | `{unique identity; reference/additive mode}` | `{worker/root strategy}` |
| E2E | `APPLICABLE` + `{file:line}` or `N/A — {evidence}` | `{configured command or N/A + evidence}` | `{configured command or N/A + evidence}` | `{documented non-zero behavior}` | `{unique identity; reference/additive mode}` | `{worker/root strategy}` |

- Use only commands from `docs/project-config.json`, named reference docs, or existing runner scripts. Missing focused/partial or simple/Windows command → record `N/A — <evidence>`; do not invent filters, browser stacks, or `.cmd` wrappers.
- For applicable focused/partial scope, capture exact Passed/Failed/Skipped counts and exit status. Invalid or zero-match selection must fail or follow documented non-green behavior; zero matches never pass.
- Record unique run identity/data suffix, supported public-path setup, realistic data, idempotent count-before-create setup, keyed/additive persistence, and parallel-worker isolation. These supplement—not replace—the environment and real-DI/use-case gates.

---

## Step 4: Run Tests

Run only after Step 2 passes — healthy system and every harvested precondition `MET` — or docs explicitly state no external system is required.

Use config `quickRunCommand`. Run applicable focused/partial scope first and record its exact result; it is diagnostic, never a full-scope substitute. Then run each relevant suite/project twice consecutively without resetting data.

**Two-run idempotency gate:** Any failed run fails verification. Fix the root cause, then restart at run 1. Red once and green once = INTERMITTENT; use [Intermittent (flaky) failure adjudication](#intermittent-flaky-failure-adjudication--verdict-before-any-change) and record the verdict BEFORE changing anything.

Example for a configured integration-test suite:

```bash
# Run each test project individually for clear per-project results
{quickRunCommand} {testProject1}
{quickRunCommand} {testProject2}
# ...
```

Or run all at once using the solution filter if supported:

```bash
{quickRunCommand} --filter "Category=integration"
```

**Capture every run:** scope, command, exit status, exact Passed/Failed/Skipped counts, and failing names. Configured skip annotations are expected skips, not failures.

### Parallel execution across multiple test projects (sub-agent fan-out)

> **AI agent note:** When Step 3 yields **many independent projects**, NEVER run them one-by-one in the foreground. **Fan out one `integration-tester` sub-agent per project or balanced group in one message**, then advance only after EVERY sub-agent returns (all-return barrier); this reduces wall-clock to the slowest suite.

Apply fan-out only when safe and worthwhile:

- **Threshold:** Skip for 1–2 small projects; use for several projects or any long-running suite.
- **Isolation is mandatory:** Parallel suites MUST NOT share mutable state. Fan out only with per-project isolated DB/schema/container/namespace confirmed by config/docs. Shared DB → run **sequentially**; when unsure, ask or default sequential.
- **Each sub-agent owns its full gate:** complete **2-consecutive-green-runs-without-DB-reset**, real counts/names, and evidence; partial or single-run results do not pass.
- **Same discipline:** no weakened assertions, skips, or domain-data hacks; failures use the On Test Failure Protocol.
- **Barrier + aggregate:** wait for all, merge per-project tables into Step 5, and fail overall if any project fails its 2-run gate.

```
# Conceptual fan-out (one sub-agent per project / balanced group), launched together:
integration-tester → {testProject1}  → 2-run gate → returns counts + failing names
integration-tester → {testProject2}  → 2-run gate → returns counts + failing names
integration-tester → {testProject3}  → 2-run gate → returns counts + failing names
# ... barrier: aggregate all returns into Step 5 report
```

---

## Step 5: Report Results

After all tests complete, emit:

```
### Integration Test Verify Results

**Run command:** {quickRunCommand}
**Projects tested:** {N}
**Focused/partial scope:** {scope and command, exact counts + exit status, or `N/A — evidence`}
**Repeatability gate:** 2 consecutive runs without DB reset
**Environment preconditions:** {M} harvested from {referenceDoc} — all MET (or: none declared)

| Project | Run | Passed | Failed | Skipped |
|---------|-----|--------|--------|---------|
| {Project1} | 1 | X | 0 | Y |
| {Project1} | 2 | X | 0 | Y |

**Total:** {total_passed} passed, {total_failed} failed, {total_skipped} skipped (expected skip annotations)

Status: ✅ ALL PASS | ❌ {N} FAILURES
```

**On failure:**

1. List each failing test name + failure message
2. Diagnose test bug (wrong setup/assertion) vs service bug (broken handler).
3. Test bug → fix setup/data in the test; NEVER weaken assertions.
4. Service bug → report it; do NOT silently fix it.
5. After any fix → rerun the full 2-run sequence.
6. **RECOMMEND `/workflow-integration-test-green` whenever this run ends with ANY failure.** This skill reports a snapshot; it does not own convergence. The workflow repeatedly verifies, adjudicates with `/debug-investigate` + `/integration-test-review`, fixes at the owning layer, reviews the fix diff, and runs fresh until its 2-run gate passes. Surface it in [Next Steps](#next-steps).
   - **EXCEPTION:** when this run IS a round of that loop (invoked by `integration-test-verify-loop` or inside `workflow-integration-test-green`), return counts and failing names instead; recommending the loop inside itself is circular.

**Goal Contract evidence:** Resolve the active Goal Contract (`goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`). If present, append command, per-run counts, report path, and mapped success-criteria evidence to its Iteration Log; update Goal Satisfaction rows (`PASS` on 2/2 green, `FAIL` with names, `BLOCKED` with user-facing reason). Otherwise record `No active goal — results reported inline only.` NEVER copy raw sensitive fixture data into the goal file.

---

## Fallback Mode (No Project Config)

When `docs/project-config.json` lacks `integrationTestVerify`:

1. Detect project type from root files:
    - `*.sln` or `*.csproj` → `dotnet test`
    - `package.json` → `npm test` or `npx jest`
    - `pytest.ini` / `setup.py` / `pyproject.toml` → `pytest`
    - `go.mod` → `go test ./...`

2. Auto-detect changed test files:

    ```bash
    git diff --name-only HEAD
    ```

3. Run the detected command on changed test projects.

4. Report results and recommend: "Add `integrationTestVerify` to `docs/project-config.json` for project-specific run guidance."

---

## CI-Style Full Run (Reference)

When `runScript` is configured, reference it for the full CI-style run; do not run it directly because Windows.cmd scripts and CI runners require user/pipeline execution:

> "For a full CI-style run including Docker orchestration and health polling, execute: `{runScript}`"

Typical sequence: create networks → remove stale containers → build images → start infrastructure and wait healthy → start APIs and wait healthy → run all tests.

---

> **SDD artifact contract** — Resolve spec/code/test disagreement to canonical intent; classify code-wrong, spec-stale, ambiguous, or spec-silent, and capture unwritten invariants in the spec, TC, and guarding test.
>
> **MUST ATTENTION READ `.claude/skills/shared/sdd-artifact-contract.md` → Drift Gates before adjudicating spec drift.**

## On Test Failure Protocol

**NEVER** do these to make failures disappear:

- ❌ Remove or weaken assertions
- ❌ Add skip annotations to hide failures
- ❌ Create or mutate domain data through repositories to bypass real use-case paths
- ❌ Mark passing by ignoring error output
- ❌ Report "all passed" without showing actual runner output
- ❌ Widen an assertion timeout, add a retry around a failing assertion, or mark a test flaky-and-skipped to make an intermittent failure go away

**DO** this:

1. Read the failing test method
2. Read the handler/service the test targets
3. Identify: is the assertion wrong, or is the code wrong?
4. Fix at the root cause layer; use real use cases or valid seeded fixtures for data setup
5. Re-run to confirm green
6. **If step 3 found the CODE was wrong (SOURCE-WRONG) and your fix changed production/source code**, route that changed source into a fresh `/changes-review` (or emit a HIGH finding requiring it) BEFORE declaring the 2-run green PASS — a source fix that greens a test must not ship un-code-reviewed. (In `workflow-feature`/`workflow-bugfix` the downstream `workflow-review-changes` step already covers this; the route matters for standalone runs.)

If the system is unavailable, report `system not ready` and reference `startupScript` / `runScript`. NEVER change the test.

### Intermittent (flaky) failure adjudication — verdict BEFORE any change

A test red in one 2-run and green in the other has NOT identified the cause. **Emit an evidence-backed written verdict BEFORE editing tests, production code, or timeouts.** An unadjudicated flake gets fixed at the nearest site, usually the assertion.

**Classify exactly one cause:**

| Verdict                                  | What it means                                                                                                                                                                                                       | Evidence required to claim it                                                                                                                                                                                            | Resolution                                                                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a) Unrealistic scenario / compressed pacing** | The test drives a sequence, timing, or data state production could never reach — most often distinct actor actions fired back-to-back that real usage separates by seconds, minutes, or hours, letting an in-flight async message land out of order | Read the ARRANGE block as a production trace; cite the chained actor actions (`file:line`) and state what separates them in real usage                                                                                     | Fix the SCENARIO — add an ARRANGE-phase settle barrier polling a real observable of the prior step. NEVER a widened assertion timeout                          |
| **(b) Harness topology amplification**   | The trigger is real but the LOCAL topology makes a rare production race routine — shared infrastructure, fan-out consumers over a shared parent, parallel suite execution, cold starts, or a resource-starved runner | Name the amplifying topology and cite it (config, fixture, suite settings, another test sharing the data); state whether the trigger exists in production and at what likelihood                                          | Isolate the test's data/topology, or record the amplification explicitly. Report the production likelihood alongside — an amplified race may still be a real one |
| **(c) Genuine product race**             | The production code itself has an ordering, concurrency, or idempotency defect that a realistic scenario can hit                                                                                                    | Trace the failure end-to-start to the defective production path (`file:line`); show the realistic sequence that reaches it                                                                                                | Report it as a product defect and fix at the owning layer per the fault-adjudication protocol; keep or strengthen the test that caught it                       |

**Rules:**

1. **Verdict first, change second.** Record `Flake verdict: (a) | (b) | (c) — {evidence}` in the Step 5 report before any edit. "Probably flaky" is not a verdict.
2. **Reproduce before concluding.** Re-run the failing test repeatedly (it is a fast local test — see the 60s cap) so the intermittency is characterized, not assumed. State the observed ratio.
3. **NEVER resolve a flake by widening a timeout, adding a retry, or skipping.** Those hide all three causes equally and destroy the signal.
4. **Do not file (c) until (a) and (b) are ruled out with evidence.** Reporting a test-fidelity defect as a product defect burns hours and erodes trust in the suite.
5. **Any resolution restarts the 2-run gate from run 1.** An intermittent test is not verified until it is green twice consecutively without a DB reset.

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If not already in a workflow, use `AskUserQuestion`; the user chooses. Do NOT decide this is "simple enough to skip":
>
> 1. **Activate `workflow-write-integration-test` workflow** (Recommended) — investigate → `spec [mode=tests]` → why-review → artifact-review --type=spec-tests → integration-test → integration-test-review → integration-test-verify → `spec [mode=sync]` → docs-update → workflow-end → watzup
> 2. **Execute `/integration-test-verify` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** after this skill, use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious":

**Any failure → list `/workflow-integration-test-green` first**; it owns the converge-to-green loop this snapshot skill does not. All green → lead with `/workflow-review-changes`.

- **"/workflow-integration-test-green (Recommended when ANY test failed)"** — verify → adjudicate → fix at the owning layer → review the fix diff → fresh re-verify until the 2-run gate passes. Omit when this run was a round of that loop or the suite is fully green.
- **"/workflow-review-changes (Recommended when all green)"** — Review all changes before committing
- **"/integration-test-review"** — Review the failing tests only (report-only fault opinion), without entering the convergence loop
- **"/docs-update"** — Update documentation if test counts changed
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.
> **[IMPORTANT]** A verify step without 2 consecutive test runs is not repeatability verification.
> Read project config FIRST for this project's run command.

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

<!-- SYNC:test-failure-fault-adjudication -->

> **Test-Failure Fault Adjudication** — When a test fails (or you are debugging or fixing a failure), the job is to determine *who is at fault — the source code or the test code*. Getting that verdict right matters more than turning the suite green. Binds every debug / fix / test skill identically.
>
> 1. **Provisional verdict before touching either side.** Classify the observed evidence as SOURCE-WRONG, TEST-WRONG, TEST-NOT-OPTIMAL, ENVIRONMENT-BLOCKED, or AMBIGUOUS; then `/debug-investigate` and trace end-to-start before editing. A green-again suite is NOT the goal.
> 2. **Triangulate against the spec AND the source.** If a governing Feature Spec covers the behavior (e.g. `docs/specs/**` — §3 ACs / §4 BRs / §5 invariants / §8 TCs), it is the tiebreaker for *intended* behavior — compare BOTH the production source and the failing test against it. With no spec, the documented intent / acceptance criteria / caller contract is the reference. Decide from this evidence whether the SOURCE is wrong or the TEST is wrong.
> 3. **Classify who is at fault, then fix the wrong side at its root:**
>     - **SOURCE-WRONG** — production code violates the spec's intended behavior or a clear invariant → fix the source at the owning layer; keep or strengthen the test that caught it.
>     - **TEST-WRONG** — the test encodes a stale or incorrect assertion, setup, or expectation that contradicts intended behavior → fix the test at its root. NEVER weaken an assertion, add a skip, or relax a timeout to force green.
>     - **TEST-NOT-OPTIMAL** — intended behavior is valid but the test seam, timing, or assertion signal is fragile → improve the test without weakening the invariant.
>     - **ENVIRONMENT-BLOCKED** — infrastructure or external state prevents a source/test verdict → preserve diagnostics and stop mutation until the environment is healthy.
>     - **AMBIGUOUS** — evidence or intended behavior does not safely select an owner → ask the user or canonical owner before editing.
>     - NEVER change a test to match broken source, and NEVER change source to satisfy a broken test. (Migration code excluded — schema/data migrations are one-time execution paths, not core application logic.)
> 4. **Ask the user when intended behavior is unclear.** If no spec covers the behavior, the spec is silent, or the spec is ambiguous about which side is correct, STOP and `AskUserQuestion` (or consult the canonical spec owner) before editing either side — never silently pick source or test just to make the suite pass.
>
> Reconcile to intended behavior, never to whichever side currently passes — green can encode the very bug.
>
> **Read-only/report-only role boundary:** when this block is carried by a report-only role (`code-reviewer`, `quality-gate-review`, `spec-compliance-reviewer`, `tester`, and any other agent whose definition declares it never edits source), "fix the wrong side" means RETURN the adjudicated verdict and the proposed repair to the parent — do not modify source, tests, generated carriers, or user data. The adjudication is the deliverable; the edit is the caller's. Without this sentence the block's step-3 imperatives read as write authority and directly contradict those agents' own declarations (e.g. `tester.md` "NEVER implement fixes"), which is the sibling `SYNC:double-round-trip-review` boundary applied to the same class of carrier.

<!-- /SYNC:test-failure-fault-adjudication -->

<!-- SYNC:spec-tests-code-triangulation -->

> **Spec ↔ Tests ↔ Code Triangulation** — The unit of review is the WHOLE PACKAGE (spec + tests + code), not the diff alone. Load all three faces together and reason mutual-consistency FIRST, before any isolated per-file check.
>
> 1. **Locate all three faces** for the changed behavior: the governing Feature Spec section(s) (§3 ACs / §4 BRs / §8 TCs), the tests that guard it, and the production code. A missing face is a finding (SPEC-GAP / TEST-GAP / DEAD-SPEC).
> 2. **Triangulate pairwise** — classify which face is wrong on every disagreement:
>     - code vs spec → CODE-EXTRA / SPEC-STALE / CODE-WRONG (a [HARD] §4 rule or §5 invariant with no enforcing path is CODE-WRONG).
>     - tests vs spec → TEST-GAP / SPEC-SILENT.
>     - tests vs code → TEST-GAP / WEAK-TEST (a test that survives a deliberately broken invariant).
> 3. **Capture hidden rules** — an invariant the code enforces but the spec never states (SPEC-SILENT) is surfaced as a finding, added into §3/§4/§8, and guarded with a test: the enrichment loop, never a silent pass.
> 4. **Re-review after enrichment** — when triangulation adds spec content or a test, re-review the package against the enriched spec; converge only when a full pass surfaces no new disagreement.
>
> NEVER mark PASS while any face disagrees without a logged finding. The diff is the entry point; the package is the unit of judgment.

<!-- /SYNC:spec-tests-code-triangulation -->

<!-- SYNC:spec-drift-adjudication -->

> **Spec drift adjudication (code-wrong vs spec-stale).** Whenever changed behavior diverges from a canonical Feature Spec (business rule, acceptance criterion, flow, state transition, or §8 TC under `docs/specs/`), you MUST NOT silently pick a side. Adjudicate per `shared/sdd-artifact-contract.md` → **Drift Gates**:
>
> 1. **Detect** — compare the change against the spec's documented intent. No divergence → record `Spec in sync` and move on.
> 2. **Classify** the divergence:
>    - **CODE-WRONG** — the spec correctly states intended behavior and the change violates it → BLOCKING finding; fix the code/test against intended behavior (write/adjust a regression TC first).
>    - **SPEC-STALE** — the change is the new intended behavior and the spec now documents the old/wrong behavior → update the spec FIRST via `/spec [mode=update]`, then sync `/spec [mode=tests]` + `/spec [mode=sync]`.
>    - **AMBIGUOUS** — intended behavior is unclear → `AskUserQuestion` (or the canonical spec owner) before editing either side.
>    - **SPEC-SILENT** — the code correctly enforces an invariant/behavior that NO canonical spec artifact (§3 AC, §4 BR, §5 invariant, §8 TC) states → not drift but an UNWRITTEN rule discovered by review. ENRICH the spec via the **Invariant Harvest** pass (`/spec [mode=sync] direction=harvest` → `spec/references/sync.md`): prove it is always-true (≥2 enforcement points or a rejecting guard), express it as a universally-quantified property, then add the rule to §4 (or §3/§5) AND a §8 TC via `/spec [update]` + `/spec [mode=tests]` and add the guarding test. A discovered invariant left only in code (or only in tests) is INCOMPLETE — this is the highest-value capture (the rule nobody wrote down).
> 3. **Never normalize drift just because code/tests are green** — green can encode the drift itself. Reconcile to canonical intent, never to whichever side currently passes.
>
> A behavior-changing review/implementation that leaves a spec divergence unadjudicated is INCOMPLETE; an unwritten-but-enforced invariant left uncaptured (no §4/§8 entry) is equally INCOMPLETE.

<!-- /SYNC:spec-drift-adjudication -->

<!-- SYNC:integration-test-execution-discipline -->

> **Integration Test Execution Discipline** — How the integration-test family (write · review · verify) runs, diagnoses, and clears a suite. Binds `/integration-test`, `/integration-test-review`, and `/integration-test-verify` identically.
>
> 1. **Verify the WHOLE system passes — not a hand-picked subset.** `/integration-test-verify` must prove the full relevant suite is green (every test in the system the change can touch), not one cherry-picked test. "All pass" is only true with actual runner output (Passed/Failed/Skipped counts + names) and only after 2 consecutive green runs without a DB reset.
> 2. **Drive state through real use-case paths — NEVER hack seed data.** Set up every precondition exactly as a real user would: real commands, queries, production consumers/messages, or valid idempotent seeders. NEVER create or mutate domain data by direct repository writes — that fabricates states a user could never reach and hides the real workflow bug. Hacking seed data to force a green run is forbidden.
> 3. **On ANY failure → `/debug-investigate` the root cause BEFORE any fix.** Do not guess, do not patch the symptom site. Trace the failure end-to-start and classify whose fault it is: test code (wrong assertion/setup), source/production code (real defect), or environment/infrastructure/data. Then route: test-code fault → `/integration-test-review` to fix the test at the root (never weaken assertions or add skips); source-code fault → fix the production defect at the owning layer and report it; environment fault → mark BLOCKED and point at the startup script. NEVER change a test to match broken code.
> 4. **60-second runtime cap — a slow test is a RED FLAG, not a tuning knob.** Local integration tests run fast. If any single test (or a stalled suite) exceeds ~60s, STOP and treat the slowness itself as a defect signal — deadlock, missing `await`, infinite poll/retry, a real network/external call, or an unbounded query. `/debug-investigate` the cause; NEVER paper over it by raising the timeout or extending the wait.
> 5. **Loop until the whole suite is green.** After fixing the validated root cause, restart the full 2-run verification from run 1. Done means the entire relevant suite passes repeatably — never green-once, never a subset.

<!-- /SYNC:integration-test-execution-discipline -->

<!-- SYNC:real-world-fidelity-testing -->

> **Real-World Fidelity Gate** — MANDATORY when authoring, reviewing, or repairing any integration / E2E / system test.
>
> A test earns trust by reproducing a situation the system can actually meet in production. A scenario that could never occur in real life proves nothing when it passes, and wastes hours when it fails.
>
> 1. **Ask the fidelity question BEFORE writing the setup:** *"Can this sequence, timing, and data actually occur in production?"* If no, the test is mis-specified — fix the SCENARIO, never the assertion.
> 2. **Model real pacing between actor steps.** Two distinct actor actions that production separates by seconds, minutes, or hours MUST NOT be fired back-to-back in the same millisecond. Compressed pacing manufactures races the system was never designed to survive, then reports them as product defects. For every browser/UI E2E or human-QC actor operation on a UI control — click/tap, fill/type, key press, select, check/uncheck, drag/drop, upload, or hover used to exercise behavior — wait exactly **500ms at the end of the operation** after its readiness and postcondition waits. This is presentation pacing, never readiness; observe any real settle signal separately, and do not let configuration reduce this delay to zero.
> 2a. **Default to a reusable, parameterized wait-until utility.** Before every UI-control action, call one canonical `waitUntil(condition, options)` helper with a boolean/async predicate for the page/control to be present, visible, enabled, and actionable, and for any blocking error alert to be absent when success is expected. `options` MUST bound the timeout and poll interval and carry a diagnostic condition description. Reuse the helper through Common, Domain-Shared, and Page objects; do not duplicate polling or replace it with an arbitrary sleep.
> 2b. **Observe → act → observe.** After every UI-control action, call the same `waitUntil` for the expected positive or negative postcondition before the next action: loading until the next control shows, clicking until the result appears, opening a select/dropdown until its menu/options are visible before choosing, and choosing until the selected value/next state appears. If the page exposes an error alert, wait until it is present for an expected failure or absent for an expected success, then keep the final assertion in the test. A timeout is a test failure with diagnostics, not permission to weaken the assertion.
> 3. **Wait on a real signal, never a blind sleep.** Find an observable proving the prior step finished — a persisted state change, an audit/version stamp, a queue/worker idle marker, a completion event — and poll until it settles (unchanged across a short stability window). Use a fixed delay ONLY when no observable exists, and say so in a comment. A browser action delay MUST never replace a readiness/actionability wait.
> 4. **Barriers belong in ARRANGE, never in ASSERT.** Waiting for a precondition is fidelity. Widening an assertion's timeout, loosening a comparison, adding a retry around a failing assertion, or skipping the test is masking. NEVER do the latter to force green.
> 5. **Distinguish harness-amplified from real.** Test topologies (shared infra, fan-out consumers, parallel suites, cold starts) can make a rare production race routine locally. Before filing a product defect, state whether the trigger exists in production and at what likelihood.
> 6. **Keep the protected invariant intact.** Improving fidelity must NEVER reduce what the test protects. If a realistic scenario no longer exercises the rule, the rule needs a DIFFERENT realistic scenario — not a weaker assertion.
> 7. **Deliberate impossible-state tests are allowed, but MUST be labelled.** Corruption-repair, migration, and fail-safe tests intentionally construct states production should never reach; comment WHY the state is reachable (upstream bug, partial write, legacy data), so they are never confused with unrealistic setups.
> 8. **Visible browser evidence is part of fidelity.** When a project configures a web surface for human-QC, exercise it through the configured visible Playwright CLI path when supported, attach console/page-error/request listeners before the first interaction, and capture/read the configured screenshot, trace, or video evidence. Redact credentials, tokens, cookies, and sensitive request/response data before persistence; never treat an unread artifact as an observation.

<!-- /SYNC:real-world-fidelity-testing -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
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
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, `plans/`, `team-artifacts/`, or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate (static JIT)** — Run after task-tracking bootstrap and immediately before target/source file reads, grep, edits, tests, or analysis. Project docs override generic framework assumptions; hooks may remind or accelerate this gate, but never prove that it ran.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. **Read `docs/project-config.json` first — the project's machine-readable map.** It is the single source of truth for THIS repo (modules/paths, framework + search keywords, test/E2E/integration run-commands, design system, architecture rules, workflow patterns); ground exact paths, run-commands, and conventions on it **before investigating, planning, or coding** — never assume framework defaults (`CLAUDE.md` + reference docs are derived from it). If it — or the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any required reference doc — is missing or stale, auto-run `/project-init` or the narrow route (`/project-config`, `/docs-init`, `/scan-all`, `/scan --target=<key>`, `/claude-md-init`) first; if Codex mirrors or `AGENTS.md` are stale, ask the user to run `/sync-codex` (never auto-run it).
> 3. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 4. Read every required doc, then before target work state: `Reference docs read: ... | Not applicable: ...`. After compaction, resume, delegation, or a material context change, repeat the route and restate the set; prior conversation and hook output are not proof of current loading.
>
> **Ready when:** scope evaluated, `docs/project-config.json` consulted, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:test-architecture-execution-contract -->

> **Test Architecture & Execution Contract** — Treat testability as a setup/architecture acceptance condition. For every potentially applicable tier — Unit, Integration/System, E2E, and Performance/Scale (warranted at `T1+`/`B2+`) — record `APPLICABLE` only with evidence of its runner/framework/configuration; otherwise record `N/A — <evidence>` and never fabricate coverage.
>
> 1. **Matrix before implementation:** Record applicability, owner, runner/framework, test root, fixture/data strategy, full command, focused/partial command, zero-match behavior, CI gate, a simple/Windows entry point (a `.cmd` when the project needs one), the **host-mode AND container-mode commands** where the project supports both, and the **environment reach** (which of local / CI / production-shaped this tier can target).
> 1a. **E2E profile handoff:** For E2E, also record the selected `surfaceIds[]`, the linked `localRun` owner, auth mode/reference, seed/data mode, browser runner/engine/headed setting, action-delay policy, evidence root/capture/redaction policy, and convergence cap. Missing fields remain explicit blockers or N/A; they are never filled from generic browser defaults.
> 2. **Runnable scopes:** Full and focused commands must be copy-ready, fail on invalid or zero-match selections, report exact counts and exit status, and be safe to repeat. E2E uses only configured browser/service commands. Before every browser/UI E2E operation on a UI control, use the canonical bounded `waitUntil(condition, options)` helper for readiness/actionability and applicable blocking error-alert absence; after the operation, use it for the expected positive/negative postcondition or error-alert state, then wait exactly **500ms** at the end. The delay is presentation pacing, never a readiness or settle mechanism, and applies to automation as well as visible human-QC.
> 2a. **E2E object-model gate (when E2E is applicable):** Build and reuse a three-tier test object model — **Common components** for cross-feature controls, **Domain-Shared components** for reusable domain behavior, and **Page components/objects** for page-specific composition. Each object records its tier, owner, and base abstraction.
> 2b. **E2E abstraction and DRY gate:** Use an idiomatic abstract base class or language-equivalent protocol/trait for shared lifecycle, locator, readiness, and pacing behavior; centralize purpose-specific utilities/helpers for data, auth, and evidence; keep assertions in tests. Reuse or compose existing objects before creating new ones, keep one canonical owner for each selector/action/wait, and treat duplicated wrappers or setup as a finding; extract at 3+ similar implementations.
> 2c. **E2E test layering:** Test a reusable Common or Domain-Shared component contract once, then let Page tests cover page-specific composition and outcomes; do not copy lower-tier component cases into every Page test.
> 2d. **E2E wait-until gate:** The object model MUST expose or compose one reusable `waitUntil(condition, options)` utility accepting a positive or negative boolean/async predicate, bounded timeout/poll settings, and a diagnostic description. Before each action wait for a ready/actionable control and the applicable error-free precondition; after each action wait for the expected state transition, dropdown/options visibility, selected state, or expected error-alert presence/absence. Keep the final business assertion in the test and fail with the wait diagnostics on timeout.
> 3. **Fresh valid state:** Each run/test owns a unique run identity and business-data suffix, arranges through supported public paths, and uses realistic valid data. Reference setup is count-before-create, idempotent, and restart-safe. Intentional accumulation is additive, keyed, and integrity-checked; never hide contamination with destructive reset.
>    Run-scoped cleanup, when supported, is opt-in and idempotent: after evidence capture it may remove only ephemeral resources owned by the current run; it must never delete persistent/additive data or another run's data, reset shared state, or replace no-reset proof.
> 4. **Isolation and fidelity:** Isolate mutable roots and parallel workers; share only immutable/reference data. Preserve real actor pacing and observable arrange barriers. Do not widen retries or weaken assertions to make a scenario pass.
> 5. **Evidence gate:** Report command, scope, identity, seed/accumulation mode, exact result, and repeat proof. For each applicable persistent-state suite, require two consecutive no-reset full runs. Treat line coverage as diagnostic only; use meaningful property/invariant, mutation, change, and behavior coverage signals.
> 6. **Execution modes and environment reach:** A tier claiming two run modes must have **BOTH exercised** — the bare-host command and the fully-containerized command, driven from ONE source of truth for config and topology; record which mode CI exercises, because an unexercised mode rots silently and a claimed-but-rotten mode is worse than one never claimed. The SAME suite must reach local, CI and (where warranted) a production-shaped target, **parameterized by configuration, never by forked test code** — only one fork ever stays maintained, so forking guarantees divergence. A target lacking a required capability reports `ENVIRONMENT-BLOCKED`, never a silent pass. Tests unsafe against production are excluded by an **ENFORCED** mechanism whose absence fails loudly, not by a convention someone must remember; *"runs in prod"* means a safe, declared, **NON-MUTATING** subset. Reproducibility underwrites all of it — pinned toolchain, locked dependencies, declared external prerequisites — which is the difference between a suite that passes anywhere and one that passes on its author's machine. Depth → `SYNC:engineering-foundation-gate` **F1/F2/F3**.
>
> **Ownership:** Architecture/harness defines the matrix; scaffold/workflow makes it runnable; test writers implement tier-specific cases; reviewers verify the contract; the runner reports; seed-data owners preserve uniqueness, idempotency, realism, and accumulation integrity. Missing required evidence blocks setup completion.

<!-- /SYNC:test-architecture-execution-contract -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Before investigating, planning, or coding, read `docs/project-config.json` (the project map: modules/paths, run-commands, conventions, architecture/workflow rules) + the required project-reference docs, and cite `Reference docs read: ...`.
- **MANDATORY** Load detail just in time immediately before the first target read/grep/edit/test; hooks may provide a pointer, but a hook event or prior turn is never evidence that the current files were read.
- **MANDATORY** Always include `lessons.md`; project config + conventions override generic framework defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route before ordinary project-specific work. On compaction, resume, delegation, or a context change, re-read the required docs and restate the route before continuing.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Before implementation, record evidence-backed Unit/Integration/System/E2E **and Performance/Scale** (`T1+`/`B2+`) applicability (or explicit N/A), copy-ready full + focused commands, zero-match behavior, a simple/Windows entry point, **the host-mode AND container-mode commands where both are supported, plus each tier's environment reach (local / CI / production-shaped)**, unique run identity, realistic valid data, idempotent/restart-safe reference setup, intentional additive accumulation, parallel isolation, exact results, and two no-reset full runs for each applicable persistent-state suite. **Both claimed run modes must be EXERCISED** (an unexercised mode rots; a claimed-but-rotten mode is worse than one never claimed), the same suite reaches every target **parameterized by config, never by forked test code**, a missing capability reports `ENVIRONMENT-BLOCKED` rather than passing silently, and *"runs in prod"* means a safe, declared, **NON-MUTATING** subset excluded by an enforced mechanism, not by convention. For applicable browser/UI E2E, every UI-control operation also uses the canonical bounded `waitUntil(condition, options)` helper before the action for readiness/actionability and applicable error-alert absence, then after the action for the expected positive/negative state, dropdown/options, selected state, or error-alert presence/absence, followed by the mandatory post-operation **500ms** presentation delay. The object model still requires three-tier Common/Domain-Shared/Page reuse with an idiomatic abstract base, cohesive helpers/utilities, and reusable lower-tier component tests.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Prove reviewed integration tests pass repeatably: run each relevant suite twice without DB reset using configured commands and verified doc-declared preconditions, then report actual runner evidence or an owning-layer failure verdict.

**IMPORTANT MUST ATTENTION** record exact scope, commands, exit status, counts, failure names, identity, and repeat proof from real runner output before reporting a verdict.
**IMPORTANT MUST ATTENTION** preserve owned business-outcome assertions and diagnose the responsible layer; never substitute broker, scheduler, or other infrastructure bookkeeping for the system state this suite owns.

**IMPORTANT MUST ATTENTION — Main steps (in order):** (1) read config/reference docs; (2) harvest a cited environment checklist; (3) run system + precondition gates; (4) record the tier matrix and determine touched projects; (5) run focused diagnostics, then two consecutive no-reset full runs; (6) report exact output and Goal Contract evidence; (7) adjudicate failures at the owning layer and route the convergence workflow when needed.

**IMPORTANT MUST ATTENTION — Modes/gates:** missing config → Fallback Mode and root-file runner detection; configured `runScript` → CI-style reference only; standalone failures → workflow recommendation, except when this run is already that loop's round. Applicable Unit/Integration/System/E2E/Performance tiers require runner evidence or `N/A`; record copy-ready full/focused commands, zero-match non-green behavior, simple-Windows and host/container entries when supported, environment reach, identity/data mode, and isolation.

**IMPORTANT MUST ATTENTION — SYNC protocol digest:**

- **MUST ATTENTION — Source/test + spec/test/code drift:** reconcile to canonical intent; classify every disagreement and capture spec-silent invariants with a TC and guarding test — NEVER silently pass a missing or disagreeing face.
- **Real-world fidelity:** use reachable pacing and real ARRANGE observables; NEVER widen assertion timeouts, add assertion retries, blind sleeps, skips, or weaker invariants.
- **AI/task discipline:** use evidence-backed `file:line` claims, root-cause ownership, nested one-`in_progress` tracking, and `lessons.md`/project-reference routing.

**IMPORTANT MUST ATTENTION** read `docs/project-config.json` → `integrationTestVerify` FIRST; missing section → Fallback Mode — why: runner assumptions do not transfer across stacks.
**IMPORTANT MUST ATTENTION** use config `quickRunCommand` — NEVER hardcode a language-specific runner.
**IMPORTANT MUST ATTENTION** read configured reference docs/scripts before any test command and harvest every declared precondition with `file:line` evidence; NEVER invent rows.
**IMPORTANT MUST ATTENTION** run `systemCheckCommand`, settle every checklist row with real evidence, and STOP `ENVIRONMENT-BLOCKED` on any unmet row; point to `startupScript` and NEVER repair environment gaps in tests.
**IMPORTANT MUST ATTENTION** determine projects by `testProjectPattern` > `testProjects` > git fallback; run only the touched set unless the user asks for all.
**IMPORTANT MUST ATTENTION** pass requires two consecutive green full runs without DB reset; any failure restarts at run 1. Focused output is diagnostic, never a full-scope substitute.
**IMPORTANT MUST ATTENTION** resolve the full/focused scope before any test command; record exact exit status and documented zero-match behavior.
**IMPORTANT MUST ATTENTION** preserve unique run identity, realistic data, idempotent reference setup, additive state, and isolated mutable roots.
**IMPORTANT MUST ATTENTION** use supported public use-case paths and keep the final business assertion intact; never substitute infrastructure bookkeeping for owned outcome evidence.
**IMPORTANT MUST ATTENTION** fan out only independent projects with confirmed isolated mutable state; shared DBs run sequentially, and the all-return barrier precedes aggregation.
**IMPORTANT MUST ATTENTION** report actual runner output: scope, command, exit status, exact Passed/Failed/Skipped counts, failing names, checklist, identity, and repeat proof.
**IMPORTANT MUST ATTENTION** on failure, FIRST read `/integration-test-review`, diagnose test-vs-service fault; fix test faults at root, report service faults instead of silently fixing them, and NEVER weaken assertions, add skips, or mutate domain data through repositories.
**IMPORTANT MUST ATTENTION** adjudicate intermittent failures before any change as (a) unrealistic pacing, (b) harness amplification, or (c) genuine product race; do NOT file (c) until (a)/(b) are ruled out.
**IMPORTANT MUST ATTENTION** any standalone failure → recommend `/workflow-integration-test-green` first; omit that recommendation inside its own round. Resolve and update the active Goal Contract, and NEVER copy raw sensitive fixture data into it.

**Anti-Rationalization:**

| Evasion                                       | Rebuttal                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| "One green run is enough"                     | 2 consecutive green runs without DB reset, or it isn't verified. Restart on any red. |
| "I'll just hardcode `dotnet test`"            | Read `quickRunCommand` from config — this skill is language-agnostic.            |
| "The test asserts too strictly, relax it"     | Fix the code or the setup, never the assertion. Weakened tests protect nothing.  |
| "It's just flaky, re-run it"                  | Intermittent = unadjudicated. Classify (a) unrealistic scenario, (b) harness amplification, or (c) real product race — with evidence — before any change. |
| "Bump the timeout and move on"                | Widening a timeout masks all three flake causes. The barrier belongs in ARRANGE, on a real observable. |
| "Found a race — file it as a product bug"     | Not until (a) and (b) are ruled out. State whether the trigger exists in production and at what likelihood. |
| "Looks like it passed"                        | Show Passed/Failed/Skipped counts from real runner output. No output = no claim. |
| "Tests failed — report it and stop"           | Reporting red is half the job. Recommend `/workflow-integration-test-green`; it owns the loop that clears the suite. |
| "System probably ready"                       | Run `systemCheckCommand`. Unhealthy system → STOP, point user at `startupScript`. |
| "I read the reference doc, that's the gate"   | Reading is not checking. Harvest the preconditions into a cited checklist and settle every row before the first test command. |
| "systemCheckCommand is green, skip the checklist" | It verifies only what the config author encoded. The doc's preconditions are the ones the runner silently assumes — verify each. |
| "Env is half-up, run the suite and see"       | A half-ready environment reports infrastructure faults as failing tests. STOP, report ENVIRONMENT-BLOCKED, name the unmet precondition. |
| "Too simple to track"                         | Skip depth, never skip task tracking. Wrong assumptions waste more time.         |

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — analyze task size first.

> **Closing principle — Easy to Change:** judge every test, fix, or abstraction by whether it lowers future change cost; reject added coupling, hidden state, duplicated knowledge, or unclear intent.

---

**IMPORTANT MUST ATTENTION Goal:** Prove reviewed integration tests pass repeatably: run each relevant suite twice without DB reset using configured commands and verified doc-declared preconditions, then report actual runner evidence or an owning-layer failure verdict.
**IMPORTANT MUST ATTENTION** read `integrationTestVerify` config and project reference docs FIRST, harvest cited preconditions, settle every row before the first test command, and use `quickRunCommand` — NEVER hardcode a language-specific runner.
**IMPORTANT MUST ATTENTION** NEVER weaken assertions, add skips, or mutate domain data to force green — fix the root-cause layer and rerun the full 2-run sequence.
