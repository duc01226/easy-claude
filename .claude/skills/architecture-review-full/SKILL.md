---
name: architecture-review-full
version: 2.1.0
description: '[Architecture] Use when a workflow step or the user asks for a whole-project architecture and production-readiness audit. Bundles architecture-review, scalability and production-readiness into one health report.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Audit the WHOLE project's architecture, scalability, and production readiness in ONE pass: orchestrate three deliberately non-overlapping sibling reviewers, dedup intentional cross-references, and synthesize ONE consolidated Architecture Health Report with one combined verdict — this is a THIN orchestrator; NEVER re-implement child reviews.

**Summary:**
- **Testability contract:** resolve Unit/Integration/System/E2E applicability from runner/config evidence; record owner/root/data, copy-ready full + focused commands, zero-match behavior, CI/simple Windows/macOS/Linux entry, unique run/data identity, and repeat proof; unresolved applicable fields block handoff, while non-applicable tiers require evidence-backed `N/A`.

- **Purpose:** resolve scope once, fan three reviewers out as parallel read-only sub-agents behind an all-return barrier, PROGRESSIVELY synthesize + dedup each child's findings into ONE report file (status `IN PROGRESS` → `FINISHED`), run a `/why-review` fix gate that walks each review face, then finalize the combined verdict. Read-only until findings are validated — fixes route to a downstream `/plan` or feature flow.
- **The three children — deliberately non-overlapping siblings that cross-reference each other, so their findings MUST be deduped:**
  - `architecture-scalability-review` (subagent `architect`) — project-grading scorecard `/20` + pass/fail gates. ALWAYS grades the project, even under diff scope (project-grader by design, "not the every-change diff reviewer").
  - `architecture-review` (subagent `architect`) — diff/scope-scoped 13-category PASS/WARN/BLOCKED compliance. Its Category 11 delegates full scalability/coupling grading to `architecture-scalability-review`.
  - `production-readiness-review` (subagent `code-reviewer`) — service/API SRE `/24` + 8-item Extended SRE Readiness gate. `architecture-scalability-review` routes runtime readiness here.
- **This skill runs INLINE** in the main session because it spawns sub-agents; the three children are each 25k–34k tokens and CANNOT run inline together — they MUST be sub-agents.
- **Dedup is the core value.** Because the three siblings intentionally cross-reference each other, the same underlying issue surfaces from multiple angles; record it ONCE citing every source, preserve each child's route-to-sibling pointers. — why: undeduped, three intentionally-cross-referencing reviewers inflate severity counts and bury distinct issues.
- **Coverage sweep + self-audit are orchestrator-only duties (Step 4).** After `Faces merged: 3/3`, sweep the merged report against the design-review script (`architecture-knowledge.md` §20.2) and record every unanswered question as an INFO `Coverage gap` line; frame remaining risk against the five judgments (§20.4); then run the 11 thinking red flags (§20.3) across the merged findings before Step 5. — why: three correctly-in-lane reviewers cannot see a question that belongs to no lane, and synthesis is where their confirmation biases compound.

**Workflow:**

1. **Step 1: Resolve Scope** — `$ARGUMENTS` or `AskUserQuestion`; map the chosen scope to each child's args.
2. **Step 2: Load Project Reference Docs Once** — warm shared context before fan-out.
3. **Step 3: Parallel Fan-Out (all-return barrier)** — spawn all three read-only sub-agents in ONE message; advance only after ALL three return.
4. **Step 4: Progressive Synthesis (IN PROGRESS)** — open the ONE consolidated report at status `🚧 IN PROGRESS` when fan-out starts; merge + dedup each child's findings into it AS that child returns — never held in memory to the end; then run the §20.2 coverage sweep and the §20.3 self-audit over the merged set.
5. **Step 5: Fix-Report-Per-Review `/why-review` Gate** — ONE merged `/why-review` pass that walks each of the three review faces + the dedup and fixes the report in place (severities, false positives, dedup-dropped issues).
6. **Step 6: Finalize (FINISHED)** — lock the combined verdict (worst-case rollup) and flip the report status to `✅ FINISHED`.
7. **Next Steps** — `AskUserQuestion`: `/plan` (fix validated findings) / `/code-simplifier` / skip.

