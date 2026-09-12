---
name: e2e-test-verify-loop
version: 1.1.0
description: '[Testing] Use when driving a configured E2E suite or human-QC journey to green with project-config setup, evidence, fault adjudication, and bounded re-verification. Flag: --visual-review={true|false} (default true; false is the explicit opt-out from the screenshot visual gate).'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute the steps in order. Before each step or sub-skill call, update task tracking; mark it completed only with evidence or an explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, maintain an equivalent step tracker. Keep exactly one task in progress.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Drive a configured E2E suite or real-user journey to a truthful green result over a fixed scope. Resolve the project contract first, select an existing test or generate a traceable Given/When/Then test, bring up the whole system, use a visible browser for web human-QC, inspect runtime/visual evidence, adjudicate every failure, fix the owning layer, and re-run fresh until the declared scope converges or a bounded blocker is escalated.

**Summary:**

- **Main path:** resolve scope/contract → read config/reference → resolve readiness/auth/data/browser/evidence → select or generate tests → run and inspect → adjudicate/fix → rerun fresh → report or escalate.
- **Visual gate:** default `--visual-review=true`; capture/read every screenshot state × viewport through `/experience-review --rounds=0`; explicit `--visual-review=false` opts out; preserve baselines.

**Role in `workflow-e2e`:** This is the internal convergence engine, not a
second E2E workflow. `workflow-e2e` calls it after source-specific authoring
when a test must be written or updated, and calls it directly when an existing
test can be selected or a case must be generated from the request. The loop
owns the configured run, failure classification, owning-layer repair, review,
fresh bring-up, and same-scope reruns for every source.

**Default scope:** the whole discovered E2E scope — every configured E2E project and linked observable surface. A named feature, bugfix, spec, test project, code change, or upstream authoring handoff narrows the scope only when it explicitly names or supplies that mapping. Scope is recorded once and never shrinks silently; an inherited `workflow-e2e` handoff is authoritative.

**Workflow:** resolve scope and Goal Contract → read project-config/reference → resolve startup/readiness/auth/data/browser/evidence → select or generate tests → run and inspect → adjudicate failures → fix/review/re-run → require fresh consecutive green runs → report or escalate.

**Visual review mode:** Visual screenshot review is enabled by default,
equivalent to `--visual-review=true`. It changes each round to `E2E run →
capture screenshots → open/read and judge every image through
/experience-review → fix blocking UI defects → re-run the same E2E scope`. An
explicit `--visual-review=false` preserves the non-visual E2E loop; a UI
surface is not required to infer the default.

**Key rules:**

- `e2eTesting.execution` is optional, but missing capability is never a guessed default. Link `surfaceIds[]` to `experienceVerification.surfaces[]`; the linked `localRun` owns startup/readiness/log/teardown.
- For browser/UI E2E or human-QC, use the configured visible Playwright CLI path when supported. Before every UI-control operation, use one reusable bounded `waitUntil(condition, options)` helper for readiness/actionability and applicable error-alert absence; after it, use the helper for the expected positive/negative outcome or error-alert state, then wait exactly **500ms** as presentation pacing. Keep real settle signals separate; the delay is never readiness and cannot be disabled by configuration.
- Use project-owned auth and data paths. Never copy credentials, storage state, cookies, tokens, or seed values into prompts/reports; never bypass the UI with direct datastore mutation.
- Reuse a suitable existing test and its reusable Common/Domain-Shared/Page objects. Generate through `/e2e-test` → `e2e-runner` only when coverage is missing or the current test does not protect the requested invariant; generated objects must use the project's idiomatic abstract base and cohesive helpers/utilities.
- A passing screen is not enough: runtime errors, uncaught exceptions, unhandled rejections, journey-critical failed requests, unread evidence, and baseline mismatches remain visible findings.
- When visual review is enabled (the default or explicit `--visual-review=true`), the screenshot matrix and image inspection are a required part of the E2E gate. Use `/experience-review --rounds=0` as the report-only visual adjudicator inside this loop; this parent loop owns UI fixes and the subsequent E2E rerun. `--visual-review=false` is the explicit opt-out. `/ask` is architecture consultation and is not a substitute for image inspection.
- Never delete, skip, narrow, weaken, retry-wrap an assertion, silence logs, or auto-promote a baseline to obtain green.

## Why this skill exists

E2E authoring, local bring-up, browser evidence, and bounded failure repair
otherwise live in separate skills. That separation makes it easy to run only a
changed test, skip the missing auth/data setup, call a screen that looks
correct despite a console error, or stop after one green run. This skill is the
single convergence contract used by `workflow-e2e`; it delegates specialized
authoring, experience, debug, fix, and review work without becoming another
user-facing workflow.

## Step 0 — Resolve visual mode, scope, and Goal Contract

Before any test command or edit:

