---
name: integration-test-verify-loop
version: 1.0.0
description: '[Testing] Use when driving an integration-test suite to fully green — verify, adjudicate each failure, fix at the owning layer, re-verify, until 2 consecutive green runs.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Drive the fixed integration-test scope to a truthful, repeatable green result: every fix is adjudicated and reviewed at its owning layer, then fresh full `/integration-test-verify` runs over `{scope}` report zero failures in 2 consecutive no-DB-reset runs with real counts and preserved coverage.

**Summary:**
- **MUST ATTENTION Contract first:** resolve `{scope}` (WHOLE SYSTEM by default; an explicit target/diff may narrow it), the Goal Contract, and the Unit/Integration/System/E2E preflight: applicability, owner/root/data, copy-ready full/focused commands, zero-match behavior, CI/Windows entry, identity, isolation, and repeat proof.
- **MUST ATTENTION Round path:** snapshot → inline `/integration-test-verify` with explicit `{scope}` → record exact counts → on failure, inline `/debug-investigate` + `/integration-test-review` report-only → one Fault Verdict → owning-layer `/fix` → conditional inline report-only `/changes-review` on the fix diff → Round Integrity Check → Iteration Log.
- **MUST ATTENTION Gates:** use config/reference evidence and real use-case data; require 2 fresh no-reset green runs, real runner output, no executed-test shrink, no skipped-count growth, fixed scope, and a bounded cap (default 3). Intermittent failures use the three-way flake adjudication before any change. Non-progress, regression, blocked environment, ambiguity, or open review findings escalate.
- **MUST ATTENTION Terminal/mode:** the protocol loop is primary; `/goal` is optional. Converged standalone runs do `/spec [mode=sync]` → `/docs-update`; parent workflows own declared `/spec [mode=sync]` + `/scan --target=integration-tests` + `/docs-update`. NEVER force green.

**Why this skill exists (READ FIRST):** Loop obligations are scattered across three skills: `/integration-test-verify` says _"After fixing → re-run the full 2-run verify sequence"_ (`integration-test-verify/SKILL.md:238`) and its execution-discipline §5 says _"Loop until the whole suite is green"_ (`:404`), but neither adds a round cap, Goal Contract, shrinking-failure gate, or escalation path. The fix half is also triple-owned: `/integration-test-review` fixes/re-reviews (P5–P8), `/fix --target=test` has its own unbounded repeat (`fix/SKILL.md:218`), and verify says fix-and-rerun (`:232-238`); overlapping loops can double-fix or stop after a subset.

This skill gives the loop one bounded, evidence-gated owner: verify FINDS, `/debug-investigate` + `/integration-test-review` ADJUDICATE, `/fix` RESOLVES, and fresh full verify RE-PROVES. Round Integrity rejects lost tests, so "something fixed it" cannot ship on one hand-picked green run.

**Workflow:** resolve `{scope}` + Goal Contract + testability preflight → bind the convergence loop → repeat { snapshot → inline verify → exact counts → on failure adjudicate → fix → conditional fix-diff review → integrity check → log } → converge on fresh 2/2 zero-failure output → terminal spec/doc sync + recap.

**Key Rules:**

- **MUST ATTENTION Every round pairs verify → adjudicate → fix → fix-diff review.** Never edit an unadjudicated failure; the nearest fix is usually a bad assertion.
- **MUST ATTENTION Run `/changes-review` INLINE, report-only, on every round's fix diff.** Validate findings and fold them into the same round; unchanged tree → record the skip. Open validated findings block the next round.
- **MUST ATTENTION Default `{scope}` is the WHOLE system.** A named target narrows it; pass `{scope}` explicitly every round, never git auto-detect.
- **MUST ATTENTION Run `/integration-test-verify`, `/debug-investigate`, `/integration-test-review`, and `/changes-review` INLINE via `Skill`, NEVER as sub-agents.** Their internal fan-outs remain their own design.
- **MUST ATTENTION `/integration-test-review` is REPORT-ONLY.** Stop before P5/P6/P7; if it self-fixes, treat that as this round's fix and skip `/fix` to avoid double-fixing.
- **MUST ATTENTION Write one Fault Verdict per failure BEFORE edits:** `TEST-WRONG` · `TEST-NOT-OPTIMAL` · `SOURCE-WRONG` · `ENVIRONMENT-BLOCKED` · `AMBIGUOUS`, with `file:line` evidence and confidence. Ambiguous → `AskUserQuestion`.
- **MUST ATTENTION NEVER force green.** Preserve assertions; repair ARRANGE on real observables or fix the product defect. No skips, weakened assertions, widened assertion timeouts, retries around failing assertions, repository-hacked data, or narrowed scope.
- **MUST ATTENTION Converge only on fresh full post-fix output:** zero failures in 2/2 no-reset runs, real runner output, integrity pass, and unchanged working tree on the converging verify. Cap default 3; non-progress, rising failures, cap hit, or blocked environment → escalate.

