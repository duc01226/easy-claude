---
name: production-readiness-review
description: '[Code Quality] Use when a workflow step or the user asks for a production readiness review. Reviews service-layer and API changes.'
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

**Goal:** Ensure service/API changes are production-ready across observability, reliability, data integrity, and database performance: score each dimension with evidence and expose operational gaps.

**Summary:**

- **Main steps (in order):** (1) **Resolve scope** — args else `git diff --name-only` uncommitted; backend service/API files only, skip frontend/tests/docs/config-only. (2) **Score 12 criteria 0-2** across the 4 dimensions (/24). (3) **Extended SRE Readiness gate** — 8 pass/fail deploy-time + operate-time items; any failed or unresolved binary gate blocks PASS regardless of score or owner risk acceptance. Gating, NOT scored — does not change the /24 math. (4) **Map score + gate → verdict**. (5) **Structural Impact Analysis** — graph gate (blast-radius, `tests_for`, downstream trace) when `graph.db` exists. (6) **Validated Fix + Full Re-Review** loop only while current-round blocking findings remain: Round 1 = all validated severities; Round 2 = CRITICAL/HIGH/MEDIUM; LOW-only is deferred; failed binary gates always block. (7) **Emit the SRE Review Results report** — `file:line` evidence per score and per gate item. Execute in order; NEVER skip/merge a step — why: untracked steps get silently merged and gaps reach production.
- Score 12 criteria 0-2 across four dimensions (Observability/8, Reliability/8, Data Integrity/4, DB Performance/4) for an advisory /24 readiness rating (strong 19-24 / needs work 13-18 / low 0-12), separate from overall PASS/FAIL — every score needs `file:line` evidence or it is 0.
- The DB Performance Protocol is MANDATORY and non-advisory: ALL list queries must paginate (no unbounded GetAll/ToList) and ALL filter fields, foreign keys, and sort columns must have matching indexes.
- The /24 rating is advisory only; overall PASS/FAIL follows the canonical round predicate and binary gates; the graph gate, validated-fix full re-review, and DB Performance Protocol are NEVER skippable regardless of change size — and when batched (≥10 files), re-score all 12 criteria holistically from combined cross-batch evidence, never by averaging per-batch scores.
- After applying any fix, validate findings first, then rerun the FULL review (fresh sub-agent with zero prior-round memory); a pass clearing the current round's exit bar ENDS the loop (Round 1: zero findings; Round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred). Do not start another round for LOW-only findings; failed binary gates remain blocking.

**Workflow:**

1. Resolve scope from arguments or uncommitted changes; review only backend service/API files.
2. Score all 12 criteria across the four dimensions, then run the 8-item Extended SRE Readiness gate.
3. Map score plus gate to a verdict; run Structural Impact Analysis when `graph.db` exists.
4. Validate every finding, fix only validated findings that block the current round, and restart a full fresh review after fixes until the exit bar is clear; Round 2 LOW-only findings are deferred without another cycle.
5. Emit the SRE Review Results report with `file:line` evidence for every score and gate item.

**Key Rules:**

