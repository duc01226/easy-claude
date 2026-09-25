---
name: debug-investigate
description: '[Fix & Debug] Use when a workflow step or the user asks for a bug''s root cause. Reproduce, trace end-to-start, test hypotheses and pinpoint the defect before any fix.'
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
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

**Situation-based docs** (pick by the phase you are about to enter — plan/investigate, edit, test, spec/doc, review — and read only docs the project selects in `referenceDocs` that exist):
- Planning, investigation, or design: `project-structure-reference.md`, `domain-entities-reference.md`, plus the docs below for every file type the plan touches
- Editing or writing code: `code-review-rules.md` plus the backend or frontend docs below for the file type
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md` (or the configured styling reference), `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Test-data seeders: `seed-test-data-reference.md`
- Code review/audit work: `code-review-rules.md` plus the docs above for every file type under review
- Per-file conventions (`contextGroups[]`): before editing an unfamiliar path class, run `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`

**Dedup:** a doc counts as loaded only when your own read returned its full content to this context after the last compaction and within roughly the last 200K tokens, and it has not changed since — cite it `(loaded)` instead of re-reading. A hook reminder, a summary, or a prior mention never counts; a delegated sub-agent starts empty, so name the resolved doc paths in its brief.

Never read all docs blindly: route from `docs-index-reference.md` and open only what the task needs.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Deliver a `$why-review`-validated root cause at the lowest invariant-owning layer with `file:line` proof; investigate only so `$fix` corrects causes, not symptoms, or report "hypothesis, not confirmed" with evidence gaps.

**Summary:**

- **Purpose — investigation-ONLY:** Find/pin cause; NEVER patch here. Deliver a `$why-review`-validated cause to `$fix`, or "hypothesis, not confirmed" with evidence gaps.
- **Ordered phases:** (0) Classify bug type and route `debugger` / `performance-optimizer` / `security-auditor`; (0.5) failing/flaky integration test ONLY: READ the protocol (never invoke) and emit one verdict; (1) Reproduce; (2) Hypothesize 2-3 ranked theories; (3) Trace END-to-START from Frame 0 through reader → storage/projection → writer → consumer/job → producer, including ALL feeder paths; (4) Confirm one cause explains ALL symptoms and no bypasses; (5) validate via `$why-review`; (6) report the confidence-tagged finding, then `$fix`.
- **Modes and gates:** Phase 0 is BLOCKING; Phase 0.5 applies only to failing integration tests; `graph.db` requires graph trace; `$why-review` runs in the SAME main session, 2 failed rounds → STOP/ask the user directly; outside a workflow ask the user to choose `workflow-bugfix` or direct `$debug-investigate`, and standalone completion asks `workflow`, `$fix`, `$plan`, or manual continuation.
- **Core evidence:** Bad state enters where written, so fix at the LOWEST invariant-owning layer, NEVER the crash site. Every root-cause claim needs `Confidence: X%` + `file:line`; below 60% report an unconfirmed hypothesis with named gaps.

**Workflow:**

1. **Classify** — Detect bug scenario type (Phase 0) → route to specialized agent
1.5. **Adjudicate** — Failing integration test? Read `$integration-test-review` gates (Phase 0.5) → emit fault verdict before tracing
2. **Reproduce** — Confirm expected vs actual with evidence
3. **Hypothesize** — Form 2-3 ranked theories
4. **Trace** — Follow code paths; collect `file:line` proof per hypothesis
5. **Confirm** — Single root cause explains ALL symptoms
6. **Validate** — Trigger `$why-review` on findings/root cause before declaring confirmed
7. **Report** — Confidence-tagged finding + hand off to `$fix`

**Key Rules:**

- NEVER patch symptoms — trace full call chain, fix at owning layer
- NEVER report root cause without `file:line` evidence
- NEVER declare confirmed root cause without passing the `$why-review` validation gate
- Output: confirmed root cause OR "hypothesis, not confirmed" + evidence gaps

## Phase 0: Classify Bug Scenario (BLOCKING — Do Before ANY Investigation)

**Think:** Which failure type? Classification routes the agent and evidence priorities.

