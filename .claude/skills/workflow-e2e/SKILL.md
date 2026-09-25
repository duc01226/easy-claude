---
name: workflow-e2e
version: 1.2.0
description: '[Workflow] Use when writing, updating, and verifying E2E tests through a bounded green fix/retest loop. Flags: --source={changes|recording|update-ui|prompt|context|whole}, --visual-review={true|false} (resolve from the task request and project contract; no framework-wide default).'
disable-model-invocation: false
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Workflow steps follow the guided contract in `/start-workflow` → Step Execution Protocol: `gate` steps are fixed; other steps may flex with a logged reason.
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

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

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
| `fullCommand` / `focusedCommand` | Provide copy-ready configured commands for the full suite and focused/partial scope; invalid or zero-match selections must exit non-zero, with a simple Windows/macOS/Linux entry point when required. |
| `runIdentity` / `dataStrategy` | Provide a unique non-sensitive run identity and business-data suffix, valid public-path setup, declared seed/accumulation mode, and parallel-worker isolation. |
| `testOrganization` | Name the declared local pattern (such as scoped in-file locators/helpers or configured objects), canonical locator/action/wait owners, and any demonstrated reuse; do not require POM tiers or an abstract base unless the project contract selects them. |
| `repeatProof` / `result` | Carry exact counts, failing names, and exit status, plus repeat/parallel evidence and two consecutive no-reset full runs for each applicable persistent-state suite. |

`/investigate` resolves applicability and scope; `/e2e-test` owns only source-specific authoring/setup when its occurrence applies; `/e2e-test-verify --fix-loop` owns the configured command, exact results, evidence, failure classification, fixes, and fresh reruns; `/docs-update` receives the terminal evidence. If E2E is not configured, the applicable owner records the evidence-backed `N/A` and does not substitute an invented runner.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `e2e-visual-design-contract` — Evidence and baseline rules for visual review in E2E and human QC; handling visual-review evidence or visual baseline updates → .claude/skills/shared/protocols/e2e-visual-design-contract.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

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

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

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

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `/project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

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