**Key Rules (top 3 critical first):**

- MUST ATTENTION this is a THIN orchestrator — NEVER re-implement any of the three reviews inline; fan them out as sub-agents and synthesize.
- MUST ATTENTION dedup the intentional overlaps — one underlying issue = one finding citing every reporting child; NEVER let cross-referencing siblings triple-count it.
- MUST ATTENTION read-only until validated — run the Step 5 `/why-review` gate before handoff; fixes route to a downstream `/plan`/feature flow, NEVER applied here.
- Spawn all three sub-agents in ONE message and honor the all-return barrier — advance only after every child returns (`SYNC:parallel-phase-advancement` discipline).
- Write the consolidated report to `tmp/reports/architecture-full-review-{YYMMDD}-{HHmm}-{slug}.md`.

## Your Mission

<task>
$ARGUMENTS
</task>

## Review Mindset (NON-NEGOTIABLE)

Skeptical synthesizer. Judge the three children's reports; do not re-derive them.

- Trust each child's `file:line` evidence, but NEVER inflate severity by counting the same underlying issue three times — dedup first, then rank.
- A finding survives to the report only after the Step 5 `/why-review` gate; an unvalidated sub-agent claim is a hypothesis, not a finding.
- Preserve every route-to-sibling pointer a child emits — the combined report is the union of owned findings, not a re-review.

## Step 1: Resolve Scope (ASK EACH RUN)

Decide audit scope, then map to each child's arguments.

- If `$ARGUMENTS` names files/dirs, or contains `full` / `whole` / `diff` / `changes`, use that directly.
- Else `AskUserQuestion`:
  - **"Whole project (Recommended)"** — audit the entire repository.
  - **"Current changes (diff)"** — audit the uncommitted diff only.
  - **"Specific path"** — audit a named service/module/directory.
  - **"New / greenfield foundation"** — grade a foundation being STOOD UP rather than one already running.

**Scope → child args mapping:**

| Chosen scope             | `architecture-scalability-review`                             | `architecture-review`          | `production-readiness-review`                                               |
| ------------------------ | ------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------- |
| Whole project            | `mode=audit` over the whole repo                              | scope override `full codebase` | args = all backend service/API roots (per `project-structure-reference.md`) |
| Current changes (diff)   | `mode=audit` focused on the services/modules the diff touches | default uncommitted diff       | default uncommitted service/API diff                                        |
| Specific path            | `mode=audit` scoped to that path's services/modules           | scope override = that path     | that path's service/API files                                               |
| New / greenfield foundation | **`mode=init`** over the planned/scaffolded structure      | scope override = the scaffold  | the scaffolded service/API entry points (record `N/A — <evidence>` for anything not yet built) |

> **[GREENFIELD SCOPE]** `mode=init` was previously unreachable through this orchestrator even though the child supports it, so a foundation being created could only be graded with the brownfield rubric. It also flips this skill's `SYNC:engineering-foundation-gate` authority from **advisory** to **BLOCKING** — you are choosing the foundation now, so a `MISSING-WARRANTED` dimension must be an explicit decision, not a silent default.

> **MUST ATTENTION — `architecture-scalability-review` always grades the PROJECT, even under diff scope.** A project-grader by design ("do not use as the every-change diff reviewer"). Under diff scope it still emits the `/20` scorecard, focused on the services/modules the diff touches — it never degrades into a pure per-line diff reviewer. Document this nuance in the consolidated report so its scorecard is read as a project posture, not a diff verdict.

## Step 2: Load Project Reference Docs Once

Warm shared context BEFORE fan-out so synthesis reasons from the same ground truth the children use. Read once here (each child re-reads what it needs via its own tool calls):

