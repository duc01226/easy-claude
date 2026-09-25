---
name: e2e-test-verify
version: 1.1.0
description: '[Testing] Use when a workflow step or the user asks for E2E verification with exact runner output and evidence. Flags: --fix-loop drives a suite or human-QC journey to green; --visual-review={true|false} follows the request or project contract.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute the steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking; set `completed` only with evidence or an explicit skip reason.
> **[BLOCKING]** The default pass is report-only: it may write its report, but it does not edit source, tests, fixtures, baselines, generated output, or user data. Only the opt-in `--fix-loop` mode lands repairs, and only through its owning-layer fix step.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **E2E Quality Protocol** — the shared gate covers intent, stable object ownership, isolated data, auth/permissions, applicable accessibility/responsive/visual checks, bounded waits, readable failure artifacts, cleanup, and test-to-spec traceability.
> **MUST ATTENTION READ** `.claude/skills/shared/e2e-quality-protocol.md` before verification; `NOT-APPLICABLE` requires no executable surface, while a relevant missing capability is `ENVIRONMENT-BLOCKED`.

## Quick Summary

**Goal:** Verify an existing configured E2E/browser/user-flow scope once without changing it, returning exact execution evidence and an honest quality-gate verdict that a convergence owner can safely consume.

**Summary:**

- **Contract first:** resolve the fixed scope, project runner, lifecycle, auth, data, browser, evidence, scenario/invariant, and profile-selected owner/case/variant/evidence; use TC only under the strict default.
- **Report-only gate:** inspect tests and the project's declared object/helper organization, execute the configured scope when runnable, capture exact results and readable artifacts, and apply the shared E2E quality protocol.
- **Honest handoff:** return `PASS`, `NOT-APPLICABLE`, `ENVIRONMENT-BLOCKED`, or `UNVERIFIED`; never repair, weaken, skip, narrow, delete, reset, or baseline-promote.
<!-- FIX-LOOP-MODE:START -->
- **OPTIONAL `--fix-loop` MODE (opt-in; absent flag = everything above unchanged)** — drives a configured E2E suite or human-QC journey to a truthful green result over a fixed scope: resolve visual-review applicability from the explicit request and project contract, scope, and Goal Contract → resolve the project execution contract → select or generate a test in the project's declared format → bring up the whole system → per round { run the DEFAULT pass inline (never with the flag) → run the visual gate only when applicable and required → five-way verdict → `/debug-investigate` → `/fix` at the owning layer → `/changes-review` → Round Integrity Check → fresh same-scope rerun } → converge on the configured consecutive fresh green runs (default 2) within the round cap (default 3), or escalate. It is the convergence engine `workflow-e2e` calls; report-only callers NEVER pass it. Full protocol: **Mode: Fix-Loop** section.
<!-- FIX-LOOP-MODE:END -->

**Workflow:**

1. **Resolve** — fix scope, read config/reference/spec intent, and create the report.
2. **Model** — record the scenario and invariant in the project's native test format, configured owner/case/variant/evidence (or strict-default TC), declared locator/action ownership, auth, data, and visual evidence only when applicable.
3. **Inspect** — review existing tests and the declared locator/helper/object organization; apply every shared quality-gate row.
4. **Verify** — attach evidence before interaction, run the configured command once, and persist exact output.
5. **Report** — classify the result and hand findings to the `--fix-loop`/review/experience owner.

**Key Rules:**

- MUST ATTENTION read `docs/project-config.json`, `docs/project-reference/e2e-test-reference.md`, the relevant intent/spec, and the shared protocol before the first verification command.
- MUST ATTENTION use the configured project command and fixed scope; never infer a framework, selector, credential, data path, or generic browser substitute.
- MUST ATTENTION resolve `specArtifacts` before identifying test cases: use owner-qualified case/variant and configured evidence when declared, strict TC/§8 only when absent; a malformed profile blocks and never falls back.
- MUST ATTENTION map every selected identity to its actual executing test, assertion, and result, respecting configured cardinality; source/title matches alone remain `UNVERIFIED`.
- MUST ATTENTION reuse the declared project test organization; a `pageObjectsPath` is not proof that a Page Object Model is required.
- MUST ATTENTION apply the project's scenario/invariant contract and every applicable shared gate row; use its configured test format. A test command passing alone is not a quality pass.
- MUST ATTENTION attach and read redacted runtime/visual evidence, report exact counts/exit status, and preserve cleanup/baseline integrity.
- NEVER edit source, tests, fixtures, user data, snapshots, baselines, or assertions from the report-only default pass; only `--fix-loop` repairs, through its Step FL-4 owning-layer route.

