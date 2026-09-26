---
name: production-readiness-review
version: 1.6.0
description: '[Code Quality] Use when a workflow step or the user asks for a production readiness review. Reviews service-layer and API changes.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Ensure service/API changes are production-ready across observability, reliability, data integrity, and database performance: score each dimension with evidence and expose operational gaps.

**Summary:**

- **Main steps (in order):** (1) **Resolve scope** — args else `git diff --name-only` uncommitted; backend service/API files only, skip frontend/tests/docs/config-only. (2) **Score 12 criteria 0-2** across the 4 dimensions (/24). (3) **Extended SRE Readiness gate** — 8 pass/fail deploy-time + operate-time items; any failed or unresolved binary gate blocks PASS regardless of score or owner risk acceptance. Gating, NOT scored — does not change the /24 math. (4) **Map score + gate → verdict**. (5) **Structural Impact Analysis** — graph gate (blast-radius, `tests_for`, downstream trace) when `graph.db` exists. (6) **Validated Fix + Full Re-Review** loop only while current-round blocking findings remain: Round 1 = all validated severities; Round 2 = CRITICAL/HIGH/MEDIUM; LOW-only is deferred; failed binary gates always block; not run under `--report-only`. (7) **Emit the SRE Review Results report** — `file:line` evidence per score and per gate item. Execute in order; NEVER skip/merge a step — why: untracked steps get silently merged and gaps reach production.
- Score 12 criteria 0-2 across four dimensions (Observability/8, Reliability/8, Data Integrity/4, DB Performance/4) for an advisory /24 readiness rating (strong 19-24 / needs work 13-18 / low 0-12), separate from overall PASS/FAIL — every score needs `file:line` evidence or it is 0.
- The DB Performance Protocol is MANDATORY and non-advisory: ALL list queries must paginate (no unbounded GetAll/ToList) and ALL filter fields, foreign keys, and sort columns must have matching indexes.
- The /24 rating is advisory only; overall PASS/FAIL follows the canonical round predicate and binary gates; the graph gate, validated-fix full re-review, and DB Performance Protocol are NEVER skippable regardless of change size — and when batched (≥10 files), re-score all 12 criteria holistically from combined cross-batch evidence, never by averaging per-batch scores.
- **`--report-only`:** read-only leaf mode for a caller that owns every fix and re-review — main steps 1–5 and 7 plus the Why-Review Findings Validation Gate, no fix, no restart, no nested sub-agents, no user prompt, no writer beyond the report; returns the `/24` score, gate verdict, and severity-grouped findings; see [Report-Only Mode](#report-only-mode---report-only).
- After applying any fix, validate findings first, then rerun the FULL review (fresh sub-agent with zero prior-round memory); a pass clearing the current round's exit bar ENDS the loop (Round 1: zero findings; Round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred). Do not start another round for LOW-only findings; failed binary gates remain blocking.

**Workflow:**

1. Resolve scope from arguments or uncommitted changes; review only backend service/API files.
2. Score all 12 criteria across the four dimensions, then run the 8-item Extended SRE Readiness gate.
3. Map score plus gate to a verdict; run Structural Impact Analysis when `graph.db` exists.
4. Validate every finding, fix only validated findings that block the current round, and restart a full fresh review after fixes until the exit bar is clear; Round 2 LOW-only findings are deferred without another cycle. Under `--report-only`, validate only — the caller owns fixes and re-review.
5. Emit the SRE Review Results report with `file:line` evidence for every score and gate item.

**Key Rules:**

- **MUST ATTENTION** give every score and gate item `file:line` evidence; an unprovable score is `0`.
- **NEVER** skip the DB Performance Protocol, graph gate, validated-finding gate, or full re-review. Under `--report-only` the full re-review belongs to the caller that applies the fixes; the other three still run here.
- **MUST ATTENTION** re-score all 12 criteria holistically when batching; never average per-batch scores.
- **NEVER** let advisory technique or scenario matrices change the `/24` score, gate result, or verdict.

**When to use:** After implementing backend service or API changes, before committing. Frontend-only changes exempt.

**Why:** Working code that can't be debugged, monitored, or rolled back is technical debt in disguise.

**Deployment context:** Read `docs/project-config.json` → `infrastructure` section:

- `containerization` → check Dockerfiles, docker-compose
- `orchestration` → check K8s manifests, Helm charts
- `cicd.tool` → check pipeline configs

## Your Mission

<task>
$ARGUMENTS
</task>

## Report-Only Mode (`--report-only`)

> **Use when** a caller runs this skill as a read-only leaf — e.g. a workflow parallel review barrier or a review batch — and another step owns every fix. `--report-only` in `$ARGUMENTS` is an execution flag, not a scope; without it every step below applies unchanged.
>
> 1. **Run main steps 1–5 and 7 plus the Why-Review Findings Validation Gate.** Scope, the 12-criterion score, the Extended SRE Readiness gate, verdict mapping, the DB Performance Protocol, and the Structural Impact Analysis graph gate all run; `/why-review --validate-findings` still validates every finding. **Step 6 does not run:** no fix, no restart, no fresh re-review sub-agent. Return the validated report; the caller owns fixes and any re-review. — why: two writers of one artifact inside a barrier race each other.
> 2. **Resolve scope from the caller's brief — never ask.** Apply Scope Resolution to the brief's files or diff. No backend service/API file in scope → return `N/A — no service/API files in scope` with the file list as evidence. — why: a leaf cannot reach the user, so an asking branch would stall the barrier.
> 3. **No nested fan-out.** Skip `SYNC:systematic-review-batching`; score the whole scope serially in this context (the holistic-scoring fallback above). — why: this skill is already a leaf of the caller's fan-out; a second level breaks the caller's barrier.
> 4. **Map every gap to a severity by consequence** (`SYNC:severity-rubric`): a criterion scored `0` → CRITICAL or HIGH, `1` → MEDIUM, LOW only for a polish-only gap with evidence of no material impact; emit score, consequence, and tier together. A `fail` gate item is a failed binary gate carried as a CRITICAL blocker with its named consequence; a `partial` item is an open evidence blocker, never LOW.
> 5. **Write only the report** under `tmp/reports/`. A missing or stale project-reference doc is recorded in the report as a `NOT VERIFIABLE` assumption and returned — never a trigger to run `/scan`, `/project-init`, or any other writer. — why: a leaf that regenerates shared docs races its barrier siblings.
> 6. **Return** the report path; the advisory `/24` score; the `{n}/8` gate result and verdict (PASS only when no failed or unresolved binary gate and no finding blocking the current round remains); validated findings grouped Critical / High / Medium / Low; and every unconfirmed material trade-off in the summary (the `SYNC:trade-off-interrogation-gate` non-asking handoff). The Workflow Recommendation and Next Steps prompts do not run.
>
> For this mode the declared step order ends at step 7 without step 6; stopping there is the mode's contract, not a skipped step.

## Review Mindset (NON-NEGOTIABLE)

**Be skeptical. Every claim needs traced proof, confidence >80%.**

- NEVER accept operational readiness at face value — verify by reading implementations
- Every score MUST have `file:line` evidence — unprovable score = 0
- Question: "Is this really handled?" → trace error/retry/timeout path to confirm
- Challenge: "Are ALL failure modes covered?" → check behavior when dependencies fail
- Verify: "Can we debug this in production?" → check logging, correlation, metrics

## Scope Resolution

1. Arguments specify files/directories → review those
2. Else → review uncommitted changes (`git diff --name-only`)
3. Focus: backend source files under service root (per the project's structure reference / `docs/project-config.json`), API controllers, service classes
4. Skip: frontend files, test files, documentation, config-only changes

## Production Readiness Scoring

Score each criterion 0-2: **0** = not addressed, **1** = partially, **2** = fully.

> **MANDATORY when batched (≥10 files, `SYNC:systematic-review-batching` active):** score the 12 criteria **holistically across the FULL cross-batch scope**, NOT by merging or averaging per-batch scores. Several criteria are cross-file — e.g. "all query filter fields have indexes" can have the query in one batch, the migration in another; a per-batch score sees only its ≤8 files and false-flags `0` when the satisfying file lives in a different batch. The synthesis/reduce tier MUST therefore **RE-SCORE each of the 12 criteria from combined cross-batch evidence** (batch agents surface evidence per criterion; reducer assigns the score). If holistic re-score is infeasible, do NOT batch production-readiness-review — fall back to whole-scope serial scoring.

### Observability (max 8)

> **Think:** If this service errors at 3am, can on-call engineer diagnose root cause from logs alone — without reproducing?

| #   | Criterion              | What to Check                                                                                                 |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | **Structured Logging** | External API calls and critical operations log errors with context (request ID, user, parameters)             |
| 2   | **Error Context**      | Exceptions include enough context to diagnose without reproducing (entity IDs, operation type, input summary) |
| 3   | **Metrics Awareness**  | Operations >100ms consider tracking duration. New endpoints consider latency monitoring                       |
| 4   | **Correlation**        | Cross-service calls include or propagate correlation IDs for distributed tracing                              |

### Reliability (max 8)

> **Think:** If the downstream dependency is down or slow, does this service degrade gracefully or cascade-fail?

| #   | Criterion                 | What to Check                                                                                             |
| --- | ------------------------- | --------------------------------------------------------------------------------------------------------- |
| 5   | **Retry Strategy**        | Transient failures (HTTP, DB timeouts) have retry logic or documented reason for not retrying             |
| 6   | **Timeout Configuration** | HTTP clients and external calls have explicit timeout (not relying on defaults)                           |
| 7   | **Error Handling**        | Errors handled gracefully — no swallowed exceptions, no generic catch-all without logging                 |
| 8   | **Fallback Behavior**     | Critical paths define behavior when dependencies fail (degraded mode, cached response, user-facing error) |

### Data Integrity (max 4)

> **Think:** If database wiped and reseeded from scratch, does system still reach a valid state?

| #   | Criterion              | What to Check                                                                                                 |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| 9   | **Seed vs Migration**  | Seed data (default records, system config) lives in startup data seeders, NOT in one-time migration executors |
| 10  | **Seeder Idempotency** | Data seeders use check-then-create pattern (query before insert) — safe for repeated runs on any environment  |

**Decision test:** _"If the database is reset, does this data still need to exist?"_ Yes → must be in seeder. No → migration acceptable.

### Database Performance (max 4)

> **Think:** At 10x current data volume, do these queries still complete in <1s?

> **Database Performance Protocol (MANDATORY):**
>
> 1. **Paging Required** — ALL list/collection queries use pagination. NEVER load all records into memory. Verify: no unbounded `GetAll()`, `ToList()`, or `Find()` without `Skip/Take` or cursor-based paging.
> 2. **Index Required** — ALL query filter fields, foreign keys, and sort columns have database indexes configured. Verify: entity expressions match index field order, database collections have index management methods, migrations include indexes for WHERE/JOIN/ORDER BY columns.

| #   | Criterion            | What to Check                                                                                                          |
| --- | -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 11  | **Pagination**       | List/collection queries use pagination (Skip/Take, cursor). No unbounded GetAll/ToList loading all records into memory |
| 12  | **Database Indexes** | Query filter fields, foreign keys, and sort columns have matching database indexes. Migrations include index creation  |

> **Spec-Loop Discipline for changed core logic (MANDATORY — gates the verdict, not a scored criterion):**
>
> 1. **Mutation bar, not coverage %** — for changed service/API core logic the bar is the **MUTATION-SCORE gate**: a surviving mutant on a changed line is a release blocker (it proves an invariant the tests do not assert), NEVER a line-coverage-% question. A green coverage number over un-asserted behavior does not clear this gate.
> 2. **Dual feedback** — every production-readiness finding that changes behavior feeds BOTH the spec (NAME the contract/invariant in Section 8) AND a guarding test; a code-only fix is INCOMPLETE. A surviving mutant → add the killing test AND record the invariant it protects in the spec.

## Extended SRE Readiness Gate (step-by-step, pass/fail — gating, NOT scored)

> **Runs as main step 3, after scoring, before verdict mapping.** Deploy-time and operate-time SRE aspects the 12-criteria `/24` model does NOT score. Check each item **step by step**; record `pass` / `partial` / `fail` with `file:line` evidence or explicit `N/A — reason`. Gate does **not** change `/24` math — it overlays it: **a failed binary gate blocks PASS at every round regardless of score or owner risk acceptance; `partial` is unresolved, not a pass**. Separately apply the canonical review predicate: round 1 blocks every validated severity; round 2 blocks CRITICAL/HIGH/MEDIUM and defers LOW. Owner risk acceptance is recorded but does not clear a failed gate or an open blocking finding. Read deployment context from `docs/project-config.json → infrastructure` (referenced above) to decide which items are `N/A` (e.g. no orchestration → readiness/liveness probes `N/A` with stated reason).

| # | Gate Item | What to Check | Status | Evidence |
| - | --------- | ------------- | ------ | -------- |
| G1 | **Rollout & Rollback** | Deploy is staged/canary-able; a documented, fast rollback path exists (feature flag, versioned + reversible migration). No irreversible one-way change without a stated recovery plan. | pass/partial/fail | `file:line` or `N/A — reason` |
| G2 | **Health Checks** | Readiness + liveness endpoints/probes exist and reflect real dependency health (not an always-200 stub). | pass/partial/fail | ... |
| G3 | **Alerting & Runbook** | New failure modes have an actionable alert (signal, not noise) and a runbook / escalation note. | pass/partial/fail | ... |
| G4 | **SLO / Error-Budget** | Change respects an SLO or names the latency/availability target it affects; no silent new failure mode against the budget. | pass/partial/fail | ... |
| G5 | **Capacity & Resource Limits** | Load ceilings, resource limits, autoscaling/back-pressure considered; no unbounded fan-out or unbounded in-memory growth. | pass/partial/fail | ... |
| G6 | **Config & Secrets** | Required config present in all envs and fails fast if missing; no secrets committed in the diff. | pass/partial/fail | ... |
| G7 | **Graceful Shutdown/Startup** | In-flight work drains on shutdown; startup waits for / degrades gracefully on unready dependencies. | pass/partial/fail | ... |
| G8 | **Concurrency & Idempotency** | Operations are safe under retry / at-least-once delivery; no race on shared state; idempotency keys where needed. | pass/partial/fail | ... |

**Gate verdict:** `{n}/8 pass`, with each non-applicable item justified separately. Any failed or unresolved binary gate, unresolved evidence, or finding blocking the current round ⇒ overall verdict cannot be PASS even at a 19-24 score. Use `review-policy.cjs` with the persisted round/minimum; never relabel a binary failure as LOW.

## Technique Applicability (advisory — NON-SCORING, NON-GATING)

Invoke `SYNC:scale-technique-gate`: derive the system's scale tier from evidence (users/RPS, SLO, data volume, tenancy, topology — cite `file:line`/config/infra + confidence), then emit the **Technique Applicability Matrix** (`technique | tier-warranted? | present? | verdict | advice | evidence`) across the 10 concern groups. Surface warranted-but-missing reliability/scale techniques (rate limiting, backups, DR, failover, graceful degradation) as **advice**; flag `OVER-ENGINEERED` techniques the tier does not warrant.

> **Advisory only — this matrix does NOT add a gate item, does NOT change the `{n}/8` gate result, the `/24` score, or the verdict.** A `MISSING-WARRANTED` technique is guidance to consider at this tier, NOT a gate `fail`. `N/A-by-scale` for small systems is expected, never a failure. Full catalog → `.claude/docs/scale-technique-catalog.md`.

## Scoring

| Score | Advisory rating | Recommendation |
| ----- | --------------- | -------------- |
| 19-24 | Strong readiness | Candidate for PASS only after all binary gates, evidence, current-round severity bar and persisted minimum clear. No Git authority is granted. |
| 13-18 | Needs work | Address evidenced gaps; the score alone neither authorizes deployment nor invents a blocking finding. |
| 0-12 | Low readiness | Investigate operational gaps against the applicable criteria and evidence. |

**Overall PASS/FAIL is separate from the advisory score:** PASS requires the canonical `review-policy.cjs` round predicate, all binary gates and evidence resolved, and persisted `minRounds` met; otherwise FAIL. Keep deferred LOW findings visible after round 1.

> Run `python .claude/scripts/code_graph connections <file> --json` on service boundary files for cross-service impact.

## Structural Impact Analysis (MANDATORY when graph.db exists)

- `python .claude/scripts/code_graph graph-blast-radius --json` → blast radius >20 nodes = high-risk deployment
- `python .claude/scripts/code_graph query tests_for <function_name> --json` → verify test coverage on changed functions
- `python .claude/scripts/code_graph trace <service-file> --direction downstream --json` → verify all downstream event handlers, bus consumers, cross-service calls have error handling

## Why-Review Findings Validation Gate (MANDATORY when findings exist)

> **Purpose:** Adversarial validation of own findings BEFORE any fix. Catches over-flagged criteria, false positives, and severity/score inflation at the source rather than letting them drive fixes or ship downstream.

**Trigger:** Any finding produced (any severity). Skip ONLY when the verdict is unconditional PASS with literally zero findings.

**Protocol:**

1. Read own finalized report from `tmp/reports/{skill}-{date}-{slug}.md`
2. Invoke `/why-review --validate-findings tmp/reports/{skill}-{date}-{slug}.md` — verify each finding has `file:line` proof, steel-man each rejected interpretation, and stress-test every severity/score classification (each finding must clear why-review's finding-survival bar to be kept)
3. Read the CLEAN / HAS-ISSUES verdict returned by why-review
4. **If why-review demotes/removes any finding:** UPDATE own report with revised severities, remove false positives, and add a `## Why-Review Validation Notes` section citing what changed and why
5. **If why-review confirms all findings:** append a `## Why-Review Validation` line stating "All N findings re-validated against actual code; no severity changes."

**Skip conditions (record explicit reason if skipping):** unconditional PASS with zero findings; why-review is itself the active context (avoid recursion).

**Why this exists:** SRE sub-agent reports inherit confirmation bias — the orchestrator absorbs severity claims as ground truth. Validate findings BEFORE the fix so no fix is ever driven by an inflated or false finding; this gate feeds the "Validated Fix + Full Re-Review" loop below.

## Validated Fix + Full Re-Review (MANDATORY when fixes are applied)

> Not run under `--report-only` — the validated report is returned to the caller, which owns fixes and any re-review.

When a review pass finds issues, validate findings before any fix. Do NOT spawn a fresh sub-agent only to re-review the same finding set before validation/fix. After validated SRE fixes applied, rerun the full SRE review. If that restarted review uses a sub-agent, spawn it with ZERO prior-round memory. A clean review pass ENDS the review once the persisted `minRounds` is met.

**When a fresh sub-agent is part of the restarted review, spawn via canonical template in `SYNC:review-protocol-injection`:**

1. `subagent_type`: `code-reviewer`
2. Task: `"SRE production readiness review after validated fixes — score all 12 criteria (0-2) for {files reviewed in the current full scope}"`
3. Review mode: `"Fresh full re-review after validated fixes. Zero memory of prior rounds. Re-read ALL target files from scratch."`
4. Reference Docs: `code-review-rules.md` from the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path)
5. Target Files: same files from Scope Resolution
6. Integrate sub-agent report findings — DO NOT filter or override

**Fresh re-review focus** (what prior rounds typically miss):

- Operational concerns spanning multiple services
- Subtle reliability gaps (retry, circuit breakers, timeout handling)
- Missing observability (structured logging, correlation IDs, metrics)
- Data-integrity edge cases under concurrent load

**Final verdict = every review pass that actually ran, combined.**

## Output Format

```markdown
## SRE Review Results

**Scope:** {files reviewed}
**Date:** {date}
**Score:** {X}/24
**Verdict:** PASS / NEEDS WORK / NOT READY

### Observability ({X}/8)

| #   | Criterion          | Score | Evidence                   |
| --- | ------------------ | ----- | -------------------------- |
| 1   | Structured Logging | 0/1/2 | {file:line or "not found"} |
| 2   | Error Context      | 0/1/2 | ...                        |
| 3   | Metrics Awareness  | 0/1/2 | ...                        |
| 4   | Correlation        | 0/1/2 | ...                        |

### Reliability ({X}/8)

| #   | Criterion         | Score | Evidence |
| --- | ----------------- | ----- | -------- |
| 5   | Retry Strategy    | 0/1/2 | ...      |
| 6   | Timeout Config    | 0/1/2 | ...      |
| 7   | Error Handling    | 0/1/2 | ...      |
| 8   | Fallback Behavior | 0/1/2 | ...      |

### Data Integrity ({X}/4)

| #   | Criterion          | Score | Evidence |
| --- | ------------------ | ----- | -------- |
| 9   | Seed vs Migration  | 0/1/2 | ...      |
| 10  | Seeder Idempotency | 0/1/2 | ...      |

### Database Performance ({X}/4)

| #   | Criterion        | Score | Evidence |
| --- | ---------------- | ----- | -------- |
| 11  | Pagination       | 0/1/2 | ...      |
| 12  | Database Indexes | 0/1/2 | ...      |

### Extended SRE Readiness ({n}/8 gate — pass/fail, does not change /24)

| #  | Gate Item                | Status            | Evidence          |
| -- | ------------------------ | ----------------- | ----------------- |
| G1 | Rollout & Rollback       | pass/partial/fail | `file:line` / N/A |
| G2 | Health Checks            | pass/partial/fail | ...               |
| G3 | Alerting & Runbook       | pass/partial/fail | ...               |
| G4 | SLO / Error-Budget       | pass/partial/fail | ...               |
| G5 | Capacity & Resource Limits | pass/partial/fail | ...             |
| G6 | Config & Secrets         | pass/partial/fail | ...               |
| G7 | Graceful Shutdown/Startup | pass/partial/fail | ...              |
| G8 | Concurrency & Idempotency | pass/partial/fail | ...              |

_Any failed or unresolved binary gate above blocks PASS regardless of score or owner risk acceptance; open current-round blocking findings also prevent PASS._

### Gaps to Address

- {specific actionable item}

### Recommendation

{Proceed / Address gaps first}
```

## Important Notes

- Advisory (final VERDICT only) — score/verdict inform team but don't block commits; MANDATORY process steps (graph gate, validated-fix full re-review, Database Performance Protocol) are NEVER advisory
- Evidence-based — cite `file:line` for every score; unprovable score = 0
- Proportional — small bug fixes need less rigor than new endpoints (applies to VERDICT interpretation, NOT to skipping MANDATORY steps)
- Extended SRE Readiness gate is pass/fail, NOT scored — does not change `/24` math; but any failed or unresolved binary gate blocks PASS at every round, regardless of owner risk acceptance. Use `docs/project-config.json → infrastructure` to mark items `N/A` with stated reason
- Check framework patterns — background-job base handlers, base-controller error handling

---

## Workflow Recommendation

> **MANDATORY:** If NOT already in a workflow, NOT invoked by a parent skill or as a sub-agent, and NOT under `--report-only`, use `AskUserQuestion` to ask user:
>
> 1. **Activate `workflow-feature` workflow** (Recommended) — investigation, planning, and implementation, then the review steps that include this skill; its canonical sequence lives in `.claude/workflows.json`
> 2. **Execute `/production-readiness-review` directly** — run standalone

---

## Next Steps

**MANDATORY** after a standalone run, use `AskUserQuestion`. Skip it when a parent workflow or skill invoked this review, when it runs as a sub-agent, or under `--report-only` — return the report path, score, gate verdict, and findings to the caller instead:

- **"/watzup (Recommended)"** — wrap up + check doc staleness
- **"/test"** — run tests before wrapping up
- **"Skip, continue manually"** — user decides

> **Combined audit:** For a whole-project architecture + compliance + production-readiness audit in one pass, run `/architecture-review-full` (or `/start-workflow workflow-architecture-audit`) — fans out this skill, `architecture-review`, `architecture-scalability-review` as parallel sub-agents and synthesizes one consolidated report.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. For simple tasks, AI MUST ask user whether to skip.

- `domain-entities-reference.md` in the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

> **Critical Purpose:** Ensure quality — no flaws, no bugs, no missing updates, no stale content. Verify code AND documentation.

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
- `scale-technique-gate` — Which scale techniques a system warrants, and which it does not; reviewing architecture or production readiness → .claude/skills/shared/protocols/scale-technique-gate.md
- `scenario-stress-eval` — Judge the system under concrete failure and load scenarios; evaluating resilience or production readiness → .claude/skills/shared/protocols/scenario-stress-eval.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `systematic-review-batching` — Map-reduce review: size-capped batches, one sub-agent per batch, then reduce; reviewing a large changeset → .claude/skills/shared/protocols/systematic-review-batching.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
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

<!-- SYNC:scale-technique-gate:reminder -->

**IMPORTANT MUST ATTENTION** scale-technique gate: derive the scale tier from evidence FIRST (T0 internal · T1 <10k · T2 10k–1M · T3 millions+), then judge each warranted technique `PRESENT`/`MISSING-WARRANTED`/`N/A-by-scale`/`OVER-ENGINEERED`. Advise on warranted-but-missing gaps AND advise AGAINST unwarranted heavyweight techniques (anti-over-engineering). **ADVICE-ONLY — emit the Technique Applicability Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scale-technique-catalog.md` (authoritative for tier thresholds & per-technique warranting tiers — on any change update the catalog FIRST, then re-run `inject_scale_technique_gate.py`).

<!-- /SYNC:scale-technique-gate:reminder -->

<!-- SYNC:scenario-stress-eval:reminder -->

**IMPORTANT MUST ATTENTION** scenario-stress gate: reuse the scale tier `T0`–`T3` AND derive business-criticality `B0`–`B3` from evidence first — apply the **criticality-signal floor** (regulated/PII/financial/health data · money movement · auth/identity · legal-compliance → at least `B2` even absent SLA docs; do NOT default to `B3`). Select only the scenarios the `B`/`T` combination warrants, then walk each (simulate → trace → failure signature → self-heal/MTTR → trade-off) and assign `WITHSTANDS`/`DEGRADES-GRACEFULLY`/`FAILS-HARD`/`N/A-by-business`/`OVER-HARDENED`. Anti-over-engineering is first-class (a lean system that needs no HA/DR is a PASS) AND symmetric (never under-harden a `B2`+ system for low traffic). **ADVICE-ONLY — emit the Scenario Stress Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scenario-stress-catalog.md` (authoritative for scenarios/verdicts/business-tiers — on any change update the catalog FIRST, then re-run `inject_scenario_stress_gate.py`; scale tier stays single-sourced in `scale-technique-catalog.md`).

<!-- /SYNC:scenario-stress-eval:reminder -->

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

<!-- SYNC:engineering-foundation-gate:reminder -->

**IMPORTANT MUST ATTENTION** engineering-foundation gate — judges whether the team can build, run, test, and change the system repeatably as it grows. Derive lifecycle, scale, criticality, repository shape, and runtime from evidence; take the lower supported tier when unknown. Judge all 7 dimensions, using `N/A-by-profile` with evidence when a concern truly does not apply. **F1** reproducible build/run/test path · **F2** document and exercise each supported or required execution mode; dual host/container or other modes only when the project uses or needs them · **F3** environment portability at applicable local/CI/production-shaped targets · **F4** meaningful test-strength evidence without making one mutation tool universal · **F5** measured performance where scale/risk warrants it · **F6** change/build scalability where the repository has meaningful module boundaries · **F7** mechanical checks selected for the stack/profile. For each, judge outcomes rather than tools, and preserve anti-over-engineering. Foundation creation may block on missing warranted outcomes; brownfield audits advise and name the smallest next step. Catalog → `.claude/docs/engineering-foundation-catalog.md` (update first, then re-run `inject_engineering_foundation_gate.py`).

<!-- /SYNC:engineering-foundation-gate:reminder -->

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Ensure service/API changes are production-ready across observability, reliability, data integrity, and database performance: score each dimension with evidence and expose operational gaps.

**IMPORTANT MUST ATTENTION — Main steps (execute in order, NEVER skip/merge):** (1) Resolve scope (args else uncommitted `git diff`; backend service/API only, skip frontend/tests/docs/config-only) → (2) Score the 12 criteria 0-2 across the 4 dimensions (/24) → (3) Extended SRE Readiness gate — 8 pass/fail deploy/operate items; any failed or unresolved binary gate blocks PASS regardless of owner risk acceptance (gating, not scored, does not change /24) → (4) Map score + gate → verdict → (5) Structural Impact Analysis graph gate when `graph.db` exists → (6) Validated Fix + Full Re-Review only for current-round blocking findings (Round 1: all; Round 2: CRITICAL/HIGH/MEDIUM; LOW-only deferred; binary gates always block; not run under `--report-only`) → (7) Emit the SRE Review Results report with `file:line` evidence per score and per gate item — why: AI repeatedly forgets the graph gate and the re-review loop and stops at scoring.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries; each is a signpost — the canonical body above governs, NEVER skip one):**

- **Graph-Assisted Investigation:** Run one graph command on key files before concluding.
- **Sub-Agent Return Contract:** Sub-agents return only the summary; full report on disk.
- **Nested Task Creation:** Child skills still create visible phase tasks under the parent.
- **Project Reference Docs Guide:** Read required project docs first; `lessons.md` always.
- **Task Tracking & External Report:** Bootstrap tasks; persist review findings to `tmp/reports/`.
- **Critical Thinking Mindset:** Apply critical + sequential thinking; no guess as fact.
- **Evidence-Based Reasoning:** Cite `file:line` for every claim; confidence >80% to act.
- **Double Round-Trip Review:** Review → validate → fix blocking findings → full re-review; round 1 requires zero findings, round 2 requires zero CRITICAL/HIGH/MEDIUM with LOW deferred.
- **Fresh Context Review:** Spawn fresh zero-memory sub-agent after fixes; never reuse.
- **Review Protocol Injection:** Embed all 11 protocol bodies verbatim in sub-agent prompts.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Systematic Batching:** ≥10 files → size-capped parallel batches, then reduce.
- **Severity Rubric:** Classify Critical/High/Medium/Low by consequence using `SYNC:severity-rubric`; map 0–2 scores onto it. Round 1 blocks on every validated finding, round 2 blocks only CRITICAL/HIGH/MEDIUM, LOW is recorded/deferred, and failed binary gates always block.
- **Category Review Thinking:** Derive each category's concerns from first principles, not a checklist.
- **Scale-Technique Gate (advisory):** Derive scale tier from evidence, emit the Technique Applicability Matrix as guidance — NEVER mutate the `/24`, the `{n}/8` gate, or the verdict.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** every score requires `file:line` evidence — unprovable score = 0; assume the worst without proof — why: an unverified "looks fine" is how silent operational gaps reach production.
**IMPORTANT MUST ATTENTION** the DB Performance Protocol, graph gate, and validated-fix full re-review are NEVER skippable regardless of change size — the /24 rating is advisory, overall PASS/FAIL and these process steps are not — why: small changes are exactly where unbounded queries and missing re-reviews slip through.
**IMPORTANT MUST ATTENTION** validate findings BEFORE any fix, then rerun the FULL review (fresh sub-agent, zero prior-round memory) before declaring PASS — a pass clearing the current round's exit bar ENDS the loop (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred) — why: every fix invalidates the prior verdict.

The following are all MANDATORY:

- **MANDATORY** break work into small todo tasks via `TaskCreate` BEFORE starting; mark one `in_progress`, complete it immediately after evidence — why: untracked review steps get silently merged or skipped.
- **MANDATORY** read required project-reference docs first (`code-review-rules.md`, `backend-patterns-reference.md`, `domain-entities-reference.md`, always `lessons.md`) and cite `Reference docs read: ...` — why: project conventions override generic SRE assumptions.
- **MANDATORY** grep 3+ existing patterns for the changed area (base handlers, base-controller error handling, paging/index helpers) and verify pattern fit before scoring — why: closest example ≠ matching preconditions; a paging helper may not apply to this query's lifetime/scope.
- **MANDATORY** every score, finding, and recommendation carries `file:line` proof + confidence (>80% to act, <80% verify first) — NEVER score from inference — why: scoring without trace is the #1 false-PASS source.
- **MANDATORY** ALL list queries MUST paginate (no unbounded `GetAll`/`ToList`/`Find` without `Skip/Take` or cursor); ALL filter fields, foreign keys, and sort columns MUST have matching indexes — score `0` until each is proven.
- **MANDATORY** run at least ONE graph command on key files before concluding when `.code-graph/graph.db` exists (blast-radius, `tests_for`, downstream trace) — why: the HARD-GATE catches cross-service consumers grep alone misses.
- **MANDATORY** when batched (≥10 files), RE-SCORE all 12 criteria holistically from combined cross-batch evidence — NEVER average per-batch scores — why: a cross-file criterion (query in one batch, migration in another) false-flags `0` per-batch.
- **MANDATORY** changed core logic clears the MUTATION-SCORE gate, not a coverage %; every behavior-changing finding feeds BOTH the spec (name the contract/invariant in §8) AND a guarding test — a code-only fix is INCOMPLETE.
- **MANDATORY** in a standalone run, validate decisions with the user via `AskUserQuestion` for workflow/next-step routing — never auto-decide; a parent-invoked, sub-agent, or `--report-only` run returns them to the caller instead.

**Anti-Rationalization:**

| Evasion                                       | Rebuttal                                                                                      |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| "Fix was small, skip re-review"               | NEVER — fixes changed the target; validate findings, then rerun the FULL review before PASS  |
| "Small change, skip graph gate"               | HARD-GATE applies regardless of size — run one graph command before concluding               |
| "No explicit paging but it looks fine"        | Score 0 until proven with `file:line`. Assume worst without evidence                         |
| "Already checked observability"               | Show `file:line` proof. No proof = no check                                                  |
| "The score is advisory so skip MANDATORY steps" | Only the rating is advisory. Overall PASS/FAIL, binary gates, graph checks and validated-fix re-review remain mandatory |
| "Score it from what I remember of the code"   | Re-read and cite `file:line`; inference is not evidence — unprovable = 0                      |
| "Batched, so average the per-batch scores"    | Re-score all 12 holistically from combined evidence; per-batch sees ≤8 files and false-flags |
| "Tests pass, mutation gate is covered"        | Green coverage over un-asserted behavior fails the gate; a surviving mutant is a blocker     |

**IMPORTANT MUST ATTENTION** every score needs `file:line` evidence or it is `0`; assume worst without proof.
**IMPORTANT MUST ATTENTION** `--report-only` runs steps 1–5 and 7 plus findings validation — no fix, no restart, no batching fan-out, no user question, no writer beyond the report; return the `/24` score, gate verdict, and findings grouped by severity — why: a read-only leaf that fixes, fans out, or asks races or stalls its barrier siblings.
**IMPORTANT MUST ATTENTION** DB Performance Protocol + graph gate + validated-fix full re-review are NEVER skippable regardless of change size.
**IMPORTANT MUST ATTENTION** validate findings before fixing, then rerun the FULL review before PASS — a pass clearing the current round's exit bar ENDS the loop (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred).
