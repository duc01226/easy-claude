# `$architecture --mode=full` — whole-project architecture and production-readiness audit reference

> Loaded by `architecture/SKILL.md`'s Mode Dispatch when invoked as `$architecture --mode=full [scope]`. Formerly `/architecture-review-full`. This contract is the whole invocation: run it exactly as written, standalone or as a workflow step. `$ARGUMENTS` in this file means the invocation text after `--mode=full`.

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

## Quick Summary

**Goal:** Audit the WHOLE project's architecture, scalability, and production readiness in ONE pass: orchestrate three deliberately non-overlapping sibling reviewers, dedup intentional cross-references, and synthesize ONE consolidated Architecture Health Report with one combined verdict — this is a THIN orchestrator; NEVER re-implement child reviews.

**Summary:**
- **Testability contract:** resolve Unit/Integration/System/E2E applicability from runner/config evidence; record owner/root/data, copy-ready full + focused commands, zero-match behavior, CI/simple Windows/macOS/Linux entry, unique run/data identity, and repeat proof; unresolved applicable fields block handoff, while non-applicable tiers require evidence-backed `N/A`.

- **Purpose:** resolve scope once, fan three reviewers out as parallel read-only sub-agents behind an all-return barrier, PROGRESSIVELY synthesize + dedup each child's findings into ONE report file (status `IN PROGRESS` → `FINISHED`), run a `$why-review` fix gate that walks each review face, then finalize the combined verdict. Read-only until findings are validated — fixes route to a downstream `$plan` or feature flow.
- **The three children — deliberately non-overlapping siblings that cross-reference each other, so their findings MUST be deduped:**
  - `architecture --mode=scalability` (subagent `architect`) — project-grading scorecard `/20` + pass/fail gates. ALWAYS grades the project, even under diff scope (project-grader by design, "not the every-change diff reviewer").
  - `architecture --mode=review` (subagent `architect`) — diff/scope-scoped 13-category PASS/WARN/BLOCKED compliance. Its Category 11 delegates full scalability/coupling grading to `architecture --mode=scalability`.
  - `production-readiness-review` (subagent `code-reviewer`) — service/API SRE `/24` + 8-item Extended SRE Readiness gate. `architecture --mode=scalability` routes runtime readiness here.
- **Composition, not copy:** the scorecard and compliance faces are the `scalability` and `review` modes of the same `architecture` skill. Each face's sub-agent runs its own mode (`$architecture --mode=scalability`, `$architecture --mode=review`) and reads that mode's reference (`references/mode-scalability.md`, `references/mode-review.md`) in full FIRST; this reference holds no scoring or compliance logic and never duplicates those bodies. The third face stays the separate `production-readiness-review` skill.
- **This skill runs INLINE** in the main session because it spawns sub-agents; the three children are each 25k–34k tokens and CANNOT run inline together — they MUST be sub-agents.
- **Dedup is the core value.** Because the three siblings intentionally cross-reference each other, the same underlying issue surfaces from multiple angles; record it ONCE citing every source, preserve each child's route-to-sibling pointers. — why: undeduped, three intentionally-cross-referencing reviewers inflate severity counts and bury distinct issues.
- **Coverage sweep + self-audit are orchestrator-only duties (Step 4).** After `Faces merged: 3/3`, sweep the merged report against the design-review script (`architecture-knowledge.md` §20.2) and record every unanswered question as an INFO `Coverage gap` line; frame remaining risk against the five judgments (§20.4); then run the 11 thinking red flags (§20.3) across the merged findings before Step 5. — why: three correctly-in-lane reviewers cannot see a question that belongs to no lane, and synthesis is where their confirmation biases compound.

**Workflow:**

1. **Step 1: Resolve Scope** — `$ARGUMENTS` or ask the user directly; map the chosen scope to each child's args.
2. **Step 2: Load Project Reference Docs Once** — warm shared context before fan-out.
3. **Step 3: Parallel Fan-Out (all-return barrier)** — spawn all three read-only sub-agents in ONE message; advance only after ALL three return.
4. **Step 4: Progressive Synthesis (IN PROGRESS)** — open the ONE consolidated report at status `🚧 IN PROGRESS` when fan-out starts; merge + dedup each child's findings into it AS that child returns — never held in memory to the end; then run the §20.2 coverage sweep and the §20.3 self-audit over the merged set.
5. **Step 5: Fix-Report-Per-Review `$why-review` Gate** — ONE merged `$why-review` pass that walks each of the three review faces + the dedup and fixes the report in place (severities, false positives, dedup-dropped issues).
6. **Step 6: Finalize (FINISHED)** — lock the combined verdict (worst-case rollup) and flip the report status to `✅ FINISHED`.
7. **Next Steps** — ask the user directly: `$plan` (fix validated findings) / `$code-simplifier` / skip.

**Key Rules (top 3 critical first):**

- MUST ATTENTION this is a THIN orchestrator — NEVER re-implement any of the three reviews inline; fan them out as sub-agents and synthesize.
- MUST ATTENTION dedup the intentional overlaps — one underlying issue = one finding citing every reporting child; NEVER let cross-referencing siblings triple-count it.
- MUST ATTENTION read-only until validated — run the Step 5 `$why-review` gate before handoff; fixes route to a downstream `$plan`/feature flow, NEVER applied here.
- Spawn all three sub-agents in ONE message and honor the all-return barrier — advance only after every child returns (`SYNC:parallel-phase-advancement` discipline).
- Write the consolidated report to `tmp/reports/architecture-full-review-{YYMMDD}-{HHmm}-{slug}.md`.

## Your Mission

<task>
$ARGUMENTS
</task>

## Review Mindset (NON-NEGOTIABLE)

Skeptical synthesizer. Judge the three children's reports; do not re-derive them.

- Trust each child's `file:line` evidence, but NEVER inflate severity by counting the same underlying issue three times — dedup first, then rank.
- A finding survives to the report only after the Step 5 `$why-review` gate; an unvalidated sub-agent claim is a hypothesis, not a finding.
- Preserve every route-to-sibling pointer a child emits — the combined report is the union of owned findings, not a re-review.

## Step 1: Resolve Scope (ASK EACH RUN)

Decide audit scope, then map to each child's arguments.

- If `$ARGUMENTS` names files/dirs, or contains `full` / `whole` / `diff` / `changes`, use that directly.
- Else ask the user directly:
  - **"Whole project (Recommended)"** — audit the entire repository.
  - **"Current changes (diff)"** — audit the uncommitted diff only.
  - **"Specific path"** — audit a named service/module/directory.
  - **"New / greenfield foundation"** — grade a foundation being STOOD UP rather than one already running.

**Scope → child args mapping:**

| Chosen scope             | `architecture --mode=scalability`                             | `architecture --mode=review`          | `production-readiness-review`                                               |
| ------------------------ | ------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------- |
| Whole project            | `mode=audit` over the whole repo                              | scope override `full codebase` | args = all backend service/API roots (per `project-structure-reference.md`) |
| Current changes (diff)   | `mode=audit` focused on the services/modules the diff touches | default uncommitted diff       | default uncommitted service/API diff                                        |
| Specific path            | `mode=audit` scoped to that path's services/modules           | scope override = that path     | that path's service/API files                                               |
| New / greenfield foundation | **`mode=init`** over the planned/scaffolded structure      | scope override = the scaffold  | the scaffolded service/API entry points (record `N/A — <evidence>` for anything not yet built) |

> **[GREENFIELD SCOPE]** `mode=init` was previously unreachable through this orchestrator even though the child supports it, so a foundation being created could only be graded with the brownfield rubric. It also flips this skill's `SYNC:engineering-foundation-gate` authority from **advisory** to **BLOCKING** — you are choosing the foundation now, so a `MISSING-WARRANTED` dimension must be an explicit decision, not a silent default.

> **MUST ATTENTION — `architecture --mode=scalability` always grades the PROJECT, even under diff scope.** A project-grader by design ("do not use as the every-change diff reviewer"). Under diff scope it still emits the `/20` scorecard, focused on the services/modules the diff touches — it never degrades into a pure per-line diff reviewer. Document this nuance in the consolidated report so its scorecard is read as a project posture, not a diff verdict.

## Step 2: Load Project Reference Docs Once

Warm shared context BEFORE fan-out so synthesis reasons from the same ground truth the children use. Read once here (each child re-reads what it needs via its own tool calls):

- `docs/project-config.json`
- Under the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path): `project-structure-reference.md`, `backend-patterns-reference.md`, `frontend-patterns-reference.md`, `code-review-rules.md`
- Accepted ADRs under the ADR root (default `docs/adr/**`; a `docsRoots.adr.path` entry in `docs/project-config.json` overrides the path), when present

## Step 3: Parallel Fan-Out (ALL-RETURN BARRIER)

Spawn ALL THREE sub-agents in ONE message. Read-only and independent — no shared mutable state, no ordering dependency. Advance ONLY after EVERY member returns (`SYNC:parallel-phase-advancement`).

Each sub-agent writes its FULL report to `tmp/reports/` and returns ONLY the `SYNC:subagent-return-contract` summary (≤10 finding bullets + report path) — NEVER its full report inline.

| #   | Child skill                       | `agent_type` | Whole-project args                                                   | Diff-scope args                                                                | Emits                             |
| --- | --------------------------------- | --------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------- |
| 1   | `architecture --mode=scalability` | `architect`     | `mode=audit` over whole repo                                         | `mode=audit` focused on the diff's services/modules (still grades the project) | Scorecard `/20` + pass/fail gates |
| 2   | `architecture --mode=review`             | `architect`     | scope override `full codebase`                                       | default uncommitted diff                                                       | 13-category PASS/WARN/BLOCKED     |
| 3   | `production-readiness-review`     | `code-reviewer` | all backend service/API roots (per `project-structure-reference.md`) | default uncommitted service/API diff                                           | SRE `/24` + 8-item gate           |

