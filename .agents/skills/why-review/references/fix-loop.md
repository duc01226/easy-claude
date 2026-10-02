# why-review — Fix-Loop Mode

> Read by `$why-review --fix-loop` FIRST (the router `SKILL.md` → **Mode References**). Each round's review pass is plain full mode: `SKILL.md` plus `references/full-mode.md`.

<!-- FIX-LOOP-MODE:START -->

## Fix-Loop Mode (`--fix-loop` — OPTIONAL outer review + fix loop)

> **Scope gate:** this section runs ONLY when `$ARGUMENTS` carries `--fix-loop` and no `validate-findings` token. Without the flag NOTHING here applies — full mode, `validate-findings`, `--target=...`, and every sub-agent caller behave exactly as documented in `SKILL.md` and `references/full-mode.md`. It is the ONLY path through which this skill changes a review target, and only via the Step FL-1 fix half.

**Goal:** Drive a review target to a **clean pass** by pairing this skill's default full-mode review pass with `$fix` in a recursive loop — each round runs the full-mode `$why-review` pass INLINE to surface validated findings, then `$fix` to resolve them, then loops again over the CHANGED target — stopping when a complete full-mode pass clears the round's exit bar: **zero open findings** in round 1 (a LOW closes by scoped fix or deferral — Round-1 LOW closure), and **zero CRITICAL/HIGH/MEDIUM** from round 2 (LOW-only ENDS the loop, deferred not fixed).

**Mode summary:**

- **Each round = full-mode review pass + `$fix`** — the review pass is review-ONLY and never edits the target, so the loop MUST pair it with a fix half for **validated blocking findings only**; one without the other never converges.
- **Steps (in order):** (FL-0) resolve target + Goal Contract → (FL-0b) bind the convergence loop (protocol loop primary + optional `/goal` accelerator) → (FL-1) round loop { run the full-mode pass INLINE → clear the **Trade-Off Gate** on the blocking fix set → run `$fix` on the VALIDATED blocking findings at the owning layer → log iteration } → (FL-2) converge when the current round's exit bar is clear OR escalate on non-progress → (FL-3) recap.
- **Convergence:** stop ONLY when a **fresh full** review pass over the CURRENT (post-fix) target clears that round's exit bar — not a stale PASS predating the last fix.
- **Severity floor — from round 2, LOW stops blocking.** Round 1 converges on **zero open validated findings** (any severity; a LOW closes by a local fix plus scoped check, or is deferred with no edit when it needs new code or tests — Round-1 LOW closure). **From round 2 the bar is zero validated CRITICAL/HIGH/MEDIUM — a round whose validated findings are ALL LOW ENDS the loop.** Never open another round to fix LOW alone; list every deferred LOW in the recap and Goal Contract instead, and NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to LOW to reach the exit (`SYNC:severity-rubric`).
- **Inline invariant:** run each review pass in the main session — the skill invocation or the full-mode sections (`references/full-mode.md`), NEVER the `spawn_agent` tool — because the pass self-binds its OWN review-loop obligation (and a session `/goal` gate WHEN available, **Bind the Self-Recursive Review Loop**), which a sub-agent cannot own or carry back to this loop.
- **Apply ONLY validated findings:** the full-mode pass already validates its findings to the ≥85% survival bar (**Findings Validation Routine** → Confidence bar); the loop applies THOSE, at the invariant-owning component identified from project architecture and source evidence, routed by target type — NEVER unvalidated findings.
- **Bounded:** review round cap 3 (a ceiling, never a target); a failing test gate has NO round cap — keep fixing and re-running until the tests pass; review blockers not shrinking across 2 rounds, or the budget spent with findings still open → **STOP & escalate** using ask user tool. Increasing review blockers → STOP (fixes regressing). Count-based stops may escalate before the cap.
- **TRADE-OFF GATE before every fix (ALWAYS ASK):** apply the **Trade-Off Interrogation Gate** (`references/full-mode.md`) to each fix — (1) trade-off? (2) worth it? NOT WORTH IT → do NOT apply, report it back instead; (3) material? → **STOP the loop and confirm using ask user tool BEFORE applying**. NEVER auto-apply a material-trade-off fix just because the loop wants to converge.