- `docs/project-config.json`
- Under the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path): `project-structure-reference.md`, `backend-patterns-reference.md`, `frontend-patterns-reference.md`, `code-review-rules.md`
- Accepted ADRs under the ADR root (default `docs/adr/**`; a `docsRoots.adr.path` entry in `docs/project-config.json` overrides the path), when present

## Step 3: Parallel Fan-Out (ALL-RETURN BARRIER)

Spawn ALL THREE sub-agents in ONE message. Read-only and independent — no shared mutable state, no ordering dependency. Advance ONLY after EVERY member returns (`SYNC:parallel-phase-advancement`).

Each sub-agent writes its FULL report to `tmp/reports/` and returns ONLY the `SYNC:subagent-return-contract` summary (≤10 finding bullets + report path) — NEVER its full report inline.

| #   | Child skill                       | `subagent_type` | Whole-project args                                                   | Diff-scope args                                                                | Emits                             |
| --- | --------------------------------- | --------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------- |
| 1   | `architecture-scalability-review` | `architect`     | `mode=audit` over whole repo                                         | `mode=audit` focused on the diff's services/modules (still grades the project) | Scorecard `/20` + pass/fail gates |
| 2   | `architecture-review`             | `architect`     | scope override `full codebase`                                       | default uncommitted diff                                                       | 13-category PASS/WARN/BLOCKED     |
| 3   | `production-readiness-review`     | `code-reviewer` | all backend service/API roots (per `project-structure-reference.md`) | default uncommitted service/API diff                                           | SRE `/24` + 8-item gate           |

Each sub-agent prompt states: READ-ONLY findings/score mode (no fixes); re-read all target files from scratch via its own tool calls; write full report incrementally to `tmp/reports/`; return only the return-contract summary.

**Each of the three faces feeds TWO validation gates downstream — state this in each sub-agent's prompt so it knows its findings will be adversarially validated, not trusted as-is:** (1) the Step 5 fix-report-per-review `/why-review` gate that walks its face and fixes its findings in the consolidated report; (2) inside `workflow-architecture-audit`, the workflow-level FINAL `/why-review` gate that re-reviews the whole finalized report. A face's findings are hypotheses until they survive both — so every finding it emits MUST carry `file:line` proof + confidence that can withstand validation.

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

| Overlap axis                                                            | `architecture-review` face                            | Sibling face(s)                                                                               |
| ----------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Module isolation / loose coupling / horizontal scaling / DRY regression | Category 11 (scalability & coupling regression)       | `architecture-scalability-review` {module isolation, loose coupling, horizontal scaling, DRY} |
| Quality tooling / CI / observability                                    | Category 0 (quality-tooling baseline)                 | `architecture-scalability-review` {Build & CI, Observability}                                 |
| Recorded-decision / clean-architecture conformance                      | Category 9 (ADR conformance)                          | `architecture-scalability-review` {clean architecture}                                        |
| DB performance / capacity ceilings                                      | `production-readiness-review` DB-perf + capacity gate | `architecture-scalability-review` {horizontal scaling}                                        |
| Technique applicability (advisory) — scale-tier technique matrix         | Category 11 INFO advisory matrix                      | `architecture-scalability-review` + `production-readiness-review` advisory matrices           |
| Scenario stress (advisory) — big-traffic/big-data/failure/self-heal      | Category 11 INFO scenario-stress matrix               | `architecture-scalability-review` + `production-readiness-review` scenario-stress matrices     |
| Data / consistency / tenancy — dual write, idempotency, breaking migration, tenant isolation | Category 12 (data, consistency & tenancy boundaries) | `production-readiness-review` {migration safety, rollback}; `security-review` owns authz depth; `performance-review` owns query-plan depth |

**Merged Testability & Verification Contract (non-scoring):** Copy the `TVC` status and evidence from the `architecture-scalability-review` child into the consolidated report, then retain the architecture-design/scaffold/harness owner links rather than re-deriving the contract. Use `UNVERIFIED — child result absent` when the child did not emit it; never infer PASS, especially for E2E.

