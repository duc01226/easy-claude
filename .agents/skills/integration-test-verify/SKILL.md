---
name: integration-test-verify
description: '[Testing] Use when you need to verify integration tests pass after writing and reviewing them.'
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
## Codex Project-Reference Loading (No Hooks)

Codex uses static project-reference loading instead of runtime-injected project docs.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**
- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
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

## Quick Summary

**Goal:** Prove the reviewed integration tests (written by `$integration-test`, reviewed by `$integration-test-review`) pass repeatably — 2 consecutive green runs without DB reset, using project-configured run commands — with every pass/fail claim backed by actual test-runner output, never assumption.

**Summary:** read-this-if-nothing-else digest of the 5 main steps —

- **Step 1 — Read config FIRST:** load `docs/project-config.json` → `integrationTestVerify`, obey its `quickRunCommand` / `referenceDocs` — language-agnostic, so NEVER hardcode `dotnet test`; missing section → Fallback Mode. — why: a hardcoded runner breaks on any non-default stack.
- **Step 2 — Gate on a healthy system:** run `systemCheckCommand`; STOP and point user at `startupScript` when infra/services aren't ready. — why: an unreliable system yields unreliable green/red that proves nothing.
- **Step 3 — Determine test projects:** discover via `testProjectPattern` glob > `testProjects` list > git auto-detect; run only projects the change touches.
- **Step 4 — Run the 2-run gate, fan out when many isolated projects:** each relevant suite passes 2 consecutive green runs WITHOUT DB reset; any failure restarts from run 1. When several independent, per-DB-isolated projects exist, fan out one `integration-tester` sub-agent per project/group in parallel → barrier on ALL returns → aggregate; suites sharing a DB run sequentially. — why: parallel runs over a shared DB cross-contaminate and silently break the no-reset guarantee.
- **Step 5 — Report from real output, fix at root:** report Passed/Failed/Skipped counts + failing names (only actual runner output proves a result); on failure diagnose test-bug vs service-bug and fix at the owning layer — NEVER weaken assertions, add skips, or mutate domain data to force green.

**Workflow:**

1. **Read Config** — Load `docs/project-config.json` → `integrationTestVerify` section for project-specific run guidance
2. **System Check** — Verify required system is healthy before running
3. **Determine Test Projects** — Discover via `testProjectPattern` glob, `testProjects` list, or git auto-detect
4. **Run Tests** — Execute `quickRunCommand` on determined test projects for 2 consecutive runs; fan out parallel `integration-tester` sub-agents when many isolated projects must run
5. **Report** — Pass/fail counts, failed test names, next steps on failure

**Key Rules:**

- MUST read project config `integrationTestVerify` section before doing anything else
- MUST read project-specific reference docs named by `integrationTestVerify.referenceDocs` or the project's integration-test doc path before running tests
- Use `quickRunCommand` from config — NEVER hardcode `dotnet test` or any language-specific command
- If system check fails → instruct user how to start system (reference `startupScript` from config)
- If config says local infrastructure, databases, services, or full system startup is required, treat that as a blocking prerequisite
- On test failure → diagnose root cause: test bug or service bug. NEVER weaken assertions.
- Verification only passes after 2 consecutive successful runs of each relevant suite/project without DB reset
- When many independent, isolated test projects must run, fan out one `integration-tester` sub-agent per project (or balanced group) in parallel to speed it up — barrier on all returns, then aggregate; fall back to sequential when suites share a DB or aren't isolated
- Always report exact failure counts and names — "all passed" requires evidence

**Be skeptical. Apply critical thinking. Every pass/fail claim needs actual test runner output.**

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

## Step 1: Read Project Config

Read `docs/project-config.json` and extract the `integrationTestVerify` section.

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

**Config priority:** `testProjectPattern` (auto-discovers via glob) > `testProjects` (explicit list) > git auto-detect (fallback).

