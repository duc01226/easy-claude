# `/investigate --mode=debug` — root-cause investigation reference

> Loaded by `investigate/SKILL.md`'s Mode Dispatch when invoked as `/investigate --mode=debug [bug description]`. This contract REPLACES the default read-only code-flow trace for the invocation: reproduce the bug, trace it end-to-start, test hypotheses, pinpoint the root cause, validate it with `/why-review`, then hand off to `/fix`. It never patches code. The default `/investigate` flow, its Phase 0 scope table and its Output Format do not apply; its `file:line` evidence rule and READ-ONLY rule bind this mode too (the code graph stays optional advice).

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Deliver a `/why-review`-validated root cause at the lowest invariant-owning layer with `file:line` proof; investigate only so `/fix` corrects causes, not symptoms, or report "hypothesis, not confirmed" with evidence gaps.

**Summary:**

- **Purpose — investigation-ONLY:** Find/pin cause; NEVER patch here. Deliver a `/why-review`-validated cause to `/fix`, or "hypothesis, not confirmed" with evidence gaps.
- **Ordered phases:** (0) Classify bug type and route `debugger` / `performance-optimizer` / `security-auditor`; (0.5) failing/flaky integration test ONLY: READ the protocol (never invoke) and emit one verdict; (1) Reproduce; (2) Hypothesize 2-3 ranked theories; (3) Trace END-to-START from Frame 0 through reader → storage/projection → writer → consumer/job → producer, including ALL feeder paths; (4) Confirm one cause explains ALL symptoms and no bypasses; (5) validate via `/why-review`; (6) report the confidence-tagged finding, then `/fix`.
- **Modes and gates:** Phase 0 is BLOCKING; Phase 0.5 applies only to failing integration tests; the code graph is optional advice (stale-able hint, never required); `/why-review` runs in the SAME main session, 2 failed rounds → STOP/`AskUserQuestion`; a direct call asks no workflow question, and standalone completion asks `workflow`, `/fix`, `/plan`, or manual continuation.
- **Core evidence:** Bad state enters where written, so fix at the LOWEST invariant-owning layer, NEVER the crash site. Every root-cause claim needs `Confidence: X%` + `file:line`; below 60% report an unconfirmed hypothesis with named gaps.

**Workflow:**

1. **Classify** — Detect bug scenario type (Phase 0) → route to specialized agent
1.5. **Adjudicate** — Failing integration test? Read `/integration-test --mode=review` gates (Phase 0.5) → emit fault verdict before tracing
2. **Reproduce** — Confirm expected vs actual with evidence
3. **Hypothesize** — Form 2-3 ranked theories
4. **Trace** — Follow code paths; collect `file:line` proof per hypothesis
5. **Confirm** — Single root cause explains ALL symptoms
6. **Validate** — Trigger `/why-review` on findings/root cause before declaring confirmed
7. **Report** — Confidence-tagged finding + hand off to `/fix`

**Key Rules:**

- **AI surface?** Only if the defect sits in, or its fix changes, a model call, prompt, agent, tool/MCP, retrieval or eval (see `node .claude/scripts/ai-signal-scan.cjs`): read `.claude/skills/shared/protocols/ai-engineering-gate.md`; reproduce from recorded inputs and traces (`AE-6`, `AE-7`), not one sampled output; otherwise skip this line.
- NEVER patch symptoms — trace full call chain, fix at owning layer
- NEVER report root cause without `file:line` evidence
- NEVER declare confirmed root cause without passing the `/why-review` validation gate
- Output: confirmed root cause OR "hypothesis, not confirmed" + evidence gaps

## Phase 0: Classify Bug Scenario (BLOCKING — Do Before ANY Investigation)

**Think:** Which failure type? Classification routes the agent and evidence priorities.

| Bug Type                    | Signals                                                 | Specialized Agent                  |
| --------------------------- | ------------------------------------------------------- | ---------------------------------- |
| Frontend UI / rendering     | Console errors, visual regression, component state      | `debugger`                         |
| Backend logic / data        | Wrong API response, data corruption, validation failure | `debugger`                         |
| Cross-service / message bus | Events not propagating, consumer failures, sync lag     | `debugger` (an optional graph trace may hint) |
| Performance / memory        | Slow queries, OOM, N+1, unbounded result sets           | `performance-optimizer`            |
| Security / auth             | Access denied, token issues, permission bypass          | `security-auditor`                 |
| **Failing / flaky integration test** | A test that was green now fails, fails intermittently, or fails only in a full-suite run | `debugger` + **READ the `/integration-test --mode=review` protocol FIRST** (see Fault Adjudication below) |