**Why this mode exists:** full mode is **review-only** (**Important Notes**: *"Review only — do NOT modify target files"*; **Bind the Self-Recursive Review Loop**: *"Code/spec/test fixes remain the caller's job"*). Its self-recursive loop converges the **findings REPORT** to CLEAN but never touches the code and never re-reviews a fixed target, so nothing loops back to confirm a FIX is correct or introduced no new defect. This mode is that fixing caller: it applies the validated blocking fixes and re-runs a **fresh full** review pass over the changed target until the current round's exit bar is clear; from round 2 onward, LOW-only findings are recorded as deferred rather than fixed-and-looped — catching fix-induced regressions without spending rounds on non-material polish.

**Workflow:** resolve target + Goal Contract → bind the convergence loop (protocol loop + optional `/goal` accelerator) → **round loop** { run the full-mode pass INLINE → clear the Trade-Off Gate on the blocking fix set (trade-off? worth it? material → confirm with user) → run `$fix` on the validated blocking findings at owning layer → log iteration } → converge when a fresh full review clears the current round's exit bar (round 1: zero open findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred) → recap.

**Key rules:**

- **Each blocking round pairs the full-mode pass (find) + `$fix` (resolve).** A round is complete when BOTH have run, or when the current bar is already clear (round 1: zero open findings; round 2: zero CRITICAL/HIGH/MEDIUM, with LOW deferred).
- **NEVER self-invoke with the flag.** Each round's pass is plain full mode (`$why-review {target}`), never `$why-review --fix-loop` — one outer loop, no nesting.
- **MUST run INLINE in the main session — NEVER dispatch the review pass or this mode as a sub-agent.** As a sub-agent the in-session loop guarantee is silently lost; a sub-agent that receives `--fix-loop` refuses it (see **Full-mode sub-agent callers**).
- **Convergence = a fresh full review pass over the post-fix target clears the round's exit bar.** Round 1: PASS with zero open validated findings (Round-1 LOW closure — deferred LOWs land no edit; scoped-fixed LOW edits are edits and need this fresh full pass). **Round 2: zero validated CRITICAL/HIGH/MEDIUM — LOW-only converges.** A PASS produced BEFORE the latest fix landed does NOT count — re-review the changed target.
- **The severity floor bounds ITERATION, never the standard.** It ends the loop; it never authorizes shipping a known CRITICAL/HIGH/MEDIUM, never lowers the ≥85% finding-survival bar, and never applies to a binary gate (a failing test is a failure, not a LOW finding).
- **`$fix` applies ONLY validated findings**, at the lowest owning layer, routed by target type (code → `$fix` with its intelligent routing, or a direct edit at Entity/Service; plan/PBI → `$pbi --mode=refine`; spec → update the configured canonical owner and reconcile its profile-declared scenario/case and mapped test evidence (use `$spec [update]` + `$spec [mode=tests]` only for the strict default profile); docs → `$docs-manager --mode=update`; tests → `$integration-test`). NEVER apply an unvalidated or demoted finding.
- **The target base is FIXED across rounds; its content changes as fixes land.** Re-review the SAME target (same plan/diff/artifact) each round so convergence is measured against a stable subject.
- **Round cap (default 3, hard maximum 3)** and **review-blockers-not-shrinking / increasing → STOP & escalate** using ask user tool. NEVER loop open-ended. All review blockers may use round 3; unresolved blockers at round 3 escalate. A failing test gate is never capped: the loop keeps fixing and re-running until the tests pass.
- **Per-round Next Steps deferred:** each round's full-mode pass skips its `## Next Steps` next-step question and council gate; the loop asks once at Step FL-3. Material trade-off confirmations and escalations are NEVER deferred.
- **ALWAYS ask the 3 trade-off questions before applying ANY fix**; a MATERIAL trade-off **PAUSES the loop for an ask user tool before the fix lands** — convergence pressure NEVER authorizes walking through a one-way door on the user's behalf. — why: an autonomous fix loop is exactly where an unpriced trade-off ships silently, because each round only asks "did findings shrink?".