| Bug Type                    | Signals                                                 | Specialized Agent                  |
| --------------------------- | ------------------------------------------------------- | ---------------------------------- |
| Frontend UI / rendering     | Console errors, visual regression, component state      | `debugger`                         |
| Backend logic / data        | Wrong API response, data corruption, validation failure | `debugger`                         |
| Cross-service / message bus | Events not propagating, consumer failures, sync lag     | `debugger` + graph trace MANDATORY |
| Performance / memory        | Slow queries, OOM, N+1, unbounded result sets           | `performance-optimizer`            |
| Security / auth             | Access denied, token issues, permission bypass          | `security-auditor`                 |
| **Failing / flaky integration test** | A test that was green now fails, fails intermittently, or fails only in a full-suite run | `debugger` + **READ the `$integration-test-review` protocol FIRST** (see Fault Adjudication below) |

**Cross-service bugs:** Run graph trace FIRST — grep misses implicit bus connections; **OOM / memory exhaustion:** check row COUNT before row SIZE because unbounded queries are the more common cause; triage (1) missing DB filter? (2) excessive row size?

### Phase 0.5: Fault Adjudication — failing integration tests (BLOCKING for that bug type)

> **Think:** A failing test has TWO defendants: source or test. Tracing source first ASSUMES the test is right and can rationalize a broken invariant into green. Decide *whose fault* before *where to trace*.

> **Integration Test Review** — Eight gates check assertion value, data state, repeatability, handler/domain alignment, spec traceability, test/code/docs sync, changed-behavior coverage, and scenario fidelity. Use them to distinguish TEST-WRONG, TEST-NOT-OPTIMAL, SOURCE-WRONG, ENVIRONMENT-BLOCKED, and AMBIGUOUS before source tracing; never weaken assertions or mask timing.
>
> **MUST ATTENTION READ** `.claude/skills/integration-test-review/SKILL.md` §"The 8 Quality Gates" for full details.

**Step 1 — NEVER invoke the skill.** Apply the protocol read above. Gates 1 (assertion value), 3 (repeatability), 4 (domain logic), and 8 (scenario fidelity) expose faulty tests: dead/always-true assertion, non-unique ID, assertion on fields the handler never writes, or unreachable setup.

> **MUST NOT invoke `$integration-test-review` from here — READ its protocol instead.** Inside `integration-test-verify --fix-loop`, this skill already runs in the SAME round as an explicit `$integration-test-review` call (`integration-test-verify/SKILL.md` → FL-1 step 5); invoking it again runs a 9-phase audit twice per round — the duplicate-ownership defect that loop removes (its "Why this mode exists"). The loop OWNS the invocation. — why: standalone, reading also suffices — investigation is this skill's only deliverable.

**Step 2 — emit ONE fault verdict before any trace.**

| Verdict | Meaning | Where to trace next |
| --- | --- | --- |
| **TEST-WRONG** | Stale assertion, wrong setup, non-unique data, unreachable scenario | The test's own root cause — fix the assertion/setup at its root, NEVER weaken it |
| **TEST-NOT-OPTIMAL** | Test is right but fragile — timing, shared state, ordering dependence | The fragility's source (missing ARRANGE barrier, shared infra assertion) |
| **SOURCE-WRONG** | Production code violates the spec or a clear invariant | Normal end-to-start trace to the invariant-owning layer; KEEP or strengthen the test |
| **ENVIRONMENT-BLOCKED** | Config, DB, credentials, ports, versions | Mark BLOCKED — do not trace application code |
| **AMBIGUOUS** | Spec silent or contradictory about which side is correct | **STOP and ask the user** by asking the user directly — never self-resolve |

> **Development Rules** — Task steps need observable verification; changes stay surgical; tests protect intent; failed tests require fault adjudication; NEVER weaken assertions, add skips, relax timeouts, or alter source merely to force green.
>
> **MUST ATTENTION READ** `.claude/docs/development-rules.md` for full project rules.

**Step 3 — governing law.** Project lesson: *"Test failure → record a provisional verdict before trace/edit, then investigate"*, canonical in `CLAUDE.md` and restated in `.claude/docs/development-rules.md`: *"NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green."* (`AGENTS.md` is the GENERATED Codex mirror; cite canonical `CLAUDE.md`, never the mirror.) Green is not the goal; fix the verdict-named party at its owning layer. Silent/ambiguous spec → STOP and ask.

## Debug Mindset (NON-NEGOTIABLE)

**Skeptical. Sequential. Every claim needs traced proof; confidence >80%.**

