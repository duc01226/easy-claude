---
name: e2e-test-verify
description: '[Testing] Use when verifying an existing E2E, browser, or user-flow test scope with exact runner output, evidence, and report-only quality-gate results. Flags: --fix-loop drives a configured suite or human-QC journey to green with project-config setup, fault adjudication, and bounded re-verification; --visual-review={true|false} (with --fix-loop; default true, false opts out of the screenshot visual gate).'
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
## Codex Project-Reference Loading (Hook-Independent)

Claude and Codex use static project-reference loading as the authority; hooks may accelerate discovery but never replace the explicit read.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**
- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$ai-context-refresh`) before ordinary project-specific work. A full `$sync-codex` run preflights `CLAUDE.md`; a completed `$ai-context-refresh` run may invoke the standalone runner with `--skip=claude-md` after final source edits. Markerless roots need AI smart-merge unless `portability.requireUniversalGuides: false` is explicit.

**Situation-based docs:**
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
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

> **[BLOCKING]** Execute the steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking; set `completed` only with evidence or an explicit skip reason.
> **[BLOCKING]** The default pass is report-only: it may write its report, but it does not edit source, tests, fixtures, baselines, generated output, or user data. Only the opt-in `--fix-loop` mode lands repairs, and only through its owning-layer fix step.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **E2E Quality Protocol** — the shared gate covers intent, stable object ownership, isolated data, auth/permissions, applicable accessibility/responsive/visual checks, bounded waits, readable failure artifacts, cleanup, and test-to-spec traceability.
> **MUST ATTENTION READ** `.claude/skills/shared/e2e-quality-protocol.md` before verification; `NOT-APPLICABLE` requires no executable surface, while a relevant missing capability is `ENVIRONMENT-BLOCKED`.

## Quick Summary

**Goal:** Verify an existing configured E2E/browser/user-flow scope once without changing it, returning exact execution evidence and an honest quality-gate verdict that a convergence owner can safely consume.

**Summary:**

- **Contract first:** resolve the fixed scope, project runner, lifecycle, auth, data, browser, evidence, and expected GWT/invariant/TC record from project evidence.
- **Report-only gate:** inspect test/page-object quality, execute the configured scope when runnable, capture exact results and readable artifacts, and apply the shared E2E quality protocol.
- **Honest handoff:** return `PASS`, `NOT-APPLICABLE`, `ENVIRONMENT-BLOCKED`, or `UNVERIFIED`; never repair, weaken, skip, narrow, delete, reset, or baseline-promote.
<!-- FIX-LOOP-MODE:START -->
- **OPTIONAL `--fix-loop` MODE (opt-in; absent flag = everything above unchanged)** — drives a configured E2E suite or human-QC journey to a truthful green result over a fixed scope: resolve `--visual-review` (default `true`; explicit `false` opts out), scope, and Goal Contract → resolve the project execution contract → select or generate a traceable Given/When/Then test → bring up the whole system → per round { run the DEFAULT pass inline (never with the flag) → `$experience-review --rounds=0` visual gate → five-way verdict → `$debug-investigate` → `$fix` at the owning layer → `$changes-review` → Round Integrity Check → fresh same-scope rerun } → converge on the configured consecutive fresh green runs (default 2) within the round cap (default 3), or escalate. It is the convergence engine `workflow-e2e` calls; report-only callers NEVER pass it. Full protocol: **Mode: Fix-Loop** section.
<!-- FIX-LOOP-MODE:END -->

**Workflow:**

1. **Resolve** — fix scope, read config/reference/spec intent, and create the report.
2. **Model** — record Given/When/Then, invariant, TC, object ownership, auth, data, and the applicable visual matrix plus transition-capture instrumentation.
3. **Inspect** — review existing tests/page objects and apply every shared quality-gate row.
4. **Verify** — attach evidence before interaction, run the configured command once, and persist exact output.
5. **Report** — classify the result and hand findings to the `--fix-loop`/review/experience owner.

**Key Rules:**

- MUST ATTENTION read `docs/project-config.json`, `docs/project-reference/e2e-test-reference.md`, the relevant intent/spec, and the shared protocol before the first verification command.
- MUST ATTENTION use the configured project command and fixed scope; never infer a framework, selector, credential, data path, or generic browser substitute.
- MUST ATTENTION apply the GWT + invariant contract and every applicable shared gate row; a test command passing alone is not a quality pass.
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
INVARIANT <Feature Spec/acceptance criterion/source contract>
TC <existing traceable test-case identifier or explicit proposal>
```