---

## First Principle — Convergence, Not Motion

> A code change is progress **only if** the next fresh verify has fewer failures.
> Reach a fixed point (whole suite green twice), not a merely passing edit.
> Non-shrinking failures → **escalate**; fewer tests → regression, never convergence.

---

## Step 0 — Resolve Verification Scope + Goal Contract (FIRST ACTION)

1. **Read `docs/project-config.json` → `integrationTestVerify`** before other loop work (the same config `/integration-test-verify` obeys, `integration-test-verify/SKILL.md:74-92`). Extract `quickRunCommand`, `testProjectPattern`, `testProjects`, `systemCheckCommand`, `startupScript`, and `referenceDocs` for scope and reference-doc resolution.
2. **Resolve `{scope}` — WHOLE SYSTEM by default:**

   | Prompt                               | `{scope}`                                                                                                                                    |
   | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
   | **No target named** (default)        | **Every** integration-test project discoverable via `testProjectPattern` glob > `testProjects` list. The WHOLE system.                       |
   | Names a suite/project/module/feature | Only the test projects covering that target, resolved from the same config; state which projects the target maps to and how you resolved it. |
   | Names a diff/branch/PR               | The test projects covering that change set — this is the ONLY case where change-scoping is correct, and it must be explicit in the prompt.   |

   > **NEVER let `/integration-test-verify` resolve scope by itself.** Its Step 3 priority ends in git auto-detect and _"Only run projects relevant to the current change"_ (`integration-test-verify/SKILL.md:132,159`) — correct when it is a workflow step after an edit, WRONG as this loop's default. Pass `{scope}` explicitly in the invocation every round. — why: a loop that silently verifies only the changed subset reports "all green" for a system it never ran.

3. **Record `{scope}` as a stable project list.** Keep it FIXED across rounds. If a fix legitimately adds a test project, widen it and log why; narrowing is forbidden.
4. **Resolve/create the Goal Contract** per `SYNC:goal-contract-satisfaction-loop` (`plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`, template `.claude/templates/goal-contract-template.md`). Its single **required** Success Criterion:

   > _A fresh full `/integration-test-verify` over `{scope}` reports **zero failed tests** across **2 consecutive runs without a DB reset**, evidenced by actual test-runner output (Passed/Failed/Skipped counts), with no test deleted, skipped, or weakened to get there._

   Record in **Constraints**: `{scope}`, round cap (default 3), baseline executed/skipped counts after round 1, and `quickRunCommand`.

### Test Architecture Contract Preflight (before Round 1)

Before round 1, carry the same tier contract into the loop. Mark Unit, Integration/System, and E2E `APPLICABLE` only with runner/framework/configuration evidence; otherwise record `N/A — <evidence>` and never fabricate a project or command.

| Tier | Full command | Focused/partial command | Zero-match behavior | Run identity / data mode | Parallel isolation | Simple/Windows entry point |
| ---- | ------------ | ------------------------ | ------------------- | ------------------------ | ------------------ | --------------------------- |
| Unit | `{copy-ready command or N/A + evidence}` | `{copy-ready command or N/A + evidence}` | `{documented non-zero behavior}` | `{unique identity; reference/additive mode}` | `{worker/root strategy}` | `{entry point or N/A + evidence}` |
| Integration/System | `{copy-ready command}` | `{copy-ready command or N/A + evidence}` | `{documented non-zero behavior}` | `{unique identity; reference/additive mode}` | `{worker/root strategy}` | `{entry point or N/A + evidence}` |
| E2E | `{configured command or N/A + evidence}` | `{configured command or N/A + evidence}` | `{documented non-zero behavior}` | `{unique identity; reference/additive mode}` | `{worker/root strategy}` | `{entry point or N/A + evidence}` |

- Use only config/reference/script-backed commands. When focused scope applies, the inner verifier returns exact Passed/Failed/Skipped counts and exit status; invalid or zero-match selection must fail or follow documented non-green behavior and never count as green.
- Preserve supported public-path setup, realistic pacing/barriers, idempotent count-before-create reference data, keyed/additive persistence, and isolated mutable roots every round. Focused output is evidence, not a substitute for fixed full scope.
- Append the matrix, commands/scopes, identity, seed/accumulation mode, exact results, and repeat proof to the Goal Contract Iteration Log; missing evidence blocks convergence.

## Step 0b — Bind the Convergence Loop (protocol-first; `/goal` is an optional accelerator)