Brief each sub-agent with its invocation — `$architecture --mode=scalability <args>`, `$architecture --mode=review <args>`, `$production-readiness-review <args>` — and name the file to read in full before its first finding — `.claude/skills/architecture/references/mode-scalability.md` for face 1, `.claude/skills/architecture/references/mode-review.md` for face 2, `.claude/skills/production-readiness-review/SKILL.md` for face 3 (the `architect` agent does not preload the mode references, and a face that skips its reference never loads the mode's gates).

Each sub-agent prompt states: READ-ONLY findings/score mode (no fixes); re-read all target files from scratch via its own tool calls; write full report incrementally to `tmp/reports/`; return only the return-contract summary.

**Each of the three faces feeds TWO validation gates downstream — state this in each sub-agent's prompt so it knows its findings will be adversarially validated, not trusted as-is:** (1) the Step 5 fix-report-per-review `$why-review` gate that walks its face and fixes its findings in the consolidated report; (2) inside `workflow-architecture-audit`, the workflow-level FINAL `$why-review` gate that re-reviews the whole finalized report. A face's findings are hypotheses until they survive both — so every finding it emits MUST carry `file:line` proof + confidence that can withstand validation.

## Step 4: Progressive Synthesis → One Report (status `IN PROGRESS`)

Exactly ONE report file for the whole audit — created ONCE, grown across Steps 4→6, never re-created per review. Open it when fan-out starts and evolve its status through its lifecycle: `🚧 IN PROGRESS` (Step 4) → `🔍 VALIDATING` (Step 5) → `✅ FINISHED` (Step 6).

Write to `tmp/reports/architecture-full-review-{YYMMDD}-{HHmm}-{slug}.md`.

**On fan-out start — create the file with status `🚧 IN PROGRESS`** and a status line naming which of the three review faces have returned so far (e.g. `Faces merged: 0/3`). The single source of truth the whole audit synthesizes into — do NOT hold findings in memory until the end.

**Header — all three sub-scores + ONE combined verdict** (each sub-score is `⏳ pending` until its face returns):

- Scalability Scorecard: `X/20` + verdict (STRONG / NEEDS WORK / HIGH RISK)
- Architecture Compliance: PASS / WARN / BLOCKED
- SRE Readiness: `X/24` + verdict (PASS / NEEDS WORK / NOT READY)
- Testability & Verification Contract: `TVC: PASS | PARTIAL | BLOCKED` or `N/A — evidence`, copied from the child contract result; this is non-scoring and not a fourth review face.
- **Combined Verdict:** `⏳ pending until FINISHED` — computed in Step 6 as the worst-case rollup across the three (any BLOCKED / NOT READY / HIGH RISK dominates). Do NOT assert a combined verdict while status is `IN PROGRESS`.

**Merge each face AS it returns.** All three run behind the Step 3 all-return barrier, so all three summaries are in hand before synthesis — but merge them into the file one face at a time (updating `Faces merged: N/3` each time) so a mid-synthesis context loss leaves the partial report on disk, not in memory. When ≥2 children report the same underlying issue, record it ONCE, citing every source. Dedup on these KNOWN overlap axes (the siblings cross-reference each other here by design):

| Overlap axis                                                            | `architecture --mode=review` face                            | Sibling face(s)                                                                               |
| ----------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Module isolation / loose coupling / horizontal scaling / DRY regression | Category 11 (scalability & coupling regression)       | `architecture --mode=scalability` {module isolation, loose coupling, horizontal scaling, DRY} |
| Quality tooling / CI / observability                                    | Category 0 (quality-tooling baseline)                 | `architecture --mode=scalability` {Build & CI, Observability}                                 |
| Recorded-decision / clean-architecture conformance                      | Category 9 (ADR conformance)                          | `architecture --mode=scalability` {clean architecture}                                        |
| DB performance / capacity ceilings                                      | `production-readiness-review` DB-perf + capacity gate | `architecture --mode=scalability` {horizontal scaling}                                        |
| Technique applicability (advisory) — scale-tier technique matrix         | Category 11 INFO advisory matrix                      | `architecture --mode=scalability` + `production-readiness-review` advisory matrices           |
| Scenario stress (advisory) — big-traffic/big-data/failure/self-heal      | Category 11 INFO scenario-stress matrix               | `architecture --mode=scalability` + `production-readiness-review` scenario-stress matrices     |
| Data / consistency / tenancy — dual write, idempotency, breaking migration, tenant isolation | Category 12 (data, consistency & tenancy boundaries) | `production-readiness-review` {migration safety, rollback}; `security-audit` owns authz depth; `performance-review` owns query-plan depth |

**Merged Testability & Verification Contract (non-scoring):** Copy the `TVC` status and evidence from the `architecture --mode=scalability` child into the consolidated report, then retain the architecture --mode=design/scaffold/harness owner links rather than re-deriving the contract. Use `UNVERIFIED — child result absent` when the child did not emit it; never infer PASS, especially for E2E.

| Tier | Applicability + evidence | Owner | Runner/config/root | Data + run identity | Full command | Focused/partial command | Zero-match behavior | CI / simple Windows/macOS/Linux entry point | Repeat proof |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Unit | `APPLICABLE` / `N/A — {evidence}` | {owner} | {runner/config/root} | {identity + fixture policy} | `{command}` | `{filter}` | `{non-zero behavior}` | {CI / command} | `{result or planned owner}` |
| Integration/System | `APPLICABLE` / `N/A — {evidence}` | {owner} | {runner/config/root} | {identity + additive/public-path policy} | `{command}` | `{filter}` | `{non-zero behavior}` | {CI / command} | `{two no-reset runs}` |
| E2E | `APPLICABLE` / `N/A — {evidence}` | {owner} | {runner/config/root} | {identity + reachable-data policy} | `{command}` | `{filter}` | `{non-zero behavior}` | {CI / command} | `{result or evidence-backed N/A}` |

This roll-up is a status/evidence section only: it is not a fourth sub-score and never changes the three child scores or the combined-verdict calculation. A blocked contract remains an explicit setup follow-up.

For each merged finding: assign ONE severity per `SYNC:severity-rubric` (do not sum severities across duplicate reports), cite each reporting child's `file:line`, and PRESERVE each child's route-to-sibling pointers. — why: undeduped, three intentionally-cross-referencing reviewers inflate severity counts and bury distinct issues.

**Merged advisory Technique Applicability Matrix (does NOT change the combined verdict):** all three children emit a scale-tier Technique Applicability Matrix from `SYNC:scale-technique-gate`; dedup the three views of the same technique onto ONE advisory matrix in the consolidated report. **Pin ONE authoritative scale tier for the merged matrix — `architecture --mode=scalability`'s derived tier is canonical (owns scalability grading); if another child's derived tier DIVERGES, record the divergence as a one-line note and key the merged matrix's `tier-warranted?` column to the pinned tier, rather than merging contradictory warranted-sets.** This only SELECTS which already-derived tier the matrix is keyed to — it does NOT re-derive any child's findings (respecting "you do not re-derive them" above). It is **advisory/INFO only** — a `MISSING-WARRANTED` technique is guidance, never a severity, and NEVER feeds the worst-case combined-verdict rollup. This orchestrator adds no own gate marker; the matrix is inherited from the children.

**Merged advisory Scenario Stress Matrix (does NOT change the combined verdict):** the same three children each emit a Scenario Stress Matrix from `SYNC:scenario-stress-eval` (top-down: big-traffic / big-data / dependency-failure / node-loss / data-corruption / self-heal survival vs. business need). Dedup the three views of the same scenario onto ONE advisory matrix in the consolidated report, exactly as for the technique matrix. **Pin ONE authoritative scale tier AND business-criticality read — `architecture --mode=scalability`'s derived `T`-tier + `B`-tier is canonical (owns scalability grading); if another child's derived tier/criticality DIVERGES, record it as a one-line note and key the merged matrix to the pinned values, rather than merging contradictory in-scope sets.** This only SELECTS which already-derived tier/criticality the matrix is keyed to — it does NOT re-derive any child's scenario findings. It is **advisory/INFO only** — a `FAILS-HARD` or `OVER-HARDENED` scenario is guidance, never a severity, and NEVER feeds the worst-case combined-verdict rollup. The criticality-signal floor and anti-over-engineering guard live in the children's matrices; this orchestrator adds no own gate marker and inherits the matrix from the children.

**Completeness lens over the merged set (orchestrator-only — the children cannot see across faces).** Once `Faces merged: 3/3`, sweep the merged report against the design-review script in `.claude/docs/architecture-knowledge.md` §20.2 and record any question NO face answered as an explicit `Coverage gap: {question} — not covered by any face` line. Frame each remaining risk against the five judgments in §20.4 — *when to add complexity · when to split · when consistency can be relaxed · when to buy vs build · when GOOD ENOUGH is correct* — so the consolidated report tells the reader which JUDGMENT is at stake, not only which rule was broken. A coverage gap is an INFO note, never a severity, and NEVER feeds the combined-verdict rollup. — why: three scoped reviewers each correctly stay in lane, so a question that belongs to no lane is invisible to every one of them and only this orchestrator can see it.

**Self-audit the merged report (MANDATORY before Step 5):** run the 11 thinking red flags in §20.3 across the merged findings — especially **a recommendation whose SACRIFICE is unnamed**, **"best practice" with no named forces**, and **a scale claim with no evidence**. Any hit is demoted or removed here, not passed to `$why-review` as ground truth. — why: the orchestrator's synthesis is where three children's confirmation biases compound into one authoritative-sounding report.

Step 4 ends only when `Faces merged: 3/3` — all three sub-scores are populated, the non-scoring TVC status is copied (or explicitly marked `UNVERIFIED`), the §20.2 coverage sweep is recorded, and every finding is on disk.

## Step 5: Fix-Report-Per-Review `$why-review` Gate (status `VALIDATING`) — MANDATORY when findings exist

Flip the report status to `🔍 VALIDATING`, then run ONE merged `$why-review` pass that WALKS EACH of the three review faces (one merged pass, NOT three per-face passes — a single invocation is strictly more thorough because it also validates the cross-face dedup separate per-face passes cannot see). The "fix report after each review" gate: every face's findings are validated, the report fixed IN PLACE.

1. Read the consolidated report from `tmp/reports/architecture-full-review-{date}-{slug}.md`.
2. Invoke `$why-review` with: `validate findings in {report-path} — WALK EACH review face (architecture --mode=scalability, architecture --mode=review, production-readiness-review) in turn: for each face verify every finding it contributed has file:line proof and a correctly-classified severity, steel-man each rejected interpretation; THEN validate the cross-face dedup did not drop or merge-away a distinct issue`.
3. `$why-review` demotes/removes any finding → FIX the report in place: revise severities, remove false positives, restore any distinct issue the dedup wrongly collapsed, and add a `## Why-Review Fix Notes` section listing per-face what changed + why.
4. `$why-review` confirms all findings → append `## Why-Review Validation` stating "All N merged findings re-validated across 3 faces; no severity changes."

Skip ONLY on an unconditional zero-open-finding PASS (Round-1 LOW closure, `SYNC:double-round-trip-review`) across all three children (log the skip reason, then proceed to Step 6 to finalize the clean PASS).

## Step 6: Finalize (status `FINISHED`)

The report is now validated — lock it and hand off a stable artifact.

1. Compute the **Combined Verdict** as the worst-case rollup across the three now-validated sub-scores (any BLOCKED / NOT READY / HIGH RISK dominates); write it into the header, replacing the `⏳ pending` placeholder.
2. Flip the report status from `🔍 VALIDATING` to `✅ FINISHED` and append a `## Finalization` block: the three sub-scores, the non-scoring TVC status/source, the combined verdict, the total validated finding count by severity, and the `Faces merged: 3/3` confirmation.
3. This finalized report is the single deliverable the downstream workflow-level `$why-review` step and `docs-manager --mode=update` consume. Do NOT emit a second report file or re-synthesize — one file, finalized once.

> **Two-tier validation (why this skill runs `$why-review` AND the workflow adds a `why-review` step):** Step 5 here is the FINDING-level, per-face fix that also protects standalone use of this skill. The workflow-level `why-review` step that follows is the REPORT-level final gate over the finalized artifact (verdict-rollup correctness, dedup completeness, cross-review severity consistency) and the machine-visible guarantee in the rendered sequence. Distinct altitudes; do not collapse one into the other.

## Next Steps

**MANDATORY — NO EXCEPTIONS:** After completing, use ask the user directly to present:

- **"$plan (fix validated findings)" (Recommended)** — plan the fixes for the validated findings (fixes happen in the downstream plan/feature flow, NOT here).
- **"$linter-setup → $harness-setup"** — stand up (or complete) the mechanical quality harness. **Offer this FIRST whenever the `SYNC:engineering-foundation-gate` matrix marks F7 (mechanical harness) or F4 (test-strength proof) `MISSING-WARRANTED` or `PARTIAL-WITH-PATH`.**
- **"$code-simplifier"** — simplify and refine implicated code.
- **"Skip, continue manually"** — user decides.

> **[BROWNFIELD HARNESS ROUTE — the gap this closes]** `linter-setup` and `harness-setup` both handle an EXISTING project (they inventory what is already there before proposing anything), yet the workflow catalog wired them into greenfield init ALONE — so an audit of a grown codebase could report "no quality harness" with no route to fix it. This skill is the brownfield entry point, so the route belongs here. Apply the gate's **ratchet** rule when recommending: on an existing codebase, fail-on-NEW while tolerating the current baseline is `PRESENT`, not a half-measure — it stops regression from day one without demanding a cleanup nobody has budget for.

> **Read-only until validated.** This skill produces findings and a verdict only. Applies NO fixes — every validated finding routes to a downstream `$plan` or feature-implementation flow that owns the change.

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting. For simple tasks, ask the user whether to skip.

> **External Memory:** Complex/lengthy work → write intermediate findings + final results to `tmp/reports/` — prevents context loss, serves as deliverable.

> **Evidence Gate:** MANDATORY — every claim, finding, recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% verify first).

## Mode protocols

The protocols below apply to this mode only; their full text is inline so this reference is self-contained.

<!-- SYNC:category-review-thinking -->

