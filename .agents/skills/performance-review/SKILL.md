---
name: performance-review
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

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

> **[IMPORTANT]** MANDATORY MUST ATTENTION stay project-generic: discover local stack, conventions, query APIs, index definitions, metrics, and report paths before judging.
> **[IMPORTANT]** MANDATORY MUST ATTENTION prove every performance claim with measurement or static evidence: `file:line`, query text/shape, row counts, query plan/explain output, trace, profile, or logs.
> **[IMPORTANT]** MANDATORY MUST ATTENTION review database performance one dimension at a time: over-fetching, filters, indexes, N+1 fan-out, batching, aggregation/join shape, materialization, writes, caching.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.
> **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. The leak compiles and runs, so it passes review silently while coupling the "reusable" layer to one consumer. Push domain fields/logic down into the consumer via subclass or composition.

<!-- /SYNC:ai-mistake-prevention -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step/sub-skill call, update task tracking: set `in_progress` when step starts, `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If task tools unavailable, maintain equivalent step-by-step tracker with synchronized statuses.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Ensure every shipped performance fix removes a measured (or static-risk-labeled) real bottleneck — especially database waste (too many rows, too many columns, missing/unused indexes, query-in-loop fan-out, unbounded materialization, slow joins/aggregations, write amplification) — while preserving behavior, authorization, and semantics, proven by before/after evidence, validated via `$why-review` before any fix, and confirmed by a clean full Phase-0 re-review — never a guess-driven change that hides waste or breaks correctness.

> **Renamed:** formerly `/performance` — that name no longer resolves as a slash command; use `$performance-review`.

**Workflow:**

1. **Detect** - Classify scope and bottleneck type.
2. **Discover** - Read local code, metrics, docs, query/index definitions, similar patterns.
3. **Measure** - Capture baseline or mark static-only risk.
4. **Analyze** - Run serial dimension passes with evidence.
5. **Plan** - Propose smallest fix preserving behavior.
6. **Verify** - Re-measure, run tests, and record evidence.
7. **Validate Findings** - Run `$why-review --validate-findings <report-path>` before any fix.
8. **Fix + Full Re-Review** - Fix only validated findings, then restart from Detect over the full target.

**Key Rules:**

- MANDATORY ALWAYS measure before/after; static review findings need explicit verification command.
- MANDATORY ALWAYS push row filters to data source before projection/caching; row-count reduction beats column trimming.
- MANDATORY ALWAYS verify index usability with query shape/order, not index existence alone.
- NEVER recommend caching until query shape, indexes, pagination, batching, and data volume are understood.
- Findings are not eligible for fix until `$why-review --validate-findings` confirms them; every validated fix restarts the full performance review from Phase 0.

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

## Architecture-Altitude Performance Review

> **When to apply:** design/architecture reviews (e.g. via the `architect` agent) — judging performance as a **structural property of the design** *before* it ships, not a tactical query fix *after* a bottleneck is observed. The dimension passes below stay the tool for tactical work; this section is the design-level lens layered on top.

Evaluate the bottleneck **layer model** as a design concern, not just a symptom site:

```
Performance as architecture
├── Database  — data access shape baked into the model (projection, paging, N+1 surface, index strategy)
├── API       — serialization/processing cost, parallel tuple queries, response-DTO contracts
├── Network   — payload size & call-count designed into the contract (batch endpoints vs chatty waterfalls)
├── Frontend  — bundle/lazy-load topology, OnPush/track-by/virtual-scroll as default architecture
└── Background jobs — bounded parallelism (`ParallelAsync` with `maxConcurrent`) + batch (`UpdateManyAsync`) as the shape, not an afterthought
```

Architecture-altitude rules (decide at design time — cheapest to fix here):

- **Bound every result set and project only needed columns/fields in the contract itself** — never design an unbounded read-all or `SELECT *` endpoint; unbounded reads spike memory and latency under real data volume.
- **Design out N+1 at the boundary** — eager-load / batch-fetch is the default access pattern; per-item lookups are a design smell, not a tuning detail.
- **Caching is a design decision, not a patch** — choose request-scope memoization vs bounded shared cache up front, with key dimensions (tenant/user/auth/version), TTL/invalidation, size limits, and privacy constraints specified; never cache to hide an unbounded query.
- **Async I/O is structural** — never design a path that blocks threads with `.Result`; bounded parallelism for fan-out work is part of the design, with a fresh safe scope/context per worker.
- **Make the cost visible** — design slow-operation logging and query logging in from the start so regressions are observable in production.

For database index strategy at design time, see the `database-optimization` skill (composite key order, covering/partial indexes, write-cost analysis). The tactical evidence gate (measure baseline, prove with plan/explain) in the phases below still applies to every recommendation made at this altitude.

---

## Phase 1: Discover Local Context

MANDATORY discovery before findings (MUST ATTENTION):

- ALWAYS search local standards: `performance`, `index`, `query`, `pagination`, `projection`, `database`, `profiling`, `contributing`, `style guide`.
- search 3+ similar local query/API patterns before proposing a fix.
- read target code and index/migration/schema files controlling the queried data.
- map callers and frequency using available graph/call-trace/profiler tools; if none exist, use grep/import/call hierarchy. When `.code-graph/graph.db` exists, run a graph blast-radius pass (`trace --direction downstream` on the hot path) to size the fan-out before proposing a fix — see the Graph-Assisted Investigation gate below.
- identify data shape: tenant/security-review filters, cardinality, expected max rows, selected columns/fields, sort, joins, aggregation/grouping, cache keys.
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

MANDATORY apply one focused pass per dimension. NEVER scan all dimensions at once.

### 1. Query Shape And Data Minimization

**Think:** Which rows/columns load? Are filters, projection, sorting, and limits executed by data source before materialization?

MUST ATTENTION find:

- unbounded list/read-all APIs without page, limit, cursor, or bounded business invariant
- filter after materialization (`ToList`/array/load-all before `Where`/filter)
- projection after materialization; full entity/document loaded for list/summary view
- unused includes/joins/lookup data; large text/blob/json fields in list queries
- client-side sort/group/distinct; offset pagination on very deep pages where cursor/keyset fits better
- missing tenant/auth/status/date filters in hot-path queries

Prefer fixes: push predicates to data source, select only needed fields, bound result set, use cursor/keyset for deep sequential access, keep reusable predicates near domain/query-owner layer discovered locally.

### 2. Index And Access Path

**Think:** Can existing indexes satisfy equality/range filters, joins, sort, grouping, and projection in the actual query order?

Find:

- no index for high-cardinality filters, joins, foreign keys, sort columns, or frequent group keys
- composite index field order mismatched with equality -> range -> sort access pattern
- index exists but plan ignores it because query wraps field in function/cast, uses incompatible type/collation, leading wildcard, broad `OR`, negative predicate, or low selectivity
- sort spill/filesort because index order does not match filter + order by
- covering/partial/filtered index opportunity for hot narrow query
- index bloat from adding every field without write-cost analysis

Prefer fixes: add/adjust smallest useful index, reorder composite keys to match query, rewrite predicate to be sargable, verify with plan/explain before/after, include write-cost risk.

### 3. N+1 And Fan-Out

**Think:** Does work scale with item count instead of request/job count?

Find:

- query/API/cache call inside loop, map, serializer, resolver, template/render loop, event handler loop
- per-item existence/count lookup; per-item lazy-loaded relation
- repeated same lookup with different IDs that could be one `IN`/batch/group query
- nested fan-out across services, queues, jobs, or retries
- sequential awaits where independent calls can batch or run bounded parallel with separate safe resources

Prefer fixes: batch IDs once, join/include only needed fields, prefetch dictionaries, aggregate counts in one query, use bounded concurrency, preserve ordering/authorization semantics.

### 4. Aggregation, Join, And Pipeline Shape

**Think:** Does the pipeline reduce data before expensive join/unwind/group/sort/window stages?

Find:

- join/unwind/group before selective filter
- cartesian joins or duplicate expansion not collapsed
- grouping/sorting without pre-filter or supporting index
- aggregation loads all related rows/documents when only existence/count/min/max needed
- repeated post-processing that database can compute safely

Prefer fixes: filter early, project early, aggregate at source, reduce join cardinality, use existence/count queries, repeat necessary post-expansion filters when array/child semantics require it.

### 5. Materialization And Memory

**Think:** What enters memory? Is it bounded, streamed, and tracking-free when read-only?

Find:

- large collection materialized before paging/filtering
- read-only queries tracking entities/objects unnecessarily
- blob/file/large JSON fields loaded for lightweight responses
- buffering entire export/report when streaming/chunking fits
- accidental multiple enumeration re-running query

Prefer fixes: page/chunk/stream, use no-tracking/read-only mode when local stack supports it, project lightweight DTOs, move filter before load, memoize intentionally.

### 6. Write Path, Locks, And Transactions

**Think:** Does write work batch safely and keep locks/transactions small?

Find:

- per-row save/update/delete inside loop
- long transaction wrapping remote calls or heavy reads
- unnecessary unique checks per row instead of bulk validation
- lock escalation/hot-row contention/counter updates without batching
- parallel writes sharing unsafe session/context/unit-of-work

Prefer fixes: bulk write, chunk, shorten transaction, move remote calls outside transaction, use idempotent commands, create fresh safe scope/context per parallel worker.

### 7. Cache And Reuse

**Think:** Is repeated expensive work stable, safe to reuse, and invalidated correctly?

Find:

- same lookup repeated within request/job
- hot reference data fetched every request
- cache key missing tenant/user/auth/filter/version dimensions
- cache hides unbounded query or stale security-sensitive data

Prefer fixes: request-scope memoization first, then bounded shared cache with explicit key, TTL/invalidation, size limits, privacy constraints, and hit/miss metrics.

### 8. API, Distributed, Frontend

**Think:** Is slow work caused by network waterfall, payload size, render churn, or background fan-out?

Find:

- endpoint returns more payload than view needs
- sequential remote calls where backend aggregation or batch endpoint fits
- message consumer publishes one message per item without batching/backpressure
- frontend repeated fetch, missing list virtualization, expensive render loop, missing stable keys/track-by
- bundle or asset load dominates interaction

Prefer fixes: batch API, reduce payload, add backpressure, virtualize large lists, stabilize render keys, lazy-load cold assets/routes, measure browser/network trace.

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

Before code changes (MUST ATTENTION):

- present baseline, proposed change, behavior invariants, risks, verification commands, and rollback path.
- preserve functional behavior, authorization, ordering, pagination semantics, consistency, and idempotency.
- inspect affected tests/specs/docs when behavior, SLA, public contract, or limits change.
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

## Phase 6: Why-Review Findings Validation Gate (MANDATORY when findings exist)

> **Purpose:** Validate performance findings before optimization work. Performance reports are easy to overstate when evidence is static-only, a plan lacks production-like scale, or a proposed index/cache changes write cost or data freshness risk.

**Trigger:** Any performance finding or optimization recommendation (Critical, High, Medium, Low, WARN, or static risk). Skip ONLY when the report's verdict is unconditional PASS with literally zero findings.

**Protocol:**

1. Read own finalized report from `plans/reports/performance-{date}-{slug}.md` or the exact report path written by the caller.
2. Invoke `$why-review --validate-findings <performance-report-path>`.
3. Read the validation verdict path returned by why-review, expected as `plans/reports/why-review-validate-{date}.md`.
4. **If why-review demotes/removes any finding:** update the performance report with revised severity, removed false positives, and a `## Why-Review Validation Notes` section.
5. **If why-review confirms all findings:** append `## Why-Review Validation` stating all findings were re-validated against measurement/static evidence.
6. **If the report changed after validation:** re-run this validation gate, maximum 2 validation passes, until the report's remaining findings are validated or zero findings remain.