Two layers bind the loop. The **protocol loop (Steps 1–2) is BINDING** and self-driven on every host, with or without a command or hook. `/goal` is an **OPTIONAL accelerator**, never the primary mechanism; its absence NEVER weakens the loop. Hooks/trackers accelerate only — correctness cannot depend on them.

**1. Protocol loop — ALWAYS binding (hook/command-independent).** Do not stop until convergence or bounded escalation. This binds Claude, Codex, and Copilot whether or not `/goal` exists:

> Repeatedly run `/integration-test-verify` INLINE over `{scope}` (passed explicitly, never re-derived). After each run, if ANY test failed, adjudicate every failure with `/debug-investigate` + `/integration-test-review` (report-only) into ONE Fault Verdict, apply the fix via `/fix` at the owning layer, then re-run a FRESH full `/integration-test-verify` over `{scope}`. Do NOT stop while the last verify still reported a failing test. Converge ONLY when a fresh full verify reports zero failures across 2 consecutive runs without a DB reset AND the Round Integrity Check passes (executed test count not shrunk, skipped count not grown). Cap at `{N=5}` rounds; if the failing count does not shrink across 2 consecutive rounds, failures increase, the cap is hit with failures still open, or any failure is ENVIRONMENT-BLOCKED → STOP and escalate via `AskUserQuestion`. Never loop open-ended, and NEVER reach green by weakening, skipping, deleting, or de-scoping a test.

Re-read this obligation at every Step 2 checkpoint; it is not a one-time note. The Goal Contract's required Success Criterion (Step 0) is the durable, host-independent record.

**2. `/goal` command — invoke as an accelerator WHEN AVAILABLE.** If permitted and available, ALSO invoke it as a real command with the SAME condition; do not paraphrase it or substitute the Goal Contract, so the session Stop hook can enforce the loop:

```
/goal integration-test green convergence loop: repeatedly run /integration-test-verify INLINE over {scope} (passed explicitly). If any test failed → adjudicate each failure with /debug-investigate + /integration-test-review (report-only) into one Fault Verdict, fix via /fix at the owning layer, and run another round. If a fresh full verify reports zero failures across 2 consecutive runs without DB reset AND executed test count has not shrunk and skipped count has not grown → CONVERGED, run the terminal /spec [mode=sync] + /docs-update and clear the gate. Do NOT stop while the last verify still reported a failing test. Cap at {N=5} rounds; if the failing count does not shrink across 2 consecutive rounds, failures increase, the cap is hit with failures open, or a failure is ENVIRONMENT-BLOCKED → STOP and escalate via AskUserQuestion. Never loop open-ended; never reach green by weakening, skipping, deleting, or de-scoping a test.
```

The `/goal` Stop hook blocks stopping until the condition holds and auto-clears when met; do not tell the user to clear it.

**If `/goal` is unavailable, unregistered, or not permitted** (e.g. Codex/Copilot or a Claude run without it): DO NOT error, block, or invent a stand-in gate. Record ONE Goal Contract line — `/goal accelerator unavailable — loop bound by protocol (Steps 1–2) + this Goal Contract` — and proceed. The protocol loop plus Goal Contract remain the gate.

> **Nested gates (by design):** `/debug-investigate` self-binds `/why-review`; `/integration-test-review` is REPORT-ONLY, deferring P5 fix/P6 re-review to this caller. No inner fix gate is installed. THIS outer loop owns the single convergence gate; all gates self-clear on satisfaction. Do NOT tell the user to clear them.

## Step 1 — Round Loop (verify → adjudicate → fix → review → integrity-check → log)

Each round has four halves — **verify finds, adjudication diagnoses, fix resolves, `/changes-review` proves the fix.** For round `R` (start at 1), do ALL:

1. **Snapshot before:** record `git status --porcelain` + `git diff --stat`. This fixes-applied baseline also backstops Step 2 convergence detection.
2. **Run `/integration-test-verify` INLINE** via `Skill` (NEVER `Agent`), passing `{scope}` **explicitly**. Its contract is system check → named projects → applicable focused/partial scope with exact counts/status → **2-consecutive-green-runs-without-DB-reset** full gate → real Passed/Failed/Skipped counts and failing names. Let it fan out bounded `integration-tester` sub-agents per isolated project (`integration-test-verify/SKILL.md:188-206`). Tell it this IS a loop round, so it returns counts/names instead of recommending `/workflow-integration-test-green`; that recommendation would restart this loop.
3. **Record counts:** focused/partial command, scope, status when applicable; per-project and total executed/passed/failed/skipped from **actual runner output**; run identity and seed/accumulation mode. These feed integrity and shrinking-failure gates. No output = no counts = no claim.
4. **If failures = 0** and the 2-run gate was green → this round converged; go to Step 2 (no adjudication or fix half needed).
5. **If failures > 0 — ADJUDICATE.** Run BOTH, INLINE, in this order, per failure or cluster:

   **(a) `/debug-investigate`** — trace end-to-start to the owning layer; produce a confidence-scored `file:line` root cause validated by `/why-review`. Investigation ONLY; never patch (`debug-investigate/SKILL.md:22`).

   **(b) `/integration-test-review` — REPORT-ONLY** — review failing tests **and exercised production code**. Its 8 gates supply the test-side verdict: G1 assertion value/mutation probe, G2 data state, G3 repeatability, G4 domain logic, G5 spec traceability, G6 three-way sync, G7 change coverage, G8 scenario fidelity. **STOP after findings** — no P5 fix, P6 re-review, or P7 build/run; this loop owns fixing and re-running.

   **Combine (a) + (b) into ONE written Fault Verdict per failure, BEFORE any edit:**

   | Verdict                 | Meaning                                                                                                                                                                                                                | Evidence required                                                                                                                                          | Resolution                                                                                                                                                                                                                                                            |
   | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | **TEST-WRONG**          | The test encodes a stale or incorrect assertion, setup, or expectation that contradicts intended behavior                                                                                                              | The governing spec (§3 AC / §4 BR / §5 invariant / §8 TC) or the handler source shows the production behavior is correct and the test is not (`file:line`) | Fix the test at its root. NEVER weaken an assertion, add a skip, or relax a timeout.                                                                                                                                                                                  |
   | **TEST-NOT-OPTIMAL**    | The test is directionally right but mis-specified — unrealistic scenario, compressed actor pacing, blind sleep, missing ARRANGE barrier, shared-state repeatability defect, smoke-only or DI-resolution-only assertion | The failing G3/G8 gate plus the ARRANGE block read as a production trace (`file:line`)                                                                     | Repair the SCENARIO — add an ARRANGE-phase settle barrier polling a real observable, unique data per run, real use-case setup. NEVER a widened assertion timeout or a retry around the assertion.                                                                     |
   | **SOURCE-WRONG**        | Production code violates the spec's intended behavior or a clear invariant                                                                                                                                             | `/debug-investigate`'s traced root cause at the invariant-owning layer (`file:line`, confidence ≥60%)                                                      | Fix the source at the **lowest owning layer** (Entity > Service > Handler), never the crash site. **Keep or strengthen** the test that caught it, and route the changed source into `/changes-review` before declaring PASS (`integration-test-verify/SKILL.md:294`). |
   | **ENVIRONMENT-BLOCKED** | Infrastructure, services, containers, or data fixtures are not ready — the system, not the code, is failing                                                                                                            | The `systemCheckCommand` output or the runner error naming the unavailable dependency                                                                      | **STOP the loop and escalate.** Point the user at `startupScript`. NEVER change a test because the system was down (`integration-test-verify/SKILL.md:296`).                                                                                                          |
   | **AMBIGUOUS**           | Intended behavior is unclear — no spec covers it, the spec is silent, or spec and code disagree with no tiebreaker                                                                                                     | State exactly what is undetermined and which artifacts you checked                                                                                         | **`AskUserQuestion` before editing either side.** NEVER silently pick source or test just to make the suite pass.                                                                                                                                                     |

   **Intermittent failures (red in one run of the 2-run gate, green in the other) use the three-way flake adjudication instead** — (a) unrealistic scenario / compressed pacing, (b) harness topology amplification, (c) genuine product race — per `integration-test-verify/SKILL.md:298-316`. Record the verdict with evidence BEFORE any change; do NOT file (c) until (a) and (b) are ruled out.

6. **Run `/fix` on adjudicated verdicts** (failures > 0 only). Resolve at the owning layer: `SOURCE-WRONG` → `/fix` (`--target` routing) or lowest invariant-owning layer, then `/prove-fix`; `TEST-WRONG`/`TEST-NOT-OPTIMAL` → repair test/scenario at root; missing §8 TC from G5/G7 → `/spec [mode=tests]`; spec divergence → `SYNC:spec-drift-adjudication` (`/spec [update]` for SPEC-STALE, BLOCKING fix for CODE-WRONG). Fix ONLY adjudicated verdicts.

   > **If `/integration-test-review` could not be constrained to report-only and already applied its P5 fixes**, treat those as this round's fix half (detect fixes-applied against the 1.1 snapshot) and SKIP this step for that round — never double-fix the same failure.

