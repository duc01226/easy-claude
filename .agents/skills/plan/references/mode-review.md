# `$plan --mode=review` — one-pass plan review reference

> Loaded by `plan/SKILL.md`'s Mode Dispatch when invoked as `$plan --mode=review [plan-path]`. This contract REPLACES default plan creation for the invocation: read the plan, review it once, report, stop. It never writes or edits a plan.

## Quick Summary

**Goal:** Decide in one review pass whether a plan gives an executor sound direction, bounded discovery, complete affected-area coverage, and credible final quality gates without pre-writing the implementation.

**Summary:**

- **ONE ROUND MAXIMUM per invocation.** Review once, report once, stop. Never fix the plan, start a re-review, or loop through findings.
- Review the whole plan at decision-and-boundary altitude: intent, important decisions, owners/areas, dependencies, discovery obligations, risks, spec/test/code sync, and final proof.
- Use conditional specialist lenses inside the single pass only when their risk warrants the context cost. An AI-feature plan retains the AI-engineering lens; UI, security, data/domain, integration-test, and architecture lenses remain evidence-triggered.
- Findings are validated and deduplicated before the verdict, but validation is not a second review round.

**Workflow:** Resolve plan and scope → load governing evidence → run one core pass plus warranted lenses → validate/deduplicate findings → emit report and verdict → stop.

**Key Rules:**

- Maximum one review round per invocation; a caller may revise and explicitly invoke `$plan --mode=review` again as a new run.
- Read-only on plan/source/spec artifacts. Write only the review report under `tmp/reports/`.
- Do not manufacture work: a clean plan passes; missing evidence is `NOT VERIFIABLE`, not a speculative finding.

## One-Round Contract

`round = 1`, `maxRounds = 1`, `minRounds = 1`.

- The single round includes reading, core review, any parallel specialist lenses, finding validation, deduplication, scoring, and verdict.
- It does **not** include editing `plan.md`, applying fixes, asking another reviewer to re-read fixed content, or starting round 2.
- When findings survive validation, return `CHANGES_REQUESTED` with owner and evidence. The plan author/caller owns revision. Another review requires a new explicit invocation and a new report.
- A missing required artifact, unresolved material user decision, or evidence gap that prevents judgment returns `BLOCKED` or `NOT_VERIFIABLE`; never consume another round trying to manufacture certainty.
- Test execution is outside this mode. Review whether the plan schedules verify-last correctly; do not run suites.

## Scope and Evidence

1. Resolve and read the active Goal Contract per `SYNC:goal-contract-satisfaction-loop`, then resolve the target `plan.md` (the path argument, else the active plan), any phase files it intentionally uses, its spec owner, and the configured project references.
2. Read current plan artifacts and cited evidence. For code-bearing plans, spot-check the key owners/consumers and representative patterns (an optional graph hint may help; it can be stale).
3. Establish the requested change and non-goals. If a supplied spec baseline exists, review against that baseline and separate proposed additions.
4. Create `tmp/reports/plan-review-{YYMMDD}-{HHmm}-{slug}.md` before recording findings.

## Single Review Pass

### Core review

**[BLOCKING]** Read `references/plan-quality-checklist.md` in full before the core review; its Review duty owns the checklist findings and severities below. Judge each dimension `PASS`, `FAIL`, `N/A`, or `NOT VERIFIABLE` with evidence:

| Dimension | Review question |
| --- | --- |
| Intent and scope | Is the outcome governed by a clear owner/spec, with non-goals and no silent expansion? |
| Technical decisions | Are material choices, rationale, alternatives, trade-offs, reversibility, and owners explicit? |
| Areas and consumers | Are modules, contracts, state/data, tests, specs/docs, mirrors, and downstream consumers covered where applicable? |
| Dependency order | Do phases reflect real dependencies or disjoint ownership rather than ceremony? |
| Executor discovery | Are unknowns bounded by source/owner, purpose, and stop condition instead of hidden or pre-solved? |
| Plan altitude | Is the plan actionable without becoming method-by-method implementation replay? |
| Failure and compatibility | Are rollback, migration, security/data/platform, error paths, and compatibility concerns covered where material? |
| Spec/test/code drift | Does the plan preserve intent/cases before build and reconcile actual tests/code/spec evidence before completion? |
| Verify-last | Are tests authored with implementation and executed only after all implementation and static review? |
| Future change cost | Is there one owner per rule, bounded growth, and a named test for each protected invariant without speculative abstraction? |
| Quality gates checklist | Does `## Quality Gates & Concerns Checklist` exist before the phases, derived from THIS task (not the same rows for any task), with every YES row carrying a verification method, expected evidence and owner phase, every NO row a reason, open concerns with a way to settle each, and every gate the task clearly triggers present (a behavior change has a test row, a UI change an accessibility row, a data/contract change a migration/compatibility row)? Missing section = at least MEDIUM; generic or evidence-less rows = MEDIUM; a missing gate for a triggered high-risk concern = HIGH (severity rubric; location = plan section, evidence = the task text that triggers the gate). |

### Conditional lenses

Use a lens only when evidence triggers it. Run warranted independent lenses in one parallel wave with an all-return barrier; otherwise review inline.

- **AI feature:** invoke or apply `ai-engineering-review --report-only` over the plan's model/tool/retrieval/eval/guardrail/operations decisions. This preserves the existing AI-feature review lane.
- **User-facing UI:** apply journey, design-system, accessibility, state, and container-fit plan checks.
- **Domain/data/security/public contract:** inspect the owning specialist rules and surface material unresolved decisions.
- **Integration/E2E:** verify case ownership, observable outcomes, fidelity, isolation, and final execution evidence; do not prescribe runner mechanics without project evidence.
- **Architecture/performance:** use only for cross-boundary, irreversible, scale, or SLA decisions.

Sub-agents are optional, not a quality signal. Use them only when independent risk lenses clearly outweigh their context load. Every lens is part of round 1, never a new round.

### Finding validation and verdict

1. Deduplicate by root cause and owning location.
2. For every potential finding, confirm reachable consequence, evidence, confidence, and normalized severity. Validate findings with `$why-review --validate-findings <report-path>`; this terminal adjudication belongs to the same pass and never edits the plan or opens another review round.
3. Ask the three trade-off questions for plan decisions and for each recommendation. Hand material unconfirmed trade-offs to the caller/user as blocking questions.
4. Verdict:
   - `PASS` — no validated blocking finding, unresolved required evidence, or failed required Goal Contract criterion.
   - `PASS_WITH_NOTES` — only evidence-backed LOW observations that do not require plan changes.
   - `CHANGES_REQUESTED` — one or more validated findings require revision.
   - `BLOCKED` — required intent/evidence/user decision is unavailable.
5. Stop. Do not apply fixes or re-review.

## Report Shape

```markdown
# Plan Review — {plan}

## Verdict
PASS | PASS_WITH_NOTES | CHANGES_REQUESTED | BLOCKED
Review rounds: 1/1

## Scope and Evidence
- Plan artifacts reviewed (incl. the Quality Gates & Concerns Checklist)
- Governing spec/decision/reference sources
- Code evidence spot-checked

## Dimension Results
| dimension | status | evidence | note |

## Findings
### [SEVERITY] Short title
- Location/evidence:
- Reachable consequence:
- Why it matters to execution:
- Recommended plan-level correction:
- Confidence:

## Trade-Off Assessment
| decision | sacrifice | gain | who pays/when | worth it | material | confirmed |

## Coverage and Limits
- Conditional lenses run or N/A with evidence
- Unverified evidence and owner

## Goal Satisfaction
| Success Criterion | Evidence | Status |
| --- | --- | --- |

## Handoff
- Plan author/caller owns revisions.
- This invocation is complete; no automatic second round.
```

Inside a workflow, return the report path and verdict to the parent without a next-step prompt. Standalone, report the same result; the user decides whether to revise or invoke another review.

## Mode protocols