**Cross-service bugs:** grep/read the producers and consumers first; an optional graph trace can hint at implicit bus connections grep misses (it may be stale — verify by reading); **OOM / memory exhaustion:** check row COUNT before row SIZE because unbounded queries are the more common cause; triage (1) missing DB filter? (2) excessive row size?

### Phase 0.5: Fault Adjudication — failing integration tests (BLOCKING for that bug type)

> **Think:** A failing test has TWO defendants: source or test. Tracing source first ASSUMES the test is right and can rationalize a broken invariant into green. Decide *whose fault* before *where to trace*.

> **Integration Test Review** — Eight gates check assertion value, data state, repeatability, handler/domain alignment, spec traceability, test/code/docs sync, changed-behavior coverage, and scenario fidelity. Use them to distinguish TEST-WRONG, TEST-NOT-OPTIMAL, SOURCE-WRONG, ENVIRONMENT-BLOCKED, and AMBIGUOUS before source tracing; never weaken assertions or mask timing.
>
> **MUST ATTENTION READ** `.claude/skills/integration-test/references/mode-review.md` §"Single Review Pass — Eight Gates" for full details.

**Step 1 — NEVER invoke the skill.** Apply the protocol read above. Gates 1 (assertion value), 3 (repeatability), 4 (domain logic), and 8 (scenario fidelity) expose faulty tests: dead/always-true assertion, non-unique ID, assertion on fields the handler never writes, or unreachable setup.

> **MUST NOT invoke `/integration-test --mode=review` from here — READ its protocol instead.** Inside `integration-test --mode=verify --fix-loop`, this mode already runs in the SAME round as an explicit `/integration-test --mode=review` call (`integration-test/references/fix-loop.md` → FL-1 step 5); invoking it again runs a 9-phase audit twice per round — the duplicate-ownership defect that loop removes (its "Why this mode exists"). The loop OWNS the invocation. — why: standalone, reading also suffices — investigation is this mode's only deliverable.

**Step 2 — emit ONE fault verdict before any trace.**

| Verdict | Meaning | Where to trace next |
| --- | --- | --- |
| **TEST-WRONG** | Stale assertion, wrong setup, non-unique data, unreachable scenario | The test's own root cause — fix the assertion/setup at its root, NEVER weaken it |
| **TEST-NOT-OPTIMAL** | Test is right but fragile — timing, shared state, ordering dependence | The fragility's source (missing ARRANGE barrier, shared infra assertion) |
| **SOURCE-WRONG** | Production code violates the spec or a clear invariant | Normal end-to-start trace to the invariant-owning layer; KEEP or strengthen the test |
| **ENVIRONMENT-BLOCKED** | Config, DB, credentials, ports, versions | Mark BLOCKED — do not trace application code |
| **AMBIGUOUS** | Spec silent or contradictory about which side is correct | **STOP and ask the user** via `AskUserQuestion` — never self-resolve |

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

### Dim 3: End-to-Start Debugger Trace

**Think:** What final output proves the bug? Which reader and storage/projection/write path fed it? Where does bad state ENTER, not CRASH? Which layer owns the invariant?

- Name Frame 0: observed final state (UI, API response, log, persisted value, assertion, aggregate)
- Identify final reader/query/renderer/assertion and consumed state
- Walk backward: reader -> storage/projection/cache -> writer -> consumer/handler/job -> producer/origin
- Enumerate all feeder paths writing the same final state
- Check error paths; collect `file:line` evidence per hypothesis; an optional graph trace may hint at implicit connections (event handlers, bus consumers) — verify by reading

### Dim 4: Confirm

**Think:** Does one cause explain ALL symptoms? Do bypass paths skip the fix point?

- Match evidence to one root cause; verify it explains ALL observed symptoms
- Check secondary factors; build hypothesis matrix: primary, contributing, ruled out, latent, unknown
- Resolve or disclose competing causes before proposing a fix; verify no bypass paths (direct construction, clone/spread without re-validation, mutations outside model layer)

### Dim 5: Report

