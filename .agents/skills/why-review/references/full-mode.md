# why-review — Full Mode

> Read by `$why-review` full mode as its FIRST action, before any other full-mode step (the router `SKILL.md` → **Mode References**). `validate-findings` mode never reads this file. The `SYNC:*` protocol bodies cited here live in `SKILL.md`.

## Bind the Self-Recursive Review Loop (full mode — FIRST ACTION after mode detection and this file's read; protocol-first, `/goal` optional)

> **MUST ATTENTION:** In **full mode only**, the FIRST action after mode detection and the read of this file — before Task Bootstrap, before any review work — binds this skill's self-recursive review loop so you cannot stop until this review's findings are validated and any required holistic report re-review is complete or a bounded escalation fires. The loop is bound by TWO layers: the **protocol loop (primary, host-independent)** and an **optional `/goal` accelerator**. Correctness rides on the protocol loop — the project rule is that hooks/commands are accelerators only, so `/goal`'s absence NEVER weakens the loop.

**Entry gate:**

- **Run** in full mode (no `validate-findings` token).
- **SKIP** in `validate-findings` terminal mode — that mode only returns a verdict to its caller and MUST NOT bind a loop, install a goal, create a closing task, or loop (recursion guard). Record nothing.
- **`--fix-loop` mode:** bind the OUTER convergence loop first (Fix-Loop Mode Step FL-0b); each round's full-mode pass then binds THIS inner report loop for its own findings.

**1. Protocol loop — ALWAYS binding (hook/command-independent).** You, the running agent, are personally responsible for not stopping until the loop converges or bounded-escalates. This binds Claude, Codex, and Copilot equally, whether or not `/goal` exists:

> Run the full adversarial review (Validation Checklist + both Adversarial Rounds) over the whole target → run `$why-review --validate-findings` on the findings → reconcile (drop unproven/inflated findings, fix proof gaps, ADD surfaced findings/enhancements) → when reconciliation changes the report, re-run the FULL review over the WHOLE target combined with the reconciled findings (not just re-checking the changed findings) → loop until validation returns CLEAN, or a bounded blocker escalates. At most 1 re-do round (2 full review cycles total), then escalate by asking the user directly. Do not stop with unvalidated findings or incomplete required review coverage. Retain valid target findings for handoff; their severity does not require local target fixes.

Treat this as a standing obligation you re-read at the Findings Validation Gate — NOT a one-time note you can rationalize away after the first pass.

**2. `/goal` command — invoke as an accelerator WHEN AVAILABLE.** If a `/goal` command exists and you are permitted to run it in this environment, ALSO invoke it (a real command call, NOT a paraphrase, NOT a Goal Contract file substituted for it) with a condition encoding THIS skill's self-recursive loop, so a session Stop hook mechanically enforces it:

```
/goal why-review self-recursive loop: run the full adversarial review (Validation Checklist + both Adversarial Rounds) over the whole target → run $why-review --validate-findings on the findings → reconcile (drop unproven/inflated findings, fix proof gaps, ADD surfaced findings/enhancements) → when reconciliation changes the report, re-run the FULL review over the WHOLE target combined with the reconciled findings (not just re-checking the changed findings) → loop until validation returns CLEAN, or a bounded blocker escalates. At most 1 re-do round (2 full review cycles total), then escalate by asking the user directly. Do not stop with unvalidated findings or incomplete required review coverage. Retain valid target findings for handoff; their severity does not require local target fixes.
```

The `/goal` Stop hook blocks stopping until the condition holds and auto-clears when met — do not tell the user to clear it.

**If `/goal` is unavailable, unregistered, or not permitted** (e.g. Codex/Copilot, or a Claude run without the command): DO NOT error, DO NOT block, and DO NOT invent a stand-in gate. Record ONE line where you track the review (the closing Findings Validation Gate task, or the active Goal Contract if one exists) — `/goal accelerator unavailable — review loop bound by protocol (above)` — and proceed. The protocol loop IS the gate, enforced by discipline instead of a hook.

