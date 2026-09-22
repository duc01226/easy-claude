---
name: workflow-e2e
version: 1.2.0
description: '[Workflow] Use when writing, updating, and verifying E2E tests through a bounded green fix/retest loop. Flags: --source={changes|recording|update-ui|prompt|context|whole}, --visual-review={true|false} (resolve from the task request and project contract; no framework-wide default).'
disable-model-invocation: false
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Provide one canonical E2E lifecycle: resolve the project's case identity and test organization, write or update tests only when the source requires it, then verify and repair the fixed scope through bounded fresh runs until it is honestly green or escalated. Apply visual review only when requested or required by the project contract for an applicable visual surface.

**Summary:** Resolve `--source={changes|recording|update-ui|prompt|context|whole}` and visual applicability; read config/reference and the optional `specArtifacts` profile before selecting cases or organization. Use owner-qualified case/scenario/variant and configured evidence when declared; retain strict TC/§8 only when no native profile applies. Authoring sources prepare the artifact; verification sources let the convergence engine select or generate it. All sources use the same config-first `e2e-test-verify --fix-loop`, which verifies the fixed scope, maps cases to actual tests/assertions/results, adjudicates failures, and reruns fresh after owning-layer fixes. When visual review applies, inspect every required capture through `/experience-review --rounds=0` before the same-scope rerun.
- **Shared quality gate:** Before authoring, verification, convergence, or visual review, read `.claude/skills/shared/e2e-quality-protocol.md` and apply its scenario/invariant, ownership, isolation, auth, accessibility/visual, wait, evidence, cleanup, and spec-traceability contract in the project's native test format. When visual review is enabled and the scope touches a UI, also read `.claude/skills/shared/ui-state-capture-protocol.md` for the configured capture mode, manifest, per-case review, and synthesis contract. This workflow owns sequencing; the shared protocols own the common rows.
- **Testability contract:** resolve the test types and execution modes required by the project/task from runner/config evidence; record relevant owner/root/data, available full + focused commands, zero-match behavior, supported entry points, and repeat proof when required. Missing applicable capabilities block handoff; non-applicable tiers require evidence-backed `N/A`.
- **Browser interaction contract:** use the configured runner's native waits or an evidenced project helper for applicable readiness and outcomes. Apply action pacing only when the project contract configures it; a delay never substitutes for readiness or a real settle signal.

**Workflow:**

1. **Detect** — resolve `--source`, scope, and visual mode from the request and repository evidence.
2. **Prepare** — run the conditional `/e2e-test` authoring phase for `changes|recording|update-ui`; otherwise let the loop select or generate the required case.
3. **Converge** — run `/e2e-test-verify --fix-loop` over that exact scope; classify, fix, review, and rerun from fresh setup until the configured green contract passes or escalation is required.
4. **Close** — update docs with the terminal evidence, then end and report the workflow.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION read and apply `.claude/skills/shared/e2e-quality-protocol.md` for every executable E2E/browser/user-flow path; preserve its scenario, invariant, gate-row, evidence, and honest-verdict contract in the project's declared test format across `/e2e-test`, `/e2e-test-verify --fix-loop`, and `/experience-review`.
- MUST ATTENTION resolve `specArtifacts` before authoring: native owner/case/variant/evidence when declared; strict TC/§8 only when absent. A malformed profile blocks and never falls back.
- MUST ATTENTION map selected owner-qualified cases to their actual test, assertion, and observed result, respecting configured cardinality; ID presence alone is not proof.
- MUST ATTENTION follow the configured project test organization; do not require a Page Object Model or abstract base from a path or framework default alone.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- MUST ATTENTION write browser journeys as observe → act → observe where the runner supports it: use native readiness/outcome waits or an evidenced configured helper; follow project timeout/diagnostic conventions and action pacing.
- MUST ATTENTION when visual review is requested or required by the project contract for an applicable visual surface, capture the declared matrix and follow the resolved `uiStateCapture.mode` (default `declared-only`; transitions only under opted-in, supported `every-action`; `off` keeps the matrix and records transition coverage as `N/A`), index required captures, use `/experience-review` to read each case before synthesis, route validated blocking UI findings through one owning-layer fix, and rerun the same E2E scope. A false value cannot waive a project-required gate.
- MUST ATTENTION treat `/e2e-test-verify --fix-loop` as the single convergence/remediation owner after preparation; do not run a second green workflow, duplicate the configured E2E command, or create a separate visual-fix loop.
- NEVER skip mandatory workflow or skill gates.