| Tier | Applicability + evidence | Owner | Runner/config/root | Data + run identity | Full command | Focused/partial command | Zero-match behavior | CI / simple Windows/macOS/Linux entry point | Repeat proof |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Unit | `APPLICABLE` / `N/A — {evidence}` | {owner} | {runner/config/root} | {identity + fixture policy} | `{command}` | `{filter}` | `{non-zero behavior}` | {CI / command} | `{result or planned owner}` |
| Integration/System | `APPLICABLE` / `N/A — {evidence}` | {owner} | {runner/config/root} | {identity + additive/public-path policy} | `{command}` | `{filter}` | `{non-zero behavior}` | {CI / command} | `{two no-reset runs}` |
| E2E | `APPLICABLE` / `N/A — {evidence}` | {owner} | {runner/config/root} | {identity + reachable-data policy} | `{command}` | `{filter}` | `{non-zero behavior}` | {CI / command} | `{result or evidence-backed N/A}` |

This roll-up is a status/evidence section only: it is not a fourth sub-score and never changes the three child scores or the combined-verdict calculation. A blocked contract remains an explicit setup follow-up.

For each merged finding: assign ONE severity per `SYNC:severity-rubric` (do not sum severities across duplicate reports), cite each reporting child's `file:line`, and PRESERVE each child's route-to-sibling pointers. — why: undeduped, three intentionally-cross-referencing reviewers inflate severity counts and bury distinct issues.

**Merged advisory Technique Applicability Matrix (does NOT change the combined verdict):** all three children emit a scale-tier Technique Applicability Matrix from `SYNC:scale-technique-gate`; dedup the three views of the same technique onto ONE advisory matrix in the consolidated report. **Pin ONE authoritative scale tier for the merged matrix — `architecture-scalability-review`'s derived tier is canonical (owns scalability grading); if another child's derived tier DIVERGES, record the divergence as a one-line note and key the merged matrix's `tier-warranted?` column to the pinned tier, rather than merging contradictory warranted-sets.** This only SELECTS which already-derived tier the matrix is keyed to — it does NOT re-derive any child's findings (respecting "you do not re-derive them" above). It is **advisory/INFO only** — a `MISSING-WARRANTED` technique is guidance, never a severity, and NEVER feeds the worst-case combined-verdict rollup. This orchestrator adds no own gate marker; the matrix is inherited from the children.

**Merged advisory Scenario Stress Matrix (does NOT change the combined verdict):** the same three children each emit a Scenario Stress Matrix from `SYNC:scenario-stress-eval` (top-down: big-traffic / big-data / dependency-failure / node-loss / data-corruption / self-heal survival vs. business need). Dedup the three views of the same scenario onto ONE advisory matrix in the consolidated report, exactly as for the technique matrix. **Pin ONE authoritative scale tier AND business-criticality read — `architecture-scalability-review`'s derived `T`-tier + `B`-tier is canonical (owns scalability grading); if another child's derived tier/criticality DIVERGES, record it as a one-line note and key the merged matrix to the pinned values, rather than merging contradictory in-scope sets.** This only SELECTS which already-derived tier/criticality the matrix is keyed to — it does NOT re-derive any child's scenario findings. It is **advisory/INFO only** — a `FAILS-HARD` or `OVER-HARDENED` scenario is guidance, never a severity, and NEVER feeds the worst-case combined-verdict rollup. The criticality-signal floor and anti-over-engineering guard live in the children's matrices; this orchestrator adds no own gate marker and inherits the matrix from the children.

**Completeness lens over the merged set (orchestrator-only — the children cannot see across faces).** Once `Faces merged: 3/3`, sweep the merged report against the design-review script in `.claude/docs/architecture-knowledge.md` §20.2 and record any question NO face answered as an explicit `Coverage gap: {question} — not covered by any face` line. Frame each remaining risk against the five judgments in §20.4 — *when to add complexity · when to split · when consistency can be relaxed · when to buy vs build · when GOOD ENOUGH is correct* — so the consolidated report tells the reader which JUDGMENT is at stake, not only which rule was broken. A coverage gap is an INFO note, never a severity, and NEVER feeds the combined-verdict rollup. — why: three scoped reviewers each correctly stay in lane, so a question that belongs to no lane is invisible to every one of them and only this orchestrator can see it.