- NEVER assume first hypothesis — verify with actual code traces; every root-cause claim MUST include `file:line` evidence
- Cannot prove cause → state "hypothesis, not confirmed"
- Challenge cause and completeness → trace execution and related paths

## Confidence & Evidence Gate

**MUST ATTENTION** declare `Confidence: X%` + evidence list + `file:line` proof for EVERY claim.

| Confidence | Meaning                                  | Action                               |
| ---------- | ---------------------------------------- | ------------------------------------ |
| 95-100%    | Full trace verified                      | Report as confirmed root cause       |
| 80-94%     | Main path verified, edge cases uncertain | Report with caveats                  |
| 60-79%     | Partial trace                            | Report as hypothesis                 |
| <60%       | Insufficient evidence                    | DO NOT report — gather more evidence |

## Investigation Dimensions

For each dimension: state failure if weak, then apply with evidence.

### Dim 1: Reproduce

**Think:** What exact data, action, timing, or environment triggers this?
- Confirm issue exists with evidence (error message, stack trace, screenshot); identify trigger: user action, data state, timing, env difference

### Dim 2: Hypothesize

**Think:** Which failure modes fit symptoms? What confirms or contradicts each?
- Form 2-3 theories ranked by likelihood; note evidence needed to confirm/contradict each before investigating

### Dim 3: End-to-Start Trace

**Think:** What final output proves the bug? Which reader and storage/projection/write path fed it? Where does bad state ENTER, not CRASH? Which layer owns the invariant?

- Name Frame 0: observed final state (UI, API response, log, persisted value, assertion, aggregate)
- Identify final reader/query/renderer/assertion and consumed state
- Walk backward: reader -> storage/projection/cache -> writer -> consumer/handler/job -> producer/origin
- Enumerate every feeder path writing the same final state
- Check error paths; collect `file:line` evidence per hypothesis; use graph trace for implicit connections (event handlers, bus consumers)

### Dim 4: Confirm

**Think:** Does one cause explain ALL symptoms? Do bypass paths skip the fix point?

- Match evidence to one root cause; verify it explains ALL observed symptoms
- Check secondary factors; build hypothesis matrix: primary, contributing, ruled out, latent, unknown
- Resolve or disclose competing causes before proposing a fix; verify no bypass paths (direct construction, clone/spread without re-validation, mutations outside model layer)

### Dim 5: Report

- Output confirmed root cause + evidence chain; include affected files, Debugger Trace: End -> Start, feeder paths, hypothesis matrix, data flow, owning fix layer, fix recommendation, forward convergence proof
- Hand off to `$fix` for implementation

## Dependency Tracing (MANDATORY when graph.db exists)

**MUST ATTENTION** use structural queries — graph reveals ALL callers/consumers grep misses.

```bash
# Who calls the buggy function
python .claude/scripts/code_graph query callers_of <function> --json

# Who imports the buggy module
python .claude/scripts/code_graph query importers_of <file> --json

# What tests exist
python .claude/scripts/code_graph query tests_for <function> --json

# Full upstream + downstream context
python .claude/scripts/code_graph trace <suspect-file> --direction both --json

# Callers only (find all trigger points)
python .claude/scripts/code_graph trace <suspect-file> --direction upstream --json
```

Graph reveals implicit MESSAGE_BUS/event-handler connections across services — invisible to grep.

## Root Cause Validation (`$why-review` Gate)

NEVER declare a confirmed root cause straight from investigation. Run `$why-review` on findings and cause — SAME session, SAME main agent (do NOT spawn a sub-agent) — before `$fix`.

**Step 1 — Investigate (main agent):** Identify root cause + full evidence chain; write findings to report.

**Step 2 — Validate (`$why-review`, same main agent):** Trigger it on findings/cause. The gate must confirm:

- Root cause is correct and reasonable, with `file:line` evidence that conclusively supports it
- Evidence has no gaps and explains ALL symptoms
- The proposed fix direction would NOT introduce other bugs or regressions (check downstream consumers, bypass paths, owning layer)

**Decision:**

- `$why-review` PASSES → declare confirmed, proceed to `$fix`
- `$why-review` finds GAPS/risks → collect additional evidence, repeat
- 2 validation rounds without passing → STOP, escalate to user by asking the user directly