**IMPORTANT MANDATORY Steps:** /investigate -> /e2e-test -> /e2e-test-verify --fix-loop -> /docs-update -> /workflow-end -> /watzup

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

## Source Dispatch (`--source`)

Resolve `--source` from the invocation and state the result before proceeding. An explicit value wins. When omitted, infer in this order: recording JSON present → `recording`; an explicit whole-project request → `whole`; a request to run/verify/QC a feature, bugfix, journey, or current context → `prompt` or `context`; a UI/SCSS/HTML diff with baseline intent → `update-ui`; a confirmed code/spec/API change → `changes`. If no source signal is evidenced, stop with an ambiguity record rather than silently choosing a maintenance mode. Resolve `--visual-review=true|false` independently from an explicit value, the task request, and project contract. There is no framework-wide default: use visual review only when requested or required for an applicable visual surface. A false value cannot waive a project-required gate; surface that conflict instead of silently skipping it.

| `--source`  | Use when                                                                 | When NOT to use                                                        |
| ----------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `changes`   | Test specs or source code changed and E2E tests need to be synced.       | New recordings (`recording`), visual-only changes (`update-ui`).       |
| `recording` | A Chrome DevTools recording JSON exists and a Playwright test is wanted. | Updating existing tests, writing from scratch, running existing tests. |
| `update-ui` | UI changed and E2E screenshot baselines need updating.                   | Generating new tests, fixing test logic, non-visual changes.           |
| `prompt`    | The user gives a feature, bugfix, journey, or QC request and the suitable E2E test may need to be selected or generated. | A narrowly scoped existing-test maintenance task. |
| `context`   | Current project/spec/code context should determine the E2E scope and cases. | A single known recording or baseline update. |
| `whole`     | The user asks for a project-wide E2E/QC verification run. | A feature-local change that does not require the full configured suite. |

| `--visual-review` | Behavior |
| ----------------- | -------- |
| `true` (explicit or project-required) | On an applicable visual surface, require the project-declared state × viewport matrix and capture mode; `every-action` transitions require explicit configuration plus a verified boundary. Inspect each required capture through `/experience-review --rounds=0`; validated blocking visual findings enter the E2E failure set and require an owning-layer fix plus fresh same-scope rerun. A true value with no visual surface records `N/A`. |
| `false` (explicit, when allowed) | Run the selected source protocol without optional screenshot review. If the project contract requires visual review, record the conflict/blocker and do not treat the gate as waived. |
| omitted | Follow the task request and project contract; otherwise do not infer a screenshot gate. |

All sources use one lifecycle in this manifest: `/investigate -> /e2e-test -> /e2e-test-verify --fix-loop -> /docs-update -> /workflow-end -> /watzup`. The `/e2e-test` occurrence is conditional authoring: `changes`, `recording`, and `update-ui` write or update the artifact and hand its exact scope and traceability to the loop; `prompt`, `context`, and `whole` skip it because the loop selects or generates Given/When/Then cases itself. The loop owns the configured E2E command, report-only `/experience-review`, failure adjudication, owning-layer fixes, review, fresh bring-up, and same-scope reruns; `/test` is not a second top-level run.

When visual review is requested or required by the project contract, forward
the resolved mode to `/e2e-test-verify --fix-loop`. Forward an explicit false
only when it does not conflict with a required project gate. The loop owns
visual adjudication, UI fixes, and the required rerun of the same configured
E2E command after each validated blocking visual finding.

### `--source=changes` — E2E from Changes