7. **CONDITIONAL — run `/changes-review` on the round's fix diff only when ANY fix landed.** Compare the tree with the 1.1 snapshot: unchanged → record `No fix applied this round — /changes-review skipped`; changed → run it on every round's fixes.

   - **Scope = exactly this round's changed files**, not the whole branch: source, tests, scenarios, specs/TCs since the 1.1 snapshot — why: prior reviews have not seen only these changes.
   - **Run INLINE via `Skill`, REPORT-ONLY**; stop before Phase 7 self-fix, 7.5 holistic, and 8 docs-update (`changes-review/SKILL.md:52,204`). NEVER dispatch as a sub-agent; its own Phase 0.7 reviewers remain sub-agents (`changes-review-loop/SKILL.md:37`).
   - **Validate, then fold findings into THIS round's fix set:** run `/why-review --validate-findings`; apply every VALIDATED finding at its owning layer. The next fresh full verify re-proves them; do NOT open a nested review→fix loop.
   - **Unfixable validated finding → STOP & escalate** via `AskUserQuestion` (Step 2); green tests do not close it.
   - This once-per-round diff review subsumes the `SOURCE-WRONG` routing obligation (`integration-test-verify/SKILL.md:294`) and also covers test/spec fixes.

   — why: green tests cannot see a wrong layer, broken invariant, dead code, leaked domain concept, or security/performance regression.

8. **Round Integrity Check (no fake green) — BLOCKING before the round can count as progress.** Compare this round's counts (1.3) against the prior round's:

   | Signal                                     | Meaning                                                                           | Action                                                                                       |
   | ------------------------------------------ | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
   | Executed test count **decreased**          | Tests were deleted, renamed out of discovery, filtered out, or the scope narrowed | **REGRESSION → STOP & escalate.** Restore the tests. A smaller suite is not a greener suite. |
   | Skipped count **increased**                | A failure was hidden behind a skip annotation                                     | **REGRESSION → STOP & escalate.** Remove the skip and adjudicate the failure properly.       |
   | `{scope}` project list **shrank**          | The loop de-scoped its way to green                                               | **REGRESSION → STOP & escalate.** `{scope}` is fixed (Step 0.3).                             |
   | Counts stable or grown, failures shrinking | Genuine progress                                                                  | Continue to Step 2.                                                                          |

    — why: removing what fails is a cheap fake exit; this check protects coverage.

9. **Append an Iteration Log entry** to the Goal Contract: round; full/focused commands, scopes, and statuses; identity and seed/accumulation mode; per-project counts; failing names; each Fault Verdict with `file:line` evidence/confidence; fixes (`file:line`); `/changes-review` verdict or explicit skip; integrity result; remaining gaps.

## Step 2 — Convergence & Escalation Gate

After every round, apply this gate:

| Condition                                                                                                                                                                                                                       | Action                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fresh full `/integration-test-verify` over `{scope}` reported **zero failures across 2 consecutive runs without a DB reset**, AND the Round Integrity Check passed, AND the working tree is unchanged by that final verify pass | **CONVERGED** → mark the required criterion PASS in the Goal Satisfaction matrix (attaching the runner output) → clear the `/goal` gate → go to Step 3.      |
| Failures > 0 AND round `< N` AND the failing count shrank vs the prior round AND integrity held                                                                                                                                 | Apply the adjudicated fixes (Step 1.6), then run round `R+1` (fresh full re-verify over the SAME `{scope}`).                                                 |
| Failing count did **not shrink** across 2 consecutive rounds (same/increasing count)                                                                                                                                            | **STOP & escalate** via `AskUserQuestion` — a non-converging loop is a signal, not a reason to spin.                                                         |
| Round cap `N` hit with failures still open                                                                                                                                                                                      | **STOP & escalate** via `AskUserQuestion` — report the still-failing tests with their Fault Verdicts; do not silently continue.                              |
| Any failure adjudicated **ENVIRONMENT-BLOCKED**                                                                                                                                                                                 | **STOP & escalate immediately** — mark the criterion BLOCKED with a user-facing reason and point at `startupScript`. Never loop against an unhealthy system. |
| Any failure adjudicated **AMBIGUOUS**                                                                                                                                                                                           | **PAUSE and `AskUserQuestion`** before the fix — resume the loop with the user's answer.                                                                     |
| Round Integrity Check failed (tests lost, skips added, scope narrowed)                                                                                                                                                          | **STOP & escalate** — restore the lost coverage first; this is a regression, not progress.                                                                   |
| The round's `/changes-review` (1.7) left **validated findings unfixed**                                                                                                                                                         | **STOP & escalate** via `AskUserQuestion` — a green suite does not clear an open, validated review finding on the fix that greened it.                       |

> **Increasing failures = STOP.** More failures than round `R-1` means regression; escalate immediately. Never trade one green test for two red ones.