Resolve configured full/focused commands, zero-match behavior, run identity, isolation, auth reference, data policy, browser/viewport matrix, evidence root/redaction, and cleanup. Search for three comparable tests/page-object patterns when the project has them; cite the reuse or mismatch decision.

## Step 2 — Inspect the existing artifacts and shared gate

Read the selected test and its Common → Domain-Shared → Page objects. Confirm that locators/actions have one owner, the `THEN` outcome assertion remains in the test, the GWT record names the protected invariant, and applicable auth, fixture/data, async/wait, evidence, cleanup, visual/accessibility/responsive, and spec-traceability rows from the shared protocol have a verdict and evidence.

For browser actions, verify the reusable bounded `waitUntil(condition, options)` precondition and postcondition/error-state waits, followed by the exact 500ms presentation delay where applicable. Verify that evidence capture attaches before interaction and that visual artifacts are opened/read rather than merely generated.

For a UI surface under visual review, also verify the capture contract report-only (`.claude/skills/shared/ui-state-capture-protocol.md`) for the resolved `uiStateCapture.mode`. Under `every-action`: the capture call lives in the shared action primitives rather than sprinkled through test bodies; it fires after the postcondition wait and the 500ms pacing; the declared triggers cover the journey's UI-state-changing actions; `capture-manifest.json` exists with one row per capture including deduped and capped rows; failure captures are exempt from dedupe and caps; and every row was actually read. Under `declared-only`, verify the matrix rows, manifest, and reads only, and record every state-changing action as an uncaptured-transition blind spot — never a FAIL and never an implicit pass. Under `off`, verify the matrix rows, manifest, and reads exactly as under `declared-only`, and record transition coverage once as `N/A — uiStateCapture off: {reason}` instead of per-action blind spots; `off` never waives or weakens the visual gate, and a missing matrix capture still fails it. Report an uninstrumented suite under `every-action`, an unindexed capture, or an unread image as a gate failure routed to `e2e-test`; never instrument, capture, or repair from this skill.

## Step 3 — Run one report-only verification attempt

When `APPLICABLE`, run the configured full command for the fixed scope. Use a focused command only as additional evidence, never as a replacement for the declared full scope. Record the exact command, start/end, exit status, Passed/Failed/Skipped counts, names, run identity, data mode, and artifact paths. Tear down only what this attempt started, after evidence capture.

Do not repair failures in this default pass. Classify each failure as `SOURCE-WRONG`, `TEST-WRONG`, `TEST-NOT-OPTIMAL`, `ENVIRONMENT-BLOCKED`, or `AMBIGUOUS`, cite evidence, and route it to the owning caller. If visual evidence is applicable, record every missing/unread state × viewport artifact as a gate failure or blocker; runtime/screenshot observations belong to `experience-review`.

## Step 4 — Report and hand off

`PASS` requires all applicable shared-gate rows, exact runner success, fixed scope, and readable redacted evidence. Report `NOT-APPLICABLE`, `ENVIRONMENT-BLOCKED`, or `UNVERIFIED` with the evidence and next decision instead of converting an incomplete attempt into a pass. The opt-in `--fix-loop` mode owns repeats and fixes; this default pass returns its report and does not invoke a repair loop.

## Required output

Persist: fixed scope and applicability evidence · GWT/invariant/TC records · config and command evidence · gate-row verdicts · exact counts/exit status · runtime/visual artifact paths and read/redaction status · capture instrumentation and manifest completeness verdict with `reviewed/total` · failure classifications and owning routes · cleanup result · final verdict and next step.

<!-- FIX-LOOP-MODE:START -->

## Mode: Fix-Loop (`--fix-loop`)

> **Scope gate:** this section runs ONLY when the invocation carries `--fix-loop`. Without the flag NOTHING here applies — Steps 0–4, their report-only boundary, and every report-only caller behave exactly as documented above. It is the ONLY path through which this skill changes source, tests, fixtures, or configuration, and only through Step FL-4's `$debug-investigate` → `$fix` route.
>
> **Flag rules:** `--visual-review={true|false}` is defined once, in Step FL-0.1. Outside `--fix-loop`, an explicit `--visual-review` value is only the caller-supplied visual applicability that Step 2 verifies; the `true` default applies only inside this mode. Report-only callers (`$changes-review` Phase 3.9 and the `$workflow-review-changes` step-1 E2E route) invoke the default pass and NEVER pass `--fix-loop`. NEVER self-invoke with the flag: each round's pass is the default pass (Steps 0–4) run inline, never `$e2e-test-verify --fix-loop` — one loop, no nesting.