## Anti-Rationalization (Red Flags)

| Evasion                                | Rebuttal                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| "I see the problem, let me fix it"     | Symptoms ≠ root cause. Investigate first.                                       |
| "Quick fix for now, investigate later" | Quick fixes mask bugs. Find root cause.                                         |
| "Just try changing X and see"          | One hypothesis at a time. Scientific method, not trial and error.               |
| "Already tried 2+ fixes, one more"     | 3+ failed fixes = STOP. Question the architecture, not the fix.                 |
| "The error message is misleading"      | Read it again carefully. Error messages are usually right.                      |
| "It works on my machine"               | Reproduce in the failing environment. Your environment hides bugs.              |
| "This can't be the cause"              | Verify with evidence, not intuition. Unlikely causes are still causes.          |
| "It's OOM, must be a large object"     | Check row COUNT before row SIZE. Unbounded query > large single row.            |
| "Skip `$why-review`, findings look solid" | Self-confirmed findings rationalize their own gaps. The `$why-review` gate is non-negotiable. |
| "Graph.db not needed for this bug"     | Cross-service bugs are invisible to grep. Run trace first.                      |

---

## Workflow Recommendation

**MUST ATTENTION — NO EXCEPTIONS:** Outside a workflow, use ask the user directly:

1. **Activate `workflow-bugfix` workflow** (Recommended) — investigate → debug → plan → fix → review → test
2. **Execute `$debug-investigate` directly** — standalone

---

## Next Steps (Standalone only — skip if inside workflow)

**MUST ATTENTION** after completion, use ask the user directly; NEVER auto-decide next step:

- **"Proceed with full workflow (Recommended)"** — detect best workflow to continue from here
- **"$fix"** — apply fix based on debug findings
- **"$plan"** — if fix requires planning first
- **"Skip, continue manually"** — user decides

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting, including each file read — prevents long-file context loss.

