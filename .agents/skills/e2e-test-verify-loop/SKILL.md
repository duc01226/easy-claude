---
name: e2e-test-verify-loop
description: '[Testing] Use when driving a configured E2E suite or human-QC journey to green with project-config setup, evidence, fault adjudication, and bounded re-verification. Flag: --visual-review={true|false} (default false; true enables the screenshot visual gate).'
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

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

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

> **[BLOCKING]** Execute the steps in order. Before each step or sub-skill call, update task tracking; mark it completed only with evidence or an explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, maintain an equivalent step tracker. Keep exactly one task in progress.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Drive a configured E2E suite or real-user journey to a truthful green result over a fixed scope. Resolve the project contract first, select an existing test or generate a traceable Given/When/Then test, bring up the whole system, use a visible browser for web human-QC, inspect runtime/visual evidence, adjudicate every failure, fix the owning layer, and re-run fresh until the declared scope converges or a bounded blocker is escalated.

**Default scope:** the whole discovered E2E scope — every configured E2E project and linked observable surface. A named feature, bugfix, spec, test project, or code change narrows the scope only when the prompt explicitly names it. Scope is recorded once and never shrinks silently.

**Workflow:** resolve scope and Goal Contract → read project-config/reference → resolve startup/readiness/auth/data/browser/evidence → select or generate tests → run and inspect → adjudicate failures → fix/review/re-run → require fresh consecutive green runs → report or escalate.

**Visual review mode:** `--visual-review=true` is an explicit opt-in. It changes
each round to `E2E run → capture screenshots → open/read and judge the images
through $experience-review → fix blocking UI defects → re-run the same E2E
scope`. The default `--visual-review=false` preserves the normal E2E loop;
seeing a UI surface does not silently activate visual remediation.

**Key rules:**

- `e2eTesting.execution` is optional, but missing capability is never a guessed default. Link `surfaceIds[]` to `experienceVerification.surfaces[]`; the linked `localRun` owns startup/readiness/log/teardown.
- For browser/UI E2E or human-QC, use the configured visible Playwright CLI path when supported. Before every UI-control operation, use one reusable bounded `waitUntil(condition, options)` helper for readiness/actionability and applicable error-alert absence; after it, use the helper for the expected positive/negative outcome or error-alert state, then wait exactly **500ms** as presentation pacing. Keep real settle signals separate; the delay is never readiness and cannot be disabled by configuration.
- Use project-owned auth and data paths. Never copy credentials, storage state, cookies, tokens, or seed values into prompts/reports; never bypass the UI with direct datastore mutation.
- Reuse a suitable existing test and its reusable Common/Domain-Shared/Page objects. Generate through `$e2e-test` → `e2e-runner` only when coverage is missing or the current test does not protect the requested invariant; generated objects must use the project's idiomatic abstract base and cohesive helpers/utilities.
- A passing screen is not enough: runtime errors, uncaught exceptions, unhandled rejections, journey-critical failed requests, unread evidence, and baseline mismatches remain visible findings.
- When `--visual-review=true`, the screenshot matrix and image inspection are a required part of the E2E gate. Use `$experience-review --rounds=0` as the report-only visual adjudicator inside this loop; this parent loop owns UI fixes and the subsequent E2E rerun. `$ask` is architecture consultation and is not a substitute for image inspection.
- Never delete, skip, narrow, weaken, retry-wrap an assertion, silence logs, or auto-promote a baseline to obtain green.

## Why this skill exists

E2E generation, local bring-up, browser evidence, and bounded failure repair otherwise live in separate skills. That separation makes it easy to run only a changed test, skip the missing auth/data setup, call a screen that looks correct despite a console error, or stop after one green run. This skill owns the convergence contract while delegating specialized work to the existing E2E, experience, debug, fix, and review skills.

## Step 0 — Resolve visual mode, scope, and Goal Contract

Before any test command or edit:

1. Resolve `--visual-review=true|false`. The default is `false`; an invalid or ambiguous value is a blocker, not permission to guess. Record the resolved mode before the first command.
2. Read `docs/project-config.json`, `docs/project-reference/docs-index-reference.md`, `docs/project-reference/lessons.md`, `docs/project-reference/e2e-test-reference.md`, and the relevant feature/spec/code contract.
3. Resolve `{scope}`:

   | Prompt/context | Fixed scope |
   | --- | --- |
   | No target named | Every configured E2E project and every linked applicable observable surface |
   | Feature/bugfix/journey named | Tests and surfaces covering that behavior, with the mapping cited |
   | Spec/test project named | The configured project and any required linked surface |
   | Code diff/branch named | The E2E projects/surfaces affected by that explicit change set |

4. Record the scope as a stable list. If no runnable E2E framework exists, record `N/A — <config and scan evidence>` and do not substitute a generic browser runner. If a relevant surface exists but cannot run or be inspected, record `ENVIRONMENT-BLOCKED — <missing capability and evidence>`.
5. When visual mode is `true`, add the required capability that every applicable visual surface has a configured screenshot matrix, an evidence root, and an image-inspection path; missing capability is `ENVIRONMENT-BLOCKED`.
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
not generate a duplicate. If no suitable test exists, invoke `$e2e-test` and
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
6. Drive the Given/When/Then path through the real interface. Capture screenshots for relevant states and trace/video/console/requests when configured; when visual mode is `true`, capture every matrix state at every matrix viewport, including loading, empty, error, permission, and post-submit states plus a full-page capture where the surface scrolls. Store captures under the configured evidence root, open/read every image, record the visual observation, and redact sensitive content.
7. Tear down only processes/services started by this run. Preserve accepted baselines and record candidate evidence separately.