The protocols below apply to this mode only; their full text is inline so this reference is self-contained. The `plan` skill already carries `core-engineering-principles`, `evidence-based-reasoning`, `goal-contract-satisfaction-loop`, `plan-granularity`, `plan-quality` and `verify-last-order`.

**AI surface?** Only if the plan creates or changes a model call, prompt, agent, tool/MCP, retrieval or eval (see `node .claude/scripts/ai-signal-scan.cjs`): read `.claude/skills/shared/protocols/ai-engineering-gate.md` and apply it; otherwise skip this line.

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
> - **Boundary naming:** When the category exposes public or cross-layer types, APIs, events, or modules, verify that names describe the capability, domain purpose, or contract rather than the current provider/framework/transport; concrete adapters may carry those details. Check callers and implementations before flagging a name, and treat generic names (`Manager`, `Helper`, `Utils`, `Data`) as signals rather than automatic violations.
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

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation (optional advice)** — Optional: for high-risk blast radius (shared contract, many callers, cross-module/cross-service flow, public API), `.code-graph/graph.db` may add callers, dependents and impacted tests beyond grep/read. Treat it as a hint, NOT proof: stale or incomplete graphs lag uncommitted edits and unindexed paths. verify anything that matters by reading files/grep. Skip it for low-risk or local changes.
>
> An absent or stale graph is never a finding and never blocks, fails or gates work.
>
> **Pattern:** grep/read → optional graph suggestions → grep/read verification.
>
> | Situation                          | Optional graph query                         |
> | ---------------------------------- | -------------------------------------------- |
> | High-risk investigation            | `trace --direction both` on 2-3 entry files  |
> | Fix/debug with wide reach          | `callers_of` on buggy function + `tests_for` |
> | Feature touching a shared contract | `connections` on files to be modified        |
> | Review of a high-risk change       | `tests_for` on changed functions             |
> | Blast radius                       | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Start `--node-mode file` (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Classify every finding by consequence, not by effort, reviewer preference, or how annoying the fix is. One scale applies to every review, skill, agent, workflow, and host so a tier means the same everywhere. Choose the highest credible consequence supported by evidence; do not lower a tier to make a round pass.
>
> **Finding vs observation (required):** An observation becomes a finding only when it names the affected user/system/data/contract, the shipped consequence, the evidence location, and the normalized tier. `INFO`, advice, preference, duplicate wording, or an unsubstantiated concern is not a finding and must not reopen a loop. If the concern might affect a required behavior or gate but evidence is incomplete, emit `NOT VERIFIABLE` with the missing evidence and keep it unresolved; never silently convert uncertainty into LOW.
>
> **Reachable trigger path (required):** a finding also names HOW a supported configuration reaches the defect — the caller, input, state or event sequence that drives execution or data there. A concern on a path nothing reaches (dead code, a branch its guard excludes, an impossible state) is an observation: record it as advice, never as a LOW to fix. Also never a finding: what a compiler, type checker, linter or test run for this change already reports in the review evidence; a behavior change the stated intent asks for; an issue silenced by a suppression that predates this change and states its reason (a suppression the change adds is itself reviewed); a pre-existing issue on a line the change neither touched nor made reachable. When reachability cannot be settled and the concern would be MEDIUM or higher, emit `NOT VERIFIABLE` naming what would settle it; a polish-level concern with unsettled reachability is an observation. — why: a speculative LOW admitted as a finding becomes build work in round 1.
>
> | Severity | Action | Definition and examples |
> | --- | --- | --- |
> | CRITICAL | Block immediately; escalate | Immediate material risk if shipped: authentication/authorization or safety bypass; secrets/PII exposure; irreversible destructive action; data loss/corruption; a silent failure on a critical path. A failed binary gate is carried by the executable policy as a separate synthetic blocker, not an ordinary severity judgment. |
> | HIGH | Must fix before PASS/merge | Material correctness or contract risk: wrong behavior on a supported path; violated business/data invariant; meaningful privacy or authority gap; breaking API/schema/compatibility change; likely harm to users/downstream systems; a missing proof for a behavior-changing fix. |
> | MEDIUM | Must clear the current round; escalate if the fix needs an owner decision | Bounded but consequential risk: an edge case, resilience/observability/testability/maintainability gap, credible future defect, or local architectural drift — real impact, not immediate material loss. A recorded follow-up does not make an open MEDIUM a clean pass. |
> | LOW | Record and defer; never opens another fix/re-review round from round 2 onward, never raises the round budget | Non-blocking polish with no credible present correctness, security, privacy, authority, availability, or data-integrity impact: wording/formatting, minor documentation or convention drift, optional defensive cleanup, cosmetic refinement. |
>
> **Consequence decision tree (apply in order):** (1) A failed binary gate stays a separate hard blocker (synthetic CRITICAL in the executable helper) — never hide it behind an ordinary label. Otherwise, would shipping permit immediate material security/safety/authority harm, irreversible destruction, data loss/corruption, or a critical-path silent failure? → **CRITICAL**. (2) Does a supported path, invariant, public contract, privacy/authority boundary, compatibility promise, or behavior-changing proof fail with material impact? → **HIGH**. (3) A bounded but consequential edge, resilience, observability, testability, maintainability, or architectural gap with credible impact? → **MEDIUM**. (4) Evidence shows only non-blocking polish? → **LOW**. (5) Evidence to choose among 1–4 missing → **NOT VERIFIABLE**, not LOW. When several tiers fit, select the highest credible consequence; effort, cost, reviewer discomfort, frequency alone, proximity to the round cap, and obtaining another round never decide the tier.
>
> **Boundary examples:** auth bypass, exposed secret/PII, destructive command without an authority gate, or failed required test/generation/parity gate → **CRITICAL**; wrong supported response, broken invariant/API/schema, meaningful privacy/authority defect, or unproven behavior-changing fix → **HIGH**; bounded retry/timeout/alert/testability gap or credible maintainability drift → **MEDIUM**; typo, formatting, optional cleanup, or cosmetic suggestion proven not to affect behavior → **LOW**. A missing fact about any boundary is **NOT VERIFIABLE** until evidence or a documented residual-risk decision exists.
>
> **Classification procedure (every finding):** (1) state the affected user, system, data, contract, or gate; (2) assess consequence if it ships; (3) assess exposure/likelihood and reversibility/detectability; (4) select the highest justified tier; (5) cite `file:line` or equivalent evidence and a confidence percentage. `NOT VERIFIABLE` is a pending evidence state, not a fifth tier and never a LOW escape hatch: if the claim could affect required behavior, security, privacy, authority, availability, data integrity, or a binary gate, it stays an open evidence blocker until resolved or explicitly owner-accepted with documented residual risk. Classify LOW only when evidence supports the absence of credible present material impact.
>
> **Hard-gate rule:** Binary gates (tests, required artifacts, security must-fix checks, generated parity, policy compliance) are not severity-rated findings. The executable helper records a failed gate as a synthetic CRITICAL blocker so one predicate can carry it; the report still names the gate and failure evidence. A failed gate blocks at every round, even when all ordinary findings are LOW. A failed non-test gate is bounded by the three-round review cap; a failing test gate is outside the round budget and loops until the tests pass.
>
> **Score-based skills** map their numeric scale onto these tiers — no parallel vocabulary:
>
> - **0-2 criterion scoring** (e.g. production-readiness-review): `0` = CRITICAL/HIGH (unmet, blocks readiness), `1` = MEDIUM (partial, consequential gap), `2` = pass. A polish-only criterion is LOW, not a forced `0`.
> - **Two-axis scoring** (e.g. performance-review, impact × likelihood): high impact + high exposure → CRITICAL/HIGH; material impact, bounded exposure → HIGH/MEDIUM; low impact and exposure → LOW. Record the axes and why the tier is the highest credible consequence.
> - **Scorecards / `/20` grades** (e.g. `architecture --mode=scalability`): the aggregate score and verdict band are separate from finding severity. A sub-80 area is evidence to investigate, not an automatic tier; classify each underlying gap by the decision tree and keep advisory score deductions apart from blocking findings.
>
> **Domain-vocabulary normalization (mandatory):** a skill may keep a local reporting vocabulary, but it MUST feed this same four-tier round predicate — never a second severity system:
>
> - `BLOCKED`, `HARD FAIL`, or `FAIL` is a blocking local verdict, not an automatic CRITICAL: CRITICAL for an immediate material risk or failed binary gate, otherwise HIGH or MEDIUM with evidence, while the local block holds until the owning gate is satisfied.
> - `WARN` is not permission to ignore: MEDIUM when consequential, LOW only when evidence shows no credible present material impact, HIGH/CRITICAL when the consequence warrants. `PASS`/compliant is not a finding.
> - UI `P0`/`P1`/`P2`/`P3`/`P4` start as CRITICAL/HIGH/MEDIUM/LOW/LOW; override upward only on evidence of a higher shipped consequence. A P0/P1 accessibility or task-completion floor stays a blocking gate even when called a priority.
> - Numeric SRE/readiness or impact/likelihood scores are evidence inputs, not tiers: emit the score, the consequence, and the normalized tier together. `INFO`/advisory observations are not findings unless evidence shows a material consequence.
>
> A tier drives the gate: CRITICAL/HIGH/MEDIUM stay actionable and blocking under the round policy; all review blockers may use up to three rounds, then escalate; LOW may be tracked as a follow-up and, from round 2, never justifies another fix/re-review by itself. An owner decision may explain or schedule an open MEDIUM but never makes it a clean pass; owner acceptance never makes a failed binary gate pass and must record scope, rationale, and residual risk.

<!-- /SYNC:severity-rubric -->

<!-- SYNC:trade-off-interrogation-gate -->

> **Trade-Off Interrogation Gate** — ALWAYS ask these THREE questions before ANY verdict, score, finding, or recommendation — about the thing under review AND about every recommendation YOU make. — why: naming a benefit without its price is an endorsement, not a review; the costliest trade-offs are the ones nobody wrote down.
>
> 1. **Is there any trade-off?** Name what it SACRIFICES. "None" / "pure win" is an unfinished analysis, NOT an answer — to claim none, state which dimensions you checked and why each is unaffected: future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.
> 2. **Is it worth it?** Weigh gain against sacrifice EXPLICITLY — what is gained (with a metric) · what it costs · WHO pays · WHEN it comes due — then emit **WORTH IT / NOT WORTH IT / UNCLEAR**. "Better" with no metric and no cost FAILS this question. NOT WORTH IT → withdraw or replace the recommendation, never keep it as-is.
> 3. **Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. **MATERIAL** when ANY holds: irreversible / one-way door (data migration, public contract, storage format, vendor lock-in) · cost shifted onto someone else (another team, ops/on-call, future maintainer, end user) · one quality attribute traded for another (correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility) · a boundary crossed (client↔server tier, service contract, event contract, shared library) · a high-consequence path (auth, money, data integrity, breaking change, High/Medium residual risk) · the worth-it verdict is UNCLEAR.
>
> **MATERIAL → STOP and confirm by asking the user directly BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** ask the user directly reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it by asking the user directly on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

<!-- /SYNC:trade-off-interrogation-gate -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Complete one evidence-backed plan review pass that improves execution confidence without becoming another implementation or review loop.

- **MUST ATTENTION** maximum one review round per invocation: review → validate/deduplicate → verdict → stop.
- **MUST ATTENTION** resolve the active Goal Contract and emit its Goal Satisfaction matrix before a PASS verdict.
- **MUST ATTENTION** never edit the plan, fix findings, or start a fresh re-review inside this mode.
- **MUST ATTENTION** judge intent, decisions, areas/consumers, bounded discovery, risks, drift control, and verify-last order at plan altitude.
- **MUST ATTENTION** keep the AI-engineering lens when AI-feature evidence triggers it; all other specialist lenses remain evidence-triggered and part of the same single pass.
- **MUST ATTENTION** inside workflows return the verdict/report path without a next-step prompt.