**Goal:** Drive a configured E2E suite or real-user journey to a truthful green result over a fixed scope. Resolve the project contract first, select an existing test or generate a traceable Given/When/Then test, bring up the whole system, use a visible browser for web human-QC, inspect runtime/visual evidence, adjudicate every failure, fix the owning layer, and re-run fresh until the declared scope converges or a bounded blocker is escalated.

**Mode summary:**

- **Main path:** resolve scope/contract → read config/reference → resolve readiness/auth/data/browser/evidence → select or generate tests → run and inspect → adjudicate/fix → rerun fresh → report or escalate.
- **Visual gate:** default `--visual-review=true`; capture per the resolved `uiStateCapture.mode` (default `every-action`: every UI-state-changing transition plus the declared state × viewport matrix; `declared-only` records transitions as blind spots; `off` keeps the matrix and records transition coverage as `N/A`), index them in `capture-manifest.json`, and have `$experience-review --rounds=0` read and record EVERY capture case by case before synthesizing clustered, owner-routed findings (`.claude/skills/shared/ui-state-capture-protocol.md`); explicit `--visual-review=false` opts out; preserve baselines.
- **Shared quality gate:** every fixed scope and round carries the canonical GWT/invariant and gate-row record from `.claude/skills/shared/e2e-quality-protocol.md`; the default pass (Steps 0–4) is the report-only attempt inside each round, while this mode owns repeats, fixes, and integrity.

**Role in `workflow-e2e`:** This mode is the internal convergence engine, not a
second E2E workflow. `workflow-e2e` calls `$e2e-test-verify --fix-loop` after
source-specific authoring when a test must be written or updated, and calls it
directly when an existing test can be selected or a case must be generated from
the request. The mode owns the configured run, failure classification,
owning-layer repair, review, fresh bring-up, and same-scope reruns for every
source.

**Default scope:** the whole discovered E2E scope — every configured E2E project and linked observable surface. A named feature, bugfix, spec, test project, code change, or upstream authoring handoff narrows the scope only when it explicitly names or supplies that mapping. Scope is recorded once and never shrinks silently; an inherited `workflow-e2e` handoff is authoritative.

**Workflow:** resolve scope and Goal Contract → read project-config/reference → resolve startup/readiness/auth/data/browser/evidence → select or generate tests → run and inspect → adjudicate failures → fix/review/re-run → require fresh consecutive green runs → report or escalate.

**Visual review mode:** Visual screenshot review is enabled by default,
equivalent to `--visual-review=true`. It changes each round to `E2E run →
capture per `uiStateCapture.mode` (default `every-action`: every UI-state-changing
transition plus the declared matrix) →
reconcile the capture manifest → open/read and judge every image case by case
through $experience-review → synthesize clustered findings → fix blocking UI
defects at the owning layer → re-run the same E2E scope`. An explicit
`--visual-review=false` preserves the non-visual E2E loop; a UI surface is not
required to infer the default.

**Key rules:**

- `e2eTesting.execution` is optional, but missing capability is never a guessed default. Link `surfaceIds[]` to `experienceVerification.surfaces[]`; the linked `localRun` owns startup/readiness/log/teardown.
- For browser/UI E2E or human-QC, use the configured visible Playwright CLI path when supported. Before every UI-control operation, use one reusable bounded `waitUntil(condition, options)` helper for readiness/actionability and applicable error-alert absence; after it, use the helper for the expected positive/negative outcome or error-alert state, then wait exactly **500ms** as presentation pacing. Keep real settle signals separate; the delay is never readiness and cannot be disabled by configuration.
- Use project-owned auth and data paths. Never copy credentials, storage state, cookies, tokens, or seed values into prompts/reports; never bypass the UI with direct datastore mutation.
- Reuse a suitable existing test and its reusable Common/Domain-Shared/Page objects. Generate through `$e2e-test` → `e2e-runner` only when coverage is missing or the current test does not protect the requested invariant; generated objects must use the project's idiomatic abstract base and cohesive helpers/utilities.
- A passing screen is not enough: runtime errors, uncaught exceptions, unhandled rejections, journey-critical failed requests, unread evidence, and baseline mismatches remain visible findings.
- When visual review is enabled (the default or explicit `--visual-review=true`), the screenshot matrix and image inspection are a required part of the E2E gate. Use `$experience-review --rounds=0` as the report-only visual adjudicator inside this mode; this mode owns UI fixes and the subsequent E2E rerun. `--visual-review=false` is the explicit opt-out.
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