- Output confirmed root cause + evidence chain; include affected files, Debugger Trace: End -> Start, feeder paths, hypothesis matrix, data flow, owning fix layer, fix recommendation, forward convergence proof
- Hand off to `/fix` for implementation
- Persist the report to `tmp/reports/debug-investigate-{YYMMDD}-{slug}.md`, appended incrementally; the prefix is what `/fix`'s Root-Cause Prerequisite Gate recognizes as same-session evidence

## Dependency Tracing (optional advice)

Optional: when grep and reading files alone may not reveal a high-risk blast radius (shared contract, many callers, cross-module/cross-service flow, public API), the code graph (`.code-graph/graph.db`) can add callers, dependents and impacted tests. Treat it as a hint, NOT proof: the graph can be stale or incomplete (it lags uncommitted edits and unindexed paths) — verify anything that matters by reading the files/grep. Skip it for low-risk or local changes.

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

The graph may surface implicit MESSAGE_BUS/event-handler connections across services that grep cannot see; confirm each by reading the code.

## Root Cause Validation (`/why-review` Gate)

NEVER declare a confirmed root cause straight from investigation. Run `/why-review` on findings and cause — SAME session, SAME main agent (do NOT spawn a sub-agent) — before `/fix`.

**Step 1 — Investigate (main agent):** Identify root cause + full evidence chain; write findings to report.

**Step 2 — Validate (`/why-review`, same main agent):** Trigger it on findings/cause. The gate must confirm:

- Root cause is correct and reasonable, with `file:line` evidence that conclusively supports it
- Evidence has no gaps and explains ALL symptoms
- The proposed fix direction would NOT introduce other bugs or regressions (check downstream consumers, bypass paths, owning layer)

**Decision:**

- `/why-review` PASSES → declare confirmed, proceed to `/fix`
- `/why-review` finds GAPS/risks → collect additional evidence, repeat
- 2 validation rounds without passing → STOP, escalate to user via `AskUserQuestion`

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
| "Skip `/why-review`, findings look solid" | Self-confirmed findings rationalize their own gaps. The `/why-review` gate is non-negotiable. |

---

## Next Steps (Standalone only — skip only when `nested=true`: THIS run is a step of a `[Workflow]` row with its own linked phase tasks; a `[Workflow]` row that merely exists in `TaskList`, such as an abandoned one, does not count)

**MUST ATTENTION** after completion, use `AskUserQuestion`; NEVER auto-decide next step:

- **"Proceed with full workflow (Recommended)"** — detect best workflow to continue from here
- **"/fix"** — apply fix based on debug findings
- **"/plan"** — if fix requires planning first
- **"Skip, continue manually"** — user decides

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting, including each file read — prevents long-file context loss.

- `domain-entities-reference.md` under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

## Mode protocols

The protocols below apply to this mode only; their full text is inline so this reference is self-contained. `end-to-start-debugger-trace` is inline here because the debug flow runs it; the `investigate` skill also carries it, plus `cross-service-check`, `environment-fault-hypothesis`, `fix-layer-accountability`, `nested-task-creation`, `parallel-subagent-dispatch`, `root-cause-debugging`, `sequential-thinking-protocol`, `source-test-drift-check`, `task-tracking-external-report` and `understand-code-first` (and their digests), as guide lines.

<!-- SYNC:end-to-start-debugger-trace -->