<!-- FIX-LOOP-MODE:START -->

> **Mode detection (FIRST):** when the invocation carries `--fix-loop`, read and run **Mode: Fix-Loop** below before Step 0 — it wraps Steps 0–4, and each of its rounds runs them as the default pass. Without the flag, run Steps 0–4 exactly as written.

<!-- FIX-LOOP-MODE:END -->

## Step 0 — Resolve scope and evidence contract

Before any test command:

1. Read `docs/project-config.json`, `docs/project-reference/docs-index-reference.md`, `docs/project-reference/lessons.md`, `docs/project-reference/e2e-test-reference.md`, the applicable feature/spec/contract, and `.claude/skills/shared/e2e-quality-protocol.md`.
2. Resolve the caller's explicit scope. If none is supplied, use the whole configured E2E scope; do not shrink it to changed tests or a convenient project.
3. Create `tmp/reports/e2e-test-verify-{YYMMDD-HHmm}-{slug}.md` and record Run ID, Task ID, Attempt ID, scope, target fingerprint, and visual applicability.
4. Require evidence of an actual framework configuration and runnable command before labeling the surface `APPLICABLE`. No executable surface is `NOT-APPLICABLE`; a changed executable surface with missing runner/auth/data/browser/evidence capability is `ENVIRONMENT-BLOCKED`.

## Step 1 — Build the scenario and contract record

For each requested behavior, persist:

```text
Given <verified actor, fixture/data, permissions, and starting state>
When <real actions through the configured interface>
Then <owned business outcome plus applicable error/recovery result>
OWNER <configured canonical root and owner, or UNKNOWN>
CASE <owner-qualified configured case/scenario plus variant, or strict-default TC>
INTENT <configured requirement/acceptance references and protected invariant>
EVIDENCE <configured source carrier and evidence section; §8/Test Specifications only under the strict default>
PROOF <actual executor(s), assertion(s), and runner result(s); unresolved rows remain UNVERIFIED>
```

Resolve configured full/focused commands, zero-match behavior, run identity, isolation, auth reference, data policy, browser/viewport matrix, evidence root/redaction, cleanup, and active case profile. Search for three comparable tests and the project's declared organization when available; cite the reuse or mismatch decision without requiring a POM.

## Step 2 — Inspect the existing artifacts and shared gate

Read the selected test and the project's declared locator/action organization. Reuse its helpers or object model where configured or justified by demonstrated reuse; do not infer a POM from a path setting. Confirm each locator/action has one owner, the `THEN` assertion remains visible, the GWT record names the protected invariant, and applicable auth, fixture/data, async/wait, evidence, cleanup, visual/accessibility/responsive, and spec-traceability rows have evidence.

For browser actions, verify the configured runner's native wait strategy or an evidenced bounded project helper for readiness, outcomes, and error states. Action delays apply only when the project contract configures them. Verify that evidence capture attaches before interaction and that visual artifacts are opened/read rather than merely generated.

For a UI surface where visual review is requested or required by the project contract, also verify the capture contract report-only (`.claude/skills/shared/ui-state-capture-protocol.md`) for the resolved `uiStateCapture.mode`. Under `every-action`: the capture call lives at an evidenced shared action boundary rather than being sprinkled through test bodies; it fires after the configured runner observes the postcondition, plus only pacing specified by the project contract; the declared triggers cover the journey's UI-state-changing actions; `capture-manifest.json` exists with one row per capture including deduped and capped rows; failure captures are exempt from dedupe and caps; and every row was actually read. Under `declared-only`, verify the matrix rows, manifest, and reads only, and record every state-changing action as an uncaptured-transition blind spot — never a FAIL and never an implicit pass. Under `off`, verify the matrix rows, manifest, and reads exactly as under `declared-only`, and record transition coverage once as `N/A — uiStateCapture off: {reason}` instead of per-action blind spots; `off` never waives a visual gate required by the project contract, and a missing required matrix capture still fails it. Report an uninstrumented suite under `every-action`, an unindexed capture, or an unread image as a gate failure routed to `e2e-test`; never instrument, capture, or repair from this skill.

## Step 3 — Run one report-only verification attempt

When `APPLICABLE`, run the configured full command for the fixed scope. Use a focused command only as additional evidence, never as a replacement for the declared full scope. Record the exact command, start/end, exit status, Passed/Failed/Skipped counts, names, run identity, data mode, and artifact paths. Tear down only what this attempt started, after evidence capture.