## Step 3 — Terminal Spec/Doc Sync + Recap

1. **Terminal sync (MANDATORY once converged, when STANDALONE).** Run deferred downstream sync in order:
   - **`/spec [mode=sync]`** — reconcile §8 TCs ↔ the executing test code; update every `CoveredBy` field for tests the loop changed or added.
   - **`/docs-update`** — update impacted docs: the integration-test reference doc, feature-doc evidence fields, and version history if coverage changed materially.

    > **When a parent workflow already declares `/spec [mode=sync]`, `/scan --target=integration-tests`, and `/docs-update`** (e.g. `workflow-integration-test-green`), SKIP this sub-step, let the workflow own it, and say so in the recap. — why: duplicate sync churns the same files and obscures ownership.

2. **Recap.** Report rounds, shrinking failure counts, each round's Fault Verdicts/fixes, both final zero-failure outputs, integrity trail (executed/skipped per round), Goal Satisfaction matrix (required criterion PASS), round reports under `tmp/reports/`, and Goal Contract Iteration Log. Do NOT commit or push unless explicitly asked.

---

## Convergence Detection — Why Five Conditions

A round converges ONLY when **all five** hold; each blocks a different false-green path:

1. **Fresh verify over post-fix code** — pre-fix green proves nothing; every fix invalidates the prior verdict.
2. **Zero failed tests** — one red test means unconverged; "known failures" do not count.
3. **2 consecutive green runs without DB reset** — `/integration-test-verify` owns this gate (`integration-test-verify/SKILL.md:44,169`); one run hides order/state flakiness.
4. **Real runner output** — Passed/Failed/Skipped counts and names; "looks like it passed" is theater (`integration-test-verify/SKILL.md:339`).
5. **Round Integrity Check passed** — executed count not shrunk, skipped count not grown, `{scope}` not narrowed; the other four cannot detect lost tests.

**Working-tree-unchanged backstop:** the converging verify pass must land no fix. If it mutates files, the round DID fix things; run another round.

Unfixable failures (product decision, unclear intent, environment) → **escalate**, do not loop. Convergence is a fixed point, not one green read.

---