- `domain-entities-reference.md` under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `cross-service-check` — Scan producers, consumers, sagas and shared contracts for cross-service impact; concluding an investigation, plan or spec in a service-based system → .claude/skills/shared/protocols/cross-service-check.md
- `end-to-start-debugger-trace` — Walk backward from the observed end state through every feeder path before fixing; fixing a non-trivial bug, a regression or unclear code flow → .claude/skills/shared/protocols/end-to-start-debugger-trace.md
- `environment-fault-hypothesis` — Weigh the environment as a competing cause, with a named discriminator; judging a bug report, failing test, error or unexpected output → .claude/skills/shared/protocols/environment-fault-hypothesis.md
- `estimation-framework` — Bottom-up estimation with derived story points and a min-max range; estimating effort → .claude/skills/shared/protocols/estimation-framework.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `fix-layer-accountability` — Fix at the component that owns the violated contract, not at the crash site; choosing where to apply a fix → .claude/skills/shared/protocols/fix-layer-accountability.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `red-flag-stop-conditions` — Conditions that require stopping and escalating to the user; debugging or testing stalls or the risk rises → .claude/skills/shared/protocols/red-flag-stop-conditions.md
- `root-cause-debugging` — Systematic root-cause debugging, never guess-and-check; debugging a failure → .claude/skills/shared/protocols/root-cause-debugging.md
- `sequential-thinking-protocol` — Structured multi-step reasoning with revision, branch and hypothesis markers; planning, debugging or reviewing complex or ambiguous work → .claude/skills/shared/protocols/sequential-thinking-protocol.md
- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `test-failure-fault-adjudication` — Decide whether the source or the test is at fault before editing either; a test fails → .claude/skills/shared/protocols/test-failure-fault-adjudication.md
- `understand-code-first` — Read and trace the target and existing patterns before changing code; planning or editing code → .claude/skills/shared/protocols/understand-code-first.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `$project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** debugger trace gate: for non-trivial bug/fix/investigation/review work, start at the observed final output and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/trigger. Enumerate all feeder paths and hypotheses before fixing; select the authoritative invariant owner from project architecture and retain validation at untrusted boundaries. **BLOCKED until** trace, hypothesis matrix, owning fix layer, and forward convergence proof exist.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

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

<!-- SYNC:environment-fault-hypothesis:reminder -->

**MUST ATTENTION** environment-fault gate: a bug, failed test, error, or odd output is NOT proof of a code defect. Sweep environment preconditions (versions, deps/install state, config & env vars, services, ports/network/clock, permissions, leftover state) and resource/transience suspects (RAM, CPU, disk, handles, network, timeouts) as a competing hypothesis, cite the discriminator you ran, and fix an environment cause in the environment — never by editing code or weakening a test. "Flaky" is a symptom, not a verdict.

<!-- /SYNC:environment-fault-hypothesis:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Deliver a `$why-review`-validated root cause at the lowest invariant-owning layer with `file:line` proof; investigate only so `$fix` corrects causes, not symptoms, or report "hypothesis, not confirmed" with evidence gaps.

**IMPORTANT MUST ATTENTION — Main steps/modes/gates:** Investigation-only: (0) Classify bug type and route specialist → (0.5) failing/flaky integration test ONLY: read the integration-test-review protocol, never invoke it, emit one verdict → (1) Reproduce → (2) Hypothesize 2-3 ranked theories → (3) Trace END-to-START from Frame 0 through reader → storage/projection → writer → consumer/job → producer and ALL feeder paths → (4) Confirm one cause explains ALL symptoms and no bypasses → (5) validate with `$why-review` → (6) report confidence-tagged finding → `$fix`.
**IMPORTANT MUST ATTENTION — Routing/terminal behavior:** Phase 0 is BLOCKING; Phase 0.5 is conditional; `graph.db` requires graph trace; `$why-review` runs in the SAME main session, 2 failed rounds → STOP/ask the user directly; outside a workflow ask the user to choose `workflow-bugfix` or direct `$debug-investigate`; standalone completion asks `workflow`, `$fix`, `$plan`, or manual continuation.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **End-to-Start Debugger Trace:** MUST ATTENTION trace backward from final state.
- **Root Cause Debugging:** reproduce, isolate, trace — NEVER guess-and-check.
- **Incremental Persistence:** append findings to report per file.
- **Sub-Agent Return Contract:** return summary only, full report on disk.
- **Source/Test Drift Check:** changed behavior — reconcile affected tests from evidence.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** expand child phases, link parent when nested.
- **Project Reference Docs:** ALWAYS read required project docs, cite them.
- **Task Tracking & External Report:** bootstrap tasks, persist findings incrementally.
- **Critical Thinking:** traced proof per claim, confidence >80%.
- **Sequential Thinking:** multi-step Thought N/M with confidence closer.
- **Understand Code First:** read code, grep 3+ patterns before concluding.
- **Evidence:** cite `file:line`, declare confidence — NEVER speculate.
- **Cross-Service Check:** scan producers/consumers/sagas/contracts for silent regressions.
- **Estimation Framework:** bottom-up hours, derived SP, min-max range.
- **Red Flag Stop Conditions:** escalate on confidence/blast/boundary/security flags.
- **Fix-Layer Accountability:** fix lowest invariant-owning layer — NEVER crash site.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** investigation-ONLY — NEVER patch here; hand confirmed cause to `$fix` — why: a fix from un-validated findings patches the symptom and masks the real defect.
**IMPORTANT MUST ATTENTION** Phase 0 FIRST (BLOCKING) — classify bug type, route to the specialized agent (`debugger` / `performance-optimizer` / `security-auditor`) before any investigation — why: classification decides which evidence matters and which agent has the right checklist.
**IMPORTANT MUST ATTENTION** NEVER fix at the crash site — trace full data flow origin → crash, fix at the lowest invariant-owning layer that protects ALL downstream consumers — why: the crash site is a symptom; scattered guards at consumers signal nobody owns the invariant.
**MUST ATTENTION** trace END-to-START — name Frame 0 (observed final state), walk reader → storage/projection → writer → consumer/job → producer, enumerate ALL feeder paths, build the hypothesis matrix BEFORE proposing any fix — why: the bug enters where bad state is WRITTEN, not where it crashes.
**MUST ATTENTION** every root-cause claim carries `Confidence: X%` + `file:line` proof; <60% → report "hypothesis, not confirmed" with named evidence gaps, NEVER a guess — why: self-confirmed findings rationalize their own gaps.
**MUST ATTENTION** NEVER declare a confirmed root cause without passing the `$why-review` gate (SAME session, SAME main agent, NO sub-agent); 2 rounds without passing → STOP, escalate by asking the user directly.
**MUST ATTENTION** search 3+ existing patterns and READ the actual code before concluding — cite `file:line`; inference alone is insufficient — why: trial-and-error and assumed APIs hallucinate causes.
**MUST ATTENTION** failing/flaky integration test → run **Phase 0.5 Fault Adjudication BEFORE any trace**: READ the `$integration-test-review` protocol (8 assertion-quality / repeatability / domain-logic / scenario-fidelity gates) — NEVER invoke that skill, the verify loop owns the invocation — then emit ONE verdict: TEST-WRONG · TEST-NOT-OPTIMAL · SOURCE-WRONG · ENVIRONMENT · AMBIGUOUS (→ STOP and ask) — why: without that verdict the trace targets the wrong side and can rationalize a broken invariant as green.
**MUST ATTENTION** run a graph trace when `graph.db` exists — `callers_of` / `importers_of` / `tests_for` / `trace` reveal MESSAGE_BUS consumers and event handlers grep cannot see — why: cross-service chains are invisible to text search.
**MUST ATTENTION** prove convergence FORWARD after choosing the fix layer — walk start → end, map each root cause to a fix part and each fix part to a test/proof.
**MUST ATTENTION** OOM/memory → check row COUNT before row SIZE (unbounded query > large row); 3+ failed fixes → STOP, question the architecture, escalate to user.
**MUST ATTENTION** bootstrap task tracking task tracking BEFORE first file read; persist findings incrementally to `tmp/reports/`; return the investigation findings without modifying target code or applying fixes.

**Anti-Rationalization:**

| Evasion                                  | Rebuttal                                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| "I see the problem, let me fix it"       | Symptom ≠ root cause. This skill is investigation-ONLY — trace end-to-start first.             |
| "Too simple for Phase 0"                 | Root-cause assumptions waste more time than classification. Apply Phase 0 anyway.             |
| "Already traced, no graph needed"        | Show `file:line` evidence. No proof = no trace. Run graph trace if `graph.db` exists.          |
| "Skip `$why-review`, findings look solid"| Self-confirmed findings rationalize their own gaps. The `$why-review` gate is non-negotiable.  |
| "This is a frontend bug, no graph"       | Frontend → backend → bus chains exist. Run trace first.                                        |
| "It's OOM, must be a large object"       | Check row COUNT before row SIZE. Unbounded query > large single row.                           |
| "Just try changing X and see"            | One hypothesis at a time. Scientific method, not trial and error.                             |

**IMPORTANT MUST ATTENTION** investigation-ONLY: trace end-to-start to the invariant-owning layer, NEVER patch here.
**IMPORTANT MUST ATTENTION** every root-cause claim needs `Confidence: X%` + `file:line` proof; <60% = "hypothesis, not confirmed", NEVER a guess.
**IMPORTANT MUST ATTENTION** NEVER declare confirmed without the `$why-review` gate; task tracking before starting.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Static Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs` (static quality-protocol composer)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Resolve `specArtifacts` before selecting identity or carrier: use a valid profile, use strict-default TC/test identity only when the profile is absent, and block a malformed or unsupported declaration. Trace every requirement or invariant through decision, task, configured case/test identity and inspected assertion evidence, then carry it through source evidence and canonical docs/spec updates.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Resolve and validate `specArtifacts`: use valid native owner/case/variant identity and assertion-bearing evidence; use strict-default TC/TestSpec only when the profile is absent; block a malformed or unsupported declaration without fallback.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, analyze the task graph (output dependencies, shared write targets) into ordered parallel waves per PARALLELIZE before starting any task, then keep it synchronized as each step starts/completes. Preserve fixed ordering when a skill or workflow explicitly fixes it.
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
**Judgement integrity:** For theory checks, judgements, evaluations and gap hunts, the prompt's premise is a hypothesis — test it AND its opposite with one evidence bar (web-verify external facts), why-review the draft as an inline self-check (run the `why-review` skill only for a formal review/audit/gap-hunt deliverable or a MEDIUM+/consequential issue the inline pass cannot settle), never invent findings or manufacture disagreement ("no material issues" is a valid verdict); end with a `Bias check:` line (`SYNC:judgement-integrity`).
## Common AI Mistake Prevention (System Lessons)