Do not repair failures in this default pass. Classify each failure as `SOURCE-WRONG`, `TEST-WRONG`, `TEST-NOT-OPTIMAL`, `ENVIRONMENT-BLOCKED`, or `AMBIGUOUS`, cite evidence, and route it to the owning caller. If visual evidence is applicable, record every missing/unread state × viewport artifact as a gate failure or blocker; runtime/screenshot observations belong to `experience-review`.

## Step 4 — Report and hand off

`PASS` requires all applicable shared-gate rows, exact runner success, fixed scope, and readable redacted evidence. Report `NOT-APPLICABLE`, `ENVIRONMENT-BLOCKED`, or `UNVERIFIED` with the evidence and next decision instead of converting an incomplete attempt into a pass. The opt-in `--fix-loop` mode owns repeats and fixes; this default pass returns its report and does not invoke a repair loop.

## Required output

Persist: fixed scope and applicability evidence · GWT/invariant records · profile owner/case/variant/carrier/evidence mapping or strict-default TC record · actual executor/assertion/result mapping · config and command evidence · gate-row verdicts · exact counts/exit status · runtime/visual artifact paths and read/redaction status · capture instrumentation and manifest completeness verdict with `reviewed/total` · failure classifications and owning routes · cleanup result · final verdict and next step.

<!-- FIX-LOOP-MODE:START -->

## Mode: Fix-Loop (`--fix-loop`)

> **Scope gate:** this section runs ONLY when the invocation carries `--fix-loop`. Without the flag NOTHING here applies — Steps 0–4, their report-only boundary, and every report-only caller behave exactly as documented above. It is the ONLY path through which this skill changes source, tests, fixtures, or configuration, and only through Step FL-4's `/debug-investigate` → `/fix` route.
>
> **Flag rules:** `--visual-review={true|false}` is resolved once, in Step FL-0.1, from an explicit value, the project contract, and the task request. There is no framework-wide screenshot default. Outside `--fix-loop`, an explicit `--visual-review` value is only caller-supplied applicability that Step 2 verifies; report-only callers (`/changes-review` Phase 3.9 and the `/workflow-review-changes` step-1 E2E route) invoke the default pass and NEVER pass `--fix-loop`. NEVER self-invoke with the flag: each round's pass is the default pass (Steps 0–4) run inline, never `/e2e-test-verify --fix-loop` — one loop, no nesting.

**Goal:** Drive a configured E2E suite or real-user journey to a truthful green result over a fixed scope. Resolve the project contract first, select an existing test or generate one in the project's declared format, bring up the whole system, use a visible browser for web human-QC when requested, inspect applicable runtime/visual evidence, adjudicate every failure, fix the owning layer, and re-run fresh until the declared scope converges or a bounded blocker is escalated.

**Mode summary:**

- **Main path:** resolve scope/contract → read config/reference → resolve readiness/auth/data/browser/evidence → select or generate tests → run and inspect → adjudicate/fix → rerun fresh → report or escalate.
- **Visual gate:** apply only when requested or required by the project contract on a visual surface; resolve `uiStateCapture.mode` from project config (default `declared-only`), capture the required state × viewport matrix, and add transitions only under opted-in, supported `every-action`; index and read every required capture case by case before synthesizing owner-routed findings (`.claude/skills/shared/ui-state-capture-protocol.md`). An explicit `false` cannot waive a project-required visual gate; preserve baselines.
- **Shared quality gate:** every fixed scope and round carries the project's scenario/invariant and gate-row record from `.claude/skills/shared/e2e-quality-protocol.md`; the default pass (Steps 0–4) is the report-only attempt inside each round, while this mode owns repeats, fixes, and integrity.

**Role in `workflow-e2e`:** This mode is the internal convergence engine, not a
second E2E workflow. `workflow-e2e` calls `/e2e-test-verify --fix-loop` after
source-specific authoring when a test must be written or updated, and calls it
directly when an existing test can be selected or a case must be generated from
the request. The mode owns the configured run, failure classification,
owning-layer repair, review, fresh bring-up, and same-scope reruns for every
source.

**Default scope:** the whole discovered E2E scope — every configured E2E project and linked observable surface. A named feature, bugfix, spec, test project, code change, or upstream authoring handoff narrows the scope only when it explicitly names or supplies that mapping. Scope is recorded once and never shrinks silently; an inherited `workflow-e2e` handoff is authoritative.

