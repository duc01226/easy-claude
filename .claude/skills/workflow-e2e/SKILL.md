---
name: workflow-e2e
version: 1.2.0
description: '[Workflow] Use when writing, updating, and verifying E2E/Playwright tests through a bounded green fix/retest loop. Flags: --source={changes|recording|update-ui|prompt|context|whole}, --visual-review={true|false} (default true; false is the explicit opt-out).'
disable-model-invocation: false
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** [Workflow] Provide one canonical E2E lifecycle: write or update the test when the source requires it, then verify the fixed scope through the configured system and repair failures in a bounded fresh-run loop until it is honestly green or escalated. Visual screenshot review is enabled by default, and `--visual-review=false` is the explicit opt-out from the screenshot visual gate and E2E rerun loop.

**Summary:** Resolve `--source={changes|recording|update-ui|prompt|context|whole}` (infer and state it when omitted) and `--visual-review={true|false}` (default true; state the resolved value). Authoring sources (`changes|recording|update-ui`) prepare the E2E artifact first; verification sources (`prompt|context|whole`) let the convergence engine select or generate it. Every source then enters the same config-first `e2e-test-verify-loop`, which exercises the declared scope, adjudicates failures, fixes the owning layer, and repeats fresh remediation with evidence. When visual review is enabled, the loop also captures/reads every generated screenshot in the declared matrix through `/experience-review --rounds=0`, fixes validated blocking UI findings, and reruns the same E2E scope.
- **Testability contract:** resolve Unit/Integration/System/E2E applicability from runner/config evidence; record owner/root/data, copy-ready full + focused commands, zero-match behavior, CI/simple-Windows entry, unique run/data identity, and repeat proof; unresolved applicable fields block handoff, while non-applicable tiers require evidence-backed `N/A`.
- **Browser interaction contract:** for every UI-control step, reuse one bounded parameterized `waitUntil(condition, options)` helper before the action for readiness/actionability and applicable error-alert absence, and after the action for the expected positive/negative outcome or error-alert state; apply the exact 500ms pacing delay only at the end.

**Workflow:**

1. **Detect** — resolve `--source`, scope, and visual mode from the request and repository evidence.
2. **Prepare** — run the conditional `/e2e-test` authoring phase for `changes|recording|update-ui`; otherwise let the loop select or generate the required case.
3. **Converge** — run `/e2e-test-verify-loop` over that exact scope; classify, fix, review, and rerun from fresh setup until the configured green contract passes or escalation is required.
4. **Close** — update docs with the terminal evidence, then end and report the workflow.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- MUST ATTENTION write browser journeys as observe → act → observe: use `waitUntil` for loading, controls, click results, dropdown/options, selected state, and applicable error-alert presence/absence; keep predicates, timeout/poll settings, and diagnostics reusable.
- MUST ATTENTION when visual review is enabled (the default or explicit `--visual-review=true`), capture and open/read every generated screenshot in the declared state × viewport matrix, use `/experience-review` as the visual adjudicator, route validated blocking UI findings through the owning UI fix, and rerun the same E2E scope; `--visual-review=false` is the explicit opt-out and `/ask` is not a screenshot reviewer.
- MUST ATTENTION treat `/e2e-test-verify-loop` as the single convergence/remediation owner after preparation; do not run a second green workflow, duplicate the configured E2E command, or create a separate visual-fix loop.
- NEVER skip mandatory workflow or skill gates.

**IMPORTANT MANDATORY Steps:** /investigate -> /e2e-test -> /e2e-test-verify-loop -> /docs-update -> /workflow-end -> /watzup

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

## Source Dispatch (`--source`)