1. Resolve `--visual-review=true|false`. The default is `true`; an invalid or ambiguous value is a blocker, not permission to guess. Record the resolved mode before the first command. Only an explicit `--visual-review=false` opts out.
2. Read `docs/project-config.json`, `docs/project-reference/docs-index-reference.md`, `docs/project-reference/lessons.md`, `docs/project-reference/e2e-test-reference.md`, and the relevant feature/spec/code contract.
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

## Step 1 — Resolve the project execution contract

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

## Step 2 — Build the scenario and choose generate-or-use

For each requested behavior, write a scenario record before execution:

```text
GIVEN <verified actor, fixture/data, and starting state>
WHEN <real actions through the configured interface>
THEN <visible/persisted/business outcome plus relevant failure/recovery state>
INVARIANT <spec §8 rule, acceptance criterion, or source contract protected>
WAIT_UNTIL <bounded positive/negative condition before and after each meaningful action>
SETTLE <observable readiness/state signal after each meaningful action>
TC <existing TC code or a new traceable code proposed for the scenario>
```

Search for at least three comparable existing E2E tests/page objects when the
project has them, including Common, Domain-Shared, and Page tiers where they
exist. If a suitable test covers the same invariant and scope, select it and do
not generate a duplicate. If no suitable test exists, invoke `/e2e-test` and
the `e2e-runner` specialist to generate a tiered Page/Component Object Model in
the project’s local convention, with one canonical owner per selector/action/
wait and reusable lower-tier contracts tested once. A coverage gap feeds both
the spec/intent record and the test; never patch only the test to hide a
missing rule.

## Step 3 — Bring up and exercise the whole system

For every `APPLICABLE` surface, in order:

1. Start only project-declared backing services through `localRun` or cited repository commands.
2. Run migrations/seed through supported project paths. Use unique run data, count-before-create/reference data, idempotent or additive setup, and current-run-only cleanup after evidence capture.
3. Start the surface and poll its declared readiness signal. A started process, open port, or fixed sleep is not readiness.
4. Attach server logs and browser console/page-error/request capture before the first interaction.
5. For web, open the configured browser visibly when human-QC is requested. Use semantic/accessible actions and stable locators. Before every UI-control operation, call the reusable bounded `waitUntil(condition, options)` helper for readiness/actionability and applicable blocking error-alert absence; after the operation, call it for the expected positive/negative outcome, including dropdown/options and expected error-alert present/absent states; then wait exactly **500ms**. Observe any real settle signal separately.
6. Drive the Given/When/Then path through the real interface. Capture screenshots for relevant states and trace/video/console/requests when configured; when visual review is enabled (the default unless explicitly false), capture every matrix state at every matrix viewport, including loading, empty, error, permission, and post-submit states plus a full-page capture where the surface scrolls. Store captures under the configured evidence root, open/read every image, record the visual observation, and redact sensitive content.
7. Tear down only processes/services started by this run. Preserve accepted baselines and record candidate evidence separately.

If any precondition fails, preserve the logs and classify the branch
`ENVIRONMENT-BLOCKED`; do not disable auth, stub a dependency, skip a state, or
claim a pass.

## Step 4 — Run a bounded convergence round

Each round is a fresh full verification over the exact recorded scope:

1. Snapshot scope, test/scenario IDs, executed/passed/failed/skipped counts, and the working tree.
2. Run the configured full command; use the focused command only in addition to, never instead of, the declared full scope. Record command, exit status, counts, failing names, run identity, data mode, and evidence paths.
3. Invoke `/experience-review --rounds=0` report-only for configured observable surfaces. It may classify evidence and runtime/UI findings but must not fix, update baselines, or change expectations inside this loop.
4. When visual review is enabled (the default unless explicitly false), make the experience-review result a required visual gate: every generated screenshot in the declared state × viewport matrix must be opened/read and classified. Add validated `BLOCKING` visual findings—clipping, overlap, unreadability, unreachable/off-screen controls, broken required states, accessibility-floor violations, or broken responsive layouts—to the round's failure set. Record `ADVISORY` identity, polish, or non-contract spacing preferences without reopening the loop unless the governing design/acceptance contract makes the issue objectively required.
5. If green, compare counts and visual-blocker totals to the previous round. Require the configured consecutive-green runs without a reset; each must be fresh, same-scope, and, in visual mode, have fresh screenshots that were opened/read.
6. If anything fails, record a provisional verdict before editing:

   - `SOURCE-WRONG` — production behavior violates the governing intent/spec.
   - `TEST-WRONG` — assertion/setup contradicts the governing intent.
   - `TEST-NOT-OPTIMAL` — valid test, but brittle/low-signal setup or selector needs repair without weakening the invariant.
   - `ENVIRONMENT-BLOCKED` — startup/auth/data/browser/evidence capability prevented a verdict.
   - `AMBIGUOUS` — evidence cannot distinguish the owner; stop and ask the owner.