**Self-audit the merged report (MANDATORY before Step 5):** run the 11 thinking red flags in §20.3 across the merged findings — especially **a recommendation whose SACRIFICE is unnamed**, **"best practice" with no named forces**, and **a scale claim with no evidence**. Any hit is demoted or removed here, not passed to `/why-review` as ground truth. — why: the orchestrator's synthesis is where three children's confirmation biases compound into one authoritative-sounding report.

Step 4 ends only when `Faces merged: 3/3` — all three sub-scores are populated, the non-scoring TVC status is copied (or explicitly marked `UNVERIFIED`), the §20.2 coverage sweep is recorded, and every finding is on disk.

## Step 5: Fix-Report-Per-Review `/why-review` Gate (status `VALIDATING`) — MANDATORY when findings exist

Flip the report status to `🔍 VALIDATING`, then run ONE merged `/why-review` pass that WALKS EACH of the three review faces (one merged pass, NOT three per-face passes — a single invocation is strictly more thorough because it also validates the cross-face dedup separate per-face passes cannot see). The "fix report after each review" gate: every face's findings are validated, the report fixed IN PLACE.

1. Read the consolidated report from `tmp/reports/architecture-full-review-{date}-{slug}.md`.
2. Invoke `/why-review` with: `validate findings in {report-path} — WALK EACH review face (architecture-scalability-review, architecture-review, production-readiness-review) in turn: for each face verify every finding it contributed has file:line proof and a correctly-classified severity, steel-man each rejected interpretation; THEN validate the cross-face dedup did not drop or merge-away a distinct issue`.
3. `/why-review` demotes/removes any finding → FIX the report in place: revise severities, remove false positives, restore any distinct issue the dedup wrongly collapsed, and add a `## Why-Review Fix Notes` section listing per-face what changed + why.
4. `/why-review` confirms all findings → append `## Why-Review Validation` stating "All N merged findings re-validated across 3 faces; no severity changes."

Skip ONLY on an unconditional zero-finding PASS across all three children (log the skip reason, then proceed to Step 6 to finalize the clean PASS).

## Step 6: Finalize (status `FINISHED`)

The report is now validated — lock it and hand off a stable artifact.

1. Compute the **Combined Verdict** as the worst-case rollup across the three now-validated sub-scores (any BLOCKED / NOT READY / HIGH RISK dominates); write it into the header, replacing the `⏳ pending` placeholder.
2. Flip the report status from `🔍 VALIDATING` to `✅ FINISHED` and append a `## Finalization` block: the three sub-scores, the non-scoring TVC status/source, the combined verdict, the total validated finding count by severity, and the `Faces merged: 3/3` confirmation.
3. This finalized report is the single deliverable the downstream workflow-level `/why-review` step and `docs-update` consume. Do NOT emit a second report file or re-synthesize — one file, finalized once.

> **Two-tier validation (why this skill runs `/why-review` AND the workflow adds a `why-review` step):** Step 5 here is the FINDING-level, per-face fix that also protects standalone use of this skill. The workflow-level `why-review` step that follows is the REPORT-level final gate over the finalized artifact (verdict-rollup correctness, dedup completeness, cross-review severity consistency) and the machine-visible guarantee in the rendered sequence. Distinct altitudes; do not collapse one into the other.

## Next Steps

**MANDATORY — NO EXCEPTIONS:** After completing, use `AskUserQuestion` to present:

- **"/plan (fix validated findings)" (Recommended)** — plan the fixes for the validated findings (fixes happen in the downstream plan/feature flow, NOT here).
- **"/linter-setup → /harness-setup"** — stand up (or complete) the mechanical quality harness. **Offer this FIRST whenever the `SYNC:engineering-foundation-gate` matrix marks F7 (mechanical harness) or F4 (test-strength proof) `MISSING-WARRANTED` or `PARTIAL-WITH-PATH`.**
- **"/code-simplifier"** — simplify and refine implicated code.
- **"Skip, continue manually"** — user decides.