> **End-to-Start Debugger Trace** — For non-trivial bugs, failed verification, regression fixes, behavior-changing code, or unclear code flow, start from the observed final state and walk backward before proposing a fix.
>
> 1. **Frame 0: observed end state** — Name the exact user-visible output, failing assertion, log line, persisted value, API response, rendered UI, or aggregate bucket. Record the reader/query/renderer that produced it with `file:line` evidence.
> 2. **Walk backward one hop at a time** — Trace final reader -> projection/cache/storage -> writer -> consumer/handler/job -> producer/caller -> original trigger. At every hop record: input, transformation, output, owner, and evidence.
> 3. **Enumerate all feeder paths** — Find every upstream producer/caller/event/job that can write into the final path, including retry, async, cache, background, and alternate UI/API paths. Mark each path verified, ruled out, or still unknown.
> 4. **Build the hypothesis matrix** — For each plausible cause, list evidence for, evidence against, how to reproduce/verify, blast radius, and status (`primary`, `contributing`, `ruled out`, `latent`). Do not fix until competing causes are explicitly resolved or bounded.
> 5. **Choose the owning fix layer** — Identify the invariant owner and select the authoritative correction and enforcement points from traced contracts and the project's architecture. Keep validation at untrusted boundaries. Choose a shared point only when evidence shows it owns the invariant for those consumers. A fix at the symptom site is rejected unless the symptom site owns the invariant.
> 6. **Prove convergence forward** — After choosing the fix, walk start -> end again and show how the corrected state reaches the observed final output. Map each root cause to a fix part and each fix part to a test/proof.
>
> **BLOCKED until:** final state named · backward trace written · all feeder paths enumerated · hypothesis matrix completed · owning fix layer justified · forward convergence proof mapped to tests.
>
> **NEVER:** Start at the first suspicious code path. Collapse multiple producers into one "flow". Treat duplicate symptoms as duplicate records without proving the read model. Skip ruled-out hypotheses.

<!-- /SYNC:end-to-start-debugger-trace -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Do not present inference as fact; ground material claims in evidence appropriate to the task.
>
> 1. Cite `file:line` for repository claims, configuration or reference paths for project rules, and URLs or artifact locations for external or observed claims.
> 2. State confidence when a conclusion is uncertain; verify material assumptions before acting and withhold recommendations when evidence is insufficient.
> 3. Trace the consumers, boundaries, or dependencies that exist in the affected path; do not assume services, modules, or architectural styles that the project does not use.
> 4. "I don't have enough evidence" is valid and expected output.
>
> **BLOCKED until:** material claims have traceable evidence, relevant searches are complete, and uncertainties are stated. Search comparable patterns when the task has existing implementations; record when none are available.
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

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

<!-- SYNC:red-flag-stop-conditions -->

> **Red Flag Stop Conditions** — STOP and escalate to user via AskUserQuestion when:
>
> 1. Confidence drops below 60% on any critical decision
> 2. Changes would affect >20 files (blast radius too large)
> 3. Cross-service boundary is being crossed
> 4. Security-sensitive code (auth, crypto, PII handling)
> 5. Breaking change detected (interface, API contract, DB schema)
> 6. Test coverage would decrease after changes
> 7. Approach requires technology/pattern not in the project
>
> **NEVER proceed past a red flag without explicit user approval.**

<!-- /SYNC:red-flag-stop-conditions -->

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

<!-- SYNC:test-failure-fault-adjudication -->