7. For non-blocked failures, invoke `/debug-investigate` inline and trace end-to-start from the observed failure or screenshot to the invariant-owning layer. Then invoke `/fix` at that owning layer (`--target=ui` for a validated visual/layout/responsiveness defect). Preserve the assertion and screenshot evidence that exposed the failure.
8. If the round changed files, invoke `/changes-review` inline, report-only, over the round’s fix diff. Resolve validated blocking findings before re-running. If no files changed, record the skip reason.
9. Run the Round Integrity Check: executed count must not decrease, skipped count must not increase, fixed scope must not narrow, runtime logs must not be hidden, screenshot states/viewports must not be removed, and evidence collection must not be disabled.
10. Restart from a fresh bring-up/exercise and run the same configured E2E command again. A green run or clean screenshot before the fix does not count.

## Step 5 — Stop, escalate, and report honestly

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

## Required output

Persist a report containing:

- fixed scope and how it was resolved;
- resolved `--visual-review` mode, screenshot state × viewport matrix, and image-inspection result;
- Goal Contract and Given/When/Then + invariant records;
- config/reference evidence for framework, lifecycle, auth, data, browser, evidence, and convergence;
- existing-test reuse or generated test files and TC coverage;
- every command, run identity, exact Passed/Failed/Skipped counts, exit status, and fresh repeat evidence;
- runtime/visual evidence paths and redaction/read status;
- each failure’s single fault verdict, debug/fix/review references, and owning layer;
- Round Integrity Check results and final `CONVERGED`, `N/A`, `ENVIRONMENT-BLOCKED`, `NOT-CONVERGED`, or `ACCEPTANCE-PENDING` status.

## Anti-rationalization

| Temptation | Required response |
| --- | --- |
| Run only changed E2E files | Resolve and record the whole configured scope unless the prompt explicitly narrows it. |
| Generate a new test because it is convenient | Reuse a suitable existing invariant-protecting test and report the mapping. |
| Use a sleep because the page is slow | Reuse bounded `waitUntil(condition, options)` for readiness/actionability and the expected positive/negative postcondition; the mandatory 500ms delay is presentation pacing only. |
| Treat a passing E2E command as a visual pass | In visual mode, capture and open/read the required screenshot matrix and adjudicate it through `/experience-review`; a test pass does not erase a visual blocker. |
| Invoke `/ask` to judge screenshots | Use `/experience-review` for runtime/screenshot inspection; `/ask` provides architecture consultation and has no visual-evidence contract. |
| Loop forever on spacing taste | Loop only on validated objective `BLOCKING` visual defects; record `ADVISORY` polish and identity findings without reopening the E2E gate. |
| Copy a seeded password/storage state into the prompt | Use a configured reference and redact evidence; otherwise block. |
| Update a snapshot because the new output looks right | Preserve the old expectation and request explicit human acceptance. |
| Skip a failing environment or hide a console error | Record `ENVIRONMENT-BLOCKED` or a blocking runtime defect. |
| Fix the assertion first | Adjudicate and trace to the owner; keep the protected invariant intact. |

**Final reminder:** A green E2E result is meaningful only when the same declared
scope was exercised through the real interface, with exact output and readable
evidence, after every fix was adjudicated, reviewed, and re-run fresh.

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

<!-- SYNC:project-protocol-overlay:reminder -->

  **MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:e2e-visual-design-contract:reminder -->

**MUST ATTENTION** visual E2E/QC resolves the project design authority first, applies project design-system/SCSS/frontend decisions plus `UI-*`/`DD-*`/`CL-*` roles, classifies Common/Domain-Shared/Page ownership and reuse, sends static source findings to `/ui-review` and runtime image evidence to `/experience-review`, reads every state × viewport artifact, treats UI/accessibility-floor findings as blocking and DD identity/polish as advisory, never invents measurements, and never auto-promotes baselines; non-visual runs state `N/A`.

<!-- /SYNC:e2e-visual-design-contract:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Drive a configured E2E suite or real-user journey to a truthful green result over a fixed scope. Resolve the project contract first, select an existing test or generate a traceable Given/When/Then test, bring up the whole system, use a visible browser for web human-QC, inspect runtime/visual evidence, adjudicate every failure, fix the owning layer, and re-run fresh until the declared scope converges or a bounded blocker is escalated.

**IMPORTANT MUST ATTENTION** resolve `--visual-review=true|false` before the first command; default `true`, with `--visual-review=false` as the explicit opt-out. When enabled, run E2E → capture the full state × viewport matrix → open/read every generated image through `/experience-review --rounds=0` → fix validated blocking UI defects at the owning layer → rerun the same E2E scope until the visual blocker count and E2E failure count converge to zero; `/ask` is not the image reviewer.

**IMPORTANT MUST ATTENTION** use one reusable bounded `waitUntil(condition, options)` before and after every UI-control action, including applicable error-alert presence/absence, then wait exactly 500ms at the end; never shrink scope, weaken assertions, hide evidence, or promote baselines automatically.