```
E2E FROM CHANGES PROTOCOL:
1. Detect change type from git diff:
   - Test-spec or source changes -> Resolve the configured owner/case profile and update or generate only cases required by the changed intent
   - Code changes -> Update existing test assertions
   - API changes -> Update test data and API mocks
2. Load affected owner/case/variant/evidence records from the selected profile; use §8 TC entries only under the strict default
3. Update or generate test implementations with the configured runner's native waits or an evidenced project helper for applicable readiness and outcomes; keep the final assertion in the test.
4. Ensure traceability: map each selected owner-qualified case/variant to its actual test, assertion, and result; use a strict-default TC only when no native profile applies
5. Run only the configured focused authoring check when useful; the final full green gate belongs to `/e2e-test-verify --fix-loop`
6. Report updated test coverage and the exact scope handed to the convergence loop
```

### `--source=recording` — E2E from Recording

```
E2E FROM RECORDING PROTOCOL:
1. Validate recording file exists (JSON format)
2. Identify target app and feature from user context
3. Run convert-recording.ts to generate initial test file
4. Resolve `specArtifacts` and load the selected owner/case/variant and evidence contract; use §8/Test Specifications only when no native profile applies
5. Map the selected owner-qualified case(s) to recording steps, then to actual test assertions and run results; leave unresolved links `UNVERIFIED`
6. Enhance generated code with configured project design and UI conventions from `docs/project-config.json` and linked references; if absent, record `N/A`. Follow the runner's observe → act → observe strategy where supported; never use a fixed delay as readiness evidence.
7. Add screenshot assertions at key states
8. Follow the configured test organization; extract a helper or object only when the project pattern or demonstrated reuse warrants it, and keep one canonical owner for shared waits/actions.
9. Run only a configured focused authoring check when useful; the convergence loop performs the final full verification
10. Report generated files, the exact scope handed off, and any manual steps needed
```

### `--source=update-ui` — E2E Update UI

```
E2E UPDATE UI PROTOCOL:
1. Identify visual changes from git diff (SCSS, HTML, TS)
2. Map changed files to their configured locator/action/helper owners or page objects, when present
3. Find E2E specs using those project-declared owners
4. Run affected tests to collect candidate screenshots/evidence without changing accepted expectations
5. Collect candidate evidence and record the observed/judged/acceptance state; the final report-only visual adjudication and any fix/retest loop belong to `/e2e-test-verify --fix-loop`
6. Update only the affected snapshots/baselines after an explicit acceptance record; otherwise preserve the previous accepted expectation and report ACCEPTANCE-PENDING, ENVIRONMENT-BLOCKED, or the applicable mismatch decision
7. Report updated files, evidence references, decision, and any remaining limitation
```

### `--source=prompt|context|whole` — E2E Verify Green Handoff

```
E2E VERIFY GREEN PROTOCOL:
1. Resolve the requested scope from the prompt, current context, feature/bugfix, or whole configured project.
2. Read docs/project-config.json and the linked E2E reference before choosing a runner, startup command, port, account, seed, selector, or evidence path.
3. If the E2E profile is absent or incomplete, perform bounded repository discovery; record N/A only when E2E is not applicable and ENVIRONMENT-BLOCKED when an applicable prerequisite cannot be verified.
4. Select suitable existing cases or generate cases from the governing spec and code intent. Record the scenario in the project's declared format, protected invariant, applicable preconditions/postconditions, and settle condition for every case.
5. Exercise the configured project lifecycle. For human-QC, use the configured visible runner when supported. Follow its native waits or an evidenced project helper for readiness, actionability, and outcomes; use project-defined diagnostics and pacing only. A delay never replaces a real settle signal.
6. Capture, open, assess, and redact the configured evidence (screenshots, console/page errors, requests, trace, or video) as needed.
7. Run bounded fresh rounds. Classify each failure before changing source or test, fix at the owning layer, review each fix, and re-run the same scope until the configured convergence contract is met or escalate with exact evidence.
```

**UNIVERSAL RULES (all sources):**

- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
- Browser/UI E2E: use the configured runner's native waits or an evidenced bounded project helper for applicable readiness and outcomes. Apply action pacing only when configured, and keep it separate from real settle signals.
- Visual gate: run screenshot capture and adjudication only when requested or required by the project contract for an applicable visual surface; follow its capture mode and same-scope rerun after validated blocking findings. A false flag cannot waive a project-required gate; keep advisory polish visible without creating an unbounded taste loop.