### First Principle — Convergence, Not Motion

> A round that changes the target is progress **only if** the next fresh review finds fewer things to fix.
> The loop exists to reach a fixed point (no blocking findings), not to keep editing the target.
> The bar tightens by round: everything blocks in round 1; from round 2 only CRITICAL/HIGH/MEDIUM block, so a LOW-only round is the fixed point.
> If findings stop shrinking, that is a signal to **escalate**, not to spin another round.

### Step FL-0 — Resolve Target + Goal Contract (FIRST ACTION)

1. **Parse the review target** into a stable, reusable target reference — exactly the kinds **Target Resolution** resolves: plan / PBI / story; code change (commit SHA, PR/merge commit, branch or PR diff, uncommitted working tree); docs / spec / report path. Record target type, evidence, and confidence. **NEVER silently convert target types.**
2. **Resolve/create the Goal Contract** per `SYNC:goal-contract-satisfaction-loop` (`goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root — default `plans/`, relocated by `docsRoots.plans.path` in `docs/project-config.json` — template `.claude/templates/goal-contract-template.md`). Its single **required** Success Criterion:
   > *A fresh full `$why-review` over `{target}` clears the round's exit bar: **round 1** → PASS with **zero open validated findings** (no finding, weakness, or missing item of any severity stays open — Round-1 LOW closure); **round 2** → **zero validated CRITICAL/HIGH/MEDIUM findings**, with any remaining LOW findings recorded as deferred rather than fixed.*
   Record the round cap (default 3, hard maximum 3; failing test gates uncapped until green), the severity floor (LOW non-blocking from round 2), and the target reference in **Constraints**.
3. **Plan the loop tasks FIRST:** create a detailed todo-task plan enumerating every step and planned round; REGENERATE a fresh task plan before each new round — never reuse the prior round's list.

### Step FL-0b — Bind the Convergence Loop (protocol-first; `/goal` is an optional accelerator)

The **protocol loop (Steps FL-1–FL-2) is the BINDING mechanism** and MUST be self-driven by you on every host, with or without any command or hook. The **`/goal` command is an OPTIONAL accelerator**; its absence NEVER weakens the loop.

**1. Protocol loop — ALWAYS binding (hook/command-independent).** You are personally responsible for not stopping until the loop converges or bounded-escalates:

> Repeatedly run the full-mode `$why-review` pass INLINE over `{target}`. After each review, apply only VALIDATED findings that block the current round at their owning layer, then re-run a FRESH full review pass over the CHANGED target. Do NOT stop while the last review still produced findings that BLOCK at the current round's bar. Converge when a fresh full review pass clears that bar: **round 1** → PASS with zero open validated findings; **round 2** → zero validated CRITICAL/HIGH/MEDIUM (LOW-only ENDS the loop, with the LOWs recorded as deferred). Cap at `{N=3}` review rounds; a failing test gate is outside the cap and the no-progress rule — keep fixing and re-running until the tests pass, never forcing green; if review blockers do not shrink across 2 consecutive rounds or increase, or the review budget (round 3) is spent with CRITICAL/HIGH/MEDIUM still open → STOP and escalate using ask user tool. Never loop open-ended.

Re-read this standing obligation at every Step FL-2 checkpoint. The Goal Contract's required Success Criterion (Step FL-0) is its durable, host-independent record.

**2. `/goal` command — invoke as an accelerator WHEN AVAILABLE.** If a `/goal` command exists and you are permitted to run it, ALSO invoke it (a real command call, NOT a paraphrase, NOT a Goal Contract file substituted for it) with the SAME condition:

```
/goal why-review fix-loop convergence: repeatedly run the full-mode $why-review pass INLINE over {target}. After each review, apply only VALIDATED findings that block the current round (all open severities in round 1 — Round-1 LOW closure; CRITICAL/HIGH/MEDIUM from round 2) at their owning layer, then re-run a FRESH full review pass over the CHANGED target. If the current round's blocking findings >0 → apply fixes and run another round; if a fresh full review pass clears the current bar (round 1: zero open findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred) → CONVERGED, clear the gate. Do NOT open another round for LOW-only findings from round 2. Cap at {N=3} review rounds; a failing test gate is outside the cap and the no-progress rule — keep fixing and re-running until the tests pass, never forcing green; if review blockers do not shrink across 2 consecutive rounds or increase, or the review budget (round 3) is spent with review blockers still open → STOP and escalate using ask user tool. Never loop open-ended.
```

The `/goal` Stop hook blocks stopping until the condition holds and auto-clears when met — do not tell the user to clear it. **If `/goal` is unavailable, unregistered, or not permitted:** DO NOT error, block, or invent a stand-in gate. Record ONE line in the Goal Contract — `/goal accelerator unavailable — loop bound by protocol (Steps FL-1–FL-2) + this Goal Contract` — and proceed.

> **Nested gates (by design, safe):** each round's full-mode pass self-binds its OWN report loop (and its own `/goal` gate WHEN available) that clears when THAT round's findings validate CLEAN. This OUTER loop persists across rounds and **subsumes** the inner ones. All self-clear on satisfaction — no orphaned gate.

### Step FL-1 — Round Loop (full-mode pass → `$fix` → log)

For each round `R` (starting at 1), do ALL of:

**Before each full-mode pass, capture its qualifying candidate.** Only a pass that covers the complete current-repository changeset for a supported commit can issue a receipt. Run `node .claude/hooks/lib/review-receipt.cjs snapshot --target=<worktree|staged|commit-descriptor> [--descriptor-json='exact descriptor JSON']` before that pass, including the exact descriptor JSON for `commit-descriptor`, and retain the complete JSON output. Artifact-only targets (plan/PBI/story/spec/doc/report), external PR/commit targets, and reviewed subsets never qualify. `CLEAN` needs no receipt; `ERROR` blocks issuance and is never clean. After a fix, capture a new snapshot before the next full-mode pass; use only the pre-review snapshot from the final converged pass at issuance.
1. **Run the full-mode review pass INLINE** on `{target}` — `$why-review {target}` WITHOUT `--fix-loop` via the skill invocation, or the full-mode sections (`references/full-mode.md`) in this session (NEVER the `spawn_agent` tool). Let it run its full adversarial review + its own Findings Validation Gate, so the findings it returns are already **validated**.
2. **Read the validated finding set** from its report (`tmp/reports/why-review-*.md`). If the verdict is PASS with **zero blocking findings at the current round bar** → no fix half is needed; go to Step FL-2, which converges only while no test gate is failing. At round 1 that means zero open findings of any severity (a LOW deferred under the Round-1 LOW closure is not open); from round 2 it permits LOW findings only, which must be recorded as deferred.
3. **Trade-Off Gate on the blocking fix set (BLOCKING — before any edit lands).** For EACH validated finding that blocks the current round, run the **Trade-Off Interrogation Gate** on applying its fix: (a) name what it sacrifices — "none" is an unfinished analysis; (b) **WORTH IT / NOT WORTH IT / UNCLEAR** — NOT WORTH IT → do NOT apply, report it back as a withdrawn-fix note and count it as still-open, never as fixed; (c) MATERIAL (irreversible · cost shifted onto another team/ops/maintainer/user · quality attribute traded · tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change path · UNCLEAR) → **PAUSE the loop and confirm using ask user tool BEFORE the edit**, stating the trade-off, both options, what each sacrifices, and your recommendation. Log each fix's verdict in the round's Iteration Log entry.
4. **Run `$fix` on the validated blocking findings** (findings>0 only, trade-off gate cleared). Resolve each at its owning layer: code → `$fix` (its `--target` routing) or a direct edit at the invariant-owning component identified from project architecture and source evidence; plan/PBI → `$pbi --mode=refine`; spec → update the configured canonical owner and reconcile its profile-declared scenario/case and mapped test evidence (use `$spec [update]` + `$spec [mode=tests]` only for the strict default profile); docs → `$docs-manager --mode=update`; behavior-changing → honor the finding's dual-feedback (spec verdict + test action per the **Findings Validation Routine** Dual-feedback check). Fix ONLY validated findings that block this round — never an unvalidated, demoted, or round-2 LOW-only finding.
5. **Append an Iteration Log entry** to the Goal Contract: round number, validated findings count, files/artifacts changed (`file:line`), fixes applied, per-fix trade-off verdict (WORTH IT / NOT WORTH IT / UNCLEAR + material? + confirmed?), and remaining gaps.

### Step FL-2 — Convergence & Escalation Gate

Evaluate after every round, **in this order — the first matching row decides**. The table is authoritative. Count only review blockers (validated findings at the current round bar and failed non-test binary gates); LOW findings from round 2 and failing test gates never count. A MATERIAL trade-off pauses before its fix lands.

| Condition | Action |
| --- | --- |
| Review blockers increased vs the prior round | **STOP & escalate** using ask user tool — fixes are regressing the target. |
| Review blockers are still open and did **not shrink** across 2 consecutive rounds (same/increasing count; failing tests excluded — they loop until green) | **STOP & escalate** using ask user tool — a non-converging loop is a signal, not a reason to spin. |
| Round cap `N` hit with CRITICAL/HIGH/MEDIUM still open — round 3 (the review hard cap) blocked by any review blocker | **STOP & escalate** using ask user tool — report the still-open findings; do not silently continue. (LOW-only at the cap converges via the severity-floor row above.) |
| A **test gate** is failing (a suite that must actually pass) and no review blocker is open, at any round within or past the budget | **Keep looping — NO round cap.** Run the failed-test investigation gate, fix at the owning layer, re-run the tests, and continue past round 3 until they pass. NEVER weaken an assertion, add a skip, or relax a timeout to force green. A failing test never counts toward the no-progress escalation. |
| A fix carries a **MATERIAL** trade-off (irreversible · cost shifted elsewhere · quality attribute traded · boundary crossed · high-consequence path · worth-it UNCLEAR) | **PAUSE the loop → confirm using ask user tool BEFORE applying that fix.** Convergence pressure NEVER authorizes deciding a material trade-off for the user. |
| Fresh full review pass returned **PASS with zero blocking findings at the current round bar** AND the target fingerprint is unchanged since the fresh full review pass's before-snapshot AND no test gate is failing | **CONVERGED** → mark the required criterion PASS in the Goal Satisfaction matrix → clear the `/goal` gate → go to Step FL-3. At round 1 this is zero open findings; from round 2 it may include deferred LOW findings. |
| Round `R ≥ 2` AND the fresh review's validated findings are **ALL LOW** (zero CRITICAL/HIGH/MEDIUM) AND the target fingerprint is unchanged since the fresh full review pass's before-snapshot AND no test gate is failing | **CONVERGED on the severity floor** → do NOT run another round for LOW alone → record every remaining LOW as a deferred finding in the recap + Goal Contract → mark the required criterion PASS → go to Step FL-3. |
| Blocking findings > 0 AND round `< N` AND blocking findings shrank vs prior round | Clear the Trade-Off Gate (Step FL-1.3), apply the validated fixes (Step FL-1.4), then run round `R+1` (fresh full re-review of the changed target). Round 1 counts every severity as blocking; round 2 counts only CRITICAL/HIGH/MEDIUM. |
| No review blocker is open but the target changed after the last full review | Within budget: run a fresh full review over the changed target. At round 3: **STOP & escalate** — changed fingerprints cannot converge on stale evidence. |

> **Increasing review blockers = STOP.** If round `R` surfaces MORE review blockers (validated findings at its own bar plus failed non-test binary gates) than round `R-1`, the fixes are regressing the target — STOP and escalate immediately. A LOW-only round 2 has zero review blockers, so it is never an increase. Never trade one fix for two new findings across rounds.

### Step FL-3 — Recap

Emit a concise convergence recap: rounds run, validated findings per round (the shrinking sequence, split by severity), the fixes applied each round, the final PASS evidence (zero findings, or zero CRITICAL/HIGH/MEDIUM when the loop ended on the round-2 severity floor), a `## Deferred LOW Findings (severity floor, round ≥2)` list of every LOW left unfixed with `file:line`, and the Goal Satisfaction matrix (required criterion PASS). Point to each round's report under `tmp/reports/` and the Goal Contract Iteration Log. Then ask the deferred next-step question using ask user tool. Do NOT commit or push unless the user explicitly asks.

**Mint the review receipt (MANDATORY terminal action).** Only when the final converged full-mode pass reviewed the complete `CHANGED` current-repository candidate. A round-1 LOW closed by scoped check never counts as that pass (Round-1 LOW closure): if LOW fixes landed after it, run one final full pass over the post-fix candidate first, capturing the snapshot before that pass. Then issue:

```bash
node .claude/hooks/lib/review-receipt.cjs issue --kind=why-review --scope=full-changeset --snapshot-json='<exact JSON captured before the final converged pass>'
```

This records — for the review-before-commit gate (`review-commit-gate.cjs`) — that this exact candidate passed `why-review --fix-loop`. Pass the original snapshot JSON; issuance rechecks that same target and refuses if it changed. Do not capture or reconstruct a snapshot at terminal issuance. Artifact-only, external, subset, or `CLEAN` targets receive `review-receipt: N/A — no full changeset candidate`; issue nothing. If issuance rejects target drift, issue nothing and restart the fix-loop from a new pre-review snapshot. Treat `ERROR` as blocked, never as clean. Run issuance as the last candidate-mutating action.

### Convergence Detection — Why a Fresh Full Re-Review Is Required

A round converges ONLY when a full-mode pass that ran over the **current, post-fix** target returns PASS with zero findings that block the current round bar. Both properties are required because:

- **Fresh over the changed target** — a PASS verdict from a review that predates the last fix proves nothing about the fix. Every applied fix invalidates the prior verdict (`SYNC:review-policy`); the loop MUST re-review after fixing, never reuse a stale clean verdict.
- **Zero *blocking* validated findings** — the Findings Validation Gate already dropped inflated/unproven findings below the ≥85% bar; convergence rides on that validated set, so the loop never chases a nit the review itself would demote. "Blocking" means every open severity in round 1 (a LOW closed or deferred under the Round-1 LOW closure is not open), and CRITICAL/HIGH/MEDIUM only from round 2 — the surviving LOWs are polish whose fix cost exceeds the risk of deferring them. — why: a loop that cannot exit on nits converges on exhaustion instead of on quality.

When findings remain but cannot be fixed (owner/product input needed) → **escalate**, do not loop. When a fix lands but the next fresh review still finds issues → run another round. Convergence is a fixed point, not a single clean read.

**IMPORTANT MANDATORY fix-loop sequence:** Step FL-0 (resolve target + Goal Contract + loop task plan) → Step FL-0b (bind the convergence loop: protocol loop primary + optional `/goal` accelerator) → Step FL-1 (round loop: full-mode pass INLINE → Trade-Off Gate on the fix set → `$fix` on validated findings → log) → Step FL-2 (converge on a fresh review with zero blocking findings at that round's bar / escalate on non-progress) → Step FL-3 (recap + mint the review receipt).

<!-- FIX-LOOP-MODE:END -->