> **Category Review Thinking** — A thinking framework for reviewing any category of changed files. NOT a fixed checklist — derive concerns from domain knowledge; the examples are starting points only. Your knowledge of the category exceeds any list here — trust it.
>
> **Step 1 — Understand the category's role.** What is this category responsible for in the overall system? What invariants must it uphold? What are its consumer contracts (who depends on it, what do they expect)?
>
> **Step 2 — Read project conventions for this category.** Search for reference docs, style guides, ADRs, or READMEs specific to this area. Grep 3+ existing similar files — extract naming conventions, structural patterns, shared base classes. If no docs exist, derive conventions empirically from existing code.
>
> **Step 3 — Derive concerns from first principles.** Apply all that are relevant; expand beyond this list based on the actual category:
>
> - **Correctness:** Does the logic match the intent? Trace happy path AND error path.
> - **Boundary contracts:** Are interfaces/APIs/events/protocols honored? No implicit coupling introduced?
> - **Project conventions:** Does new code follow the patterns found in Step 2? Evidence-confirmed, not assumed.
> - **Security:** Auth enforced at every entry point? Input validated at boundaries? No secrets in the diff?
> - **Performance:** Unbounded operations? N+1 patterns? Blocking calls in async context? Unindexed queries?
> - **Maintainability:** DRY? Single responsibility? Complexity within reason? Names reveal intent?
> - **Boundary naming:** When the category exposes public or cross-layer types, APIs, events, or modules, verify that names describe the capability, domain purpose, or contract rather than the current provider/framework/transport; concrete adapters may carry those details. Check callers and implementations before flagging a name, and treat generic names (`Manager`, `Helper`, `Utils`, `Data`) as signals rather than automatic violations.
> - **Test coverage:** Are the changed paths covered by tests? Are existing tests still valid after the change?
> - **Documentation:** Do related docs, specs, or READMEs reflect the changes?
>
> **Step 4 — Create sub-tasks and execute.** For each identified concern: create a task tracking sub-task, work through it with `file:line` evidence, mark done. No findings without proof.
>
> **Illustrative concern examples by category type** (not exhaustive — trust your knowledge beyond this):
>
> - _Server-side logic:_ handler/service structure conventions, validation layer placement, side-effect isolation, cross-service boundary enforcement, data-access layer separation, error propagation strategy
> - _Client-side logic:_ component lifecycle management, resource cleanup (subscriptions, listeners, timers), state management patterns, API integration layer separation, reactive stream composition
> - _Data/Schema:_ migration reversibility (rollback script), lock impact on table volume, backfill idempotency, index coverage for query patterns, deployment ordering
> - _Configuration:_ present in ALL environments? No secrets in diff? App fails fast if config missing (not silently null)? Documented in setup guide?
> - _Infrastructure:_ dev/prod parity? No hardcoded dev values (localhost, debug flags)? Pinned image/dependency versions? CI/CD secret requirements documented?
> - _Styles/Assets:_ follows project naming conventions? Uses design variables/tokens (no hardcoded magic values)? Correct scope (no global side effects from component styles)?
> - _Documentation:_ accurate? Links valid? Examples still match current code/behavior? Covers new scenarios?
> - _Tests:_ assertions verify specific outcomes (not just "no exception")? Idempotent (repeatable N times)? Covers edge cases, not just happy path?
> - _Security artifacts:_ all code paths reach the gate? Negative tests exist (unauthorized denied)? Both enforcement AND display control updated?
> - _Build/Tooling:_ rule changes apply consistently? No exceptions that silently swallow violations? Impact on CI runtime documented?

<!-- /SYNC:category-review-thinking -->

<!-- SYNC:double-round-trip-review -->

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle or an explicitly declared independent-pass minimum, not by a round number alone. Review purpose: `review → validate findings → fix validated findings that block the current round → full re-review` until a complete review pass clears the round's exit bar (see **Severity floor** below). **A clean review ENDS the loop once the persisted `minRounds` is met (default 1); an explicitly declared `minRounds=2` requires the independent second pass.**
>
> _aka **Self-Review Convergence Loop**._ "Double-round-trip" means a validated-finding fix cycle forces at least one fresh re-review. The loop is bounded by the **2-round ceiling — extendable ONCE to round 3 when CRITICAL/HIGH remain**. A failing **test gate** (a suite that must actually pass) is outside that ceiling: the loop keeps fixing and re-running until the tests pass.
>
> **Round cap — 2 rounds MAX, extendable ONCE to round 3 (a ceiling, NEVER a target).** A clean pass ENDS the loop at ANY round once `round >= minRounds`; the cap never obliges an extra round. When round 2 completes with blocking findings still open (severity floor applied):
>
> - **Validated CRITICAL or HIGH still open → ONE extra round is granted (round 3, the review hard cap).** A failed non-test binary gate (security must-fix, required artifact, generated parity, policy compliance) counts as a CRITICAL blocker here. The extension is earned by that evidence alone, granted at most once per run, and never renews.
> - **Only MEDIUM (or an unresolved `NOT VERIFIABLE`) still open → NO extension.** → **STOP and escalate by asking the user directly** with the still-open findings listed.
> - **Round 3 completes with ANY review blocker still open → STOP and escalate by asking the user directly.** No review finding or non-test gate opens a round 4.
> - **A failing TEST gate → NO round cap, at any round.** Failing tests never escalate for budget or no-progress and never buy or spend the extension: run the failed-test investigation gate, fix at the owning layer, and re-run until the tests pass — past round 3 if needed. NEVER weaken an assertion, add a skip, or relax a timeout to force green.
>
> NEVER emit a silent "good enough" PASS on cap exhaustion, and NEVER loop past round 3 on review blockers. The 2-repeated-no-progress blocker rule stays an EARLIER exit — escalate at whichever trips first.
>
> **Severity floor — from round 2, LOW stops blocking.** One predicate everywhere: `blocking_findings(round, findings)` returns all open validated findings in round 1 (see **Round-1 LOW closure**) and only validated CRITICAL/HIGH/MEDIUM findings from round 2 onward.
>
> | Round | Exit bar — loop ENDS when the fresh full review has… | Must be fixed to continue |
> | --- | --- | --- |
> | 1 | zero OPEN validated findings at ANY severity (see **Round-1 LOW closure**) | CRITICAL · HIGH · MEDIUM · LOW |
> | 2 | zero validated CRITICAL / HIGH / MEDIUM findings — **LOW-only clears the severity bar** | CRITICAL · HIGH · MEDIUM only |
> | 3 — extension, ONLY when round 2 left CRITICAL/HIGH open (or failing tests were the only blocker) | zero validated CRITICAL / HIGH / MEDIUM findings — **LOW-only clears the severity bar** | CRITICAL · HIGH · MEDIUM only |
> | 4+ — test-gate continuation, ONLY while failing test gates were the sole blocker | the tests pass and no review blocker is open | failing tests; any review blocker here escalates |
>
> From round 2 onward a round whose validated findings are ALL LOW **ENDS the loop once the persisted minimum is met**. Severity tiers are `SYNC:severity-rubric` (CRITICAL block-merge · HIGH must-fix · MEDIUM must clear the current round · LOW record/defer); round 1 stays strict.
>
> **Round-1 LOW closure.** A LOW never buys a full round: a LOW with a local fix (no new code path, contract or test) is fixed and closed by a **scoped check** — re-read the edited hunks and their callers, re-run the covering tests; a LOW needing new code or tests is **deferred** (listed), not built. Mark each `resolution: scoped-fix-verified | deferred` (`review-policy.cjs`). A LOW-only round-1 fix set ends the round with no full re-review; any CRITICAL/HIGH/MEDIUM fix or simplification still requires one. A scoped check never mints a commit review receipt: a fix-loop that must mint one still ends with one final full pass over the post-fix candidate.
>
> **Severity-floor rules:**
>
> - **Never silently drop a deferred LOW.** List every unfixed LOW under `## Deferred LOW Findings (severity floor, round ≥2)` with file, line, and description; dropping it is a protocol violation, not a clean pass.
> - **Never re-tier a finding to trigger the exit, or to reach or dodge the extension.** Demoting a real CRITICAL/HIGH/MEDIUM to LOW, promoting a MEDIUM to HIGH to buy round 3, or demoting a CRITICAL/HIGH to force an earlier escalation is a FALSE classification. Severity is set by consequence before the round bar and the extension test apply. — why: a bound reachable by relabeling bounds nothing.
> - **The floor bounds the loop, not the standard.** It ends *iteration*; it never authorizes shipping a known CRITICAL/HIGH/MEDIUM, and never lowers the finding-survival bar.
> - **The floor never applies to a hard gate.** Test-green, security must-fix, and any binary (not severity-rated) gate are unaffected — a failing test is a failure, not a LOW finding.
>
> **Universal scope (any new output/judgment):** any newly produced output or judgment gets **≥1 self-review**; any **new judgment** gets **≥1 `$why-review --validate-findings` pass**; anything flagged to re-check is re-checked **≥1 time** before it is final.
>
> **Routing invariant (author-facing):** a skill that validates findings MUST route them through `$why-review --validate-findings` (the terminal validator) — NEVER fork an inline finding-validation; the `verify-review-validate-coverage` sensor enforces this route mechanically.
>
> **Round 1:** Main-session review; output findings + verdict (PASS / FAIL). Then:
>
> - **No issues found (PASS, zero findings)** → review ENDS if `round >= minRounds`; otherwise perform the explicitly required independent pass. Do NOT invent a confirmation pass.
> - **`blocking_findings(round, findings)` is non-empty** → run the active review skill's findings-validation gate first (default `$why-review --validate-findings <report-path>`). Fix only validated findings that block the current round, then restart the full review protocol with a fresh task breakdown — unless LOW-only (**Round-1 LOW closure**).
>
> **Fresh full re-review after every fix cycle:** re-run the whole review protocol over the current full target. When it uses sub-agents, spawn NEW `spawn_agent` calls — never reuse prior agents; reviewers re-read ALL files with ZERO memory of prior rounds (`SYNC:fresh-context-review` for the spawn mechanism, `SYNC:review-protocol-injection` for the prompt template). Each pass hunts missed cross-cutting concerns, interactions between changed files, convention drift, missing pieces, rationalized edge cases, and regressions from the fixes.
>
> **Loop termination:** after each full re-review, apply **that round's exit bar**: bar cleared and persisted minimum met → END; otherwise validate → fix → restart. Escalate by asking the user directly at whichever comes first: the same validated finding repeats for 2 full invocations with no progress · a fix requires product/owner input · round 2 completes with MEDIUM-only (or `NOT VERIFIABLE`) blocking · round 3 completes with any review blocker open. A failing test gate triggers none of these — it loops until green. NEVER convert cap exhaustion into a PASS.
>
> **Rules:**
>
> - Every surviving finding must also clear why-review's **finding-survival bar** (Findings Validation Routine — stricter than the generic act-gate); a finding below it is demoted or dropped
> - NEVER skip the full re-review after a fix cycle (every fix invalidates the prior verdict; sole exception: **Round-1 LOW closure**); NEVER reuse a sub-agent across rounds
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - Persist completed rounds, repeated blockers, findings and the explicit minimum in the owning run's `review-policy.cjs` record. Resume that record after interruption; target changes invalidate evidence and acceptance but preserve the bounded round budget. In-flight attempt IDs may be session-local; they do not replace or reset completed-round state
> - Final verdict must incorporate ALL rounds executed
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2 executed, plus `## Deferred LOW Findings (severity floor, round ≥2)` whenever LOWs stayed open. When round 3 ran, name the CRITICAL/HIGH findings that granted it; when rounds continued on failing tests, name each round's failing test gates.**

<!-- /SYNC:double-round-trip-review -->

<!-- SYNC:engineering-foundation-gate -->