**Workflow:** resolve scope and Goal Contract → read project-config/reference → resolve startup/readiness/auth/data/browser/evidence → select or generate tests → run and inspect → adjudicate failures → fix/review/re-run → require fresh consecutive green runs → report or escalate.

**Visual review mode:** Enable screenshot review only when requested or required
by the project contract for an applicable visual surface. It changes each round
to `E2E run → capture the configured matrix, plus opted-in transitions where
supported → reconcile the capture manifest → open/read and judge every required
image case by case through /experience-review → synthesize clustered findings →
fix validated blocking UI defects at the owning layer → re-run the same E2E
scope`. With no request or project requirement, visual review is `N/A` for a
non-visual surface and is not inferred merely from the presence of a UI test.

**Key rules:**

- `e2eTesting.execution` is optional, but missing capability is never a guessed default. Link `surfaceIds[]` to `experienceVerification.surfaces[]`; the linked `localRun` owns startup/readiness/log/teardown.
- For browser/UI E2E or human-QC, use the configured visible runner when supported. Follow its native readiness/actionability and outcome waits, or an evidenced bounded project helper; action delays apply only when the project contract configures them. Keep real settle signals separate; a delay is never readiness.
- Use project-owned auth and data paths. Never copy credentials, storage state, cookies, tokens, or seed values into prompts/reports; never bypass the UI with direct datastore mutation.
- Reuse a suitable existing test and the project's declared locator/action organization, including helpers or objects when present. Generate through `/e2e-test` → `e2e-runner` only when coverage is missing or the current test does not protect the requested invariant; add an abstraction only when the configured project pattern or demonstrated reuse supports it, and keep helpers cohesive.
- A passing screen is not enough: runtime errors, uncaught exceptions, unhandled rejections, journey-critical failed requests, unread evidence, and baseline mismatches remain visible findings.
- When visual review is requested or required by the project contract, the configured screenshot matrix and image inspection are part of the E2E gate. Use `/experience-review --rounds=0` as the report-only visual adjudicator inside this mode; this mode owns UI fixes and the subsequent E2E rerun. A user-supplied false value cannot waive a project-required visual gate.
- MUST ATTENTION apply the shared E2E quality protocol to every round and carry its gate verdicts into the persisted report; keep each round's default pass report-only and route fixes through the owning layer.
- Never delete, skip, narrow, weaken, retry-wrap an assertion, silence logs, or auto-promote a baseline to obtain green.

**Why this mode exists:** E2E authoring, local bring-up, browser evidence, and
bounded failure repair otherwise live in separate skills. That separation makes
it easy to run only a changed test, skip the missing auth/data setup, call a
screen that looks correct despite a console error, or stop after one green run.
The default pass proves one attempt honestly but never repairs or repeats; this
mode is the single convergence contract used by `workflow-e2e`. It delegates
specialized authoring, experience, debug, fix, and review work without
becoming another user-facing workflow.

### Step FL-0 — Resolve visual mode, scope, and Goal Contract

Before any test command or edit:

1. Resolve `--visual-review=true|false` from an explicit value, the project contract, and the task request. There is no framework-wide visual default: use `true` only when requested or required for an applicable visual surface; otherwise use `false`/`N/A` as appropriate. An invalid value or conflict with a required project gate is a blocker, not permission to guess or waive it. Record the resolved mode before the first command.
2. Read the Step 0.1 document set (`docs/project-config.json`, `docs/project-reference/docs-index-reference.md`, `docs/project-reference/lessons.md`, `docs/project-reference/e2e-test-reference.md`, `.claude/skills/shared/e2e-quality-protocol.md`) and the relevant feature/spec/code contract.
3. Resolve `{scope}`:

   | Prompt/context | Fixed scope |
   | --- | --- |
   | No target named | Every configured E2E project and every linked applicable observable surface |
   | Feature/bugfix/journey named | Tests and surfaces covering that behavior, with the mapping cited |
   | Spec/test project named | The configured project and any required linked surface |
   | Code diff/branch named | The E2E projects/surfaces affected by that explicit change set |

