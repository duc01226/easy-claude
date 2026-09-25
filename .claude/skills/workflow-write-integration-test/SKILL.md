---
name: workflow-write-integration-test
version: 1.0.0
description: '[Workflow] Use when writing integration tests spec-first, converting test specs into test code, or adding coverage to untested code.'
disable-model-invocation: false
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Workflow steps follow the guided contract in `/start-workflow` → Step Execution Protocol: `gate` steps are fixed; other steps may flex with a logged reason.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Write or update integration tests from the project's canonical behavior/test-case owner, review them through seven quality gates, and verify them under the project's configured repeat policy.

**Summary:** Resolve the configured case profile → investigate the affected behavior → update its canonical case owner when needed → create tests through project-supported integration seams → review seven gates → verify the configured relevant suites under their repeat policy → sync docs and close. The framework's strict default uses Feature Spec Section 8 TCs; a declared native profile uses its own owner and carrier.
- **Testability contract:** resolve Unit/Integration/System/E2E applicability from runner/config evidence; record owner/root/data, copy-ready full + focused commands, zero-match behavior, CI/simple Windows/macOS/Linux entry, unique run/data identity, and repeat proof; unresolved applicable fields block handoff, while non-applicable tiers require evidence-backed `N/A`.

**Absorbed use cases:** converting existing TC specs into integration test code (former test-to-integration — specs already exist, so `/spec [mode=tests]` runs in UPDATE/verify mode instead of authoring from scratch) and stability verification of existing suites (former test-verify — the `/integration-test-verify` step's 2-consecutive-run gate). For spec-only authoring with no test code, use the `/spec [mode=tests]` skill directly.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Ordered route:** `/investigate` → `/spec [mode=tests]` → `/artifact-review --type=spec-tests` → `/integration-test` → `/integration-test-review` → `/integration-test-verify` → `/spec [mode=sync]` → `/docs-update` → `/workflow-end` → `/watzup`.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION require integration tests to protect a named business rule/invariant and fail if that intent breaks.
- MUST ATTENTION use the production entry path when it is part of the behavior under test; use project fixtures/factories or another valid setup path for unrelated preconditions without bypassing the tested contract.
- MUST ATTENTION follow `integrationTestVerify.guidance`; when absent, require two fresh green runs for suites with persistent/shared state and preserve their data-isolation policy.
- NEVER skip mandatory workflow or skill gates.

**IMPORTANT MANDATORY Steps:** /investigate -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /integration-test -> /integration-test-review -> /integration-test-verify -> /spec [mode=sync] -> /docs-update -> /workflow-end -> /watzup

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

> **[CRITICAL] Understand the affected behavior first:** `/investigate` is MANDATORY before changing the canonical test-case owner or writing integration tests. Trace the project's real entry point, invariant/data owner, observable outcome, and any downstream effects that exist. Read handler/entity/event code when the architecture uses those concepts; do not assume those layers exist.

> **Goal Contract propagation (workflow-owned):** At workflow start, resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root, default `plans/`, relocated by `docsRoots.plans.path` in `docs/project-config.json` → create from the test request). Each generated test maps to a saved goal invariant/criterion — a test protecting NO saved invariant needs a recorded justification. After `/integration-test-verify`, append the verification evidence (pass/fail counts, runner command, report path) to the goal file's Iteration Log and emit the Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before `/workflow-end`.

Activate the `workflow-write-integration-test` workflow. Run `/start-workflow workflow-write-integration-test` with the user's prompt as context.

**Steps:** /investigate → /spec [mode=tests] → /artifact-review --type=spec-tests → /integration-test → /integration-test-review → /integration-test-verify → /spec [mode=sync] → /docs-update → /workflow-end → /watzup

## Test Architecture Contract Handoff

Before `/integration-test`, `/investigate` must emit one evidence-backed contract record for the test scope and pass it unchanged through the existing delegated order:

- `applicability`: record Unit/Integration/System/E2E as `APPLICABLE` only with runner/configuration evidence; otherwise record `N/A — <evidence>`.
- `owner`: identify the delegated setup, writer, reviewer, verifier, and documentation owner for each applicable tier; do not duplicate their gates in the wrapper.
- `fullCommand` and `focusedCommand`: copy-ready configured commands, their zero-match/invalid-selection non-zero behavior, CI gate, and simple Windows/macOS/Linux entry point when required.
- `runIdentity` and `dataStrategy`: use distinct identity when the configured store is shared; set up the tested behavior through its real entry path and unrelated preconditions through valid project fixtures/builders; isolate mutable data for supported concurrency.
- `repeatProof`: exact counts and exit status for the focused run, repeat/concurrency evidence, and the full-run evidence required by `integrationTestVerify.guidance` (default: two fresh no-reset runs for persistent/shared-state suites).

`/integration-test` consumes the setup and command fields; `/integration-test-review` verifies command validity, data identity/accumulation, and isolation alongside its existing quality gates; `/integration-test-verify` executes the configured scopes and returns the exact evidence for `/spec [mode=sync]` and `/docs-update`. This handoff adds data to the route and does not duplicate, reverse, or weaken any existing review, approval, or verification gate.