Resolve `--source` from the invocation and state the result before proceeding. An explicit value wins. When omitted, infer in this order: recording JSON present → `recording`; an explicit whole-project request → `whole`; a request to run/verify/QC a feature, bugfix, journey, or current context → `prompt` or `context`; a UI/SCSS/HTML diff with baseline intent → `update-ui`; a confirmed code/spec/API change → `changes`. If no source signal is evidenced, stop with an ambiguity record rather than silently choosing a maintenance mode. Resolve `--visual-review=true|false` separately; default to `true`, and record `false` only when the caller explicitly opts out. The default applies even when the target is not obviously a UI; a UI surface is not needed to infer the flag.

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
| `true` (default)   | Require a screenshot state × viewport matrix for applicable generated screenshots and image inspection through `/experience-review --rounds=0`; validated blocking visual findings enter the E2E failure set, are fixed at the owning UI layer, and force a fresh same-scope E2E rerun. |
| `false` (explicit opt-out) | Run the selected source protocol and its other evidence/acceptance gates without the screenshot visual remediation loop. |

All sources use one lifecycle in this manifest: `/investigate -> /e2e-test -> /e2e-test-verify-loop -> /docs-update -> /workflow-end -> /watzup`. The `/e2e-test` occurrence is conditional authoring: `changes`, `recording`, and `update-ui` write or update the artifact and hand its exact scope and traceability to the loop; `prompt`, `context`, and `whole` skip it because the loop selects or generates Given/When/Then cases itself. The loop owns the configured E2E command, report-only `/experience-review`, failure adjudication, owning-layer fixes, review, fresh bring-up, and same-scope reruns; `/test` is not a second top-level run.

When visual review is enabled (the default or explicit `--visual-review=true`),
forward the resolved true value to `/e2e-test-verify-loop`. When
`--visual-review=false` is explicit, forward the resolved opt-out. The loop,
not `/ask`, owns visual adjudication, UI fixes, and the required rerun of the
same configured E2E command after each validated blocking visual finding.

### `--source=changes` — E2E from Changes

```
E2E FROM CHANGES PROTOCOL:
1. Detect change type from git diff:
   - Test spec changes in feature docs -> Generate new test cases
   - Code changes -> Update existing test assertions
   - API changes -> Update test data and API mocks
2. Load affected test specifications (TC-{FEATURE}-{NNN})
3. Update or generate test implementations with the shared bounded `waitUntil(condition, options)` helper before and after every interactive UI action; keep the final assertion in the test.
4. Ensure traceability: each TC has corresponding test
5. Run only the configured focused authoring check when useful; the final full green gate belongs to `/e2e-test-verify-loop`
6. Report updated test coverage and the exact scope handed to the convergence loop
```

### `--source=recording` — E2E from Recording

```
E2E FROM RECORDING PROTOCOL:
1. Validate recording file exists (JSON format)
2. Identify target app and feature from user context
3. Run convert-recording.ts to generate initial test file
4. Load test specifications from feature docs Section 8
5. Map TC-{FEATURE}-{NNN} test cases to recording steps
6. Enhance generated code with the resolved project design-system/SCSS/frontend conventions from `docs/project-config.json` and linked reference docs; if no project convention is configured, record `N/A` rather than inventing one. Rewrite generated timing into the shared `waitUntil` observe → act → observe sequence; do not retain ad-hoc sleeps.
7. Add screenshot assertions at key states
8. Generate Page Object if complex flow, reusing the Common → Domain-Shared → Page object tiers and one canonical wait-until utility.
9. Run only a configured focused authoring check when useful; the convergence loop performs the final full verification
10. Report generated files, the exact scope handed off, and any manual steps needed
```

### `--source=update-ui` — E2E Update UI

```
E2E UPDATE UI PROTOCOL:
1. Identify visual changes from git diff (SCSS, HTML, TS)
2. Map changed files to affected page objects
3. Find E2E specs using those page objects
4. Run affected tests to collect candidate screenshots/evidence without changing accepted expectations
5. Collect candidate evidence and record the observed/judged/acceptance state; the final report-only visual adjudication and any fix/retest loop belong to `/e2e-test-verify-loop`
6. Update only the affected snapshots/baselines after an explicit acceptance record; otherwise preserve the previous accepted expectation and report ACCEPTANCE-PENDING, ENVIRONMENT-BLOCKED, or the applicable mismatch decision
7. Report updated files, evidence references, decision, and any remaining limitation
```

### `--source=prompt|context|whole` — E2E Verify Green Handoff

