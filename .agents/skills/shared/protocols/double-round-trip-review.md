> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle or an explicitly declared independent-pass minimum, not by a round number alone. Review purpose: `review → validate findings → fix validated findings that block the current round → full re-review` until a complete review pass clears the round's exit bar (see **Severity floor** below). **A clean review ENDS the loop once the persisted `minRounds` is met (default 1); an explicitly declared minimum such as 2 still requires that independent pass.**
>
> _aka **Self-Review Convergence Loop**._ "Double-round-trip" means a validated-finding fix cycle forces at least one fresh re-review. The loop is bounded by the **2-round ceiling — extendable ONCE to round 3 when CRITICAL/HIGH remain**. A failing **test gate** (a suite that must actually pass) is outside that ceiling: the loop keeps fixing and re-running until the tests pass.
>
> **Round cap — 2 rounds MAX, extendable ONCE to round 3 (a ceiling, NEVER a target).** A clean pass ENDS the loop at ANY round once `round >= minRounds`; the cap never obliges an extra round. When round 2 completes with blocking findings still open (severity floor applied):
>
> - **Validated CRITICAL or HIGH still open → ONE extra round is granted (round 3, the review hard cap).** A failed non-test binary gate (security must-fix, required artifact, generated parity, policy compliance) counts as a CRITICAL blocker here. The extension is earned by that evidence alone, granted at most once per run, and never renews.
> - **Only MEDIUM (or an unresolved `NOT VERIFIABLE`) still open → NO extension.** → **STOP and escalate by asking the user directly** with the still-open findings listed.
> - **Round 3 completes with ANY review blocker still open → STOP and escalate by asking the user directly.** No review finding or non-test gate opens a round 4.
> - **A failing TEST gate → NO round cap, at any round.** Failing tests never escalate for budget or no-progress and never buy or spend the extension: run the failed-test investigation gate, fix at the owning layer, and re-run until the tests pass — past round 3 if needed. NEVER weaken an assertion, add a skip, or relax a timeout to force green.
>
> NEVER emit a silent "good enough" PASS on cap exhaustion, and NEVER loop past round 3 on review blockers. The 2-repeated-no-progress blocker rule stays an EARLIER exit — escalate at whichever trips first.
>
> **Severity floor — from round 2, LOW stops blocking.** One predicate everywhere: `blocking_findings(round, findings)` returns all validated findings in round 1 and only validated CRITICAL/HIGH/MEDIUM findings from round 2 onward. A binary gate (test-green, security must-fix, required artifact) is exempt only when its owning invariant explicitly says so; in practice binary gates always remain blocking when they fail.
>
> | Round | Exit bar — loop ENDS when the fresh full review has… | Must be fixed to continue |
> | --- | --- | --- |
> | 1 | zero validated findings at ANY severity | CRITICAL · HIGH · MEDIUM · LOW |
> | 2 | zero validated CRITICAL / HIGH / MEDIUM findings — **LOW-only clears the severity bar** | CRITICAL · HIGH · MEDIUM only |
> | 3 — extension, ONLY when round 2 left CRITICAL/HIGH open (or failing tests were the only blocker) | zero validated CRITICAL / HIGH / MEDIUM findings — **LOW-only clears the severity bar** | CRITICAL · HIGH · MEDIUM only |
> | 4+ — test-gate continuation, ONLY while failing test gates were the sole blocker | the tests pass and no review blocker is open | failing tests; any review blocker here escalates |
>
> From round 2 onward a round whose validated findings are ALL LOW **ENDS the loop once the persisted minimum is met**. Severity tiers are `SYNC:severity-rubric` (CRITICAL block-merge · HIGH must-fix · MEDIUM must clear the current round · LOW record/defer); round 1 stays strict.
>
> **Severity-floor rules:**
>
> - **Never silently drop a deferred LOW.** List every unfixed LOW under `## Deferred LOW Findings (severity floor, round ≥2)` with file, line, and description; dropping it is a protocol violation, not a clean pass.
> - **Never re-tier a finding to trigger the exit, or to reach or dodge the extension.** Demoting a real CRITICAL/HIGH/MEDIUM to LOW, promoting a MEDIUM to HIGH to buy round 3, or demoting a CRITICAL/HIGH to force an earlier escalation is a FALSE classification. Severity is set by consequence before the round bar and the extension test apply. — why: a bound reachable by relabeling bounds nothing.
> - **The floor bounds the loop, not the standard.** It ends *iteration*; it never authorizes shipping a known CRITICAL/HIGH/MEDIUM, and never lowers the finding-survival bar.
> - **The floor never applies to a hard gate.** Test-green, security must-fix, and any binary (not severity-rated) gate are unaffected — a failing test is a failure, not a LOW finding.
>
> **Universal scope (any new output/judgment):** any newly produced output or judgment gets **≥1 self-review**; any **new judgment** gets **≥1 `$why-review --validate-findings` pass**; anything flagged to re-check is re-checked **≥1 time** before it is final.
>
> **Routing invariant (author-facing):** a skill that validates findings MUST route them through `$why-review --validate-findings` (the terminal validator) — NEVER fork an inline finding-validation; the `verify-review-validate-coverage` sensor enforces this route mechanically.
>
> **Round 1:** Main-session review; output findings + verdict (PASS / FAIL). Then:
>
> - **No issues found (PASS, zero findings)** → review ENDS if `round >= minRounds`; otherwise perform the explicitly required independent pass. Do NOT invent a confirmation pass.
> - **`blocking_findings(round, findings)` is non-empty** → run the active review skill's findings-validation gate first (default `$why-review --validate-findings <report-path>`). Fix only validated findings that block the current round, then restart the full review protocol with a fresh task breakdown.
>
> **Fresh full re-review after every fix cycle:** re-run the whole review protocol over the current full target. When it uses sub-agents, spawn NEW `spawn_agent` calls — never reuse prior agents; reviewers re-read ALL files with ZERO memory of prior rounds (`SYNC:fresh-context-review` for the spawn mechanism, `SYNC:review-protocol-injection` for the prompt template). Each pass hunts missed cross-cutting concerns, interactions between changed files, convention drift, missing pieces, rationalized edge cases, and regressions from the fixes.
>
> **Loop termination:** after each full re-review, apply **that round's exit bar**: bar cleared and persisted minimum met → END; otherwise validate → fix → restart. Escalate by asking the user directly at whichever comes first: the same validated finding repeats for 2 full invocations with no progress · a fix requires product/owner input · round 2 completes with MEDIUM-only (or `NOT VERIFIABLE`) blocking · round 3 completes with any review blocker open. A failing test gate triggers none of these — it loops until green. NEVER convert cap exhaustion into a PASS.
>
> **Rules:**
>
> - A clean Round 1 ENDS the review when `minRounds=1`; an explicitly declared `minRounds=2` requires the independent second pass
> - LOW-only rounds from round 2 are listed as deferred, never fixed in a new round N+1
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - Every surviving finding must also clear why-review's **finding-survival bar** (Findings Validation Routine — stricter than the generic act-gate); a finding below it is demoted or dropped
> - NEVER skip the full re-review after a fix cycle (every fix invalidates the prior verdict); NEVER reuse a sub-agent across rounds
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - The cap, the single extension (ONLY validated CRITICAL/HIGH or a failed non-test binary gate at round 2), and the 2 repeated-no-progress rule are escalation triggers for review blockers, never completion criteria; the cap never replaces the clean-review requirement
> - Persist completed rounds, repeated blockers, findings and the explicit minimum in the owning run's `review-policy.cjs` record. Resume that record after interruption; target changes invalidate evidence and acceptance but preserve the bounded round budget. In-flight attempt IDs may be session-local; they do not replace or reset completed-round state
> - Final verdict must incorporate ALL rounds executed
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2 executed, plus `## Deferred LOW Findings (severity floor, round ≥2)` whenever LOWs stayed open. When round 3 ran, name the CRITICAL/HIGH findings that granted it; when rounds continued on failing tests, name each round's failing test gates.**
