# AI engineering review — Plan Mode (`--mode=plan`)

> Read when `--mode=plan` is selected or the target is a plan, spec or design that creates or changes an AI surface. Phases, gates and validation in `SKILL.md` still apply; this file states how each phase reads a plan.

## Plan Mode (`--mode=plan`)

> **Use when** the target is a plan, spec or design that creates or changes an AI surface. Default review-only and caller-owned passes stop after validation; standalone `--fix-loop` repairs the artifact through Phase 9, then freshly reviews it.
>
> 1. **Phase 0** loads the same protocol and docs. **Phase 1** resolves the plan path from `$ARGUMENTS` (else the active plan) and lists the plan phases that create or change an AI surface; a plan with none → announce the skip line.
> 2. **Phase 2** builds the AI-surface map and trifecta table FROM THE PLAN — planned call sites, tools, data sources, sinks, autonomy level. A row the plan cannot fill is a gap.
> 3. **Phase 3** is the main pass: apply checklist §M per AI phase — for each `AF-1`–`AF-6` clause, does the plan state the required items (model + pinned version + fallback · eval + baseline · cost and latency budget · failure modes + fallback · autonomy + approval · data flow + sinks · rollout + kill switch + owner · for RAG, why retrieval + its evidence gate)? Missing item = plan gap.
> 4. **Phase 4** becomes "does the plan state a control for this?" per `AE-*` dimension; runtime and eval-only claims are `NOT VERIFIABLE`. **Phase 5** applies only to the surface kinds the plan names. **Phase 6** verifies provider facts the plan asserts (model, limit, price, region).
> 5. **Output** — `tmp/reports/ai-engineering-review-{date}-{slug}.md` with: gaps per `AF` clause (`the plan does not state X — add Y`, severity per checklist §M: P1 when the action is irreversible, external or affects people, P2 otherwise, P3 for a suggest-only helper with a dated fill-in), the AI Gate Report, and REQUIRED plan additions. Phase 8 validates; review-only/caller-owned passes hand additions to the plan owner, while standalone fix-loop applies authorized artifact repairs before a fresh plan review.
> 6. **Plan vs code:** when both the plan and its code are in scope, additionally report a code path the plan never mentions (new tool, data source, sink) and a plan promise the code does not implement.
