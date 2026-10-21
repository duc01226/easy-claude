# AI engineering review — Phase 9 validated fix + full re-review loop

> Read when standalone `--fix-loop` is set and Phase 8 leaves validated findings to fix (code or plan). Review-only, caller-owned and `--report-only` passes stop after Phase 8.

## Phase 9: Validated Fix + Full Re-Review Loop (standalone `--fix-loop` only, code or plan)

1. Create a fresh fix-cycle task list before editing; never reuse review tasks.
2. Fix only findings that survived `$why-review --validate-findings`, at the owner of the violated contract; inside a workflow hand the validated report to the caller's fix step (standalone: `$fix --target=review`). Tests that protect the fixed behavior are part of the fix.
3. Update the guarding tests/docs and plan final verification for the fixed behavior and its consumers; preserve the configured verification order.
4. Restart the full `$ai-engineering-review` from Phase 0 over the complete current scope — brand-new tasks, protocol reloaded, scan rerun, every surface reviewed from the start. When a fresh reviewer is used, spawn a NEW `ai-engineering-reviewer` sub-agent (`agent_type: "ai-engineering-reviewer"`) with ZERO memory of prior rounds, carrying the `AF` / `AE` / `AR` protocol texts inline in its prompt; use `code-reviewer` only when the local catalog lacks it.
5. Repeat validate → fix → full re-review until a complete pass clears the current round's exit bar (round 1: zero open findings; round 2: zero Critical/High/Medium, Low deferred; binary gates always block). If the same validated blocker repeats across 2 full invocations with no progress, stop and ask the user.

**Non-negotiable:** never fix a finding before validation · never call the review clean after a targeted check only · never review only the fixed files · never reuse old task items.