**If `integrationTestVerify` section is missing:** proceed to [Fallback Mode](#fallback-mode-no-project-config).

**If section exists:** display the `guidance` value to the user verbatim — it contains project-specific instructions the implementer wrote intentionally.

Then read the project-specific setup guidance before any system check or test command:

1. Read every file listed in `integrationTestVerify.referenceDocs`, if present.
2. If no `referenceDocs` list exists, read the integration-test reference doc indicated elsewhere in `docs/project-config.json` (for example a framework/testing integration test doc path), if present.
3. If config names `runScript` or `startupScript`, read those scripts when needed to understand startup, health checks, arguments, or labels. Use them as project-specific evidence, not generic assumptions.
4. If no project-specific reference exists, proceed only with the explicit config values and call out that the project should add reference docs to `integrationTestVerify`.

---

## Step 2: System Check

**If `systemCheckCommand` exists in config:**

Run the system check via Bash:

```bash
{systemCheckCommand}
```

Evaluate output:

- **Healthy** → proceed to Step 3
- **Partially healthy / no containers** → display startup instructions to user: > "System not fully ready. To start: run `{startupScript}` (or follow the guidance above). Wait for all services to be healthy, then re-run `$integration-test-verify`."
    > **STOP** — do not run tests against an unhealthy system. Results would be unreliable.

**If no `systemCheckCommand`:**

- If `guidance`, reference docs, `runScript`, or `startupScript` indicate required local infrastructure/services, STOP and tell the user the project config needs a concrete readiness check before AI verification can run.
- Otherwise, proceed to Step 3 and explicitly report that no system check was configured.

---

## Step 3: Determine Test Projects

**Priority order:** `testProjectPattern` (glob auto-discover) > `testProjects` (explicit list) > git auto-detect (fallback).

**If `testProjectPattern` exists in config:**

Discover test projects by running a glob search for the pattern:

```bash
# Example (testProjectPattern from project config, e.g. "**/*.IntegrationTests.csproj")
find . -path "{testProjectPattern}" -type f
# or use language-appropriate glob tool
```

Use all discovered `.csproj` files (or equivalent) as the test project list. Exclude any paths outside the pattern scope.

**If no `testProjectPattern` but `testProjects` list exists:**

Use the explicit list from config directly.

**If neither exists — auto-detect from git:**

```bash
# Auto-detect changed test projects
git diff --name-only HEAD | grep -i "IntegrationTest" | sed 's|/[^/]*$||' | sort -u
```

If auto-detect finds nothing (no uncommitted test changes), ask user: "No changed test files detected. Run all test projects or skip?"

**Filter rule:** Only run projects relevant to the current change. If user explicitly asks to run all → run all discovered/configured projects.

---

## Step 4: Run Tests

Run this step only after Step 2 passed or the config/reference docs explicitly state no external system is required.

Execute using `quickRunCommand` from config. Run each relevant suite/project 2 consecutive times without resetting data.

**Two-run idempotency gate:** If any run fails, verification fails. Fix the root cause, then restart the 2-run sequence from run 1.

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

**Capture output for every run**: count Passed, Failed, Skipped. Note: skipped tests marked with the configured framework's skip annotation are expected and not a failure.

### Parallel execution across multiple test projects (sub-agent fan-out)

> **AI agent note:** When the determined set (Step 3) has **many independent test projects**, do NOT run them one-by-one in the foreground — **fan out one `integration-tester` sub-agent per project (or per balanced group of projects)** in a single message so they run concurrently, then advance only after EVERY sub-agent returns (all-return barrier). This collapses wall-clock from sum-of-suites to slowest-single-suite.

Apply this only when it is actually safe and worthwhile:

- **Threshold.** Skip the fan-out for 1–2 small projects (orchestration overhead outweighs the gain); use it once there are several projects or any long-running suite.
- **Isolation is mandatory.** Parallel suites MUST NOT share mutable state. Fan out only when each project targets its **own isolated DB/schema/container/namespace** (or the project config / reference docs confirm per-suite isolation). If suites share one database, concurrent runs cross-contaminate state and silently break the "2 consecutive green runs without DB reset" guarantee → run those **sequentially** instead. When unsure, ask the user or default to sequential.
- **Each sub-agent owns the full gate for its assignment.** Every sub-agent runs its project(s) through the complete **2-consecutive-green-runs-without-DB-reset** sequence, captures real runner output (Passed/Failed/Skipped counts + failing names), and returns that evidence — partial or single-run results are not acceptable.
- **Each sub-agent inherits this same discipline.** No weakened assertions, no skip annotations, no domain-data hacks; on failure it diagnoses test-bug vs service-bug at the root layer (per the On Test Failure Protocol).
- **Barrier + aggregate.** Wait for all sub-agents, then merge their per-project tables into the single Step 5 report. Any one project failing its 2-run gate fails the overall verification.

```
# Conceptual fan-out (one sub-agent per project / balanced group), launched together:
integration-tester → {testProject1}  → 2-run gate → returns counts + failing names
integration-tester → {testProject2}  → 2-run gate → returns counts + failing names
integration-tester → {testProject3}  → 2-run gate → returns counts + failing names
# ... barrier: aggregate all returns into Step 5 report
```

---

## Step 5: Report Results

After all tests complete, report:

```
### Integration Test Verify Results

**Run command:** {quickRunCommand}
**Projects tested:** {N}
**Repeatability gate:** 2 consecutive runs without DB reset

| Project | Run | Passed | Failed | Skipped |
|---------|-----|--------|--------|---------|
| {Project1} | 1 | X | 0 | Y |
| {Project1} | 2 | X | 0 | Y |
| {Project1} | 3 | X | 0 | Y |

**Total:** {total_passed} passed, {total_failed} failed, {total_skipped} skipped (expected skip annotations)

Status: ✅ ALL PASS | ❌ {N} FAILURES
```

**On failure:**

1. List each failing test name + failure message
2. Diagnose: test bug (wrong assertion setup) or service bug (handler actually broken)?
3. If test bug → fix in the test file (do NOT weaken assertions — fix setup/data)
4. If service bug → report as finding, do NOT silently fix without telling user
5. After fixing → re-run the full 2-run verify sequence

**Goal Contract evidence (after verify run):** Resolve the active Goal Contract per the goal-contract-satisfaction-loop protocol (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`). When one exists, append the verification evidence to the goal file's Iteration Log — run command, per-run pass/fail counts, report path — mapped to the saved success criteria these tests verify, and update the matching Goal Satisfaction matrix rows (PASS on 2/2 green, FAIL with the failing-test list, BLOCKED with a user-facing reason). Record `No active goal — results reported inline only.` when none exists. Never copy raw sensitive fixture data into the goal file.

---

## Fallback Mode (No Project Config)

When `docs/project-config.json` has no `integrationTestVerify` section:

1. Detect project type from root files:
    - `*.sln` or `*.csproj` → `dotnet test`
    - `package.json` → `npm test` or `npx jest`
    - `pytest.ini` / `setup.py` / `pyproject.toml` → `pytest`
    - `go.mod` → `go test ./...`

2. Auto-detect changed test files from git:

    ```bash
    git diff --name-only HEAD
    ```

3. Run detected command on changed test projects.

4. Report results and recommend: "Add `integrationTestVerify` to `docs/project-config.json` for project-specific run guidance."

---

## CI-Style Full Run (Reference)

When `runScript` is configured, reference it for the full CI-style run (not run by AI directly — Windows.cmd scripts and CI runners require user/pipeline execution):

> "For a full CI-style run including Docker orchestration and health polling, execute: `{runScript}`"

This script typically: creates networks → removes stale containers → builds images → starts infrastructure (wait healthy) → starts APIs (wait healthy) → runs all tests.

---

## On Test Failure Protocol

**NEVER** do these to make failures go away:

- ❌ Remove or weaken assertions
- ❌ Add skip annotations to hide failures
- ❌ Create or mutate domain data through repositories to bypass real use-case paths
- ❌ Mark passing by ignoring error output
- ❌ Report "all passed" without showing actual runner output

**DO** this instead:

1. Read the failing test method
2. Read the handler/service the test targets
3. Identify: is the assertion wrong, or is the code wrong?
4. Fix at the root cause layer; use real use cases or valid seeded fixtures for data setup
5. Re-run to confirm green

If a test fails because the system is unavailable → report as "system not ready" and reference `startupScript` / `runScript`. Never change the test.

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use a direct user question to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `workflow-write-integration-test` workflow** (Recommended) — scout → investigate → spec-tests → why-review → review-artifact --type=spec-tests → integration-test → integration-test-review → integration-test-verify → spec-tests [direction=sync] → docs-update → workflow-end → watzup
> 2. **Execute `$integration-test-verify` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use a direct user question to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"$workflow-review-changes (Recommended)"** — Review all changes before committing
- **"$integration-test-review"** — If tests fail: review and fix integration tests before re-verify
- **"$docs-update"** — Update documentation if test counts changed
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.
> **A verify step that does not actually run tests 2 consecutive times is not repeatability verification. It is theater.**
> Read project config FIRST to understand how to run tests for this specific project.

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

<!-- SYNC:test-failure-fault-adjudication -->

> **Test-Failure Fault Adjudication** — When a test fails (or you are debugging or fixing a failure), the job is to determine *who is at fault — the source code or the test code*. Getting that verdict right matters more than turning the suite green. Binds every debug / fix / test skill identically.
>
> 1. **Root-cause first — never guess, never patch the symptom.** `$debug-investigate` and trace the failure end-to-start to its actual cause before touching either side. A green-again suite is NOT the goal; a correct verdict on what was actually wrong is.
> 2. **Triangulate against the spec AND the source.** If a governing Feature Spec covers the behavior (e.g. `docs/specs/**` — §3 ACs / §4 BRs / §5 invariants / §8 TCs), it is the tiebreaker for *intended* behavior — compare BOTH the production source and the failing test against it. With no spec, the documented intent / acceptance criteria / caller contract is the reference. Decide from this evidence whether the SOURCE is wrong or the TEST is wrong.
> 3. **Classify who is at fault, then fix the wrong side at its root:**
>     - **SOURCE-WRONG** — production code violates the spec's intended behavior or a clear invariant → fix the source at the owning layer; keep or strengthen the test that caught it.
>     - **TEST-WRONG** — the test encodes a stale or incorrect assertion, setup, or expectation that contradicts intended behavior → fix the test at its root. NEVER weaken an assertion, add a skip, or relax a timeout to force green.
>     - NEVER change a test to match broken source, and NEVER change source to satisfy a broken test. (Migration code excluded — schema/data migrations are one-time execution paths, not core application logic.)
> 4. **Ask the user when intended behavior is unclear.** If no spec covers the behavior, the spec is silent, or the spec is ambiguous about which side is correct, STOP and a direct user question (or consult the canonical spec owner) before editing either side — never silently pick source or test just to make the suite pass.
>
> Reconcile to intended behavior, never to whichever side currently passes — green can encode the very bug.

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
>    - **SPEC-STALE** — the change is the new intended behavior and the spec now documents the old/wrong behavior → update the spec FIRST via `$spec [mode=update]`, then sync `$spec [mode=tests]` + `$spec [mode=sync]`.
>    - **AMBIGUOUS** — intended behavior is unclear → a direct user question (or the canonical spec owner) before editing either side.
>    - **SPEC-SILENT** — the code correctly enforces an invariant/behavior that NO canonical spec artifact (§3 AC, §4 BR, §5 invariant, §8 TC) states → not drift but an UNWRITTEN rule discovered by review. ENRICH the spec via the **Invariant Harvest** pass (`$spec [mode=sync] direction=harvest` → `spec/references/sync.md`): prove it is always-true (≥2 enforcement points or a rejecting guard), express it as a universally-quantified property, then add the rule to §4 (or §3/§5) AND a §8 TC via `$spec [update]` + `$spec [mode=tests]` and add the guarding test. A discovered invariant left only in code (or only in tests) is INCOMPLETE — this is the highest-value capture (the rule nobody wrote down).
> 3. **Never normalize drift just because code/tests are green** — green can encode the drift itself. Reconcile to canonical intent, never to whichever side currently passes.
>
> A behavior-changing review/implementation that leaves a spec divergence unadjudicated is INCOMPLETE; an unwritten-but-enforced invariant left uncaptured (no §4/§8 entry) is equally INCOMPLETE.

<!-- /SYNC:spec-drift-adjudication -->

<!-- SYNC:integration-test-execution-discipline -->

> **Integration Test Execution Discipline** — How the integration-test family (write · review · verify) runs, diagnoses, and clears a suite. Binds `$integration-test`, `$integration-test-review`, and `$integration-test-verify` identically.
>
> 1. **Verify the WHOLE system passes — not a hand-picked subset.** `$integration-test-verify` must prove the full relevant suite is green (every test in the system the change can touch), not one cherry-picked test. "All pass" is only true with actual runner output (Passed/Failed/Skipped counts + names) and only after 2 consecutive green runs without a DB reset.
> 2. **Drive state through real use-case paths — NEVER hack seed data.** Set up every precondition exactly as a real user would: real commands, queries, production consumers/messages, or valid idempotent seeders. NEVER create or mutate domain data by direct repository writes — that fabricates states a user could never reach and hides the real workflow bug. Hacking seed data to force a green run is forbidden.
> 3. **On ANY failure → `$debug-investigate` the root cause BEFORE any fix.** Do not guess, do not patch the symptom site. Trace the failure end-to-start and classify whose fault it is: test code (wrong assertion/setup), source/production code (real defect), or environment/infrastructure/data. Then route: test-code fault → `$integration-test-review` to fix the test at the root (never weaken assertions or add skips); source-code fault → fix the production defect at the owning layer and report it; environment fault → mark BLOCKED and point at the startup script. NEVER change a test to match broken code.
> 4. **60-second runtime cap — a slow test is a RED FLAG, not a tuning knob.** Local integration tests run fast. If any single test (or a stalled suite) exceeds ~60s, STOP and treat the slowness itself as a defect signal — deadlock, missing `await`, infinite poll/retry, a real network/external call, or an unbounded query. `$debug-investigate` the cause; NEVER paper over it by raising the timeout or extending the wait.
> 5. **Loop until the whole suite is green.** After fixing the validated root cause, restart the full 2-run verification from run 1. Done means the entire relevant suite passes repeatably — never green-once, never a subset.

<!-- /SYNC:integration-test-execution-discipline -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call the current task list first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** the current task list done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `plans/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: plans/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. **Read `docs/project-config.json` first — the project's machine-readable map.** It is the single source of truth for THIS repo (modules/paths, framework + search keywords, test/E2E/integration run-commands, design system, architecture rules, workflow patterns); ground exact paths, run-commands, and conventions on it **before investigating, planning, or coding** — never assume framework defaults (`CLAUDE.md` + reference docs are derived from it). If it — or the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any required reference doc — is missing or stale, auto-run `$project-init` or the narrow route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) first; if Codex mirrors or `AGENTS.md` are stale, ask the user to run `$sync-codex` (never auto-run it).
> 3. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 4. Read every required doc, then before target work state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, `docs/project-config.json` consulted, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Before investigating, planning, or coding, read `docs/project-config.json` (the project map: modules/paths, run-commands, conventions, architecture/workflow rules) + the required project-reference docs, and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project config + conventions override generic framework defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

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

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Prove the reviewed integration tests pass repeatably — 2 consecutive green runs without DB reset, using project-configured run commands — with every pass/fail claim backed by actual test-runner output, never assumption.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Source/Test Drift:** On source change, reconcile affected tests vs source-bug from evidence.
- **Spec↔Tests↔Code Triangulation:** judge the WHOLE PACKAGE (spec §3/§4/§8 + tests + code) for mutual consistency; a disagreeing or missing face is a logged finding, NEVER a silent pass.
- **Spec Drift Adjudication:** on behavior divergence from a canonical spec, classify CODE-WRONG / SPEC-STALE / AMBIGUOUS / SPEC-SILENT and harvest unwritten invariants into §4/§8 + a guarding test — NEVER normalize drift to whichever side is green.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** Expand child phases and link parent when nested; one `in_progress`.
- **Task Tracking & External Report:** Bootstrap tracking; persist plan/review findings to `plans/reports/` incrementally.
- **Critical Thinking:** Traced `file:line` proof per claim; confidence >80% to act.
- **Project Reference Docs:** Read required project docs and `lessons.md` before target work; cite them.

**IMPORTANT MUST ATTENTION** read `docs/project-config.json` → `integrationTestVerify` FIRST — project-specific guidance overrides defaults; missing section → Fallback Mode — why: hardcoded assumptions about the runner break on any non-default stack.
**IMPORTANT MUST ATTENTION** use `quickRunCommand` from config — NEVER hardcode `dotnet test` or any language-specific command — why: this skill is language-agnostic and one repo's runner is another's wrong tool.
**IMPORTANT MUST ATTENTION** read project-specific integration-test reference docs/scripts named by `referenceDocs` before any test command — Codex has no hook injection, so it must open these files directly.
**IMPORTANT MUST ATTENTION** gate on a healthy system before running — run `systemCheckCommand`, and STOP (point user at `startupScript`) when infrastructure/services aren't ready — why: an unreliable system produces unreliable green/red results that prove nothing.
**IMPORTANT MUST ATTENTION** determine the test-project set BEFORE running — `testProjectPattern` glob > `testProjects` list > git auto-detect — and run only projects the change touches unless the user asks for all — why: running irrelevant suites wastes the gate and muddies the result.
**IMPORTANT MUST ATTENTION** pass requires 2 consecutive green runs of each relevant suite WITHOUT DB reset; any single failure restarts the sequence from run 1 — why: a one-off green run hides order-dependent and state-leak flakiness.
**IMPORTANT MUST ATTENTION** when the set has several independent, per-DB-isolated projects, fan out one `integration-tester` sub-agent per project/balanced group in parallel, barrier on ALL returns, then aggregate into the Step 5 report — each sub-agent owns its full 2-run gate and returns real counts + failing names; suites sharing a DB run sequentially — why: parallel runs over a shared DB cross-contaminate state and silently break the no-reset guarantee.
**IMPORTANT MUST ATTENTION** show actual runner output (Passed/Failed/Skipped counts + failing names) — "all passed" without evidence is theater, not verification — confidence >80% to claim PASS, and that confidence rests on the captured output, never assumption.
**IMPORTANT MUST ATTENTION** on failure, diagnose test-bug vs service-bug at the responsible layer BEFORE any edit — fix the root cause; report service bugs as findings, do NOT silently fix — why: patching the symptom site leaves the real defect live.
**IMPORTANT MUST ATTENTION** to make red go green NEVER weaken/remove assertions, add skip annotations, or mutate domain data outside real use-case paths — instead fix the assertion setup or the handler, then re-run the full 2-run sequence — why: a test that no longer protects its invariant is worse than no test.
**IMPORTANT MUST ATTENTION** before authoring or changing any test code, grep 3+ sibling integration tests and follow the local pattern (base fixtures, real DI, no mocks) — cite `file:line` — why: the closest example may not share the same preconditions; verify fit before copying.
**IMPORTANT MUST ATTENTION** bootstrap task tracking before work and mark one task `in_progress` / `completed` at a time; on context loss call the current task list first and resume — never blindly duplicate tasks.
**IMPORTANT MUST ATTENTION** resolve and update the active Goal Contract — append per-run pass/fail evidence to the goal file's Iteration Log and matrix; NEVER copy raw sensitive fixture data into goal files.

**Anti-Rationalization:**

| Evasion                                       | Rebuttal                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| "One green run is enough"                     | 2 consecutive green runs without DB reset, or it isn't verified. Restart on any red. |
| "I'll just hardcode `dotnet test`"            | Read `quickRunCommand` from config — this skill is language-agnostic.            |
| "The test asserts too strictly, relax it"     | Fix the code or the setup, never the assertion. Weakened tests protect nothing.  |
| "Looks like it passed"                        | Show Passed/Failed/Skipped counts from real runner output. No output = no claim. |
| "System probably ready"                       | Run `systemCheckCommand`. Unhealthy system → STOP, point user at `startupScript`. |
| "Too simple to track"                         | Skip depth, never skip task tracking. Wrong assumptions waste more time.         |

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — analyze task size first.

---

**IMPORTANT MUST ATTENTION Goal:** Prove reviewed integration tests pass repeatably — 2 consecutive green runs, no DB reset, every pass/fail claim backed by actual runner output.
**IMPORTANT MUST ATTENTION** read `integrationTestVerify` config FIRST and use its `quickRunCommand` — NEVER hardcode a language-specific runner.
**IMPORTANT MUST ATTENTION** NEVER weaken assertions, add skips, or mutate domain data to force green — fix the root-cause layer (test bug vs service bug) and re-run the full 2-run sequence.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)
## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.
## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**
1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.
## Common AI Mistake Prevention (System Lessons)

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
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Test failure → adjudicate WHO is at fault (source vs test) before forcing green.** A green-again suite is not the goal; the correct verdict on what was actually wrong is. Root-cause first, then triangulate the failure against the governing spec (`docs/specs/**` if one exists) AND the source: SOURCE-WRONG → fix code at the owning layer and keep/strengthen the test; TEST-WRONG → fix the stale assertion/setup at its root. NEVER weaken an assertion, add a skip, or relax a timeout to force green, and never change source to satisfy a broken test. Spec silent or ambiguous about which side is correct → STOP and ask the user.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing.** Pattern-matching as "wrong" skips context. Before changing any constant/limit/flag: read comments, git blame, surrounding code.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
