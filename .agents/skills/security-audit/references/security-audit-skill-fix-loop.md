# Security audit — Phase 2 validated fix + full re-review protocol

> Read when Phase 1 leaves validated findings that this run must fix (`--fix-loop`). Review-only and `--report-only` runs return the validated report instead.

## Phase 2: Validated Fix + Full Security Re-Review Loop (MANDATORY when validated findings remain)

**Protocol:**

1. Create a fresh fix-cycle task list before editing. Do not reuse the review tasks.
2. Fix only findings that survived `$why-review --validate-findings`; if this skill is running inside a workflow, hand the validated report to the caller's fix step (standalone: `$fix --target=review`).
3. Run targeted verification for the changed security-sensitive paths.
4. Restart the full `$security-audit` from Scope over the complete current target, not only the fixed files.
5. The restarted pass MUST create brand-new review tasks, reload local security context, rerun caller traces (grep/read, plus any optional graph hint) where applicable, and analyze the full target from the beginning.
6. Repeat validate → fix → full security re-review until a complete pass clears the current round's exit bar (round 1: zero open findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred).
7. If the same validated blocker repeats across 2 full invocations with no progress, stop and ask the user for a decision.

**Non-negotiable rules:**

- Never fix a security finding before `$why-review --validate-findings` validates it.
- Never mark security review clean after a targeted fix check only; the clean verdict must come from a full restart.
- Never review only fixed files during the recursive pass.
- Never reuse old todo/task items for the recursive review pass.