4. Record the scope as a stable list. If no runnable E2E framework exists, record `N/A — <config and scan evidence>` and do not substitute a generic browser runner. If a relevant surface exists but cannot run or be inspected, record `ENVIRONMENT-BLOCKED — <missing capability and evidence>`.
5. When visual review is requested or required by the project contract, verify that every applicable surface has a configured screenshot matrix, evidence root, and image-inspection path; a missing required capability is `ENVIRONMENT-BLOCKED`.
6. Create a Goal Contract whose required criterion is:

   > A fresh full E2E verification over the fixed scope reports zero failed scenarios across the configured consecutive-green requirement (default 2), with exact runner output, no scope shrink, no test deletion/skip/weakening, and no automatic baseline acceptance.

7. Record the round cap (default 3), expected consecutive-green count, the
   visual mode, screenshot matrix, and the executed/skipped scenario counts
   after the first run.

### Step FL-1 — Resolve the project execution contract

Read `e2eTesting` and, when present, `e2eTesting.execution` before selecting a
runner. Resolve each row and cite the source:

| Area | Required record | Block condition |
| --- | --- | --- |
| Framework/project | config file, test root, declared helper/object organization (if any), fixture root, full and focused command | No runnable framework/command → `N/A` or `ENVIRONMENT-BLOCKED` |
| Surface/lifecycle | `surfaceIds[]` → `experienceVerification.surfaces[]` → `localRun` dependency/start/ready/log/teardown | Missing recipe or readiness signal → blocked |
| Auth | fixture/storage-state/registration/manual/none, reference only | Missing required account or safe path → blocked |
| Data | seed command, project-relative working directory, reference/idempotent/additive mode, cleanup policy | Missing or destructive/shared reset path → blocked |
| Browser | configured runner/engine, headed/visible setting, viewport/device/locale/network | Web human-QC without visible/configured path → blocked |
| Evidence | root, screenshot/console/request/trace/video kinds, redaction policy | Unredacted or unread evidence → not verified; visual mode also requires an inspected screenshot matrix |
| Convergence | max attempts, consecutive-green requirement, settle timeout | Missing cap → use documented bounded default; never loop indefinitely |

Discovery order for a partial profile is: linked `localRun`, E2E reference and
runner config, package/task/compose/CI scripts, fixture/seed/auth docs, then a
bounded repository scan. Preserve known values and cite every derived value.
Never invent a port, account, selector, dependency install, command, or
storage-state value.

### Step FL-2 — Build the scenario and choose generate-or-use

Read `.claude/skills/shared/e2e-quality-protocol.md`, resolve `specArtifacts`, and create its GWT + invariant + owner/case/variant/evidence record before selecting or generating a test. Use strict TC/§8 only when no native profile applies; a malformed profile blocks.

For each requested behavior, persist the Step 1 record before execution and extend it with the wait and settle lines this mode drives:

```text
WAIT_UNTIL <bounded positive/negative condition before and after each meaningful action>
SETTLE <observable readiness/state signal after each meaningful action>
```

Search at least three comparable tests and inspect the declared local organization when available. If a suitable test covers the same invariant and scope, select it and do not generate a duplicate. If no suitable test exists, invoke `/e2e-test` and the `e2e-runner` specialist to follow the configured project pattern, keeping one owner per selector/action/wait and extracting helpers or objects only when required by that pattern or demonstrated reuse. A coverage gap feeds both the owner/intent record and test; never patch only the test to hide a missing rule.

### Step FL-3 — Bring up and exercise the whole system

For every `APPLICABLE` surface, in order:

1. Start only project-declared backing services through `localRun` or cited repository commands.
2. Run migrations/seed through supported project paths. Use unique run data, count-before-create/reference data, idempotent or additive setup, and current-run-only cleanup after evidence capture.
3. Start the surface and poll its declared readiness signal. A started process, open port, or fixed sleep is not readiness.
4. Attach server logs and browser console/page-error/request capture before the first interaction.
5. For web, open the configured browser visibly when human-QC is requested. Use semantic/accessible actions and stable locators. Follow the configured runner's native wait strategy or an evidenced bounded project helper for readiness/actionability and expected positive/negative outcomes, including applicable error states. Apply action delay only when the project contract configures it, and observe any real settle signal separately.
6. Drive the scenario through the real interface using the project's declared test format. Capture trace/video/console/request evidence when configured. When visual review is requested or required, capture each project-declared matrix state and viewport, store evidence under the configured root, open/read every required image, record observations, and redact sensitive content.
6a. **Transition capture (visual mode, per the resolved `uiStateCapture.mode`).** Under `declared-only` (the default), capture the matrix and record relevant state-changing actions as transition coverage gaps; under `off`, record transition coverage once as `N/A — uiStateCapture off: {reason}`; the item 6 matrix remains in every mode. Under `every-action` (opt-in), capture transitions only through a source-verified project boundary, after the configured runner observes the expected postcondition and any project-configured pacing. These captures are additive to the matrix. Write manifest rows using the configured owner/case identity and evidence path; include the evidence needed to connect captures to expected outcomes. If the project has no supported boundary, report that limitation instead of inventing one or forcing an object model.
7. Tear down only processes/services started by this run. Preserve accepted baselines and record candidate evidence separately.

