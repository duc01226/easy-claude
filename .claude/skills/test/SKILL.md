---
name: test
version: 1.0.0
description: '[Testing] Use when a workflow step or the user asks for a local test run. Runs the tests and analyzes the summary report.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Deliver an accurate, read-only pass/fail verdict — by running tests locally via the `tester` subagent and analyzing the summary report — with exact counts, failing-test names, report path, and Goal Contract evidence, so the user knows the true test state without any fix applied.

**Summary:**
- **Testability contract:** resolve Unit/Integration/System/E2E applicability from runner/config evidence; record owner/root/data, copy-ready full + focused commands, zero-match behavior, CI/simple Windows/macOS/Linux entry, unique run/data identity, and repeat proof; unresolved applicable fields block handoff, while non-applicable tiers require evidence-backed `N/A`.

- **Purpose:** give the user the TRUE test state — accurate pass/fail verdict, exact counts, failing-test names, report path — without applying any fix.
- **Main steps (run in order):** (1) **Delegate** — launch the `tester` subagent with the test scope from arguments; NEVER invoke test commands directly. (2) **Analyze** — review the subagent's summary report; identify failures and patterns. (3) **Report** — summarize pass/fail counts, highlight failing tests, cite the report path. (4) **Goal evidence** — resolve the active Goal Contract, append verification evidence, update the Goal Satisfaction matrix.
- READ-ONLY: stop at reporting; NEVER start implementing fixes — why: fixing is `/fix`'s job and mixing it into the report hides the true test state.
- After the run, append verification evidence (command, exact counts, report path) to the goal file's Iteration Log and update the Goal Satisfaction matrix; record "No active goal — evidence reported inline only." when none exists; NEVER copy sensitive fixture data into the goal file — why: the goal file is the durable PASS/FAIL ledger, not a secrets store.

**Workflow:**

1. **Delegate** — Launch `tester` subagent with test scope from arguments
2. **Analyze** — Review test results, identify failures and patterns
3. **Report** — Summarize pass/fail counts, highlight failing tests

**Key Rules:**

- READ-ONLY: do not implement fixes, only report results
- Activate relevant skills from catalog during process
- Always use `tester` subagent, not direct test commands
- An INTERMITTENT failure (red in one run, green in another) is NOT yet a product defect — route it through the same adjudication `/integration-test-verify` uses before reporting it as one: (a) unrealistic scenario / compressed actor pacing, (b) harness topology amplification (shared infra, fan-out consumers, suite parallelism, cold start), or (c) a genuine product race. Report the verdict with its evidence, or report the failure as UNADJUDICATED — never as a product defect on the strength of one red run

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

Use the `tester` subagent to run tests locally and analyze the summary report.

**IMPORTANT**: Stop at reporting results — do not start implementing.
**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.