> **why-review fixes its OWN findings set, not code.** "Self-fix" here = reconcile the findings report so every surviving finding is correct, proof-backed, reasonable, best-practice, and nothing is missed — the same loop the Findings Validation Gate runs, now made unabandonable by the goal gate. Code/spec/test fixes remain the caller's job; this skill is review-only.

## Task Bootstrap (full mode — do at skill START)

Before review work, task tracking phase tasks AND required closing task:

- [ ] `[Why-Review] Bind self-recursive review loop — protocol-primary; optional /goal accelerator when available (full mode only)` — in_progress **(MANDATORY FIRST TASK — skip in `validate-findings` mode)**
- [ ] `[Why-Review] Findings Validation Gate — if ANY findings exist, run $why-review --validate-findings on them; re-do validation until the findings set is reconciled (at most 1 re-do; 2 full review cycles total)` — pending **(MANDATORY CLOSING TASK)**

> Create at START. Keep the closing task `pending` until findings exist; then execute before skill completes. In `validate-findings` mode, do NOT create either task.

## Adversarial Review Mindset (NON-NEGOTIABLE)

**Default stance: SKEPTIC, not validator. Your job is to find what's wrong, not confirm what's right.**

> **Confirmation bias trap:** After reading a coherent plan, AI naturally finds reasons to agree. Current context (post-plan, post-fix) amplifies this — you already saw the reasoning and rationalized it. This section breaks that loop. — why: a reviewer who already endorsed the reasoning cannot also be its skeptic without a forced reset.

### Adversarial Techniques (apply ALL before concluding)

| Technique              | Think                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Steel-Man              | Argue FOR rejected alternative. Would a 10-year domain senior choose it? If yes, dismissal needs stronger proof. |
| Why NOT?               | For every "chose X because Y", ask what X sacrifices.                                                            |
| Assumption Stress Test | List top 3 assumptions; ask impact if wrong. Strong plan survives 2/3 false.                                     |
| Pre-Mortem             | Assume 3-month production failure; write one plausible scenario.                                                 |
| Unseen Alternatives    | Identify 1-2 approaches not mentioned; absence without exclusion reasoning = weak coverage.                      |
| Pros/Cons Symmetry     | Count chosen-approach pros/cons. Pros > cons by 2:1 means likely bias.                                           |
| Contrarian Pass        | Before finding/verdict, argue opposite conclusion in 2 sentences; choose stronger argument.                      |
| Trade-Off Interrogation | Ask the 3 questions (below): is there a trade-off? · is it worth it? · is it material enough to confirm with the user? |

### Forbidden Patterns

| Forbidden pattern      | Required correction                                      |
| ---------------------- | -------------------------------------------------------- |
| "Looks good because..." | Lead with challenges first.                             |
| Presence = quality     | Test quality depth; real alternatives, causal rationale. |
| Vague rationale        | Demand metric + cost: better at what cost?               |
| Asymmetric trade-offs  | Treat 3 pros / 1 con as incomplete analysis.             |
| "Looks fine"           | Provide adversarial challenge evidence.                  |
| "No trade-off" / "pure win" | Name the dimensions checked and why each is unaffected; unexamined ≠ absent. |
| Material trade-off decided silently | Escalate to the user by asking the user directly; a one-way door is never yours to walk through. |

### Anti-Bias Gate (MANDATORY before finalizing verdict)

Complete ALL 7 checks before writing the final verdict (MUST ATTENTION):

- steel-man at least one rejected alternative (argue FOR it)
- identify at least 1 alternative NOT in the plan
- list 2-3 arguments AGAINST the chosen approach
- surface 2-3 hidden assumptions with stress tests
- run the pre-mortem (one concrete failure scenario)
- check pros/cons symmetry
- run the **Trade-Off Interrogation Gate** below (trade-off named · worth-it verdict · materiality escalation decided)

Any check incomplete → adversarial review NOT complete. Go back.