Activate `workflow-e2e` for every source. The conditional `/e2e-test` occurrence is skipped for `prompt`, `context`, and `whole` because `/e2e-test-verify --fix-loop` owns selection or generation there.

**Steps:** `/investigate -> /e2e-test -> /e2e-test-verify --fix-loop -> /docs-update -> /workflow-end -> /watzup`.

## Project-Scoped Visual Review Mode

Resolve visual review from an explicit flag, the task request, and the project
contract. There is no framework-wide screenshot default. A visual surface does
not by itself imply a screenshot gate; use `true` only when review is requested
or required for that surface. An explicit false value may skip optional visual
review, but cannot waive a project-required gate. Record a conflict as a
blocker. Non-visual scopes record `N/A` for this gate.

**Behavior and visual quality are separate claims.** A configured test run
proves the journey's behavior; when visual review applies, the configured
capture set provides separate evidence against the project's design authority.

When the project-scoped visual mode is enabled:

- For `changes`, `recording`, and `update-ui`, complete source-specific work,
  then capture the project-declared state × viewport matrix. Add transitions
  only when `uiStateCapture.mode` is explicitly `every-action` and a verified
  shared boundary supports it. Index captures in `capture-manifest.json` and
  open/read every required artifact with `/experience-review --rounds=0`, which
  records each case before synthesis. Validated `BLOCKING` findings enter the
  E2E failure set and follow `/debug-investigate` → `/fix` at the owning layer
  → `/changes-review`; then rerun the same E2E command and required capture set.
  Never update a snapshot, baseline, fixture, assertion, or expectation
  automatically.
- For `prompt`, `context`, and `whole`, forward the resolved mode to
  `/e2e-test-verify --fix-loop`, which owns the configured run, capture,
  reconciliation, inspection, synthesis, fix, and same-scope rerun loop.
- A missing required capture, unread image, unindexed capture, manifest row
  without a per-case record, or incomplete declared matrix is
  `ENVIRONMENT-BLOCKED` or `UNVERIFIED`, never a visual pass. Record transition
  gaps according to the configured mode (`N/A — uiStateCapture off: {reason}`
  under `off`). Advisory identity, polish, and non-contract observations do not
  create an unbounded taste loop unless the governing contract requires them.

`/experience-review` is the image-evidence and visual-adjudication path;
`/ui-review` remains a static UI/source review when its own trigger applies.

## Experience Acceptance Handoff

When the E2E source touches a configured or likely observable surface, carry the `experience-review` record through the workflow:

- Exercise the actual configured entry point and inspect the resulting screenshot, transcript, response, or artifact; generated evidence that was not opened and assessed is not verification.
- A first run creates candidate evidence only. Do not pass `--update-snapshots`, rewrite fixtures, or replace an expectation until the record has an explicit named acceptance decision.
- On mismatch, preserve the prior accepted expectation and classify the result before choosing source fix, test fix, intended-change acceptance, invalid condition, environment block, or escalation.
- `/experience-review` runs a BOUNDED remediation loop (`--rounds=N`, default 3): each round adjudicates the BLOCKING defects, fixes at the owning layer via `/fix`, `/changes-review`s that round's fix diff, and re-exercises from scratch. Only objectively-checkable defects open a round — ADVISORY/taste findings are recorded, never looped on. Pass `--rounds=0` when this workflow must audit without changing the product. Cap reached, count not shrinking, count rising, or `ENVIRONMENT-BLOCKED` → `NOT-CONVERGED` + escalation, never a partial pass.
- A skipped occurrence needs an evidence-backed `NOT-APPLICABLE` reason; a relevant but unavailable runner/device/inspection capability is `ENVIRONMENT-BLOCKED`, never a green result.

## Test Architecture Contract Handoff

Before `/e2e-test` or `/e2e-test-verify --fix-loop`, resolve and carry one evidence-backed contract record through the unified sequence:

| Field | Required handoff |
| --- | --- |
| `applicability` | Mark E2E `APPLICABLE` only with evidence of a configured framework, runner, and command; otherwise record `N/A — <evidence>`. Skill-local browser helpers are not project evidence. |
| `owner` | Name the delegated owner for setup, E2E implementation, execution evidence, and documentation; do not duplicate leaf responsibilities. |
| `caseMap` | Resolve configured owner/case/scenario/variant and evidence fields, or strict-default TC/§8 when no native profile applies; map selected identities to actual executors, assertions, and results, preserving `UNKNOWN` / `UNVERIFIED`. |
| `fullCommand` / `focusedCommand` | Provide copy-ready configured commands for the full suite and focused/partial scope; invalid or zero-match selections must exit non-zero, with a simple/Windows entry point when required. |
| `runIdentity` / `dataStrategy` | Provide a unique non-sensitive run identity and business-data suffix, valid public-path setup, declared seed/accumulation mode, and parallel-worker isolation. |
| `testOrganization` | Name the declared local pattern (such as scoped in-file locators/helpers or configured objects), canonical locator/action/wait owners, and any demonstrated reuse; do not require POM tiers or an abstract base unless the project contract selects them. |
| `repeatProof` / `result` | Carry exact counts, failing names, and exit status, plus repeat/parallel evidence and two consecutive no-reset full runs for each applicable persistent-state suite. |

`/investigate` resolves applicability and scope; `/e2e-test` owns only source-specific authoring/setup when its occurrence applies; `/e2e-test-verify --fix-loop` owns the configured command, exact results, evidence, failure classification, fixes, and fresh reruns; `/docs-update` receives the terminal evidence. If E2E is not configured, the applicable owner records the evidence-backed `N/A` and does not substitute an invented runner.

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

<!-- SYNC:e2e-visual-design-contract -->