1. Resolve `--visual-review=true|false`. The default is `true`; an invalid or ambiguous value is a blocker, not permission to guess. Record the resolved mode before the first command. Only an explicit `--visual-review=false` opts out.
2. Read the Step 0.1 document set (`docs/project-config.json`, `docs/project-reference/docs-index-reference.md`, `docs/project-reference/lessons.md`, `docs/project-reference/e2e-test-reference.md`, `.claude/skills/shared/e2e-quality-protocol.md`) and the relevant feature/spec/code contract.
3. Resolve `{scope}`:

   | Prompt/context | Fixed scope |
   | --- | --- |
   | No target named | Every configured E2E project and every linked applicable observable surface |
   | Feature/bugfix/journey named | Tests and surfaces covering that behavior, with the mapping cited |
   | Spec/test project named | The configured project and any required linked surface |
   | Code diff/branch named | The E2E projects/surfaces affected by that explicit change set |

4. Record the scope as a stable list. If no runnable E2E framework exists, record `N/A — <config and scan evidence>` and do not substitute a generic browser runner. If a relevant surface exists but cannot run or be inspected, record `ENVIRONMENT-BLOCKED — <missing capability and evidence>`.
5. When visual mode is enabled (the default unless explicitly false), add the required capability that every applicable visual surface has a configured screenshot matrix, an evidence root, and an image-inspection path; missing capability is `ENVIRONMENT-BLOCKED`.
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
| Framework/project | config file, test root, page-object/fixture root, full and focused command | No runnable framework/command → `N/A` or `ENVIRONMENT-BLOCKED` |
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

Read `.claude/skills/shared/e2e-quality-protocol.md` and create its GWT + invariant + TC record before selecting or generating a test; the detailed cross-skill gate is canonical there.

For each requested behavior, persist the Step 1 record before execution and extend it with the wait and settle lines this mode drives:

```text
WAIT_UNTIL <bounded positive/negative condition before and after each meaningful action>
SETTLE <observable readiness/state signal after each meaningful action>
```

Search for at least three comparable existing E2E tests/page objects when the
project has them, including Common, Domain-Shared, and Page tiers where they
exist. If a suitable test covers the same invariant and scope, select it and do
not generate a duplicate. If no suitable test exists, invoke `$e2e-test` and
the `e2e-runner` specialist to generate a tiered Page/Component Object Model in
the project’s local convention, with one canonical owner per selector/action/
wait and reusable lower-tier contracts tested once. A coverage gap feeds both
the spec/intent record and the test; never patch only the test to hide a
missing rule.

### Step FL-3 — Bring up and exercise the whole system

For every `APPLICABLE` surface, in order:

1. Start only project-declared backing services through `localRun` or cited repository commands.
2. Run migrations/seed through supported project paths. Use unique run data, count-before-create/reference data, idempotent or additive setup, and current-run-only cleanup after evidence capture.
3. Start the surface and poll its declared readiness signal. A started process, open port, or fixed sleep is not readiness.
4. Attach server logs and browser console/page-error/request capture before the first interaction.
5. For web, open the configured browser visibly when human-QC is requested. Use semantic/accessible actions and stable locators. Before every UI-control operation, call the reusable bounded `waitUntil(condition, options)` helper for readiness/actionability and applicable blocking error-alert absence; after the operation, call it for the expected positive/negative outcome, including dropdown/options and expected error-alert present/absent states; then wait exactly **500ms**. Observe any real settle signal separately.
6. Drive the Given/When/Then path through the real interface. Capture screenshots for relevant states and trace/video/console/requests when configured; when visual review is enabled (the default unless explicitly false), capture every matrix state at every matrix viewport, including loading, empty, error, permission, and post-submit states plus a full-page capture where the surface scrolls. Store captures under the configured evidence root, open/read every image, record the visual observation, and redact sensitive content.
6a. **Transition capture (visual mode, per the resolved `uiStateCapture.mode`).** Under `declared-only`, list each state-changing action as an uncaptured transition (a recorded blind spot); under `off`, record transition coverage once as `N/A — uiStateCapture off: {reason}`; the item 6 matrix is captured in every mode. Under `every-action` (the default), the action-layer helper emits one capture after each UI-state-changing action's `waitUntil` postcondition and 500ms pacing — navigation, activation, selection, toggle, tab/step, overlay open and close, filter/sort/paginate, direct manipulation, mode/theme/role switch, async boundary resolution, feedback, session change. These are ADDITIVE to the matrix, not a replacement. Write one `capture-manifest.json` row per capture including deduped and capped rows, with `expected_delta` and `console_since_last` so a reviewer can judge "this action changed nothing" and attribute a runtime error to the transition that caused it. If the project's tests are not instrumented, record it as a capture-coverage gap and route the instrumentation to `$e2e-test`; do not hand-sprinkle screenshots into test bodies inside this mode.
7. Tear down only processes/services started by this run. Preserve accepted baselines and record candidate evidence separately.