> **[STEP PURPOSES]** Every step has a distinct purpose — NEVER deduplicate or batch:
>
> **`/investigate`** — Find the target behavior and same-area test examples using the project's module/test layout. Output: affected files, comparable tests, and the configured case owner/profile.
> **`/investigate`** — Trace the production entry path, invariant owner, and observable outcome; inspect handlers, entities, events, messages, and persistence only where the project architecture has them.
> **`/spec [mode=tests]`** — Update the selected canonical case owner. Under the strict default, write/update `TC-{FEATURE}-{NNN}` cases in Feature Spec Section 8; under a native profile, use its declared identities and carrier and do not create a Section 8 shadow. Output the configured case-to-test mapping.
> **`/artifact-review --type=spec-tests`** — Validate each selected case against its declared format and behavior contract: clear setup/action/outcome, relevant error/access boundaries, and no identity collision. Apply GIVEN/WHEN/THEN only when the selected carrier uses it.
> **`/integration-test`** — Generate tests through the project's supported integration boundary. Exercise the production entry path when it is under test; use valid project fixtures for other preconditions. Poll asynchronous outcomes only when the contract is eventually consistent; use generated identifiers when test data shares a namespace; attach the project's declared traceability carrier when one exists.
> **`/integration-test-review`** — 7-gate quality check (assertion value, data state, repeatability, domain logic, traceability, three-way sync, change coverage). Gate 7: every behavior-changing production file in the change set maps to a covering test (integration-first; unit fallback needs justification) AND a spec TC. Validate findings, fix only validated findings that block the current round, then restart the full integration-test review after fixes. Round 1 blocks on every validated severity; from round 2 onward CRITICAL/HIGH/MEDIUM remain blocking and LOW-only findings are recorded/deferred without another fix/review round. NEVER proceed with a blocking finding or failed binary gate outstanding; never relabel a material finding LOW to exit.
> **`/integration-test-verify`** — Run the configured applicable suites using their configured commands and repeat policy. Report exact scope, result, exit status, and required repeat evidence; never mark complete without real output.
> **`/spec [mode=sync]`** — Sync the selected case owner and its declared coverage carrier with executing tests. Under the strict default, reconcile Section 8 TCs and `CoveredBy` links; under a native profile, preserve its identities, fields, and cardinality without inventing TC annotations.
> **`/docs-update`** — Update feature doc evidence fields and version history if test coverage changed materially.
> **`/workflow-end`** + **`/watzup`** — Close workflow state, then summarize; `/watzup` hands off to `/understand` only for a large code change or on request.

---

**IMPORTANT MANDATORY Steps:** /investigate -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /integration-test -> /integration-test-review -> /integration-test-verify -> /spec [mode=sync] -> /docs-update -> /workflow-end -> /watzup

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `integration-test-execution-discipline` — How integration tests are written, reviewed, run, diagnosed and cleared; working in the integration-test skill family → .claude/skills/shared/protocols/integration-test-execution-discipline.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

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
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `/project-init` or the narrow owner route before relying on it.
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

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** Testability contract: resolve evidence-backed Unit/Integration/System/E2E rows, copy-ready full/focused commands, zero-match failures, owner/root/data, CI/simple Windows/macOS/Linux entry, unique run identity, and repeat proof before claiming setup, review, or test completion.
**IMPORTANT MUST ATTENTION Goal:** Write or update spec-first integration tests from canonical TCs, review them through seven quality gates, and prove the relevant suite passes twice consecutively without DB reset.

**IMPORTANT MUST ATTENTION Main steps:** `/investigate` (read domain source first) → `/spec [mode=tests]` → `/artifact-review --type=spec-tests` → `/integration-test` → `/integration-test-review` → `/integration-test-verify` (whole relevant suite, two runs, no DB reset) → `/spec [mode=sync]` → `/docs-update` → `/workflow-end` → `/watzup`. **NEVER** write smoke-only tests, bypass real-use-case setup, or declare verification without runner output.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):** MUST ATTENTION honor every protocol below — each is a signpost to its canonical body above.

- **AI Mistakes:** holistic-first debug, fix at responsible layer, surgical diff, verify all outputs.
- **Nested Tasks:** expand child phases, link parent workflow row when nested.
- **Project Reference Docs:** read required docs first, cite, `lessons.md` always.
- **Task Tracking:** bootstrap tasks; persist plan/review findings to disk incrementally.
- **Critical Thinking:** traced `file:line` proof, confidence >80%, never guess.
- **Incremental Persistence:** append findings per file to report; never hold in memory.
- **Sub-Agent Return Contract:** sub-agents return summary-only with `Full report:` pointer.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** read handler source BEFORE writing ANY assertion — domain logic first, test code second
**IMPORTANT MUST ATTENTION** NEVER write smoke-only tests — every test MUST assert specific field values in the database
**IMPORTANT MUST ATTENTION** ALWAYS wrap DB assertions in the project's async polling helper — no exceptions
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
