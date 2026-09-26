---
name: performance-review
description: '[Debugging] Use when a workflow step or the user asks for a performance review or optimization. Slow queries, N+1, indexing, API latency, memory/GC, concurrency, caching, frontend rendering, Core Web Vitals.'
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

## Quick Summary

**Goal:** Ensure every shipped performance fix removes a measured or static-risk-labeled bottleneck across data access, compute, runtime/GC, network, client delivery, and concurrency/resilience; calibrate every number against a known anchor, preserve behavior/authorization/semantics, prove before/after evidence, pass `$why-review` before any fix, and complete a clean full Phase-0 re-review — never hide waste or break correctness.

**Summary:**

- **Main path:** detect scope → discover local patterns → measure or label static risk → review all applicable performance dimensions → calibrate severity → plan → validate findings → fix at the owning layer → prove before/after → run a fresh full re-review.
- **Gates:** count rows before row size, bound memory/queues/concurrency, preserve authorization and semantics, and treat failed binary gates as blocking; round 1 clears all validated findings, round 2 clears only CRITICAL/HIGH/MEDIUM and defers LOW.
- **`--report-only`:** read-only leaf mode for a caller that owns every fix — Phases 0–6 only, no nested sub-agents, no writer beyond the report; see [Report-Only Mode](#report-only-mode---report-only).

**Workflow:** Detect scope → discover local patterns → measure or label static risk → analyze all applicable dimensions → plan → validate findings → fix → run a full re-review.

**Key Rules:** Evidence beats intuition; calibrate numbers against the local performance reference; bound rows, memory, queues, and concurrency; Round 1 fixes every validated severity, while Round 2 fixes only CRITICAL/HIGH/MEDIUM and defers LOW-only findings; failed binary gates always block.

> **[IMPORTANT]** MANDATORY MUST ATTENTION stay project-generic: discover local stack, conventions, query APIs, index definitions, metrics, and report paths before judging.
> **[IMPORTANT]** MANDATORY MUST ATTENTION prove every performance claim with measurement or static evidence: `file:line`, query text/shape, row counts, query plan/explain output, trace, profile, or logs.
> **[IMPORTANT]** MANDATORY MUST ATTENTION review performance one dimension at a time — ALL **12**: (1) query shape/over-fetching, (2) index/access path/data topology, (3) N+1 fan-out, (4) aggregation/join shape, (5) materialization/memory, (6) write path/locks/transactions, (7) caching, (8) API payload/frontend delivery/Core Web Vitals, (9) in-process compute/algorithmic complexity, (10) network/protocol round trips, (11) runtime/memory/GC pauses, (12) distributed resilience/load management (timeouts, retries, queue bounds). NEVER stop at 9 — 10-12 are the layers a code-only reading habitually never opens.
> **[IMPORTANT]** MANDATORY MUST ATTENTION include in-process compute, not just I/O: flag O(n²)+ nested scans, linear membership lookups inside loops, ReDoS-prone regex, and per-iteration serialize/clone — CPU bottlenecks need the same evidence rigor as queries.
> **[IMPORTANT]** MANDATORY MUST ATTENTION when an operation is fast but p95/p99 is high, suspect saturation not the query: measure pool/thread acquire-wait and queue depth, and size pools by Little's Law (in-use = arrival-rate × hold-time) × replica count.
> **[IMPORTANT]** MANDATORY MUST ATTENTION calibrate every number against a known anchor before assigning severity — latency ladder, utilization knee, Core Web Vitals thresholds, hit-ratio math (`references/performance-knowledge.md`); a breached anchor is a HYPOTHESIS to verify with local evidence, NEVER a finding on its own.

> **[PERFORMANCE-FIRST PRINCIPLES — three non-negotiable checks on every hot path, OOM first]**
>
> 1. **[MOST IMPORTANT] Hunt every OOM / out-of-memory bad practice.** Unbounded read-all / `SELECT *` / no page bound, full materialization before paging/filtering, buffering a whole export/report instead of streaming/chunking, loading blobs / large JSON / tracked entities for list views, accidental multiple enumeration, unbounded caches / accumulators / queues / in-memory joins. Triage row **COUNT before row SIZE**, reduce rows **AT THE SOURCE** — a fast query pulling millions of rows still OOMs the process. Bound EVERY result set with a page/limit/cursor or proven business invariant.
> 2. **Right data structure & algorithm for the stack.** Match the structure to the access pattern via the runtime's efficient primitive — O(1) `Set`/`Map`/dict/hash lookup instead of a linear `find`/`includes`/`contains`/`in list` scan inside a loop; no O(n²) where O(n log n) / O(n) / O(1) exists; single-pass min/max/partition instead of redundant re-sort. Prove the complexity class at worst-case N, never by intuition.
> 3. **Batch once, or parallelize — never serial fan-out.** Collapse per-item query / API / cache calls into ONE batched call (`IN` / bulk / aggregate / prefetch dictionary); where independent calls remain, run bounded-parallel with a fresh safe resource per worker instead of sequential awaits — always preserving ordering, authorization, idempotency.

> **Performance Knowledge (calibration constants & domain laws)** — the anchors severity depends on:
>
> - **Latency ladder** `1 ns → 100 ns → 100 µs → 10 ms → 100 ms` (L1 → RAM → SSD → disk seek → intercontinental), each rung ~100-1000×; **~1 ms RTT per 100 km of fiber is a hard floor** no code fix beats.
> - **Utilization knee ~70-80%** — queue wait ≈ `service_time × ρ/(1−ρ)`: 80%→4×, 90%→9×, 95%→19×. **Little's Law** `L = λ × W` sizes every pool. **Tail amplification** — fan-out to 100 backends hits a p99 ~63% of the time, so a backend p99 becomes the user's median.
> - **Core Web Vitals** LCP ≤2.5 s · INP ≤200 ms · CLS ≤0.1 · TTFB ≤800 ms, measured at **p75 of real users** (field), never a lab score alone.
> - **Cache hit-ratio math** — 90%→99% cuts origin load **10×**; percentiles are NEVER averageable.
>
> **MANDATORY MUST ATTENTION [BLOCKING at the severity/anchor moment]** READ `references/performance-knowledge.md` — full ladder, universal laws, symptom→cause triage matrix, and deep tables for network/protocol, DB engine + isolation + sharding, caching, web/CWV, memory/GC, distributed resilience, measurement rigor. The read is REQUIRED — never optional — before you **assign a severity** or **quote/compare any anchor constant**; NEVER assign a severity or cite an anchor from memory or from the 4-bullet digest above. A scope-narrowed review that assigns no severity and quotes no constant may proceed on the digest alone. — why: the digest orders hypotheses but only the body carries the thresholds severity depends on, and quoting a constant without measuring THIS system is the guess-as-fact failure this skill exists to prevent.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `category-review-thinking` — Derive review concerns per category of changed files from domain knowledge; reviewing a changeset that spans several file categories → .claude/skills/shared/protocols/category-review-thinking.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `double-round-trip-review` — Validated-finding fix loop: review, validate, fix, then a fresh full re-review, capped at two rounds; running a review that fixes findings and must re-review until the severity bar clears → .claude/skills/shared/protocols/double-round-trip-review.md
- `goal-contract-satisfaction-loop` — Save the goal in a file and loop until every saved criterion passes; executing work against a user goal → .claude/skills/shared/protocols/goal-contract-satisfaction-loop.md
- `graph-assisted-investigation` — Run a code-graph command on the key files before concluding; investigating code while the code graph exists → .claude/skills/shared/protocols/graph-assisted-investigation.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `review-principle-awareness` — Classify the change context first, then apply the current principles that fit it; starting any review → .claude/skills/shared/protocols/review-principle-awareness.md
- `scenario-stress-eval` — Judge the system under concrete failure and load scenarios; evaluating resilience or production readiness → .claude/skills/shared/protocols/scenario-stress-eval.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `systematic-review-batching` — Map-reduce review: size-capped batches, one sub-agent per batch, then reduce; reviewing a large changeset → .claude/skills/shared/protocols/systematic-review-batching.md
- `trade-off-interrogation-gate` — Three trade-off questions before any verdict, score or recommendation; rendering a verdict or recommending an option → .claude/skills/shared/protocols/trade-off-interrogation-gate.md

<!-- PROTOCOL-GUIDES:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step/sub-skill call, update task tracking: set `in_progress` when step starts, `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If task tools unavailable, maintain equivalent step-by-step tracker with synchronized statuses.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Detailed Summary

**Goal:** Ensure every shipped performance fix removes a measured or static-risk-labeled bottleneck across data access, compute, runtime/GC, network, client delivery, and concurrency/resilience; calibrate every number against a known anchor, preserve behavior/authorization/semantics, prove before/after evidence, pass `$why-review` before any fix, and complete a clean full Phase-0 re-review — never hide waste or break correctness.

**Summary:**

- **Purpose & 8-phase pipeline (the main tasks):** drive a target through **Phase 0 Detect scope (+ symptom→cause triage) → Phase 1 Discover local context (grep 3+ patterns, read index/schema, map callers) → Phase 2 Baseline evidence + anchor calibration (or `static risk` + verify cmd) → Phase 3 twelve serial dimension passes → Phase 4 Findings + Severity → Phase 5 Optimize plan (behavior-preserving) → Phase 6 `$why-review --validate-findings` gate → Phase 7 validated-fix + full Phase-0 re-review** — so every recommendation removes a real bottleneck, preserves behavior, is evidence-proven; an Architecture-Altitude lens applies the same gate at design time.
- Evidence is the gate, not intuition: capture a runtime baseline (query plan/explain, row counts, p95/p99 distributions, pool acquire-wait, GC pauses, call count × RTT, field CWV, microbench at worst-case N) or label the finding `static risk` with the exact verify command — never recommend below 60% confidence, never average percentiles, always name the load model.
- **Calibrate against the anchors in `references/performance-knowledge.md`** — latency ladder (`1 ns → 100 ns → 100 µs → 10 ms → 100 ms`), utilization knee ~70-80% (`ρ/(1−ρ)`), Little's Law, tail amplification, CWV thresholds, cache hit-ratio math — a breached anchor is a hypothesis to prove locally, NEVER a finding by itself.
- Walk dimensions ONE pass at a time — (1) query shape/data-minimization → (2) index/access-path/data-topology → (3) N+1/fan-out → (4) aggregation/join/pipeline → (5) materialization/memory → (6) write/locks/transactions → (7) cache/reuse → (8) API payload/frontend/CWV → (9) compute/algorithmic → (10) network/protocol → (11) runtime/memory/GC → (12) distributed resilience/load — never all at once; reduce rows at the source before trimming columns or caching, and size pools by Little's Law (replica count × per-instance pool) when a fast op shows high p99.
- No finding is fixable until `$why-review --validate-findings` confirms it (Phase 6); each validated fix that blocks the current round then restarts the FULL review from Phase 0 over the whole target (Phase 7). Round 1 fixes every validated severity; Round 2 fixes CRITICAL/HIGH/MEDIUM, while LOW-only findings are recorded as deferred and end the loop; failed binary gates always block. A targeted before/after check alone never earns a PASS.

> **Renamed:** formerly `/performance` — that name no longer resolves as a slash command; use `$performance-review`.

**Workflow:**

1. **Detect** - Classify scope and bottleneck type; order hypotheses via the symptom→cause matrix.
2. **Discover** - Read local code, metrics, docs, query/index definitions, similar patterns.
3. **Measure** - Capture baseline against a known anchor, or mark static-only risk.
4. **Analyze** - Run 12 serial dimension passes with evidence.
5. **Plan** - Propose smallest fix preserving behavior.
6. **Verify** - Re-measure, run tests, and record evidence.
7. **Validate Findings** - Run `$why-review --validate-findings <report-path>` before any fix.
8. **Fix + Full Re-Review** - Fix only validated findings that block the current round, then restart from Detect over the full target; Round 2 LOW-only findings do not start another cycle. Not run under `--report-only`.

**Key Rules:**

- MANDATORY ALWAYS measure before/after; static review findings need explicit verification command.
- MANDATORY ALWAYS calibrate a number against a known anchor before assigning severity; an anchor breach alone is a hypothesis, never a finding.
- MANDATORY ALWAYS push row filters to data source before projection/caching; row-count reduction beats column trimming.
- MANDATORY ALWAYS verify index usability with query shape/order, not index existence alone.
- MANDATORY ALWAYS count `call count × RTT` on a remote path, and check the timeout/retry/queue-bound before optimizing inside a call.
- NEVER recommend caching until query shape, indexes, pagination, batching, and data volume are understood; NEVER call a cache done without its measured hit ratio and bound.
- NEVER average percentiles, and NEVER trust a throughput number whose load model (open vs closed) is unstated.
- Findings are not eligible for fix until `$why-review --validate-findings` confirms them; every validated fix that blocks the current round restarts the full performance review from Phase 0. Apply the shared severity bar: Round 1 = zero findings; Round 2 = zero CRITICAL/HIGH/MEDIUM, with LOW deferred and binary gates still blocking.

<target>$ARGUMENTS</target>

## Report-Only Mode (`--report-only`)

> **Use when** a caller runs this skill as a read-only leaf — e.g. a workflow parallel review barrier over a plan or design, or a review batch — and another step owns every fix. `--report-only` in `$ARGUMENTS` selects it; without the flag every phase below applies unchanged.
>
> 1. **Run Phases 0–6 only.** A plan or design target uses the Architecture-Altitude lens with `static risk` labels. Phase 5 becomes the report's recommended optimization plan — no code, plan, or artifact edit. Phase 6 `$why-review --validate-findings` still validates every finding. **Phase 7 does not run:** return the validated report; the caller owns fixes and any re-review. — why: two writers of one artifact inside a barrier race each other.
> 2. **No nested fan-out.** Skip Sub-Agent Routing and size-capped batching; review sequentially in this context. — why: this skill is already a leaf of the caller's fan-out; a second level breaks the caller's barrier.
> 3. **Write only the report** under `tmp/reports/`. A missing or stale project-reference doc is recorded in the report as a `NOT VERIFIABLE` assumption and returned — never a trigger to run `$scan`, `$project-init`, or any other writer. — why: a leaf that regenerates shared docs races its barrier siblings.
> 4. **Return** the report path, validated findings by severity, and every unconfirmed material trade-off in the summary (the `SYNC:trade-off-interrogation-gate` non-asking handoff).
>
> For this mode the declared step order ends at Phase 6; stopping there is the mode's contract, not a skipped step.

---

## Phase 0: Detect Scope

Classify before analysis. Detection drives dimensions, evidence, sub-agent choice.

| Scope               | Signals                                                                                         | Primary evidence                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| DB read             | slow query, full scan, sort spill, high rows examined                                           | query text/ORM expression, row count, plan/explain, indexes                                     |
| DB write            | slow save, lock waits, per-row updates, transaction bloat                                       | write loop, batch size, lock/deadlock logs, transaction scope                                   |
| N+1/fan-out         | loop with query/API call, lazy loading, per-item lookup                                         | caller trace, query count, loop source                                                          |
| API latency         | high p95/p99, timeout, slow endpoint/job                                                        | trace/profile/logs, call chain                                                                  |
| Saturation/Queueing | high p99 while the operation itself is fast, pool exhausted/timeout, threads blocked on acquire | pool active/idle/pending, acquire-wait time, threads/workers vs pool size, replica count × pool |
| Memory/OOM          | large materialization, blobs, no paging, buffering                                              | allocation profile, result size, collection loads                                               |
| Frontend            | slow render, huge bundle, repeated fetch, DOM churn                                             | browser profile, network waterfall, component/render trace                                      |
| Distributed         | message lag, cross-service waterfall, retry storm                                               | trace spans, queue metrics, consumer/producer chain                                             |
| Compute/CPU         | hot loop, nested iteration, quadratic scaling, regex stall, heavy serialize/clone               | input N, operation count vs N, profiler/flame-graph sample, microbench                          |
| Network/protocol    | chatty call count, per-request handshake, no keep-alive, large payload, cross-region hop        | call count × RTT, connection reuse state, TLS/DNS timing, payload size, HTTP version            |
| Runtime/GC          | latency spikes uncorrelated with load, pauses, RSS growth, blocked event loop                    | GC log/pause histogram, allocation rate, RSS vs heap, thread states, event-loop lag             |
| Resilience/load     | retry storm, no timeout, unbounded queue, cold-start blip, one tenant degrades all               | timeout/retry config, queue depth AND age, breaker state, per-tenant rate limits                |

Skip reason allowed only when target explicitly narrows scope and evidence proves dimension irrelevant.

**Triage accelerator (symptom → usual cause).** MUST ATTENTION use the symptom→cause matrix in `references/performance-knowledge.md` §3 to pick the FIRST evidence to pull — it maps signatures AI habitually misreads, e.g. `p99 bad + p50 fine` → GC pause / lock contention / fan-out tail / cold cache (NOT a slow query); `latency scales with result size` → N+1; `sudden cliff at some load` → utilization knee or pool exhaustion; `degrades over days, fine after restart` → leak/bloat/connection leak; `slow for one tenant only` → hot key/partition skew. NEVER let the matrix replace evidence — it orders the hypotheses, Phase 2 proves one.

---

## Architecture-Altitude Performance Review

> **When to apply:** design/architecture reviews (e.g. `architect` agent) — judge performance as a **structural property of the design** BEFORE it ships, not a tactical query fix after a bottleneck appears. Dimension passes stay the tactical tool; this section is the design-level lens.

Evaluate the **layer model** as a design concern, not a symptom site:

```
Performance as architecture
├── Database  — data access shape baked into the model (projection, paging, N+1 surface, index strategy, partition/shard key)
├── API       — serialization/processing cost, batched vs per-item queries, response-DTO contracts
├── Network   — payload size & call-count designed into the contract (batch endpoints vs chatty waterfalls), endpoint placement vs RTT budget
├── Frontend  — bundle/lazy-load topology, change-detection/list-keying/virtual-scroll as default architecture
├── Runtime   — allocation profile & collector choice, event-loop discipline, pool sizing, working-set target
└── Background jobs — bounded parallelism (local concurrency-limited primitive) + bulk write (local batch API) as the shape, not an afterthought
```

Architecture-altitude rules (decide at design time — cheapest to fix here):

- **Bound every result set and project only needed columns/fields in the contract itself** — never design an unbounded read-all or `SELECT *` endpoint; unbounded reads spike memory/latency under real data volume.
- **Design out N+1 at the boundary** — eager-load / batch-fetch is the default access pattern; per-item lookups are a design smell, not a tuning detail.
- **Caching is a design decision, not a patch** — choose request-scope memoization vs bounded shared cache up front, with key dimensions (tenant/user/auth/version), TTL/invalidation, size limits, privacy constraints specified; never cache to hide an unbounded query.
- **Async I/O is structural** — never design a path blocking threads with `.Result`; bounded parallelism for fan-out is part of the design, with a fresh safe scope/context per worker.
- **Make the cost visible** — design slow-operation + query logging in from the start so regressions are observable in production.
- **Size pools and parallelism, never default them** — derive connection/thread/permit pool size from Little's Law (in-use = arrival-rate × hold-time), state the assumptions; shrink _hold-time_ (release the resource across non-DB / external-wait spans) before growing the pool; size a shared backend against fleet-aggregate demand (replica count × per-instance pool), not one instance — local per-instance tuning becomes a thundering herd on the shared dependency.
- **Budget the round trips and the geography in the contract** — count `call count × RTT` for every designed interaction and place the endpoint (edge/region/replica) against the latency budget; ~1 ms RTT per 100 km and a 2-RTT TCP+TLS handshake are floors no later optimization removes, so a chatty contract or a distant endpoint is a permanent design cost, not a tuning detail.
- **Design the load-management controls in, not on** — a decreasing timeout budget per hop, backoff + full jitter + retry budget + idempotency keys, breaker/bulkhead/shedding, and a BOUND on every queue belong in the design; leave them out and the system amplifies its own partial failures. Plan capacity **below the ~70-80% utilization knee** (`wait ≈ service × ρ/(1−ρ)`) and autoscale on a leading indicator (queue depth/concurrency), never lagging CPU.
- **Choose the runtime cost profile deliberately** — allocation rate and collector choice set the tail (GC pauses are correlated fleet-wide and invisible in the mean); an event-loop runtime must keep CPU work off the loop by design; state the working-set target so the RAM/page-cache cliff is a known bound, not a surprise.

DB index strategy at design time → dimension 2 below (composite key order, covering/partial indexes, write-cost analysis). The tactical evidence gate (measure baseline, prove with plan/explain) still applies to every recommendation at this altitude.

---

## Phase 1: Discover Local Context

MANDATORY discovery before findings (MUST ATTENTION):

- ALWAYS search local standards: `performance`, `index`, `query`, `pagination`, `projection`, `database`, `profiling`, `cache`, `timeout`, `retry`, `pool`, `contributing`, `style guide`.
- search 3+ similar local query/API patterns before proposing a fix.
- read target code and index/migration/schema files controlling the queried data.
- map callers and frequency using available graph/call-trace/profiler tools; if none exist, use grep/import/call hierarchy. When `.code-graph/graph.db` exists, run a graph blast-radius pass (`trace --direction downstream` on the hot path) to size the fan-out before proposing a fix — see the Graph-Assisted Investigation gate below.
- identify data shape: tenant/security-review filters, cardinality, expected max rows, selected columns/fields, sort, joins, aggregation/grouping, cache keys, partition/shard key, primary vs replica routing.
- ALWAYS discover the local **SLA/budget** (latency target, page-size cap, throughput/SLO) before judging any number — the local budget outranks every anchor in `references/performance-knowledge.md`.
- ALWAYS read the local resilience + delivery configuration the new dimensions rest on: HTTP client/keep-alive and pool settings, timeout/retry/breaker policy, queue and consumer bounds, rate limits, GC/runtime and container memory limits, CDN/asset caching headers, and whatever RUM/field-metrics source exists.
- NEVER hardcode project names, repository paths, ID formats, DB engines, ORMs, runtime/GC flags, HTTP clients, or framework defaults; derive every one from discovered files.

---

## Phase 2: Baseline Evidence

Prefer runtime proof. If unavailable, label finding `static risk` and include exact command/query needed to verify.

MANDATORY baseline for DB findings:

- ALWAYS capture query source: `file:line` and generated SQL/query/ORM expression when available
- ALWAYS capture volume: input size, rows matched, rows returned, rows examined/scanned, page size/limit
- ALWAYS capture access path: query plan/explain, used index, sort/group strategy, join method when available
- ALWAYS capture timing: p50/p95/p99, elapsed query time, query count, allocation or response size
- ALWAYS capture context: endpoint/job/consumer frequency and worst-case fan-out

MANDATORY baseline for compute/CPU findings:

- ALWAYS capture input size N and the growth assumption (expected and worst-case N)
- ALWAYS capture operation count vs N (constant / linear / quadratic+) and the nested-loop or repeated-scan source `file:line`
- ALWAYS capture timing: microbench / `console.time` / profiler or flame-graph sample at representative AND worst-case N

MANDATORY baseline for saturation/pooling findings:

- ALWAYS capture offered concurrency and arrival rate (RPS / worker count / threads.max)
- ALWAYS capture resource hold-time vs total request time (a connection/lock/permit is held only for the fraction it is actually used, not the whole request)
- ALWAYS capture pool state: size, active/idle/pending, and acquire-wait time / queue depth at the pool entrance
- ALWAYS capture aggregate demand on shared dependencies: replica count × per-instance pool → total connections/cores the shared backend must serve

MANDATORY calibration + measurement rigor on EVERY baseline (`references/performance-knowledge.md` §1-2, §10):

- ALWAYS state which anchor the number violates (ladder rung, utilization knee, CWV threshold, hit-ratio target) — a raw number with no anchor cannot carry a severity.
- ALWAYS report distributions, never means: p50/p90/p99/p99.9 + max, segmented by endpoint/tenant/region. NEVER average percentiles across instances or windows — aggregate histograms instead.
- ALWAYS name the load model behind any throughput/latency number: open-model (arrival-rate) exposes queueing collapse, closed-model (fixed VUs) HIDES it; flag suspected **coordinated omission** when a tool reports an implausibly clean tail.
- ALWAYS state data volume and cache state of the measurement — a benchmark on toy data or a warm-only cache is fiction; soak/endurance is the only shape that surfaces leaks, fragmentation, and bloat. **Produce that volume with the project's seeder** — `seed-test-data` exposes a configurable count built for exactly this (self-test the cases AND enrich volume); measure at ≥2 volumes ~10× apart so a super-linear curve is visible, and demand realistic **shape** (distribution, cardinality, skew), since uniform rows hide the skew that breaks real hot paths.
- ALWAYS warm up (JIT + caches), measure steady state, repeat, and name the environment before comparing to a baseline; NEVER present a microbenchmark as system behavior.
- NEVER quote an anchor from the reference as a project requirement — local SLA/spec/config wins; the anchor calibrates, it does not govern.

Confidence:

| Confidence | Action                                                |
| ---------- | ----------------------------------------------------- |
| 95%+       | Recommend fix freely.                                 |
| 80-94%     | Recommend with caveats and verification command.      |
| 60-79%     | List unknowns first; gather more evidence before fix. |
| <60%       | STOP. Do not recommend.                               |

---

## Phase 3: Serial Dimension Passes

MANDATORY apply one focused pass per dimension. NEVER scan all dimensions at once. **12 dimensions** — 1-9 are the in-process/data-access core, 10-12 cover the layers a code-only reading habitually skips (network round trips, runtime/GC, resilience under load). `references/performance-knowledge.md` carries deep tables for network/protocol (§4), database (§5), caching (§6), web/CWV (§7), memory/GC (§8), and distributed resilience (§9); the remaining dimensions calibrate against the ladder, universal laws, and triage matrix (§1-3) instead of a dedicated table.

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

### 2. Index, Access Path And Data Topology

**Think:** Can existing indexes satisfy equality/range filters, joins, sort, grouping, and projection in the actual query order? **Sargability first:** for EVERY filter/join predicate, is the indexed COLUMN left bare, or is it wrapped in a function/transformation that the DB must compute per row (killing the index)? Then: does the query reach the data through the right partition/shard/replica?

> **MUST ATTENTION — Non-sargable predicate spot-check (any ORM/SQL).** Wrapping a column in a function/cast/transformation inside a query predicate translates to `func(column) = $param` — the DB CANNOT use an index on that column and full-scans. Scan every query expression for a **transformation on the COLUMN side**, not the parameter side: `.ToLower()`/`.ToUpper()`/`.Trim()`/`.Substring()` on a column, `col1 + " " + col2 == x` (concatenation), `.Date`/date-part extraction, `Convert`/cast/collation change, leading-wildcard `LIKE '%x'`, or a computed expression compared to a value. Fix — keep the column bare and move the transformation to the in-memory PARAMETER (e.g. case-insensitive via a candidate list `col == x || col == xLower`), OR persist a normalized indexed column, OR add a functional/expression index. ALWAYS prove with `EXPLAIN`/query plan: Index Scan/Seek expected, Seq Scan = the smell confirmed.

Find:

- no index for high-cardinality filters, joins, foreign keys, sort columns, or frequent group keys
- composite index field order mismatched with equality -> range -> sort access pattern
- **non-sargable predicate: an indexed column wrapped in a function/cast/concat/date-part/transformation** (see spot-check above) — the single most common silent index-loss; also incompatible type/collation, leading wildcard, broad `OR`, negative predicate, or low selectivity
- sort spill/filesort because index order does not match filter + order by
- covering/partial/filtered index opportunity for hot narrow query
- index bloat from adding every field without write-cost analysis
- **leftmost-prefix violation** — a query filtering only on the SECOND column of a composite index gets no seek from it
- **selectivity not established** — "add an index" proposed without the selectivity number; above ~5-20% selectivity a sequential scan legitimately beats random index lookups
- **stale statistics** — plan/explain shows estimated rows far from actual rows; the plan is wrong for a reason no rewrite fixes (refresh stats/analyze first)
- **partition pruning lost** — partitioned table queried without the partition key, so every partition is scanned
- **shard/partition key skew** — monotonic (timestamp/auto-increment) or low-cardinality key creating a hot shard/partition; per-partition throughput ceilings hit by one key
- **replica read correctness-vs-lag** — read-your-writes broken by replication lag, or a lag-sensitive read pointed at a replica
- random-UUID primary key destroying index locality and inflating index size (time-ordered UUIDv7/ULID fits)

Prefer fixes: add/adjust smallest useful index, reorder composite keys to match query, rewrite predicate to be sargable, refresh statistics, carry the partition/shard key into the predicate, salt or re-key a hot partition, route lag-sensitive reads to primary (or a sticky/LSN-aware window), verify with plan/explain before/after, include write-cost risk. **Escalate in order — tune query/index → cache → vertical → read replicas → partition → shard**; NEVER propose sharding before the earlier rungs are proven exhausted (why: resharding and cross-shard joins are the most expensive reversal in the ladder).

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
- **long-running or idle-in-transaction connection** — under MVCC it pins old row versions and drives bloat/vacuum pressure fleet-wide (a slow-motion outage, not a local slowdown)
- **isolation level mismatched to the invariant** — lost update at Read Committed, or write skew at Snapshot/Repeatable Read where Serializable (or an explicit lock/version column) is required; read-modify-write done in application code instead of one atomic `UPDATE`
- inconsistent lock acquisition ORDER across code paths (deadlock source), or no retry on the deadlock error
- schema/migration change taking a blocking lock proportional to table size instead of an online pattern (nullable add → batched backfill → `NOT VALID` constraint → validate; concurrent index build; expand/contract)
- durability setting silently traded for throughput without the trade named (fsync/commit-sync relaxation)

Prefer fixes: bulk write, chunk, shorten transaction, move remote calls outside transaction, use idempotent commands, create fresh safe scope/context per parallel worker, pick the isolation level the invariant needs (or an explicit `FOR UPDATE`/version column), make write conflicts atomic in one statement, order lock acquisition consistently and retry deadlocks, use the online migration pattern for large tables.

### 7. Cache And Reuse

**Think:** Is repeated expensive work stable, safe to reuse, and invalidated correctly?

Find:

- same lookup repeated within request/job
- hot reference data fetched every request
- cache key missing tenant/user/auth/filter/version dimensions
- cache hides unbounded query or stale security-sensitive data
- **no hit-ratio evidence** — a cache added without measuring the ratio; the ratio IS the value (90%→99% cuts origin load 10×, so a 60% hit ratio is barely a cache)
- **stampede/thundering-herd exposure** — hot key expiring sends every request to origin at once; no single-flight/request-coalescing, no per-key lease, no TTL jitter, or a whole key class expiring simultaneously
- **cold-start blindness** — post-deploy/failover empty cache indistinguishable from an origin outage; no warming and no LB slow-start
- unbounded cache (a memory leak with a friendly name): no size bound, no entry lifetime, no eviction policy matched to access skew — and **cache thrash** once the working set exceeds cache size (a cliff, not a slope)
- missing negative caching, so nonexistent keys generate repeated miss-storms
- schema/build version absent from the key, so a deploy can serve poisoned entries

Prefer fixes: request-scope memoization first, then bounded shared cache with explicit key, TTL/invalidation, size limits, privacy constraints, and hit/miss metrics. Add single-flight + TTL jitter for hot keys, stale-while-revalidate where staleness is acceptable, negative caching (or a Bloom filter) for absent keys, a version segment in the key, and an eviction policy matched to the access skew (LRU default, LFU/W-TinyLFU for skewed). NEVER treat "we added a cache" as a completed fix without the measured hit ratio and the bound.

### 8. API Payload, Frontend Delivery And Rendering

**Think:** Does the user-perceived time come from payload size, render/interaction work on the main thread, or asset delivery? Judge against the Core Web Vitals thresholds at **p75 of real users**, never a single lab run.

Find:

- endpoint returns more payload than the view needs; response DTO shaped by the table, not the screen
- **CWV breach** — LCP > 2.5 s, INP > 200 ms, CLS > 0.1, TTFB > 800 ms (`references/performance-knowledge.md` §7)
- **long task > 50 ms** blocking the main thread (destroys INP); CPU-bound work never yielded or moved to a Worker
- **layout thrashing** — interleaved DOM read/write forcing a synchronous reflow per iteration
- animation on layout-triggering properties (width/top/left) instead of compositor-only `transform`/`opacity`
- **CLS source** — image/ad/embed with no reserved space (`width`/`height`/`aspect-ratio`); FOIT from missing `font-display`
- render-blocking synchronous CSS/JS in `<head>`; critical CSS not inlined
- **JS weight/parse cost** — the most expensive byte class (parse + compile + execute, unlike an image); no code splitting, no route-level lazy load, no tree-shaking
- **third-party scripts** loaded eagerly (tag managers, chat, analytics) — habitually the #1 regression source
- repeated fetch, client-side request waterfall (N+1 over HTTP), missing list virtualization, unstable render keys/track-by
- hydration cost scaling with component count; rendering strategy (CSR/SSR/streaming/SSG/islands) never chosen as a performance decision
- HTTP caching wrong: assets not hashed+immutable, HTML not revalidated, `Vary` incorrect (cache poisoning), no Brotli/gzip on text
- missing resource hints where they pay (`preconnect` saves DNS+TCP+TLS, `preload` for late-discovered critical assets, `fetchpriority`)

Prefer fixes: shape the payload to the view, batch/aggregate server-side, break or yield long tasks, batch DOM reads then writes, animate compositor-only properties, reserve space for media, defer third-party and cold routes, virtualize long lists, stabilize keys, hash+immutable asset caching with correct `Vary`, Brotli text compression, AVIF/WebP + `srcset` + lazy below-fold. ALWAYS confirm with a browser profile/network waterfall AND field (RUM/CrUX) data — a lab score locates the cause, field data defines the truth.

### 9. Compute And Algorithmic Complexity

**Think:** Does in-process work grow super-linearly with input size, independent of any query or network call?

MUST ATTENTION find:

- nested iteration over the same/related collection (O(n²)+): loop-in-loop, `map` inside `map`, repeated full re-scan
- linear membership/lookup inside a loop — `.find`/`.includes`/`.indexOf`/`in list`/`.contains` where a `Set`/`Map`/dict gives O(1)
- wrong data structure for the access pattern: array used as a keyed store; repeated `.filter().length` for existence
- string built by concatenation in a loop; repeated `JSON.parse`/`stringify`/deep-clone/serialize per iteration
- catastrophic-backtracking regex on user- or attacker-sized input (ReDoS — cross-link `$security-review`)
- pure-CPU result recomputed every call when inputs are stable (memoization candidate, distinct from data cache)
- redundant sort/re-sort, or sorting when a single-pass min/max/partition suffices

Prefer fixes: build a `Set`/`Map`/dict index once and look up in O(1); hoist invariant work out of the loop; accumulate into an array + single `join` instead of `+=`; precompute/memoize stable pure results; anchor/bound regex and cap input length; pick the data structure that matches the access pattern. Prove with a microbench/profiler sample at representative AND worst-case N — never reasoning alone.

### 10. Network And Protocol Efficiency

**Think:** How many round trips does this path cost, and what is the RTT floor it can never beat? Count calls × RTT before optimizing anything inside a single call.

MUST ATTENTION find:

- **per-request connection setup** — no keep-alive/connection pooling/reused client, so every call pays TCP (1 RTT) + TLS (1-2 RTT) + possibly cold DNS; the single largest and most common network defect
- **chatty contract** — many small sequential remote calls where one batch endpoint or server-side aggregation fits; call count grows with items (network N+1, distinct from DB N+1)
- **RTT floor ignored** — latency budget already consumed by geography (~1 ms per 100 km) or cross-region hops, with a code-level fix proposed instead of an edge/replica/CDN move
- payload not compressed (no Brotli/gzip on text), or over-large for the consumer; critical response exceeding the ~14 KB initial congestion window when first-round-trip delivery matters
- protocol left on the table: HTTP/1.1 head-of-line blocking with 6-conn/origin limits, domain sharding retained under HTTP/2 (now an anti-pattern), lossy/mobile path that would benefit from HTTP/3/QUIC
- small-write RPC path suffering Nagle + delayed-ACK (~40 ms stalls) without `TCP_NODELAY`
- **infra exhaustion limits unchecked** — file descriptors, listen backlog, ephemeral ports (~28k default), `TIME_WAIT` accumulation, conntrack table, NAT/SNAT ports: these present as "random" latency or errors, never as a slow function
- load balancing weak: naive round-robin where least-connections/power-of-two-choices fits, no health check or outlier ejection, **no slow-start for new instances** (a cold node given full traffic times out)
- sticky sessions used where stateless + external session store fits, blocking rebalancing

Prefer fixes: reuse connections (keep-alive + pooled clients), collapse chatty calls into one batch/aggregate endpoint, move the endpoint closer (edge/CDN/regional replica) when RTT is the floor, compress and shrink payloads, enable the protocol version that matches the path, raise/verify the OS and infra limits, and configure LB algorithm + health checks + slow-start. ALWAYS quantify as `call count × RTT` before and after — why: a faster handler behind 12 avoidable round trips is not a fix.

### 11. Runtime, Memory And GC

**Think:** Does the runtime itself inject latency the code cannot see — collector pauses, allocation pressure, a blocked event loop, memory that never returns?

MUST ATTENTION find:

- **GC pause as a tail-latency source** — latency spikes uncorrelated with load, invisible in the mean and correlated across the fleet; allocation RATE (not heap size) driving collection frequency
- heap mis-sized: too small → continuous GC; too large → long pauses and swap risk; no headroom left for off-heap/native buffers/thread stacks
- **managed-language leak shapes** — unbounded caches, un-removed listeners/subscriptions, closures capturing large scopes, static collections, thread-locals on pooled threads
- **RSS ≠ heap confusion** — container/pod killed on RSS while heap looks healthy (fragmentation, native buffers, ~1 MB per thread stack)
- swap active on a latency-sensitive service (prefer fail-fast OOM over swap thrash); page cache double-buffered against an app cache
- **working-set cliff** — data outgrowing L3 → RAM → page cache, producing a step change rather than a gradual slope
- **blocked event loop / blocking call in an async path** — one CPU-bound task stalling every connection; `.Result`/`.await`-blocking on a thread-pool thread
- thread/worker pool mis-sized for the workload class (CPU-bound ≈ cores; I/O-bound ≈ `cores × (1 + wait/compute)`)
- contention shaped wrong: one coarse global lock (the Amdahl serial section) where sharded/striped locks, lock-free counters, or immutable/copy-on-write data fit
- cache-line issues on genuinely hot paths: false sharing on adjacent hot counters, NUMA-remote allocation (~2× local), random access where sequential is available (10-100× on the same bytes)

Prefer fixes: cut allocation rate before tuning the collector, right-size the heap with headroom, bound every cache and unregister every listener, measure RSS not heap against the container limit, disable swap for latency-critical services, move CPU work off the event loop, size pools by workload class, reduce lock granularity, and restore sequential access order. Prove with GC-pause histogram, allocation profile, RSS trend, event-loop lag, or off-CPU flame graph — NEVER from code reading alone.

### 12. Distributed Resilience And Load Management

**Think:** Under load or partial failure, does this path degrade gracefully — or amplify the failure? Performance and resilience share the same queues, so a missing timeout is a latency defect.

MUST ATTENTION find:

- **missing or non-decreasing timeout budget** — no timeout anywhere, or a callee timeout ≥ the caller's remaining budget; a hung dependency then exhausts threads/pool and takes the caller down
- **retry amplification** — retries without exponential backoff + FULL JITTER, no cap, no retry budget (≤~10% of traffic), or retries on non-idempotent writes with no idempotency key → a partial outage becomes total
- no circuit breaker on a failing dependency; no bulkhead (shared pool lets one slow dependency consume every thread); no load shedding (slow timeouts served where a fast 429/503 is correct)
- **unbounded queue/buffer** — converts a throughput problem into unbounded latency then OOM; queue AGE not monitored (only depth); no DLQ or poison-message handling; no backpressure propagated to the producer
- **per-item message publish** — producer/consumer emits one message or event per item where one batched message or bulk event fits; broker round trips and consumer invocations then grow linearly with item count (the messaging form of N+1)
- **fan-out tail amplification** — scatter-gather over many backends where a backend p99 becomes the user's median (~63% hit rate across 100 calls); no hedged requests or per-shard timeout
- dual write to DB + broker instead of a transactional outbox/CDC; exactly-once assumed instead of at-least-once + idempotent consumer
- cross-service workflow with no saga/compensation, or 2PC on a latency-sensitive path; consensus/quorum round trips on the hot path
- **wall-clock used for cross-machine ordering** (NTP skew is ms-to-s) instead of monotonic/logical/hybrid clocks; leader action without a fencing token/lease (a GC-paused leader still believes it leads)
- **autoscaling lag** — scaling on lagging CPU rather than a leading indicator (queue depth, concurrency), boot+warmup exceeding the spike, no pre-scale for known events, no headroom below the utilization knee
- **metastable failure risk** — system stays broken after the trigger clears (retry storm + cold cache) with no explicit shedding path to recover
- no per-tenant quota/rate limit (token bucket / leaky bucket / sliding window) — one loud tenant becomes everyone's outage; correlated failure via a shared dependency or shared config push defeating nominal redundancy

Prefer fixes: set a decreasing timeout budget per hop, add backoff+jitter with a retry budget and idempotency keys, add breaker + bulkhead + load shedding, bound every queue and propagate backpressure, reduce fan-out or hedge it, replace dual writes with an outbox, order events by logical clock and fence leaders, autoscale on a leading indicator with headroom, and enforce per-tenant quotas. Prove with timeout/retry config `file:line` + queue depth AND age + breaker state + per-tenant limits — why: these defects are invisible at low load and only surface as the outage they cause.

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

> **Spec-Loop Discipline (Dual-Feedback half — tailored).** Performance is **orthogonal** to functional correctness, so the property/metamorphic generation and the MUTATION-SCORE assertion gate are scoped to functional core-logic and do **NOT** apply here — N/A. Apply only the **dual-feedback half**: when a finding establishes or moves a behavior-defining boundary — an SLA/latency budget (p95/p99 target), a result-set bound, a max-rows/page-size limit, a pool-size assumption — feed it BOTH (a) the **spec** — record the SLA/limit as a §5 invariant / documented constraint so the budget is intended contract, not an undocumented tuning value — AND (b) a **guarding test** — a benchmark/assertion that fails when the budget or bound regresses. A fix that improves the number but leaves the boundary undocumented OR unguarded is **INCOMPLETE**, never a code-only change.

---

## Sub-Agent Routing

Use specialized help when available (never under `--report-only`):

| Detected focus                                                     | Sub-agent                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------ |
| DB/query/N+1/memory/backend hot path                               | `performance-optimizer`                                |
| Auth, PII, tenant isolation, sensitive cache keys                  | `security-auditor` first, then `performance-optimizer` |
| Cross-service architecture, caching policy, capacity/SLO trade-off | architecture/performance specialist                    |
| Frontend render/bundle/CWV/network waterfall                       | frontend or performance specialist                     |
| Runtime/GC pauses, allocation profile, pool + event-loop sizing    | `performance-optimizer` (runtime evidence: GC log, allocation profile, RSS trend, off-CPU profile) |
| Timeouts/retries/breakers/queue bounds, resilience under load      | `performance-optimizer` with the resilience config in scope; escalate design-level gaps to `architect` |

Sub-agent prompt MUST include target, detected scope, local context evidence, required dimensions, the calibration anchors in play (`references/performance-knowledge.md`), report path, and "return summary only; write full report incrementally."

---

## Phase 6: Why-Review Findings Validation Gate (MANDATORY when findings exist)

> **Purpose:** Validate performance findings before optimization work. Performance reports overstate easily when evidence is static-only, a plan lacks production-like scale, or a proposed index/cache changes write-cost or data-freshness risk.

**Trigger:** Any performance finding or optimization recommendation (Critical, High, Medium, Low, WARN, or static risk). Skip ONLY when the report's verdict is unconditional PASS with literally zero findings.

**Protocol:**

1. Read own finalized report from `tmp/reports/performance-{date}-{slug}.md` or the exact report path written by the caller.
2. Invoke `$why-review --validate-findings <performance-report-path>`.
3. Read the validation verdict path returned by why-review, expected as `tmp/reports/why-review-validate-{date}.md`.
4. **If why-review demotes/removes any finding:** update the performance report with revised severity, removed false positives, and a `## Why-Review Validation Notes` section.
5. **If why-review confirms all findings:** append `## Why-Review Validation` stating all findings were re-validated against measurement/static evidence.
6. **If the report changed after validation:** re-run this validation gate, maximum 2 validation passes, until the report's remaining findings are validated or zero findings remain.

**Skip conditions (record explicit reason if skipping):**

- Verdict is unconditional PASS with zero findings.
- Why-review skill itself is the active context.

---

## Phase 7: Validated Fix + Full Performance Re-Review Loop (MANDATORY when validated findings remain)

**Trigger:** Phase 6 returns CLEAN/validated and the performance report still has one or more findings that must be fixed. Under `--report-only` this phase never runs — the validated report is returned to the caller.

**Protocol:**

1. Create a fresh fix-cycle task list before editing. Do not reuse the review tasks.
2. Fix only findings that survived `$why-review --validate-findings`; if this skill is running inside a workflow, route implementation through the caller's fix step; standalone, apply it with `$fix --target=review`.
3. Re-measure or run the verification command named in the finding.
4. Restart the full `$performance-review` review from Phase 0 over the complete current target, not only the fixed files.
5. The restarted pass MUST create brand-new review tasks, re-detect scope, rediscover local context, rerun baseline/graph/profiler checks where applicable, and analyze all dimensions again from the beginning.
6. Repeat validate → fix → full performance re-review until a complete pass clears the current round's exit bar (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred).
7. If the same validated blocker repeats across 2 full invocations with no progress, stop and ask the user for a decision.

**Non-negotiable rules:**

- Never fix a performance finding before `$why-review --validate-findings` validates it.
- Never mark performance review clean after a targeted before/after check only; the clean verdict must come from a full Phase 0 restart.
- Never review only fixed files during the recursive pass.
- Never reuse old todo/task items for the recursive review pass.

---

## Output

MANDATORY final report sections:

- Scope and detected bottleneck type
- Baseline evidence and unknowns — each number with the anchor it is calibrated against, the load model behind it, and the dimensions covered vs explicitly skipped (with reason)
- Findings ordered by severity
- Optimization plan and rejected alternatives
- Verification plan with before/after metrics
- Test/spec/doc impact or explicit skip reason
- Confidence and assumptions

If evidence insufficient, output: `Insufficient evidence. Verified: [...]. Not verified: [...]. Next evidence needed: [...].`

---

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

<!-- SYNC:scenario-stress-eval:reminder -->

**IMPORTANT MUST ATTENTION** scenario-stress gate: reuse the scale tier `T0`–`T3` AND derive business-criticality `B0`–`B3` from evidence first — apply the **criticality-signal floor** (regulated/PII/financial/health data · money movement · auth/identity · legal-compliance → at least `B2` even absent SLA docs; do NOT default to `B3`). Select only the scenarios the `B`/`T` combination warrants, then walk each (simulate → trace → failure signature → self-heal/MTTR → trade-off) and assign `WITHSTANDS`/`DEGRADES-GRACEFULLY`/`FAILS-HARD`/`N/A-by-business`/`OVER-HARDENED`. Anti-over-engineering is first-class (a lean system that needs no HA/DR is a PASS) AND symmetric (never under-harden a `B2`+ system for low traffic). **ADVICE-ONLY — emit the Scenario Stress Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scenario-stress-catalog.md` (authoritative for scenarios/verdicts/business-tiers — on any change update the catalog FIRST, then re-run `inject_scenario_stress_gate.py`; scale tier stays single-sourced in `scale-technique-catalog.md`).

<!-- /SYNC:scenario-stress-eval:reminder -->

<!-- SYNC:double-round-trip-review:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** run the review loop (aka **Self-Review Convergence Loop**): review → validate findings → fix validated blocking findings → FULL re-review. Any newly produced output/judgment gets ≥1 self-review, and any new judgment ≥1 `$why-review --validate-findings` pass, before it is treated as final.
- **MANDATORY severity floor:** round 1 exits only on zero findings at any severity; from round 2 the bar is zero CRITICAL/HIGH/MEDIUM, so a LOW-only round ENDS the loop once the persisted `minRounds` is met — list every deferred LOW in the report. NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to reach the exit, and NEVER apply the floor to a binary gate (test-green, security must-fix).
- **MANDATORY round cap of 2, extendable ONCE to round 3 — a ceiling, NEVER a target.** A clean pass ends the loop once the persisted `minRounds` is met (default 1; explicit 2 requires an independent pass). Round 2 ending with a validated CRITICAL/HIGH still open (a failed non-test binary gate counts as CRITICAL) grants exactly ONE extra round; round 2 ending with only MEDIUM/`NOT VERIFIABLE` open, or round 3 ending with any review blocker open → **STOP and escalate by asking the user directly**, never a silent PASS. The 2-repeated-no-progress blocker rule escalates earlier if it trips first. A failing TEST gate has NO round cap and buys no extension — keep fixing and re-running until tests pass, never forcing green.

<!-- /SYNC:double-round-trip-review:reminder -->




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

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `$project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Ensure every shipped performance fix removes a measured or static-risk-labeled bottleneck across data access, compute, runtime/GC, network, client delivery, and concurrency/resilience; calibrate every number against a known anchor, preserve behavior/authorization/semantics, prove before/after evidence, pass `$why-review` before any fix, and complete a clean full Phase-0 re-review — never hide waste or break correctness.

**IMPORTANT MUST ATTENTION — Main steps:** Detect scope and symptom→cause triage → discover local context and 3+ patterns → baseline evidence and calibrate anchors → run 12 serial dimension passes → order findings by severity → plan the smallest behavior-preserving optimization → validate findings with `$why-review --validate-findings` → fix only validated findings that block the current round and restart the full Phase-0 review (Round 1: all severities; Round 2: CRITICAL/HIGH/MEDIUM; LOW-only deferred; binary gates always block).

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** Traced `file:line` proof per claim; NEVER present a guess as fact.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Graph-Assisted Investigation:** ALWAYS run a graph trace on key files when `graph.db` exists.
- **Severity Rubric:** Classify by consequence; Critical/High block PASS until resolved.
- **Category Review Thinking:** Derive per-category concerns from first principles, NEVER a fixed checklist.
- **Systematic Batching:** Large changeset → size-capped parallel batches, then reduce.
- **Performance Knowledge (`references/performance-knowledge.md`):** latency ladder · universal laws (Little, utilization knee, Amdahl, USL, tail amplification) · symptom→cause triage · network/DB/cache/web/memory-GC/distributed deep tables · measurement rigor. Calibrates severity; NEVER governs over local SLA/spec.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** run ALL 8 phases in order — Detect scope (+ symptom→cause triage) → Discover local context → Baseline evidence + anchor calibration → 12 serial dimension passes → Findings+Severity → Optimize plan → Why-Review validation gate → Validated-fix + full Phase-0 re-review; NEVER skip a phase or jump to a fix (`--report-only` declares Phases 0–6, then returns the validated report with no fix, no nested sub-agent, and no writer) — why: AI forgets its own steps and ships unmeasured, unvalidated changes.
**IMPORTANT MUST ATTENTION** cover ALL 12 dimensions one pass each — (1) query-shape/data-minimization, (2) index/access-path/data-topology, (3) N+1/fan-out, (4) aggregation/join/pipeline, (5) materialization/memory, (6) write/locks/transactions, (7) cache/reuse, (8) API-payload/frontend/CWV, (9) compute/algorithmic, (10) network/protocol, (11) runtime/memory/GC, (12) distributed-resilience/load — why: a single combined scan silently drops a dimension, and 10-12 are the layers a code-only reading habitually never opens.
**IMPORTANT MUST ATTENTION** calibrate every number against a known anchor before assigning severity — latency ladder (`1 ns → 100 ns → 100 µs → 10 ms → 100 ms`, ~1 ms RTT per 100 km as a hard floor), utilization knee ~70-80% (`wait ≈ service × ρ/(1−ρ)`; 90%→9×), Little's Law, tail amplification (fan-out to 100 backends hits a p99 ~63% of the time), CWV (LCP 2.5 s/INP 200 ms/CLS 0.1/TTFB 800 ms at field p75), cache hit-ratio math (90%→99% = 10× less origin load) — and treat a breached anchor as a HYPOTHESIS needing local proof, never a finding — why: an uncalibrated number cannot carry a severity, and a quoted constant with no local measurement is guess-as-fact.
**IMPORTANT MUST ATTENTION** on any remote path count `call count × RTT` FIRST and verify connection reuse (keep-alive/pooled client) — why: per-request TCP+TLS handshakes and chatty contracts dominate paths where every individual handler is already fast.
**IMPORTANT MUST ATTENTION** check the resilience controls as performance defects — decreasing timeout budget per hop, backoff + FULL JITTER + retry budget + idempotency keys, breaker/bulkhead/load-shedding, and a BOUND on every queue (watch age, not only depth) — why: these are invisible at low load and surface only as the outage they cause; an unbounded queue turns a throughput problem into unbounded latency and then OOM.
**IMPORTANT MUST ATTENTION** report distributions not means (p50/p90/p99/p99.9 + max, segmented), NEVER average percentiles, always name the load model (open-model exposes queueing collapse, closed-model hides it), and flag suspected coordinated omission — why: the aggregate mean hides exactly the tail users complain about.
**IMPORTANT MUST ATTENTION** apply the Performance-First Principles on every hot path — (1) [MOST IMPORTANT] hunt every OOM bad practice: bound every result set, reduce rows at the source, stream instead of buffer, triage row-count before row-size; (2) pick the data structure/algorithm that matches the access pattern (O(1) Set/Map over linear scan-in-loop, no needless O(n²)) and prove the complexity class at worst-case N; (3) batch per-item calls into one, else run bounded-parallel — never serial fan-out — why: unbounded memory OOMs the process, the wrong structure melts at scale, and serial fan-out multiplies latency.
**IMPORTANT MUST ATTENTION** prove every performance claim with measurement or static evidence — `file:line`, query text/shape, row counts, query plan/explain, trace, profile, or logs; confidence >80% to act, 60-79% gather more, <60% STOP — why: a number without a measured baseline is a guess that ships unverified waste.
**IMPORTANT MUST ATTENTION** review performance one dimension at a time — ALL **12**: (1) query shape/over-fetching, (2) index/access path/data topology, (3) N+1 fan-out, (4) aggregation/join shape, (5) materialization/memory, (6) write path/locks/transactions, (7) caching, (8) API payload/frontend delivery/Core Web Vitals, (9) in-process compute/algorithmic complexity, (10) network/protocol round trips, (11) runtime/memory/GC pauses, (12) distributed resilience/load management — NEVER stop at 9 — why: split attention misses violations, and 10-12 are the layers a code-only reading habitually never opens.
**MANDATORY** search 3+ similar local query/API patterns before proposing a fix, and read the index/migration/schema files controlling the data — why: local conventions override generic framework defaults; the closest example must match preconditions (base class, scope, cardinality) before you copy it.
**MANDATORY** ALWAYS measure before/after; static review findings need an explicit verification command attached.
**MANDATORY** ALWAYS verify index usability with actual query shape/order and plan/explain — index existence alone is not proof.
**IMPORTANT MANDATORY MUST ATTENTION** ALWAYS push row filters to the data source before projection/caching; row-count reduction beats column trimming — why: fewer columns from too many rows still scans the rows.
**MANDATORY** size pools/parallelism by Little's Law (in-use = arrival-rate × hold-time) × replica count, and shrink hold-time before growing the pool — why: a fast op with high p99 is saturation at the pool entrance, not a slow query.
**MANDATORY** Break work into small tracked tasks before starting; one `in_progress` at a time; mark each `completed` immediately after its evidence lands — why: compaction wipes memory and untracked review scope silently goes uncovered.
**MANDATORY** when a finding moves a behavior-defining boundary (SLA/p95 budget, result-set bound, page-size limit, pool-size assumption), feed it BOTH the spec (record as a §5 invariant) AND a guarding test/benchmark — why: a faster number left undocumented OR unguarded regresses silently.
**MANDATORY** add a final review task checking doc/test/spec staleness.

**Anti-Rationalization:**

| Evasion                                       | Rebuttal                                                                                                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Bottleneck obvious, skip baseline"           | No measurement = guess. Capture metric or label static risk with the verify command.                                                                          |
| "Index exists, so query fine"                 | Show plan/explain and access path. Existing unused index proves nothing.                                                                                      |
| "Projection enough"                           | First reduce rows. Loading fewer columns from too many rows still wastes work.                                                                                |
| "Just cache it"                               | Fix query shape/index/bounds first. Cache can hide stale, unsafe, unbounded work.                                                                             |
| "Only one query in code"                      | Trace loops, serializers, resolvers, consumers, and retries. Fan-out often hides upstream.                                                                    |
| "Loop is fine, the list is small"             | Show N and worst-case N. O(n²) that's fine at 10 melts at 10k. Bench at real scale.                                                                           |
| "Query is fast, so the endpoint is fast"      | Measure pool acquire-wait and queue depth. A 2ms query behind a saturated pool still yields a 200ms p99 — the wait is at the pool entrance, not in the query. |
| "Found one similar pattern, good enough"      | Grep 3+ and verify preconditions match. One nearby example ≠ a fit; cite `file:line`.                                                                         |
| "Fix it where it errors/spikes"               | Trace caller (wrong data) vs callee (wrong handling); fix at the layer owning the invariant, not the symptom site.                                            |
| "Validated nothing, just fix the obvious one" | No fix until `$why-review --validate-findings` confirms it; then fix only the current round's blocking severities and restart the FULL review from Phase 0. Round 2 LOW-only findings are deferred. |
| "Every handler is fast, so the path is fast"  | Count `call count × RTT` and check connection reuse. 12 avoidable round trips beat any handler micro-optimization.                                             |
| "Latency is high, optimize the code"          | Check the RTT/geography floor first (~1 ms per 100 km) — physics and handshakes are not fixable in code; only moving the endpoint is.                          |
| "Spikes are random / just noise"              | Correlate against GC pauses, cold cache, deploys, and pool wait before calling anything random. Uncorrelated-with-load spikes are usually the runtime.         |
| "Added a cache, that's the fix"               | Show the measured hit ratio AND the size/TTL bound. 60% hit ratio is barely a cache; unbounded is a leak.                                                      |
| "Resilience is not a performance concern"     | A missing timeout, jitterless retry, or unbounded queue IS a latency defect — same queues, and it converts partial failure into total.                         |
| "Lighthouse score is green"                   | CWV verdicts come from field p75 (RUM/CrUX). Lab locates causes; field defines truth.                                                                          |
| "Only 9 dimensions matter, 10-12 are infra"   | 10-12 (network, runtime/GC, resilience) are where code-only reviews are blindest. NEVER drop a dimension without an evidence-backed skip reason.               |
| "Anchor says it's slow, that's the finding"   | An anchor breach is a hypothesis. Promote it with `file:line` + measurement or an explicit `static risk` label and verify command.                             |
| "Digest is enough, skip the references body"  | The digest orders hypotheses; only the body carries the thresholds. NEVER assign a severity or quote an anchor constant from memory or the digest — read it.    |

**[TASK-PLANNING]** Break work into small tracked tasks before starting; update each status immediately.

**IMPORTANT MUST ATTENTION** prove every claim with measurement/static evidence + `file:line` (confidence >80% to act, <60% STOP); calibrate the number against a known anchor, and treat an anchor breach as a hypothesis, never a finding.
**IMPORTANT MUST ATTENTION** walk ALL 12 dimensions one pass each — dimensions 10-12 (network/protocol, runtime/GC, distributed resilience) are the ones a code-only reading skips.
**IMPORTANT MUST ATTENTION** push row filters to the data source before projection/caching; verify index usability via plan/explain, never existence alone.
**IMPORTANT MUST ATTENTION** no fix before `$why-review --validate-findings`; after every validated fix restart the full review from Phase 0 before claiming PASS.

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

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