If any precondition fails, preserve the logs and classify the branch
`ENVIRONMENT-BLOCKED`; do not disable auth, stub a dependency, skip a state, or
claim a pass.

## Step 4 — Run a bounded convergence round

Each round is a fresh full verification over the exact recorded scope:

1. Snapshot scope, test/scenario IDs, executed/passed/failed/skipped counts, and the working tree.
2. Run the configured full command; use the focused command only in addition to, never instead of, the declared full scope. Record command, exit status, counts, failing names, run identity, data mode, and evidence paths.
3. Invoke `$experience-review --rounds=0` report-only for configured observable surfaces. It may classify evidence and runtime/UI findings but must not fix, update baselines, or change expectations inside this loop.
4. When `--visual-review=true`, make the experience-review result a required visual gate: every screenshot in the declared state × viewport matrix must be opened/read and classified. Add validated `BLOCKING` visual findings—clipping, overlap, unreadability, unreachable/off-screen controls, broken required states, accessibility-floor violations, or broken responsive layouts—to the round's failure set. Record `ADVISORY` identity, polish, or non-contract spacing preferences without reopening the loop unless the governing design/acceptance contract makes the issue objectively required.
5. If green, compare counts and visual-blocker totals to the previous round. Require the configured consecutive-green runs without a reset; each must be fresh, same-scope, and, in visual mode, have fresh screenshots that were opened/read.
6. If anything fails, record a provisional verdict before editing:

   - `SOURCE-WRONG` — production behavior violates the governing intent/spec.
   - `TEST-WRONG` — assertion/setup contradicts the governing intent.
   - `TEST-NOT-OPTIMAL` — valid test, but brittle/low-signal setup or selector needs repair without weakening the invariant.
   - `ENVIRONMENT-BLOCKED` — startup/auth/data/browser/evidence capability prevented a verdict.
   - `AMBIGUOUS` — evidence cannot distinguish the owner; stop and ask the owner.

7. For non-blocked failures, invoke `$debug-investigate` inline and trace end-to-start from the observed failure or screenshot to the invariant-owning layer. Then invoke `$fix` at that owning layer (`--target=ui` for a validated visual/layout/responsiveness defect). Preserve the assertion and screenshot evidence that exposed the failure.
8. If the round changed files, invoke `$changes-review` inline, report-only, over the round’s fix diff. Resolve validated blocking findings before re-running. If no files changed, record the skip reason.
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
and no open runtime-error/evidence/security finding. When visual mode is true,
the same fresh runs must also contain zero validated `BLOCKING` visual findings;
visual `ADVISORY` findings remain visible in the handoff. `HUMAN-ACCEPTED`
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
| Treat a passing E2E command as a visual pass | In visual mode, capture and open/read the required screenshot matrix and adjudicate it through `$experience-review`; a test pass does not erase a visual blocker. |
| Invoke `$ask` to judge screenshots | Use `$experience-review` for runtime/screenshot inspection; `$ask` provides architecture consultation and has no visual-evidence contract. |
| Loop forever on spacing taste | Loop only on validated objective `BLOCKING` visual defects; record `ADVISORY` polish and identity findings without reopening the E2E gate. |
| Copy a seeded password/storage state into the prompt | Use a configured reference and redact evidence; otherwise block. |
| Update a snapshot because the new output looks right | Preserve the old expectation and request explicit human acceptance. |
| Skip a failing environment or hide a console error | Record `ENVIRONMENT-BLOCKED` or a blocking runtime defect. |
| Fix the assertion first | Adjudicate and trace to the owner; keep the protected invariant intact. |

**Final reminder:** A green E2E result is meaningful only when the same declared
scope was exercised through the real interface, with exact output and readable
evidence, after every fix was adjudicated, reviewed, and re-run fresh.

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

<!-- SYNC:critical-thinking-mindset:reminder -->
**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.
<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

  **MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Drive the fixed E2E scope to a truthful, repeatable green result with exact evidence, preserved intent, and bounded remediation; when visual mode is active, the same result also requires a clean screenshot review.

**IMPORTANT MUST ATTENTION** resolve `--visual-review=true|false` before the first command; default `false`. When `true`, run E2E → capture the full state × viewport matrix → open/read every image through `$experience-review --rounds=0` → fix validated blocking UI defects at the owning layer → rerun the same E2E scope until the visual blocker count and E2E failure count converge to zero; `$ask` is not the image reviewer.

**IMPORTANT MUST ATTENTION** use one reusable bounded `waitUntil(condition, options)` before and after every UI-control action, including applicable error-alert presence/absence, then wait exactly 500ms at the end; never shrink scope, weaken assertions, hide evidence, or promote baselines automatically.

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