## Trade-Off Interrogation Gate (MANDATORY — no verdict, no finding, no recommendation without it)

> **[BLOCKING]** Ask these THREE questions EVERY time — about the decision under review AND about every recommendation YOU make. — why: a review that names benefits without naming their price is an endorsement, not a review; and the biggest trade-offs are the ones nobody wrote down.

**1. Is there any trade-off?** Name what this decision/recommendation SACRIFICES. Every choice buys something with something. "None" is NOT an acceptable answer — it is an unfinished analysis. To claim no material trade-off, state which dimensions you checked and why each is unaffected:

> future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational/ops load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.

**2. Is it worth it?** Weigh gain against sacrifice EXPLICITLY — **what is gained · what it costs · who pays · when it comes due** — then emit one verdict: **WORTH IT / NOT WORTH IT / UNCLEAR**. Anchor on Easy-to-Change: a trade-off raising future change cost needs a proportionate, named payoff, not a vague one. "Better" without a metric and a cost FAILS this question.

**3. Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. MATERIAL when ANY row below holds:

| Material when the trade-off…                     | Examples                                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| Is irreversible — a one-way door                 | data migration, public API/contract shape, storage format, framework/vendor lock-in |
| Shifts cost onto someone else                    | another team, ops/on-call, the future maintainer, the end user                     |
| Trades one quality attribute for another          | correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility     |
| Crosses a boundary                               | client↔server tier seam, service contract, event contract, shared library         |
| Sits on a high-consequence path                  | auth, money, data integrity, breaking change, High/Medium residual risk            |
| Cannot be evidenced (worth-it verdict = UNCLEAR) | gain or cost unquantifiable from available evidence                                |

- **MATERIAL → STOP and confirm by asking the user directly** BEFORE the verdict stands: state the trade-off, both options, what each sacrifices, your recommendation. NEVER resolve a material trade-off silently on the user's behalf, and NEVER bury it as a Low-severity note.
- **NOT material → record it inline** in the Trade-Off Assessment table with a one-line justification and proceed; no escalation needed.
- In `validate-findings` terminal mode: **assess and record, do NOT escalate** — that mode asks nothing (see Next Steps exemption); flag the unescalated material trade-off in the verdict so the CALLER escalates it.

**Output:** every review emits the `Trade-Off Assessment` table (see Output Format) — one row per reviewed decision and per recommendation you make. An empty table with findings present is an incomplete review.

## Target Resolution (DO THIS BEFORE REVIEW)

Analyze user request, not only literal argument shape. Determine target, then choose matching path.

| User request / evidence                              | Review path                         | Required target work                                                                                                                |
| ---------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Explicit plan directory, `plan.md`, phase files      | Plan-rationale review               | Read `plan.md` and all `phase-*.md` files.                                                                                          |
| PBI/story/spec planning artifact, rationale request  | PBI/artifact rationale review       | Read the named artifact and related acceptance/design/risk sections; if it references plan files, read those too.                    |
| Commit SHA, `Commit: ...`, PR/merge commit, git diff | Code-change review                  | Establish the diff range, read changed files, run graph impact when available, and apply code-review/adversarial review protocols.  |
| Branch comparison or uncommitted changes             | Code-change review                  | Use the requested branch/diff or `git diff`; read changed files and tests/docs touched by the diff.                                  |
| Docs/spec/report/findings path                       | Artifact review                     | Read the target artifact and verify claims against source evidence; use rationale checklist only where the artifact is a plan/PBI.   |
| Ambiguous request                                    | Infer from evidence; ask if unsafe  | Prefer a reasonable target from the request and repo evidence. Ask only when two plausible review paths would produce different work. |

**Important defaults:**

1. Commit hash / `Commit:` block => code-change review, not "no active plan."
2. PBI file => review that PBI/artifact; no `**/plan.md` wrapper under the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) required.
3. "No active plan found. Run `$plan` first." valid ONLY for unresolved plan-rationale requests.
4. MUST ATTENTION record target type, evidence, confidence; NEVER silently convert target types.

