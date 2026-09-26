# workflow-review-changes — Fix-Loop Mode

> Read by `/workflow-review-changes --fix-loop` FIRST, before Step 0 (the router `SKILL.md` → **`--fix-loop` Mode**). The default workflow, its sections and the `SYNC:*` protocol bodies this mode cites live in `SKILL.md`.

<!-- FIX-LOOP-MODE:START -->

## Mode: `--fix-loop` (OPTIONAL outer convergence loop)

> **Activation:** ONLY when the invocation carries `--fix-loop` (e.g. `/workflow-review-changes --fix-loop <scope>`, or a routed request to "run the review-changes workflow repeatedly until a complete pass applies zero fixes"). Without the flag, skip this whole section — the default workflow in `SKILL.md` is unchanged. Every default gate still binds inside each round: Step 0 loop binding, the `initial-reviews` and `reviewers` all-return barriers, the inline-in-main-session rule, spec enrichment, and the conditional post-fix re-review loop.

### Fix-Loop Quick Summary

**Goal:** Converge a review scope to a **clean no-op pass** by re-running the ENTIRE default `/workflow-review-changes` workflow INLINE, round after round, over a fixed scope combined with the fixes accumulated so far — stopping when a complete round applies **zero fixes**. **From round 2 the severity floor applies: LOW findings are no longer fixed, so a round that surfaces only LOW findings, with no other edit landing, is a zero-fix round and ENDS the loop.**

- **Steps (in order):** (FL-0) resolve scope + Goal Contract → (FL-0b) bind the convergence loop (protocol loop primary + optional `/goal` accelerator) → (FL-1) round loop { run default `/workflow-review-changes` INLINE → detect fixes-applied → log iteration } → (FL-2) converge on a zero-fix round OR escalate on non-progress → (FL-3) recap.
- **Convergence:** stop ONLY when a whole round applies **zero fixes** (its fix cycle skipped, working tree unchanged, reviews clean) — not merely one clean review.
- **Inline invariant:** run each round's `/workflow-review-changes` (default mode, WITHOUT `--fix-loop`) via the `Skill` tool, NEVER the `Agent` tool — it self-binds its own Step 0 review-loop obligation (owning the session Stop hook for its `/goal` gate WHEN available), which a sub-agent cannot own or carry back to this loop.
- **Severity floor — from round 2, LOW stops blocking.** Round 1 fix every validated severity. **From round 2 tell the inner default workflow to fix only CRITICAL/HIGH/MEDIUM and to defer LOW findings** — a round whose validated findings are ALL LOW therefore applies no review fix and CONVERGES once no other edit (such as a `/code-simplifier` change) lands. Carry every deferred LOW into the recap and Goal Contract; NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to LOW to reach the exit. Severity tiers per `SYNC:severity-rubric` (carried in `SKILL.md`).
- **Bounded:** round cap default 2 plus one conditional extension to round 3, granted ONLY when round 2 leaves a validated CRITICAL/HIGH open (round 3 is the review hard cap); a failing test gate has NO round cap — keep fixing and re-running until the tests pass; review blockers not shrinking across 2 rounds (checked only after the round-2 CRITICAL/HIGH extension, which is granted first), or the budget spent with fixes still landing (CRITICAL/HIGH/MEDIUM fixes, or edits with no review blocker open) → **STOP & escalate** via `AskUserQuestion`.

**Why this mode exists (READ FIRST — it is the whole justification):** the default workflow already converges *internally* to a clean pass, BUT its inner loop does **NOT** re-run the specialist reviewers from scratch. Per the **Fix & Re-Review Loop** in `SKILL.md`, the post-fix re-review runs `/why-review` in full mode plus *scoped* re-runs of the specific specialist that raised a finding — the triage-selected specialists (`/architecture-review`, `/performance-review`, `/security-review`, `/integration-test-review`, `/production-readiness-review`, `/domain-entities-review`, `/ui-review`) fire ONCE per run. Only a **fresh full re-invocation** re-runs ALL specialists over the now-fixed code — catching **second-order defects the fixes themselves introduced** and killing whole-workflow confirmation bias. Without this outer loop those regressions ship unreviewed.

**Fix-Loop Key Rules:**