```
E2E VERIFY GREEN PROTOCOL:
1. Resolve the requested scope from the prompt, current context, feature/bugfix, or whole configured project.
2. Read docs/project-config.json and the linked E2E reference before choosing a runner, startup command, port, account, seed, selector, or evidence path.
3. If the E2E profile is absent or incomplete, perform bounded repository discovery; record N/A only when E2E is not applicable and ENVIRONMENT-BLOCKED when an applicable prerequisite cannot be verified.
4. Select suitable existing cases or generate cases from the governing spec and code intent. Record Given/When/Then, protected invariant, bounded `waitUntil` precondition/postcondition, and settle condition for every case.
5. Exercise the configured project lifecycle. For web journeys use a visible Playwright CLI browser when the project supports it; before every UI-control action use the shared `waitUntil` for readiness/actionability and applicable error-alert absence, after it use `waitUntil` for the expected positive/negative result, dropdown/options, selected state, or error-alert presence/absence, and then wait exactly **500ms at the end** for automated and human-QC presentation. The delay never replaces a real settle signal.
6. Capture, open, assess, and redact the configured evidence (screenshots, console/page errors, requests, trace, or video) as needed.
7. Run bounded fresh rounds. Classify each failure before changing source or test, fix at the owning layer, review each fix, and re-run the same scope until the configured convergence contract is met or escalate with exact evidence.
```

**UNIVERSAL RULES (all sources):**

- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
- Browser/UI E2E: use a shared bounded `waitUntil(condition, options)` before and after every control action for readiness/actionability, expected positive/negative state, dropdown/options, and applicable error-alert presence/absence; apply the exact 500ms pacing delay last and keep real settle signals separate.
- Default visual gate: unless `--visual-review=false` is explicit, require screenshot capture/read/visual adjudication and a same-scope E2E rerun after each validated blocking UI fix; keep advisory polish visible without creating an unbounded taste loop.

Activate `workflow-e2e` for every source. The conditional `/e2e-test` occurrence is skipped for `prompt`, `context`, and `whole` because `/e2e-test-verify-loop` owns selection or generation there. There is no second `workflow-e2e-green` route.

**Steps:** `/investigate -> /e2e-test -> /e2e-test-verify-loop -> /docs-update -> /workflow-end -> /watzup`.

## Default Combined Visual Review Mode

Visual review is enabled for every `--source` value by default, equivalent to
`--visual-review=true`. An explicit `--visual-review=false` opts out. Seeing or
changing a UI does not switch the mode off or on; the resolved flag is recorded
before execution. The default path keeps the source-specific workflow and its
existing acceptance gates, while adding screenshot inspection for every
applicable run that generates screenshots.

When the mode is enabled:

- For `changes`, `recording`, and `update-ui`, complete the source-specific
  generation/update work, then run the configured same-scope E2E command and
  capture the declared screenshot state × viewport matrix. Open/read every
  image with `/experience-review --rounds=0`; its visual result is a required
  gate, not a report-only note. Validated `BLOCKING` UI-floor findings enter
  the E2E failure set and follow `/debug-investigate` → `/fix` at the owning
  UI layer → `/changes-review`; then rerun the same E2E command and matrix.
  Repeat until the E2E and blocking-visual counts converge. Never update a
  snapshot, baseline, fixture, assertion, or expectation automatically.
- For `prompt`, `context`, and `whole`, forward the flag to
  `/e2e-test-verify-loop`, which owns the complete run → capture → inspect →
  fix → same-scope rerun loop.
- Missing capture, unread images, or an incomplete state × viewport matrix is
  `ENVIRONMENT-BLOCKED`; it is not a visual pass. `ADVISORY` identity, polish,
  or non-contract spacing observations remain visible but do not create an
  unbounded taste loop unless the governing design/acceptance contract makes
  them objectively required.

`/experience-review` is the image-evidence and visual-adjudication path.
`/ask` remains architecture/technology consultation and is not a screenshot
reviewer; `/ui-review` remains a static UI/source review when its own trigger
applies.

## Experience Acceptance Handoff

When the E2E source touches a configured or likely observable surface, carry the `experience-review` record through the workflow:

- Exercise the actual configured entry point and inspect the resulting screenshot, transcript, response, or artifact; generated evidence that was not opened and assessed is not verification.
- A first run creates candidate evidence only. Do not pass `--update-snapshots`, rewrite fixtures, or replace an expectation until the record has an explicit named acceptance decision.
- On mismatch, preserve the prior accepted expectation and classify the result before choosing source fix, test fix, intended-change acceptance, invalid condition, environment block, or escalation.
- `/experience-review` runs a BOUNDED remediation loop (`--rounds=N`, default 3): each round adjudicates the BLOCKING defects, fixes at the owning layer via `/fix`, `/changes-review`s that round's fix diff, and re-exercises from scratch. Only objectively-checkable defects open a round — ADVISORY/taste findings are recorded, never looped on. Pass `--rounds=0` when this workflow must audit without changing the product. Cap reached, count not shrinking, count rising, or `ENVIRONMENT-BLOCKED` → `NOT-CONVERGED` + escalation, never a partial pass.
- A skipped occurrence needs an evidence-backed `NOT-APPLICABLE` reason; a relevant but unavailable runner/device/inspection capability is `ENVIRONMENT-BLOCKED`, never a green result.

## Test Architecture Contract Handoff

Before `/e2e-test` or `/e2e-test-verify-loop`, resolve and carry one evidence-backed contract record through the unified sequence:

| Field | Required handoff |
| --- | --- |
| `applicability` | Mark E2E `APPLICABLE` only with evidence of a configured framework, runner, and command; otherwise record `N/A — <evidence>`. Skill-local browser helpers are not project evidence. |
| `owner` | Name the delegated owner for setup, E2E implementation, execution evidence, and documentation; do not duplicate leaf responsibilities. |
| `fullCommand` / `focusedCommand` | Provide copy-ready configured commands for the full suite and focused/partial scope; invalid or zero-match selections must exit non-zero, with a simple/Windows entry point when required. |
| `runIdentity` / `dataStrategy` | Provide a unique non-sensitive run identity and business-data suffix, valid public-path setup, declared seed/accumulation mode, and parallel-worker isolation. |
| `objectModel` | Provide the reusable Common → Domain-Shared → Page component/object tiers, the idiomatic abstract base or language-equivalent abstraction, one canonical parameterized `waitUntil` helper with bounded diagnostics, cohesive helpers/utilities, and the reason for any non-reuse. |
| `repeatProof` / `result` | Carry exact counts, failing names, and exit status, plus repeat/parallel evidence and two consecutive no-reset full runs for each applicable persistent-state suite. |

`/investigate` resolves applicability and scope; `/e2e-test` owns only source-specific authoring/setup when its occurrence applies; `/e2e-test-verify-loop` owns the configured command, exact results, evidence, failure classification, fixes, and fresh reruns; `/docs-update` receives the terminal evidence. If E2E is not configured, the applicable owner records the evidence-backed `N/A` and does not substitute an invented runner.

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

<!-- SYNC:e2e-visual-design-contract -->