> **Test-Failure Fault Adjudication** — When a test fails (or you are debugging or fixing a failure), the job is to determine *who is at fault — the source code or the test code*. Getting that verdict right matters more than turning the suite green. Binds every debug / fix / test skill identically.
>
> 1. **Provisional verdict before touching either side.** Classify the observed evidence as SOURCE-WRONG, TEST-WRONG, TEST-NOT-OPTIMAL, ENVIRONMENT-BLOCKED, or AMBIGUOUS; then `/investigate --mode=debug` and trace end-to-start before editing. A green-again suite is NOT the goal.
> 2. **Triangulate against the owner artifact AND the source.** Use the business root selected by `specRoots.business.path`, following the framework config loader's fallback only when the project leaves it unset. Resolve `specArtifacts`: when valid, read its configured `intent/contracts/evidence` sections and locate native cases through configured carriers; when absent, use the strict-default §3 AC / §4 BR / §5 invariant / §8 TC sections. A malformed or unsupported declaration blocks without fallback. Inspect the assertion tied to owner + case/scenario ID + optional variant. The canonical intent decides expected behavior — compare BOTH production source and failing test against it. With no spec, use documented intent / acceptance criteria / caller contract and name that limit. Decide from evidence whether SOURCE or TEST is wrong.
> 3. **Classify who is at fault, then fix the wrong side at its root:**
>     - **SOURCE-WRONG** — production code violates the spec's intended behavior or a clear invariant → fix the source at the owning layer; keep or strengthen the test that caught it.
>     - **TEST-WRONG** — the test encodes a stale or incorrect assertion, setup, or expectation that contradicts intended behavior → fix the test at its root. NEVER weaken an assertion, add a skip, or relax a timeout to force green.
>     - **TEST-NOT-OPTIMAL** — intended behavior is valid but the test seam, timing, or assertion signal is fragile → improve the test without weakening the invariant.
>     - **ENVIRONMENT-BLOCKED** — infrastructure, setup, or external state — including transient resource pressure (RAM/OOM, CPU saturation, disk or temp exhaustion, handle and connection-pool limits, network flakiness, a timeout that is really slowness) — prevents a source/test verdict → preserve diagnostics (exact command, exit code, full output, resource evidence), name the environment remedy, and STOP mutating source or tests until the environment is healthy. This verdict is a FIRST-CLASS candidate weighed in step 1 alongside SOURCE-WRONG and TEST-WRONG — never a fallback reached only after the code looks fine; run `SYNC:environment-fault-hypothesis` to rule it in or out with a stated discriminator. A failure that vanishes on retry stays UNEXPLAINED until its mechanism is named — "flaky" is a symptom, not a verdict.
>     - **AMBIGUOUS** — evidence or intended behavior does not safely select an owner → ask the user or canonical owner before editing.
>     - NEVER change a test to match broken source, and NEVER change source to satisfy a broken test. (Migration code excluded — schema/data migrations are one-time execution paths, not core application logic.)
> 4. **Ask the user when intended behavior is unclear.** If no owner artifact covers the behavior, the configured sections are silent, or the owner is ambiguous about which side is correct, STOP and ask the user or canonical spec owner before editing either side — never silently pick source or test just to make the suite pass.
>
> Reconcile to intended behavior, never to whichever side currently passes — green can encode the very bug.
>
> **Read-only/report-only role boundary:** when this block is carried by a report-only role (`code-reviewer`, `spec-compliance-reviewer`, `tester`, and any other agent whose definition declares it never edits source), "fix the wrong side" means RETURN the adjudicated verdict and the proposed repair to the parent — do not modify source, tests, generated carriers, or user data. The adjudication is the deliverable; the edit is the caller's. Without this sentence the block's step-3 imperatives read as write authority and directly contradict those agents' own declarations (e.g. `tester.md` "NEVER implement fixes"), which is the sibling `SYNC:double-round-trip-review` boundary applied to the same class of carrier.

<!-- /SYNC:test-failure-fault-adjudication -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this mode; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Deliver a `/why-review`-validated root cause at the lowest invariant-owning layer with `file:line` proof; investigate only so `/fix` corrects causes, not symptoms, or report "hypothesis, not confirmed" with evidence gaps.

**IMPORTANT MUST ATTENTION — Main steps/modes/gates:** Investigation-only: (0) Classify bug type and route specialist → (0.5) failing/flaky integration test ONLY: read the `integration-test --mode=review` protocol, never invoke it, emit one verdict → (1) Reproduce → (2) Hypothesize 2-3 ranked theories → (3) Trace END-to-START from Frame 0 through reader → storage/projection → writer → consumer/job → producer and ALL feeder paths → (4) Confirm one cause explains ALL symptoms and no bypasses → (5) validate with `/why-review` → (6) report confidence-tagged finding → `/fix`.
**IMPORTANT MUST ATTENTION — Routing/terminal behavior:** Phase 0 is BLOCKING; Phase 0.5 is conditional; the code graph is optional advice; `/why-review` runs in the SAME main session, 2 failed rounds → STOP/`AskUserQuestion`; a direct call asks no workflow question; standalone completion asks `workflow`, `/fix`, `/plan`, or manual continuation.

**Protocols in force (concise digest of the SYNC/shared blocks this mode carries):**