**IMPORTANT MANDATORY sequence:** Step 0 (resolve `{scope}` — WHOLE SYSTEM by default — + Goal Contract) → Step 0b (bind the convergence loop: protocol loop primary + optional `/goal` accelerator) → Step 1 (round loop: `/integration-test-verify` INLINE → on failure `/debug-investigate` + `/integration-test-review` report-only → ONE Fault Verdict per failure → `/fix` at the owning layer → CONDITIONAL `/changes-review` on the round's fix diff when any fix landed → Round Integrity Check → log) → Step 2 (converge on a zero-failure 2/2-green fresh verify / escalate on non-progress, blocked environment, or lost coverage) → Step 3 (terminal `/spec [mode=sync]` + `/docs-update` when standalone + recap).

<!-- SYNC:goal-contract-satisfaction-loop -->

> **Goal Contract Satisfaction Loop** — Persist the user goal in an external file, execute against it, and loop review/fix until every saved required criterion passes or a blocker escalates. Bounded closed loop — NEVER open-ended autonomous exploration.
>
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
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

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **is there any trade-off?** name what it SACRIFICES (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis, so state the dimensions checked; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it material enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `AskUserQuestion` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; NEVER bury one as a Low-severity note, NEVER decide it silently, and NEVER let delivery or convergence pressure authorize a one-way door. — why: an un-walked-back one-way door is the user's call to make, not the reviewer's.
- **MANDATORY — non-asking contexts escalate BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. There the duty is REDIRECTED, not waived — still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, **state the unconfirmed MATERIAL trade-off in your RETURNED verdict/summary so the CALLER escalates it** (a note only in an on-disk report is not a handoff), and never emit an unqualified PASS. Applies ONLY where the user is genuinely unreachable (spawned sub-agent, terminal validate mode, headless run) — if you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

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

**IMPORTANT MUST ATTENTION Goal:** Drive the fixed integration-test scope to a truthful, repeatable green result: every fix is adjudicated and reviewed at its owning layer, then fresh full `/integration-test-verify` runs over `{scope}` report zero failures in 2 consecutive no-DB-reset runs with real counts and preserved coverage.

**IMPORTANT MUST ATTENTION main steps/modes/gates (in order):** (0) resolve `{scope}` + Goal Contract + testability preflight → (0b) bind the protocol loop (primary) + optional `/goal` accelerator → (1) each round: snapshot → inline `/integration-test-verify` with explicit `{scope}` → record actual counts → on failure inline `/debug-investigate` + `/integration-test-review` report-only → ONE Fault Verdict → owning-layer `/fix` → conditional inline report-only `/changes-review` on the fix diff → Round Integrity Check → Iteration Log → (2) converge on fresh full 2/2 zero-failure output or escalate → (3) standalone `/spec [mode=sync]` + `/docs-update`, parent workflow owns declared `/spec [mode=sync]` + `/scan --target=integration-tests` + `/docs-update`, then recap.

**IMPORTANT MUST ATTENTION Testability contract:** before round 1, record evidence-backed Unit/Integration/System/E2E and warranted Performance/Scale applicability (or `N/A`), owner/root/data, runner, copy-ready full/focused commands, zero-match behavior, CI/simple-Windows entry, host/container modes, environment reach, unique identity, isolation, and repeat proof. Missing applicable evidence blocks convergence.
**IMPORTANT MUST ATTENTION [BLOCKING] task plan:** create detailed tasks before round 1 and regenerate a fresh round plan before EVERY re-run; NEVER reuse the prior round's task list.
**IMPORTANT MUST ATTENTION** `{scope}` defaults to the **WHOLE SYSTEM** (`testProjectPattern` > `testProjects`) and is passed explicitly every round; a named target/diff may narrow it, but the fixed scope NEVER shrinks (`integration-test-verify/SKILL.md:132,159`).
**IMPORTANT MUST ATTENTION** every round pairs verify → adjudicate → fix → fix-diff review; run `/integration-test-verify`, `/debug-investigate`, `/integration-test-review`, and `/changes-review` INLINE via `Skill`, NEVER as sub-agents. Their internal fan-outs remain their own design.
**IMPORTANT MUST ATTENTION** `/integration-test-review` is REPORT-ONLY (stop before P5/P6/P7); if it self-fixes, treat that as the round's fix and skip `/fix` — NEVER double-fix.
**IMPORTANT MUST ATTENTION** write ONE Fault Verdict per failure BEFORE editing: `TEST-WRONG` · `TEST-NOT-OPTIMAL` · `SOURCE-WRONG` · `ENVIRONMENT-BLOCKED` · `AMBIGUOUS`, with `file:line` evidence/confidence; ambiguous → `AskUserQuestion`.
**IMPORTANT MUST ATTENTION** `SOURCE-WRONG` fixes use the LOWEST invariant-owning layer (Entity > Service > Handler); keep/strengthen the catching test and review the changed source (`integration-test-verify/SKILL.md:294`). `TEST-NOT-OPTIMAL` repairs ARRANGE with a real observable, never an assertion timeout, blind sleep, or assertion retry.
**IMPORTANT MUST ATTENTION** intermittent failures require the three-way flake adjudication (unrealistic scenario, harness amplification, genuine product race) before change; do not file (c) until (a)/(b) are ruled out.
**IMPORTANT MUST ATTENTION** any fix landed → `/changes-review` INLINE/report-only over that round's full fix diff, validate/fold findings into the same round, and escalate unfixable validated findings; no fix → record the skip. Run it once per round, never as a nested review→fix loop.
**IMPORTANT MUST ATTENTION** Round Integrity is BLOCKING: executed count must not decrease, skipped count must not increase, `{scope}` must not shrink; otherwise STOP, escalate, and restore coverage.
**IMPORTANT MUST ATTENTION** NEVER force green: no weakened/removed assertions, skips, widened timeouts, assertion retries, repository-hacked data, or narrowed scope. Fix scenario/product defect, then restart the 2-run gate.
**IMPORTANT MUST ATTENTION** convergence needs ALL FIVE: fresh post-fix full verify · zero failures · 2 consecutive no-reset green runs · real counts/names · integrity pass, plus unchanged working tree on the converging pass.
**IMPORTANT MUST ATTENTION** round cap default 3; non-shrinking failures across 2 rounds, rising failures, cap with open failures, `ENVIRONMENT-BLOCKED`, `AMBIGUOUS`, lost coverage, or open validated review findings → STOP & escalate via `AskUserQuestion`; environment blockers point to `startupScript`.
**IMPORTANT MUST ATTENTION** resolve/update the Goal Contract, append per-round counts/verdicts/fix evidence to its Iteration Log and matrix, and NEVER copy sensitive fixture data.

**IMPORTANT MUST ATTENTION Protocols in force (digest):**

- **MUST ATTENTION Goal Contract:** resolve the active goal, read saved criteria, append iteration evidence, and emit the Goal Satisfaction matrix; NEVER store secrets.
- **MUST ATTENTION Fault adjudication:** record one verdict before editing; compare spec, source, and test; fix only the wrong side at its root.
- **MUST ATTENTION Integration execution:** verify the whole declared scope through real use cases, honor the 60-second signal, and require the no-reset 2/2 gate.
- **MUST ATTENTION Real-world fidelity:** use production-reachable sequences and real observable ARRANGE barriers; NEVER hide failures with assertion changes.
- **MUST ATTENTION Spec ↔ tests ↔ code:** review the whole package, log every disagreement, and enrich missing invariants with a rule and guarding test.
- **MUST ATTENTION Spec drift:** classify CODE-WRONG, SPEC-STALE, AMBIGUOUS, or SPEC-SILENT; NEVER normalize drift to whichever side is green.
- **MUST ATTENTION Source/test drift:** inspect affected tests whenever source behavior changes and reconcile to intended behavior.
- **MUST ATTENTION Nested tasks:** expand child phases, link a parent when nested, and keep exactly one task `in_progress`.
- **MUST ATTENTION Task/report persistence:** bootstrap tracking and append plan/review findings to `tmp/reports/` as required.
- **MUST ATTENTION Project references:** read config, docs index, required reference docs, and `lessons.md`; cite the evidence.
- **MUST ATTENTION Test architecture:** record tier applicability, commands, zero-match behavior, identity, data, isolation, modes, environment reach, and repeat proof.
- **MUST ATTENTION Critical thinking:** cite `file:line` evidence, state confidence, and NEVER guess.
- **MUST ATTENTION Trade-offs:** ask the three trade-off questions; material unconfirmed choices cannot pass.
- **MUST ATTENTION Project overlay:** resolve the most-specific registry tier; overlays are additive and NEVER authority escalations.

**Anti-Rationalization:**

| Evasion                                       | Rebuttal                                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| "Only the changed tests matter"               | `{scope}` defaults to the WHOLE system and is passed explicitly. A subset green is not a suite green.                           |
| "That test was flaky, I skipped it"           | Skipped count increasing is a Round Integrity FAILURE → STOP & escalate. Adjudicate the flake (a)/(b)/(c) instead.              |
| "I deleted the obsolete test, now it's green" | Executed count decreasing is a REGRESSION, not convergence. Restore it and prove obsolescence against the spec first.           |
| "Root cause is obvious, just fix it"          | One written Fault Verdict per failure, with `file:line` evidence, BEFORE any edit. Nearest-attention fixes patch the assertion. |
| "The assertion is too strict"                 | Fix the code or the ARRANGE setup, never the assertion. A test that no longer protects its invariant is worse than no test.     |
| "Bump the timeout, it just needs longer"      | Widening a timeout masks all three flake causes. The barrier belongs in ARRANGE, on a real observable.                          |
| "It passed this time, ship it"                | 2 consecutive green runs without a DB reset, with real runner output, or it isn't verified.                                     |
| "Review already fixed it, and so did /fix"    | Report-only mode means `/fix` owns the fix. If review self-fixed, SKIP `/fix` that round — never double-fix.                    |
| "Tests are green, no need to review the fix"  | Green is exactly the blind spot — it cannot see a wrong-layer fix, a broken invariant elsewhere, or a security/perf regression. Any fix landed → `/changes-review` that round. |
| "I'll code-review everything at the end"      | A deferred review lets round 2 build on round 1's unreviewed fix. Review the fix diff in the round that lands it.               |
| "Round 3 hit, close enough"                   | Cap hit with failures open → STOP & escalate with the still-failing tests and their verdicts. Never silently continue.          |
| "The DB was down, I'll relax the test"        | `ENVIRONMENT-BLOCKED` → escalate and point at `startupScript`. NEVER change a test because the system was down.                 |

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — analyze task size first.

---

**Change-cost gate:** Every finding, test, refactor, and abstraction answers: _does this make the next change cheaper or more expensive?_ If it does not reduce future change cost, reject it. Name coupling, hidden state, duplicated knowledge, and unclear intent as the enemies.

---

**IMPORTANT MUST ATTENTION Goal:** Drive the fixed integration-test scope to a truthful, repeatable green result: every fix is adjudicated and reviewed at its owning layer, then fresh full `/integration-test-verify` runs over `{scope}` report zero failures in 2 consecutive no-DB-reset runs with real counts and preserved coverage.
**IMPORTANT MUST ATTENTION** Every fix lands only after a written Fault Verdict and, when changed files exist, inline report-only `/changes-review`; the next round uses fresh full evidence.
**IMPORTANT MUST ATTENTION** Round Integrity is BLOCKING: no executed-test shrink, skipped-count growth, or scope narrowing; any loss is regression and escalation.
**IMPORTANT MUST ATTENTION** NEVER force green; stop and escalate on blocked environment, ambiguity, non-progress, rising failures, cap exhaustion, or open validated review findings.