**Skip conditions (record explicit reason if skipping):**

- Verdict is unconditional PASS with zero findings.
- Why-review skill itself is the active context.

---

## Phase 7: Validated Fix + Full Performance Re-Review Loop (MANDATORY when validated findings remain)

**Trigger:** Phase 6 returns CLEAN/validated and the performance report still has one or more findings that must be fixed.

**Protocol:**

1. Create a fresh fix-cycle task list before editing. Do not reuse the review tasks.
2. Fix only findings that survived `$why-review --validate-findings`; if this skill is running inside a workflow, route implementation through the parent `$plan` + `$feature-implement` flow.
3. Re-measure or run the verification command named in the finding.
4. Restart the full `$performance-review` review from Phase 0 over the complete current target, not only the fixed files.
5. The restarted pass MUST create brand-new review tasks, re-detect scope, rediscover local context, rerun baseline/graph/profiler checks where applicable, and analyze all dimensions again from the beginning.
6. Repeat validate → fix → full performance re-review until a complete pass has zero findings.
7. If the same validated blocker repeats across 3 full invocations with no progress, stop and ask the user for a decision.

**Non-negotiable rules:**

- Never fix a performance finding before `$why-review --validate-findings` validates it.
- Never mark performance review clean after a targeted before/after check only; the clean verdict must come from a full Phase 0 restart.
- Never review only fixed files during the recursive pass.
- Never reuse old todo/task items for the recursive review pass.

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

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation** — MANDATORY when `.code-graph/graph.db` exists.
>
> **HARD-GATE:** MUST ATTENTION run at least ONE graph command on key files before concluding any investigation.
>
> **Pattern:** Grep finds files → `trace --direction both` reveals full system flow → Grep verifies details
>
> | Task                | Minimum Graph Action                         |
> | ------------------- | -------------------------------------------- |
> | Investigation/Scout | `trace --direction both` on 2-3 entry files  |
> | Fix/Debug           | `callers_of` on buggy function + `tests_for` |
> | Feature/Enhancement | `connections` on files to be modified        |
> | Code Review         | `tests_for` on changed functions             |
> | Blast Radius        | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Use `--node-mode file` first (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Classify every finding by consequence, not by how easy it is to fix. One scale across all reviews so a "High" means the same thing everywhere.
>
> | Severity | Action | Definition |
> | --- | --- | --- |
> | CRITICAL | Block merge | Silent runtime failure, data corruption, validation bypass, security hole |
> | HIGH | Must fix | Incorrect behavior, invariant gap, architectural violation |
> | MEDIUM | Should fix | Design debt, maintainability, likely future bug |
> | LOW | Nice to fix | Convention, documentation, minor clarity |
>
> **Score-based skills** map their numeric scale onto these tiers — do not invent a parallel vocabulary:
>
> - **0-2 criterion scoring** (e.g. production-readiness-review): `0` = CRITICAL/HIGH (criterion unmet, blocks production readiness), `1` = MEDIUM (partial, should fix), `2` = pass (no finding).
> - **Two-axis scoring** (e.g. performance-review, impact × likelihood): map the resulting cell to the nearest tier — high-impact + high-likelihood → CRITICAL/HIGH; low-impact OR low-likelihood → MEDIUM/LOW.
>
> A finding's tier drives the gate: CRITICAL/HIGH must be resolved or explicitly accepted by the owner before PASS; MEDIUM/LOW may ship with a tracked follow-up.

<!-- /SYNC:severity-rubric -->

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

<!-- SYNC:systematic-review-batching:reminder -->

- **MANDATORY** Large changeset → batch by size cap (≤8 files OR ≤2000 diff-lines), one parallel sub-agent per batch; never review many files one-by-one.
- **MANDATORY** > 6 categories OR > 40 files → add the hierarchical synthesis tier; each concern-synthesizer emits cross-concern interaction candidates and the orchestrator runs the cross-concern pass before concluding.

<!-- /SYNC:systematic-review-batching:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify findings Critical/High/Medium/Low by consequence; Critical/High block PASS until fixed or owner-accepted.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:category-review-thinking:reminder -->

- **MANDATORY** Derive review categories from file language + directory semantics + change nature; create a sub-task per category.
- **MANDATORY** Derive each category's concerns from first principles with `file:line` evidence — never a fixed checklist.

<!-- /SYNC:category-review-thinking:reminder -->

## Closing Reminders

**IMPORTANT Goal:** Ensure every shipped performance fix removes a measured (or static-risk-labeled) bottleneck while preserving behavior, authorization, and semantics — proven by before/after evidence, validated via `$why-review` before any fix, and confirmed by a clean full Phase-0 re-review — never a guess-driven change that hides waste or breaks correctness.
**MANDATORY** stay project-generic: discover local stack, conventions, query APIs, index definitions, metrics, and report paths before judging.
**MANDATORY** prove every performance claim with measurement or static evidence: `file:line`, query text/shape, row counts, query plan/explain output, trace, profile, or logs.
**MANDATORY** review database performance one dimension at a time: over-fetching, filters, indexes, N+1 fan-out, batching, aggregation/join shape, materialization, writes, caching.
**MANDATORY** ALWAYS measure before/after; static review findings need explicit verification command.
**MANDATORY** ALWAYS verify index usability with actual query shape/order and plan/explain; index existence alone is not proof.
**IMPORTANT MANDATORY MUST ATTENTION** ALWAYS push row filters to data source before projection/caching; row-count reduction beats column trimming.
**IMPORTANT MUST ATTENTION** after any validated performance fix, restart the full performance review from Phase 0 before claiming PASS.
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
> **Step 2 — Size-capped batches.** One sub-agent per batch of **≤8 files OR ≤2000 diff-lines**, whichever hits first. Category stays the concern axis, but any category exceeding a cap splits into multiple size-capped batches (30 backend files → 4 batches). Size caps — not category caps — make "many files" safe: a category cap alone lets one giant category blow a single agent's context.
>
> **Step 2a — Sub-agent type per batch** (match the batch's dominant concern):
>
> - Code logic (any stack) → `code-reviewer`
> - Security-sensitive changes → `security-auditor`
> - Performance-critical paths → `performance-optimizer`
> - Docs, plans, specs, configs, infra → `general-purpose`
>
> Each batch sub-agent receives: its full file list; `SYNC:category-review-thinking` as its primary thinking model — derive each category's concerns from first principles, NOT a fixed checklist (if the consuming skill does not carry that block, apply category-first thinking directly); project reference docs relevant to its concern (discover via `*patterns*`, `*conventions*`, `*style-guide*`); cross-reference verification instructions (counts, tables, links). All batch agents run in parallel and write findings to `plans/reports/` (per `SYNC:task-tracking-external-report`); reducers read from disk, never from memory.
>
> **Step 3 — Reduce.**
>
> - **Flat reduction (rung 2, ≤6 categories AND ≤40 files):** the orchestrator collects each batch report, cross-references counts/tables/contracts ACROSS batches, detects gaps visible only across categories (feature in code but missing from docs; new API endpoint with no client call), and consolidates into one categorized holistic report.
> - **Hierarchical reduction (rung 3, > 6 categories OR > 40 files):** insert a mid-tier — each concern gets ONE synthesizer agent that reads only its own batch reports and emits a single concern-synthesis. The orchestrator reads the **concern-syntheses (~5)**, never the raw batch reports — keeping the reducer's context O(#concerns), not O(#files).
>   - **Cross-concern interaction pass (mandatory at rung 3 — closes the synthesis-tier blind spot):** concern-siloed synthesis can drop an interaction spanning two concerns AND two batches (tainted source in data-layer/batch 7 → sink in api/batch 3). So: (a) each concern-synthesizer MUST emit an explicit **"cross-concern interaction candidates"** list — entities/symbols/contracts it touched that plausibly bind to another concern (shared DTOs, event names, table/collection names, exported symbols); (b) the orchestrator MUST run the Step-3 cross-reference/gap step **over those candidate lists across all concern-syntheses**, not only within a batch, before concluding. Without this pass the tier trades completeness for context-bounding on exactly the large diffs it targets.
>
> **Step 4 — Holistic assessment.** With all findings combined, judge: overall coherence as a unified intent; cross-category sync (docs match code? contracts match callers?); risk areas where categories interact; missing doc/spec updates for changed artifacts.
>
> **No silent truncation.** If any cap forces sampling or a batch is dropped for budget, ANNOUNCE the dropped/sampled scope explicitly — bounded coverage must never read as complete coverage.

<!-- /SYNC:systematic-review-batching -->

<!-- SYNC:critical-thinking-mindset:reminder -->
**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->
**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)
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
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