If any precondition fails, preserve the logs and classify the branch
`ENVIRONMENT-BLOCKED`; do not disable auth, stub a dependency, skip a state, or
claim a pass.

### Step FL-4 — Run a bounded convergence round

Each round is a fresh full verification over the exact recorded scope:

1. Snapshot scope, test/scenario IDs, executed/passed/failed/skipped counts, and the working tree.
2. Run the default pass (Steps 0–4) INLINE, WITHOUT `--fix-loop`, over the fixed scope against the system brought up in Step FL-3, supplying the recorded scope and the resolved visual mode as its visual applicability. It runs the configured full command for the fixed scope; a focused command is only in addition to, never instead of, the declared full scope. Record command, exit status, counts, failing names, run identity, data mode, and evidence paths from its report.
3. Invoke `/experience-review --rounds=0` report-only for configured observable surfaces. It may classify evidence and runtime/UI findings but must not fix, update baselines, or change expectations inside this mode.
4. When visual review is requested or required by the project contract for an applicable visual surface, make the experience-review result a required visual gate. Every required capture — matrix state and any configured transition — must be opened, read, and recorded individually before synthesis; reconcile the per-case records against the manifest and report `reviewed/total`, because a manifest row with no record is `UNVERIFIED`, never a clean result. Add validated `BLOCKING` findings — `UIX-BROKEN`, `UIX-UNSTYLED`, `UIX-OVERFLOW`, `UIX-OVERLAP`, `UIX-STATE` (the action produced no change where `expected_delta` required one), blocking `UIX-LAYOUT`/`UIX-CONVENTION`/`UIX-FLOW`, accessibility-floor violations, and `P0`–`P2` `CL-*` findings — to the round's failure set. Cluster a defect repeating across captures into ONE finding owned by the affected UI component or the project's declared locator/action/helper owner; fix it once at that owner instead of once per capture or page. Record `UIX-POLISH`/`DD-*` identity, polish, or non-contract spacing preferences without reopening the loop unless the governing design/acceptance contract makes the issue objectively required.
4a. Carry the synthesis into the round record: capture coverage (`reviewed/total`, uncaptured state-changing actions — or the single `N/A — uiStateCapture off: {reason}` record when `uiStateCapture.mode` is `off` — caps or sampling hit), sequence-level findings visible only across captures (no feedback between an action and its result, layout shift between steps, the same component rendered inconsistently across surfaces, convention drift accumulating through the flow), and the owning layer for each cluster.
5. If green, compare counts and visual-blocker totals to the previous round. Require the configured consecutive-green runs without a reset; each must be fresh, same-scope, and, in visual mode, have fresh screenshots that were opened/read.
6. If anything fails, record a provisional verdict before editing, using the Step 3 taxonomy:

   - `SOURCE-WRONG` — production behavior violates the governing intent/spec.
   - `TEST-WRONG` — assertion/setup contradicts the governing intent.
   - `TEST-NOT-OPTIMAL` — valid test, but brittle/low-signal setup or selector needs repair without weakening the invariant.
   - `ENVIRONMENT-BLOCKED` — startup/auth/data/browser/evidence capability prevented a verdict.
   - `AMBIGUOUS` — evidence cannot distinguish the owner; stop and ask the owner.

7. For non-blocked failures, invoke `/debug-investigate` inline and trace end-to-start from the observed failure or screenshot to the invariant-owning layer. Then invoke `/fix` at that owning layer (`--target=ui` for a validated visual/layout/responsiveness defect). Preserve the assertion and screenshot evidence that exposed the failure.
8. If the round changed files, invoke `/changes-review` inline, report-only, over the round’s fix diff. Resolve validated blocking findings before re-running. If no files changed, record the skip reason.
9. Run the Round Integrity Check: executed count must not decrease, skipped count must not increase, fixed scope must not narrow, runtime logs must not be hidden, screenshot states/viewports must not be removed, capture triggers must not be unwired and caps must not be tightened to shrink the capture set, and evidence collection must not be disabled.
10. Restart from a fresh bring-up/exercise and run the same configured E2E command again. A green run or clean screenshot before the fix does not count.