- **MUST ATTENTION** give every score and gate item `file:line` evidence; an unprovable score is `0`.
- **NEVER** skip the DB Performance Protocol, graph gate, validated-finding gate, or full re-review.
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
2. Invoke `$why-review --validate-findings tmp/reports/{skill}-{date}-{slug}.md` — verify each finding has `file:line` proof, steel-man each rejected interpretation, and stress-test every severity/score classification (each finding must clear why-review's finding-survival bar to be kept)
3. Read the CLEAN / HAS-ISSUES verdict returned by why-review
4. **If why-review demotes/removes any finding:** UPDATE own report with revised severities, remove false positives, and add a `## Why-Review Validation Notes` section citing what changed and why
5. **If why-review confirms all findings:** append a `## Why-Review Validation` line stating "All N findings re-validated against actual code; no severity changes."

**Skip conditions (record explicit reason if skipping):** unconditional PASS with zero findings; why-review is itself the active context (avoid recursion).

**Why this exists:** SRE sub-agent reports inherit confirmation bias — the orchestrator absorbs severity claims as ground truth. Validate findings BEFORE the fix so no fix is ever driven by an inflated or false finding; this gate feeds the "Validated Fix + Full Re-Review" loop below.

## Validated Fix + Full Re-Review (MANDATORY when fixes are applied)

When a review pass finds issues, validate findings before any fix. Do NOT spawn a fresh sub-agent only to re-review the same finding set before validation/fix. After validated SRE fixes applied, rerun the full SRE review. If that restarted review uses a sub-agent, spawn it with ZERO prior-round memory. A clean review pass ENDS the review once the persisted `minRounds` is met.

**When a fresh sub-agent is part of the restarted review, spawn via canonical template in `SYNC:review-protocol-injection`:**

1. `agent_type`: `code-reviewer`
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

> **MANDATORY — NO EXCEPTIONS:** If NOT already in workflow, use ask the user directly to ask user:
>
> 1. **Activate `workflow-feature` workflow** (Recommended) — investigate → plan → feature-implement → review → production-readiness-review → test → docs
> 2. **Execute `$production-readiness-review` directly** — run standalone

---

## Next Steps

**MANDATORY — NO EXCEPTIONS** — after completing, use ask the user directly:

- **"$watzup (Recommended)"** — wrap up + check doc staleness
- **"$test"** — run tests before wrapping up
- **"Skip, continue manually"** — user decides

> **Combined audit:** For a whole-project architecture + compliance + production-readiness audit in one pass, run `$architecture-review-full` (or `$start-workflow workflow-architecture-audit`) — fans out this skill, `architecture-review`, `architecture-scalability-review` as parallel sub-agents and synthesizes one consolidated report.

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting. For simple tasks, AI MUST ask user whether to skip.

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

- **MANDATORY IMPORTANT MUST ATTENTION** run the review loop (aka **Self-Review Convergence Loop**): review → validate findings → fix validated blocking findings → FULL re-review. Any newly produced output/judgment gets ≥1 self-review, and any new judgment ≥1 `$why-review --validate-findings` pass, before it is treated as final.
- **MANDATORY severity floor:** round 1 exits only on zero findings at any severity; from round 2 the bar is zero CRITICAL/HIGH/MEDIUM, so a LOW-only round ENDS the loop once the persisted `minRounds` is met — list every deferred LOW in the report. NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to reach the exit, and NEVER apply the floor to a binary gate (test-green, security must-fix).
- **MANDATORY round cap of 2, extendable ONCE to round 3 — a ceiling, NEVER a target.** A clean pass ends the loop once the persisted `minRounds` is met (default 1; explicit 2 requires an independent pass). Round 2 ending with a validated CRITICAL/HIGH still open (a failed non-test binary gate counts as CRITICAL) grants exactly ONE extra round; round 2 ending with only MEDIUM/`NOT VERIFIABLE` open, or round 3 ending with any review blocker open → **STOP and escalate by asking the user directly**, never a silent PASS. The 2-repeated-no-progress blocker rule escalates earlier if it trips first. A failing TEST gate has NO round cap and buys no extension — keep fixing and re-running until tests pass, never forcing green.

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
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `$project-init` or the narrow owner route before relying on it.
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

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm by asking the user directly BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** ask the user directly reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

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

**IMPORTANT MUST ATTENTION — Main steps (execute in order, NEVER skip/merge):** (1) Resolve scope (args else uncommitted `git diff`; backend service/API only, skip frontend/tests/docs/config-only) → (2) Score the 12 criteria 0-2 across the 4 dimensions (/24) → (3) Extended SRE Readiness gate — 8 pass/fail deploy/operate items; any failed or unresolved binary gate blocks PASS regardless of owner risk acceptance (gating, not scored, does not change /24) → (4) Map score + gate → verdict → (5) Structural Impact Analysis graph gate when `graph.db` exists → (6) Validated Fix + Full Re-Review only for current-round blocking findings (Round 1: all; Round 2: CRITICAL/HIGH/MEDIUM; LOW-only deferred; binary gates always block) → (7) Emit the SRE Review Results report with `file:line` evidence per score and per gate item — why: AI repeatedly forgets the graph gate and the re-review loop and stops at scoring.

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

- **MANDATORY** break work into small todo tasks via task tracking BEFORE starting; mark one `in_progress`, complete it immediately after evidence — why: untracked review steps get silently merged or skipped.
- **MANDATORY** read required project-reference docs first (`code-review-rules.md`, `backend-patterns-reference.md`, `domain-entities-reference.md`, always `lessons.md`) and cite `Reference docs read: ...` — why: project conventions override generic SRE assumptions.
- **MANDATORY** grep 3+ existing patterns for the changed area (base handlers, base-controller error handling, paging/index helpers) and verify pattern fit before scoring — why: closest example ≠ matching preconditions; a paging helper may not apply to this query's lifetime/scope.
- **MANDATORY** every score, finding, and recommendation carries `file:line` proof + confidence (>80% to act, <80% verify first) — NEVER score from inference — why: scoring without trace is the #1 false-PASS source.
- **MANDATORY** ALL list queries MUST paginate (no unbounded `GetAll`/`ToList`/`Find` without `Skip/Take` or cursor); ALL filter fields, foreign keys, and sort columns MUST have matching indexes — score `0` until each is proven.
- **MANDATORY** run at least ONE graph command on key files before concluding when `.code-graph/graph.db` exists (blast-radius, `tests_for`, downstream trace) — why: the HARD-GATE catches cross-service consumers grep alone misses.
- **MANDATORY** when batched (≥10 files), RE-SCORE all 12 criteria holistically from combined cross-batch evidence — NEVER average per-batch scores — why: a cross-file criterion (query in one batch, migration in another) false-flags `0` per-batch.
- **MANDATORY** changed core logic clears the MUTATION-SCORE gate, not a coverage %; every behavior-changing finding feeds BOTH the spec (name the contract/invariant in §8) AND a guarding test — a code-only fix is INCOMPLETE.
- **MANDATORY** validate decisions with the user by asking the user directly for workflow/next-step routing — never auto-decide.

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
**IMPORTANT MUST ATTENTION** DB Performance Protocol + graph gate + validated-fix full re-review are NEVER skippable regardless of change size.
**IMPORTANT MUST ATTENTION** validate findings before fixing, then rerun the FULL review before PASS — a pass clearing the current round's exit bar ENDS the loop (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred).

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