- **Resolve project applicability before using framework examples.** Read the project config and relevant references, then inspect local evidence; honor explicit N/A and never impose a language, framework, architecture layer, styling method, tool, or runtime surface the project does not use.
- **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
- **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
- **Re-read and re-verify after context compaction or resume.** Compaction wipes read state and memory; summaries describe intent, not environment state. Re-read before editing, audit current state (git status, files) before creating anything new, grep-verify sub-agent output — every "completed" claim is a hypothesis until evidence confirms it.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace every consumer before and after a change.** Map referencing files before deleting; after bulk replacements, renames, or extractions, grep ALL consumer file types (templates, configs, catalogs and generated files fail silently) for every old or removed name; trace the full dependency chain of an edited definition; update docs that embed canonical data alongside their source.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Sub-agents: inherit, cover, persist.** Sub-agents know only their agent .md definition — use custom agent types, not built-in Explore. Reconcile the union of assignments against the full target list — category splits miss boundary items. Make the report write the first deliverable, appended per file/section with bounded scope; a truncated run with no report → spawn a narrower scope, never the same prompt.
- **Ownership before action.** When investigating a failure, ask which part owns the behavior before changing anything. Trace the wrong state to the component responsible for its invariant, then make one authoritative correction there.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec if one exists (the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting any constant/limit/flag/cutoff, read comments, git blame, the CALLER's ordering (the guarantee usually runs immediately BEFORE the cited line), and 2+ sibling call sites. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, state) and verify each against evidence. Ask "what would falsify this?" — if nothing, it is not a hypothesis.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem: "Would this change exist if I were not addressing this request?" — if not, remove or disclose it; never silently expand scope.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort ("(1) [N h], (2) [N h]. Which matters?"), list assumptions, name a simpler path when one exists.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC: steel-man a rejected alternative, invert each reason ("what does it sacrifice?"), stress-test the top 2-3 assumptions, run a pre-mortem. Quality = causal reasoning + mitigations + evidence, not section presence.
- **OOM/memory: check row count before row size.** An unbounded query (no DB filter for the trigger) → push the filter to the DB; then large rows → projection. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** For async work (queues, retries, background jobs, caches, replication) assert the final business/entity state — NEVER delivery bookkeeping (consume/send status, attempt counts, last-error, broker/scheduler/outbox rows) that ANY co-running process can write: green alone, flaky once anything shares that broker + database. Gate: "would this hold no matter WHICH process did the work?" Process-local fault injection is a stress amplifier (arm → bounded window → disarm → assert convergence), never a precondition.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Judge the environment before judging the code — a competing hypothesis, not a fallback.** A bug, failed test, error, or odd output is NOT proof of a code defect. Before any verdict, sweep environment preconditions (toolchain/lockfile state, stale build/cache artifacts, env vars and config, service dependencies, ports/clock, OS path/locale, permissions, leftover processes/test data) AND transient resource pressure (RAM/OOM, CPU, disk/temp, handle and connection-pool limits, network, a timeout that is really slowness). Tell-tale: non-deterministic, fails only in parallel, on one machine or only on CI, or an error naming resources. Cite the discriminator you ran (clean environment? path changed? concurrency 1?) — a verdict without one is a guess. Fix an environment cause in the environment; NEVER edit product code or weaken/skip a test to absorb it; a failure that vanishes on retry stays unexplained until its mechanism is named.
- **Cross-platform execution is a required contract.** Before authoring or changing a tool, script, process launcher, path assertion, or filesystem test, name the supported Windows, macOS, and Linux behaviors. Use platform-neutral APIs and literal argv vectors; never infer shell, temp-path, executable-extension, ACL, or symlink semantics from the current host. A documented command gives its Windows, macOS, and Linux form (Python: `py -3` on Windows, `python3` on macOS/Linux; shell: PowerShell/`.cmd` beside POSIX `sh`) or one platform-neutral runner such as `node <script>`. Canonicalize existing paths before identity, hashing, or equality checks; test native Windows and POSIX seams when behavior differs; keep CI platform matrices authoritative. Preserve fail-closed security boundaries — repair the fixture or platform branch, never weaken the guard just to make one OS green.
- **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer must reference NO consumer-specific domain concept (tenant/customer/product IDs, business entities, feature rules); such a leak compiles, runs, and passes review while coupling the layer to one consumer. Push domain fields/logic down into the consumer via subclass/composition.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