> **E2E Visual Design Contract** — Binds when this skill or agent handles visual-review evidence, human-QC of a user-facing visual surface, or visual expectation/baseline updates; for non-visual E2E/API/CLI work state `N/A — no user-facing visual surface` and do not invent a design review.
>
> 1. **Resolve authority first.** Read `docs/project-config.json`, its docs index, and the applicable project references for design, accessibility, platform, styling, and components; consult `.claude/docs/design-knowledge.md` and `.claude/docs/design-review-checklist.md` when they apply. Record `N/A` only for a proven absent surface or `ENVIRONMENT-BLOCKED` for an applicable missing configured capability — never invent tokens, components, breakpoints, type, styling conventions, or runner defaults.
> 2. **Use project decisions.** Apply precedence: brief/accepted design contract → adopter project design-system/SCSS/frontend docs and ADRs → shared `UI-1.1`–`UI-9.4`, `DD-1`–`DD-8`, and `CL-1`–`CL-6`; surface a genuine conflict with both sides, never silently choose. Read and apply the full shared `SYNC:design-system-check`, `SYNC:ui-ux-design-principles`, `SYNC:design-distinctiveness-gate`, and `SYNC:design-review-checklist` bodies for their applicable roles. When UI generation or repair is in scope, consume the accepted `/design` decisions (or the adopter's equivalent professional design/component system); review-only E2E evidence must not invent a new visual language.
> 3. **Map UI ownership when generation or UI fixes are in scope.** Inventory related screens, flows, and components. Use the adopter's documented component/module taxonomy when one exists; otherwise record actual component owners and boundaries from the code. Reuse or compose abstractions that fit, and record why they do not fit when creating new ones. Preserve ownership of markup, selectors, styling, lifecycle, and tests according to the project's architecture.
> 4. **Separate review owners.** Use `/experience-review` for the running surface and opened/read screenshot evidence; route source-only styling, tokens, accessibility, z-index, component ownership, reuse, and static design findings to `/ui-review`. Apply BEM/SCSS checks only when selected by the project. Never infer source architecture or design tokens from an image, and never treat a passing E2E command as visual/design approval.
> 5. **Capture relevant UI states under the project's evidence contract.** Apply `.claude/skills/shared/ui-state-capture-protocol.md` with the configured `uiStateCapture.mode` and runner capabilities. Capture states and transitions required by the project contract, and report coverage gaps. Use a shared action-level capture helper or evidence manifest when the project selects or already provides that mechanism; otherwise follow its established test/evidence pattern. Mask sensitive or volatile data as required by the evidence policy.
> 6. **Gate every visual round case by case, then synthesize.** Reload the design/UI convention authority BEFORE judging the first image. Open/read ONE capture at a time and append its record — image path, expected delta, observed facts with locations, attributed console output, taxonomy findings or an explicit `none`, verdict — before opening the next. Then reconcile records against the configured evidence index, cluster repeated defects under the actual owner established by the project architecture, report sequence-level findings only visible across captures, and list uncaptured transitions as coverage gaps where the contract requires them. `UIX-BROKEN`/`UNSTYLED`/`OVERFLOW`/`OVERLAP`/`STATE`, `UI-*`/accessibility/layout-floor, and `P0`–`P2` `CL-*` findings are `BLOCKING`; `UIX-POLISH`/`DD-*` identity is `ADVISORY` unless the governing brief/project contract makes it objectively required. A `UIX-CONVENTION` finding cites the authority clause it breaks. Unmeasurable values are `NOT VERIFIABLE`; a missing record is incomplete review, never a clean result; never promote a baseline/expectation automatically.
> 7. **Report the contract.** Persist authority paths and resolution status, component ownership/reuse decisions, required state/transition coverage and gaps, `UI`/`DD`/`CL`/`UIX` coverage or skips, evidence-index path when configured, evidence/read status, and remaining human acceptance; preserve the protected business invariant and exact E2E scope.

<!-- /SYNC:e2e-visual-design-contract -->

<!-- SYNC:session-goal-ledger -->

> **Session Goal Ledger** — Never lose the user's original request or any later prompt, however long the session runs. Hook-independent: binds every host; a prompt-ledger hook is only an accelerator.
>
> 1. **Pin before acting.** Before the first tool call, write `Original goal: <user's request, verbatim or faithfully condensed>` and keep it as the first task-list item. For workflow or plan work, copy it verbatim into the Goal Contract `## Original Request`.
> 2. **Track every prompt.** Keep `User prompts this session: P1…Pn` — one line per user prompt or input, marked `extends` / `narrows` / `changes` / `answers`. A prompt that changes direction updates the goal explicitly — never silently.
> 3. **Re-anchor.** Re-read the original goal and the prompt list at every workflow step, before delegating (the sub-agent brief carries the verbatim goal), and after compaction, resume, or a `[[prompt-ledger@…]]` reminder. When `tmp/prompt-ledger/<session>/ledger.md` exists it is the durable record — read it after compaction.
> 4. **Verify before done.** Map the final result to the original goal and every prompt: `P# → done | deferred (reason) | not applicable`. An unaddressed prompt blocks completion.
> 5. **Security.** NEVER copy secrets, tokens, or credentials into goal lines, task lists, briefs, or reports — redact them.
>
> **Blocked until:** original goal pinned · prompt list current · final result mapped to every prompt.

<!-- /SYNC:session-goal-ledger -->

<!-- SYNC:workflow-registry-binding -->

> **Workflow ⇄ Registry Two-Way Binding** — a workflow is defined in TWO places that MUST agree: the machine registry `.claude/workflows.json` → `workflows.<workflow-id>`, and this skill's `SKILL.md`. Neither is complete alone. Read BOTH before executing, in this order.
>
> **1. Registry → skill (what the registry owns).** Before the first step, read `.claude/workflows.json` → `workflows.<workflow-id>` and treat it as CANONICAL for:
>
> | Registry field | Governs | Rule |
> | --- | --- | --- |
> | `sequence` | the ordered step list | Execute 1:1. NEVER improvise, reorder, add, or drop a step. |
> | `sequence[].applicability` | every conditional step | `when` is the ONLY run condition; on skip, record `skipReason` VERBATIM as the step's evidence. |
> | `sequence[].args` | step flags | Pass exactly as declared. |
> | `parallelGroups` | all-return barriers | Spawn all members in ONE message; advance only after EVERY member returns. |
> | `stepMeta` | inline vs sub-agent, context budget | Overrides the skill's own front matter. |
> | `preActions.injectContext` | mandatory pre-read context | Apply before step 1. |
> | `variants` / `defaultMode` | mode selection | A variant is a COMPLETE sequence; it inherits nothing from the base. |
>
> **2. Skill → registry (what this SKILL.md owns).** The registry declares WHICH steps run in WHAT order; this SKILL.md declares HOW each step executes — protocols, gates, loops, evidence bars, escalation. Each `sequence[].skill` resolves to `.claude/skills/<skill>/SKILL.md`; the workflow's `preActions.readFiles` names this file as the reverse pointer. Read a step's own SKILL.md before running it.
>
> **3. Precedence on conflict.** Registry WINS on step identity, order, args, applicability, barriers and execution mode. SKILL.md WINS on how to perform a step and on the quality bar it must clear. A genuine contradiction between the two — a step in one and not the other, a different order, or an applicability note whose meaning differs — is DRIFT: note the mismatch in your evidence, continue under the precedence above, and report it when the run ends. NEVER silently pick a side, and NEVER edit one side to match without saying so.
>
> **4. Keep both sides equal when editing either.** Changing a sequence, an occurrence ID, or an `applicability` note in `workflows.json` REQUIRES the matching update in this SKILL.md, and vice versa. Specifically: the `**IMPORTANT MANDATORY Steps:**` line MUST remain a clean `->` chain equal to the registry `sequence` (it is parsed, not prose — annotations there break the gate), any conditional step's note here MUST carry the registry's `skipReason` verbatim, and the step-task table's `Conditional?` column MUST match the presence of `applicability`. After editing either side, re-mirror with `/sync-codex` (`node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`).
>
> **Blocked until:** the registry entry for this workflow has been read, its `sequence` reproduced 1:1 into the task list, and every `applicability` condition evaluated with its verdict recorded.

<!-- /SYNC:workflow-registry-binding -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

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

<!-- SYNC:e2e-visual-design-contract:reminder -->

**MUST ATTENTION** visual E2E/QC resolves the project design authority first, applies project design-system and frontend decisions plus applicable `UI-*`/`DD-*`/`CL-*` roles, records component ownership using the project's taxonomy or observed boundaries, sends static source findings to `/ui-review` and runtime image evidence to `/experience-review`, captures states and transitions required by the configured evidence contract, reloads the convention docs then reads and records each required capture before synthesizing findings with coverage gaps, treats `UIX`/UI/accessibility-floor findings as blocking and `UIX-POLISH`/DD identity as advisory, never invents measurements, and never auto-promotes baselines; non-visual runs state `N/A`.

<!-- /SYNC:e2e-visual-design-contract:reminder -->


<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** Testability contract: resolve evidence-backed test types and modes required by the task/project, copy-ready full/focused commands where available, zero-match behavior, owner/root/data, supported entry points, and repeat proof when required before claiming setup, review, or test completion.
**IMPORTANT MUST ATTENTION Goal:** [Workflow] Provide one canonical E2E lifecycle: write or update the test when the source requires it, then verify the fixed scope through the configured system and repair failures in a bounded fresh-run loop until it is honestly green or escalated. Run visual screenshot review only when requested or required by the project contract; no framework-wide visual default applies.

**IMPORTANT MUST ATTENTION Workflow:** Resolve and state `--source` plus visual mode; read config/reference, select native owner/case/variant/evidence or strict-default TC, then apply the source protocol and one config-first green loop; preserve intent-bearing assertions, evidence-backed task transitions, visible human-QC evidence, and explicit verification of generated/updated artifacts.

**IMPORTANT MUST ATTENTION** when visual review is requested or required by the project contract for an applicable surface, run the same configured E2E scope and capture its declared matrix; add transitions only under explicitly configured, supported `every-action` mode. Have `/experience-review --rounds=0` read and record every required capture before synthesis, fix validated blocking UI defects once at the owning layer, and rerun the same scope. A false value cannot waive a project-required gate.

**IMPORTANT MUST ATTENTION** every interactive browser/UI action follows the configured runner's readiness and postcondition strategy; use bounded project helpers when evidenced and apply action delays only when configured.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** expand child phases, link parent when nested.
- **Critical Thinking:** traced `file:line` proof, confidence >80% to act.
- **Incremental Persistence:** append findings to report file after each section.
- **Subagent Return Contract:** sub-agent returns summary-only with `Full report:` pointer.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