**Goal Contract evidence (after test run):** Resolve the active Goal Contract per the goal-contract-satisfaction-loop protocol (active plan `goal.md` → `goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root, default `plans/`, relocated by `docsRoots.plans.path` in `docs/project-config.json`). When one exists, append the verification evidence to the goal file's Iteration Log — test command, exact pass/fail counts, report path — mapped to the saved success criteria the run verifies, and update the Goal Satisfaction matrix rows for those criteria (PASS/FAIL/BLOCKED). Record `No active goal — evidence reported inline only.` when none exists. Never copy raw sensitive fixture data into the goal file.

## Exact-Result Reporting Contract (Read-Only)

The `tester` subagent receives the resolved contract matrix and executes only configured commands; this skill never invents a fallback runner or invokes commands directly.

- Select the configured `fullCommand` or `focusedCommand` for the requested scope and report the command verbatim, scope, and any simple Windows/macOS/Linux entry point used. If the tier has no configured command, report evidence-backed `N/A` or `BLOCKED` rather than substituting another command.
- Return exact `exitStatus`, `discovered`, `passed`, `failed`, and `skipped` counts, failing-test names, `runIdentity`, seed/accumulation mode, and repeat/parallel evidence. For applicable persistent-state suites, include two consecutive no-reset full-run results.
- A zero-match or invalid selection is non-pass even when no test throws; a non-zero exit is non-pass even when text says all tests passed. Never infer counts from a summary or silently pass an empty filter.
- Remain read-only: do not edit tests or production code, seed or reset data, delete fixtures, or widen retries/timeouts to make a result green.

---

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

When evaluating code, a refactor, a test, or an abstraction, ask:
**does this make the next change cheaper or more expensive?**

- Reject "best practices" that raise change cost (premature abstraction,
  speculative generality, leaky indirection, ceremony without payoff).
- Name the real enemies in findings: **coupling, hidden state, duplicated
  knowledge, unclear intent, irreversible decisions exposed too early**.
- A simpler design that is easy to change beats a sophisticated design that
  isn't.

Apply this lens **before** invoking any specific rule, pattern, or checklist
below — if a downstream rule would raise change cost, this principle wins.

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `testing` workflow** (Recommended) — test
> 2. **Execute `/test` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/docs-update (Recommended)"** — Update documentation after tests pass
- **"/fix"** — If tests revealed failures that need fixing
- **"/watzup"** — Wrap up session and review all changes
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

- `domain-entities-reference.md`, in the project-reference docs root (default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `tmp/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `environment-fault-hypothesis` — Weigh the environment as a competing cause, with a named discriminator; judging a bug report, failing test, error or unexpected output → .claude/skills/shared/protocols/environment-fault-hypothesis.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `real-world-fidelity-testing` — Integration, E2E and system tests exercise real boundaries; authoring, reviewing or repairing integration, E2E or system tests → .claude/skills/shared/protocols/real-world-fidelity-testing.md
- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
- `test-failure-fault-adjudication` — Decide whether the source or the test is at fault before editing either; a test fails → .claude/skills/shared/protocols/test-failure-fault-adjudication.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

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

<!-- SYNC:environment-fault-hypothesis:reminder -->

**MUST ATTENTION** environment-fault gate: a bug, failed test, error, or odd output is NOT proof of a code defect. Sweep environment preconditions (versions, deps/install state, config & env vars, services, ports/network/clock, permissions, leftover state) and resource/transience suspects (RAM, CPU, disk, handles, network, timeouts) as a competing hypothesis, cite the discriminator you ran, and fix an environment cause in the environment — never by editing code or weakening a test. "Flaky" is a symptom, not a verdict.

<!-- /SYNC:environment-fault-hypothesis:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `/project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** Testability contract: resolve evidence-backed Unit/Integration/System/E2E rows, copy-ready full/focused commands, zero-match failures, owner/root/data, CI/simple Windows/macOS/Linux entry, unique run identity, and repeat proof before claiming setup, review, or test completion.
**IMPORTANT MUST ATTENTION Goal:** Deliver an accurate, read-only pass/fail verdict — by running tests locally via the `tester` subagent and analyzing the summary report — with exact counts, failing-test names, report path, and Goal Contract evidence, so the user knows the true test state without any fix applied.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** ALWAYS apply critical + sequential thinking; traced proof, confidence >80%.
- **Evidence:** ALWAYS cite `file:line` per claim; NEVER speculate without proof.
- **Source/Test Drift:** when source changes, decide from evidence whether test or source is wrong; NEVER assume.
- **Real-World Fidelity:** a scenario production could never reach proves nothing green and blames the product red; distinguish harness-amplified from real before calling an intermittent failure a product defect.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**MANDATORY IMPORTANT MUST ATTENTION** READ-ONLY — run tests, report pass/fail counts + failing-test names + report path; NEVER implement fixes here, stop at reporting — why: fixing is `/fix`'s job; mixing the two hides the true test state.
**MANDATORY IMPORTANT MUST ATTENTION** ALWAYS run tests through the `tester` subagent; NEVER invoke test commands directly — why: the subagent isolates the run and produces the canonical summary report this skill analyzes.
**MANDATORY IMPORTANT MUST ATTENTION** resolve the active Goal Contract after the run; append verification evidence (test command, exact pass/fail counts, report path) to the goal file's Iteration Log and update the Goal Satisfaction matrix; record `No active goal — evidence reported inline only.` when none exists; NEVER copy raw sensitive fixture data into the goal file — why: the goal file is the durable PASS/FAIL ledger, not a secrets store.
**MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim about a failure (confidence >80% to act, <80% verify first); NEVER speculate which test failed or why — read the report — why: a guessed failure verdict sends the user to fix the wrong thing.
**MANDATORY IMPORTANT MUST ATTENTION** an INTERMITTENT failure is UNADJUDICATED, not a product defect — classify it as (a) unrealistic scenario / compressed actor pacing, (b) harness topology amplification (shared infra, fan-out consumers, suite parallelism, cold start), or (c) a genuine product race, with evidence, before reporting it as a defect; report it as UNADJUDICATED when the evidence is not there — why: a test-fidelity defect reported as a product defect sends the team to fix code that was never wrong.
**MANDATORY IMPORTANT MUST ATTENTION** before asserting a test/source relationship, grep 3+ similar tests and match the local pattern; apply the source/test drift check — decide from evidence whether a failing test guards intended behavior or the source is the bug — why: a mismatched assumption mislabels a real bug as a flaky test.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; mark one `in_progress`, complete immediately after evidence; add a final review todo to verify work quality.
**MANDATORY IMPORTANT MUST ATTENTION** validate route/decisions with the user via `AskUserQuestion` — NEVER auto-decide a workflow vs standalone run.
**IMPORTANT MUST ATTENTION** READ `CLAUDE.md` before starting.

**Anti-Rationalization:**

| Evasion                                       | Rebuttal                                                                                       |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| "Tests obviously pass, skip the run"          | Run via `tester` anyway — a guessed verdict is not a verdict. Report real counts.             |
| "I can run the test command directly"         | NEVER — always delegate to the `tester` subagent; direct runs bypass the canonical report.    |
| "Failure looks trivial, I'll just fix it"     | Stop at reporting. Fixing is `/fix`'s job; this skill is strictly READ-ONLY.                   |
| "No goal file, skip the evidence step"        | Record `No active goal — evidence reported inline only.` Never silently skip the Goal Contract. |
| "I know which test failed"                    | Show `file:line` + the report path. No proof = no claim.                                       |
| "It failed once — that's a product bug"       | Intermittent = unadjudicated. Rule out unrealistic scenario and harness amplification first, with evidence. |

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.

**IMPORTANT MUST ATTENTION** READ-ONLY — report pass/fail, NEVER fix here (that is `/fix`'s job).
**IMPORTANT MUST ATTENTION** ALWAYS run via the `tester` subagent; cite `file:line` + report path for every failure claim (confidence >80%).
**IMPORTANT MUST ATTENTION Goal:** Deliver an accurate, read-only pass/fail verdict — by running tests locally via the `tester` subagent and analyzing the summary report — with exact counts, failing-test names, report path, and Goal Contract evidence, so the user knows the true test state without any fix applied.