If any precondition fails, preserve the logs and classify the branch
`ENVIRONMENT-BLOCKED`; do not disable auth, stub a dependency, skip a state, or
claim a pass.

### Step FL-4 — Run a bounded convergence round

Each round is a fresh full verification over the exact recorded scope:

1. Snapshot scope, test/scenario IDs, executed/passed/failed/skipped counts, and the working tree.
2. Run the default pass (Steps 0–4) INLINE, WITHOUT `--fix-loop`, over the fixed scope against the system brought up in Step FL-3, supplying the recorded scope and the resolved visual mode as its visual applicability. It runs the configured full command for the fixed scope; a focused command is only in addition to, never instead of, the declared full scope. Record command, exit status, counts, failing names, run identity, data mode, and evidence paths from its report.
3. Invoke `$experience-review --rounds=0` report-only for configured observable surfaces. It may classify evidence and runtime/UI findings but must not fix, update baselines, or change expectations inside this mode.
4. When visual review is enabled (the default unless explicitly false), make the experience-review result a required visual gate. Every capture — matrix state and transition alike — must be opened, read, and recorded individually before synthesis; reconcile the per-case records against the manifest and report `reviewed/total`, because a manifest row with no record is `UNVERIFIED`, never a clean result. Add validated `BLOCKING` findings — `UIX-BROKEN`, `UIX-UNSTYLED`, `UIX-OVERFLOW`, `UIX-OVERLAP`, `UIX-STATE` (the action produced no change where `expected_delta` required one), blocking `UIX-LAYOUT`/`UIX-CONVENTION`/`UIX-FLOW`, accessibility-floor violations, and `P0`–`P2` `CL-*` findings — to the round's failure set. Cluster a defect repeating across captures into ONE finding owned by its `Common`/`Domain-Shared`/`Page` component so the round fixes it once at the owning layer instead of N times at the pages. Record `UIX-POLISH`/`DD-*` identity, polish, or non-contract spacing preferences without reopening the loop unless the governing design/acceptance contract makes the issue objectively required.
4a. Carry the synthesis into the round record: capture coverage (`reviewed/total`, uncaptured state-changing actions — or the single `N/A — uiStateCapture off: {reason}` record when `uiStateCapture.mode` is `off` — caps or sampling hit), sequence-level findings visible only across captures (no feedback between an action and its result, layout shift between steps, the same component rendered inconsistently across surfaces, convention drift accumulating through the flow), and the owning layer for each cluster.
5. If green, compare counts and visual-blocker totals to the previous round. Require the configured consecutive-green runs without a reset; each must be fresh, same-scope, and, in visual mode, have fresh screenshots that were opened/read.
6. If anything fails, record a provisional verdict before editing, using the Step 3 taxonomy:

   - `SOURCE-WRONG` — production behavior violates the governing intent/spec.
   - `TEST-WRONG` — assertion/setup contradicts the governing intent.
   - `TEST-NOT-OPTIMAL` — valid test, but brittle/low-signal setup or selector needs repair without weakening the invariant.
   - `ENVIRONMENT-BLOCKED` — startup/auth/data/browser/evidence capability prevented a verdict.
   - `AMBIGUOUS` — evidence cannot distinguish the owner; stop and ask the owner.

7. For non-blocked failures, invoke `$debug-investigate` inline and trace end-to-start from the observed failure or screenshot to the invariant-owning layer. Then invoke `$fix` at that owning layer (`--target=ui` for a validated visual/layout/responsiveness defect). Preserve the assertion and screenshot evidence that exposed the failure.
8. If the round changed files, invoke `$changes-review` inline, report-only, over the round’s fix diff. Resolve validated blocking findings before re-running. If no files changed, record the skip reason.
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
- existing-test reuse or generated test files and TC coverage;
- every command, run identity, exact Passed/Failed/Skipped counts, exit status, and fresh repeat evidence;
- runtime/visual evidence paths and redaction/read status;
- each failure’s single fault verdict, debug/fix/review references, and owning layer;
- Round Integrity Check results and final `CONVERGED`, `N/A`, `ENVIRONMENT-BLOCKED`, `NOT-CONVERGED`, or `ACCEPTANCE-PENDING` status.