- **MUST run INLINE in the main session — NEVER dispatch a round's `/workflow-review-changes` as a sub-agent.** It self-binds its own review-loop obligation (owning the session Stop hook for its `/goal` gate when available); as a sub-agent that in-session guarantee is silently lost (see **Nested Invocation** and **Orchestration** in `SKILL.md`). The outer loop therefore also runs inline.
- **Convergence = a whole round applied ZERO fixes** (its fix cycle — validate → fix → simplify → post-fix re-review — was skipped because reviews passed clean). That, not "one clean review", ends the loop.
- **Scope base is FIXED across rounds; the working tree grows.** Recompute the scope each round as `branch-diff base` ∪ current uncommitted changes — the diff base never moves, so convergence is measured against a stable target.
- **Round cap (default 2, extendable ONCE to 3)** and **review-blockers-increasing → STOP & escalate** via `AskUserQuestion`. NEVER loop open-ended. Round 3 is granted only when round 2 leaves a validated CRITICAL/HIGH open (a failed non-test binary gate counts as CRITICAL), is checked before the count-based stops, never renews, and round 2 blocked by MEDIUM alone escalates instead. A failing test gate is never capped: the loop keeps fixing and re-running until the tests pass. Cap exhaustion escalates whenever fixes are still landing — CRITICAL/HIGH/MEDIUM fixes, or edits with no review blocker open — while a zero-fix LOW-only round converges via the severity floor.
- **The severity floor bounds ITERATION, never the standard.** It ends the loop; it never authorizes shipping a known CRITICAL/HIGH/MEDIUM, and it never applies to a binary gate inside the inner workflow (a failing test is a failure, not a LOW finding).
- **Plan each round's tasks FIRST.** Before the first round, create a todo-task plan enumerating every fix-loop step and planned round; on EVERY new round, REGENERATE a fresh round task plan (the inner workflow's 19 step tasks included) — NEVER reuse the prior round's task list.

### Fix-Loop First Principle — Convergence, Not Motion

> A round that changes files is progress **only if** the next round finds fewer things to fix.
> The loop exists to reach a fixed point (zero fixes), not to keep churning the diff.
> If findings stop shrinking, that is a signal to **escalate**, not to spin another round — except the one round-2 CRITICAL/HIGH extension, which is granted first.

### FL-0 — Resolve Scope + Goal Contract (FIRST ACTION in `--fix-loop` mode)

1. **Parse the review scope** from the user prompt into a stable, reusable scope string. It has two parts UNIONed:
   - **Branch-diff base** — a branch-to-branch or PR diff, e.g. `feature/x` into `develop`. Capture it as `git diff develop...HEAD` (three-dot: changes on the feature branch since it forked from `develop`) so the base is a **fixed merge-base**, not a moving target.
   - **Current changes** — the uncommitted working-tree changes (`git status --porcelain`, `git diff` + `git diff --staged`).
   - **Scope string (recompute each round):** `{branch-diff base} ∪ {current uncommitted changes}`. The base commit is fixed for the whole loop; the uncommitted set legitimately grows as fixes land.
   - If the prompt names no branch diff (pure "current changes" review), the scope is just the working-tree changes — the loop still applies.