**Active-goal read (BEFORE judging rationale):** Resolve active Goal Contract per goal-contract-satisfaction-loop protocol (active plan `goal.md` → `goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root, default `plans/`, relocated by `docsRoots.plans.path` in `docs/project-config.json`). When one exists, review artifact's rationale AGAINST saved Original Request, Purpose, Success Criteria — flag rationale justifying work the saved goal never asked for, and saved required criteria the artifact's reasoning never addresses. When none exists, record `No active goal — rationale reviewed against the current request only.` Full mode only; `--validate-findings` terminal mode skips this read.

### Review Focus Routing

| Detected concern                 | Primary focus / sub-agent route                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| Source code / diff               | `code-reviewer` + embedded code-review protocols.                                                |
| Integration/E2E tests in the target, OR a behavior change whose code has covering integration tests | Apply the **Integration-Test-Review Linkage** below — `$integration-test-review` owns the 8 test-quality gates; this skill reads its protocol (Mode A) or delegates to it (Mode B), never re-derives them. |
| Auth, secrets, permissions, data | `security-auditor` if available; otherwise `code-reviewer` with explicit security pass.          |
| Latency, scale, memory, queries  | `performance-optimizer` if available; otherwise `code-reviewer` with explicit performance pass.  |
| Plan / PBI / doc / spec          | `general-purpose` with rationale/artifact dimensions.                                            |
| Mixed target                     | Split focused passes by concern; aggregate findings after all passes.                            |

### Code-Change Review Path

When target is code changes:

1. Resolve the diff source:
    - Commit SHA: use `git show --name-status` and diff against its first parent.
    - Merge commit: default to first-parent diff unless the user specifies another parent/range.
    - Branch/range: use the user-supplied range.
    - Uncommitted changes: use `git diff` plus staged diff if relevant.
2. **Comprehend change context + trace full pipeline across BOTH boundaries (MANDATORY for code-change targets; N/A for pure plan/PBI/doc targets).** Before deep file judging, write a one-line Change Context (what · intent · originating tier · main affected flow), then apply BOTH blocks inlined in `SKILL.md`: `SYNC:cross-stack-impact-trace` for the client↔server tier seam (BE→FE forward, FE→BE backward) and `SYNC:cross-service-check` for the microservice / event / external / loosely-coupled boundary. Classify each seam/touchpoint NONE / ADDITIVE / BREAKING; a BREAKING seam whose other-side consumer is un-updated in the same diff is a HIGH-min finding. State `Single-tier / monolith — N/A` when no cross-boundary seam exists.
3. Read the changed files and any nearby tests/docs required to prove behavior.
4. **Integration-test detection (CONDITIONAL).** If the target contains integration/E2E test files, OR changes behavior-bearing code that has covering integration tests, run the **Integration-Test-Review Linkage** below before judging the `Test/spec/doc sync` dimension. State `No integration tests in target — linkage N/A` when neither holds.
5. Read project reference docs based on changed file types before judging patterns.
6. If `.code-graph/graph.db` exists, run graph blast-radius or trace on key changed files before concluding.
7. Apply embedded code-review protocols by serial focused pass: bug detection, design patterns quality, logic/intention, test/spec verification, graph investigation, Easy-to-Change.
8. Output findings first, with `file:line` evidence, severity, confidence, and tests/docs gaps.

### Integration-Test-Review Linkage (CONDITIONAL — advisory, guarded)

> **Purpose:** this skill's `Test/spec/doc sync` dimension asks *"does evidence prove tests/specs/docs protect the intended invariant?"* — but the 8 gates answering it (assertion value · data state · repeatability · domain logic · spec traceability · three-way sync · change coverage · scenario fidelity) belong to `$integration-test-review`. Route to that owner; NEVER re-derive a weaker copy here. — why: a rationale review judging test quality by eye endorses assertions it never mutation-tested.

**Recursion guard — SKIP entirely when ANY row holds.** Record the deferral line, then proceed; NEVER invoke or read:

| Suppressing context | Evidence | Deferral line to record |
| --- | --- | --- |
| Mode is `validate-findings` | Terminal mode — no sub-skill calls at all | `Linkage N/A — validate-findings is terminal.` |
| Invoked by `$integration-test-review` Phase 9 | Its Phase 9 gate (`integration-test-review/SKILL.md:454`) calls this skill at `:463` and guards the reverse edge at `:471` | `Linkage deferred — invoked by $integration-test-review Phase 9.` |
| Invoked by `changes-review` in ANY phase — 0.8 parallel rationale dimension, 6 validate-findings, or 7.5 holistic — or inside `$workflow-review-changes` | `changes-review/SKILL.md:433` (Phase 0.8, whose sub-agent brief states this deferral as a binding constraint at `:452`), `:940` (Phase 6), `:1011` (Phase 7.5); its Phase 3.7 (`:646`) already owns the gate | `Linkage deferred to changes-review Phase 3.7 / parent workflow step.` |
| Invoked by `$plan-review`'s Parallel Review Wave (full-mode rationale sub-agent, every round; read-only — NEVER `--fix-loop`) | `plan-review/SKILL.md:81-110` (brief carries this deferral as a binding constraint); its Impact-Aware matrix dispatches `$integration-test-review` as a separate wave member when triggered | `Linkage deferred — plan-review Impact-Aware wave owns $integration-test-review.` |
| Invoked by `$debug-investigate`'s Root Cause Validation gate | `debug-investigate/SKILL.md:167`; inside `integration-test-verify --fix-loop` that gate fires in a round already running `$integration-test-review` (`integration-test-verify/SKILL.md` → Fix-Loop Key Rules, FL-0b nested gates, FL-1 step 5) | `Linkage deferred — debug-investigate gate; the verify loop owns the audit.` |

> — why: unguarded, this edge closes a cycle (`why-review` → `integration-test-review` → Phase 9 → `why-review`) and re-creates the duplicate-ownership defect that `integration-test-verify --fix-loop` removes (`integration-test-verify/SKILL.md` → "Why this mode exists").

**Mode A — READ the protocol (DEFAULT).** Read `.claude/skills/integration-test-review/SKILL.md` §"The 8 Quality Gates"; apply Gates 1-8 as review lenses over target tests. Cheap — no recursion, no sub-skill call. Findings enter this review's normal finding set with `file:line` evidence + severity.

**Mode B — DELEGATE to `$integration-test-review` (ESCALATION).** Invoke ONLY when ALL hold: no guard row fired · standalone full-mode review · target diff itself contains integration test files. Its GAP / SPEC-GAP verdicts become ordinary findings for this review's Findings Validation Gate.

**Advisory, NEVER blocking** — matches this skill's `Enforcement: Advisory` scope; mandatory coverage lives in `changes-review` Phase 3.7. — why: without this linkage a standalone rationale review silently skips test quality.

### Rationale / Artifact Review Dimensions

Run one focused pass per applicable dimension; do NOT scan all dimensions simultaneously.

| Dimension          | Think                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------- |
| Target fit         | Did we resolve what user asked, with evidence and confidence?                              |
| Goal alignment     | Does the rationale serve the saved Goal Contract's purpose and success criteria — or drift past them? |
| Rationale depth    | Are alternatives real, causal, symmetric, assumption-aware?                                |
| Trade-off honesty  | What does this SACRIFICE, is it worth it, and is the trade-off material enough to confirm with the user? An unpriced benefit is a rationale gap. |
| Behavioral risk    | What breaks in happy, error, edge, and rollback paths?                                     |
| Cross-boundary impact | Does a changed contract break a consumer on the other client↔server tier (BE↔FE), or a loosely-coupled/external service or event consumer? (tier seam + service/event) |
| Test/spec/doc sync | Does evidence prove tests/specs/docs protect the intended invariant and avoid stale claims? |
| Future change cost | Does recommendation reduce coupling, hidden state, duplication, unclear intent?            |

## Validation Checklist

For plan/PBI/artifact rationale reviews, read resolved target first. If plan directory, read `plan.md` and all `phase-*.md` files. Check **presence AND quality depth**.

For code-change reviews, use Code-Change Review Path instead of forcing plan checklist. Still include adversarial analysis, pre-mortem, assumptions, evidence, findings validation.

> **Rule:** Presence alone is NOT a pass. A section that exists but contains weak, asymmetric, or unverified reasoning FAILS quality depth.

### Required Sections (in plan.md or phase files)

| #   | Section                     | Presence Check                                    | Quality Depth Check (adversarial)                                                                                                                                                  |
| --- | --------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Problem Statement**       | 2-3 sentences describing the problem              | Is the problem scoped correctly? Could it be framed differently to lead to a different solution? Are symptoms confused with root cause?                                            |
| 2   | **Alternatives Considered** | Minimum 2 alternatives listed with pros/cons      | Are alternatives real (not strawmen)? Would a domain expert seriously consider each? Are the cons of the CHOSEN approach listed, not just cons of the others?                      |
| 3   | **Design Rationale**        | Explicit reasoning linking decision to trade-offs | Is reasoning causal (X leads to Y) or just descriptive (X is better)? Are hidden assumptions surfaced? Does it address failure modes, not just success modes?                      |
| 4   | **Risk Assessment**         | At least 1 risk per phase                         | Are risks ranked by severity? Are mitigations concrete actions or vague intentions ("monitor closely")? Is there at least one risk about the approach itself (not just execution)? |
| 5   | **Ownership**               | Clear who maintains code post-merge               | Implicit OK (author owns), explicit better                                                                                                                                         |

## Residual Risk Gate

- Challenge over-broad scope, weak rejected alternatives, and any High/Medium residual risk.
- High/Medium risks must be fixed, reduced, or explicitly accepted by user/owner before PASS.
- AI-extracted spec or test-case artifacts are not accepted evidence unless the configured canonical owner/review gate accepted them.

### Optional (Flag if Missing, Don't Fail)

| #   | Section                  | When Required                           | Quality Depth Check                                                |
| --- | ------------------------ | --------------------------------------- | ------------------------------------------------------------------ |
| 6   | **Operational Impact**   | Service-layer or API changes            | Are rollback steps defined? What breaks if this is reverted?       |
| 7   | **Cross-Service Impact** | Changes touching multiple microservices | Are all downstream consumers identified? Who needs to be notified? |
| 8   | **Migration Strategy**   | Database schema or data changes         | Is there a rollback plan? Is it tested on a data sample?           |

## Output Format

```markdown
## Why-Review Results

**Plan:** {plan path}
**Target Type:** {plan/PBI/code changes/docs/spec/report/artifact}
**Target:** {path, commit, branch range, or artifact}
**Date:** {date}
**Verdict:** PASS / NEEDS WORK

### Checklist

| #   | Check                   | Presence | Quality Depth | Notes                            |
| --- | ----------------------- | -------- | ------------- | -------------------------------- |
| 1   | Problem Statement       | ✅/❌    | ✅/⚠️/❌      | {what's strong / what's weak}    |
| 2   | Alternatives Considered | ✅/❌    | ✅/⚠️/❌      | {are they real or strawmen?}     |
| 3   | Design Rationale        | ✅/❌    | ✅/⚠️/❌      | {causal or just descriptive?}    |
| 4   | Risk Assessment         | ✅/❌    | ✅/⚠️/❌      | {concrete mitigations or vague?} |
| 5   | Ownership               | ✅/❌    | ✅/⚠️/❌      | {details}                        |
| 6   | Bugfix Debugger Trace   | ✅/❌/N/A | ✅/⚠️/❌     | {final state, feeder paths, hypothesis matrix, owner, forward proof} |
| 7   | Trade-Off Gate          | ✅/❌    | ✅/⚠️/❌      | {trade-off named? worth-it verdict? material → user confirmed?}  |

> ✅ Strong ⚠️ Weak/Partial ❌ Missing

### Adversarial Analysis

**Strongest arguments AGAINST the chosen approach:**

1. {argument 1 — cite specific plan text that weakens under this pressure}
2. {argument 2}
3. {argument 3 if applicable}

**Unexamined alternatives** (not mentioned in the plan):

- {alternative A} — why it might be worth considering
- {alternative B if applicable}

**Weakest assumptions** (if wrong, the plan breaks):

1. {assumption} — impact if false: {consequence}
2. {assumption} — impact if false: {consequence}

**Bugfix trace challenge** (required for bugfix, failed verification, stale/incorrect final output, regression, or behavior-changing fix plans):

- Observed final state and final reader proven? {yes/no/N/A}
- All feeder paths enumerated or explicitly bounded? {yes/no/N/A}
- Hypothesis matrix includes ruled-out and latent causes, not only the chosen cause? {yes/no/N/A}
- Owning fix layer protects all downstream consumers? {yes/no/N/A}
- Forward convergence proof and tests/proof mapping make the symptom impossible or detect recurrence? {yes/no/N/A}

**Pre-mortem** (assume it ships and fails in 3 months):

> {One concrete, plausible failure scenario based on the plan's approach}

**Pros/Cons symmetry:** Pros listed: {N} | Cons listed: {N} | Bias: {balanced / leans toward pros / leans toward cons}

### Trade-Off Assessment (MANDATORY — one row per reviewed decision AND per recommendation you make)

| # | Decision / recommendation | Trade-off — what it sacrifices | Gain (metric) | Who pays, when | Worth it? | Material? | Confirmed with user? |
| - | ------------------------- | ------------------------------ | ------------- | -------------- | --------- | --------- | -------------------- |
| 1 | {decision or my recommendation} | {sacrifice — or dimensions checked + why unaffected} | {gain + metric} | {payer / when due} | WORTH IT / NOT WORTH IT / UNCLEAR | YES / NO ({which materiality row}) | asked / N/A (not material) |

> Material trade-off with `Confirmed with user? = no` → verdict CANNOT be PASS. Escalate by asking the user directly first.

**Cross-Boundary Impact:** (code-change targets) {per client↔server seam AND per service/event/external touchpoint: NONE / ADDITIVE / BREAKING with routed fix; or `Single-tier / monolith — N/A`}

### Missing Items (if any)

- {specific item to add before implementation}

### Recommendation

{Proceed to $feature-implement | Add missing sections first | Add adversarial analysis to plan/PBI | Fix code findings | Update docs or specs | Continue manually}
```

## Round 2: Adversarial Re-Review (MANDATORY)

> **Protocol:** Deep Multi-Round Review (inlined via SYNC:double-round-trip-review in `SKILL.md`)

After Round 1, execute **second full adversarial round**:

1. **Assume Round 1 was wrong** — start with: "Round 1 missed something. Find it."
2. **Challenge every PASS item** from Round 1 — generate at least 2 sentences arguing the opposite for each
3. **Complete the Anti-Bias Gate** (all 7 boxes from Adversarial Review Mindset section, including the Trade-Off Interrogation Gate)
4. **Populate Adversarial Analysis** — MANDATORY:
    - At least 2 arguments against the chosen approach
    - At least 1 unexamined alternative
    - At least 2 hidden assumptions with failure consequences
    - Pre-mortem scenario
    - Pros/Cons symmetry count
    - Trade-Off Assessment table — every decision AND every recommendation of yours: trade-off named, worth-it verdict, materiality decided; re-ask the 3 questions on any trade-off Round 1 called "none" — why: Round 1's most common miss is an unpriced benefit.
5. **Focus on Round-1 misses:**
    - Alternatives that are strawmen (too easy to dismiss)
    - Risks stated vaguely without concrete mitigations
    - Assumptions embedded in the problem statement itself
    - Scope creep disguised as "related improvements"
6. **Update verdict** if Round 2 found new issues
7. **Final verdict** incorporates BOTH rounds + Adversarial Analysis

## Scope

- **Applies to:** Features, refactors, architectural changes, commits/diffs/code changes, docs/spec/report reviews
- **Exempt from plan-rationale advisory only:** trivial config changes, tiny single-file tweaks when active workflow permits documented skip
- **Enforcement:** Advisory (soft warning) — does not block implementation

## Important Notes

- Review only — do NOT modify target files or implement changes (the opt-in `--fix-loop` mode lands validated fixes ONLY through its Step FL-1 fix half; every review pass inside it stays review-only)
- Keep output concise — actionable in <2 minutes
- Simple plans still require Anti-Bias Gate; findings may be brief, but gate cannot be skipped

---

## Report Closure Contract

**CLEAN validates the report, not the target.** A full review with complete coverage may return a CLEAN findings-validation result while retaining CRITICAL/HIGH/MEDIUM findings. Preserve every retained target finding in the handoff, with severity, proof, trade-offs and dual-feedback; mark the target NEEDS WORK rather than PASS. A clean empty finding set may support target PASS only when all required review and evidence gates are complete.

This skill is report-only. Shared fix/re-review guidance applies here as validated repair handoff, not authority to edit the target. The fixing caller (for example, this skill's own `--fix-loop` mode or `$workflow-review-changes`) owns repairs, durable target-round eligibility and fresh post-fix review. Local re-dos repair report quality and never reset the caller's target-round budget. Terminal validation remains non-recursive; it neither edits the report nor performs target fixes.

## Findings Validation Gate (full mode — MANDATORY CLOSING TASK when findings exist)

> **Purpose:** Before handoff, re-validate THIS review's OWN findings: **correct, proof-backed, reasonable, best-practice**. Catch finding issues and missed enhancements.

**Trigger:** Full mode with ANY finding, weakness, missing item, or NEEDS WORK verdict — of ANY severity (Critical, High, Medium, OR Low). A Medium or Low severity NEVER exempts a finding from validation; even one low-severity nit triggers the gate. Skip ONLY unconditional PASS with a literally empty finding set (zero findings/missing items of any severity); record skip reason. **NEVER run in `validate-findings` mode**. — why: "it's only Low" is itself a severity claim the validation pass must confirm, not a reason to skip it.

**Caller-side re-do loop (bounded — owned HERE, not by validate mode):**

1. Ensure findings written to a report (`tmp/reports/why-review-{date}.md`).
2. **Invoke `$why-review --validate-findings tmp/reports/why-review-{date}.md`** in SAME main-agent session, NOT sub-agent. Returns CLEAN / HAS-ISSUES. Each call terminal.
3. **CLEAN** → append `## Findings Validation` line to report ("All N findings re-validated; correct, proof-backed, reasonable, best-practice; no changes."), gate PASSES, exit the report loop and hand off retained target findings; this is not target clearance.
4. **HAS ISSUES** → reconcile: drop/demote unproven or inflated findings (including any finding below the **≥85% finding-survival bar** — see the Findings Validation Routine's Confidence bar in `SKILL.md`), fix proof gaps, add surfaced findings/enhancements, re-derive verdict, record `## Findings Validation Notes` citing what changed and why.
5. **RE-DO holistically** — because the reconciled findings changed the picture, re-run the FULL review (Validation Checklist + both Adversarial Rounds) over the WHOLE target combined with the reconciled findings — NOT just re-validate the changed findings in isolation — then re-invoke `$why-review --validate-findings` on the UPDATED report. Repeat until the findings report validates CLEAN, or **at most 1 re-do round (2 full review cycles total)**. Still HAS ISSUES → record unresolved state, mark the goal-gate blocker, and escalate by asking the user directly in `## Next Steps`.