### Fix-Loop Anti-Rationalization

| Temptation | Required response |
| --- | --- |
| Run only changed E2E files | Resolve and record the whole configured scope unless the prompt explicitly narrows it. |
| Generate a new test because it is convenient | Reuse a suitable existing invariant-protecting test and report the mapping. |
| Use a sleep because the page is slow | Reuse bounded `waitUntil(condition, options)` for readiness/actionability and the expected positive/negative postcondition; the mandatory 500ms delay is presentation pacing only. |
| Treat a passing E2E command as a visual pass | In visual mode, capture and open/read every capture the resolved `uiStateCapture.mode` requires (matrix AND transition captures under `every-action`) and adjudicate each through `$experience-review`; a test pass does not erase a visual blocker. |
| Summarize the captures instead of reviewing them | Record ONE per-case entry per manifest row before synthesizing. A synthesis with no per-case records is a summary of memory, and `reviewed/total` will expose it. |
| Report the same broken shared component once per page | Cluster it into one finding owned by the component and fix it at that layer; N page-level duplicates hide the single real cause. |
| Cap or dedupe away a noisy capture set to finish faster | Caps and dedupe are bounded and recorded — an escalation names the untaken captures. Failure captures are never deduped or capped. |
| Loop forever on spacing taste | Loop only on validated objective `BLOCKING` visual defects; record `ADVISORY` polish and identity findings without reopening the E2E gate. |
| Copy a seeded password/storage state into the prompt | Use a configured reference and redact evidence; otherwise block. |
| Update a snapshot because the new output looks right | Preserve the old expectation and request explicit human acceptance. |
| Skip a failing environment or hide a console error | Record `ENVIRONMENT-BLOCKED` or a blocking runtime defect. |
| Fix the assertion first | Adjudicate and trace to the owner; keep the protected invariant intact. |
| Re-invoke `$e2e-test-verify --fix-loop` for the next round | Run the default pass inline; one loop owns the round budget, and a nested loop resets it. |

**Final reminder:** A green E2E result is meaningful only when the same declared
scope was exercised through the real interface, with exact output and readable
evidence, after every fix was adjudicated, reviewed, and re-run fresh.

**IMPORTANT MANDATORY fix-loop sequence:** Step FL-0 (visual mode + scope + Goal Contract) → Step FL-1 (project execution contract) → Step FL-2 (scenario + generate-or-use) → Step FL-3 (whole-system bring-up + exercise) → Step FL-4 (round: default pass inline → experience/visual gate → verdict → debug → fix → review → integrity → fresh rerun) → Step FL-5 (converge / escalate / report).

<!-- FIX-LOOP-MODE:END -->

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

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:e2e-visual-design-contract -->