> **E2E Visual Design Contract** — Binds when this skill or agent handles `--visual-review=true`, screenshot/recording evidence, human-QC of a user-facing UI, or visual expectation/baseline updates; for non-visual E2E/API/CLI work state `N/A — no user-facing visual surface` and do not invent a design review.
>
> 1. **Resolve authority first.** Read `docs/project-config.json`, its `designSystem.canonicalDoc`, `tokenFiles`, and `appMappings[]`, plus the resolved `design-system/README.md`, `frontend-patterns-reference.md`, `scss-styling-guide.md`, `.claude/docs/design-knowledge.md`, and `.claude/docs/design-review-checklist.md`; record `N/A` only for a proven absent surface or `ENVIRONMENT-BLOCKED` for an applicable missing capability — never invent tokens, components, breakpoints, type, CSS/BEM, or runner defaults.
> 2. **Use project decisions.** Apply precedence: brief/accepted design contract → adopter project design-system/SCSS/frontend docs and ADRs → shared `UI-1.1`–`UI-9.4`, `DD-1`–`DD-8`, and `CL-1`–`CL-6`; surface a genuine conflict with both sides, never silently choose. Read and apply the full shared `SYNC:design-system-check`, `SYNC:ui-ux-design-principles`, `SYNC:design-distinctiveness-gate`, and `SYNC:design-review-checklist` bodies for their applicable roles. When UI generation or repair is in scope, consume the accepted `/design` decisions (or the adopter's equivalent professional design/component system); review-only E2E evidence must not invent a new visual language.
> 3. **Map UI architecture before generation or UI fixes.** Inventory related screens, flows, and components; classify each relevant component `Common`, `Domain-Shared`, or `Page`; record its base abstraction and owner; reuse/compose before creating; record why reuse does not fit; keep one owner for markup, selectors, styling, lifecycle, and lower-tier test contracts. Page tests cover composition/outcomes, not copied lower-tier behavior.
> 4. **Separate review owners.** Use `/experience-review` for the running surface and opened/read screenshot evidence; route source-only token, BEM/SCSS, z-index, component ownership, reuse, and static design findings to `/ui-review`. Never infer source architecture or design tokens from an image, and never treat a passing E2E command as visual/design approval.
> 5. **Gate every visual round.** Capture every declared state × viewport (including loading, empty, error, permission, post-submit, and full-page where applicable), open/read each artifact, and record state, viewport, location, and measured values. `UI-*`/accessibility/layout-floor and `P0`–`P2` `CL-*` findings are `BLOCKING`; `DD-*` identity/polish is `ADVISORY` unless the governing brief/project contract makes it objectively required. Unmeasurable values are `NOT VERIFIABLE`; never promote a baseline/expectation automatically.
> 6. **Report the contract.** Persist authority paths and resolution status, component tier/base/owner/reuse decisions, matrix coverage, `UI`/`DD`/`CL` coverage or skips, evidence/read status, and remaining human acceptance; preserve the protected business invariant and exact E2E scope.

<!-- /SYNC:e2e-visual-design-contract -->



<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

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

<!-- SYNC:e2e-visual-design-contract:reminder -->

**MUST ATTENTION** visual E2E/QC resolves the project design authority first, applies project design-system/SCSS/frontend decisions plus `UI-*`/`DD-*`/`CL-*` roles, classifies Common/Domain-Shared/Page ownership and reuse, sends static source findings to `/ui-review` and runtime image evidence to `/experience-review`, reads every state × viewport artifact, treats UI/accessibility-floor findings as blocking and DD identity/polish as advisory, never invents measurements, and never auto-promotes baselines; non-visual runs state `N/A`.

<!-- /SYNC:e2e-visual-design-contract:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** Testability contract: resolve evidence-backed Unit/Integration/System/E2E rows, copy-ready full/focused commands, zero-match failures, owner/root/data, CI/simple-Windows entry, unique run identity, and repeat proof before claiming setup, review, or test completion.
**IMPORTANT MUST ATTENTION Goal:** [Workflow] Provide one canonical E2E lifecycle: write or update the test when the source requires it, then verify the fixed scope through the configured system and repair failures in a bounded fresh-run loop until it is honestly green or escalated. Visual screenshot review is enabled by default, and `--visual-review=false` is the explicit opt-out from the screenshot visual gate and E2E rerun loop.

**IMPORTANT MUST ATTENTION Workflow:** Resolve and state `--source={changes|recording|update-ui|prompt|context|whole}`; apply the established source protocol or the config-first green loop through its declared sequence; preserve intent-named test assertions, evidence-backed task transitions, visible human-QC evidence, and explicit verification of generated/updated E2E artifacts.

**IMPORTANT MUST ATTENTION** visual screenshot review is enabled by default (equivalent to `--visual-review=true`); run the same configured E2E scope, capture and open/read every generated screenshot in the full state × viewport matrix through `/experience-review --rounds=0`, fix only validated blocking UI defects at the owning layer, and rerun the same scope. `--visual-review=false` is the explicit opt-out; `/ask` is not the screenshot reviewer.

**IMPORTANT MUST ATTENTION** every interactive browser/UI action uses the reusable bounded `waitUntil(condition, options)` before and after the action, including applicable error-alert states, followed by the exact 500ms presentation delay last.

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