### Step FL-5 — Stop, escalate, and report honestly

Stop immediately on `ENVIRONMENT-BLOCKED`, `AMBIGUOUS`, missing secure auth,
unredacted or unread evidence, missing visual screenshots/inspection in visual
mode, a non-shrinking failure or visual-blocker count across two rounds, rising
failures, a cap hit with failures open, scope shrink, test loss, a hidden log,
or an unaccepted baseline mismatch. Report the exact blocker and next human
decision; never convert it to a partial pass.

Convergence requires all of: fixed scope, exact runner output, zero failed
scenarios, required consecutive fresh green runs, Round Integrity Check pass,
and no open runtime-error/evidence/security finding. When visual review is
enabled, the same fresh runs must also contain zero validated `BLOCKING` visual
findings; visual `ADVISORY` findings remain visible in the handoff. `HUMAN-ACCEPTED`
remains distinct from `AGENT-RECOMMENDED-ACCEPT`; current evidence never
promotes a baseline automatically.

**Fix-loop required output** — persist, in addition to each round's default-pass report:

- fixed scope and how it was resolved;
- resolved `--visual-review` mode, screenshot state × viewport matrix, transition-capture trigger set, manifest path and row count, `reviewed/total` reconciliation, capture coverage gaps, and the per-case plus synthesized image-inspection result;
- Goal Contract and Given/When/Then + invariant records;
- config/reference evidence for framework, lifecycle, auth, data, browser, evidence, and convergence;
- existing-test reuse or generated test files and owner/case/variant-to-test/assertion/result coverage; strict TC coverage only when no native profile applies;
- every command, run identity, exact Passed/Failed/Skipped counts, exit status, and fresh repeat evidence;
- runtime/visual evidence paths and redaction/read status;
- each failure’s single fault verdict, debug/fix/review references, and owning layer;
- Round Integrity Check results and final `CONVERGED`, `N/A`, `ENVIRONMENT-BLOCKED`, `NOT-CONVERGED`, or `ACCEPTANCE-PENDING` status.

### Fix-Loop Anti-Rationalization

| Temptation | Required response |
| --- | --- |
| Run only changed E2E files | Resolve and record the whole configured scope unless the prompt explicitly narrows it. |
| Generate a new test because it is convenient | Reuse a suitable existing invariant-protecting test and report the mapping. |
| Use a sleep because the page is slow | Use the configured runner's native wait strategy or an evidenced bounded project helper for readiness/actionability and expected postconditions; add action pacing only when the project contract configures it. |
| Treat a passing E2E command as a visual pass | In visual mode, capture and open/read every capture the resolved `uiStateCapture.mode` requires (matrix AND transition captures under `every-action`) and adjudicate each through `/experience-review`; a test pass does not erase a visual blocker. |
| Summarize the captures instead of reviewing them | Record ONE per-case entry per manifest row before synthesizing. A synthesis with no per-case records is a summary of memory, and `reviewed/total` will expose it. |
| Report the same broken shared component once per page | Cluster it into one finding owned by the component and fix it at that layer; N page-level duplicates hide the single real cause. |
| Cap or dedupe away a noisy capture set to finish faster | Caps and dedupe are bounded and recorded — an escalation names the untaken captures. Failure captures are never deduped or capped. |
| Loop forever on spacing taste | Loop only on validated objective `BLOCKING` visual defects; record `ADVISORY` polish and identity findings without reopening the E2E gate. |
| Copy a seeded password/storage state into the prompt | Use a configured reference and redact evidence; otherwise block. |
| Update a snapshot because the new output looks right | Preserve the old expectation and request explicit human acceptance. |
| Skip a failing environment or hide a console error | Record `ENVIRONMENT-BLOCKED` or a blocking runtime defect. |
| Fix the assertion first | Adjudicate and trace to the owner; keep the protected invariant intact. |
| Re-invoke `/e2e-test-verify --fix-loop` for the next round | Run the default pass inline; one loop owns the round budget, and a nested loop resets it. |

**Final reminder:** A green E2E result is meaningful only when the same declared
scope was exercised through the real interface, with exact output and readable
evidence, after every fix was adjudicated, reviewed, and re-run fresh.