> **E2E Visual Design Contract** — Binds when this skill or agent handles `--visual-review=true`, screenshot/recording evidence, human-QC of a user-facing UI, or visual expectation/baseline updates; for non-visual E2E/API/CLI work state `N/A — no user-facing visual surface` and do not invent a design review.
>
> 1. **Resolve authority first.** Read `docs/project-config.json`, its `designSystem.canonicalDoc`, `tokenFiles`, and `appMappings[]`, plus the resolved `design-system/README.md`, `frontend-patterns-reference.md`, `scss-styling-guide.md`, `.claude/docs/design-knowledge.md`, and `.claude/docs/design-review-checklist.md`; record `N/A` only for a proven absent surface or `ENVIRONMENT-BLOCKED` for an applicable missing capability — never invent tokens, components, breakpoints, type, CSS/BEM, or runner defaults.
> 2. **Use project decisions.** Apply precedence: brief/accepted design contract → adopter project design-system/SCSS/frontend docs and ADRs → shared `UI-1.1`–`UI-9.4`, `DD-1`–`DD-8`, and `CL-1`–`CL-6`; surface a genuine conflict with both sides, never silently choose. Read and apply the full shared `SYNC:design-system-check`, `SYNC:ui-ux-design-principles`, `SYNC:design-distinctiveness-gate`, and `SYNC:design-review-checklist` bodies for their applicable roles. When UI generation or repair is in scope, consume the accepted `$design` decisions (or the adopter's equivalent professional design/component system); review-only E2E evidence must not invent a new visual language.
> 3. **Map UI architecture before generation or UI fixes.** Inventory related screens, flows, and components; classify each relevant component `Common`, `Domain-Shared`, or `Page`; record its base abstraction and owner; reuse/compose before creating; record why reuse does not fit; keep one owner for markup, selectors, styling, lifecycle, and lower-tier test contracts. Page tests cover composition/outcomes, not copied lower-tier behavior.
> 4. **Separate review owners.** Use `$experience-review` for the running surface and opened/read screenshot evidence; route source-only token, BEM/SCSS, z-index, component ownership, reuse, and static design findings to `$ui-review`. Never infer source architecture or design tokens from an image, and never treat a passing E2E command as visual/design approval.
> 5. **Capture every UI state the journey reaches, not only the declared ones.** Apply `.claude/skills/shared/ui-state-capture-protocol.md`. Instrument one project-owned capture helper in the shared page/component action primitives so every UI-state-changing action — navigation, activation, selection, toggle, tab/step, overlay open and close, filter/sort/paginate, direct manipulation, mode/theme/role switch, async boundary resolution, feedback, session change — emits a capture automatically after its `waitUntil` postcondition and the 500ms pacing; a screenshot call written per test decays invisibly. The resolved `uiStateCapture.mode` decides which captures are produced: `every-action` is the default described here, `declared-only` keeps the matrix and records every transition as a blind spot, and `off` keeps the matrix and records transition coverage as `N/A` — it never waives or weakens this gate. Transition captures are ADDITIVE to the declared state × viewport matrix (loading, empty, error, permission, post-submit, full-page where applicable), never a replacement. Index every capture (including deduped and capped rows) in a `capture-manifest.json` under the evidence root; dedupe by fingerprint, bound per test/run with an escalation record instead of silent truncation, sample repetition, mask volatile regions, capture full-page where the surface scrolls, and never dedupe or cap a failure capture.
> 6. **Gate every visual round case by case, then synthesize.** Reload the design/UI convention authority BEFORE judging the first image. Open/read ONE capture at a time and append its record — image path, expected delta, observed facts with locations, attributed console output, taxonomy findings or an explicit `none`, verdict — before opening the next. Then reconcile records against the manifest, cluster a repeated defect into ONE finding owned by its `Common`/`Domain-Shared`/`Page` component, report sequence-level findings only visible across captures, and list uncaptured transitions as recorded coverage gaps. `UIX-BROKEN`/`UNSTYLED`/`OVERFLOW`/`OVERLAP`/`STATE`, `UI-*`/accessibility/layout-floor, and `P0`–`P2` `CL-*` findings are `BLOCKING`; `UIX-POLISH`/`DD-*` identity is `ADVISORY` unless the governing brief/project contract makes it objectively required. A `UIX-CONVENTION` finding cites the authority clause it breaks. Unmeasurable values are `NOT VERIFIABLE`; a missing record is incomplete review, never a clean result; never promote a baseline/expectation automatically.
> 7. **Report the contract.** Persist authority paths and resolution status, component tier/base/owner/reuse decisions, matrix plus transition-capture coverage (`reviewed/total` and gaps), `UI`/`DD`/`CL`/`UIX` coverage or skips, manifest path, evidence/read status, and remaining human acceptance; preserve the protected business invariant and exact E2E scope.

<!-- /SYNC:e2e-visual-design-contract -->

<!-- SYNC:critical-thinking-mindset:reminder -->
**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.
<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

  **MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:e2e-visual-design-contract:reminder -->

**MUST ATTENTION** visual E2E/QC resolves the project design authority first, applies project design-system/SCSS/frontend decisions plus `UI-*`/`DD-*`/`CL-*` roles, classifies Common/Domain-Shared/Page ownership and reuse, sends static source findings to `$ui-review` and runtime image evidence to `$experience-review`, auto-captures every UI-state-changing action from the shared action layer into a manifest additive to the state × viewport matrix per the resolved `uiStateCapture.mode` (`.claude/skills/shared/ui-state-capture-protocol.md`), reloads the convention docs then reads and records EVERY capture one at a time before synthesizing clustered, owner-routed findings with coverage gaps, treats `UIX`/UI/accessibility-floor findings as blocking and `UIX-POLISH`/DD identity as advisory, never invents measurements, and never auto-promotes baselines; non-visual runs state `N/A`.

<!-- /SYNC:e2e-visual-design-contract:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Verify an existing configured E2E/browser/user-flow scope once without changing it, returning exact execution evidence and an honest quality-gate verdict that a convergence owner can safely consume.

**IMPORTANT MUST ATTENTION** read the project contract and shared E2E quality protocol first; preserve the fixed scope and GWT/invariant/TC traceability.

**IMPORTANT MUST ATTENTION** apply every applicable gate row, capture/read exact evidence, and use `PASS`, `NOT-APPLICABLE`, `ENVIRONMENT-BLOCKED`, or `UNVERIFIED` honestly.

**IMPORTANT MUST ATTENTION** the default pass is report-only; route repairs to the owning skill and never weaken tests, hide evidence, reset shared data, or promote baselines.

<!-- FIX-LOOP-MODE:START -->

**IMPORTANT MUST ATTENTION `--fix-loop` (OPTIONAL mode — only when the flag is passed):** drive a configured E2E suite or real-user journey to a truthful green result over a fixed scope. Resolve the project contract first, select an existing test or generate a traceable Given/When/Then test, bring up the whole system, use a visible browser for web human-QC, inspect runtime/visual evidence, adjudicate every failure, fix the owning layer, and re-run fresh until the declared scope converges (configured consecutive fresh green runs, default 2, within the round cap, default 3) or a bounded blocker is escalated. Each round runs the default pass INLINE — NEVER `$e2e-test-verify --fix-loop` — and report-only callers NEVER pass the flag.

**IMPORTANT MUST ATTENTION** in `--fix-loop`, resolve `--visual-review=true|false` before the first command; default `true`, with `--visual-review=false` as the explicit opt-out. When enabled, run E2E → capture per the resolved `uiStateCapture.mode` (default `every-action`: every UI-state-changing transition plus the full state × viewport matrix) into a manifest → have `$experience-review --rounds=0` read and record EVERY capture case by case, then synthesize clustered owner-routed findings and coverage gaps → fix validated blocking UI defects once at the owning layer → rerun the same E2E scope until the visual blocker count and E2E failure count converge to zero. A manifest row with no per-case record is `UNVERIFIED`, not clean.

**IMPORTANT MUST ATTENTION** in `--fix-loop`, use one reusable bounded `waitUntil(condition, options)` before and after every UI-control action, including applicable error-alert presence/absence, then wait exactly 500ms at the end; never shrink scope, weaken assertions, hide evidence, or promote baselines automatically.

**IMPORTANT MUST ATTENTION** in `--fix-loop`, read and reapply `.claude/skills/shared/e2e-quality-protocol.md` for every round; preserve its GWT/invariant, gate-row, evidence, auth/data, cleanup, and test-to-spec records while this mode owns only convergence and owning-layer repair.

<!-- FIX-LOOP-MODE:END -->

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Static Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs` (legacy filename; static protocol composer)

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there immediately before the first target read, grep, edit, test, or analysis. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. After compaction, resume, delegation, or a material context change, re-read the required docs and state `Reference docs read: ... | Not applicable: ...`; a hook reminder or prior conversation is not proof that the files are loaded. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **PARALLELIZE:** Before executing the task list, tag each task `PAR` (independent inputs + write set disjoint from every other `PAR` task) or `SEQ` (name the blocking dependency), group `PAR` tasks into waves, declare the wave plan, and spawn each wave's sub-agents in ONE message — all-return barrier per wave, fan-out one level deep unless a sub-agent's own definition authorizes further fan-out. Sequential-by-default is a defect when tasks are independent; do not parallelize shared write targets, output-consuming tasks, trivial single-file work, ordering a skill or workflow explicitly fixes, or user-approval gates.
7. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)
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
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, analyze the task graph (output dependencies, shared write targets) into ordered parallel waves per PARALLELIZE before starting any task, then keep it synchronized as each step starts/completes.
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
## Common AI Mistake Prevention (System Lessons)

- **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
- **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
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
- **Ownership before action.** When investigating a failure, ask which part owns the behavior before changing anything. Trace the wrong state to the component responsible for its invariant, then make one authoritative correction there.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec (`docs/specs/**` if one exists) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, and state). Verify each against evidence, not intuition. Ask "what would falsify this?" — if nothing, it is not a hypothesis. The most expensive failure is going deeper into an assumed area while the real issue sits in an unexamined condition.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem; avoid unrelated cleanup. For review or enhancement work, announce improvements beyond the main request rather than silently expanding scope. Ask: "Would this change exist if I were not addressing this request?" — if not, remove it or disclose it.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, `plans/`, `team-artifacts/`, or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
