---
name: performance
description: '[Debugging] Use when analyzing or optimizing performance bottlenecks: database queries, N+1 fan-out, indexing, API latency, memory, concurrency, frontend rendering, caching, and distributed paths.'
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
## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**
- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing-file hard stop:** If `docs/project-config.json`, the docs index, `lessons.md`, or any task-required reference doc is missing, stop immediately and ask the user to run `$project-config` and `$scan-all`.

**Situation-based docs:**
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec/test-case planning or TC mapping: `feature-docs-reference.md`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

> **[IMPORTANT]** MANDATORY MUST ATTENTION stay project-generic: discover local stack, conventions, query APIs, index definitions, metrics, and report paths before judging.
> **[IMPORTANT]** MANDATORY MUST ATTENTION prove every performance claim with measurement or static evidence: `file:line`, query text/shape, row counts, query plan/explain output, trace, profile, or logs.
> **[IMPORTANT]** MANDATORY MUST ATTENTION review database performance one dimension at a time: over-fetching, filters, indexes, N+1 fan-out, batching, aggregation/join shape, materialization, writes, caching.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step/sub-skill call, update task tracking: set `in_progress` when step starts, `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If task tools unavailable, maintain equivalent step-by-step tracker with synchronized statuses.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Find real performance bottlenecks, especially database waste: too many rows, too many columns, missing/unused indexes, query-in-loop fan-out, unbounded materialization, slow joins/aggregations, write amplification.

**Workflow:**

1. **Detect** - Classify scope and bottleneck type.
2. **Discover** - Read local code, metrics, docs, query/index definitions, similar patterns.
3. **Measure** - Capture baseline or mark static-only risk.
4. **Analyze** - Run serial dimension passes with evidence.
5. **Plan** - Propose smallest fix preserving behavior.
6. **Verify** - Re-measure, run tests, fresh-eyes review.

**Key Rules:**

- MANDATORY MUST ATTENTION ALWAYS measure before/after; static review findings need explicit verification command.
- MANDATORY MUST ATTENTION ALWAYS push row filters to data source before projection/caching; row-count reduction beats column trimming.
- MANDATORY MUST ATTENTION ALWAYS verify index usability with query shape/order, not index existence alone.
- NEVER recommend caching until query shape, indexes, pagination, batching, and data volume are understood.
- NEVER claim PASS after one review round on non-trivial performance work; run fresh-eyes challenge.

<target>$ARGUMENTS</target>

---

## Phase 0: Detect Scope

Classify before analysis. Detection drives dimensions, evidence, sub-agent choice.

| Scope | Signals | Primary evidence |
| --- | --- | --- |
| DB read | slow query, full scan, sort spill, high rows examined | query text/ORM expression, row count, plan/explain, indexes |
| DB write | slow save, lock waits, per-row updates, transaction bloat | write loop, batch size, lock/deadlock logs, transaction scope |
| N+1/fan-out | loop with query/API call, lazy loading, per-item lookup | caller trace, query count, loop source |
| API latency | high p95/p99, timeout, slow endpoint/job | trace/profile/logs, call chain |
| Memory/OOM | large materialization, blobs, no paging, buffering | allocation profile, result size, collection loads |
| Frontend | slow render, huge bundle, repeated fetch, DOM churn | browser profile, network waterfall, component/render trace |
| Distributed | message lag, cross-service waterfall, retry storm | trace spans, queue metrics, consumer/producer chain |

Skip reason allowed only when target explicitly narrows scope and evidence proves dimension irrelevant.

---

## Phase 1: Discover Local Context

MANDATORY discovery before findings:

- MUST ATTENTION ALWAYS search local standards: `performance`, `index`, `query`, `pagination`, `projection`, `database`, `profiling`, `contributing`, `style guide`.
- MUST ATTENTION search 3+ similar local query/API patterns before proposing a fix.
- MUST ATTENTION read target code and index/migration/schema files controlling the queried data.
- MUST ATTENTION map callers and frequency using available graph/call-trace/profiler tools; if none exist, use grep/import/call hierarchy.
- MUST ATTENTION identify data shape: tenant/security filters, cardinality, expected max rows, selected columns/fields, sort, joins, aggregation/grouping, cache keys.
- NEVER hardcode project names, repository paths, ID formats, DB engines, ORMs, or framework defaults; derive from discovered files.

---

## Phase 2: Baseline Evidence

Prefer runtime proof. If unavailable, label finding `static risk` and include exact command/query needed to verify.

MANDATORY baseline for DB findings:

- ALWAYS capture query source: `file:line` and generated SQL/query/ORM expression when available
- ALWAYS capture volume: input size, rows matched, rows returned, rows examined/scanned, page size/limit
- ALWAYS capture access path: query plan/explain, used index, sort/group strategy, join method when available
- ALWAYS capture timing: p50/p95/p99, elapsed query time, query count, allocation or response size
- ALWAYS capture context: endpoint/job/consumer frequency and worst-case fan-out

Confidence:

| Confidence | Action |
| --- | --- |
| 95%+ | Recommend fix freely. |
| 80-94% | Recommend with caveats and verification command. |
| 60-79% | List unknowns first; gather more evidence before fix. |
| <60% | STOP. Do not recommend. |

---

## Phase 3: Serial Dimension Passes

MANDATORY MUST ATTENTION apply one focused pass per dimension. NEVER scan all dimensions at once.

### 1. Query Shape And Data Minimization

**Think:** Which rows/columns load? Are filters, projection, sorting, and limits executed by data source before materialization?

MUST ATTENTION find:

- unbounded list/read-all APIs without page, limit, cursor, or bounded business invariant
- filter after materialization (`ToList`/array/load-all before `Where`/filter)
- projection after materialization; full entity/document loaded for list/summary view
- unused includes/joins/lookup data; large text/blob/json fields in list queries
- client-side sort/group/distinct; offset pagination on very deep pages where cursor/keyset fits better
- missing tenant/auth/status/date filters in hot-path queries

MUST ATTENTION prefer fixes: push predicates to data source, select only needed fields, bound result set, use cursor/keyset for deep sequential access, keep reusable predicates near domain/query-owner layer discovered locally.

### 2. Index And Access Path

**Think:** Can existing indexes satisfy equality/range filters, joins, sort, grouping, and projection in the actual query order?

MUST ATTENTION find:

- no index for high-cardinality filters, joins, foreign keys, sort columns, or frequent group keys
- composite index field order mismatched with equality -> range -> sort access pattern
- index exists but plan ignores it because query wraps field in function/cast, uses incompatible type/collation, leading wildcard, broad `OR`, negative predicate, or low selectivity
- sort spill/filesort because index order does not match filter + order by
- covering/partial/filtered index opportunity for hot narrow query
- index bloat from adding every field without write-cost analysis

MUST ATTENTION prefer fixes: add/adjust smallest useful index, reorder composite keys to match query, rewrite predicate to be sargable, verify with plan/explain before/after, include write-cost risk.

### 3. N+1 And Fan-Out

**Think:** Does work scale with item count instead of request/job count?

MUST ATTENTION find:

- query/API/cache call inside loop, map, serializer, resolver, template/render loop, event handler loop
- per-item existence/count lookup; per-item lazy-loaded relation
- repeated same lookup with different IDs that could be one `IN`/batch/group query
- nested fan-out across services, queues, jobs, or retries
- sequential awaits where independent calls can batch or run bounded parallel with separate safe resources

MUST ATTENTION prefer fixes: batch IDs once, join/include only needed fields, prefetch dictionaries, aggregate counts in one query, use bounded concurrency, preserve ordering/authorization semantics.

### 4. Aggregation, Join, And Pipeline Shape

**Think:** Does the pipeline reduce data before expensive join/unwind/group/sort/window stages?

MUST ATTENTION find:

- join/unwind/group before selective filter
- cartesian joins or duplicate expansion not collapsed
- grouping/sorting without pre-filter or supporting index
- aggregation loads all related rows/documents when only existence/count/min/max needed
- repeated post-processing that database can compute safely

MUST ATTENTION prefer fixes: filter early, project early, aggregate at source, reduce join cardinality, use existence/count queries, repeat necessary post-expansion filters when array/child semantics require it.

### 5. Materialization And Memory

**Think:** What enters memory? Is it bounded, streamed, and tracking-free when read-only?

MUST ATTENTION find:

- large collection materialized before paging/filtering
- read-only queries tracking entities/objects unnecessarily
- blob/file/large JSON fields loaded for lightweight responses
- buffering entire export/report when streaming/chunking fits
- accidental multiple enumeration re-running query

MUST ATTENTION prefer fixes: page/chunk/stream, use no-tracking/read-only mode when local stack supports it, project lightweight DTOs, move filter before load, memoize intentionally.

### 6. Write Path, Locks, And Transactions

**Think:** Does write work batch safely and keep locks/transactions small?

MUST ATTENTION find:

- per-row save/update/delete inside loop
- long transaction wrapping remote calls or heavy reads
- unnecessary unique checks per row instead of bulk validation
- lock escalation/hot-row contention/counter updates without batching
- parallel writes sharing unsafe session/context/unit-of-work

MUST ATTENTION prefer fixes: bulk write, chunk, shorten transaction, move remote calls outside transaction, use idempotent commands, create fresh safe scope/context per parallel worker.

### 7. Cache And Reuse

**Think:** Is repeated expensive work stable, safe to reuse, and invalidated correctly?

MUST ATTENTION find:

- same lookup repeated within request/job
- hot reference data fetched every request
- cache key missing tenant/user/auth/filter/version dimensions
- cache hides unbounded query or stale security-sensitive data

MUST ATTENTION prefer fixes: request-scope memoization first, then bounded shared cache with explicit key, TTL/invalidation, size limits, privacy constraints, and hit/miss metrics.

### 8. API, Distributed, Frontend

**Think:** Is slow work caused by network waterfall, payload size, render churn, or background fan-out?

MUST ATTENTION find:

- endpoint returns more payload than view needs
- sequential remote calls where backend aggregation or batch endpoint fits
- message consumer publishes one message per item without batching/backpressure
- frontend repeated fetch, missing list virtualization, expensive render loop, missing stable keys/track-by
- bundle or asset load dominates interaction

MUST ATTENTION prefer fixes: batch API, reduce payload, add backpressure, virtualize large lists, stabilize render keys, lazy-load cold assets/routes, measure browser/network trace.

---

## Phase 4: Findings And Severity

Finding format:

```markdown
- [Severity] [file:line] [dimension] Problem. Evidence: metric/plan/query count. Impact: user/system effect. Fix: smallest behavior-preserving change. Verify: command/query/metric.
```

Severity:

- Critical: outage/OOM/data corruption risk, unbounded hot path, lock storm, runaway fan-out.
- High: p95/p99 timeout risk, full scan on large/hot table/collection, N+1 on user-visible list, missing page bound.
- Medium: avoidable over-fetch, suboptimal index, repeated lookup, moderate memory waste.
- Low: cleanup with small measurable benefit or future-proofing.

NEVER inflate severity without production-like scale/frequency evidence.

---

## Phase 5: Optimize Plan

Before code changes:

- MUST ATTENTION present baseline, proposed change, behavior invariants, risks, verification commands, and rollback path.
- MUST ATTENTION preserve functional behavior, authorization, ordering, pagination semantics, consistency, and idempotency.
- MUST ATTENTION inspect affected tests/specs/docs when behavior, SLA, public contract, or limits change.
- NEVER change query semantics only to improve speed unless user approves changed behavior.
- NEVER add broad indexes/caches without write-cost, storage-cost, invalidation, and privacy analysis.

---

## Sub-Agent Routing

Use specialized help when available:

| Detected focus | Sub-agent |
| --- | --- |
| DB/query/N+1/memory/backend hot path | `performance-optimizer` |
| Auth, PII, tenant isolation, sensitive cache keys | `security-auditor` first, then `performance-optimizer` |
| Cross-service architecture, caching policy, capacity/SLO trade-off | architecture/performance specialist |
| Frontend render/bundle/network waterfall | frontend or performance specialist |

Sub-agent prompt MUST include target, detected scope, local context evidence, required dimensions, report path, and "return summary only; write full report incrementally."

---

## Fresh-Eyes Quality Loop

1. Round 1: produce findings/plan with evidence.
2. Round 2: spawn fresh reviewer or re-run review from zero-memory perspective; challenge missed bottlenecks, false positives, wrong root cause, and unsafe fixes.
3. If issues found: fix plan -> re-review with new fresh reviewer.
4. Max 3 rounds: stop and ask user for decision.

MANDATORY clean PASS on non-trivial review requires fresh-eyes challenge or explicit skip reason.

---

## Output

MANDATORY final report sections:

- Scope and detected bottleneck type
- Baseline evidence and unknowns
- Findings ordered by severity
- Optimization plan and rejected alternatives
- Verification plan with before/after metrics
- Test/spec/doc impact or explicit skip reason
- Confidence and assumptions

If evidence insufficient, output: `Insufficient evidence. Verified: [...]. Not verified: [...]. Next evidence needed: [...].`

---

## Closing Reminders

**IMPORTANT MANDATORY MUST ATTENTION** stay project-generic: discover local stack, conventions, query APIs, index definitions, metrics, and report paths before judging.
**IMPORTANT MANDATORY MUST ATTENTION** prove every performance claim with measurement or static evidence: `file:line`, query text/shape, row counts, query plan/explain output, trace, profile, or logs.
**IMPORTANT MANDATORY MUST ATTENTION** review database performance one dimension at a time: over-fetching, filters, indexes, N+1 fan-out, batching, aggregation/join shape, materialization, writes, caching.
**IMPORTANT MANDATORY MUST ATTENTION** ALWAYS measure before/after; static review findings need explicit verification command.
**IMPORTANT MANDATORY MUST ATTENTION** ALWAYS verify index usability with actual query shape/order and plan/explain; index existence alone is not proof.
**IMPORTANT MANDATORY MUST ATTENTION** ALWAYS push row filters to data source before projection/caching; row-count reduction beats column trimming.
**IMPORTANT MUST ATTENTION** run fresh-eyes challenge before PASS on non-trivial performance work.
**IMPORTANT MUST ATTENTION** add final review task checking doc/test/spec staleness.

**Anti-Rationalization:**

| Evasion | Rebuttal |
| --- | --- |
| "Bottleneck obvious, skip baseline" | No measurement = guess. Capture metric or label static risk. |
| "Index exists, so query fine" | Show plan/explain and access path. Existing unused index proves nothing. |
| "Projection enough" | First reduce rows. Loading fewer columns from too many rows still wastes work. |
| "Just cache it" | Fix query shape/index/bounds first. Cache can hide stale, unsafe, unbounded work. |
| "Only one query in code" | Trace loops, serializers, resolvers, consumers, and retries. Fan-out often hides upstream. |

**[TASK-PLANNING]** Break work into small tracked tasks before starting; update each status immediately.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. If either file or a required reference doc is missing, stop immediately and ask the user to run the project-config and scan-all skills. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure unless the user explicitly invoked a workflow/skill and the local protocol treats explicit invocation as confirmation:
   - Question: "Which workflow do you want to activate?"
   - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
   - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.
## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**
1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
