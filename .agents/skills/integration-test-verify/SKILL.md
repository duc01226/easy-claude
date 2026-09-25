---
name: integration-test-verify
description: '[Testing] Use when a workflow step or the user asks for integration tests to be verified after writing and reviewing them. Flag: --fix-loop adjudicates, fixes and re-verifies under the configured repeat policy.'
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

**Goal:** Prove reviewed integration tests pass under the project's repeat/isolation policy using configured commands and verified preconditions, then report actual runner evidence or an invariant-owner failure verdict.

**Summary:** read-this-if-nothing-else digest —
- **MUST ATTENTION — Contract first:** read `integrationTestVerify` and its docs; derive evidence-backed Unit/Integration/System/E2E applicability, owner/root/data, full/focused commands, zero-match behavior, CI/simple Windows/macOS/Linux entry, run identity, repeat proof, and supported host/container/environment reach. Unresolved applicable fields block; non-applicable tiers need evidence-backed `N/A`.
- **MUST ATTENTION — Steps 1–2:** harvest every documented environment precondition into a cited checklist, run `systemCheckCommand`, settle every row, and STOP `ENVIRONMENT-BLOCKED` on any unmet item; use `startupScript` or documented setup evidence.
- **MUST ATTENTION — Steps 3–4:** discover projects by `testProjectPattern` > `testProjects` > git fallback; run the applicable focused scope, then each relevant full suite under `integrationTestVerify.guidance`. Fan out one `integration-tester` per project/group only with isolated mutable state, wait for all returns before aggregation, and serialize suites that share mutable infrastructure.
- **MUST ATTENTION — Step 5 + failures:** report exact Passed/Failed/Skipped counts, names, exit status, checklist, identity, and Goal Contract evidence; adjudicate before edits, fix test faults at root, report service faults, and recommend `$workflow-integration-test-green` unless this run is already its round.
- **`--fix-loop` (OPTIONAL mode flag — absent by default, and absence changes nothing in this skill):** drives the fixed scope (WHOLE SYSTEM by default) to green in a bounded loop — Goal Contract first, then each round runs this skill's default pass WITHOUT the flag, adjudicates every failure with `$debug-investigate` + report-only `$integration-test-review` into one five-way Fault Verdict, fixes at the invariant-owning component via `$fix`, reviews the fix diff with `$changes-review`, and passes a BLOCKING Round Integrity Check — until `integrationTestVerify.guidance` is satisfied (default: two zero-failure fresh runs without destructive shared-state reset for persistent/shared-state scopes; cap default 3; non-progress, regression, `ENVIRONMENT-BLOCKED`, or `AMBIGUOUS` escalate). **When `--fix-loop` is passed, read `## Mode: --fix-loop` below FIRST.**

**Workflow:**

1. **Read Config + Reference Docs** — Load `docs/project-config.json` → `integrationTestVerify`, read the project's integration-test reference docs, harvest the Environment Precondition Checklist
2. **System Check + Precondition Gate** — Verify the system is healthy AND every harvested precondition is met before running
3. **Determine Test Projects** — Discover via `testProjectPattern` glob, `testProjects` list, or git auto-detect
4. **Run Tests** — Execute `quickRunCommand` on determined projects for the repeat policy declared by `integrationTestVerify.guidance`; when absent, run twice for persistent/shared-state scopes. Fan out parallel `integration-tester` sub-agents only when project boundaries and test-data isolation support it.
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
- ANY failing test at the end of the run → recommend `$workflow-integration-test-green` as the next step (it owns the converge-to-green loop); omit that recommendation when this run is itself a round of that loop
- On an INTERMITTENT failure (red in one run, green in another) → adjudicate the cause first — (a) unrealistic scenario / compressed pacing, (b) harness topology amplification, or (c) genuine product race — and record the verdict with evidence BEFORE any change. NEVER resolve a flake by widening a timeout, adding a retry, or skipping
- Verification must satisfy `integrationTestVerify.guidance`; when absent, require two fresh successful runs for each relevant persistent/shared-state suite, preserving its documented cleanup/reset policy
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
- **Partially healthy / no containers** → tell the user: > "System not fully ready. To start: run `{startupScript}` (or follow the guidance above). Wait for all services to be healthy, then re-run `$integration-test-verify`."
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

- Use only commands from `docs/project-config.json`, named reference docs, or existing runner scripts. Missing focused/partial or simple Windows/macOS/Linux command → record `N/A — <evidence>`; do not invent filters, browser stacks, or `.cmd`/`.ps1`/`.sh` wrappers.
- For applicable focused/partial scope, capture exact Passed/Failed/Skipped counts and exit status. Invalid or zero-match selection must fail or follow documented non-green behavior; zero matches never pass.
- Record unique run identity/data suffix, supported public-path setup, realistic data, idempotent count-before-create setup, keyed/additive persistence, and parallel-worker isolation. These supplement—not replace—the environment and real-DI/use-case gates.

---

## Step 4: Run Tests

Run only after Step 2 passes — healthy system and every harvested precondition `MET` — or docs explicitly state no external system is required.

Use configured `quickRunCommand`. Run the applicable focused/partial scope first and record its exact result; it is diagnostic, never a full-scope substitute. Then run each relevant suite/project under `integrationTestVerify.guidance`; absent guidance, repeat persistent/shared-state suites twice without destructive shared-state reset.