- **End-to-Start Debugger Trace:** MUST ATTENTION trace backward from final state.
- **Root Cause Debugging:** reproduce, isolate, trace — NEVER guess-and-check.
- **Incremental Persistence:** append findings to report per file.
- **Sub-Agent Return Contract:** return summary only, full report on disk.
- **Source/Test Drift Check:** changed behavior — reconcile affected tests from evidence.
- **Test-Failure Fault Adjudication:** decide whether the source or the test is at fault before editing either.
- **Nested Task Creation:** expand child phases, link parent when nested.
- **Task Tracking & External Report:** bootstrap tasks, persist findings incrementally.
- **Sequential Thinking:** multi-step Thought N/M with confidence closer.
- **Understand Code First:** read code, grep 3+ patterns before concluding.
- **Evidence:** cite `file:line`, declare confidence — NEVER speculate.
- **Cross-Service Check:** scan producers/consumers/sagas/contracts for silent regressions.
- **Red Flag Stop Conditions:** escalate on confidence/blast/boundary/security flags.
- **Fix-Layer Accountability:** fix lowest invariant-owning layer — NEVER crash site.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** investigation-ONLY — NEVER patch here; hand confirmed cause to `/fix` — why: a fix from un-validated findings patches the symptom and masks the real defect.
**IMPORTANT MUST ATTENTION** Phase 0 FIRST (BLOCKING) — classify bug type, route to the specialized agent (`debugger` / `performance-optimizer` / `security-auditor`) before any investigation — why: classification decides which evidence matters and which agent has the right checklist.
**IMPORTANT MUST ATTENTION** NEVER fix at the crash site — trace full data flow origin → crash, fix at the lowest invariant-owning layer that protects ALL downstream consumers — why: the crash site is a symptom; scattered guards at consumers signal nobody owns the invariant.
**MUST ATTENTION** trace END-to-START — name Frame 0 (observed final state), walk reader → storage/projection → writer → consumer/job → producer, enumerate ALL feeder paths, build the hypothesis matrix BEFORE proposing any fix — why: the bug enters where bad state is WRITTEN, not where it crashes.
**MUST ATTENTION** every root-cause claim carries `Confidence: X%` + `file:line` proof; <60% → report "hypothesis, not confirmed" with named evidence gaps, NEVER a guess — why: self-confirmed findings rationalize their own gaps.
**MUST ATTENTION** NEVER declare a confirmed root cause without passing the `/why-review` gate (SAME session, SAME main agent, NO sub-agent); 2 rounds without passing → STOP, escalate via `AskUserQuestion`.
**MUST ATTENTION** search 3+ existing patterns and READ the actual code before concluding — cite `file:line`; inference alone is insufficient — why: trial-and-error and assumed APIs hallucinate causes.
**MUST ATTENTION** failing/flaky integration test → run **Phase 0.5 Fault Adjudication BEFORE any trace**: READ the `/integration-test --mode=review` protocol (8 assertion-quality / repeatability / domain-logic / scenario-fidelity gates) — NEVER invoke that skill, the verify loop owns the invocation — then emit ONE verdict: TEST-WRONG · TEST-NOT-OPTIMAL · SOURCE-WRONG · ENVIRONMENT · AMBIGUOUS (→ STOP and ask) — why: without that verdict the trace targets the wrong side and can rationalize a broken invariant as green.
**Optional advice:** on a cross-service flow grep may miss, a graph trace can hint at MESSAGE_BUS consumers and event handlers — it may be stale; verify by reading. Never required.
**MUST ATTENTION** prove convergence FORWARD after choosing the fix layer — walk start → end, map each root cause to a fix part and each fix part to a test/proof.
**MUST ATTENTION** OOM/memory → check row COUNT before row SIZE (unbounded query > large row); 3+ failed fixes → STOP, question the architecture, escalate to user.
**MUST ATTENTION** bootstrap `TaskCreate` task tracking BEFORE first file read; persist findings incrementally to `tmp/reports/`; return the investigation findings without modifying target code or applying fixes.

**Anti-Rationalization:**

| Evasion                                  | Rebuttal                                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| "I see the problem, let me fix it"       | Symptom ≠ root cause. This mode is investigation-ONLY — trace end-to-start first.              |
| "Too simple for Phase 0"                 | Root-cause assumptions waste more time than classification. Apply Phase 0 anyway.             |
| "Skip `/why-review`, findings look solid"| Self-confirmed findings rationalize their own gaps. The `/why-review` gate is non-negotiable.  |
| "It's OOM, must be a large object"       | Check row COUNT before row SIZE. Unbounded query > large single row.                           |
| "Just try changing X and see"            | One hypothesis at a time. Scientific method, not trial and error.                             |

**IMPORTANT MUST ATTENTION** investigation-ONLY: trace end-to-start to the invariant-owning layer, NEVER patch here.
**IMPORTANT MUST ATTENTION** every root-cause claim needs `Confidence: X%` + `file:line` proof; <60% = "hypothesis, not confirmed", NEVER a guess.
**IMPORTANT MUST ATTENTION** NEVER declare confirmed without the `/why-review` gate; `TaskCreate` before starting.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
