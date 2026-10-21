# Performance review — sub-agent routing and the Phase 7 fix loop

> Read the sub-agent routing when delegating a focus area to a specialist (never under `--report-only`), and the Phase 7 protocol when validated findings remain and this run owns fixes (`--fix-loop`). Review-only and `--report-only` runs return the validated report instead.

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

## Phase 7: Validated Fix + Full Performance Re-Review Loop (MANDATORY when validated findings remain)

**Protocol:**

1. Create a fresh fix-cycle task list before editing. Do not reuse the review tasks.
2. Fix only findings that survived `/why-review --validate-findings`; if this skill is running inside a workflow, route implementation through the caller's fix step; standalone, apply it with `/fix --target=review`.
3. Re-measure or run the verification command named in the finding.
4. Restart the full `/performance-review` review from Phase 0 over the complete current target, not only the fixed files.
5. The restarted pass MUST create brand-new review tasks, re-detect scope, rediscover local context, rerun baseline/profiler checks (and any optional graph hint) where applicable, and analyze all dimensions again from the beginning.
6. Repeat validate → fix → full performance re-review until a complete pass clears the current round's exit bar (round 1: zero open findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred).
7. If the same validated blocker repeats across 2 full invocations with no progress, stop and ask the user for a decision.

**Non-negotiable rules:**

- Never fix a performance finding before `/why-review --validate-findings` validates it.
- Never mark performance review clean after a targeted before/after check only; the clean verdict must come from a full Phase 0 restart.
- Never review only fixed files during the recursive pass.
- Never reuse old todo/task items for the recursive review pass.