2. **Resolve/create the Goal Contract** per `SYNC:goal-contract-satisfaction-loop` (carried in `SKILL.md`; `goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root — default `plans/`, relocated by `docsRoots.plans.path` in `docs/project-config.json` — template `.claude/templates/goal-contract-template.md`). Its single **required** Success Criterion:
   > *A complete default `/workflow-review-changes` run over `{scope}` applies **zero fixes** (a clean no-op pass — no fix-step or `/code-simplifier` file changes; **round 1** no validated findings of any severity, **round 2** no validated CRITICAL/HIGH/MEDIUM, with remaining LOW findings deferred rather than fixed).*
   Record the round cap (default 2, extendable once to 3 on an open CRITICAL/HIGH at round 2; failing test gates uncapped until green), the severity floor (LOW non-blocking from round 2), and the scope string in **Constraints**.

### FL-0b — Bind the Convergence Loop (protocol-first; `/goal` is an optional accelerator)

The convergence loop is bound by TWO layers. The **protocol loop (FL-1–FL-2) is the BINDING mechanism** and MUST be self-driven by you, the running agent, on every host — with or without any command or hook. The **`/goal` command is an OPTIONAL accelerator** layered on top; it is never the primary mechanism, and its absence NEVER weakens the loop. This mirrors the project rule that hooks/trackers are accelerators only — correctness must not depend on them.

**1. Protocol loop — ALWAYS binding (hook/command-independent).** You are personally responsible for not stopping until the loop converges or bounded-escalates. This binds Claude, Codex, and Copilot equally, whether or not `/goal` exists:

> Repeatedly run default `/workflow-review-changes` INLINE over `{scope}` (branch-diff base ∪ current uncommitted changes, recomputed each round). After each round, detect whether it applied any fix. From round 2 on, instruct the inner workflow to fix only CRITICAL/HIGH/MEDIUM validated findings and to defer LOW ones. Do NOT stop while the last round still applied fixes. Converge when a full round applies ZERO fixes (reviews clean, no fix step changed files) — which from round 2 includes a round whose only validated findings were LOW and that landed no other edit. Cap at `{N=2}` rounds, extendable ONCE to round 3 only when round 2 leaves a validated CRITICAL/HIGH open (a failed non-test binary gate counts as CRITICAL); a failing test gate is outside the cap and the no-progress rule — keep fixing and re-running until the tests pass, never forcing green; if review blockers do not shrink across 2 consecutive rounds (checked only after the round-2 CRITICAL/HIGH extension, which is granted first), or the review budget (round 2, or round 3 when extended) is spent with fixes still landing (CRITICAL/HIGH/MEDIUM fixes, or edits with no review blocker open) → STOP and escalate via `AskUserQuestion`. Never loop open-ended.

Treat this as a standing obligation you re-read at every FL-2 checkpoint — NOT a one-time note you can rationalize away after the first round. The Goal Contract's required Success Criterion (FL-0) is its durable, host-independent record.

**2. `/goal` command — invoke as an accelerator WHEN AVAILABLE.** If a `/goal` command exists and you are permitted to run it in this environment, ALSO invoke it (a real tool/command call, NOT a paraphrase, NOT a Goal Contract file substituted for it) with the SAME condition, so a session Stop hook mechanically enforces the loop:

```
/goal workflow-review-changes --fix-loop convergence loop: repeatedly run default /workflow-review-changes INLINE over {scope} (branch-diff base ∪ current uncommitted changes, recomputed each round). After each round, detect whether it applied any fix; if fixes>0 → run another round; if a full round applied ZERO fixes (reviews clean, no fix step changed files) → CONVERGED, clear the gate. From round 2 on, the inner workflow fixes only CRITICAL/HIGH/MEDIUM and defers LOW, so a LOW-only round that landed no other edit is a zero-fix round and CONVERGES. Do NOT stop while the last round still applied fixes. Cap at {N=2} rounds, extendable ONCE to round 3 only when round 2 leaves a validated CRITICAL/HIGH open (a failed non-test binary gate counts as CRITICAL); a failing test gate is outside the cap and the no-progress rule — keep fixing and re-running until the tests pass, never forcing green; if review blockers do not shrink across 2 consecutive rounds (checked only after the round-2 CRITICAL/HIGH extension, which is granted first), or the review budget (round 2, or round 3 when extended) is spent with fixes still landing (CRITICAL/HIGH/MEDIUM fixes, or edits with no review blocker open) → STOP and escalate via AskUserQuestion. Never loop open-ended.
```

The `/goal` Stop hook blocks stopping until the condition holds and auto-clears when met — do not tell the user to clear it.

**If `/goal` is unavailable, unregistered, or not permitted** (e.g. Codex/Copilot, or a Claude run without the command): DO NOT error, DO NOT block, and DO NOT invent a stand-in gate. Record ONE line in the Goal Contract — `/goal accelerator unavailable — loop bound by protocol (FL-1–FL-2) + this Goal Contract` — and proceed. The protocol loop above plus the Goal Contract are the same gate, enforced by discipline instead of a hook.

> **Nested gates (by design, safe):** each inner default round self-binds its OWN Step 0 review-loop obligation (and installs its own `/goal` gate WHEN available) that clears when that round reaches its internal clean pass. This OUTER loop persists across rounds and **subsumes** the inner ones (a converged loop implies every inner round ended clean). All self-clear on satisfaction — no orphaned gate. Do NOT tell the user to clear either.

### FL-1 — Round Loop (run → detect → log)

For each round `R` (starting at 1), do ALL of:

1. **Snapshot before:** record the working-tree fingerprint — `git status --porcelain` + `git diff --stat` (or `git rev-parse` of `git stash create` for an exact hash) — as the fixes-applied baseline. Also capture the exact full candidate before review with `node .claude/hooks/lib/review-receipt.cjs snapshot --target=<worktree|staged|commit-descriptor> [--descriptor-json='<exact descriptor JSON>']` and retain its complete JSON output. The default whole-worktree round uses `worktree`; use `staged` or a commit descriptor only when the workflow reviews that exact complete candidate. `CLEAN` needs no receipt; `ERROR` blocks receipt issuance. Artifact-only, external, or subset reviews never qualify. After fixes, capture a new candidate before the next full workflow round.
2. **Run the workflow INLINE:** invoke `/workflow-review-changes` (default mode, WITHOUT `--fix-loop`) via the `Skill` tool (NEVER the `Agent` tool) with the recomputed `{scope}` as its prompt. Let it run its full default sequence (the triage selects which optional steps run) including its own internal fix→re-review loop. An inner round is NOT the top-level invocation: it skips `/workflow-end` and `/watzup` with their registry `skipReason`; this outer loop runs the close once, after convergence or escalation.
3. **Detect fixes-applied (objective):** compare the working tree after the round to the before-snapshot AND read the workflow's own result:
   - **Fixes applied (>0)** if the working tree changed during the round OR the workflow reported its fix cycle ran (`/fix --target=review` or `/code-simplifier` modified files).
   - **Zero fixes** if the working tree is byte-identical to the before-snapshot AND the workflow reported either no validated findings, or (round 2) validated findings that are ALL LOW with the fix phase explicitly skipped.
   - If a claimed LOW-only exit has a changed fingerprint, re-review in the next round (FL-2 row (7)); it is not a no-op convergence pass.
4. **Append an Iteration Log entry** to the Goal Contract: round number, files changed this round (`file:line`), fixes-applied count, the review verdict, and remaining gaps.

### FL-2 — Convergence & Escalation Gate

Evaluate after every round, **in this order — the first matching row decides** (rows (1), (4) and (5) are the outcomes `SYNC:double-round-trip-review` and `review-policy.cjs` enforce; the count-based stops (2) and (3) are this loop's stricter exit on top of them, evaluated after the extension so they never pre-empt it, and rows (6) and (7) are this loop's own zero-fix convergence and its zero-fix proof round; count only review blockers — validated findings at each round's own bar plus failed non-test binary gates, never failing test gates): (1) round 2 left a validated CRITICAL/HIGH review blocker open → the one extension round, even when the blocker count did not shrink; (2) review blockers increased vs the prior round → STOP & escalate; (3) review blockers are still open and did not shrink across 2 consecutive rounds → STOP & escalate (the EARLIER exit before the budget); (4) the review budget is spent with a review blocker still open (round 2 without a CRITICAL/HIGH, or round 3 and later) → STOP & escalate, even while a test gate is also red; (5) a test gate is failing and no review blocker is open → keep looping with no round cap, and never converge while it is red; (6) the round applied ZERO fixes (no review, simplifier, or `/fix` edit, and from round 2 a LOW-only round applies none) and no test gate is failing → CONVERGED; (7) the round applied fixes but no review blocker is open and no test gate is failing (for example only `/code-simplifier` edited) → run the next round to prove a zero-fix pass while within budget, and STOP & escalate once the review budget is spent; (8) review blockers are open within budget and shrank (or this is round 1) → fix them and any failing test, then run the next round. A MATERIAL trade-off pauses the loop at any step before its fix lands.

| Condition | Action |
| --- | --- |
| Round applied **ZERO fixes** (clean no-op pass) AND no test gate is failing | **CONVERGED** → mark the required criterion PASS in the Goal Satisfaction matrix → clear the `/goal` gate → go to FL-3. |
| Round applied fixes AND round `< N` AND findings shrank vs prior round | Recompute `{scope}`, run round `R+1`. |
| Round applied fixes but **no review blocker is open** AND no test gate is failing (for example only `/code-simplifier` edited) | Within budget: recompute `{scope}` and run round `R+1` to prove a zero-fix pass. At a spent review budget: **STOP & escalate** via `AskUserQuestion` — never converge on edits no zero-fix pass has followed. |
| Review blockers are still open and did **not shrink** across 2 consecutive rounds (same/increasing count; failing tests excluded — they loop until green; a round-2 CRITICAL/HIGH takes the extension row first) | **STOP & escalate** via `AskUserQuestion` — a non-converging loop is a signal, not a reason to spin. |
| Round `R ≥ 2` whose validated findings are **ALL LOW** (zero CRITICAL/HIGH/MEDIUM) AND the round applied zero fixes (no simplifier or other edit landed either) AND no test gate is failing | **CONVERGED on the severity floor** → do NOT run another round for LOW alone → record every remaining LOW as a deferred finding in the recap + Goal Contract → mark the required criterion PASS → go to FL-3. |
| Round 2 completed with a validated **CRITICAL or HIGH** still open | **ONE extension round is granted** → land the validated fixes and run round 3 (fresh full re-review), even when the blocker count did not shrink. Granted once per loop; it never renews. A failed non-test binary gate counts as CRITICAL here. |
| A **test gate** is failing (a suite that must actually pass) and no review blocker is open, at any round within or past the budget | **Keep looping — NO round cap.** Run the failed-test investigation gate, fix at the owning layer, re-run the tests, and continue past round 3 until they pass. NEVER weaken an assertion, add a skip, or relax a timeout to force green. A failing test never counts toward the no-progress escalation or the round-3 extension. |
| Round cap `N` hit with CRITICAL/HIGH/MEDIUM fixes still landing — round 2 blocked by MEDIUM or an unresolved `NOT VERIFIABLE` alone, or round 3 (the review hard cap) blocked by any review blocker | **STOP & escalate** via `AskUserQuestion` — report the still-open findings; do not silently continue. (LOW-only at the cap converges via the severity-floor row above.) |

> **Increasing review blockers = STOP.** If round `R` surfaces MORE review blockers (validated findings at its own bar plus failed non-test binary gates) than round `R-1`, the fixes are regressing the code — STOP and escalate immediately (mirrors the **Review blockers increasing** rule under **Fix & Re-Review Loop → Severity floor & budget** in `SKILL.md`), unless round 2 left a validated CRITICAL/HIGH open, which takes the one extension round first. A LOW-only round 2 has zero review blockers, so it is never an increase. Never trade one fix for two new findings across rounds.

### FL-3 — Recap

Emit a concise convergence recap: rounds run, total fixes applied per round (the shrinking sequence), the final clean-pass evidence, and the Goal Satisfaction matrix (required criterion PASS). Point to each round's report under `tmp/reports/` and the Goal Contract Iteration Log. Do NOT commit or push unless the user explicitly asks. **Close once:** when this is the top-level invocation, run `/workflow-end` → `/watzup` exactly once, AFTER the review receipt below is minted (the close writes no candidate file) — never inside a round; nested, return to the parent instead.

**Mint the review receipt (MANDATORY — the last candidate-mutating action; only the close follows it).** Only when the final zero-fix round reviewed the complete `CHANGED` current-repository candidate, run:

```bash
node .claude/hooks/lib/review-receipt.cjs issue --kind=workflow-review-changes --scope=full-changeset --snapshot-json='<exact JSON captured before the final zero-fix round>'
```

This records — for the review-before-commit gate (`review-commit-gate.cjs`) — that this exact candidate passed the whole `workflow-review-changes --fix-loop`. Pass the original pre-review snapshot; issuance rechecks that same target and rejects drift. Never capture or reconstruct a snapshot at terminal issuance. If step 17 `/docs-update` or any other action changed content after the final round's snapshot, issue nothing and restart the complete workflow round on the updated candidate. Artifact-only, external, subset, or `CLEAN` targets issue no receipt; `ERROR` is blocked, never clean. Issue only after the final round had no fixes and all required reviews and quality gates passed.
### Fix-Loop Convergence Detection — Why Two Conditions

A round counts as converged ONLY when **both** hold: (a) the working tree is unchanged by the round, AND (b) the reviews reported clean at that round's bar — no validated findings in round 1, no validated CRITICAL/HIGH/MEDIUM from round 2 (deferred LOWs listed, not fixed). Both are required because:

- Working-tree-unchanged alone is ambiguous — a round can make no changes because a finding was **unfixable/escalated**, not because it was clean. That is escalation, not convergence.
- Reviews-clean alone is insufficient — an orchestrator can rationalize a "clean" verdict; the objective `git`-diff comparison is the backstop that proves no fix actually landed.

When (a) is true but (b) is false → **escalate** (a real finding the loop cannot close). When (b) is true but (a) is false → the round DID fix things → run another round to re-prove clean.

**IMPORTANT MANDATORY `--fix-loop` sequence:** FL-0 (scope + Goal Contract) → FL-0b (bind the convergence loop: protocol loop primary + optional `/goal` accelerator) → FL-1 (round loop: run default `/workflow-review-changes` INLINE → detect fixes → log) → FL-2 (converge on zero-fix round / escalate on non-progress) → FL-3 (recap + mint the review receipt). Shared protocols this mode relies on — `SYNC:review-policy`, `SYNC:goal-contract-satisfaction-loop`, `SYNC:severity-rubric`, `SYNC:trade-off-interrogation-gate` — are carried once in `SKILL.md`; never re-copy them into this section.

<!-- FIX-LOOP-MODE:END -->