> **[BROWNFIELD HARNESS ROUTE — the gap this closes]** `linter-setup` and `harness-setup` both handle an EXISTING project (they inventory what is already there before proposing anything), yet the workflow catalog wired them into greenfield init ALONE — so an audit of a grown codebase could report "no quality harness" with no route to fix it. This skill is the brownfield entry point, so the route belongs here. Apply the gate's **ratchet** rule when recommending: on an existing codebase, fail-on-NEW while tolerating the current baseline is `PRESENT`, not a half-measure — it stops regression from day one without demanding a cleanup nobody has budget for.

> **Read-only until validated.** This skill produces findings and a verdict only. Applies NO fixes — every validated finding routes to a downstream `/plan` or feature-implementation flow that owns the change.

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. For simple tasks, ask the user whether to skip.

> **External Memory:** Complex/lengthy work → write intermediate findings + final results to `tmp/reports/` — prevents context loss, serves as deliverable.

> **Evidence Gate:** MANDATORY — every claim, finding, recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% verify first).

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `category-review-thinking` — Derive review concerns per category of changed files from domain knowledge; reviewing a changeset that spans several file categories → .claude/skills/shared/protocols/category-review-thinking.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `double-round-trip-review` — Validated-finding fix loop: review, validate, fix, then a fresh full re-review, capped at two rounds; running a review that fixes findings and must re-review until the severity bar clears → .claude/skills/shared/protocols/double-round-trip-review.md
- `engineering-foundation-gate` — Seven engineering-foundation dimensions judged by project profile; creating or reviewing how a project is built, run, tested or checked → .claude/skills/shared/protocols/engineering-foundation-gate.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `fresh-context-review` — Restart the full review in isolated sub-agents after fixes to avoid confirmation bias; re-reviewing after a fix cycle → .claude/skills/shared/protocols/fresh-context-review.md
- `goal-contract-satisfaction-loop` — Save the goal in a file and loop until every saved criterion passes; executing work against a user goal → .claude/skills/shared/protocols/goal-contract-satisfaction-loop.md
- `graph-assisted-investigation` — Run a code-graph command on the key files before concluding; investigating code while the code graph exists → .claude/skills/shared/protocols/graph-assisted-investigation.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `review-principle-awareness` — Classify the change context first, then apply the current principles that fit it; starting any review → .claude/skills/shared/protocols/review-principle-awareness.md
- `review-protocol-injection` — Verbatim template and protocol blocks for every fresh sub-agent review prompt; spawning a fresh sub-agent to review → .claude/skills/shared/protocols/review-protocol-injection.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `systematic-review-batching` — Map-reduce review: size-capped batches, one sub-agent per batch, then reduce; reviewing a large changeset → .claude/skills/shared/protocols/systematic-review-batching.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
- `trade-off-interrogation-gate` — Three trade-off questions before any verdict, score or recommendation; rendering a verdict or recommending an option → .claude/skills/shared/protocols/trade-off-interrogation-gate.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:double-round-trip-review:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** run the review loop (aka **Self-Review Convergence Loop**): review → validate findings → fix validated blocking findings → FULL re-review. Any newly produced output/judgment gets ≥1 self-review, and any new judgment ≥1 `/why-review --validate-findings` pass, before it is treated as final.
- **MANDATORY severity floor:** round 1 exits only on zero findings at any severity; from round 2 the bar is zero CRITICAL/HIGH/MEDIUM, so a LOW-only round ENDS the loop once the persisted `minRounds` is met — list every deferred LOW in the report. NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to reach the exit, and NEVER apply the floor to a binary gate (test-green, security must-fix).
- **MANDATORY round cap of 2, extendable ONCE to round 3 — a ceiling, NEVER a target.** A clean pass ends the loop once the persisted `minRounds` is met (default 1; explicit 2 requires an independent pass). Round 2 ending with a validated CRITICAL/HIGH still open (a failed non-test binary gate counts as CRITICAL) grants exactly ONE extra round; round 2 ending with only MEDIUM/`NOT VERIFIABLE` open, or round 3 ending with any review blocker open → **STOP and escalate via `AskUserQuestion`**, never a silent PASS. The 2-repeated-no-progress blocker rule escalates earlier if it trips first. A failing TEST gate has NO round cap and buys no extension — keep fixing and re-running until tests pass, never forcing green.