**Repeatability gate:** Any failed required run fails verification. Fix the root cause, then restart the configured repeat sequence. A red/green sequence is INTERMITTENT; use [Intermittent (flaky) failure adjudication](#intermittent-flaky-failure-adjudication--verdict-before-any-change) and record the verdict BEFORE changing anything.

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
- **Each sub-agent owns its configured gate:** complete the repeat policy in `integrationTestVerify.guidance` (default: two fresh no-reset runs for persistent/shared-state scopes), real counts/names, and evidence.
- **Same discipline:** no weakened assertions, skips, or domain-data hacks; failures use the On Test Failure Protocol.
- **Barrier + aggregate:** wait for all, merge per-project tables into Step 5, and fail overall if any project fails its configured repeat gate.

```
# Conceptual fan-out (one sub-agent per project / balanced group), launched together:
integration-tester → {testProject1}  → configured repeat gate → returns counts + failing names
integration-tester → {testProject2}  → configured repeat gate → returns counts + failing names
integration-tester → {testProject3}  → configured repeat gate → returns counts + failing names
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
**Repeatability gate:** {policy from integrationTestVerify.guidance, or default: two fresh no-reset runs for persistent/shared-state suites}
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
5. After any fix → rerun the full configured repeat sequence.
6. **RECOMMEND `$workflow-integration-test-green` whenever this run ends with ANY failure.** This skill reports a snapshot; it does not own convergence. The workflow repeatedly verifies, adjudicates with `$debug-investigate` + `$integration-test-review`, fixes at the invariant-owning component, reviews the fix diff, and runs fresh until the configured repeat policy passes. Surface it in [Next Steps](#next-steps).
   - **EXCEPTION:** when this run IS a round of that loop (a round's default pass inside this skill's `--fix-loop` mode or inside `workflow-integration-test-green`), return counts and failing names instead; recommending the loop inside itself is circular.

**Goal Contract evidence:** Resolve the active Goal Contract (`goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`; plans root default `plans`, with a `docsRoots.plans.path` entry in `docs/project-config.json` winning and `.ck.json` `paths.plans` as the fallback). If present, append command, per-run counts, report path, and mapped success-criteria evidence to its Iteration Log; update Goal Satisfaction rows (`PASS` only when the configured repeat policy is met, `FAIL` with names, `BLOCKED` with user-facing reason). Otherwise record `No active goal — results reported inline only.` NEVER copy raw sensitive fixture data into the goal file.

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

When `runScript` is configured, reference it for the full CI-style run; do not run it directly because OS-specific wrapper scripts (Windows `.cmd`/`.ps1`, macOS/Linux `.sh`) and CI runners require user/pipeline execution:

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
6. **If step 3 found the CODE was wrong (SOURCE-WRONG) and your fix changed production/source code**, route that changed source into a fresh `$changes-review` (or emit a HIGH finding requiring it) BEFORE declaring verification PASS — a source fix that greens a test must not ship un-code-reviewed. (In `workflow-feature`/`workflow-bugfix` the downstream `workflow-review-changes` step already covers this; the route matters for standalone runs.)

If the system is unavailable, report `system not ready` and reference `startupScript` / `runScript`. NEVER change the test.

### Intermittent (flaky) failure adjudication — verdict BEFORE any change

A test that fails on one required run and passes another has NOT identified the cause. **Emit an evidence-backed written verdict BEFORE editing tests, production code, or timeouts.** An unadjudicated flake gets fixed at the nearest site, usually the assertion.

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
5. **Any resolution restarts the configured repeat gate.** An intermittent test is not verified until it satisfies the repeat policy after the fix.

---

<!-- FIX-LOOP-MODE:START -->

## Mode: `--fix-loop` (OPTIONAL convergence loop — verify · adjudicate · fix · re-verify)

> **Activation:** ONLY when the invocation carries `--fix-loop` (e.g. `$integration-test-verify --fix-loop <target>`, or the `integration-test-verify --fix-loop` step of `workflow-integration-test-green`). Without the flag, skip this whole section — Steps 1–5, Fallback Mode, the On Test Failure Protocol, the flake adjudication, Workflow Recommendation, and Next Steps behave exactly as documented above. With the flag, every default gate still binds on each round's verification pass: config + reference docs, the Environment Precondition Checklist, the system check, the tier matrix, focused diagnostics, and the repeat policy from `integrationTestVerify.guidance`. The Workflow Recommendation prompt is skipped (this mode is the bounded loop), and Next Steps after FL-3 omit `$workflow-integration-test-green`.

### Fix-Loop Quick Summary

**Goal:** Drive the fixed integration-test scope to a truthful, repeatable green result: every fix is adjudicated and reviewed at the invariant-owning component, then fresh full default verification passes over `{scope}` satisfy `integrationTestVerify.guidance` with real counts and preserved coverage.

- **MUST ATTENTION Contract first:** resolve `{scope}` (WHOLE SYSTEM by default; an explicit target/diff may narrow it), the Goal Contract, and the Unit/Integration/System/E2E preflight: applicability, owner/root/data, copy-ready full/focused commands, zero-match behavior, CI/Windows entry, identity, isolation, and repeat proof.
- **MUST ATTENTION Round path:** snapshot → inline default verify pass (Steps 1–5, WITHOUT `--fix-loop`) with explicit `{scope}` → record exact counts → on failure, inline `$debug-investigate` + `$integration-test-review` report-only → one Fault Verdict → owning-layer `$fix` → conditional inline report-only `$changes-review` on the fix diff → Round Integrity Check → Iteration Log.
- **MUST ATTENTION Gates:** use config/reference evidence and valid project data setup; require the configured fresh-run/reset policy (default: two no-reset green runs for persistent/shared-state scopes), real runner output, no executed-test shrink, no skipped-count growth, fixed scope, and a bounded cap (default 3). Intermittent failures use the three-way flake adjudication before any change. Non-progress, regression, blocked environment, ambiguity, or open review findings escalate.
- **MUST ATTENTION Terminal/mode:** the protocol loop is primary; `/goal` is optional. Converged standalone runs do `$spec [mode=sync]` → `$docs-update`; parent workflows own declared `$spec [mode=sync]` + `$scan --target=integration-tests` + `$docs-update`. NEVER force green.

**Why this mode exists (READ FIRST):** the default pass says _"After any fix → rerun the full 2-run sequence"_ (Step 5 → On failure) and `SYNC:integration-test-execution-discipline` §5 says _"Loop until the whole suite is green"_, but neither adds a round cap, Goal Contract, shrinking-failure gate, or escalation path — and the default pass only REPORTS service faults. The fix half is also triple-owned: `$integration-test-review` fixes/re-reviews (P5–P8), `$fix --target=test` has its own unbounded repeat (`fix/SKILL.md:218`), and the default pass says fix-and-rerun (Step 5 → On failure); overlapping loops can double-fix or stop after a subset.

This mode gives the loop one bounded, evidence-gated owner: the default verify pass FINDS, `$debug-investigate` + `$integration-test-review` ADJUDICATE, `$fix` RESOLVES, and a fresh full default pass RE-PROVES. Round Integrity rejects lost tests, so "something fixed it" cannot ship on one hand-picked green run.

**Fix-Loop Workflow:** FL-0 resolve `{scope}` + Goal Contract + testability preflight → FL-0b bind the convergence loop → FL-1 repeat { snapshot → default verify pass → exact counts → on failure adjudicate → fix → conditional fix-diff review → integrity check → log } → FL-2 converge on fresh 2/2 zero-failure output → FL-3 terminal spec/doc sync + recap.

**Fix-Loop Key Rules:**

- **MUST ATTENTION NEVER self-invoke with the flag.** Each round's verification is THIS skill's default pass (Steps 1–5) WITHOUT `--fix-loop` — one outer loop, no nesting. Step 4's fan-out `integration-tester` sub-agents receive only the default per-project gate; a sub-agent that receives `--fix-loop` refuses the flag and runs the default pass.
- **MUST ATTENTION Inside a round the default pass REPORTS; it does not fix.** It returns scope, exact counts, and failing names; its Step 5 On-failure fixes and its `$workflow-integration-test-green` recommendation do not fire — that recommendation would restart this loop. Every edit lands through FL-1 steps 5–7.
- **MUST ATTENTION Every round pairs verify → adjudicate → fix → fix-diff review.** Never edit an unadjudicated failure; the nearest fix is usually a bad assertion.
- **MUST ATTENTION Run `$changes-review` INLINE, report-only, on every round's fix diff.** Validate findings and fold them into the same round; unchanged tree → record the skip. Open validated findings block the next round.
- **MUST ATTENTION Default `{scope}` is the WHOLE system.** A named target narrows it; pass `{scope}` explicitly every round, never git auto-detect.
- **MUST ATTENTION Run the default verify pass, `$debug-investigate`, `$integration-test-review`, and `$changes-review` INLINE in the main session (via skill invocation, or Steps 1–5 in this session), NEVER as sub-agents.** Never dispatch this mode itself as a sub-agent. Their internal fan-outs remain their own design.
- **MUST ATTENTION `$integration-test-review` is REPORT-ONLY.** Stop before P5/P6/P7; if it self-fixes, treat that as this round's fix and skip `$fix` to avoid double-fixing.
- **MUST ATTENTION Write one Fault Verdict per failure BEFORE edits:** `TEST-WRONG` · `TEST-NOT-OPTIMAL` · `SOURCE-WRONG` · `ENVIRONMENT-BLOCKED` · `AMBIGUOUS`, with `file:line` evidence and confidence. Ambiguous → ask the user directly.
- **MUST ATTENTION NEVER force green.** Preserve assertions; repair ARRANGE on real observables or fix the product defect. No skips, weakened assertions, widened assertion timeouts, retries around failing assertions, repository-hacked data, or narrowed scope.
- **MUST ATTENTION Converge only on fresh full post-fix output:** zero failures in 2/2 no-reset runs, real runner output, integrity pass, and unchanged working tree on the converging verify. Cap default 3; non-progress, rising failures, cap hit, or blocked environment → escalate.
- **MUST ATTENTION [BLOCKING] task plan:** create detailed tasks before round 1 and regenerate a fresh round plan before EVERY re-run; NEVER reuse the prior round's task list.

### Fix-Loop First Principle — Convergence, Not Motion

> A code change is progress **only if** the next fresh verify has fewer failures.
> Reach a fixed point (whole suite green twice), not a merely passing edit.
> Non-shrinking failures → **escalate**; fewer tests → regression, never convergence.

### FL-0 — Resolve Verification Scope + Goal Contract (FIRST ACTION in `--fix-loop` mode)

1. **Read `docs/project-config.json` → `integrationTestVerify`** before other loop work (the same config Step 1 obeys). Extract `quickRunCommand`, `testProjectPattern`, `testProjects`, `systemCheckCommand`, `startupScript`, and `referenceDocs` for scope and reference-doc resolution.
2. **Resolve `{scope}` — WHOLE SYSTEM by default:**

   | Prompt                               | `{scope}`                                                                                                                                    |
   | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
   | **No target named** (default)        | **Every** integration-test project discoverable via `testProjectPattern` glob > `testProjects` list. The WHOLE system.                       |
   | Names a suite/project/module/feature | Only the test projects covering that target, resolved from the same config; state which projects the target maps to and how you resolved it. |
   | Names a diff/branch/PR               | The test projects covering that change set — this is the ONLY case where change-scoping is correct, and it must be explicit in the prompt.   |

   > **NEVER let the default pass resolve scope by itself.** Step 3's priority ends in git auto-detect and its Filter says _"Run only projects relevant to the current change"_ — correct when it is a workflow step after an edit, WRONG as this loop's default. Pass `{scope}` explicitly to every round's pass. — why: a loop that silently verifies only the changed subset reports "all green" for a system it never ran.

3. **Record `{scope}` as a stable project list.** Keep it FIXED across rounds. If a fix legitimately adds a test project, widen it and log why; narrowing is forbidden.
4. **Resolve/create the Goal Contract** per `SYNC:goal-contract-satisfaction-loop` (carried below; `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md` — plans root default `plans`, a `docsRoots.plans.path` entry in `docs/project-config.json` wins, else `.ck.json` `paths.plans`; template `.claude/templates/goal-contract-template.md`). Its single **required** Success Criterion:

   > _A fresh full default `$integration-test-verify` pass over `{scope}` reports **zero failed tests** across **2 consecutive runs without a DB reset**, evidenced by actual test-runner output (Passed/Failed/Skipped counts), with no test deleted, skipped, or weakened to get there._

   Record in **Constraints**: `{scope}`, round cap (default 3), baseline executed/skipped counts after round 1, and `quickRunCommand`.

#### Fix-Loop Test Architecture Contract Preflight (before Round 1)

Before round 1, carry the Step 3b tier contract into the loop. Mark Unit, Integration/System, and E2E `APPLICABLE` only with runner/framework/configuration evidence; otherwise record `N/A — <evidence>` and never fabricate a project or command.

| Tier | Full command | Focused/partial command | Zero-match behavior | Run identity / data mode | Parallel isolation | Simple Windows/macOS/Linux entry point |
| ---- | ------------ | ------------------------ | ------------------- | ------------------------ | ------------------ | --------------------------- |
| Unit | `{copy-ready command or N/A + evidence}` | `{copy-ready command or N/A + evidence}` | `{documented non-zero behavior}` | `{unique identity; reference/additive mode}` | `{worker/root strategy}` | `{entry point or N/A + evidence}` |
| Integration/System | `{copy-ready command}` | `{copy-ready command or N/A + evidence}` | `{documented non-zero behavior}` | `{unique identity; reference/additive mode}` | `{worker/root strategy}` | `{entry point or N/A + evidence}` |
| E2E | `{configured command or N/A + evidence}` | `{configured command or N/A + evidence}` | `{documented non-zero behavior}` | `{unique identity; reference/additive mode}` | `{worker/root strategy}` | `{entry point or N/A + evidence}` |

- Use only config/reference/script-backed commands. When focused scope applies, the round's default pass returns exact Passed/Failed/Skipped counts and exit status; invalid or zero-match selection must fail or follow documented non-green behavior and never count as green.
- Preserve supported public-path setup, realistic pacing/barriers, idempotent count-before-create reference data, keyed/additive persistence, and isolated mutable roots every round. Focused output is evidence, not a substitute for fixed full scope.
- Append the matrix, commands/scopes, identity, seed/accumulation mode, exact results, and repeat proof to the Goal Contract Iteration Log; missing evidence blocks convergence.

### FL-0b — Bind the Convergence Loop (protocol-first; `/goal` is an optional accelerator)

Two layers bind the loop. The **protocol loop (FL-1–FL-2) is BINDING** and self-driven on every host, with or without a command or hook. `/goal` is an **OPTIONAL accelerator**, never the primary mechanism; its absence NEVER weakens the loop. Hooks/trackers accelerate only — correctness cannot depend on them.

**1. Protocol loop — ALWAYS binding (hook/command-independent).** Do not stop until convergence or bounded escalation. This binds Claude, Codex, and Copilot whether or not `/goal` exists:

> Repeatedly run the default `$integration-test-verify` pass (WITHOUT `--fix-loop`) INLINE over `{scope}` (passed explicitly, never re-derived). After each run, if ANY test failed, adjudicate every failure with `$debug-investigate` + `$integration-test-review` (report-only) into ONE Fault Verdict, apply the fix via `$fix` at the owning layer, then re-run a FRESH full default pass over `{scope}`. Do NOT stop while the last verify still reported a failing test. Converge ONLY when a fresh full verify reports zero failures across 2 consecutive runs without a DB reset AND the Round Integrity Check passes (executed test count not shrunk, skipped count not grown). Cap at `{N=3}` rounds (default 3); if the failing count does not shrink across 2 consecutive rounds, failures increase, the cap is hit with failures still open, or any failure is ENVIRONMENT-BLOCKED → STOP and escalate by asking the user directly. Never loop open-ended, and NEVER reach green by weakening, skipping, deleting, or de-scoping a test.

Re-read this obligation at every FL-2 checkpoint; it is not a one-time note. The Goal Contract's required Success Criterion (FL-0) is the durable, host-independent record.

**2. `/goal` command — invoke as an accelerator WHEN AVAILABLE.** If permitted and available, ALSO invoke it as a real command with the SAME condition; do not paraphrase it or substitute the Goal Contract, so the session Stop hook can enforce the loop:

```
/goal integration-test green convergence loop: repeatedly run the default $integration-test-verify pass (WITHOUT --fix-loop) INLINE over {scope} (passed explicitly). If any test failed → adjudicate each failure with $debug-investigate + $integration-test-review (report-only) into one Fault Verdict, fix via $fix at the owning layer, and run another round. If a fresh full verify reports zero failures across 2 consecutive runs without DB reset AND executed test count has not shrunk and skipped count has not grown → CONVERGED, run the terminal $spec [mode=sync] + $docs-update and clear the gate. Do NOT stop while the last verify still reported a failing test. Cap at {N=3} rounds (default 3); if the failing count does not shrink across 2 consecutive rounds, failures increase, the cap is hit with failures open, or a failure is ENVIRONMENT-BLOCKED → STOP and escalate by asking the user directly. Never loop open-ended; never reach green by weakening, skipping, deleting, or de-scoping a test.
```

The `/goal` Stop hook blocks stopping until the condition holds and auto-clears when met; do not tell the user to clear it.

**If `/goal` is unavailable, unregistered, or not permitted** (e.g. Codex/Copilot or a Claude run without it): DO NOT error, block, or invent a stand-in gate. Record ONE Goal Contract line — `/goal accelerator unavailable — loop bound by protocol (FL-1–FL-2) + this Goal Contract` — and proceed. The protocol loop plus Goal Contract remain the gate.

> **Nested gates (by design):** `$debug-investigate` self-binds `$why-review`; `$integration-test-review` is REPORT-ONLY, deferring P5 fix/P6 re-review to this caller. No inner fix gate is installed. THIS outer loop owns the single convergence gate; all gates self-clear on satisfaction. Do NOT tell the user to clear them.

### FL-1 — Round Loop (verify → adjudicate → fix → review → integrity-check → log)

Each round has four halves — **verify finds, adjudication diagnoses, fix resolves, `$changes-review` proves the fix.** For round `R` (start at 1), do ALL:

1. **Snapshot before:** record `git status --porcelain` + `git diff --stat`. This fixes-applied baseline also backstops FL-2 convergence detection.
2. **Run the default verify pass INLINE** — Steps 1–5 of this skill in the main session, or `$integration-test-verify {scope}` WITHOUT `--fix-loop` via skill invocation (NEVER `spawn_agent`) — passing `{scope}` **explicitly**. Its contract is system check → named projects → applicable focused/partial scope with exact counts/status → **2-consecutive-green-runs-without-DB-reset** full gate → real Passed/Failed/Skipped counts and failing names. Let it fan out bounded `integration-tester` sub-agents per isolated project (Step 4 → Parallel execution across multiple test projects). Mark this IS a loop round, so it returns counts/names instead of fixing or recommending `$workflow-integration-test-green`; that recommendation would restart this loop.
3. **Record counts:** focused/partial command, scope, status when applicable; per-project and total executed/passed/failed/skipped from **actual runner output**; run identity and seed/accumulation mode. These feed integrity and shrinking-failure gates. No output = no counts = no claim.
4. **If failures = 0** and the 2-run gate was green → this round converged; go to FL-2 (no adjudication or fix half needed).
5. **If failures > 0 — ADJUDICATE.** Run BOTH, INLINE, in this order, per failure or cluster:

   **(a) `$debug-investigate`** — trace end-to-start to the owning layer; produce a confidence-scored `file:line` root cause validated by `$why-review`. Investigation ONLY; never patch (`debug-investigate/SKILL.md:22`).

   **(b) `$integration-test-review` — REPORT-ONLY** — review failing tests **and exercised production code**. Its 8 gates supply the test-side verdict: G1 assertion value/mutation probe, G2 data state, G3 repeatability, G4 domain logic, G5 spec traceability, G6 three-way sync, G7 change coverage, G8 scenario fidelity. **STOP after findings** — no P5 fix, P6 re-review, or P7 build/run; this loop owns fixing and re-running.

   **Combine (a) + (b) into ONE written Fault Verdict per failure, BEFORE any edit:**

   | Verdict                 | Meaning                                                                                                                                                                                                                | Evidence required                                                                                                                                          | Resolution                                                                                                                                                                                                                                                            |
   | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | **TEST-WRONG**          | The test encodes a stale or incorrect assertion, setup, or expectation that contradicts intended behavior                                                                                                              | The governing spec (§3 AC / §4 BR / §5 invariant / §8 TC) or the handler source shows the production behavior is correct and the test is not (`file:line`) | Fix the test at its root. NEVER weaken an assertion, add a skip, or relax a timeout.                                                                                                                                                                                  |
   | **TEST-NOT-OPTIMAL**    | The test is directionally right but mis-specified — unrealistic scenario, compressed actor pacing, blind sleep, missing ARRANGE barrier, shared-state repeatability defect, smoke-only or DI-resolution-only assertion | The failing G3/G8 gate plus the ARRANGE block read as a production trace (`file:line`)                                                                     | Repair the SCENARIO — add an ARRANGE-phase settle barrier polling a real observable, unique data per run, real use-case setup. NEVER a widened assertion timeout or a retry around the assertion.                                                                     |
   | **SOURCE-WRONG**        | Production code violates the spec's intended behavior or a clear invariant                                                                                                                                             | `$debug-investigate`'s traced root cause at the invariant-owning layer (`file:line`, confidence ≥60%)                                                      | Fix the source at the **lowest owning layer** (Entity > Service > Handler), never the crash site. **Keep or strengthen** the test that caught it, and route the changed source into `$changes-review` before declaring PASS (On Test Failure Protocol step 6). |
   | **ENVIRONMENT-BLOCKED** | Infrastructure, services, containers, or data fixtures are not ready — the system, not the code, is failing                                                                                                            | The `systemCheckCommand` output or the runner error naming the unavailable dependency                                                                      | **STOP the loop and escalate.** Point the user at `startupScript`. NEVER change a test because the system was down (On Test Failure Protocol).                                                                                                          |
   | **AMBIGUOUS**           | Intended behavior is unclear — no spec covers it, the spec is silent, or spec and code disagree with no tiebreaker                                                                                                     | State exactly what is undetermined and which artifacts you checked                                                                                         | **ask the user directly before editing either side.** NEVER silently pick source or test just to make the suite pass.                                                                                                                                                     |

   **Intermittent failures (red in one run of the 2-run gate, green in the other) use the three-way flake adjudication instead** — (a) unrealistic scenario / compressed pacing, (b) harness topology amplification, (c) genuine product race — per Intermittent (flaky) failure adjudication above. Record the verdict with evidence BEFORE any change; do NOT file (c) until (a) and (b) are ruled out.

6. **Run `$fix` on adjudicated verdicts** (failures > 0 only). Resolve at the owning layer: `SOURCE-WRONG` → `$fix` (`--target` routing) or lowest invariant-owning layer; `TEST-WRONG`/`TEST-NOT-OPTIMAL` → repair test/scenario at root; missing §8 TC from G5/G7 → `$spec [mode=tests]`; spec divergence → `SYNC:spec-drift-adjudication` (`$spec [update]` for SPEC-STALE, BLOCKING fix for CODE-WRONG). Fix ONLY adjudicated verdicts.

   > **If `$integration-test-review` could not be constrained to report-only and already applied its P5 fixes**, treat those as this round's fix half (detect fixes-applied against the FL-1.1 snapshot) and SKIP this step for that round — never double-fix the same failure.

7. **CONDITIONAL — run `$changes-review` on the round's fix diff only when ANY fix landed.** Compare the tree with the FL-1.1 snapshot: unchanged → record `No fix applied this round — $changes-review skipped`; changed → run it on every round's fixes.

   - **Scope = exactly this round's changed files**, not the whole branch: source, tests, scenarios, specs/TCs since the FL-1.1 snapshot — why: prior reviews have not seen only these changes.
   - **Run INLINE via skill invocation, REPORT-ONLY**; stop before Phase 7 self-fix, 7.5 holistic, and 8 docs-update (`changes-review/SKILL.md:63-65` workflow rows, `:205-207` task rows). NEVER dispatch as a sub-agent; its own Phase 0.7 reviewers remain sub-agents (`changes-review/SKILL.md` Phase 0.7 Step 2.5).
   - **Validate, then fold findings into THIS round's fix set:** run `$why-review --validate-findings`; apply every VALIDATED finding at its owning layer. The next fresh full verify re-proves them; do NOT open a nested review→fix loop.
   - **Unfixable validated finding → STOP & escalate** by asking the user directly (FL-2); green tests do not close it.
   - This once-per-round diff review subsumes the `SOURCE-WRONG` routing obligation (On Test Failure Protocol step 6) and also covers test/spec fixes.

   — why: green tests cannot see a wrong layer, broken invariant, dead code, leaked domain concept, or security/performance regression.

8. **Round Integrity Check (no fake green) — BLOCKING before the round can count as progress.** Compare this round's counts (FL-1.3) against the prior round's:

   | Signal                                     | Meaning                                                                           | Action                                                                                       |
   | ------------------------------------------ | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
   | Executed test count **decreased**          | Tests were deleted, renamed out of discovery, filtered out, or the scope narrowed | **REGRESSION → STOP & escalate.** Restore the tests. A smaller suite is not a greener suite. |
   | Skipped count **increased**                | A failure was hidden behind a skip annotation                                     | **REGRESSION → STOP & escalate.** Remove the skip and adjudicate the failure properly.       |
   | `{scope}` project list **shrank**          | The loop de-scoped its way to green                                               | **REGRESSION → STOP & escalate.** `{scope}` is fixed (FL-0.3).                               |
   | Counts stable or grown, failures shrinking | Genuine progress                                                                  | Continue to FL-2.                                                                            |

    — why: removing what fails is a cheap fake exit; this check protects coverage.

9. **Append an Iteration Log entry** to the Goal Contract: round; full/focused commands, scopes, and statuses; identity and seed/accumulation mode; per-project counts; failing names; each Fault Verdict with `file:line` evidence/confidence; fixes (`file:line`); `$changes-review` verdict or explicit skip; integrity result; remaining gaps.

### FL-2 — Convergence & Escalation Gate

After every round, apply this gate:

| Condition                                                                                                                                                                                                                       | Action                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fresh full default verify pass over `{scope}` reported **zero failures across 2 consecutive runs without a DB reset**, AND the Round Integrity Check passed, AND the working tree is unchanged by that final verify pass       | **CONVERGED** → mark the required criterion PASS in the Goal Satisfaction matrix (attaching the runner output) → clear the `/goal` gate → go to FL-3.        |
| Failures > 0 AND round `< N` AND the failing count shrank vs the prior round AND integrity held                                                                                                                                 | Apply the adjudicated fixes (FL-1.6), then run round `R+1` (fresh full re-verify over the SAME `{scope}`).                                                   |
| Failing count did **not shrink** across 2 consecutive rounds (same/increasing count)                                                                                                                                            | **STOP & escalate** by asking the user directly — a non-converging loop is a signal, not a reason to spin.                                                         |
| Round cap `N` hit with failures still open                                                                                                                                                                                      | **STOP & escalate** by asking the user directly — report the still-failing tests with their Fault Verdicts; do not silently continue.                              |
| Any failure adjudicated **ENVIRONMENT-BLOCKED**                                                                                                                                                                                 | **STOP & escalate immediately** — mark the criterion BLOCKED with a user-facing reason and point at `startupScript`. Never loop against an unhealthy system. |
| Any failure adjudicated **AMBIGUOUS**                                                                                                                                                                                           | **PAUSE and ask the user directly** before the fix — resume the loop with the user's answer.                                                                     |
| Round Integrity Check failed (tests lost, skips added, scope narrowed)                                                                                                                                                          | **STOP & escalate** — restore the lost coverage first; this is a regression, not progress.                                                                   |
| The round's `$changes-review` (FL-1.7) left **validated findings unfixed**                                                                                                                                                      | **STOP & escalate** by asking the user directly — a green suite does not clear an open, validated review finding on the fix that greened it.                       |

> **Increasing failures = STOP.** More failures than round `R-1` means regression; escalate immediately. Never trade one green test for two red ones.

### FL-3 — Terminal Spec/Doc Sync + Recap

1. **Terminal sync (MANDATORY once converged, when STANDALONE).** Run deferred downstream sync in order:
   - **`$spec [mode=sync]`** — reconcile §8 TCs ↔ the executing test code; update every `CoveredBy` field for tests the loop changed or added.
   - **`$docs-update`** — update impacted docs: the integration-test reference doc, feature-doc evidence fields, and version history if coverage changed materially.

    > **When a parent workflow already declares `$spec [mode=sync]`, `$scan --target=integration-tests`, and `$docs-update`** (e.g. `workflow-integration-test-green`), SKIP this sub-step, let the workflow own it, and say so in the recap. — why: duplicate sync churns the same files and obscures ownership.

2. **Recap.** Report rounds, shrinking failure counts, each round's Fault Verdicts/fixes, both final zero-failure outputs, integrity trail (executed/skipped per round), Goal Satisfaction matrix (required criterion PASS), round reports under `tmp/reports/`, and Goal Contract Iteration Log. Do NOT commit or push unless explicitly asked.

### Fix-Loop Convergence Detection — Why Five Conditions

A round converges ONLY when **all five** hold; each blocks a different false-green path:

1. **Fresh verify over post-fix code** — pre-fix green proves nothing; every fix invalidates the prior verdict.
2. **Zero failed tests** — one red test means unconverged; "known failures" do not count.
3. **2 consecutive green runs without DB reset** — the default pass owns this gate (Key Rules; Step 4 two-run idempotency gate); one run hides order/state flakiness.
4. **Real runner output** — Passed/Failed/Skipped counts and names; "looks like it passed" is theater (On Test Failure Protocol).
5. **Round Integrity Check passed** — executed count not shrunk, skipped count not grown, `{scope}` not narrowed; the other four cannot detect lost tests.

**Working-tree-unchanged backstop:** the converging verify pass must land no fix. If it mutates files, the round DID fix things; run another round.

Unfixable failures (product decision, unclear intent, environment) → **escalate**, do not loop. Convergence is a fixed point, not one green read.

**IMPORTANT MANDATORY `--fix-loop` sequence:** FL-0 (resolve `{scope}` — WHOLE SYSTEM by default — + Goal Contract) → FL-0b (bind the convergence loop: protocol loop primary + optional `/goal` accelerator) → FL-1 (round loop: default verify pass INLINE WITHOUT the flag → on failure `$debug-investigate` + `$integration-test-review` report-only → ONE Fault Verdict per failure → `$fix` at the owning layer → CONDITIONAL `$changes-review` on the round's fix diff when any fix landed → Round Integrity Check → log) → FL-2 (converge on a zero-failure 2/2-green fresh verify / escalate on non-progress, blocked environment, or lost coverage) → FL-3 (terminal `$spec [mode=sync]` + `$docs-update` when standalone + recap). Shared protocols this mode relies on — `SYNC:goal-contract-satisfaction-loop`, `SYNC:test-failure-fault-adjudication`, `SYNC:integration-test-execution-discipline`, `SYNC:real-world-fidelity-testing`, `SYNC:spec-tests-code-triangulation`, `SYNC:spec-drift-adjudication`, `SYNC:source-test-drift-check`, `SYNC:trade-off-interrogation-gate`, `SYNC:test-architecture-execution-contract` — are carried once below; never re-copy them into this section.

<!-- FIX-LOOP-MODE:END -->

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If not already in a workflow, use ask the user directly; the user chooses. Do NOT decide this is "simple enough to skip":
>
> 1. **Activate `workflow-write-integration-test` workflow** (Recommended) — investigate → `spec [mode=tests]` → artifact-review --type=spec-tests → integration-test → integration-test-review → integration-test-verify → `spec [mode=sync]` → docs-update → workflow-end → watzup
> 2. **Execute `$integration-test-verify` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** after this skill, use ask the user directly to present these options. Do NOT skip because the task seems "simple" or "obvious":

**Any failure → list `$workflow-integration-test-green` first**; it owns the converge-to-green loop this snapshot skill does not. All green → lead with `$workflow-review-changes`.

- **"$workflow-integration-test-green (Recommended when ANY test failed)"** — verify → adjudicate → fix at the owning layer → review the fix diff → fresh re-verify until the 2-run gate passes. Omit when this run was a round of that loop or the suite is fully green.
- **"$workflow-review-changes (Recommended when all green)"** — Review all changes before committing
- **"$integration-test-review"** — Review the failing tests only (report-only fault opinion), without entering the convergence loop
- **"$docs-update"** — Update documentation if test counts changed
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.
> **[IMPORTANT]** A verify step without 2 consecutive test runs is not repeatability verification.
> Read project config FIRST for this project's run command.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `environment-fault-hypothesis` — Weigh the environment as a competing cause, with a named discriminator; judging a bug report, failing test, error or unexpected output → .claude/skills/shared/protocols/environment-fault-hypothesis.md
- `goal-contract-satisfaction-loop` — Save the goal in a file and loop until every saved criterion passes; executing work against a user goal → .claude/skills/shared/protocols/goal-contract-satisfaction-loop.md
- `integration-test-execution-discipline` — How integration tests are written, reviewed, run, diagnosed and cleared; working in the integration-test skill family → .claude/skills/shared/protocols/integration-test-execution-discipline.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `real-world-fidelity-testing` — Integration, E2E and system tests exercise real boundaries; authoring, reviewing or repairing integration, E2E or system tests → .claude/skills/shared/protocols/real-world-fidelity-testing.md
- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md
- `spec-drift-adjudication` — Decide code-wrong versus spec-stale from evidence, never silently; behavior diverges from its spec → .claude/skills/shared/protocols/spec-drift-adjudication.md
- `spec-tests-code-triangulation` — Review spec, tests and code together for mutual consistency first; reviewing behavior that has a spec → .claude/skills/shared/protocols/spec-tests-code-triangulation.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
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

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm by asking the user directly BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** ask the user directly reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

<!-- SYNC:environment-fault-hypothesis:reminder -->

**MUST ATTENTION** environment-fault gate: a bug, failed test, error, or odd output is NOT proof of a code defect. Sweep environment preconditions (versions, deps/install state, config & env vars, services, ports/network/clock, permissions, leftover state) and resource/transience suspects (RAM, CPU, disk, handles, network, timeouts) as a competing hypothesis, cite the discriminator you ran, and fix an environment cause in the environment — never by editing code or weakening a test. "Flaky" is a symptom, not a verdict.

<!-- /SYNC:environment-fault-hypothesis:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Prove reviewed integration tests pass repeatably: run each relevant suite twice without DB reset using configured commands and verified doc-declared preconditions, then report actual runner evidence or an owning-layer failure verdict.

**IMPORTANT MUST ATTENTION** record exact scope, commands, exit status, counts, failure names, identity, and repeat proof from real runner output before reporting a verdict.
**IMPORTANT MUST ATTENTION** preserve owned business-outcome assertions and diagnose the responsible layer; never substitute broker, scheduler, or other infrastructure bookkeeping for the system state this suite owns.

**IMPORTANT MUST ATTENTION — Main steps (in order):** (1) read config/reference docs; (2) harvest a cited environment checklist; (3) run system + precondition gates; (4) record the tier matrix and determine touched projects; (5) run focused diagnostics, then two consecutive no-reset full runs; (6) report exact output and Goal Contract evidence; (7) adjudicate failures at the owning layer and route the convergence workflow when needed.

**IMPORTANT MUST ATTENTION — Modes/gates:** missing config → Fallback Mode and root-file runner detection; configured `runScript` → CI-style reference only; standalone failures → workflow recommendation, except when this run is already that loop's round or a `--fix-loop` round. Applicable Unit/Integration/System/E2E/Performance tiers require runner evidence or `N/A`; record copy-ready full/focused commands, zero-match non-green behavior, simple Windows/macOS/Linux and host/container entries when supported, environment reach, identity/data mode, and isolation.

**IMPORTANT MUST ATTENTION `--fix-loop` (OPTIONAL mode — only when the flag is passed):** without the flag nothing below applies and the default pass is unchanged.

- **MUST ATTENTION** FL-0 first: resolve `{scope}` (WHOLE SYSTEM by default, passed explicitly every round, NEVER shrinks), the Goal Contract with its zero-failure / 2-consecutive-no-reset / no-test-lost criterion, and the testability preflight; FL-0b binds the protocol loop (primary) + optional `/goal` accelerator.
- **MUST ATTENTION** each round runs THIS skill's default pass WITHOUT `--fix-loop` (never a recursive self-invocation with the flag), INLINE in the main session; the round's pass reports counts/names and does not fix or recommend `$workflow-integration-test-green`.
- **MUST ATTENTION** every failure gets ONE written Fault Verdict BEFORE any edit — `TEST-WRONG` · `TEST-NOT-OPTIMAL` · `SOURCE-WRONG` · `ENVIRONMENT-BLOCKED` · `AMBIGUOUS` — from INLINE `$debug-investigate` + REPORT-ONLY `$integration-test-review` (self-fixed → skip `$fix`, NEVER double-fix); `SOURCE-WRONG` fixes use the lowest invariant-owning layer and keep/strengthen the catching test.
- **MUST ATTENTION** any fix landed → INLINE report-only `$changes-review` over that round's fix diff, validate with `$why-review --validate-findings`, fold validated findings into the same round; an open validated finding blocks convergence.
- **MUST ATTENTION** Round Integrity is BLOCKING: executed count must not decrease, skipped count must not increase, `{scope}` must not shrink — otherwise STOP, escalate, restore coverage.
- **MUST ATTENTION** converge only on ALL FIVE: fresh post-fix full verify · zero failures · 2 consecutive no-reset green runs · real counts/names · integrity pass, plus an unchanged working tree on the converging pass; round cap default 3; non-shrinking failures across 2 rounds, rising failures, cap with open failures, `ENVIRONMENT-BLOCKED`, `AMBIGUOUS`, lost coverage, or open validated review findings → STOP & escalate by asking the user directly.
- **MUST ATTENTION** converged standalone → `$spec [mode=sync]` + `$docs-update`; a parent workflow declaring them owns them. Ask the 3 trade-off questions before every fix; a MATERIAL trade-off pauses the loop for user confirmation.

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
**IMPORTANT MUST ATTENTION** on failure, FIRST read `$integration-test-review`, diagnose test-vs-service fault; fix test faults at root, report service faults instead of silently fixing them, and NEVER weaken assertions, add skips, or mutate domain data through repositories.
**IMPORTANT MUST ATTENTION** adjudicate intermittent failures before any change as (a) unrealistic pacing, (b) harness amplification, or (c) genuine product race; do NOT file (c) until (a)/(b) are ruled out.
**IMPORTANT MUST ATTENTION** any standalone failure → recommend `$workflow-integration-test-green` first; omit that recommendation inside its own round. Resolve and update the active Goal Contract, and NEVER copy raw sensitive fixture data into it.

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
| "Tests failed — report it and stop"           | Reporting red is half the job. Recommend `$workflow-integration-test-green`; it owns the loop that clears the suite. |
| "System probably ready"                       | Run `systemCheckCommand`. Unhealthy system → STOP, point user at `startupScript`. |
| "I read the reference doc, that's the gate"   | Reading is not checking. Harvest the preconditions into a cited checklist and settle every row before the first test command. |
| "systemCheckCommand is green, skip the checklist" | It verifies only what the config author encoded. The doc's preconditions are the ones the runner silently assumes — verify each. |
| "Env is half-up, run the suite and see"       | A half-ready environment reports infrastructure faults as failing tests. STOP, report ENVIRONMENT-BLOCKED, name the unmet precondition. |
| "Too simple to track"                         | Skip depth, never skip task tracking. Wrong assumptions waste more time.         |
| "`--fix-loop`: only the changed tests matter" | `{scope}` defaults to the WHOLE system and is passed explicitly. A subset green is not a suite green. |
| "`--fix-loop`: I deleted/skipped the failing test, now it's green" | Executed count down or skipped count up is a Round Integrity REGRESSION → STOP & escalate and restore it. |
| "`--fix-loop`: root cause is obvious, just fix it" | One written Fault Verdict per failure, with `file:line` evidence, BEFORE any edit. Nearest-attention fixes patch the assertion. |
| "`--fix-loop`: review already fixed it, and so did $fix" | Report-only mode means `$fix` owns the fix. If review self-fixed, SKIP `$fix` that round — never double-fix. |
| "`--fix-loop`: tests are green, no need to review the fix" | Green cannot see a wrong-layer fix, a broken invariant elsewhere, or a security/perf regression. Any fix landed → `$changes-review` that round. |
| "`--fix-loop`: round 3 hit, close enough" | Cap hit with failures open → STOP & escalate with the still-failing tests and their verdicts. Never silently continue. |
| "`--fix-loop`: re-run myself with the flag for the next round" | Each round is the default pass WITHOUT the flag. One outer loop, no nesting. |

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — analyze task size first.

> **Closing principle — Easy to Change:** judge every test, fix, or abstraction by whether it lowers future change cost; reject added coupling, hidden state, duplicated knowledge, or unclear intent.

---

**IMPORTANT MUST ATTENTION Goal:** Prove reviewed integration tests pass repeatably: run each relevant suite twice without DB reset using configured commands and verified doc-declared preconditions, then report actual runner evidence or an owning-layer failure verdict.
**IMPORTANT MUST ATTENTION** read `integrationTestVerify` config and project reference docs FIRST, harvest cited preconditions, settle every row before the first test command, and use `quickRunCommand` — NEVER hardcode a language-specific runner.
**IMPORTANT MUST ATTENTION** NEVER weaken assertions, add skips, or mutate domain data to force green — fix the root-cause layer and rerun the full 2-run sequence.
**IMPORTANT MUST ATTENTION** `--fix-loop` (optional) = bounded verify → Fault Verdict → owning-layer fix → fix-diff review → integrity check loop over a fixed WHOLE-SYSTEM scope until 2 consecutive zero-failure runs; each round is the default pass WITHOUT the flag, and escalation beats spinning.

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