**IMPORTANT MANDATORY fix-loop sequence:** Step FL-0 (visual mode + scope + Goal Contract) → Step FL-1 (project execution contract) → Step FL-2 (scenario + generate-or-use) → Step FL-3 (whole-system bring-up + exercise) → Step FL-4 (round: default pass inline → experience/visual gate → verdict → debug → fix → review → integrity → fresh rerun) → Step FL-5 (converge / escalate / report).

<!-- FIX-LOOP-MODE:END -->

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `e2e-visual-design-contract` — Evidence and baseline rules for visual review in E2E and human QC; handling visual-review evidence or visual baseline updates → .claude/skills/shared/protocols/e2e-visual-design-contract.md
- `environment-fault-hypothesis` — Weigh the environment as a competing cause, with a named discriminator; judging a bug report, failing test, error or unexpected output → .claude/skills/shared/protocols/environment-fault-hypothesis.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:e2e-visual-design-contract:reminder -->

**MUST ATTENTION** visual E2E/QC resolves the project design authority first, applies project design-system and frontend decisions plus applicable `UI-*`/`DD-*`/`CL-*` roles, records component ownership using the project's taxonomy or observed boundaries, sends static source findings to `/ui-review` and runtime image evidence to `/experience-review`, captures states and transitions required by the configured evidence contract, reloads the convention docs then reads and records each required capture before synthesizing findings with coverage gaps, treats `UIX`/UI/accessibility-floor findings as blocking and `UIX-POLISH`/DD identity as advisory, never invents measurements, and never auto-promotes baselines; non-visual runs state `N/A`.

<!-- /SYNC:e2e-visual-design-contract:reminder -->

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

**IMPORTANT MUST ATTENTION Goal:** Verify an existing configured E2E/browser/user-flow scope once without changing it, returning exact execution evidence and an honest quality-gate verdict that a convergence owner can safely consume.

**IMPORTANT MUST ATTENTION** read the project contract and shared E2E quality protocol first; resolve `specArtifacts`, preserve the fixed scope, and use native owner/case/variant/evidence or strict-default TC traceability.

**IMPORTANT MUST ATTENTION** map selected cases to actual executors, intent-bearing assertions, and observed results; apply every gate row, read exact evidence, and use `PASS`, `NOT-APPLICABLE`, `ENVIRONMENT-BLOCKED`, or `UNVERIFIED` honestly.

**IMPORTANT MUST ATTENTION** the default pass is report-only; route repairs to the owning skill and never weaken tests, hide evidence, reset shared data, or promote baselines.

<!-- FIX-LOOP-MODE:START -->

**IMPORTANT MUST ATTENTION `--fix-loop` (OPTIONAL mode — only when the flag is passed):** drive a configured E2E suite or real-user journey to a truthful green result over a fixed scope. Resolve the project contract first, select an existing test or generate a traceable Given/When/Then test, bring up the whole system, use a visible browser for web human-QC, inspect runtime/visual evidence, adjudicate every failure, fix the owning layer, and re-run fresh until the declared scope converges (configured consecutive fresh green runs, default 2, within the round cap, default 3) or a bounded blocker is escalated. Each round runs the default pass INLINE — NEVER `/e2e-test-verify --fix-loop` — and report-only callers NEVER pass the flag.

**IMPORTANT MUST ATTENTION** in `--fix-loop`, resolve `--visual-review=true|false` from an explicit value, the task request, and the project contract before the first command; there is no framework-wide screenshot default. When requested or required on an applicable visual surface, capture per the resolved `uiStateCapture.mode` (default `declared-only`: required state × viewport matrix; transitions only under explicitly selected, supported `every-action`) into the configured evidence index → have `/experience-review --rounds=0` read and record every required capture case by case, then synthesize clustered owner-routed findings and coverage gaps → fix validated blocking UI defects once at the owning layer → rerun the same E2E scope until the visual blocker count and E2E failure count converge to zero. A false value cannot waive a project-required gate; a required evidence row with no per-case record is `UNVERIFIED`, not clean.

**IMPORTANT MUST ATTENTION** in `--fix-loop`, use the configured runner's native waits or an evidenced bounded project helper for applicable readiness and postconditions; **apply action delays only when the project contract configures them**. Never shrink scope, weaken assertions, hide evidence, or promote baselines automatically.

**IMPORTANT MUST ATTENTION** in `--fix-loop`, read and reapply `.claude/skills/shared/e2e-quality-protocol.md` for every round; preserve its GWT/invariant, gate-row, evidence, auth/data, cleanup, and test-to-spec records while this mode owns only convergence and owning-layer repair.

<!-- FIX-LOOP-MODE:END -->