<!-- /SYNC:double-round-trip-review:reminder -->





<!-- SYNC:graph-assisted-investigation:reminder -->

**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files before concluding when graph.db exists. Pattern: grep → graph trace → grep verify.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

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

<!-- SYNC:systematic-review-batching:reminder -->

- **MANDATORY** Large changeset → batch by size cap (≤8 files OR ≤2000 diff-lines), one parallel sub-agent per batch; never review many files one-by-one.
- **MANDATORY** > 6 categories OR > 40 files → add the hierarchical synthesis tier; each concern-synthesizer emits cross-concern interaction candidates and the orchestrator runs the cross-concern pass before concluding.

<!-- /SYNC:systematic-review-batching:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->


<!-- SYNC:category-review-thinking:reminder -->

- **MANDATORY** Derive review categories from file language + directory semantics + change nature; create a sub-task per category.
- **MANDATORY** Derive each category's concerns from first principles with `file:line` evidence — never a fixed checklist.

<!-- /SYNC:category-review-thinking:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `AskUserQuestion` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

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

**IMPORTANT MUST ATTENTION — Main steps (execute in order, NEVER skip/merge):** (1) Resolve scope (args else `AskUserQuestion`; map to each child's args) → (2) Load project reference docs once → (3) Parallel fan-out of all three read-only sub-agents in ONE message behind an all-return barrier → (4) Progressive synthesis into ONE report at status `IN PROGRESS` — merge + dedup each face AS it returns, never held in memory, then run the §20.2 coverage sweep + §20.3 self-audit over the merged set → (5) Fix-report-per-review `/why-review` gate (one merged pass walking each of the three faces + the dedup, status `VALIDATING`) → (6) Finalize — lock the combined verdict + flip status to `FINISHED` → Next Steps `AskUserQuestion`. The report lifecycle is `IN PROGRESS → VALIDATING → FINISHED` on ONE file, never re-created.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries; each is a signpost — the canonical body above governs, NEVER skip one):**

- **Graph-Assisted Investigation:** Run one graph command on key files before concluding.
- **Sub-Agent Return Contract:** The three children return only the summary; full reports on disk.
- **Nested Task Creation:** Pre-expand each child's phase list and link the workflow row before spawning.
- **Project Reference Docs Guide:** Read required project docs first; `lessons.md` always.
- **Task Tracking & External Report:** Bootstrap tasks; persist the consolidated report to `tmp/reports/`.
- **Critical Thinking Mindset:** Apply critical + sequential thinking; no guess as fact.
- **Evidence-Based Reasoning:** Cite `file:line` for every claim; confidence >80% to act.
- **Double Round-Trip Review:** Validate → fix downstream only for current-round blocking findings → full re-review; Round 1 requires zero findings, while Round 2 requires zero CRITICAL/HIGH/MEDIUM with LOW deferred and binary gates still blocking.
- **Fresh Context Review:** Spawn fresh zero-memory sub-agents; never reuse across rounds.
- **Review Protocol Injection:** Embed all protocol bodies verbatim in sub-agent prompts.
- **AI Mistake Prevention:** verify generated content against evidence, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Systematic Batching:** each child owns its own map-reduce for a large scope.
- **Severity Rubric:** Classify Critical/High/Medium/Low by consequence; map sub-scores onto it.
- **Category Review Thinking:** each child derives its concerns from first principles, not a checklist.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** this is a THIN orchestrator — NEVER re-implement any of the three reviews inline; the children are 25k–34k tokens each and MUST run as sub-agents while this skill runs INLINE and spawns them — why: running them inline blows the main context and defeats the map-reduce this skill exists to perform.
**IMPORTANT MUST ATTENTION** spawn all three sub-agents in ONE message and honor the all-return barrier — advance only after EVERY child returns — why: starting synthesis before all three return produces a report missing a whole dimension.
**IMPORTANT MUST ATTENTION** dedup the intentional overlaps — one underlying issue = ONE finding citing every reporting child, ONE severity per `SYNC:severity-rubric`, never summed across duplicate reports; preserve every route-to-sibling pointer — why: three intentionally-cross-referencing reviewers inflate severity counts and bury distinct issues.
**IMPORTANT MUST ATTENTION** `architecture-scalability-review` ALWAYS grades the PROJECT even under diff scope — read its `/20` scorecard as project posture, not a diff verdict.
**IMPORTANT MUST ATTENTION** read-only until validated — run the Step 5 `/why-review` gate before handoff; every validated finding routes to a downstream `/plan`/feature flow, fixes are NEVER applied here.
**IMPORTANT MUST ATTENTION** two orchestrator-only duties in Step 4 that NO child can perform: (a) sweep the merged report against the design-review script (`.claude/docs/architecture-knowledge.md` §20.2) and record every unanswered question as an INFO `Coverage gap` line, framing remaining risk against the five judgments (§20.4); (b) run the 11 thinking red flags (§20.3) across the merged findings and demote/remove any hit BEFORE `/why-review` sees it — why: three correctly-in-lane reviewers are all blind to a question belonging to no lane, and synthesis is exactly where three children's confirmation biases compound into one authoritative-sounding report. A coverage gap is INFO only and NEVER feeds the combined-verdict rollup.

The following are all MANDATORY:

- **MANDATORY** break work into small todo tasks via `TaskCreate` BEFORE starting; mark one `in_progress`, complete it immediately after evidence.
- **MANDATORY** read required project-reference docs first (`project-structure-reference.md`, `backend-patterns-reference.md`, `code-review-rules.md`, always `lessons.md`) and cite `Reference docs read: ...` — why: project conventions override generic assumptions.
- **MANDATORY** every merged finding carries `file:line` proof + confidence (>80% to act, <80% verify first) — NEVER synthesize a finding from inference.
- **MANDATORY** run at least ONE graph command on key files before concluding when `.code-graph/graph.db` exists.
- **MANDATORY** validate decisions with the user via `AskUserQuestion` for scope resolution and next-step routing — never auto-decide the scope.

**Anti-Rationalization:**

| Evasion                                         | Rebuttal                                                                                             |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| "I'll just run the three checks inline myself"  | NEVER — each child is 25k–34k tokens; fan out as sub-agents, this skill stays inline and synthesizes |
| "Same issue from 3 reviewers = 3 High findings" | Dedup first — one underlying issue = one finding, one severity, citing every source                  |
| "asr scorecard is low, so the diff is bad"      | asr grades the PROJECT even under diff scope — read it as project posture, not a diff verdict        |
| "Findings look right, ship the report"          | Run the Step 5 `/why-review` gate first — an unvalidated sub-agent claim is a hypothesis             |
| "I'll fix the findings while I'm here"          | Read-only until validated — fixes route to a downstream `/plan`/feature flow                         |
| "Two children returned, start synthesizing"     | Honor the all-return barrier — advance only after ALL three return                                   |

**IMPORTANT MUST ATTENTION** THIN orchestrator — fan out three read-only sub-agents in ONE message, run INLINE yourself, NEVER re-implement the reviews.
**IMPORTANT MUST ATTENTION** dedup the intentional cross-references into ONE report with three sub-scores + one combined verdict, one severity per issue.
**IMPORTANT MUST ATTENTION** read-only until validated — run the `/why-review` gate, then route fixes to a downstream `/plan`/feature flow.