> **Engineering Foundation Gate** — CONDITIONAL, evidence-gated, profile-tiered. Judges the PROJECT'S ENGINEERING FOUNDATION: _can this team build, run, test and change the system safely — anywhere, repeatably, as it grows?_ Its companions judge the running system's DESIGN (`scale-technique-gate`: is technique X present? · `scenario-stress-eval`: does it survive scenario Y?). **State OUTCOMES, never tools:** detect the stack, research current options, present 2–3, the user decides, record it.
>
> 1. **Derive the project profile FIRST — from evidence, never assumed.** `Lifecycle` **G** greenfield (foundation being created) / **B** brownfield (foundation exists, under audit) · scale `T0`–`T3` (**reuse** `scale-technique-catalog.md`) · criticality `B0`–`B3` with its criticality-signal floor (**reuse** `scenario-stress-catalog.md`) · repo shape `R0` single module / `R1` few (2–5) / `R2` many modules, multi-team / `R3` monorepo estate · runtime surface. Cite `file:line`/config/CI + confidence. Unknown axis → state the assumption and take the **LOWER** tier; NEVER default to `T3`/`B3`/`R3`.
> 2. **Judge all 7 dimensions — always all 7, never a filtered subset**. Depth belongs to the named owner:
>    - **F1 Reproducible environment** (ALL profiles — the floor) — one documented path takes a clean machine to a running system; toolchain versions pinned; dependencies locked; every external prerequisite declared with a way to obtain or fake it; config environment-injected, never machine-implicit; build deterministic. → `scaffold` · `architecture --mode=scalability`
>    - **F2 Supported execution modes** (the modes this project uses or requires; a second mode is not universal) — document and exercise each supported/required developer, test, and deployment path (host/container, local/managed, simulator/device) from one shared configuration source where possible. If one mode fits, verify it and mark the comparison `N/A-by-profile`; do not invent Docker, Compose, or a host path. The defect is a claimed or required mode that is broken or irreproducible. → `scaffold` · `production-readiness-review`
>    - **F3 Environment-portable tests** (local+CI all profiles; production-shaped `T1+`/`B2+`) — the SAME suites run against local, CI and production-like targets, **parameterized by configuration, never by forked test code**. Missing capability → `ENVIRONMENT-BLOCKED`, never a silent pass; unsafe-in-production tests are excluded by an **enforced** mechanism. _"Runs in prod"_ means a safe, declared, **NON-MUTATING** subset. → `test-architecture-execution-contract` · `integration-test --mode=review`
>    - **F4 Test-strength proof** (wherever tests exist) — evidence the suite **actually fails when the code is wrong**, strongest first: (a) **automated fault injection** scoped to CHANGED code; (b) **deliberate defect-seeding drill — the universal fallback:** break the code behind a top invariant, run the suite, record **WHICH NAMED TEST went red**, restore — nothing red ⇒ write the killing test; (c) **assertion-intent audit:** flag assertions that survive an inverted implementation, check only non-nullness/type, re-assert the input, or assert infrastructure bookkeeping. **Line coverage is a DIAGNOSTIC, never a gate.** **Scope boundary:** this gate asks only whether the PROJECT HAS a test-strength mechanism; PER-CHANGE enforcement is `integration-test --mode=review` Gate 1's Mutation Probe Ledger — report each gap once. → `harness-setup` · `integration-test --mode=review`
>    - **F5 Performance & scale-under-data** (`T1+`/`B2+` for a real tier; `T0`/`B0` = one documented largest-expected-volume check) — performance **MEASURED by something that RUNS and CAN FAIL**, not reasoned about. Requires: a runnable perf tier with a documented command; **realistic volume AND shape** (distribution, cardinality, skew); **named latency/throughput/memory budgets the run ASSERTS**; growth across **≥2 volumes ~10× apart**; resource exhaustion as a **tested, bounded** outcome (backpressure, paging or a clean error, not an OOM kill; no unbounded result-sets, accumulation or concurrency on the paths that matter). Label each number a regression signal or a capacity statement. → `performance-review` · `seed-test-data`
>    - **F6 Build & change scalability** (`R1+` declared style + boundaries; `R2+` computable affected set, enforced checks, measured incrementality) — build/test cost and blast radius **do NOT grow with the codebase**. Requires: a **COMPUTABLE** affected module set from declared inter-module dependencies; **measured** incrementality and caching; boundaries enforced **MECHANICALLY**; a **declared**, enforced architecture style; implementation behind abstraction so a technology swaps without touching business code; a fast scoped inner-loop check. **Scope boundary:** where `architecture --mode=scalability` **G2 Build & CI Scalability**/**G4** ran, cite its verdict rather than re-scoring. → `architecture --mode=scalability` · `architecture --mode=review` (diff-level boundary drift) · `complexity-prevention`
>    - **F7 Mechanical quality harness** (format + lint + type/static analysis + build/test at ALL profiles; architecture-fitness `R1+`; dependency health + secret scanning wherever real data ships, unconditional at `B2+`; complexity/duplication + drift `R1+`/`T1+`) — **account for EVERY class or record it `N/A` with a reason:** formatting · lint/correctness · type & static analysis · complexity & duplication · **executable architecture-fitness** · dependency vulnerability & license · secret scanning · build/test gates plus the **F4** signal · documentation/config drift. Local and CI run the **SAME** command, configuration and version; checks **ENFORCE**, not warn; strictest reasonable defaults, loosened only with a recorded reason; cheap checks first. Brownfield adoption uses a **ratchet** — fail on NEW violations, tolerate the baseline — which counts as `PRESENT`. → `linter-setup` · `harness-setup` · `security-audit`
> 3. **Assign one verdict per dimension:** `PRESENT` (proven by cited evidence) · `MISSING-WARRANTED` · `PARTIAL-WITH-PATH` (gap + concrete incremental step) · `N/A-by-profile` (below the warranting profile — **a correctly-lean project is a PASS, never a deficiency**) · `OVER-ENGINEERED` (present but unwarranted → advise AGAINST, name the carrying cost) · `UNVERIFIED` (could not be checked; **NEVER score an unverified dimension `PRESENT`**).
> 4. **Authority is context-split.** **CREATING** a foundation (greenfield init, scaffold, a plan standing up build/test/CI) → a `MISSING-WARRANTED` dimension is **BLOCKING**: omitting a warranted one must be an explicit decision. **AUDITING** an existing foundation (brownfield review, architecture audit, changes review) → **ADVISORY ONLY**: emit the matrix plus a prioritized adoption path and **NEVER mutate any score, `/20`, `/24`, verdict band, or gate PASS/FAIL**.
> 5. **Anti-over-engineering guard (first-class, and symmetric).** Do NOT demand a container mode of a single-author utility, a distributed load platform for a small internal service, affected-set computation for a single module, or overlapping analyzers for one defect class; module splits follow real module and team count, never aesthetics. Symmetrically, never UNDER-harden a `B2+` system merely because its traffic is low.
> 6. **Every brownfield finding names the smallest next step that is valuable on its own.** Default ladder: pin the toolchain & commit the lockfile → one local command that CI also runs → ratchet the harness on (fail-on-new) → run the defect-seeding drill on the top invariants → repair the missing execution mode → seed a realistic volume and assert ONE budget → declare the style, then enforce dependency direction. Deviate on evidence and say why.
> 7. **Output — Foundation Readiness Matrix:** `dimension | warranted at this profile? | present? | verdict | evidence (file:line/config/CI) | smallest next step`, after the derived profile (per-axis evidence + confidence), before the adoption path (brownfield) or blocking list (greenfield). Full catalog → `.claude/docs/engineering-foundation-catalog.md`. **Drift-guard: profile axes, dimensions, verdicts and warranting tiers are AUTHORITATIVE in that catalog — update it FIRST, then re-run `.claude/scripts/inject_engineering_foundation_gate.py` to re-propagate. Scale tier stays single-sourced in `scale-technique-catalog.md`; business criticality in `scenario-stress-catalog.md`.**
>
> **BLOCKED until:** `- [ ]` profile derived from evidence (lifecycle + `T` + `B` + `R`, lower tier when unknown) `- [ ]` all 7 dimensions judged, none omitted `- [ ]` matrix emitted with `file:line`/config/CI evidence `- [ ]` anti-over-engineering guard applied `- [ ]` authority confirmed — creating ⇒ blocking, auditing ⇒ advisory-only with no score mutation `- [ ]` every brownfield gap carries a smallest-next-step

<!-- /SYNC:engineering-foundation-gate -->

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

<!-- SYNC:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable. A report-only/read-only reviewer never edits source, generated output, or user data: it validates and records the finding/repair handoff, then returns to the caller, which owns the fix and any re-review.
>
> **Why:** The main agent knows what it (or `$feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** After a validated-finding fix cycle, or to satisfy an explicitly declared independent-pass `minRounds`. A review round that finds zero issues ENDS the loop once that persisted minimum is met — do NOT invent a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `spawn_agent` tool calls — use `code-reviewer` agent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. A reviewer prompt carries every protocol body inline and is never handed a path to go read (the reviewer-prompt rule of `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `tmp/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior full review found zero issues AND the persisted `minRounds` is met (no fixes or required independent pass = nothing new to verify)
> - NEVER skip the full review restart after a fix cycle — every fix invalidates the prior verdict (exception: a round-1 LOW-only fix set closed by scoped check, with no simplification landed, per `SYNC:double-round-trip-review`)
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `spawn_agent` call
> - Continue until a complete full review pass clears that round's exit bar per `SYNC:double-round-trip-review`: **round 1** → zero open findings at any severity (a LOW closed by scoped check or deferral is not open); **round 2 (and the conditional round 3)** → zero CRITICAL/HIGH/MEDIUM, so a round whose validated findings are ALL LOW ENDS the loop once the persisted minimum is met (list those LOWs as deferred instead of spawning another round). The budget is 2 rounds plus ONE extension to round 3, granted only when round 2 leaves a validated CRITICAL/HIGH open (a failed non-test binary gate counts as CRITICAL); round 3 is the review hard cap. A failing test gate is not budgeted — keep fixing and re-running until the tests pass. If the same validated blocker repeats across 2 full invocations with no progress, escalate by asking the user directly. **Read-only/report-only role boundary:** when this block is carried by a security auditor or another report-only role, “fix” means return the validated repair proposal to the parent; do not modify source, generated carriers, or user data and do not restart the review locally.
> - Persist completed rounds, repeated blockers, findings and the explicit minimum in the owning run's `review-policy.cjs` record. Resume that record after interruption; target changes invalidate evidence and acceptance but preserve the bounded round budget. In-flight attempt IDs may be session-local; they do not replace or reset completed-round state

<!-- /SYNC:fresh-context-review -->

<!-- SYNC:goal-contract-satisfaction-loop -->

> **Goal Contract Satisfaction Loop** — Persist the user goal in an external file, execute against it, and loop review/fix until every saved required criterion passes or a blocker escalates. Bounded closed loop — NEVER open-ended autonomous exploration.
>
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md` (plans root default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
> 2. **Required sections:** Original Request, Purpose, Success Criteria (checkboxes; mark required vs optional), Constraints, Evidence Required, Iteration Log, Goal Satisfaction matrix.
> 3. **Before work:** read the active goal and map planned work to saved success criteria — execution serves the saved criteria, never chat memory alone.
> 4. **After execution/verification:** append an Iteration Log entry — result, evidence references (`file:line`, command output, report path), remaining gaps.
> 5. **Review gate:** emit a Goal Satisfaction matrix — `| Success Criterion | Evidence | Status |` with PASS/FAIL/BLOCKED. Overall PASS requires every required criterion PASS.
> 6. **Loop rule (retry):** required criterion FAIL → validate the gap is real → fix → re-review only the affected criteria. Stop cleanly when all required criteria PASS.
> 7. **Escalation rule (stop):** two consecutive iterations with no criterion progressing, or a blocker needing user input → mark the criterion BLOCKED with a user-facing reason and escalate. NEVER loop indefinitely.
> 8. **Skip rule:** tiny conversational tasks may skip the goal file ONLY with a recorded one-line reason. User-accepted gate skips are recorded in the goal file with reason and scope.
> 9. **Security:** NEVER store secrets, tokens, credentials, or private customer data in goal files — store evidence references and redact sensitive values.
>
> **Blocked until:** active goal resolved (or skip reason recorded) · saved success criteria read before edits · iteration evidence appended after execution · Goal Satisfaction matrix emitted before any PASS verdict.

<!-- /SYNC:goal-contract-satisfaction-loop -->

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation (optional advice)** — Optional: when grep and reading files alone may not reveal a high-risk blast radius (shared contract, many callers, cross-module/cross-service flow, public API), the code graph (`.code-graph/graph.db`) can add callers, dependents and impacted tests. Treat it as a hint, NOT proof: the graph can be stale or incomplete (it lags uncommitted edits and unindexed paths) — verify anything that matters by reading the files/grep. Skip it for low-risk or local changes.
>
> An absent or stale graph is never a finding and never blocks, fails or gates work.
>
> **Pattern (when used):** grep/read finds files → optional graph query suggests extra callers/dependents → grep/read verifies details
>
> | Situation                          | Optional graph query                         |
> | ---------------------------------- | -------------------------------------------- |
> | High-risk investigation            | `trace --direction both` on 2-3 entry files  |
> | Fix/debug with wide reach          | `callers_of` on buggy function + `tests_for` |
> | Feature touching a shared contract | `connections` on files to be modified        |
> | Review of a high-risk change       | `tests_for` on changed functions             |
> | Blast radius                       | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Use `--node-mode file` first (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call the current task list first. Set `nested=true` and record `parentTaskId` ONLY when this run created its own child phase tasks linked to that parent row; a `[Workflow]` row that merely exists in the current task list (stale, abandoned, or belonging to another run) does not make a run nested — such a run behaves as standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] /skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** the current task list done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — serial execution of provably independent tasks wastes wall-clock. Applies to every multi-step job (workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync). **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`; else `SEQ`, naming the dependency that forces it.
> 2. **Group `PAR` into waves.** No edge between members; two writers of one file NEVER share a wave; read-only work parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `spawn_agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `tmp/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **Cost check before every wave:** each sub-agent pays a fixed context load before any work — its agent definition, every skill it loads or preloads, its brief and reference docs — commonly tens of thousands of tokens, far more than one duplicated protocol block. Dispatch only a task whose own work clearly exceeds that load; otherwise do it inline, or fold it into an agent that already reads the same files as concrete questions (that agent need not load the task's whole skill) — unless the task's risk needs its full protocol: risk sets depth, file count never does. Merge tasks that read the same files or reference docs into one agent, and prefer fewer, larger agents over many small ones. Parallelism buys wall-clock time, never free tokens.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · a task whose own work is smaller than its sub-agent's fixed context load (do it inline or merge it) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

<!-- /SYNC:parallel-subagent-dispatch -->

<!-- SYNC:review-principle-awareness -->

> **Review Applicability / Current-Principles Awareness** — Every review must first classify the change context (greenfield foundation, brownfield feature/refactor, test/docs/config/UI/infra, or actor-facing/machine surface) and take notice of the applicable current principles below. This is an evidence-gated applicability check, not a mandate to flag or build every item.
>
> **Detailed protocol routing — read/apply only when warranted:**
> - `SYNC:scale-ready-foundation` — greenfield foundation is blocking; big-feature brownfield fit/adapt/defer; architecture review is advisory when auditing. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`.
> - `SYNC:test-architecture-execution-contract` — assertion-bearing tests use the project's configured/native format, name the guarded intent/technical contract, and assert an owned outcome; GWT is one valid format. Detailed carriers: `integration-test`, `workflow-greenfield-init`, and the test-architecture review path.
> - `SYNC:ai-agent-as-user-access` — when an AI/machine actor or future contract is evidenced, inspect identity/delegation, capability boundaries, selected API/CLI/MCP/WebMCP/event/SDK surface, safety/consent, audit/observability, and native-format contract tests. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`, `architecture --mode=review`.
> - `SYNC:design-system-check` — when UI changes, inspect the design-system and component-contract obligations; route visual/UX depth to the owning UI review.
>
> **Review behavior:** Check only principles applicable to the reviewed scope; record `APPLY-NOW`, `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, `BLOCKED`, or `UNVERIFIED` with `file:line`/config/CI evidence, status/severity, owner/route, and next step/revisit trigger. Do not invent findings from a generic checklist, flag unrelated pre-existing gaps as regressions, silently expand the requested scope, or mutate a parent gate merely because advice exists.
>
> **Ownership:** `changes-review` coordinates the applicability pass and routes depth to the owning specialist (`architecture --mode=review`, `integration-test --mode=review`, `security-audit`, `performance-review`, `ui-design --mode=review`, `production-readiness-review`, or another matching review). A specialist reports its own lens and does not duplicate or override another review's verdict; existing brownfield gaps stay advisory unless new, safety-relevant, or explicitly in scope.
>
> **Required review note:** `context/scope | principle/protocol checked | evidence | status/verdict | severity | owner/route | next step/revisit trigger`.
>
> **BLOCKED when:** an applicable principle is required for safety/correctness but missing, unowned, or untestable. Otherwise record an evidence-backed `NOT-APPLICABLE`, advisory, `DEFER-AS-OPPORTUNITY`, or `UNVERIFIED` result according to the lifecycle and change context; creating a greenfield foundation remains subject to its own blocking protocol.

<!-- /SYNC:review-principle-awareness -->

<!-- SYNC:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 11 protocol blocks VERBATIM, copied WHOLESALE and unmodified. They are the review-tier renderings of their canonical `SYNC:` tags, not literal copies; when a canonical protocol changes, update the matching body here in the same edit. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** A fresh reviewer must hold every rule it reviews against from its first token; a path or a placeholder would make it depend on a file read, or on a hook that may not fire for it. Reviewer prompts are therefore the one place the hybrid policy (`SYNC:shared-protocol-duplication-policy`) always keeps full bodies: the template carries all 11 protocol bodies pre-embedded, and the orchestrator copies it wholesale.

### Subagent Type Selection

- `code-reviewer` — for code reviews (reviewing source files, git diffs, implementation)
- `general-purpose` — for plan / doc / artifact reviews (reviewing markdown plans, docs, specs)

### Canonical Agent Call Template (Copy Verbatim)

```
spawn_agent({
  description: "Fresh Round {N} review",
  agent_type: "code-reviewer",
  prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Review plan files under {plan-dir}" | "Review integration tests in {path}"}

## Round
Round {N}. You have ZERO memory of prior rounds. Re-read all target files from scratch via your own tool calls. Do NOT trust anything from the main agent beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Spec ↔ Tests ↔ Code Triangulation
DO THIS FIRST — before any per-protocol check below. The review target is the WHOLE PACKAGE, not the diff alone. Read `docs/project-config.json` and resolve `specArtifacts`: a valid profile selects its configured `intent/contracts/evidence` section roles, identifiers, ownership rule, and test-carrier dialects; only an absent profile selects the strict-default business-spec shape (§3 ACs / §4 BRs / §5 invariants / §8 TCs). A malformed or unsupported declaration is `BLOCKED`; never treat it as absent or fall back. Load the governing artifact, its tests, and the changed code TOGETHER, and reason about their mutual consistency BEFORE judging any one in isolation.
1. Locate all three faces: the canonical owner section(s), the tests that guard them, and the production code that implements them. With a native profile, preserve owner path + case/scenario ID + optional variant and resolve each through its configured carrier to the actual test. A missing face is itself a finding (SPEC-GAP / TEST-GAP / DEAD-SPEC).
2. Triangulate pairwise — every disagreement is a finding; classify which face is wrong:
   - code vs spec: behavior the code does that no configured `intent/contracts` rule (or strict-default §3/§4/§5/§8 rule) describes → CODE-EXTRA or SPEC-STALE; a hard contract/invariant with no enforcing path → CODE-WRONG.
   - tests vs spec: a configured native case with no executing assertion, or a test asserting behavior no native rule/case names → TEST-GAP or SPEC-SILENT. Without `specArtifacts`, check strict-default §8 TCs.
   - tests vs code: a changed code path with no covering test → TEST-GAP; a test that still passes against a deliberately broken invariant → WEAK-TEST (apply the mutation thinking in Bug Detection).
3. Hidden-rule capture: any invariant the code enforces but the spec never states (SPEC-SILENT) MUST be surfaced as a finding, added to the profile's configured `intent` or `contracts` section, and linked from its `evidence` section to a native case whose executing assertion is inspected. Without a profile, use strict-default §3/§4/§5/§8 and TC. This is the enrichment loop, never a silent pass.
4. Only after the three faces agree — or every disagreement is logged as a finding — proceed to the per-protocol checks below; when enrichment adds spec/test content, re-review the package against the enriched spec.
NEVER mark review PASS while any spec/test/code face disagrees without a logged finding. The diff is the entry point; the package is the unit of judgment.

### Evidence-Based Reasoning
Speculation is FORBIDDEN. Every claim needs proof.
1. Cite file:line, grep results, or framework docs for EVERY claim
2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
3. Cross-service validation required for architectural changes
4. "I don't have enough evidence" is valid and expected output
BLOCKED until: Evidence file path (file:line) provided; Grep search performed; 3+ similar patterns found; Confidence level stated.
Forbidden without proof: "obviously", "I think", "should be", "probably", "this is because".
If incomplete → output: "Insufficient evidence. Verified: [...]. Not verified: [...]."

### Bug Detection
MUST check categories 1-4 for EVERY review. Never skip.
1. Null Safety: Can params/returns be null? Are they guarded? Optional chaining gaps? .find() returns checked?
2. Boundary Conditions: Off-by-one (< vs <=)? Empty collections handled? Zero/negative values? Max limits?
3. Error Handling: Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
4. Resource Management: Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
5. Concurrency (if async): Missing await? Race conditions on shared state? Stale closures? Retry storms?
6. Stack-Specific: Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
Admit a finding only with a reachable trigger path (the caller, input or state that reaches the defect) and a consequence; a concern no supported path reaches is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher.
Classify every finding by consequence (never by effort): CRITICAL = immediate material security/safety/data-loss risk or failed binary gate → block; HIGH = material correctness, contract, privacy, or authority risk → must fix; MEDIUM = bounded consequential edge/resilience/maintainability gap → must clear the current round, or escalate with an explicit residual-risk follow-up that does not create a clean pass; LOW = non-blocking polish with no credible present impact → record/defer from round 2; `NOT VERIFIABLE` is unresolved evidence, not LOW.

### Design Patterns Quality
Priority checks for every code change:
1. Consistency and reuse: follow documented local patterns; extract a shared abstraction only when repetition or a demonstrated consumer need justifies its cost. Similar names alone do not require a shared base class.
2. Responsibility: follow the architecture established by project configuration, references, accepted decisions, and existing code. Place behavior with its actual owner; do not presume an entity/service/controller hierarchy or forbid a layer without project evidence.
3. Apply cohesion, coupling, and dependency-management principles when their assumptions fit the project's paradigm. SOLID is useful for object-oriented boundaries, not a mandatory checklist for every language or codebase.
4. After extraction/move/rename: Grep ENTIRE scope for dangling references. Zero tolerance.
5. YAGNI gate: Treat repeated patterns as evidence to evaluate extraction, not a numeric threshold. Extract when a shared reason to change, real consumers, or an evidenced ownership/substitution boundary lowers total change cost; do not create patterns for hypothetical future use.
6. Purpose-oriented naming: Name public or cross-layer abstractions by the capability, domain purpose, or contract consumers rely on—not the current provider, SDK, framework, database, or transport. `IStorage`/`Storage` → `AzureBlobStorage`; use `IAzureStorage` only when Azure-specific semantics are intentionally part of the contract.
7. Contract-fit check: Read callers and every implementation before judging a name; narrow an over-broad abstraction (`IObjectStore`, `DocumentStore`) instead of rewarding a generic name that lies about behavior.
8. Mechanism/generic-name smell: Treat `Manager`, `Helper`, `Utils`, `Data`, `Thing`, `Service`, `Interface`, type decorations, and unexplained abbreviations as review signals—not automatic defects; flag them only when they hide purpose, scope, or responsibility.
9. Concrete implementation names: Provider, strategy, transport, or test-double names are valid on concrete types when they distinguish real behavior (`AzureBlobStorage`, `InMemoryStorage`, `RetryingStorage`); keep those details out of the caller-facing contract unless the contract promises them.
10. Language convention: Preserve local interface syntax and naming style; `.NET` `I` prefixes and Google TypeScript's unmarked interfaces are both valid local conventions.
Anti-patterns to flag: God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

### Logic & Intention Review
Verify WHAT code does matches WHY it was changed.
1. Change Intention Check: Every changed file MUST serve the stated purpose. Flag unrelated changes as scope creep.
2. Happy Path Trace: Walk through one complete success scenario through changed code.
3. Error Path Trace: Walk through one failure/edge case scenario through changed code.
4. Acceptance Mapping: If plan context available, map every acceptance criterion to a code change.
5. Tests Verify Intent: For test/spec changes, verify tests name the protected business rule or invariant and would fail if that intent breaks.
6. Migration Test Exclusion: Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.
NEVER mark review PASS without completing both traces (happy + error path).

### Test Spec Verification
Map changed code to test specifications.
1. Identify the project's test/spec format from existing docs, test-case files, BDD feature files, or spec folders.
2. Every changed code path MUST map to a corresponding test case/spec (or flag as "needs test case").
3. New functions/endpoints/handlers → flag for test spec creation.
4. Migration files are excluded from test/spec creation; schema/data migrations are one-time execution paths, not core application logic.
5. If spec evidence fields exist, verify they point to actual code (file:line, not stale references).
6. Verify each meaningful test case names the business intent/invariant; flag behavior-only cases that only mirror implementation details.
7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
8. If no specs exist for a changed path → log the gap and recommend the project's test-spec workflow.
NEVER skip test mapping. Untested code paths are the #1 source of production bugs.

### Behavioral Delta Matrix
MANDATORY for any bugfix review. Produce input-state × pre-fix × post-fix × delta table BEFORE writing verdict.
- Minimum 3 rows; include at least one row OUTSIDE the original bug report.
- Any "REGRESSION" delta → review returns FAIL until a preservation test is added.
- Narrative descriptions do NOT substitute for the matrix.
Example rows (external-record sync fix):
| Input                 | Pre-fix | Post-fix                  | Delta      |
| --------------------- | ------- | ------------------------- | ---------- |
| Record exists (valid) | Reused  | Always recreated → orphan | REGRESSION |
| Record missing (404)  | Error   | Recreated                 | Fixed      |

### Fix-Layer Accountability
Do not assume the crash site owns the defect. Trace the actual execution and data flow, then fix the component that owns the violated contract.
MANDATORY before ANY fix:
1. Trace the affected path — map the real origin, transformations, boundaries, and observed failure in the surfaces this project uses. Do not invent absent layers.
2. Identify the contract owner — use project architecture and code evidence to find which component is responsible for the invalid state or behavior.
3. Choose the correction point — fix the authoritative owner and retain any validation required at untrusted boundaries. A multi-file correction can be valid; justify it by the contracts each file owns rather than a file-count threshold.
4. Check bypass paths — inspect relevant constructors, adapters, parsers, caches, persistence, or other entry points that actually exist in the affected flow.
BLOCKED until: The affected path is traced; the owner is supported by file:line evidence; relevant consumers and bypass paths are checked; and the correction point fits the project's architecture.
Anti-patterns (REJECT): assuming the symptom site is the owner; scattering workarounds without tracing the contract; assuming the lowest technical layer is always authoritative; removing validation from a real trust boundary to force a single correction point.

### Rationalization Prevention
AI skips steps via these evasions. Recognize and reject:
- "Too simple for a plan" → Simple + wrong assumptions = wasted time. Plan anyway.
- "I'll test after" → RED before GREEN. Write/verify test first.
- "Already searched" → Show grep evidence with file:line. No proof = no search.
- "Just do it" → Still need task tracking. Skip depth, never skip tracking.
- "Just a small fix" → Small fix in wrong location cascades. Verify file:line first.
- "Code is self-explanatory" → Future readers need evidence trail. Document anyway.
- "Combine steps to save time" → Combined steps dilute focus. Each step has distinct purpose.

### Graph-Assisted Investigation (optional advice)
Optional: when grep and reading files alone may not reveal a high-risk blast radius (shared contract, many callers, cross-module/cross-service flow, public API), the code graph (.code-graph/graph.db) can add callers, dependents and impacted tests. Treat it as a hint, NOT proof: the graph can be stale or incomplete (it lags uncommitted edits and unindexed paths) — verify anything that matters by reading the files/grep. Skip it for low-risk or local changes. An absent or stale graph is never a finding.
Pattern (when used): grep/read finds files → optional graph query suggests extra callers/dependents → grep/read verifies details.
- High-risk investigation: trace --direction both on 2-3 entry files
- Fix/debug with wide reach: callers_of on buggy function + tests_for
- Feature touching a shared contract: connections on files to be modified
- Review of a high-risk change: tests_for on changed functions
- Blast radius: trace --direction downstream
CLI: python .claude/scripts/code_graph {command} --json. Use --node-mode file first (10-30x less noise), then --node-mode function for detail.

### Understand Code First
HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
1. Search 3+ similar patterns (grep/glob) — cite file:line evidence.
2. Read existing files in target area — understand structure, base classes, conventions.
3. Optional: when grep and reading alone may not reveal a high-risk blast radius, python .claude/scripts/code_graph trace <file> --direction both --json (when .code-graph/graph.db exists) can add callers and dependents — a hint that may be stale, verified by reading the files.
4. Map dependencies via grep/read callers (an optional graph connections or callers_of query may add hints) — know what depends on your target.
5. Write investigation to tmp/analysis/ for non-trivial tasks (3+ files).
6. Re-read analysis file before implementing — never work from memory alone.
7. NEVER invent new patterns when existing ones work — match exactly or document deviation.
BLOCKED until: Read target files; Grep 3+ patterns; Assumptions verified with evidence. (The code graph is optional advice, never a gate.)

## Reference Docs (READ before reviewing)
Read only the docs resolved for this lane — every doc costs context before any review work; do not re-resolve the whole doc set.
- `code-review-rules.md`, inside the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path)
- {lane-specific docs the orchestrator resolved — e.g., the pattern doc for the files under review, integration-test-reference.md for a test lane, the governing spec for a spec-compliance lane}

## Target Files
{explicit file list OR "run git diff to see uncommitted changes" OR "read all files under {plan-dir}"}

## Output
Write a structured report to tmp/reports/{review-type}-round{N}-{date}.md with sections:
- Status: PASS | FAIL
- Issue Count: {number}
- Critical Issues (with file:line evidence)
- High Priority Issues (with file:line evidence)
- Medium / Low Issues
- Cross-cutting findings

Return the report path and status to the main agent.
Every finding MUST have file:line evidence. Speculation is forbidden.
`
})
```

### Rules

- DO copy the template wholesale — including all 11 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO choose `code-reviewer` agent_type for code reviews and `general-purpose` for plan / doc / artifact reviews
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /SYNC:review-protocol-injection -->

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Classify every finding by consequence, not by effort, reviewer preference, or how annoying the fix is. One scale applies to every review, skill, agent, workflow, and host so a tier means the same everywhere. Choose the highest credible consequence supported by evidence; do not lower a tier to make a round pass.
>
> **Finding vs observation (required):** An observation becomes a finding only when it names the affected user/system/data/contract, the shipped consequence, the evidence location, and the normalized tier. `INFO`, advice, preference, duplicate wording, or an unsubstantiated concern is not a finding and must not reopen a loop. If the concern might affect a required behavior or gate but evidence is incomplete, emit `NOT VERIFIABLE` with the missing evidence and keep it unresolved; never silently convert uncertainty into LOW.
>
> **Reachable trigger path (required):** a finding also names HOW a supported configuration reaches the defect — the caller, input, state or event sequence that drives execution or data there. A concern on a path nothing reaches (dead code, a branch its guard excludes, an impossible state) is an observation: record it as advice, never as a LOW to fix. Also never a finding: what a compiler, type checker, linter or test run for this change already reports in the review evidence; a behavior change the stated intent asks for; an issue silenced by a suppression that predates this change and states its reason (a suppression the change adds is itself reviewed); a pre-existing issue on a line the change neither touched nor made reachable. When reachability cannot be settled and the concern would be MEDIUM or higher, emit `NOT VERIFIABLE` naming what would settle it; a polish-level concern with unsettled reachability is an observation. — why: a speculative LOW admitted as a finding becomes build work in round 1.
>
> | Severity | Action | Definition and examples |
> | --- | --- | --- |
> | CRITICAL | Block immediately; escalate | Immediate material risk if shipped: authentication/authorization or safety bypass; secrets/PII exposure; irreversible destructive action; data loss/corruption; a silent failure on a critical path. A failed binary gate is carried by the executable policy as a separate synthetic blocker, not an ordinary severity judgment. |
> | HIGH | Must fix before PASS/merge | Material correctness or contract risk: wrong behavior on a supported path; violated business/data invariant; meaningful privacy or authority gap; breaking API/schema/compatibility change; likely harm to users/downstream systems; a missing proof for a behavior-changing fix. |
> | MEDIUM | Must clear the current round; escalate if the fix needs an owner decision | Bounded but consequential risk: an edge case, resilience/observability/testability/maintainability gap, credible future defect, or local architectural drift — real impact, not immediate material loss. A recorded follow-up does not make an open MEDIUM a clean pass. |
> | LOW | Record and defer; never opens another fix/re-review round from round 2 onward, never counts toward the round-3 extension | Non-blocking polish with no credible present correctness, security, privacy, authority, availability, or data-integrity impact: wording/formatting, minor documentation or convention drift, optional defensive cleanup, cosmetic refinement. |
>
> **Consequence decision tree (apply in order):** (1) A failed binary gate stays a separate hard blocker (synthetic CRITICAL in the executable helper) — never hide it behind an ordinary label. Otherwise, would shipping permit immediate material security/safety/authority harm, irreversible destruction, data loss/corruption, or a critical-path silent failure? → **CRITICAL**. (2) Does a supported path, invariant, public contract, privacy/authority boundary, compatibility promise, or behavior-changing proof fail with material impact? → **HIGH**. (3) A bounded but consequential edge, resilience, observability, testability, maintainability, or architectural gap with credible impact? → **MEDIUM**. (4) Evidence shows only non-blocking polish? → **LOW**. (5) Evidence to choose among 1–4 missing → **NOT VERIFIABLE**, not LOW. When several tiers fit, select the highest credible consequence; effort, cost, reviewer discomfort, frequency alone, proximity to the round cap, and unlocking or forfeiting the round-3 extension never decide the tier.
>
> **Boundary examples:** auth bypass, exposed secret/PII, destructive command without an authority gate, or failed required test/generation/parity gate → **CRITICAL**; wrong supported response, broken invariant/API/schema, meaningful privacy/authority defect, or unproven behavior-changing fix → **HIGH**; bounded retry/timeout/alert/testability gap or credible maintainability drift → **MEDIUM**; typo, formatting, optional cleanup, or cosmetic suggestion proven not to affect behavior → **LOW**. A missing fact about any boundary is **NOT VERIFIABLE** until evidence or a documented residual-risk decision exists.
>
> **Classification procedure (every finding):** (1) state the affected user, system, data, contract, or gate; (2) assess consequence if it ships; (3) assess exposure/likelihood and reversibility/detectability; (4) select the highest justified tier; (5) cite `file:line` or equivalent evidence and a confidence percentage. `NOT VERIFIABLE` is a pending evidence state, not a fifth tier and never a LOW escape hatch: if the claim could affect required behavior, security, privacy, authority, availability, data integrity, or a binary gate, it stays an open evidence blocker until resolved or explicitly owner-accepted with documented residual risk. Classify LOW only when evidence supports the absence of credible present material impact.
>
> **Hard-gate rule:** Binary gates (tests, required artifacts, security must-fix checks, generated parity, policy compliance) are not severity-rated findings. The executable helper records a failed gate as a synthetic CRITICAL blocker so one predicate can carry it; the report still names the gate and failure evidence. A failed gate blocks at every round, even when all ordinary findings are LOW. A failed non-test gate counts as CRITICAL for the round-3 extension; a failing test gate is outside the round budget and loops until the tests pass.
>
> **Score-based skills** map their numeric scale onto these tiers — no parallel vocabulary:
>
> - **0-2 criterion scoring** (e.g. production-readiness-review): `0` = CRITICAL/HIGH (unmet, blocks readiness), `1` = MEDIUM (partial, consequential gap), `2` = pass. A polish-only criterion is LOW, not a forced `0`.
> - **Two-axis scoring** (e.g. performance-review, impact × likelihood): high impact + high exposure → CRITICAL/HIGH; material impact, bounded exposure → HIGH/MEDIUM; low impact and exposure → LOW. Record the axes and why the tier is the highest credible consequence.
> - **Scorecards / `/20` grades** (e.g. `architecture --mode=scalability`): the aggregate score and verdict band are separate from finding severity. A sub-80 area is evidence to investigate, not an automatic tier; classify each underlying gap by the decision tree and keep advisory score deductions apart from blocking findings.
>
> **Domain-vocabulary normalization (mandatory):** a skill may keep a local reporting vocabulary, but it MUST feed this same four-tier round predicate — never a second severity system:
>
> - `BLOCKED`, `HARD FAIL`, or `FAIL` is a blocking local verdict, not an automatic CRITICAL: CRITICAL for an immediate material risk or failed binary gate, otherwise HIGH or MEDIUM with evidence, while the local block holds until the owning gate is satisfied.
> - `WARN` is not permission to ignore: MEDIUM when consequential, LOW only when evidence shows no credible present material impact, HIGH/CRITICAL when the consequence warrants. `PASS`/compliant is not a finding.
> - UI `P0`/`P1`/`P2`/`P3`/`P4` start as CRITICAL/HIGH/MEDIUM/LOW/LOW; override upward only on evidence of a higher shipped consequence. A P0/P1 accessibility or task-completion floor stays a blocking gate even when called a priority.
> - Numeric SRE/readiness or impact/likelihood scores are evidence inputs, not tiers: emit the score, the consequence, and the normalized tier together. `INFO`/advisory observations are not findings unless evidence shows a material consequence.
>
> A tier drives the gate: CRITICAL/HIGH/MEDIUM stay actionable and blocking under the round policy; only an open CRITICAL/HIGH at round 2 (a failed non-test binary gate counts as CRITICAL) unlocks the single conditional extension round; LOW may be tracked as a follow-up and, from round 2, never justifies another fix/re-review by itself. An owner decision may explain or schedule an open MEDIUM but never makes it a clean pass; owner acceptance never makes a failed binary gate pass and must record scope, rationale, and residual risk.

<!-- /SYNC:severity-rubric -->

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

<!-- SYNC:systematic-review-batching -->

> **Systematic Review Batching (map-reduce)** — When a changeset is large, do NOT review files one-by-one. Partition into size-capped batches, fire one specialized sub-agent per batch in parallel, then reduce. This bounds EVERY context — each batch agent AND the orchestrator — so coverage stays complete as file count grows.
>
> **Trigger ladder (one ordered escalation — not competing thresholds):**
>
> 1. **< 10 changed files** → sequential per-file review (default; no batching).
> 2. **≥ 10 changed files** → switch to systematic parallel mode. Announce: `"Detected {N} changed files. Switching to systematic parallel review protocol."` Then: categorize → size-capped batches → flat consolidation.
> 3. **categories > 6 OR files > 40** → additionally insert the hierarchical synthesis tier (below). Everything from rung 2 still applies.
>
> **Step 1 — Categorize.** Group changed files into logical categories derived from the project's actual structure (not forced). Category is the *concern axis*; orient with these examples, derive what fits the repository:
>
> | Category Type | Example Groupings |
> | --- | --- |
> | Agent/Tooling | AI scripts, hooks, skill definitions, workflow configs, linting rules |
> | Root config/docs | Root README, project config, CI/CD pipeline configs |
> | Reference docs | Architecture docs, patterns references, setup guides |
> | Feature/domain docs | Business feature documentation, spec files, ADRs |
> | Backend logic | Service/handler/controller source (infer from project structure) |
> | Frontend logic | UI component/state/API source (infer from project structure) |
> | Data/Schema | Migrations, schema files, seed data |
> | Tests | Unit, integration, E2E test files |
> | Infrastructure | Docker, k8s, CI/CD, cloud manifests |
>
> **Step 2 — Risk-weighted batches.** Size caps bound each agent's context; the risk tier decides how tight the cap is. Classify each category's tier FIRST — a file whose tier is unclear takes the high-risk tier:
>
> | Risk tier | Examples | Batch cap (whichever hits first) |
> | --- | --- | --- |
> | **High** | domain/business logic, commands/handlers/jobs, schema/migrations/data access, auth/permissions/secrets/money/PII, concurrency, public contracts, UI with state or requests | ≤8 files OR ≤2000 diff-lines — one category per batch |
> | **Low** | UI styling/markup with no logic, tests, docs and specs, configuration text | ≤20 files OR ≤4000 diff-lines — low-risk categories may share a batch |
> | **Mechanical churn** | generated files, lockfiles, pure renames/moves, bulk formatting | no batch agent — the orchestrator verifies by pattern (rule check plus a sample) and records it in the coverage ledger |
>
> Any category exceeding its cap splits into more batches (30 high-risk backend files → 4 batches). Size caps — not category caps — make "many files" safe: a category cap alone lets one giant category blow a single agent's context. Risk weighting spends line-by-line depth where a defect costs most; the whole-target reviewer and specialist escalation still cover low-risk files.
>
> **Step 2a — Sub-agent type per batch** (match the batch's dominant concern):
>
> - Code logic (any stack) → `code-reviewer`
> - Security-sensitive changes → `security-auditor`
> - Performance-critical paths → `performance-optimizer`
> - Docs, plans, specs, configs, infra → `general-purpose`
>
> Each batch sub-agent receives: its full file list; the Step 2b instruction to validate its own findings; `SYNC:category-review-thinking` as its primary thinking model — derive each category's concerns from first principles, NOT a fixed checklist (if the consuming skill does not carry that block, apply category-first thinking directly); project reference docs relevant to its concern (discover via `*patterns*`, `*conventions*`, `*style-guide*`); cross-reference verification instructions (counts, tables, links). All batch agents run in parallel and write findings to `tmp/reports/` (per `SYNC:task-tracking-external-report`); reducers read from disk, never from memory.
>
> **Step 2b — Each batch validates its own findings before returning.** The batch agent runs `$why-review --validate-findings <its batch report>` — a real terminal skill call in its own session, where the batch's code and protocols are already loaded — keeps the findings that survive, marks each `validated: in-batch`, lists every finding it rejected or re-tiered with its original severity, and never fixes. This matches report-only specialists and avoids re-loading the same context in a separate validator.
>
> **Step 3 — Reduce.**
>
> - **Deduplicate FIRST — before any validation or fix.** Merge findings that share one root cause (same owning `file:line` range and same violated rule or invariant) into one entry that lists every source batch/reviewer, keeps the highest justified severity plus each source's own severity, and records the merge — a severity disagreement between sources is a reviewer conflict. A cross-batch duplicate is never validated or fixed twice.
> - **Independent check set (after dedup).** In-batch validation trades independence for cost, so the orchestrator re-validates with `$why-review --validate-findings` in the main session: every finding raised or kept at CRITICAL/HIGH, including one its batch rejected or demoted; every finding two reviewers disagree on (severity, owner or fix); every finding its batch did not mark `validated: in-batch`; and at least one in three of each batch's MEDIUM findings (minimum one), picked by position in the batch report, never by content. When a batch's sample shows unreliable validation — more than one in four sampled findings rejected or re-tiered — validate all of that batch's MEDIUM findings. The remaining LOW and unsampled MEDIUM findings ride on their in-batch validation. Keep each validation pass small enough that every finding in it gets full attention.
> - **Flat reduction (rung 2, ≤6 categories AND ≤40 files):** the orchestrator collects each batch report, cross-references counts/tables/contracts ACROSS batches, detects gaps visible only across categories (feature in code but missing from docs; new API endpoint with no client call), and consolidates into one categorized holistic report.
> - **Hierarchical reduction (rung 3, > 6 categories OR > 40 files):** insert a mid-tier — each concern with two or more batches gets ONE synthesizer agent that reads only its own batch reports and emits a single concern-synthesis (a single-batch concern needs no synthesizer: its batch report is its synthesis). The orchestrator reads the **concern-syntheses (~5)**, never the raw batch reports — keeping the reducer's context O(#concerns), not O(#files).
>   - **Cross-concern interaction pass (mandatory at rung 3 — closes the synthesis-tier blind spot):** concern-siloed synthesis can drop an interaction spanning two concerns AND two batches (tainted source in data-layer/batch 7 → sink in api/batch 3). So: (a) each concern-synthesizer MUST emit an explicit **"cross-concern interaction candidates"** list — entities/symbols/contracts it touched that plausibly bind to another concern (shared DTOs, event names, table/collection names, exported symbols); (b) the orchestrator MUST run the Step-3 cross-reference/gap step **over those candidate lists across all concern-syntheses**, not only within a batch, before concluding. Without this pass the tier trades completeness for context-bounding on exactly the large diffs it targets.
>
> **Step 4 — Holistic assessment.** With all findings combined, judge: overall coherence as a unified intent; cross-category sync (docs match code? contracts match callers?); risk areas where categories interact; missing doc/spec updates for changed artifacts.
>
> **No silent truncation.** If any cap forces sampling or a batch is dropped for budget, ANNOUNCE the dropped/sampled scope explicitly — bounded coverage must never read as complete coverage.

<!-- /SYNC:systematic-review-batching -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `tmp/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: tmp/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:test-architecture-execution-contract -->

> **Test Architecture & Execution Contract** — Treat testability as a setup/architecture acceptance condition. Identify the test types and execution modes required by the project contract and task risk (for example unit, integration/system, E2E, performance/scale). Record `APPLICABLE` only with evidence of a relevant runner/framework/configuration; otherwise record `N/A — <evidence>` and never fabricate coverage or impose a universal tier threshold.
>
> 0. **Make the protected intent explicit in the project's test format.** Every assertion-bearing test states the behavior or technical invariant it protects and makes its inputs, trigger, and owned outcome understandable. Use `Given / When / Then` when the project's spec/config selects it or it fits; otherwise keep the project's native organization (property/fuzz tests describe the input space and property; harness and mutation tests use their native contract). Do not rewrite a test solely to adopt a framework-wide syntax.
>    Link the case to the configured owner/case/scenario identity and its `intent` or `contracts` role when `specArtifacts` is valid; when absent, record `Business Intent / Invariant Guarded` (or the technical contract). A malformed declared profile blocks without fallback. One behavior per case. The final assertion proves the outcome the test owns, not only an internal call, delivery bookkeeping, or setup side effect. Fixture/runner glue is exempt only when it holds no assertion. Convert legacy brownfield cases when touched; a broader migration is a named owned opportunity, and a safety-critical case without clear phases is `BLOCKED`.
>
> 1. **Matrix before implementation:** for each required test type record applicability, owner, runner/framework, test root, fixture/data strategy, full command, focused/partial command, zero-match behavior, CI gate, a simple entry point when useful, each supported execution mode, and the environments the project promises to support.
> 1a. **E2E profile handoff:** also record the selected `surfaceIds[]`, the linked `localRun` owner, auth mode/reference, seed/data mode, browser runner/engine/headed setting, action-delay policy, evidence root/capture/redaction policy, and convergence cap. Missing fields stay explicit blockers or N/A; never fill them from generic browser defaults.
> 2. **Runnable scopes:** full and focused commands are copy-ready, fail on invalid or zero-match selections, report exact counts and exit status, and are safe to repeat. E2E uses the configured browser/service commands and the project's synchronization strategy.
> 2a. **E2E organization gate (when E2E is applicable):** reuse the configured/discovered test organization — fixtures, shared helpers, scoped locator handles, page objects, or another evidenced structure — and record its actual owners. A Page Object Model is one valid pattern, never a universal requirement.
> 2b. **E2E reuse and DRY gate:** keep shared lifecycle, locator, readiness, auth, data, and evidence behavior at the project's existing reusable owner and final outcome assertions in the test. Reuse or compose existing helpers before creating new ones, keep one canonical owner per selector/action/wait, and treat duplicated wrappers or setup as a review signal; extract when a shared owner reduces change cost without crossing project boundaries.
> 2c. **E2E test layering:** test reusable behavior at its actual owner where the harness supports it; feature tests cover user outcomes and local composition. Do not invent component tiers or lower-tier contract tests the project does not use.
> 2d. **E2E synchronization:** wait for observable readiness and outcome conditions with bounded runner-native waits or the configured helper, with useful timeout diagnostics; apply action delays only when the project contract specifies them, and never use fixed sleeps as readiness evidence.
> 3. **Fresh valid state (when mutable or shared state applies):** isolate each test/run through the project's supported setup and public paths. Use unique identities for shared mutable data, realistic valid data for the behavior under test, and idempotent/restart-safe setup when fixtures or seeders persist. Intentional accumulation is additive and integrity-checked; never hide contamination with destructive reset.
>    Run-scoped cleanup, when supported, is opt-in and idempotent: after evidence capture it removes only ephemeral resources owned by the current run — never persistent/additive data or another run's data, never a shared-state reset, never a substitute for no-reset proof.
> 4. **Isolation and fidelity:** isolate mutable/shared data and parallel workers; share only immutable/reference data. Use realistic input and observable arrange barriers where behavior depends on them. Do not widen retries or weaken assertions to make a scenario pass.
> 5. **Evidence gate:** report command, scope, identity/data mode, exact result, and repeat proof; for persistent-state suites, verify repeatability without destructive reset at the level the project gate requires. Line coverage is diagnostic only; use property/invariant, mutation, change, or behavior signals when the tooling supports them.
> 6. **Execution modes and environment reach:** exercise each mode and environment the project declares it supports (for example host/container or local/CI), parameterizing targets rather than maintaining needless forks; record unexercised declared capabilities as a gap. A production-shaped target applies only when the project requires it; tests that can reach production need an enforced safe scope and report `ENVIRONMENT-BLOCKED` when it is missing. Pin dependencies and declare external prerequisites where the reproducibility contract requires. Depth → `SYNC:engineering-foundation-gate` **F1/F2/F3**.
>
> **Ownership:** Architecture/harness defines the matrix; scaffold/workflow makes it runnable; test writers implement tier-specific cases; reviewers verify the contract; the runner reports; seed-data owners preserve uniqueness, idempotency, realism, and accumulation integrity. Missing required evidence blocks setup completion.

<!-- /SYNC:test-architecture-execution-contract -->

<!-- SYNC:trade-off-interrogation-gate -->

> **Trade-Off Interrogation Gate** — ALWAYS ask these THREE questions before ANY verdict, score, finding, or recommendation — about the thing under review AND about every recommendation YOU make. — why: naming a benefit without its price is an endorsement, not a review; the costliest trade-offs are the ones nobody wrote down.
>
> 1. **Is there any trade-off?** Name what it SACRIFICES. "None" / "pure win" is an unfinished analysis, NOT an answer — to claim none, state which dimensions you checked and why each is unaffected: future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.
> 2. **Is it worth it?** Weigh gain against sacrifice EXPLICITLY — what is gained (with a metric) · what it costs · WHO pays · WHEN it comes due — then emit **WORTH IT / NOT WORTH IT / UNCLEAR**. "Better" with no metric and no cost FAILS this question. NOT WORTH IT → withdraw or replace the recommendation, never keep it as-is.
> 3. **Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. **MATERIAL** when ANY holds: irreversible / one-way door (data migration, public contract, storage format, vendor lock-in) · cost shifted onto someone else (another team, ops/on-call, future maintainer, end user) · one quality attribute traded for another (correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility) · a boundary crossed (client↔server tier, service contract, event contract, shared library) · a high-consequence path (auth, money, data integrity, breaking change, High/Medium residual risk) · the worth-it verdict is UNCLEAR.
>
> **MATERIAL → STOP and confirm by asking the user directly BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** ask the user directly reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it by asking the user directly on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

<!-- /SYNC:trade-off-interrogation-gate -->

<!-- SYNC:double-round-trip-review:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** run the review loop (aka **Self-Review Convergence Loop**): review → validate findings → fix validated blocking findings → FULL re-review. Any newly produced output/judgment gets ≥1 self-review, and any new judgment ≥1 `$why-review --validate-findings` pass, before it is treated as final.
- **MANDATORY severity floor:** round 1 exits only on zero OPEN findings at any severity — a LOW closes by a local fix plus scoped check, or by deferral when it needs new code or tests, and a LOW-only fix set needs no full re-review (never a receipt); from round 2 the bar is zero CRITICAL/HIGH/MEDIUM, so a LOW-only round ENDS the loop once the persisted `minRounds` is met — list every deferred LOW in the report. NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to reach the exit, and NEVER apply the floor to a binary gate (test-green, security must-fix).
- **MANDATORY round cap of 2, extendable ONCE to round 3 — a ceiling, NEVER a target.** A clean pass ends the loop once the persisted `minRounds` is met (default 1; explicit 2 requires an independent pass). Round 2 ending with a validated CRITICAL/HIGH still open (a failed non-test binary gate counts as CRITICAL) grants exactly ONE extra round; round 2 ending with only MEDIUM/`NOT VERIFIABLE` open, or round 3 ending with any review blocker open → **STOP and escalate by asking the user directly**, never a silent PASS. The 2-repeated-no-progress blocker rule escalates earlier if it trips first. A failing TEST gate has NO round cap and buys no extension — keep fixing and re-running until tests pass, never forcing green.

<!-- /SYNC:double-round-trip-review:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**Optional advice:** the code graph (`.code-graph/graph.db`) can hint at a high-risk blast radius grep misses; it can be stale, so verify by reading files. Never required.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:systematic-review-batching:reminder -->

- **MANDATORY** Large changeset → risk-weighted batches, one parallel sub-agent per batch: high-risk ≤8 files OR ≤2000 diff-lines; low-risk (styling, tests, docs, config text) may pool to ≤20 files OR ≤4000 diff-lines; mechanical churn is verified by pattern, not batched. Never review many files one-by-one.
- **MANDATORY** Each batch agent validates its own findings (`$why-review --validate-findings` in its own session); the reducer deduplicates by root cause FIRST, then re-validates only CRITICAL/HIGH (including in-batch rejections and demotions), reviewer conflicts, unvalidated findings and a MEDIUM sample.
- **MANDATORY** > 6 categories OR > 40 files → add the hierarchical synthesis tier; each concern-synthesizer emits cross-concern interaction candidates and the orchestrator runs the cross-concern pass before concluding.

<!-- /SYNC:systematic-review-batching:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** A finding names a reachable trigger path (caller, input, state or event that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (an observation otherwise) — never a speculative LOW.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:category-review-thinking:reminder -->

- **MANDATORY** Derive review categories from file language + directory semantics + change nature; create a sub-task per category.
- **MANDATORY** Derive each category's concerns from first principles with `file:line` evidence — never a fixed checklist.

<!-- /SYNC:category-review-thinking:reminder -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm by asking the user directly BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** ask the user directly reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** Plan waves per the `Workflow Step Advancement & Parallel Phases` rules: tag tasks `PAR`/`SEQ`, spawn each `PAR` wave in ONE message with disjoint write sets, honor the all-return barrier, and fold a small lens into an agent already reading the same files, unless its risk needs the full protocol; full text: `.claude/skills/shared/protocols/parallel-subagent-dispatch.md`.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

<!-- SYNC:engineering-foundation-gate:reminder -->

**IMPORTANT MUST ATTENTION** engineering-foundation gate — judges whether the team can build, run, test, and change the system repeatably as it grows. Derive lifecycle, scale, criticality, repository shape, and runtime from evidence; take the lower supported tier when unknown. Judge all 7 dimensions, using `N/A-by-profile` with evidence when a concern truly does not apply. **F1** reproducible build/run/test path · **F2** document and exercise each supported or required execution mode; dual host/container or other modes only when the project uses or needs them · **F3** environment portability at applicable local/CI/production-shaped targets · **F4** meaningful test-strength evidence without making one mutation tool universal · **F5** measured performance where scale/risk warrants it · **F6** change/build scalability where the repository has meaningful module boundaries · **F7** mechanical checks selected for the stack/profile. For each, judge outcomes rather than tools, and preserve anti-over-engineering. Foundation creation may block on missing warranted outcomes; brownfield audits advise and name the smallest next step. Catalog → `.claude/docs/engineering-foundation-catalog.md` (update first, then re-run `inject_engineering_foundation_gate.py`).

<!-- /SYNC:engineering-foundation-gate:reminder -->

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** Testability contract: resolve evidence-backed Unit/Integration/System/E2E rows, copy-ready full/focused commands, zero-match failures, owner/root/data, CI/simple Windows/macOS/Linux entry, unique run identity, and repeat proof before claiming setup, review, or test completion.
**IMPORTANT MUST ATTENTION Goal:** Audit the WHOLE project's architecture, scalability, and production readiness in ONE pass: orchestrate three deliberately non-overlapping sibling reviewers, dedup intentional cross-references, and synthesize ONE consolidated Architecture Health Report with one combined verdict — this is a THIN orchestrator; NEVER re-implement child reviews.

**IMPORTANT MUST ATTENTION — Main steps (execute in order, NEVER skip/merge):** (1) Resolve scope (args else ask the user directly; map to each child's args) → (2) Load project reference docs once → (3) Parallel fan-out of all three read-only sub-agents in ONE message behind an all-return barrier → (4) Progressive synthesis into ONE report at status `IN PROGRESS` — merge + dedup each face AS it returns, never held in memory, then run the §20.2 coverage sweep + §20.3 self-audit over the merged set → (5) Fix-report-per-review `$why-review` gate (one merged pass walking each of the three faces + the dedup, status `VALIDATING`) → (6) Finalize — lock the combined verdict + flip status to `FINISHED` → Next Steps ask the user directly. The report lifecycle is `IN PROGRESS → VALIDATING → FINISHED` on ONE file, never re-created.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries; each is a signpost — the canonical body above governs, NEVER skip one):**

- **Graph-Assisted Investigation (optional):** the code graph is a stale-able hint for high-risk blast radius, never required.
- **Sub-Agent Return Contract:** The three children return only the summary; full reports on disk.
- **Nested Task Creation:** Pre-expand each child's phase list and link the workflow row before spawning.
- **Task Tracking & External Report:** Bootstrap tasks; persist the consolidated report to `tmp/reports/`.
- **Evidence-Based Reasoning:** Cite `file:line` for every claim; confidence >80% to act.
- **Double Round-Trip Review:** Validate → fix downstream only for current-round blocking findings → full re-review; Round 1 requires zero open findings, while Round 2 requires zero CRITICAL/HIGH/MEDIUM with LOW deferred and binary gates still blocking.
- **Fresh Context Review:** Spawn fresh zero-memory sub-agents; never reuse across rounds.
- **Review Protocol Injection:** Embed all protocol bodies verbatim in sub-agent prompts.
- **Systematic Batching:** each child owns its own map-reduce for a large scope.
- **Severity Rubric:** Classify Critical/High/Medium/Low by consequence; map sub-scores onto it.
- **Category Review Thinking:** each child derives its concerns from first principles, not a checklist.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** this is a THIN orchestrator — NEVER re-implement any of the three reviews inline; the children are 25k–34k tokens each and MUST run as sub-agents while this skill runs INLINE and spawns them — why: running them inline blows the main context and defeats the map-reduce this skill exists to perform.
**IMPORTANT MUST ATTENTION** spawn all three sub-agents in ONE message and honor the all-return barrier — advance only after EVERY child returns — why: starting synthesis before all three return produces a report missing a whole dimension.
**IMPORTANT MUST ATTENTION** dedup the intentional overlaps — one underlying issue = ONE finding citing every reporting child, ONE severity per `SYNC:severity-rubric`, never summed across duplicate reports; preserve every route-to-sibling pointer — why: three intentionally-cross-referencing reviewers inflate severity counts and bury distinct issues.
**IMPORTANT MUST ATTENTION** `architecture --mode=scalability` ALWAYS grades the PROJECT even under diff scope — read its `/20` scorecard as project posture, not a diff verdict.
**IMPORTANT MUST ATTENTION** read-only until validated — run the Step 5 `$why-review` gate before handoff; every validated finding routes to a downstream `$plan`/feature flow, fixes are NEVER applied here.
**IMPORTANT MUST ATTENTION** two orchestrator-only duties in Step 4 that NO child can perform: (a) sweep the merged report against the design-review script (`.claude/docs/architecture-knowledge.md` §20.2) and record every unanswered question as an INFO `Coverage gap` line, framing remaining risk against the five judgments (§20.4); (b) run the 11 thinking red flags (§20.3) across the merged findings and demote/remove any hit BEFORE `$why-review` sees it — why: three correctly-in-lane reviewers are all blind to a question belonging to no lane, and synthesis is exactly where three children's confirmation biases compound into one authoritative-sounding report. A coverage gap is INFO only and NEVER feeds the combined-verdict rollup.

The following are all MANDATORY:

- **MANDATORY** break work into small todo tasks via task tracking BEFORE starting; mark one `in_progress`, complete it immediately after evidence.
- **MANDATORY** read required project-reference docs first (`project-structure-reference.md`, `backend-patterns-reference.md`, `code-review-rules.md`, always `lessons.md`) and cite `Reference docs read: ...` — why: project conventions override generic assumptions.
- **MANDATORY** every merged finding carries `file:line` proof + confidence (>80% to act, <80% verify first) — NEVER synthesize a finding from inference.
- **Optional advice:** the code graph (`.code-graph/graph.db`) can hint at a high-risk blast radius grep may miss; it may be stale — verify by reading. Never required.
- **MANDATORY** validate decisions with the user by asking the user directly for scope resolution and next-step routing — never auto-decide the scope.

**Anti-Rationalization:**

| Evasion                                         | Rebuttal                                                                                             |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| "I'll just run the three checks inline myself"  | NEVER — each child is 25k–34k tokens; fan out as sub-agents, this skill stays inline and synthesizes |
| "Same issue from 3 reviewers = 3 High findings" | Dedup first — one underlying issue = one finding, one severity, citing every source                  |
| "asr scorecard is low, so the diff is bad"      | asr grades the PROJECT even under diff scope — read it as project posture, not a diff verdict        |
| "Findings look right, ship the report"          | Run the Step 5 `$why-review` gate first — an unvalidated sub-agent claim is a hypothesis             |
| "I'll fix the findings while I'm here"          | Read-only until validated — fixes route to a downstream `$plan`/feature flow                         |
| "Two children returned, start synthesizing"     | Honor the all-return barrier — advance only after ALL three return                                   |

**IMPORTANT MUST ATTENTION** THIN orchestrator — fan out three read-only sub-agents in ONE message, run INLINE yourself, NEVER re-implement the reviews.
**IMPORTANT MUST ATTENTION** dedup the intentional cross-references into ONE report with three sub-scores + one combined verdict, one severity per issue.
**IMPORTANT MUST ATTENTION** read-only until validated — run the `$why-review` gate, then route fixes to a downstream `$plan`/feature flow.
