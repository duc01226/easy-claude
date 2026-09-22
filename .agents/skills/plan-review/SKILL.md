---
name: plan-review
description: '[Planning] Use when auto-reviewing a plan for validity, correctness, and best practices — bounded at 2 rounds MAX, no extension.'
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
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

**Situation-based docs:**
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `configured styling reference`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Block implementation until each plan is hallucination-free (existing-code claims have `file:line` proof) and implementation-ready (every phase is concrete and small enough to code immediately); validate findings, fix only validated plan issues, and full-re-review until the round's exit bar is clear — within a HARD cap of 2 review rounds, escalating to the user instead of opening a round 3 (a failing test gate is outside that budget and loops until green).

Every phase review treats **Mode, Wave, write set, and SEQ dependency** as one indivisible metadata contract; a mismatch in any field blocks approval.

**Summary:** AI self-review (automatic, NOT a user interview like `$plan-validate`) that gates a plan before implementation.

- **Purpose:** review as a SKEPTIC, not validator — every existing-code claim needs `file:line` proof (Anti-Hallucination Gate); every phase must clear the "Detailed & Small Enough" granularity gate (≤5 files, ≤3h, no planning verbs) — too vague → detail it, too big → break it.
- **Main steps (run in order):** Phase 0 detect plan type → Step 1 read `plan.md` + `goal.md` + all `phase-*.md`, extract requirements/steps/files/risks and the convention matrix → Step 2 dispatch the **Parallel Review Wave** (unconditional `$why-review` rationale sub-agent + triggered lens sub-agents, ONE message) and, while it runs, evaluate the 4 checklist groups: **Validity** (summary, requirements, steps, files) · **Correctness** (Granularity Gate + Anti-Hallucination/Code-Proof Gate + Project Convention & Example Alignment + spec/TC coverage + Goal-Contract mapping) · **Best Practices** (YAGNI/KISS/DRY/architecture) · **Completeness** (risks, testing, success criteria, security, graph-dependency) → run Adversarial Techniques 1-6 + 11 + 9 Plan Dimensions → graph-trace each modified file (when graph.db exists) → all-return barrier: merge the why-review (Techniques 7-10) and lens reports, close the Anti-Bias Gate → Step 3 score PASS/WARN/FAIL → Step 4 output result → the **Findings Validation Gate** + **Recursive Fix-and-Review Protocol** (validate → fix → full re-review).
- **Applicability is Dimension 0:** before scoring implementation detail, read `.claude/skills/shared/product-roadmap-contract.md` and verify the plan's applicable `## Plan Gate` branch: complete decomposition/slice evidence for embedded large ideas, approved milestone/scope brief for an explicit roadmap request, technical scope for framework/library work, or the complete EXEMPT scope/scenario branch for an isolated change. Check explicit non-goals, known skeleton/commands, evidence plan, and owner approval. Missing or open upstream intent/evidence is a blocking finding; an AI PASS cannot substitute for owner approval.
- **Detect plan type FIRST (Phase 0)** so the right focus applies — bugfix MANDATES the Behavioral Delta Matrix; security/performance/refactor/contract/infra/data-schema each add targeted checks.
- **Impact-aware quality gates:** derive the plan's UI, domain, backend, data, security, integration, E2E, performance, dependency, and framework surfaces; run every triggered review lens and record evidence for each N/A decision.
- **Parallel Review Wave — `$why-review` sub-agent ALWAYS in it:** every full review pass (round 1 AND every re-review round) is ONE parallel wave spawned in ONE message: the core checklist pass + an UNCONDITIONAL full-mode `$why-review` rationale sub-agent over the plan dir (`plan.md`, `goal.md`, `phase-*.md`) + every triggered Impact-Aware lens sub-agent. Wait for ALL to return (all-return barrier), merge every report into the plan-review report, THEN close the Anti-Bias Gate, score, and emit the verdict. The why-review member is never N/A, never skipped, never deferred to after findings exist — it owns the rationale lens (Techniques 7-10). — why: a buildable plan resting on an unchallenged design decision is still a failed plan, and a rationale pass run after scoring cannot change the verdict it should have shaped.
- **Findings are never fixed blindly:** run the `$why-review --validate-findings` gate on the MERGED findings (core + why-review + specialist) BEFORE editing any `plan.md`/`phase-*.md`, fix only validated findings that block the current round at the smallest responsible location, then restart the FULL review wave — a fresh, zero-memory core sub-agent plus a fresh `$why-review` rationale sub-agent plus the triggered lenses — Round 1 requires zero findings; Round 2 requires zero CRITICAL/HIGH/MEDIUM, so LOW-only findings are recorded as deferred and do not start another cycle.
- **Severity floor — from round 2, LOW stops blocking.** Round 1 requires zero findings at any severity. **From round 2 the bar is zero validated CRITICAL/HIGH/MEDIUM — a review round whose validated findings are ALL LOW ENDS the loop.** Do NOT restart the full review for LOW findings alone: record them under `## Deferred LOW Findings (severity floor, round ≥2)` in the report and PASS. NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to LOW to reach the exit, and NEVER apply the floor to a hallucinated-code claim or a missing-evidence finding — those are HIGH by definition, not deferrable LOW. Severity tiers per `SYNC:severity-rubric`.
- **Round cap 2 — HARD, with NO extension; a ceiling, NEVER a target.** Round 1 is the initial review; round 2 is the at-most-one re-review after fixes. For review blockers there is NEVER a round 3 — no severity and no evidence buys one. A clean pass ends the loop earlier once the persisted `minRounds` is met. **The one carve-out is a failing TEST gate**, which sits outside the round budget entirely: while failing tests are the ONLY blockers, keep fixing and re-running past round 2 until they pass (never forcing green). That is a test-green continuation, NOT a review round — any review blocker open beside it still escalates. **Round 2 completing with ANY validated blocking finding still open (CRITICAL, HIGH, or MEDIUM) → STOP and escalate by asking the user directly listing every open finding.** Escalate equally when the same blocker survives 2 consecutive full re-reviews with no progress, or when a finding needs product/owner judgment. NEVER open round 3, NEVER weaken the severity bar or re-tier a finding to reach the exit, and NEVER convert cap exhaustion into a PASS — cap exhaustion escalates.

**Workflow:**

1. **Resolve Plan** — Use $ARGUMENTS path or active plan from `## Plan Context`
2. **Read Files** — plan.md + all phase-\*.md files, extract requirements/steps/files/risks, reference-doc evidence, and convention-alignment matrix
3. **Evaluate Checklist in the Parallel Review Wave** — in ONE message spawn the unconditional `$why-review` rationale sub-agent + every triggered lens sub-agent; meanwhile evaluate Validity (summary, requirements, steps, files), Correctness (specific, paths, no conflicts, conditional project-pattern alignment), Best Practices (YAGNI/KISS/DRY, architecture), Completeness (risks, testing, success, security); wait for ALL members, then merge their findings into the report
4. **Score & Classify** (only after the wave barrier + merge) — PASS (all Required + ≥50% Recommended), WARN (all Required + <50% Recommended), FAIL (any Required fails)
5. **Output Result** — Status, checks passed, issues, recommendations, verdict
6. **If any findings remain** — Run `$why-review --validate-findings` on the merged plan-review report first; fix only validated actionable issues in plan files, then re-review with a fresh full wave (loop back to step 2 until the round's bar is clear — zero findings in round 1, zero CRITICAL/HIGH/MEDIUM in round 2 — unless the repeated-blocker rule or the 2-round hard cap applies; round 2 is the LAST round, so anything still blocking there escalates)

**Core Principle — Detailed & Small Enough:**

- **Too vague?** → Detail it: add specific file paths, concrete actions, exact method names
- **Too big to detail?** → Break it: split into smaller phases/sub-plans until each is detailed
- A plan that can't be immediately coded from is NOT ready. Every step must be implementation-ready.

**Key Rules:**

- **No hallucination**: Every plan claim about existing source code must have `file:line` proof — unverified paths, class names, or behaviors = FAIL
- **Conditional Project Pattern Alignment is required:** always independently read `code-review-rules.md`; if the plan edits frontend/UI, also read `frontend-patterns-reference.md`; if it edits backend/hook code, also read `backend-patterns-reference.md`; if it edits both, read both. Verify the plan's cited sections and inspect corroborating source examples when implementation code exists. Do not require a separate project-reference example-code file. Missing, stale, generic-only, or contradictory evidence = FAIL; an explicit N/A/scarcity exception must be supported by the plan scope and reference docs.
- **PASS**: Proceed to implementation
- **WARN**: Proceed with caution, note gaps
- **FAIL (any findings)**: Validate findings with `$why-review --validate-findings`, fix only validated blocking plan issues, then **re-run the FULL review from the start**. Repeat this self-loop — default `minRounds=1`, honor an explicitly declared independent-pass minimum, capped at **2 rounds MAX with NO extension** — until a complete pass clears the current round's exit bar (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred). Round 2 still blocking → escalate; never a round 3 on review blockers (a failing test gate is outside the budget and keeps looping until green).
- **Bounded loop — two escalation triggers, neither a completion criterion**: (a) **no-progress safety** — the SAME blocker surviving 2 consecutive full re-reviews with no progress; (b) **round cap** — round 2 (the LAST round) completing with any validated blocking finding still open. No severity buys an extension round and no evidence opens a round 3. Whichever trips first → STOP and escalate to user by asking the user directly with every open finding listed, never a silent "good enough" PASS. A clean pass ends the loop once the persisted `minRounds` is met — the cap is a ceiling, not a quota.
- **Constructive**: Focus on implementation-blocking issues, not pedantic details

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Impact-Aware Quality Review (NON-NEGOTIABLE)

Before scoring, build an impact matrix from the plan's files, behaviors, contracts, and data flows. The base validity, correctness, adversarial, and re-review gates always apply; every triggered row below adds its own review lens. Conditional means scope-aware, never optional.

| Plan impact / trigger | Required review lens | Verify in the plan |
| --- | --- | --- |
| **Every plan, every review round — UNCONDITIONAL, never N/A** | `$why-review` (FULL mode, rationale sub-agent — see **Parallel Review Wave**) | Decision quality: steel-manned rejected alternatives, what each choice sacrifices, unseen alternatives, pros/cons symmetry, assumption stress, and a design pre-mortem. |
| Frontend page, component, store, UX flow, HTML, CSS/SCSS, accessibility, responsiveness, or browser-visible state | `$ui-review` (including web-design guidelines) | Design-system conventions; loading, empty, error, and permission states; keyboard/screen-reader behavior; responsive/long-content layouts; selectors/page objects; and E2E coverage. |
| Domain entity, value object, aggregate, invariant, lifecycle rule, domain event, or business-rule ownership | `$domain-entities-review` (apply its A–P checklist inline; delegate only under its escalation rule) | Domain/subdomain fit; aggregate boundary; invariant ownership; lifecycle/events; validation; persistence; and regression/invariant tests. |
| Backend endpoint, command/query, handler, service, repository, API, or public contract | `$architecture-review` + `$production-readiness-review` | Lowest responsible layer; validation/error contracts; auth; compatibility and consumers; observability; performance; and operational safety. |
| Schema, migration, backfill, index, retention, or production data change | `$db-migrate` | Ordering; locking/downtime; forward/backward compatibility; integrity; scale; rollback/recovery; and migration validation. |
| Authentication, authorization, tenancy, secrets, untrusted input, payments, or sensitive data | `$security-review` | Threat model; boundaries; validation; redaction/logging; abuse paths; and secure failure behavior. |
| Queue, event, webhook, external API, third-party integration, or cross-service workflow | `$integration-test-review` | Contracts; timeouts; retries; idempotency; ordering/duplicates; compensations; and integration coverage. |
| Critical browser journey or changed E2E-visible behavior | `$e2e-test` | Happy, error, and permission journeys; fixtures; stable selectors/page objects; and browser coverage. |
| Hot path, large dataset, expensive query, rendering concern, or background job | `$performance-review` | Budgets; query/algorithm cost; cache behavior; load characteristics; and measurable verification. |
| Dependency/runtime/toolchain upgrade or generated artifact | `$package-upgrade` | Compatibility; lockfile/security impact; build/test effects; upgrade sequence; and rollback. |
| Hook, skill, agent, workflow, shared protocol, or generated Claude/Codex carrier | Framework-maintainer review | Source of truth; required sync/generation; catalog/protocol compatibility; and framework regression tests. |

Report the completed matrix, including evidence for every N/A row (the `$why-review` row has none). Run the selected lens reviews as sub-agents in the SAME read-only **Parallel Review Wave** as the core pass and the unconditional `$why-review` rationale sub-agent, wait for ALL results, then merge findings before verdict. Validate the merged findings (core + why-review + specialist) through the existing `$why-review --validate-findings` gate before editing plan artifacts; this adds scope-specific depth and never replaces existing gates.

## Parallel Review Wave (NON-NEGOTIABLE — every full review pass)

Every full review pass — round 1 AND every round N≥2 re-review — is ONE read-only parallel wave with an all-return barrier. No member edits plan files; each persists findings to its own `tmp/reports/` file. — why: the members read the same frozen plan and share no write target, so running them as a queue only costs wall-clock, while running the rationale member after scoring lets a wrong design decision pass unchallenged.

| Wave member | Round 1 | Round N≥2 | Owns |
| --- | --- | --- | --- |
| Core plan-review checklist pass | INLINE in the orchestrator, while the sub-agents run | Fresh zero-memory `general-purpose` sub-agent (Round N≥2 template in **Recursive Fix-and-Review Protocol**) | Phase 0, Steps 1-2 checklists, Adversarial Techniques 1-6 + 11, Anti-Bias Gate items 1-6, Plan Dimensions 0-9, graph trace |
| `$why-review` rationale review — **ALWAYS, unconditional** | Fresh `general-purpose` sub-agent (brief below) | NEW fresh `general-purpose` sub-agent (never reused) | Adversarial Techniques 7-10, Anti-Bias Gate items 7-9, Trade-Off Interrogation |
| Each triggered Impact-Aware lens | Fresh sub-agent routed per `.claude/skills/shared/sub-agent-selection-guide.md` | NEW fresh sub-agent | That lens's scope-specific checks |

**Dispatch protocol:**

1. After Step 1 builds the impact matrix, declare `Parallel plan: wave = [core pass, $why-review rationale, {triggered lenses}] · SEQ = [merge → Anti-Bias Gate close → score → verdict → $why-review --validate-findings → fix] (each consumes the whole wave)`.
2. Spawn every sub-agent member in ONE message — NEVER drip them across turns, NEVER make the why-review member wait for the core pass.
3. **All-return barrier:** advance to merge ONLY after EVERY member returns. A lens whose trigger is absent was never spawned and counts as returned; the why-review member has no absent trigger.
4. **Merge** each returned report into the plan-review report — `## Why-Review Rationale Findings (parallel wave, round {N})` and `## Specialist Lens Findings (round {N})` — preserving each finding's `file:line`, severity per `SYNC:severity-rubric`, and confidence. NEVER filter, re-tier, or override a member's findings.
5. **Missing rationale result = incomplete review, never a silent PASS.** If the why-review sub-agent fails, times out, or returns no verdict, re-dispatch it once; if it fails again, run Techniques 7-10 and Anti-Bias Gate items 7-9 INLINE and record `why-review sub-agent failed → rationale lens run inline`.
6. **Trade-off questions reach the user through the orchestrator.** The sub-agent cannot ask the user, so it returns material Trade-Off / owner-judgment questions UNANSWERED. After the barrier and before the verdict, ask them by asking the user directly; NEVER self-approve a one-way door. An unanswered material trade-off keeps the verdict open.

**Why-review sub-agent brief.** Copy the Agent call shape from the `SYNC:review-protocol-injection` template, then set:

- `agent_type: "general-purpose"` (plan rationale review; `code-reviewer` is for source diffs).
- **Protocols:** embed, verbatim from the template, the same plan-applicable protocol sections the Round N≥2 core sub-agent receives — Evidence-Based Reasoning, Rationalization Prevention, Graph-Assisted Investigation, and Understand Code First (omit the code-specific sections).
- **Task:** `"Invoke $why-review in FULL mode (a real Skill call, NOT --validate-findings, NEVER --fix-loop) over the plan directory {plan-dir}. Review decision quality only: steel-man every rejected alternative, name what each chosen approach sacrifices, surface 1-2 viable alternatives the plan never mentions, check pros/cons symmetry, stress-test the top 3 assumptions, and write one concrete pre-mortem failure of the chosen design. Buildability (paths, granularity, code proof) belongs to the core pass — do not duplicate it."`
- **Round:** `Round {N}. ZERO memory of prior rounds — re-read every target file via your own tool calls.`
- **Target Files:** `plan.md`, `goal.md` (when present), and every `phase-*.md` under `{plan-dir}`.
- **Output:** `tmp/reports/plan-review-why-review-round{N}-{date}.md`, written incrementally. Return a summary plus every finding with `file:line`, severity per `SYNC:severity-rubric`, and confidence, plus a separate list of UNANSWERED Trade-Off / owner-judgment questions.
- **Binding constraints (include verbatim):** READ-ONLY — NEVER edit `plan.md`, `goal.md`, `phase-*.md`, or any other file except its own report · NEVER pass or honor `--fix-loop` (it mutates the target; plan-review owns plan fixes) · NEVER bind the `/goal` gate — record `/goal accelerator unavailable — sub-agent context` and rely on why-review's protocol loop · NEVER call ask the user directly or run why-review's Next Steps — return the questions unanswered · NEVER invoke `$plan-review` (the caller — a callback closes a cycle) · record `Linkage deferred — plan-review Impact-Aware wave owns $integration-test-review.` for the Integration-Test-Review Linkage.

**Execution host and fan-out (one level deep).** plan-review dispatches this wave, so it runs INLINE wherever it is a workflow step — NEVER dispatch plan-review itself as a sub-agent. When sub-agent dispatch is unavailable (plan-review is already running inside a sub-agent, or the host or permissions provide no sub-agent tool), run the identical wave members sequentially INLINE in the same order — core pass, then the why-review rationale lens (full-mode Techniques 7-10 + Anti-Bias Gate items 7-9 + Trade-Off Interrogation), then each triggered lens — merge exactly as above, and record once `host/sub-agent fan-out unavailable → inline fallback`. Slower, never weaker: the why-review rationale lens still runs every round.

## Conditional Project Pattern Alignment (MANDATORY)

Review this independently from the plan author’s claims. `code-review-rules.md` plus the conditional frontend/backend pattern references are the conformance authority; generic framework guidance is not a substitute. There is no separate project-reference example-code file to require.

1. **Read the governing docs.** Derive the frontend/backend triggers from the plan's file/module list and `docs/project-config.json`, not the plan title alone. Start with `docs/project-config.json`, `docs/project-reference/docs-index-reference.md`, `docs/project-reference/lessons.md`, and `docs/project-reference/code-review-rules.md`. If the plan edits frontend/UI, read `docs/project-reference/frontend-patterns-reference.md`; if it edits backend/hook code, read `docs/project-reference/backend-patterns-reference.md`; if it edits both, read both. Record actual paths and headings in the review report. Missing or stale required docs are a finding and must route through the documented setup/scan path.
2. **Verify the right examples.** Treat the applicable pattern-reference sections and the code-review document's Golden-Path, Architecture, Skill Definition, and relevant checklist sections as the examples supplied by project documentation. For each major decision in the plan's `## Project Convention Alignment` and phase `## Convention Alignment`, inspect at least 3 comparable source examples when 3 exist; otherwise inspect all valid source examples and require a documented scarcity/N/A reason. Verify cited `file:line`, read enough surrounding code to establish preconditions/scope/lifetime/boundary fit, and reject examples that merely share a name. If a pattern document says the surface is N/A, record that evidence rather than inventing an application convention.
3. **Compare the solution.** Check that the proposed placement, layer/base type, naming, registration/wiring, validation/error/result contract, tests/specs, and documentation/mirror actions match the governing reference and examples. A plan that says “follow existing patterns” without the exact reference section and context-fit example is not evidence.
4. **Adjudicate deviations.** `MATCH` requires the applicable local pattern source and, when implementation code exists, a context-fit source example. A `DEVIATION` must state the violated convention, why it does not fit, the rejected local alternative, the future-change-cost trade-off, and any required owner approval. `OPEN`, `MISSING`, `UNVERIFIED`, dead citations, generic-only reasoning, or an unreferenced major decision is a Required-check failure. `N/A` is valid only for a documented scope condition or a reference that explicitly marks the surface N/A.
5. **Do not silently repair the evidence.** Missing convention/example evidence is a review finding. Route it through the existing findings-validation gate before editing plan artifacts.

### Required evidence table

| Decision | Applicable pattern source (path + heading) | Corroborating source example(s) (`file:line`) or explicit N/A | Plan choice | Verdict |
| --- | --- | --- | --- | --- |
| {placement/layer/naming/test/etc.} | `{docs/...}#{section}` | `{path}:{line}` or `{N/A reason}` | {concrete choice} | `MATCH` / `DEVIATION` / `N/A` |

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

Evaluating code, refactor, test, abstraction, ask: **does this make the next change cheaper or more expensive?**

- Reject "best practices" raising change cost — premature abstraction, speculative generality, leaky indirection, ceremony without payoff.
- Name the real enemies in findings: **coupling, hidden state, duplicated knowledge, unclear intent, irreversible decisions exposed too early**.
- A simpler design that is easy to change beats a sophisticated one that is not.

Apply this lens **before** any rule, pattern, or checklist below — a downstream rule that raises change cost LOSES to this principle.

---

## Adversarial Review Mindset (NON-NEGOTIABLE)

**Default stance: SKEPTIC, not validator. Your job is to find what cannot work, not confirm what looks right.**

> **Confirmation bias trap:** After reading a well-structured plan, AI naturally finds reasons to agree. This section exists to break that loop before it produces a rubber-stamp approval.

### Adversarial Techniques (apply ALL before concluding)

> Techniques 1-6 stress **whether the plan can be built** (reality, effort, scope, dependencies). Techniques 7-10 stress **whether the chosen design is the right one** — the decision-quality lens OWNED by the unconditional `$why-review` rationale sub-agent in the **Parallel Review Wave**. The core pass applies 1-6 and 11 itself and merges the why-review member's 7-10 results; it applies 7-10 inline ONLY under the wave's failed-member or no-fan-out fallback. Both groups must be satisfied before any verdict: a buildable plan built on the wrong decision is still a failed plan.

**1. Implementation Reality Check**
Per phase: _"a developer starts implementing this right now — what breaks FIRST?"_ Walk the critical path concretely. A vague phase ("implement the service layer") untraceable to specific files/classes FAILS.

**2. Assumption Stress Test**
List the top 3 implicit assumptions; per assumption: _"what if it is wrong?"_ A valid plan survives 2 of 3 being false. Usual hidden ones: existing code is in a known state · no external API changes · team already has this domain knowledge.

**3. Effort Reality Check**
Per estimated phase: _"has similar work in THIS codebase shipped in that timeframe, and what slowed it last time?"_ Underestimating by 2x or more makes it an optimistic guess, NOT a valid plan.

**4. Pre-Mortem**
Assume the plan shipped exactly as written and the feature has been in production a month. Write ONE concrete, plausible failure scenario. Finding none means you have not looked hard enough.

**5. Scope Creep Detector**
Flag any task NOT directly required to deliver the stated feature. "While we're here, let's also refactor X" is scope creep.

**6. Dependency Blindspot**
List 2-3 external dependencies (services, APIs, data sources) the plan assumes stable; per one: _"what breaks here if it changes or goes away?"_ A dependency failure addressed nowhere is a risk gap.

**7. Steel-Man the Rejected Alternative**
Per design decision choosing X over an alternative, argue FOR the rejected one as strongly as possible. Would a 10-year domain senior pick it? If yes, dismissal needs proof stronger than "we picked X" — why: a decision that never names what it rejected was assumed, not made.

**8. Why NOT?**
Per "chose X because Y", ask what X *sacrifices*. A plan listing only upsides is hiding the trade-off, not avoiding it. Demand the named downside.

**9. Unseen Alternatives**
Name 1-2 viable approaches the plan never mentions. An alternative absent without exclusion reasoning is weak coverage, NOT a settled decision.

**10. Pros/Cons Symmetry**
Count stated pros vs cons on the chosen approach. Pros outnumbering cons by more than 2:1 signals confirmation bias — demand the missing downsides before accepting.

**11. Contrarian Pass**
Before ANY verdict, write ≥2 sentences arguing the OPPOSITE. About to write PASS → argue NEEDS WORK, and vice versa. Then pick the stronger argument on evidence.

### Forbidden Patterns

- **"Structure looks good"** → Structure is NOT quality. Can it be implemented?
- **"Phases are well-defined"** → Presence of phases is NOT correctness. What's in them?
- **"Alternatives were considered"** → Were they real alternatives or strawmen set up to fail?
- **"Risk is managed"** → Mitigation of "monitor closely" is NOT a mitigation. What action, by whom, triggered by what?
- **"Looks achievable"** without tracing the critical path → Not a valid assessment.

### Anti-Bias Gate (MANDATORY before finalizing verdict)

Complete ALL checks before writing the final verdict (MUST ATTENTION):

- run Implementation Reality Check on the highest-risk phase
- identify 3 implicit assumptions and stress-test them
- check effort estimates against codebase complexity
- run pre-mortem (one concrete production failure scenario)
- scan for scope creep (tasks not required for stated feature)
- verify dependency blindspots are addressed
- steel-man at least one rejected design alternative (argue FOR it) — satisfied by the merged why-review wave report
- name at least 1 viable alternative the plan does not mention — satisfied by the merged why-review wave report
- check pros/cons symmetry on the plan's primary design decision — satisfied by the merged why-review wave report

The first six checks are the core pass's own work. The last three close ONLY on the merged why-review sub-agent report for the current round; confirm that report covers each one. A missing, failed, or silent why-review return leaves them incomplete — re-dispatch the sub-agent or run the rationale lens inline per the wave protocol, never a silent PASS.

If any check is incomplete → you have NOT completed the adversarial review. Go back.

> **Why-review relationship — three roles, none collapsed:**
>
> 1. **Core plan-review pass** (inline in round 1, fresh sub-agent from round 2) — *can the plan be built?* Techniques 1-6 + 11, Anti-Bias Gate items 1-6, all checklists and dimensions.
> 2. **Parallel rationale review** — an unconditional full-mode `$why-review` sub-agent in the SAME wave, every round — *is the plan's design the right one?* Techniques 7-10, Anti-Bias Gate items 7-9, and Trade-Off Interrogation over `plan.md` / `goal.md` / `phase-*.md`. Its findings merge before scoring.
> 3. **Findings validation after the merge** — `$why-review --validate-findings` over the MERGED report (core + why-review + specialist) before any plan edit — *are the findings themselves correct?*
>
> Roles 2 and 3 invoke the same skill for different targets: role 2 reviews the PLAN and runs in parallel; role 3 validates the FINDINGS and is sequential. Neither substitutes for the other.

## Plan Dimension Thinking Framework

After plan-type detection (Phase 0), evaluate each dimension below using this reasoning pattern:

> **For each dimension:** (1) Understand its role in the plan's domain, (2) Read the plan's claims about it, (3) Derive the actual concerns from first principles — what could go wrong if this dimension is weak? (4) Apply your knowledge of the plan's tech stack to find stack-specific gaps.

### Dimension 0: Applicability and Plan Gate

**Think:** Is this plan preserving the owning artifact's selected slice, explicit roadmap milestone, framework technical outcome, or EXEMPT boundary without quietly making product decisions that belong to the owner?

- Read `.claude/skills/shared/product-roadmap-contract.md` and classify roadmap applicability before reviewing implementation detail.
- For embedded plans, require the complete `large_idea_decomposition` block whenever any signal is true, stable slice IDs, explicit non-goals/deferred owners, and conditional scenario evidence when the selected slice needs it. Do not require the product roadmap (default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path) or a product milestone.
- For explicit-roadmap plans, require the product roadmap (default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path), one approved milestone, a matching scope brief, `scenario-analysis.md`, explicit non-goals, defined lifecycle terms, and a `## Plan Gate` in `plan.md`.
- For framework/library plans, require the technical scope brief, operational scenario/evidence chain, generated-carrier parity, commands, and `FRAMEWORK-LIBRARY` gate. For EXEMPT plans, require the explicit reason/owner and matching branch.
- The gate must show the applicable decision state, known or explicitly inapplicable project skeleton/configuration, build/test/run commands, a redacted evidence plan, and `Human approval: APPROVED`. `BLOCKED`, `OPEN`, `MISSING`, or `REQUIRED` is a finding that blocks PASS.
- Check that every phase maps to the selected slice/outcome or technical/EXEMPT boundary, scenario/invariant proof, and non-goal boundary. A phase that introduces deferred capability is scope creep even if its code is technically useful.
- For an isolated brownfield change, require the shared contract's EXEMPT branch: an explicit reason and accepting owner in the scope brief and plan, a matching sibling scenario artifact, `Roadmap: EXEMPT`, `Milestone: EXEMPT`, explicit `N/A` product-decision rationale, known commands/evidence, and human approval. The exemption does not waive existing spec/test/review gates and is not a substitute for a missing roadmap on applicable work.

### Dimension 1: Scope Integrity

**Think:** Does the plan's scope match the stated goal exactly — not broader, not narrower?

- What's the minimal set of changes needed to deliver the stated goal?
- What does the plan add that's NOT in the goal? → Scope creep.
- What's in the goal that the plan doesn't address? → Scope gap.
- Stress test: "If we skip phase X, does the feature still work?" → If yes, that phase is out of scope.

### Dimension 2: Data Flow Correctness

**Think:** Can I trace how data moves through every phase of this plan?

- Where does data originate? Where does it end up?
- What transforms it in between? Are those transforms described in the plan?
- What happens to data at system boundaries (API, message bus, storage, UI)? Does the plan address each boundary?
- What data states are invalid? Does the plan guard against them?

### Dimension 3: Dependency Chain Completeness

**Think:** Does the plan account for everything its changes affect?

- Every file/module the plan touches: what imports it? what calls it? what depends on its contract?
- If the plan changes an interface/contract, are ALL consumers listed?
- External dependencies (third-party services, shared infra): are they stable? If they break, what's the fallback?
- Run graph trace if graph.db exists — compare plan's file list against downstream impact.

### Dimension 4: Failure Mode Coverage

**Think:** What does the plan say about when things go wrong?

- For each external call, async operation, or state change: what's the error behavior?
- Does the plan include a rollback strategy for irreversible operations?
- What's the partial failure state? (half-migrated, half-deployed, race condition) Is it addressable?
- Is there a monitoring/alerting plan for the new code paths?

### Dimension 5: Test Observability

**Think:** How will a developer know if this plan's implementation is correct?

- Can the stated acceptance criteria be mechanically verified by a test?
- Are there behaviors that are only observable via logs/traces (not unit tests)?
- Which phase introduces the risk? Does a test exist in that phase?
- "Tests pass" is NOT a success criterion — name the specific behaviors being tested.
- **Spec-Loop scheduling (test-quality gate).** The plan MUST schedule the spec-loop, not just "add tests": (1) every `[HARD]` §4 rule / §5 invariant gets a universally-quantified **property test spec** plus a boundary counter-case — not example tests only; (2) changed core logic is gated by a **MUTATION-SCORE** quality bar (a surviving mutant = a missing invariant ⇒ a killing test owed), NOT a line-coverage % target; (3) a **dual-feedback + re-review step** exists so each behavior-changing finding enriches BOTH the spec AND the tests and the package is re-reviewed to zero new gaps. **FAIL** a plan that targets a line-coverage % instead of a mutation-score bar, or that omits property/invariant test specs for its `[HARD]`/§5 rules.

### Dimension 6: Knowledge Prerequisites

**Think:** Does implementing this plan require knowledge the plan doesn't surface?

- Domain knowledge: Are business rules spelled out, or does the implementer need to already know them?
- System knowledge: Are integration points documented, or does the implementer need tribal knowledge?
- Tooling knowledge: Does the plan assume setup steps that aren't listed?
- If any prerequisite is unstated → the plan is not implementation-ready.

### Dimension 7: Estimation Drift

**Think:** Does the frontmatter estimation still match the finalized plan, or did scope-locking change the cost?

- Pre-completion estimates anchor on rough scope guesses; finalized phases reveal true cost. Re-derive `bottom_up_hours = Σ phase_hours` from each phase file's locked tasks/TCs and compare to current frontmatter `man_days_traditional` / `story_points`.
- Recompute `likely_days`, `risk_margin_pct`, `min-max range` per `SYNC:estimation-framework`. Did unknowns resolve (margin should drop) or new risks surface (margin should rise)?
- If `|delta| > 20%` → frontmatter MUST be updated with `reestimate_delta_pct: <signed>` + 1-line `reestimate_reason`. Missing update = FAIL.
- If `|delta| > 50%` → flag `SHOULD-RESCOPE` in review verdict; the plan must surface the rescope decision to the user before implementation begins.
- Watch for hidden inflation: phases added during planning, TCs not counted in original estimate, integration work discovered late.

### Dimension 8: Domain Entity Design (CONDITIONAL — fires when the plan touches an entity, VO, or aggregate)

**Think:** Does the plan actually decide the domain model, or does it defer the hard parts to implementation?

Apply `SYNC:domain-entity-change-gate` (inlined below) — the SAME protocol `$plan` authored under and `$changes-review` will review under, whose A–P checklist `$domain-entities-review` owns. State `No domain-entity surface — Dimension 8 N/A` when it does not fire.

- An **unanswered, hand-waved, or deferred-to-implementation** decision point is a FINDING with `file:line` into the plan. The word "entity" appearing in a task is NEVER an answer.
- MUST ATTENTION verify the plan states **paradigm** and **subdomain fit** before any entity task — a plan proposing a rich domain model for a CRUD subdomain is a FINDING (ceremony with no invariant to protect), and so is a plan proposing setter/encapsulation tasks against an immutable or event-sourced model.
- Check each triggered row names its **owning file**, not just an intent: classification · invariant ownership + failure signalling · aggregate boundary + concurrency · construction vs reconstitution · events · property-TC test obligation.
- Highest-yield misses: an aggregate boundary chosen by UI screen or DB table rather than by true invariant · cross-aggregate references planned as object navigation · no concurrency token on a contended root · a set-based invariant ("unique email") with no enforcing mechanism · invariants planned into a validator/handler instead of the entity · events planned with no dispatch timing.
- Steel-man the plan's boundary choice before flagging it — a deliberately larger aggregate protecting a real always-consistent invariant is CORRECT; demand the invariant, not a smaller boundary.

### Dimension 9: Conditional Project Pattern Alignment

**Think:** Does the plan use the repository's actual guidance for the affected scope, or does it import a generic pattern from memory?

- Derive triggers from the planned file/module list and `docs/project-config.json`, not from the plan title alone.
- Always require `code-review-rules.md` from the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path); require `frontend-patterns-reference.md` for frontend/UI scope and `backend-patterns-reference.md` for backend/hook scope. If both trigger, both are required. A reference that explicitly says the surface is N/A is evidence, not a missing example.
- Verify each `## Project Convention Alignment` row against the exact documented section and, when implementation code exists, the cited context-fit source example(s). Use at least 3 comparable source patterns when 3 exist; otherwise require all available examples plus a scarcity/N/A reason. Do not require a separate project-reference example-code file.
- Missing/undetected triggers, unread or stale required docs, dead citations, generic-only justification, or unexplained deviation is a Required-check finding. Record `Dimension 9 N/A` only when the plan has no triggered implementation surface and says why.

**Use these dimensions to generate targeted, evidence-backed questions — not generic "add more detail" suggestions.**

---

## Your mission

Self-review the implementation plan — valid, correct, best-practice — and surface everything needing a fix BEFORE implementation proceeds.

**Key distinction:** AI self-review (automatic), NOT a user interview like `$plan-validate`.

## Plan Resolution

1. `$ARGUMENTS` provided → use that path
2. Else `## Plan Context` section → use the active plan path
3. No plan found → error: "No plan to review. Run $plan first."

## Workflow

### Phase 0: Detect Plan Type

Before ANY checklist, read `plan.md` and classify the plan — why: the type decides the sub-agent, the emphasis, and whether the Behavioral Delta Matrix is mandatory:

| Signal in plan                                               | Type                      | Additional review focus                                                                     |
| ------------------------------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------- |
| "fix", "bug", "regression", "defect" in title/description    | **Bugfix**                | Behavioral Delta Matrix (MANDATORY), preservation inventory, regression tests               |
| "migrate", "schema", "database", "index"                     | **Data/Schema**           | Rollback path, zero-downtime strategy, data preservation, migration idempotency             |
| "auth", "permission", "security", "encrypt", "token", "RBAC" | **Security**              | Threat modeling, attack surface, trust boundary changes, sub-agent: `security-auditor`      |
| "performance", "latency", "cache", "N+1", "throughput"       | **Performance**           | Baseline metrics, regression risk, measurement strategy, sub-agent: `performance-optimizer` |
| "refactor", "extract", "rename", "restructure"               | **Refactor**              | Behavior preservation, blast radius, dangling references                                    |
| "API", "contract", "endpoint", "consumer", "event"           | **Contract/Integration**  | Backward compatibility, consumer impact, versioning strategy                                |
| "infra", "CI", "pipeline", "deploy"                          | **Infrastructure/DevOps** | Rollback plan, environment parity, secrets handling                                         |
| None of the above                                            | **Feature**               | Standard checklist, acceptance criteria mapping, YAGNI                                      |

**If multiple signals match**, list all types and apply ALL their focus areas.

**Plan type drives:**

- Which sub-agent type to use (see "Subagent Type Selection" below, under `SYNC:review-protocol-injection`)
- Which sections of the Adversarial Review Mindset to emphasize
- Whether Behavioral Delta Matrix is mandatory (bugfix only)

---

### Step 1: Read Plan Files

Read the plan directory:

- `plan.md` - Overview, phases list, frontmatter
- `goal.md` - Goal Contract (when present): Original Request, Purpose, Success Criteria (required vs optional), Constraints
- `phase-*.md` - All phase files
- Extract: requirements, implementation steps, file listings, risks, `Reference docs read:`, `## Project Convention Alignment`, and every phase's `## Convention Alignment` evidence

If `{plan-dir}/goal.md` is missing, resolve `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md` (plans root default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` wins, else `.ck.json` `paths.plans`); if no Goal Contract exists at all, record `No active goal — plan reviewed against plan.md requirements only.`

### Step 2: Evaluate Against Checklist

**Dispatch the Parallel Review Wave FIRST** — in ONE message spawn the unconditional `$why-review` rationale sub-agent and every triggered Impact-Aware lens sub-agent, then work through the checklists below inline while they run (round 1). Do not start Step 3 until every wave member has returned and its report is merged.

#### Validity (Required - all must pass)

| #   | Check                                                               | Presence                           | Quality Depth                                                                     |
| --- | ------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------- |
| 1   | **Has executive summary** — clear 1-2 sentence description          | Does a summary section exist?      | Is it accurate? Does it scope the work or conceal complexity?                     |
| 2   | **Has defined requirements section** — explicit requirements listed | Does a requirements section exist? | Are requirements concrete user needs or vague technical goals?                    |
| 3   | **Has implementation steps** — actionable tasks                     | Are implementation steps present?  | Are steps specific (file names, method names) or vague actions?                   |
| 4   | **Has files to create/modify listing** — file inventory present     | Is a file listing present?         | Are file paths real (verified via glob/grep)? Do they follow project conventions? |

#### Correctness (Required - all must pass)

- [ ] **Granularity Gate — "Detailed & Small Enough"** — FAIL if ANY phase fails ANY criterion below. A plan you can't immediately code from is NOT ready.

**Decision tree — apply to EACH phase:**

```
Phase too vague? (no file paths, planning verbs, unclear actions)
  → YES → DETAIL IT: add specific file paths, exact method names, concrete actions
  → NO ↓
Phase too big? (>5 files OR >3h effort OR single step is a mini-project)
  → YES → BREAK IT: split into smaller sibling phases until each meets limits
  → NO → PASS this phase
```

**5-Point Criteria (all must pass per phase):**

| #   | Criterion                 | PASS example                    | FAIL example                       |
| --- | ------------------------- | ------------------------------- | ---------------------------------- |
| 1   | Steps name specific files | "Modify `{source-root}/auth/login`" | "Implement authentication"         |
| 2   | No planning verbs         | "Add `validateToken()` method"  | "Determine the best auth approach" |
| 3   | Each step ≤30 min effort  | "Add error handler to endpoint" | "Build the entire auth module"     |
| 4   | Phase ≤5 files AND ≤3h    | 3 files, 2h                     | 12 files, 8h                       |
| 5   | No unresolved decisions   | All approaches decided          | "TBD: which library to use"        |

**Planning verbs that trigger FAIL:** "research", "determine", "figure out", "decide", "evaluate", "explore", "investigate" — these belong in investigation, not implementation plans.

**Action on failure (after Findings Validation Gate passes):**

Do not apply these refinements until `$why-review --validate-findings` returns CLEAN for the current plan-review report.

- **Too vague** → Refine in-place: expand steps with file paths, method names, concrete actions
- **Too big (≤9 files)** → Split phase into sibling phases (Phase 2A, 2B, 2C)
- **Too big (10+ files)** → Create sub-plan: `{plan-dir}/sub-plans/phase-{XX}-{name}/plan.md` — nested under `{plan-dir}`, which has already resolved the plans root (default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` wins, else `.ck.json` `paths.plans`)

**Worked example:**
FAILS: `"Phase 2: Data Layer — Set up database models, Create repositories, Implement data access patterns. Effort: 4h, Files: ~8"`
PASSES after split: `"Phase 2A: Data Schema (1h, 3 files) — Create {source-root}/models/user-entity, Create {source-root}/models/session-entity, Create {migration-root}/create-users-sessions"` + `"Phase 2B: Repository Layer (1.5h, 3 files) — Create {source-root}/repositories/user-repository, Create {source-root}/repositories/session-repository, Register in {composition-root}"`

- [ ] File paths follow project patterns
- [ ] No conflicting or duplicate steps
- [ ] Dependencies between steps are clear
- [ ] **Anti-Hallucination & Code-Proof Gate** — FAIL if ANY plan claim about existing source code lacks `file:line` proof.

| Claim type             | Required proof                    |
| ---------------------- | --------------------------------- |
| File path              | File exists (glob/read)           |
| Class/method name      | Symbol grep → `file:line`         |
| Behavior ("X calls Y") | Code evidence `file:line`         |
| Base class / interface | Inheritance verified (grep/graph) |

**FAIL triggers:** unread file paths, ungrepped method names, "should be"/"probably"/"typically" language about existing code, behaviors assumed from similar projects instead of THIS codebase. Greenfield-only plans (no existing code refs) → PASS.

- [ ] **New Tech/Lib Gate:** If plan introduces new packages/libraries/frameworks not in the project, verify alternatives were evaluated (top 3 compared) and user confirmed the choice. FAIL if new tech is added without evaluation.
- [ ] **Conditional Project Pattern Alignment Gate:** Verify `docs/project-config.json`/docs-index routing, always `code-review-rules.md`, and the frontend/backend pattern reference(s) triggered by the plan. Check every major plan decision against the matrix and inspect source examples when implementation code exists (≥3 per decision when 3 exist, otherwise explicit scarcity/N/A). Missing/stale/generic-only/contradictory evidence or an unexplained deviation = FAIL.
- [ ] **Test spec coverage** — Every phase has `## Test Specifications` section with TC mappings. "TBD" is valid for TDD-first mode.
- [ ] **TC-requirement mapping** — Every functional requirement maps to ≥1 TC (or explicit "TBD" with rationale)
- [ ] **Behavior preservation** — Behavior-changing phases name expected behavior, unchanged behavior to preserve, and TC/test proof.
- [ ] **Docs/spec/test sync** — Relevant phases include canonical spec/doc/test updates or explicit N/A evidence.
- [ ] **Artifact freshness** — AI-extracted specs/TCs are marked reference-only until accepted; generated mirror sync is included for shared workflow/skill/tooling changes.
- [ ] **Goal Contract mapping** — When an active `goal.md` exists: every saved required success criterion is covered by ≥1 phase, and each phase's success criteria trace to saved criteria (or are marked supporting work with reason). FAIL if a saved required criterion has no covering phase, or the plan delivers work the Goal Contract never asked for without recorded justification. Skip with `No active goal` evidence when no Goal Contract exists.

#### Best Practices (Required - all must pass)

| #   | Check                                                            | Presence                                                        | Quality Depth                                                                                                                           |
| --- | ---------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **YAGNI** — No unnecessary features or over-engineering          | Is every planned component traceable to a stated requirement?   | Flag anything described as "might be useful" or added for future flexibility without a current requirement.                             |
| 2   | **KISS** — Simplest viable solution chosen                       | Is there a stated approach for each major step?                 | Could any planned abstraction be simpler with the same effect? Are there unnecessary layers, indirections, or framework choices?        |
| 3   | **DRY** — No planned duplication of logic                        | Are there similar patterns described more than once?            | Does the plan introduce new patterns when existing ones work? Are there repeated steps that suggest duplication at implementation time? |
| 4   | **Architecture** — Follows project patterns from `.claude/docs/` and triggered reference-docs (default root `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it) | Does the plan reference and align with local guidance? | Does it follow established patterns and applicable source examples, or deviate with explicit evidence/rationale?                              |
| 5   | **Purpose-oriented contracts** — Names describe capability/domain purpose | Does every planned public or cross-layer abstraction have a semantic name? | Does the plan leak a provider/framework/transport into a caller-facing contract, use a misleadingly broad name, or add an interface without boundary/substitution rationale? |

#### Completeness (Recommended - ≥50% should pass)

| #   | Check                                                                          | Presence                                                                                 | Quality Depth                                                                                                                      |
| --- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Risk assessment present with mitigations** — risks identified with responses | Is there a risk section with at least one item?                                          | Are mitigations specific actions (who, when, triggered by what) or vague intentions ("monitor closely")?                           |
| 2   | **Testing strategy defined** — test approach outlined                          | Is there a testing section or test references per phase?                                 | Does it cover unit, integration, and edge case paths, or just "write tests"? Is the approach traceable to acceptance criteria?     |
| 3   | **Success criteria per phase** — measurable outcomes defined                   | Does each phase have stated success criteria?                                            | Are criteria measurable? Would failing them trigger a rollback, or are they aspirational targets?                                  |
| 4   | **Security considerations addressed** — security concerns noted                | Is there a security section or inline security notes?                                    | Are security concerns specific to this feature's attack surface, or generic boilerplate (e.g., "use HTTPS", "validate inputs")?    |
| 5   | **Graph dependency check** — importers of modified files are checked           | If `.code-graph/graph.db` exists: are `importers_of` queries run for each modified file? | Are ALL importers checked, not just direct callers? Is the graph.db prerequisite explicitly stated? Are missed dependents flagged? |

### Step 3: Score and Classify

Score the MERGED finding set only — core pass + why-review rationale report + every triggered lens report. A Required check that a why-review or lens finding invalidates fails here exactly as a core finding would.

| Status   | Criteria                            | Action                            |
| -------- | ----------------------------------- | --------------------------------- |
| **PASS** | All Required pass, ≥50% Recommended | Proceed to implementation         |
| **WARN** | All Required pass, <50% Recommended | Proceed with caution, note gaps   |
| **FAIL** | Any Required check fails            | STOP - must fix before proceeding |

### Step 4: Output Result

```markdown
## Plan Review Result

**Status:** PASS | WARN | FAIL
**Reviewed:** {plan-path}
**Date:** {current-date}

### Summary

{1-2 sentence summary of plan quality}

### Checks Passed ({X}/{Y})

#### Required ({X}/{Y})

- ✅ Check 1
- ✅ Check 2
- ❌ Check 3 (if failed)

#### Recommended ({X}/{Y})

- ✅ Check 1
- ⚠️ Check 2 (missing)

### Issues Found

- ❌ FAIL: {critical issue requiring fix}
- ⚠️ WARN: {minor issue, can proceed}

### Recommendations

1. {specific fix 1}
2. {specific fix 2}

### Verdict

{PROCEED | REVISE_FIRST | BLOCKED}
```

### Graph-Trace for Plan Coverage

When graph DB is available, verify the plan covers all affected files:

- For each file in the plan's "files to modify" list, run `python .claude/scripts/code_graph trace <file> --direction downstream --json`
- Flag any downstream file NOT listed in the plan as "potentially missed"
- This catches cross-service impact (MESSAGE_BUS consumers, event handlers) that the plan author may have overlooked

## Recursive Fix-and-Review Protocol (CRITICAL)

> **Protocol:** `OVERRIDE:double-round-trip-review` + `OVERRIDE:fresh-context-review` + `OVERRIDE:review-policy` + `SYNC:review-protocol-injection` (all inlined in this file), plus the carrier-local scope note on `SYNC:severity-rubric`. All THREE OVERRIDE blocks replace their canonical counterparts on ONE point only — plan-review's round cap is a HARD 2 with no extension round — and the severity-rubric scope note marks that block's two round-3-extension clauses inert for the same reason. Canonical grants a conditional round-3 extension to the carriers that honor it; plan-review does not, and `review-policy.cjs` cannot express that cap (its only caller-settable value, `minRounds`, may not exceed 2), so the cap is enforced by this skill rather than by the helper.

When the review results in **FAIL, WARN, or any non-zero findings**, plan-review MUST run the Findings Validation Gate before editing any plan file. Only findings validated by `$why-review --validate-findings` may be fixed. After fixing validated actionable findings, rerun the full plan-review protocol from the first review step over the current plan. Do not spawn a fresh sub-agent just to re-review known findings before fixing them. The restarted full review is a full **Parallel Review Wave**: the core pass as a fresh sub-agent using the canonical Agent template from `SYNC:review-protocol-injection` below, dispatched in the SAME message as a NEW `$why-review` rationale sub-agent and every triggered lens sub-agent — each re-reads ALL plan files from scratch with ZERO memory of prior fixes.

## Findings Validation Gate (MANDATORY before fixing plan findings)

Trigger this gate whenever the plan-review output contains **any finding**: FAIL, WARN, recommendation requiring a plan edit, missing evidence, unresolved risk, or implementation-blocking ambiguity. Skip this gate only when the completed review pass has zero findings — or, from round 2, when its only validated findings are LOW (record them as deferred and PASS).

1. Finalize the MERGED plan-review report — core, why-review rationale, and specialist lens findings from the completed wave — with every finding and enough evidence for another reviewer to validate it.
2. Call `$why-review --validate-findings` against that report in the main review flow before editing plan files.
3. If why-review returns CLEAN, fix only the validated actionable findings at the smallest responsible plan location.
4. If why-review challenges, rejects, or narrows findings, reconcile the plan-review report first, then rerun `$why-review --validate-findings` before any fix.
5. If a finding is valid but needs product/owner judgment, stop and ask the user instead of editing around the uncertainty.

**NEVER edit `plan.md` or `phase-*.md` to fix review findings before this gate passes.** This gate validates findings; the fresh full plan-review happens only after the validated fix cycle.

**When constructing the Agent call prompt for Round N (N≥2):**

1. Copy the Agent call shape from the `SYNC:review-protocol-injection` template verbatim
2. Use `agent_type: "general-purpose"` (this is a plan review, not a code review)
3. Embed the full verbatim body of these SYNC blocks (inlined above in this skill file): `SYNC:evidence-based-reasoning`, `SYNC:rationalization-prevention`, `SYNC:graph-assisted-investigation`, `SYNC:understand-code-first` (omit code-specific protocols like `SYNC:bug-detection`, `SYNC:test-spec-verification` which are not applicable to plan files)
4. Set the Task as `"Review plan files under {plan-dir}. Validate structural completeness, code-proof anti-hallucination (every file:line claim about existing source code must exist), and adversarial simulation (imagine implementing each phase right now — what fails first?) using Adversarial Techniques 1-6 + 11. The design-rationale lens (Techniques 7-10) is owned by a parallel $why-review sub-agent — do not duplicate it."`
5. Set Target Files as `"read plan.md and all phase-*.md files under {plan-dir}"`
6. Set report path as `tmp/reports/plan-review-round{N}-{date}.md`
7. **In the SAME message**, spawn a NEW `$why-review` rationale sub-agent per the **Parallel Review Wave** brief (report `tmp/reports/plan-review-why-review-round{N}-{date}.md`) and a NEW sub-agent for every triggered Impact-Aware lens — NEVER reuse a prior round's agents, NEVER omit the why-review member.

After ALL wave members return (all-return barrier):

1. **Read** every wave report — core, why-review rationale, and each lens
2. **Integrate** findings as `## Re-Review {N} Findings`, `## Re-Review {N} Why-Review Rationale Findings`, and `## Re-Review {N} Specialist Lens Findings` in the main report — DO NOT filter or override; ask any returned UNANSWERED Trade-Off / owner-judgment questions by asking the user directly before the verdict
3. **If the current round has blocking findings:** run the Findings Validation Gate, fix only validated actionable findings in plan files, then restart the full plan-review protocol from the first review step. Round 2 LOW-only findings are recorded as deferred and do not trigger a restart.
4. **Repeated blocker cap:** if the same blocker repeats across 2 full invocations with no progress, escalate by asking the user directly
5. **Final verdict** must incorporate findings from ALL review passes that actually ran

### Flow

```
┌──────────────────────────────────────────┐
│  Round 1: PARALLEL REVIEW WAVE (1 msg)   │
│  • core checklist pass — INLINE          │
│  • $why-review rationale — sub-agent,    │
│    ALWAYS (Techniques 7-10)              │
│  • each triggered lens — sub-agent       │
│  ALL-RETURN BARRIER → merge reports      │
│  → Anti-Bias Gate → PASS / WARN / FAIL   │
└──────────────┬───────────────────────────┘
               │
        ┌──────▼──────┐
        │ ZERO        │
        │ FINDINGS?   │──YES──→ Proceed to next workflow step
        └──────┬──────┘
               │ NO
        ┌──────▼──────────────────────────────────┐
        │  VALIDATE: Run $why-review              │
        │  --validate-findings on the MERGED      │
        │  report. Only validated findings may    │
        │  be fixed.                              │
        └──────┬──────────────────────────────────┘
               │
        ┌──────▼──────────────────────────────────┐
        │  FIX: Modify plan files to resolve       │
        │  validated actionable findings           │
        │  (plan.md/phase-*)                       │
        └──────┬──────────────────────────────────┘
               │
        ┌──────▼──────────────────────────────────┐
        │  Round 2: FULL RE-REVIEW WAVE (1 msg)   │
        │  NEW fresh core sub-agent + NEW         │
        │  $why-review rationale sub-agent +      │
        │  NEW triggered lens sub-agents, from    │
        │  the first review step; ALL-RETURN      │
        │  barrier → merge → verdict.             │
        └──────┬──────────────────────────────────┘
               │
               └──→ Loop ENDS at round 2 — bar clear (zero findings round 1; zero CRITICAL/HIGH/MEDIUM round 2), repeated-blocker rule, or the HARD round cap of 2 (no extension; still blocking at round 2 → ask the user directly). There is NO round 3 for review blockers — only a failing TEST gate continues past round 2, and that is outside the round budget.
```

### Iteration Rules

1. **Repeated blocker cap** — continue until a complete full review pass clears the round's bar (zero findings in round 1; zero CRITICAL/HIGH/MEDIUM from round 2, LOW-only ends it); if the same blocker repeats across 2 full invocations with no progress, STOP and escalate to user by asking the user directly
2. **Track round count** — log "Plan review Round N (full re-review)" at the start of each cycle. **N NEVER exceeds 2 for review rounds**: round 1 is the initial review, round 2 is the single re-review after fixes. Reaching the end of round 2 with any validated blocking finding open is an escalation, not a round 3. A test-green continuation (failing TEST gates as the sole blocker) may log rounds past 2 — it is outside the review budget and must be labelled as such, never used to re-open review findings.
3. **Current-bar clear = exit** — proceed when a complete plan-review pass has zero findings in round 1, or zero CRITICAL/HIGH/MEDIUM from round 2 onward with LOWs recorded as deferred. WARN remains blocking when it represents a CRITICAL/HIGH/MEDIUM consequence; a LOW WARN is non-blocking from round 2 onward but must remain visible.
4. **Diminishing scope** — each round should find FEWER issues. If Round N finds MORE than Round N-1, STOP and escalate
5. **Fix scope** — fix only why-review-validated actionable findings at the smallest responsible plan location. Do NOT rewrite the plan.
6. **Fix approach:**
    - Vague steps → expand with specific file paths, concrete actions
    - Missing sections → add them (risks, testing strategy, success criteria)
    - Conflicting steps → resolve conflicts, document rationale
    - Over-engineering → simplify, remove unnecessary complexity
    - Missing TC mappings → add TC references or "TBD" with rationale
7. **After each validated fix cycle** — rerun the full plan-review protocol from the first review step as a full Parallel Review Wave; spawn NEW Agent calls for every member (core, `$why-review` rationale, triggered lenses) and never reuse prior agents
8. **No silent fallback** — if the same blocker repeats across 2 full invocations with no progress, escalate by asking the user directly. NEVER fall back to any prior protocol.

## Next Steps

- **If the current bar is clear** (PASS with zero findings in round 1, or from round 2 PASS with only deferred LOW findings listed): Announce "Plan review complete. Proceeding with next workflow step."
- **If WARN or other blocking findings remain**: Run the Findings Validation Gate; fix only validated actionable findings in plan files, or ask the user to explicitly accept non-actionable risk before proceeding. From Round 2 onward, LOW-only findings are deferred and do not trigger another loop.
- **If FAIL**: Run the Findings Validation Gate, fix only validated actionable findings that block the current round, then rerun the full plan-review protocol — but only while `round < 2`.
- **If the 2-round cap or the repeated blocker cap is reached**: List every remaining issue with `file:line` and severity. STOP. Ask the user to fix, accept, or regenerate the plan by asking the user directly. NEVER open a third round and NEVER pass instead.

## Important Notes

- Be constructive, not pedantic — focus on issues that would cause implementation problems
- WARN is not an automatic exit condition; fix it when actionable, or document explicit non-actionable acceptance before proceeding.
- FAIL remains for genuinely missing required content; lower-severity findings still remain tracked until resolved or explicitly accepted.
- **NEVER do a quick review** — even "simple" plans had 13 bugs in real testing. Always run the COMPLETE declared review protocol for every round you do run: never truncate a round, skip a wave member, or shortcut the checklist because the plan looks simple or because the round budget is nearly spent. The 2-round cap bounds how many rounds run; it never licenses a thinner round — and when round 2 ends with a blocker still open, the answer is escalation to the user, never a third round.

---

## Skill Interconnection (Standalone: MUST ATTENTION ask user by asking the user directly. Skip if inside workflow.)

**MANDATORY — NO EXCEPTIONS** after completing this skill, you MUST use ask the user directly to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"Proceed with full workflow (Recommended)"** — I'll detect the best workflow to continue from here (plan reviewed). This ensures validation, implementation, testing, and docs steps aren't skipped.
- **"$plan-validate"** — Interview user to confirm plan assumptions
- **"$feature-implement" or "$plan-execute"** — If plan is approved and ready for implementation
- **"Skip, continue manually"** — user decides

> **[BLOCKING]** This is a validation gate. MUST ATTENTION use ask the user directly to present review findings and get user confirmation. Completing without asking at least one question is a violation.

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI must ask user whether to skip.

> **Critical Purpose:** Ensure quality — no flaws, no bugs, no missing updates, no stale content. Verify both code AND documentation.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `tmp/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

> **OOP & DRY Enforcement:** MANDATORY — flag duplicated patterns that should be extracted to a base class, generic, or helper. Classes in the same group (same suffix, same lifecycle, same purpose) must share a common base (even if empty now — enables future shared logic and child overrides). Verify project has code linting/analyzer configured for the stack.

<!-- OVERRIDE:review-policy -->

<!-- Diverges from canonical `SYNC:review-policy` on ONE point only: the round budget.
     Canonical mandates the helper's `HARD_MAX_ROUNDS` of 3 and its conditional round-3 extension
     (`extensionGranted`); plan-review's budget is a HARD 2 with NO extension. The helper exposes no
     caller-declarable maximum — the only caller-settable value is `minRounds`, which may not exceed
     the base budget of 2 — so plan-review's cap is NOT expressible through the mandated executable
     and is stated here instead (see `OVERRIDE:fresh-context-review` and
     `OVERRIDE:double-round-trip-review` below, which narrow the same budget, plus the scope note on
     `SYNC:severity-rubric`). The helper remains the durable bookkeeping record; plan-review simply
     refuses the extension it may grant.
     Everything else in this block — the predicate, the severity floor, the durable run record and
     the CLI boundary — is the canonical body, BYTE-EXACT. The block is four blockquote paragraphs;
     only the second ("Round and minimum rules") diverges. The other three are pinned against
     canonical by `TC-HARNESS-006: plan-review declares its review-policy divergence`
     (`.claude/scripts/codex/tests/review-policy-consumers.test.mjs`), which fails when canonical
     moves — that test, not this comment, is what keeps the non-budget prose re-synced. Note that
     paragraphs 1 and 3 still describe the helper's `extensionGranted` and its round-3 extension:
     those are facts about the SHARED helper, true for every consumer. Deleting them here would be a
     second, undeclared divergence — plan-review REFUSES the extension the helper grants, it does not
     claim the helper stopped granting it. -->

> **Executable review policy — one predicate, one durable transition model.** Review skills and their tooling MUST use the canonical helper `.claude/scripts/lib/review-policy.cjs` (policy version 4) for round eligibility. The helper's `blockingFindings(round, findings, hardGates)` predicate returns every validated finding in round 1, and only CRITICAL/HIGH/MEDIUM findings from round 2 onward; `NOT VERIFIABLE` is a separate unresolved-evidence state that remains blocking at every round. Failed binary gates are synthetic CRITICAL blocking findings at every round; record a test-green gate with `kind: 'test'` and every other gate with `kind: 'binary'` (the default). `evaluateRound` retains floor-round LOWs in `deferredLow`, never treats a LOW-only round as blocked after the floor applies, reports `extensionGranted` plus an `ESCALATE` status when the review budget is spent with review blockers open, and reports `failingTestGates` / `testLoopContinues` when failing test gates keep the round open. Severity is assigned before the predicate and never changed to obtain a PASS.
>
> **Round and minimum rules — plan-review's budget is a HARD 2 with NO extension.** `MAX_ROUNDS` (the base budget) is 2 and it is the ONLY round ceiling that applies here: round 1 is the initial review, round 2 is the single re-review after the validated-fix cycle, and round 2 is the LAST review round. The helper's `HARD_MAX_ROUNDS` of 3 and its conditional extension are NOT honored by plan-review. **When the helper reports `extensionGranted` for an open round-2 CRITICAL/HIGH, plan-review does NOT take that round — it STOPS and escalates by asking the user directly**, listing every open finding with its `file:line`, severity, and confidence. Round 2 completing with ANY validated blocking finding still open — CRITICAL, HIGH, MEDIUM, or an unresolved `NOT VERIFIABLE` — escalates to the user; a failed non-test binary gate escalates the same way. No severity and no evidence buys a further review round. — why: a plan is cheap to regenerate and expensive to half-fix, so a plan still blocked after one full re-review needs an owner decision, not a third machine round. **Failing test gates stay outside the budget:** while failing `kind: 'test'` gates are the ONLY blockers, the run stays in `CONTINUE` and accepts the next round — past round 2 if needed — until the tests pass; they never earn an extension and never escalate for budget or no-progress. A review blocker open beside them still escalates. A clean review ENDS the loop once the persisted `minRounds` is met; the default minimum is 1 and an explicit `minRounds` may not exceed the budget of 2. The declaration is persisted and cannot be inferred from a round counter. A failing test-green, security-must-fix, required-artifact, or other binary gate is never waived by the severity floor.
>
> **Durable run record.** A review run MUST identify `runId`, target fingerprint, policy version, target revision, minimum/maximum rounds, completed rounds, full findings/gate evidence, interruption/resume metadata, and acceptance. Use the atomic, lock-serialized transitions in `review-policy.cjs`: `start`, `record`, `accept`, `interrupt`, `resume`, `invalidate`, and `check`. Repeating an identical completed round is idempotent and MUST NOT consume budget twice. A changed target fingerprint invalidates prior evidence and acceptance but MUST preserve the bounded round budget; stale evidence cannot be accepted. A policy-version change (including the round-2 LOW floor and the conditional round-3 extension) invalidates old records; start a new run rather than interpreting old evidence under new semantics. Interrupted/resumed runs retain completed rounds and findings. The record is bookkeeping, not consent, native permission, or proof that a host actually performed the review.
>
> **CLI boundary.** The helper CLI accepts JSON on stdin and uses its own real clock; a supplied `now` is rejected. State directories must be absolute, non-root real directories, records are size-bounded, and malformed/locked state fails closed for the transition. Full reports remain on disk; an inline result envelope is only a transport summary. Any new review policy consumer must add a semantic fixture, boundary counter-cases, a seeded mutant, and a report with the target fingerprint and command exit status.

<!-- /OVERRIDE:review-policy -->

<!-- SYNC:behavioral-delta-matrix -->

> **Behavioral Delta Matrix** — MANDATORY for bugfix reviews. Produce this table BEFORE PASS/FAIL verdict. Narrative descriptions don't substitute.
>
> | Input state | Pre-fix behavior   | Post-fix behavior | Delta                                |
> | ----------- | ------------------ | ----------------- | ------------------------------------ |
> | {condition} | {current behavior} | {fixed behavior}  | Preserved ✓ / Fixed ✓ / REGRESSION ✗ |
>
> **Rules:** ≥3 rows · ≥1 row the bug report did NOT mention · REGRESSION delta → FAIL until a preservation test covers it (`spec-tests-template.md#preservation-tests-mandatory-for-bugfix-specs`)
>
> **BLOCKED until:** ≥3 rows · ≥1 row outside bug report · no unmitigated REGRESSION

<!-- /SYNC:behavioral-delta-matrix -->

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation** — MANDATORY when `.code-graph/graph.db` exists.
>
> **HARD-GATE:** MUST ATTENTION run at least ONE graph command on key files before concluding any investigation.
>
> **Pattern:** Grep finds files → `trace --direction both` reveals full system flow → Grep verifies details
>
> | Task                | Minimum Graph Action                         |
> | ------------------- | -------------------------------------------- |
> | Investigation | `trace --direction both` on 2-3 entry files  |
> | Fix/Debug           | `callers_of` on buggy function + `tests_for` |
> | Feature/Enhancement | `connections` on files to be modified        |
> | Code Review         | `tests_for` on changed functions             |
> | Blast Radius        | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Use `--node-mode file` first (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->

<!-- SYNC:cross-service-check -->

> **Cross-Service Check** — Microservices/event-driven: MANDATORY before concluding investigation, plan, spec, or feature doc. Missing downstream consumer = silent regression.
>
> | Boundary            | Grep terms                                                                      |
> | ------------------- | ------------------------------------------------------------------------------- |
> | Event producers     | `Publish`, `Dispatch`, `Send`, `emit`, `EventBus`, `outbox`, `IntegrationEvent` |
> | Event consumers     | `Consumer`, `EventHandler`, `Subscribe`, `@EventListener`, `inbox`              |
> | Sagas/orchestration | `Saga`, `ProcessManager`, `Choreography`, `Workflow`, `Orchestrator`            |
> | Sync service calls  | HTTP/gRPC calls to/from other services                                          |
> | Shared contracts    | OpenAPI spec, proto, shared DTO — flag breaking changes                         |
> | Data ownership      | Other service reads/writes same table/collection → Shared-DB anti-pattern       |
>
> **Per touchpoint:** owner service · message name · consumers · risk (NONE / ADDITIVE / BREAKING).
>
> **BLOCKED until:** Producers scanned · Consumers scanned · Sagas checked · Contracts reviewed · Breaking-change risk flagged

<!-- /SYNC:cross-service-check -->

<!-- OVERRIDE:fresh-context-review -->

<!-- Diverges from canonical `SYNC:fresh-context-review` on ONE point only: the round budget.
     Canonical grants a conditional extension to round 3; plan-review's round cap is a HARD 2 with
     no extension (see `OVERRIDE:review-policy` above and `OVERRIDE:double-round-trip-review` below,
     which narrow the same budget, plus the scope note on `SYNC:severity-rubric`). Everything else in
     this block is the canonical body. Re-sync the non-budget prose by hand when canonical changes. -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable. A report-only/read-only reviewer never edits source, generated output, or user data: it validates and records the finding/repair handoff, then returns to the caller, which owns the fix and any re-review.
>
> **Why:** The main agent knows what it (or `$feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** After a validated-finding fix cycle, or to satisfy an explicitly declared independent-pass `minRounds`. A review round that finds zero issues ENDS the loop once that persisted minimum is met — do NOT invent a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `spawn_agent` tool calls — use `code-reviewer` agent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `tmp/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior full review found zero issues AND the persisted `minRounds` is met (no fixes or required independent pass = nothing new to verify)
> - NEVER skip the full review restart after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `spawn_agent` call
> - Continue until a complete full review pass clears that round's exit bar per `OVERRIDE:double-round-trip-review` below: **round 1** → zero findings at any severity; **round 2** → zero CRITICAL/HIGH/MEDIUM, so a round whose validated findings are ALL LOW ENDS the loop once the persisted minimum is met (list those LOWs as deferred instead of spawning another round). The budget is a **HARD 2 rounds with NO extension** — round 2 is the LAST review round, and any review blocker still open there ESCALATES by asking the user directly instead of opening a round 3. A failing test gate is not budgeted — keep fixing and re-running until the tests pass. If the same validated blocker repeats across 2 full invocations with no progress, escalate by asking the user directly. **Read-only/report-only role boundary:** when this block is carried by a security auditor or another report-only role, “fix” means return the validated repair proposal to the parent; do not modify source, generated carriers, or user data and do not restart the review locally.
> - Persist completed rounds, repeated blockers, findings and the explicit minimum in the owning run's `review-policy.cjs` record. Resume that record after interruption; target changes invalidate evidence and acceptance but preserve the bounded round budget. In-flight attempt IDs may be session-local; they do not replace or reset completed-round state

<!-- /OVERRIDE:fresh-context-review -->

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call the current task list first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] /skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** the current task list done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `tmp/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: tmp/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:estimation-framework -->

> **Estimation Framework** — Bottom-up first; SP DERIVED; output min-max range when likely ≥3d. Stack-agnostic. Baseline: 3-5yr dev, 6 productive hrs/day. AI estimate assumes Claude Code + project context.
>
> **Method:**
>
> 1. **Blast Radius pass** (below) — drives code AND test cost
> 2. Decompose phases → hours/phase → `bottom_up_hours = Σ phase_hours`
> 3. `likely_days = ceil(bottom_up_hours / 6) × productivity_factor`
> 4. Sum **Risk Margin** (base + add-ons) → `max_days = likely_days × (1 + margin)`
> 5. `min_days = likely_days × 0.9`
> 6. Output as range when `likely_days ≥3`; single point allowed `<3` (still record margin)
> 7. `man_days_ai` = same range × AI speedup
> 8. `story_points` DERIVED from `likely_days` via SP-Days — NEVER driver. Disagreement >50% → trust bottom-up
>
> **Productivity factor:** 0.8 strong scaffolding+codegen+AI hooks · 1.0 mature default · 1.2 weak patterns · 1.5 greenfield
>
> **Cost Driver Heuristic (apply BEFORE work-type row):**
>
> - **UI dominates** in CRUD/business apps — 1.5-3x backend (states, validation, responsive, a11y, polish)
> - **Backend dominates ONLY:** multi-aggregate invariants, cross-service contracts, schema migrations, heavy query/perf, new event flows
>
> **Reuse-vs-Create axis (PRIMARY lever, per layer):**
>
> | UI tier                                      | Cost     |
> | -------------------------------------------- | -------- |
> | Reuse component on existing screen           | 0.1-0.3d |
> | Add control/column to existing screen        | 0.3-0.8d |
> | Compose components into NEW screen           | 1-2d     |
> | NEW screen, custom layout/states/validation  | 2-4d     |
> | NEW shared/common component (themed, tested) | 3-6d+    |
>
> | Backend tier                                         | Cost      |
> | ---------------------------------------------------- | --------- |
> | Reuse query/handler from new place                   | 0.1-0.3d  |
> | Small update existing handler/entity                 | 0.3-0.8d  |
> | NEW query on existing repo/model                     | 0.5-1d    |
> | NEW command/handler on existing aggregate (additive) | 1-2d      |
> | NEW aggregate/entity (repo, validation, events)      | 2-4d      |
> | NEW cross-service contract OR schema migration       | 2-4d each |
> | Multi-aggregate invariant / heavy domain rule        | 3-5d      |
>
> **Rule:** Sum tiers across UI+backend+tests, apply productivity factor. Reuse short-circuits tiers — call out.
>
> **Test-Scope drivers (compute test_count EXPLICITLY — "+tests" hand-wave is #1 failure):**
>
> | Driver                            | Count                                                  |
> | --------------------------------- | ------------------------------------------------------ |
> | Happy-path journeys               | 1 per story / AC main flow                             |
> | State-machine transitions         | reachable transitions × allowed actors                 |
> | Multi-entity state combos         | state(A) × state(B) — REACHABLE only, not Cartesian    |
> | Authorization matrix              | (owner, non-owner, elevated, unauth) × each mutation   |
> | Validation rules                  | 1 per required field / boundary / format / cross-field |
> | UI states (per new screen/dialog) | happy, loading, empty, error, partial — present only   |
> | Negative paths / invariants       | 1 per violatable business rule                         |
>
> | Test tier (Trad, incl. setup+assert+flake) | Cost     |
> | ------------------------------------------ | -------- |
> | 1-5 cases, fixtures reused                 | 0.3-0.5d |
> | 6-12 cases, 1 new fixture                  | 0.5-1d   |
> | 13-25 cases, multi-entity setup            | 1-2d     |
> | 26-50 cases OR new state-machine coverage  | 2-3d     |
> | >50 cases OR full E2E journey              | 3-5d     |
>
> **Test multipliers:** new fixture/seed harness +0.5d · cross-service/bus assertion +0.3d each · UI E2E ×1.5 · each new role +1-2 cases
>
> **Blast Radius (mandatory pre-pass — affects code AND test):**
>
> 1. Files/components directly modified — count
> 2. Of those, "complex" (>500 LOC, multi-handler, central, frequently-modified) — count
> 3. Downstream consumers (callers, event subscribers, cross-service) — list
> 4. Shared/common code touched (multi-app blast) — yes/no
> 5. Regression scope — areas needing re-test
>
> **Rule:** Complex touch → add `risk_factors`. Each downstream consumer → +1-3 regression cases. Blast >5 areas OR >2 complex → re-evaluate SPLIT before estimating.
>
> **Risk Margin (drives max bound):**
>
> | likely_days         | Base margin                     |
> | ------------------- | ------------------------------- |
> | <1d trivial         | +10%                            |
> | 1-2d small additive | +20%                            |
> | 3-4d real feature   | +35%                            |
> | 5-7d large          | +50%                            |
> | 8-10d very large    | +75%                            |
> | >10d                | +100% AND **flag SHOULD SPLIT** |
>
> **Risk-factor add-ons (additive — enumerate in `risk_factors`):**
>
> | Factor                                                                | +margin |
> | --------------------------------------------------------------------- | ------- |
> | `touches-complex-existing-feature` (>500 LOC, multi-handler, central) | +20%    |
> | `cross-service-contract` change                                       | +25%    |
> | `schema-migration-on-populated-data`                                  | +25%    |
> | `new-tech-or-unfamiliar-pattern`                                      | +30%    |
> | `regression-fan-out` (≥3 downstream areas re-test)                    | +20%    |
> | `performance-or-latency-critical`                                     | +20%    |
> | `concurrency-race-event-ordering`                                     | +25%    |
> | `shared-common-code` (multi-consumer/multi-app)                       | +25%    |
> | `unclear-requirements-or-design`                                      | +30%    |
>
> **Collapse rule:** total margin >100% → STOP, split (padding past 2x is dishonesty). Margin <15% on `likely_days ≥5` → under-estimated, widen.
>
> **Work-Type Caps (hard ceilings on `likely_days`):**
> | Work type | Max SP | Max likely |
> | --- | --- | --- |
> | Single field / config flag / style fix | 1 | 0.5d |
> | Add property to existing model + bind to existing UI | 2 | 1d |
> | **Additive endpoint + minor UI control** (button/menu/column), reuses fixtures | **3** | **2-3d** |
> | Additive endpoint + **NEW UI surface** OR additive multi-layer + new domain rule + 2+ test files | 5 | 3-5d |
> | NEW model/aggregate OR migration OR cross-module contract OR heavy test (>1.5d) OR NEW UI + non-trivial backend | 8 | 5-7d |
> | NEW UI surface + (NEW aggregate OR migration OR cross-service contract) | 13 | SHOULD split |
> | Cross-service contract + migration combined | 13 | SHOULD split |
> | Beyond | 21 | MUST split |
>
> **SP→Days (validation only):** 1=0.5d/0.25d · 2=1d/0.35d · 3=2d/0.65d · 5=4d/1.0d · 8=6d/1.5d · 13=10d/2.0d (Trad/AI likely)
> **AI speedup:** SP 1≈2x · 2-3≈3x · 5-8≈4x · 13+≈5x. AI cost = `(code_gen × 1.3) + (test_gen × 1.3)` (30% review overhead).
>
> **MANDATORY frontmatter:**
>
> ```yaml
> story_points: <n>
> complexity: low | medium | high | critical
> man_days_traditional: '<min>-<max>d' # range when likely ≥3d; '<N>d' when <3d
> man_days_ai: '<min>-<max>d'
> risk_margin_pct: <n> # base + add-ons
> risk_factors: [touches-complex-existing-feature, regression-fan-out] # closed-list from add-ons; [] if none
> blast_radius:
>     touched_areas: <n>
>     complex_touched: <n>
>     downstream_consumers: [list or count]
>     shared_common_code: yes | no
> estimate_scope_included: [code, integration-tests, frontend, i18n, docs]
> estimate_scope_excluded: [unit-tests, e2e, perf, deployment, code-review-rounds]
> estimate_reasoning: |
>     5-7 lines covering:
>     (a) UI tier — row applied
>     (b) Backend tier — row applied
>     (c) Test scope — case breakdown by driver, file count, fixtures, tier row
>     (d) Cost driver — dominant tier + why
>     (e) Blast radius — touched, complex, regression scope
>     (f) Risk factors — list driving margin; why not larger/smaller
>     Example: "UI: compose Form/Table/Dialog → NEW screen (~1.5d). Backend: NEW command on existing aggregate,
>     reuses validation+repo (~1d). Tests: 4 transitions × 2 actors + 3 validation + 2 UI states = 13 cases,
>     1 new fixture → tier 13-25 ~1.5d. Driver: UI composition + new states. Blast: 4 areas, 1 complex.
>     Risk: base 35% + touches-complex +20% = 55% → max 3.9d → range 2.5-4d."
> ```
>
> **Sanity self-check:**
>
> - `likely_days ≥3d` and single-point? → reject, must be range
> - Margin <15% on `likely_days ≥5d`? → under-estimated, widen
> - Margin >100%? → STOP, split instead of buffer
> - Complex existing feature touched, no regression budget in `(c)`? → reject
> - Blast `>5` areas OR `>2` complex, no split discussion? → reject
> - Purely additive on existing model AND existing UI? → cap SP 3 unless tests >1.5d
> - NEW UI surface (page/complex form/dashboard)? → SP 5+ even if backend one endpoint
> - Backend cross-service / migration / multi-aggregate? → SP 8+ regardless of UI
> - `bottom_up_hours / 6` vs SP-Days disagreement >50%? → trust bottom-up, downgrade SP
> - Without tests, SP drops ≥1 bucket? → tests dominate; state explicitly
> - Reasoning called out UI vs backend vs blast vs risk factors? → if missing, add

<!-- /SYNC:estimation-framework -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:sequential-thinking-protocol -->

> **Sequential Thinking Protocol** — Structured multi-step reasoning for complex/ambiguous work. Use when planning, reviewing, debugging, or refining ideas where one-shot reasoning is unsafe.
>
> **Trigger when:** complex problem decomposition · adaptive plans needing revision · analysis with course correction · unclear/emerging scope · multi-step solutions · hypothesis-driven debugging · cross-cutting trade-off evaluation.
>
> **Format (explicit mode — visible thought trail):**
>
> 1. `Thought N/M: [aspect]` — one aspect per thought, state assumptions/uncertainty
> 2. `Thought N/M [REVISION of Thought K]: ...` — when prior reasoning invalidated; state Original / Why revised / Impact
> 3. `Thought N/M [BRANCH A from Thought K]: ...` — explore alternative; converge with decision rationale
> 4. `Thought N/M [HYPOTHESIS]: ...` then `[VERIFICATION]: ...` — test before acting
> 5. `Thought N/N [FINAL]` — only when verified, all critical aspects addressed, confidence >80%
>
> **Mandatory closers:** Confidence % stated · Assumptions listed · Open questions surfaced · Next action concrete.
>
> **Stop conditions:** confidence <80% on any critical decision → escalate by asking the user directly · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).

<!-- /SYNC:sequential-thinking-protocol -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate (static JIT)** — Run after task-tracking bootstrap and immediately before target/source file reads, grep, edits, tests, or analysis. Project docs override generic framework assumptions; hooks may remind or accelerate this gate, but never prove that it ran.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. **Read the configured project-config file first, if it exists.** Resolve its path through the project-config loader (default `docs/project-config.json`). **The project config is OPTIONAL: a project with no config is a supported, first-class state, not an error.** When it is absent, run on the framework's portable defaults and derive project facts (paths, run commands, conventions, architecture, test and spec layout) from repository evidence — manifests, lockfiles, scripts, CI definitions, directory layout, root instruction files — stating the assumption whenever one is material; do not block, and do not demand a bootstrap route before ordinary work. When it IS present, the minimum valid shape has a non-empty `project.name`; omitted optional capability properties use neutral defaults or skip that capability. A section its author DECLARED but left malformed or incomplete is a configuration error: fail closed on that section and run `$project-init` or `$project-config` before relying on it, because silently substituting defaults would present wrong project facts as authoritative. Use valid config for the adopter's paths, commands, architecture, specs, tests, and workflows, then verify material hints against repository evidence; never assume generic defaults are project facts.
> 3. **Always-on vs task-specific references:** Project initialization owns and ensures the project's `lessons.md` and docs-index inputs at their configured owner paths. Read them under the static project-context contract independently of task-specific `referenceDocs`; do not append them to that selection. For task-specific docs, when the configured `referenceDocs` property is an array, follow it exactly, including subsets and `[]`. When absent, use the runtime capability-aware resolver: its portable baseline plus only configuration- or repository-evidenced capabilities; a minimal project with no capability evidence may resolve to an empty task-specific set. The full scan-target manifest is a registry of metadata/aliases, not a default selection. Resolve configured paths using `docsRoots.projectReference.path` when present (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A custom reference doc declares `filename` and `purpose`, with optional `sections`, `templatePath`, and `scanTarget`. Built-in filenames keep their exact framework-owned target; other custom docs default to manual ownership, while `scanTarget: "generic"` opts one exact selected file into evidence-based scanning. Manual docs are not freshness-tracked or impact-routed. Never infer a target by basename; config and runtime path resolution reject lexical traversal and physical symlink escapes.
> 4. Read selected task-specific docs just in time before target work, then state: `Reference docs read: ... | Not applicable: ...`; an explicit empty selection means no task-specific docs are selected by the catalog. Still honor separately required references named by the active skill or task. An absent project config is not a missing doc: proceed on repository evidence and, at most, OFFER `$project-init` or `$project-config` as an optional one-time recording of those facts. If an always-on input or a selected/otherwise required doc is missing or stale, or a declared config section is malformed, use `$project-init` or the narrow owner route (`$project-config`, `$docs-init`, `$scan --target=<key>`, `$ai-context-refresh`) before relying on that input. If Codex mirrors are stale, use the explicit `$sync-codex` route or its documented `$ai-context-refresh` completion handoff for the active source-authoring task. After compaction, resume, delegation, or material context change, repeat selection and reading; prior conversation and hook output are not proof of current loading.
>
> **Ready when:** scope evaluated, the configured project-config file consulted or its absence recorded and the portable-defaults fallback applied, root always-on inputs are confirmed (completing project initialization if they are missing or stale), the declared task-specific `referenceDocs` selection is applied exactly or, when absent, the runtime capability-aware resolver output is applied (which may be empty), selected docs are read or an explicit empty selection is recorded, and the citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:understand-code-first -->

> **Understand Existing Code First** — For code changes, read and trace the target before planning or editing; do not apply a code workflow to work with no code surface.
>
> 1. Search for relevant existing implementations and cite `file:line`; aim for 3+ comparable examples when they exist, and record when the project has fewer or none.
> 2. Read the target area and its configured project references; identify actual structure, owners, and conventions without assuming a framework, layer model, or base class.
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists and the task concerns code relationships.
> 4. Map affected dependencies and callers with available repository tools; do not block on an absent graph or unsupported tool.
> 5. Write investigation to `tmp/analysis/` for non-trivial tasks (3+ files).
> 6. Re-read the analysis before implementing; update it when evidence changes.
> 7. Follow a fitting local pattern, or state why no suitable pattern exists and justify a project-appropriate choice.
>
> **BLOCKED until:** target and relevant existing patterns are inspected, applicable dependencies are traced, and material assumptions have evidence. If an item does not apply or the repository has no comparable implementation, record that fact rather than fabricating a gate result.

<!-- /SYNC:understand-code-first -->

<!-- OVERRIDE:double-round-trip-review -->

<!-- Diverges from canonical `SYNC:double-round-trip-review` on ONE point only: the round budget.
     Canonical grants one conditional extension to round 3 when a validated CRITICAL/HIGH survives
     round 2; plan-review's cap is a HARD 2 with no extension, so that round-2 state escalates to
     the owner by asking the user directly instead (see `OVERRIDE:review-policy` and
     `OVERRIDE:fresh-context-review` above, which narrow the same budget). The failing-test-gate
     carve-out is canonical and survives: a failing test gate is outside the round budget entirely.
     Everything else in this block is the canonical body. Re-sync the non-budget prose by hand when
     canonical changes. -->

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle or an explicitly declared independent-pass minimum, not by a round number alone. Review purpose: `review → validate findings → fix validated findings that block the current round → full re-review` until a complete review pass clears the round's exit bar (see **Severity floor** below). **A clean review ENDS the loop once the persisted `minRounds` is met (default 1); an explicitly declared minimum such as 2 still requires that independent pass.**
>
> _aka **Self-Review Convergence Loop**._ A validated-finding fix cycle forces at least one fresh re-review. It runs until the current round's exit bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred), bounded by the **HARD 2-round cap with NO extension round** defined below. A failing **test gate** (a suite that must actually pass) is outside that cap: the loop keeps fixing and re-running until the tests pass.
>
> **Round cap — 2 rounds MAX, HARD, NO extension (a ceiling, NEVER a target).** Round 1 is the initial review; round 2 is the at-most-one re-review after the validated-fix cycle, and round 2 is the LAST review round. A clean pass ENDS the loop at ANY round once the persisted `minRounds` is met — round 1 included with the default minimum; the cap never obliges an extra round. When round 2 completes with blocking findings still open (severity floor applied):
>
> - **ANY validated blocking finding still open — CRITICAL, HIGH, MEDIUM, or an unresolved `NOT VERIFIABLE` → STOP and escalate by asking the user directly**, listing every still-open finding with its `file:line`, severity, and confidence. A failed non-test binary gate (security must-fix, required artifact, generated parity, policy compliance) escalates the same way. No severity and no evidence earns an extra round: for review blockers there is NEVER a round 3. — why: a plan is cheap to regenerate and expensive to half-fix, so a plan still blocked after one full re-review needs an owner decision, not a third machine round.
> - **A failing TEST gate → NO round cap, at any round.** Failing tests never escalate for budget or no-progress: run the failed-test investigation gate, fix at the owning layer, and re-run until the tests pass — past round 2 if needed. NEVER weaken an assertion, add a skip, or relax a timeout to force green. Review blockers open beside failing tests still follow the bullet above.
>
> NEVER emit a silent "good enough" PASS on cap exhaustion, NEVER let the cap substitute for the clean-review requirement, and NEVER loop past round 2 on review blockers — only failing test gates continue beyond it. The 2-repeated-no-progress blocker rule stays an EARLIER exit — escalate at whichever trips first.
>
> **Severity floor — from round 2, LOW stops blocking.** The exit bar tightens after the first review pass, so the loop converges on consequence instead of spinning on polish:

> Define one predicate everywhere: `blocking_findings(round, findings)` returns all validated findings in round 1 and only validated CRITICAL/HIGH/MEDIUM findings from round 2 onward. A binary gate (test-green, security must-fix, required artifact) is exempt only when its owning invariant explicitly says so; in practice binary gates always remain blocking when they fail.
>
> | Round | Exit bar — loop ENDS when the fresh full review has… | Must be fixed to continue |
> | --- | --- | --- |
> | 1 | zero validated findings at ANY severity | CRITICAL · HIGH · MEDIUM · LOW |
> | 2 — the LAST review round | zero validated CRITICAL / HIGH / MEDIUM findings — **LOW-only clears the severity bar** | CRITICAL · HIGH · MEDIUM only; anything still open here ESCALATES instead of opening round 3 |
> | 3+ — test-gate continuation, reachable ONLY while failing test gates are the sole blocker | the tests pass and no review blocker is open | failing tests; any review blocker here escalates |
>
> From round 2 onward LOW findings are **NOT required to be fixed**: a round whose validated findings are ALL LOW **ENDS the loop once the persisted minimum is met** — do not open another fix/re-review round for them. Severity tiers are `SYNC:severity-rubric` (CRITICAL block-merge · HIGH must-fix · MEDIUM must clear the current round · LOW record/defer); round 1 remains strict, so a LOW found initially is still validated and fixed when warranted before the floor can apply.
>
> **Severity-floor rules:**
>
> - **Never silently drop a deferred LOW.** Every unfixed LOW is listed in the final report under `## Deferred LOW Findings (severity floor, round ≥2)` with file, line, and description, so the owner can schedule it. Dropping it from the report is a protocol violation, not a clean pass.
> - **Never re-tier a finding to trigger the exit.** Downgrading a real CRITICAL/HIGH/MEDIUM to LOW so the loop can end is a FALSE PASS. Severity is set by consequence per `SYNC:severity-rubric` before the round bar is applied — never after, and never with the exit in view. — why: a floor that can be reached by relabeling is not a floor.
> - **Never re-tier a finding to change what the cap does.** There is no extension round to buy or dodge, so at round 2 severity decides exactly one thing: whether the round exits clean or escalates to the owner. Promoting or demoting a finding to steer that outcome is a FALSE classification. — why: a cap that can be reached by relabeling bounds nothing.
> - **The floor bounds the loop, not the standard.** It ends *iteration*; it never authorizes shipping a known CRITICAL/HIGH/MEDIUM, and it never lowers the finding-survival bar that admits a finding in the first place.
> - **The floor never applies to a hard gate.** Test-green gates (a suite must actually pass), security must-fix gates, and any gate whose criterion is binary rather than severity-rated are unaffected — a failing test is a failure, not a LOW finding.
>
> **Universal scope (any new output/judgment):** any newly produced output or judgment gets **≥1 self-review**; any **new judgment** gets **≥1 `$why-review --validate-findings` pass**; anything flagged to re-check is re-checked **≥1 time** — before that output is treated as final. This loop is the default convergence contract for ANY work-producing skill, not review skills only.
>
> **Routing invariant (author-facing):** a skill that validates findings MUST route them through `$why-review --validate-findings` (the terminal validator) — NEVER fork an inline finding-validation. Routing through why-review is what makes the finding-survival bar and this loop apply; the `verify-review-validate-coverage` sensor enforces this exact route mechanically.
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS if `round >= minRounds`; otherwise perform the explicitly required independent pass. Do NOT invent a confirmation pass.
> - **`blocking_findings(round, findings)` is non-empty** → run the active review skill's findings-validation gate first; for review skills the default gate is `$why-review --validate-findings <report-path>`. Fix only validated findings that block the current round, then restart the full review protocol from the beginning with a fresh task breakdown.
>
> **Fresh full re-review after every fix cycle:** Re-run the whole review protocol over the current full target. When sub-agents are part of that protocol, spawn NEW `spawn_agent` calls — never reuse prior agents. Reviewers re-read ALL files from scratch with ZERO memory of prior rounds. See `OVERRIDE:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. Each fresh full review must catch:
>
> - Cross-cutting concerns missed in the prior round
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the prior round rationalized away
> - Regressions introduced by the fixes themselves
>
> **Loop termination:** After round 1's full re-review, repeat the same decision against **round 2's exit bar**: bar cleared and persisted minimum met → END; blocking findings remain → STOP and escalate. Round 1 clears only on zero findings at any severity; **from round 2 the bar is zero CRITICAL/HIGH/MEDIUM, so a LOW-only round ENDS the loop once the persisted minimum is met** (deferred LOWs go in the report). Capped at **2 rounds, HARD, with no extension**. Escalate by asking the user directly at whichever comes first: the same validated finding repeats for 2 full invocations with no progress · a fix requires product/owner input · round 2 completes with ANY validated review blocker still open. A failing test gate triggers none of these escalations — it loops until green. NEVER loop past round 2 on review blockers, and NEVER convert cap exhaustion into a PASS.
>
> **Rules:**
>
> - A clean Round 1 ENDS the review once the persisted `minRounds` is met (default 1); an explicitly declared `minRounds=2` requires the independent second pass
> - From round 2 on, a round whose validated findings are ALL LOW ENDS the loop once the persisted minimum is met — never open round N+1 to fix LOW alone; list those LOWs as deferred instead
> - NEVER re-tier a CRITICAL/HIGH/MEDIUM down to LOW to reach the round-2 exit — severity is assigned by consequence before the bar is applied
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - Every surviving finding must additionally clear the **finding-survival bar** defined in why-review's Findings Validation Routine (a deliberately higher bar than the generic act-gate — "keep this finding?" is a stricter question than "act on this evidence?"); a finding below the bar is demoted or dropped, not kept
> - NEVER skip the full re-review after a fix cycle (every fix invalidates the prior verdict)
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns NEW Agent calls
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - The round cap NEVER replaces the clean-review requirement — it bounds runaway looping, it does not authorize shipping an un-clean review; a clean pass ends the loop early once the persisted `minRounds` is met, and cap exhaustion escalates rather than passes
> - Enforce the HARD cap of 2 rounds (no extension round exists — round 2 is the last review round) together with the 2 repeated-no-progress blocker rule; both are escalation triggers for review blockers, neither is a completion criterion
> - Failing test gates are outside the round budget: never escalate them for budget or no-progress, and keep fixing and re-running until the tests pass — never forcing green
> - Persist completed rounds, repeated blockers, findings and the explicit minimum in the owning run's `review-policy.cjs` record. Resume that record after interruption; target changes invalidate evidence and acceptance but preserve the bounded round budget. In-flight attempt IDs may be session-local; they do not replace or reset completed-round state
> - Final verdict must incorporate ALL rounds executed
>
> **Report must include `## Round 2 Findings (Fresh Sub-Agent)` when round 2 was executed, plus `## Deferred LOW Findings (severity floor, round ≥2)` whenever the loop ended on the severity floor with LOWs still open. When the loop escalated at the cap, the report must name every review blocker that was still open; when rounds continued on failing tests, it must name the failing test gates of each such round.**

<!-- /OVERRIDE:double-round-trip-review -->

<!-- SYNC:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 11 protocol blocks VERBATIM, copied WHOLESALE and unmodified. They are the review-tier renderings of their canonical `SYNC:` tags, not literal copies; when a canonical protocol changes, update the matching body here in the same edit. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 11 protocol bodies pre-embedded.

### Subagent Type Selection

- `code-reviewer` — for code reviews (reviewing source files, git diffs, implementation)
- `general-purpose` — for plan / doc / artifact reviews (reviewing markdown plans, docs, specs)

### Canonical Agent Call Template (Copy Verbatim)

```
spawn_agent({
  description: "Fresh Round {N} review",
  agent_type: "code-reviewer",
  prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Review plan files under {plan-dir}" | "Review integration tests in {path}"}

## Round
Round {N}. You have ZERO memory of prior rounds. Re-read all target files from scratch via your own tool calls. Do NOT trust anything from the main agent beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Spec ↔ Tests ↔ Code Triangulation
DO THIS FIRST — before any per-protocol check below. The review target is the WHOLE PACKAGE, not the diff alone. Read `docs/project-config.json` and resolve `specArtifacts`: a valid profile selects its configured `intent/contracts/evidence` section roles, identifiers, ownership rule, and test-carrier dialects; only an absent profile selects the strict-default business-spec shape (§3 ACs / §4 BRs / §5 invariants / §8 TCs). A malformed or unsupported declaration is `BLOCKED`; never treat it as absent or fall back. Load the governing artifact, its tests, and the changed code TOGETHER, and reason about their mutual consistency BEFORE judging any one in isolation.
1. Locate all three faces: the canonical owner section(s), the tests that guard them, and the production code that implements them. With a native profile, preserve owner path + case/scenario ID + optional variant and resolve each through its configured carrier to the actual test. A missing face is itself a finding (SPEC-GAP / TEST-GAP / DEAD-SPEC).
2. Triangulate pairwise — every disagreement is a finding; classify which face is wrong:
   - code vs spec: behavior the code does that no configured `intent/contracts` rule (or strict-default §3/§4/§5/§8 rule) describes → CODE-EXTRA or SPEC-STALE; a hard contract/invariant with no enforcing path → CODE-WRONG.
   - tests vs spec: a configured native case with no executing assertion, or a test asserting behavior no native rule/case names → TEST-GAP or SPEC-SILENT. Without `specArtifacts`, check strict-default §8 TCs.
   - tests vs code: a changed code path with no covering test → TEST-GAP; a test that still passes against a deliberately broken invariant → WEAK-TEST (apply the mutation thinking in Bug Detection).
3. Hidden-rule capture: any invariant the code enforces but the spec never states (SPEC-SILENT) MUST be surfaced as a finding, added to the profile's configured `intent` or `contracts` section, and linked from its `evidence` section to a native case whose executing assertion is inspected. Without a profile, use strict-default §3/§4/§5/§8 and TC. This is the enrichment loop, never a silent pass.
4. Only after the three faces agree — or every disagreement is logged as a finding — proceed to the per-protocol checks below; when enrichment adds spec/test content, re-review the package against the enriched spec.
NEVER mark review PASS while any spec/test/code face disagrees without a logged finding. The diff is the entry point; the package is the unit of judgment.

### Evidence-Based Reasoning
Speculation is FORBIDDEN. Every claim needs proof.
1. Cite file:line, grep results, or framework docs for EVERY claim
2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
3. Cross-service validation required for architectural changes
4. "I don't have enough evidence" is valid and expected output
BLOCKED until: Evidence file path (file:line) provided; Grep search performed; 3+ similar patterns found; Confidence level stated.
Forbidden without proof: "obviously", "I think", "should be", "probably", "this is because".
If incomplete → output: "Insufficient evidence. Verified: [...]. Not verified: [...]."

### Bug Detection
MUST check categories 1-4 for EVERY review. Never skip.
1. Null Safety: Can params/returns be null? Are they guarded? Optional chaining gaps? .find() returns checked?
2. Boundary Conditions: Off-by-one (< vs <=)? Empty collections handled? Zero/negative values? Max limits?
3. Error Handling: Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
4. Resource Management: Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
5. Concurrency (if async): Missing await? Race conditions on shared state? Stale closures? Retry storms?
6. Stack-Specific: Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
Classify every finding by consequence (never by effort): CRITICAL = immediate material security/safety/data-loss risk or failed binary gate → block; HIGH = material correctness, contract, privacy, or authority risk → must fix; MEDIUM = bounded consequential edge/resilience/maintainability gap → must clear the current round, or escalate with an explicit residual-risk follow-up that does not create a clean pass; LOW = non-blocking polish with no credible present impact → record/defer from round 2; `NOT VERIFIABLE` is unresolved evidence, not LOW.

### Design Patterns Quality
Priority checks for every code change:
1. Consistency and reuse: follow documented local patterns; extract a shared abstraction only when repetition or a demonstrated consumer need justifies its cost. Similar names alone do not require a shared base class.
2. Responsibility: follow the architecture established by project configuration, references, accepted decisions, and existing code. Place behavior with its actual owner; do not presume an entity/service/controller hierarchy or forbid a layer without project evidence.
3. Apply cohesion, coupling, and dependency-management principles when their assumptions fit the project's paradigm. SOLID is useful for object-oriented boundaries, not a mandatory checklist for every language or codebase.
4. After extraction/move/rename: Grep ENTIRE scope for dangling references. Zero tolerance.
5. YAGNI gate: Treat repeated patterns as evidence to evaluate extraction, not a numeric threshold. Extract when a shared reason to change, real consumers, or an evidenced ownership/substitution boundary lowers total change cost; do not create patterns for hypothetical future use.
6. Purpose-oriented naming: Name public or cross-layer abstractions by the capability, domain purpose, or contract consumers rely on—not the current provider, SDK, framework, database, or transport. `IStorage`/`Storage` → `AzureBlobStorage`; use `IAzureStorage` only when Azure-specific semantics are intentionally part of the contract.
7. Contract-fit check: Read callers and every implementation before judging a name; narrow an over-broad abstraction (`IObjectStore`, `DocumentStore`) instead of rewarding a generic name that lies about behavior.
8. Mechanism/generic-name smell: Treat `Manager`, `Helper`, `Utils`, `Data`, `Thing`, `Service`, `Interface`, type decorations, and unexplained abbreviations as review signals—not automatic defects; flag them only when they hide purpose, scope, or responsibility.
9. Concrete implementation names: Provider, strategy, transport, or test-double names are valid on concrete types when they distinguish real behavior (`AzureBlobStorage`, `InMemoryStorage`, `RetryingStorage`); keep those details out of the caller-facing contract unless the contract promises them.
10. Language convention: Preserve local interface syntax and naming style; `.NET` `I` prefixes and Google TypeScript's unmarked interfaces are both valid local conventions.
Anti-patterns to flag: God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

### Logic & Intention Review
Verify WHAT code does matches WHY it was changed.
1. Change Intention Check: Every changed file MUST serve the stated purpose. Flag unrelated changes as scope creep.
2. Happy Path Trace: Walk through one complete success scenario through changed code.
3. Error Path Trace: Walk through one failure/edge case scenario through changed code.
4. Acceptance Mapping: If plan context available, map every acceptance criterion to a code change.
5. Tests Verify Intent: For test/spec changes, verify tests name the protected business rule or invariant and would fail if that intent breaks.
6. Migration Test Exclusion: Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.
NEVER mark review PASS without completing both traces (happy + error path).

### Test Spec Verification
Map changed code to test specifications.
1. Identify the project's test/spec format from existing docs, test-case files, BDD feature files, or spec folders.
2. Every changed code path MUST map to a corresponding test case/spec (or flag as "needs test case").
3. New functions/endpoints/handlers → flag for test spec creation.
4. Migration files are excluded from test/spec creation; schema/data migrations are one-time execution paths, not core application logic.
5. If spec evidence fields exist, verify they point to actual code (file:line, not stale references).
6. Verify each meaningful test case names the business intent/invariant; flag behavior-only cases that only mirror implementation details.
7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
8. If no specs exist for a changed path → log the gap and recommend the project's test-spec workflow.
NEVER skip test mapping. Untested code paths are the #1 source of production bugs.

### Behavioral Delta Matrix
MANDATORY for any bugfix review. Produce input-state × pre-fix × post-fix × delta table BEFORE writing verdict.
- Minimum 3 rows; include at least one row OUTSIDE the original bug report.
- Any "REGRESSION" delta → review returns FAIL until a preservation test is added.
- Narrative descriptions do NOT substitute for the matrix.
Example rows (external-record sync fix):
| Input                 | Pre-fix | Post-fix                  | Delta      |
| --------------------- | ------- | ------------------------- | ---------- |
| Record exists (valid) | Reused  | Always recreated → orphan | REGRESSION |
| Record missing (404)  | Error   | Recreated                 | Fixed      |

### Fix-Layer Accountability
Do not assume the crash site owns the defect. Trace the actual execution and data flow, then fix the component that owns the violated contract.
MANDATORY before ANY fix:
1. Trace the affected path — map the real origin, transformations, boundaries, and observed failure in the surfaces this project uses. Do not invent absent layers.
2. Identify the contract owner — use project architecture and code evidence to find which component is responsible for the invalid state or behavior.
3. Choose the correction point — fix the authoritative owner and retain any validation required at untrusted boundaries. A multi-file correction can be valid; justify it by the contracts each file owns rather than a file-count threshold.
4. Check bypass paths — inspect relevant constructors, adapters, parsers, caches, persistence, or other entry points that actually exist in the affected flow.
BLOCKED until: The affected path is traced; the owner is supported by file:line evidence; relevant consumers and bypass paths are checked; and the correction point fits the project's architecture.
Anti-patterns (REJECT): assuming the symptom site is the owner; scattering workarounds without tracing the contract; assuming the lowest technical layer is always authoritative; removing validation from a real trust boundary to force a single correction point.

### Rationalization Prevention
AI skips steps via these evasions. Recognize and reject:
- "Too simple for a plan" → Simple + wrong assumptions = wasted time. Plan anyway.
- "I'll test after" → RED before GREEN. Write/verify test first.
- "Already searched" → Show grep evidence with file:line. No proof = no search.
- "Just do it" → Still need task tracking. Skip depth, never skip tracking.
- "Just a small fix" → Small fix in wrong location cascades. Verify file:line first.
- "Code is self-explanatory" → Future readers need evidence trail. Document anyway.
- "Combine steps to save time" → Combined steps dilute focus. Each step has distinct purpose.

### Graph-Assisted Investigation
MANDATORY when .code-graph/graph.db exists.
HARD-GATE: MUST run at least ONE graph command on key files before concluding any investigation.
Pattern: Grep finds files → trace --direction both reveals full system flow → Grep verifies details.
- Investigation: trace --direction both on 2-3 entry files
- Fix/Debug: callers_of on buggy function + tests_for
- Feature/Enhancement: connections on files to be modified
- Code Review: tests_for on changed functions
- Blast Radius: trace --direction downstream
CLI: python .claude/scripts/code_graph {command} --json. Use --node-mode file first (10-30x less noise), then --node-mode function for detail.

### Understand Code First
HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
1. Search 3+ similar patterns (grep/glob) — cite file:line evidence.
2. Read existing files in target area — understand structure, base classes, conventions.
3. Run python .claude/scripts/code_graph trace <file> --direction both --json when .code-graph/graph.db exists.
4. Map dependencies via connections or callers_of — know what depends on your target.
5. Write investigation to tmp/analysis/ for non-trivial tasks (3+ files).
6. Re-read analysis file before implementing — never work from memory alone.
7. NEVER invent new patterns when existing ones work — match exactly or document deviation.
BLOCKED until: Read target files; Grep 3+ patterns; Graph trace (if graph.db exists); Assumptions verified with evidence.

## Reference Docs (READ before reviewing)
- `.claude/docs/development-rules.md` — canonical development rules, code-quality guidelines, and pre-commit checklist
- `code-review-rules.md`, inside the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path)
- {skill-specific reference docs — e.g., integration-test-reference.md for integration-test-review; backend-patterns-reference.md for backend reviews; frontend-patterns-reference.md for frontend reviews}

## Target Files
{explicit file list OR "run git diff to see uncommitted changes" OR "read all files under {plan-dir}"}

## Output
Write a structured report to tmp/reports/{review-type}-round{N}-{date}.md with sections:
- Status: PASS | FAIL
- Issue Count: {number}
- Critical Issues (with file:line evidence)
- High Priority Issues (with file:line evidence)
- Medium / Low Issues
- Cross-cutting findings

Return the report path and status to the main agent.
Every finding MUST have file:line evidence. Speculation is forbidden.
`
})
```

### Rules

- DO copy the template wholesale — including all 11 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO choose `code-reviewer` agent_type for code reviews and `general-purpose` for plan / doc / artifact reviews
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /SYNC:review-protocol-injection -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Project applicability gate.** Before applying a stack, layer, style, tool, or architecture rule, read the project's config and relevant references, then check local implementations. Treat framework examples as examples; honor explicit N/A and do not require a technology or convention the project does not use.
> **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
> **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Judge the environment before judging the code.** A bug report, failed test, error, or unexpected output is not proof of a code defect. Before and during adjudication, weigh environment causes as a competing hypothesis — setup, config, version and dependency state, service dependencies, stale artifacts or leftover state, and transient resource pressure (RAM, CPU, disk, handles, network). State the discriminator you ran; fix an environment cause in the environment, never by editing product code or weakening a test to absorb it.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- Carrier-local SCOPE NOTE for the canonical `SYNC:severity-rubric` block below — deliberately a
     scoped note and NOT an `OVERRIDE:`. plan-review carries the rubric body in exact canonical
     parity; its substance (the four tiers, the consequence decision tree, `NOT VERIFIABLE`, the
     hard-gate rule, domain-vocabulary normalization) is correct here verbatim. Exactly two clauses
     mention the conditional round-3 extension — "never counts toward the round-3 extension" in the
     LOW row, and "unlocks the single conditional extension round" in the closing paragraph. Under
     plan-review's HARD 2-round cap NO extension round exists, so both clauses are INERT here and
     NEVER a grant: read them as "LOW never reopens a round" and "an open CRITICAL/HIGH at round 2
     escalates to the user by asking the user directly". Scoped rather than OVERRIDEn because the divergence
     is two inert clauses, while the rubric body is the shared drift guard every severity carrier
     holds in byte-exact parity — converting it would drop plan-review out of that guard forever to
     restate text that already agrees with the cap in effect. -->

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Classify every finding by consequence, not by effort, reviewer preference, or how annoying the fix is. One scale applies to every review, skill, agent, workflow, and host so a tier has the same meaning everywhere. Choose the highest credible consequence supported by evidence; do not lower a tier to make a round pass.
>
> **Finding vs observation (required):** An observation becomes a finding only when it names the affected user/system/data/contract, the shipped consequence, the evidence location, and the normalized tier. `INFO`, advice, preference, duplicate wording, or an unsubstantiated concern is not a finding and must not reopen a loop. If the concern might affect a required behavior or gate but evidence is incomplete, emit `NOT VERIFIABLE` with the missing evidence and keep it unresolved; never silently convert uncertainty into LOW.
>
> | Severity | Action | Definition and examples |
> | --- | --- | --- |
> | CRITICAL | Block immediately; escalate | Immediate material risk if shipped: authentication/authorization or safety bypass; secrets/PII exposure; irreversible destructive action; data loss/corruption; or a silent failure on a critical path. A failed binary gate that makes the result untrustworthy is represented as a separate synthetic blocker by the executable policy (not as an ordinary severity judgment). |
> | HIGH | Must fix before PASS/merge | Material correctness or contract risk: wrong behavior on a supported path; violated business/data invariant; meaningful privacy or authority gap; breaking API/schema/compatibility change; likely harm to users/downstream systems; or a missing proof for a behavior-changing fix. |
> | MEDIUM | Must clear the current round; escalate if the fix needs an owner decision | Bounded but consequential risk: an edge case, resilience/observability/testability/maintainability gap, credible future defect, or local architectural drift whose impact is real but not immediate material loss. An explicit follow-up records the escalation/residual risk; it does not make an open MEDIUM a clean pass. |
> | LOW | Record and defer; never open another fix/re-review round from round 2 onward, and never counts toward the round-3 extension | Non-blocking polish with no credible present correctness, security, privacy, authority, availability, or data-integrity impact: wording/formatting, minor documentation or convention drift, optional defensive cleanup, or a cosmetic/refinement suggestion. |
>
> **Consequence decision tree (apply in order):** (1) Is a binary gate failed? Keep it as a separate hard blocker (the executable helper represents it as synthetic CRITICAL); do not use the ordinary severity label to hide what failed. Otherwise, would shipping permit immediate material security/safety/authority harm, irreversible destruction, data loss/corruption, or a critical-path silent failure? → **CRITICAL**. (2) Otherwise, does a supported path, invariant, public contract, privacy/authority boundary, compatibility promise, or behavior-changing proof fail with material user/downstream impact? → **HIGH**. (3) Otherwise, is there a bounded but consequential edge, resilience, observability, testability, maintainability, or architectural gap with a credible impact? → **MEDIUM**. (4) Otherwise, is the evidence sufficient to show only non-blocking polish with no credible present material impact? → **LOW**. (5) If the evidence needed to choose between steps 1–4 is missing, → **NOT VERIFIABLE**, not LOW. When multiple tiers fit, select the highest credible consequence; effort, implementation cost, reviewer discomfort, frequency alone, proximity to the round cap, and whether a tier would unlock or forfeit the conditional round-3 extension never decide the tier.
>
> **Boundary examples (normalize before applying the round predicate):** an auth bypass, exposed secret/PII, destructive command without an authority gate, or failed required test/generation/parity gate is **CRITICAL**; a wrong supported response, broken invariant/API/schema, meaningful privacy/authority defect, or unproven behavior-changing fix is **HIGH**; a bounded retry/timeout/alert/testability gap or credible maintainability drift is **MEDIUM**; a typo, formatting inconsistency, optional cleanup, or cosmetic suggestion proven not to affect present behavior is **LOW**. A missing fact about any of those boundaries is **NOT VERIFIABLE** until evidence or an explicitly documented residual-risk decision exists.
>
> **Classification procedure (required for every finding):** (1) state the affected user, system, data, contract, or gate; (2) assess consequence if the issue ships; (3) assess exposure/likelihood and reversibility/detectability; (4) select the highest tier justified by those facts; (5) cite `file:line` or equivalent evidence and a confidence percentage. Effort, implementation cost, reviewer discomfort, and proximity to the round cap are never severity inputs. `NOT VERIFIABLE` is a pending evidence state, not one of the four tiers and never a LOW escape hatch: if the unresolved claim could affect required behavior, security, privacy, authority, availability, data integrity, or a binary gate, it remains an open evidence blocker until resolved or explicitly owner-accepted with documented residual risk. Classify an item LOW only when evidence supports the absence of credible present material impact.
>
> **Hard-gate rule:** Binary gates (tests, required artifacts, security must-fix checks, generated parity, policy compliance) are not ordinary severity-rated findings. The executable helper records a failed gate as a synthetic CRITICAL blocker solely so one predicate can carry it; the report must still name the gate and failure evidence. A failed gate blocks at every round, including when all ordinary findings are LOW; never disguise a failed gate as LOW. A failed non-test gate counts as CRITICAL for the round-3 extension; a failing test gate is outside the round budget and loops until the tests pass.
>
> **Score-based skills** map their numeric scale onto these tiers — do not invent a parallel vocabulary:
>
> - **0-2 criterion scoring** (e.g. production-readiness-review): `0` = CRITICAL/HIGH (criterion unmet, blocks readiness), `1` = MEDIUM (partial, consequential gap), `2` = pass (no finding). If the criterion is only polish, use LOW rather than forcing a `0`.
> - **Two-axis scoring** (e.g. performance-review, impact × likelihood): high impact + high exposure → CRITICAL/HIGH; material impact with bounded exposure → HIGH/MEDIUM; low impact and low exposure → LOW. Record the axes and why the selected tier is the highest credible consequence.
> - **Scorecards / `/20` grades** (e.g. architecture-scalability-review): the aggregate score and verdict band are separate from finding severity. A sub-80 area is evidence to investigate, not an automatic CRITICAL/HIGH/MEDIUM/LOW label; classify each underlying gap by the consequence decision tree and keep advisory score deductions separate from blocking findings.
>
> **Domain-vocabulary normalization (mandatory):** Specialized skills may keep a local reporting vocabulary, but it MUST feed this same four-tier round predicate — never a second severity system:
>
> - `BLOCKED`, `HARD FAIL`, or `FAIL` is a blocking local verdict, not an automatic CRITICAL label. Classify the underlying consequence as CRITICAL when it is an immediate material risk or failed binary gate; otherwise classify it as HIGH or MEDIUM with evidence, while preserving the local block until the owning gate is satisfied.
> - `WARN` is not permission to ignore a finding. Map it to MEDIUM when the gap is consequential, to LOW only when evidence supports no credible present material impact, or upward to HIGH/CRITICAL when the consequence warrants it. `PASS`/compliant is not a finding.
> - UI `P0`/`P1`/`P2`/`P3`/`P4` map to CRITICAL/HIGH/MEDIUM/LOW/LOW respectively as a starting point; override upward only when the evidence shows a higher shipped consequence. A P0/P1 accessibility or task-completion floor remains a blocking gate even when a local UI report calls it a priority rather than a severity.
> - Numeric SRE/readiness or impact/likelihood scores are evidence inputs, not replacement tiers. Emit the score, the consequence, and the normalized CRITICAL/HIGH/MEDIUM/LOW tier together. `INFO`/advisory observations are not findings unless the evidence shows a material consequence.
>
> A finding's tier drives the gate: CRITICAL/HIGH/MEDIUM remain actionable and blocking under the round policy, and only an open CRITICAL/HIGH at round 2 (a failed non-test binary gate counts as CRITICAL) unlocks the single conditional extension round; LOW may be tracked as a follow-up and, from round 2, does not by itself justify another fix/re-review. An owner decision may explain or schedule an open MEDIUM but does not turn it into a clean pass; owner acceptance never makes a failed binary gate pass and must record scope, rationale, and residual risk.

<!-- /SYNC:severity-rubric -->

> **Scope in plan-review (carrier-local):** the rubric above is adopted VERBATIM, with its two
> references to the conditional round-3 extension INERT — plan-review's cap is a HARD 2 rounds with
> NO extension, so no tier can ever unlock a third review round. At round 2, severity decides exactly
> one thing: whether the round exits clean or **escalates to the user by asking the user directly**. LOW is
> recorded as deferred and never reopens a round from round 2 onward.

<!-- SYNC:goal-contract-satisfaction-loop -->

> **Goal Contract Satisfaction Loop** — Persist the user goal in an external file, execute against it, and loop review/fix until every saved required criterion passes or a blocker escalates. Bounded closed loop — NEVER open-ended autonomous exploration.
>
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md` (plans root default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
> 2. **Required sections:** Original Request, Purpose, Success Criteria (checkboxes; mark required vs optional), Constraints, Evidence Required, Iteration Log, Goal Satisfaction matrix.
> 3. **Before work:** read the active goal and map planned work to saved success criteria — execution serves the saved criteria, never chat memory alone.
> 4. **After execution/verification:** append an Iteration Log entry — result, evidence references (`file:line`, command output, report path), remaining gaps.
> 5. **Review gate:** emit a Goal Satisfaction matrix — `| Success Criterion | Evidence | Status |` with PASS/FAIL/BLOCKED. Overall PASS requires every required criterion PASS.
> 6. **Loop rule (retry):** required criterion FAIL → validate the gap is real → fix → re-review only the affected criteria. Stop cleanly when all required criteria PASS.
> 7. **Escalation rule (stop):** two consecutive iterations with no criterion progressing, or a blocker needing user input → mark the criterion BLOCKED with a user-facing reason and escalate. NEVER loop indefinitely.
> 8. **Skip rule:** tiny conversational tasks may skip the goal file ONLY with a recorded one-line reason. User-accepted gate skips are recorded in the goal file with reason and scope.
> 9. **Security:** NEVER store secrets, tokens, credentials, or private customer data in goal files — store evidence references and redact sensitive values.
>
> **Blocked until:** active goal resolved (or skip reason recorded) · saved success criteria read before edits · iteration evidence appended after execution · Goal Satisfaction matrix emitted before any PASS verdict.

<!-- /SYNC:goal-contract-satisfaction-loop -->

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

<!-- SYNC:domain-entity-change-gate -->

> **Domain Entity Change Gate** — ONE DDD-specific protocol binding every skill or agent that PLANS, IMPLEMENTS, or REVIEWS a change to a domain entity, value object, or aggregate in a model that uses DDD tactical patterns or an evidenced equivalent. First inspect the project's domain model and accepted architecture. If neither uses that model, record `DDD-specific gate N/A — project model: <evidence>`; still apply the project's normal ownership, invariant, assertion-backed test, and evidence rules. `$domain-entities-review` is the canonical owner of the full A–P checklist; this gate is the shared trigger plus the decisions that must be answered when applicable. NEVER re-derive a weaker local copy — why: when planning and review disagree on entity rules, the plan ships a design that review then rejects, and the rework is paid twice.
>
> **Trigger — after DDD applicability is established, fires when ANY holds:** a new entity / value object / aggregate root is introduced · an existing one gains or loses a field, invariant, relationship, or state transition · an aggregate boundary, repository, or cross-aggregate reference changes · a domain event is added, renamed, or re-payloaded · a concurrency or reconstitution concern on a root changes. State `No domain-entity surface — gate N/A` when none holds.
>
> **Step 1 — Detect BEFORE deciding.** Both answers change which rules even apply:
>
> - **Paradigm** (per aggregate, from the code — NEVER assumed): OO-mutable · type-driven/immutable · event-sourced. Setter, mutability, and reconstitution rules are written for OO-mutable; applying them to the other two manufactures false findings and false plan tasks.
> - **Subdomain fit:** core (rich model owed) · supporting (Active Record or light model) · generic (buy, do not model) · CRUD (Transaction Script — a rich entity here is ceremony). NEVER plan or flag a rich model where the subdomain has no invariant beyond required-field.
>
> **Step 2 — Answer all 6 decision points.** Each is a decision the change MUST make explicitly:
>
> | # | Decision point | Answered when |
> | - | -------------- | ------------- |
> | 1 | **Classification** — entity vs value object vs aggregate root | The swap test is applied ("would an identical copy be interchangeable?"); a VO is immutable with structural equality and has no repository |
> | 2 | **Invariant ownership** — entity owns "can this state exist?", the boundary owns "is this input acceptable?" | Each rule is placed on one side and named; failure signalling (throw vs `Result`) matches the project convention consistently; a DB constraint is a backstop, NEVER the rule |
> | 3 | **Aggregate boundary + concurrency** | Only true always-consistent invariants share an aggregate; cross-aggregate references are by ID; one aggregate mutates per transaction; the ROOT carries the concurrency token; set-based invariants (uniqueness across instances) name a real enforcing mechanism, never an in-memory check |
> | 4 | **Construction vs reconstitution** | Creation and load are separate paths; the load path raises NO domain events and re-runs NO creation rules; required data sits in the constructor/factory |
> | 5 | **Events** | Raised inside the aggregate; dispatched AFTER commit (outbox when crossing a process); internal domain events kept distinct from published integration contracts; handlers idempotent |
> | 6 | **Test obligation** | Every applicable invariant is named and protected by an executing assertion in the project's native test format, with property and boundary-countercase coverage where applicable; GWT is optional. A valid `specArtifacts` profile supplies case identity/carriers; use property TCs only when the profile is absent. A malformed declared profile blocks; a happy-path example alone is NOT coverage |
>
> **Step 3 — Apply by context.** Same decisions, different obligation:
>
> | Calling context | Obligation |
> | --------------- | ---------- |
> | **Planning** (`$plan`) | The plan MUST name the decision and the owning file for every triggered row. An unanswered row is a plan that is not executable — surface it, do NOT let implementation discover it. |
> | **Plan review** (`$plan-review`) | An unanswered, hand-waved, or deferred-to-implementation row is a FINDING with `file:line` into the plan. Presence of the word "entity" is NEVER an answer. |
> | **Implementation** (`$plan-execute`, `$fix`, and any implementing agent — e.g. `backend-developer`) | The decisions are INPUTS, not questions to reopen: implement each triggered row as the plan/spec decided it, at the owning file it named. A row that arrives UNANSWERED is a blocker — surface it and get it decided; NEVER settle it silently at the keyboard, and NEVER pick an aggregate boundary from a DB table or UI screen because the plan left it open. Paradigm and subdomain fit still gate which rules apply. |
> | **Change review** (`$changes-review`) | Route to the owner — **Mode A (default):** read `$domain-entities-review`'s Phase 2 A–P checklist and apply it as review lenses. **Mode B (escalation):** delegate to `$domain-entities-review` when standalone AND the diff carries 3+ entity files. Findings enter the normal finding set with `file:line` + severity. |
>
> **Duplication guard — SKIP the gate entirely when ANY row holds.** Record the deferral line, then proceed:
>
> | Suppressing context | Deferral line |
> | ------------------- | ------------- |
> | The running skill IS `$domain-entities-review` | `Gate is this skill's own body — A–P checklist owns it.` |
> | Invoked inside `$workflow-review-changes` (its step 4 runs `$domain-entities-review` as a dedicated conditional parallel member) | `Gate deferred to workflow step 4 $domain-entities-review.` |
> | `$why-review` running in `--validate-findings` terminal mode | `Gate N/A — validate-findings is terminal, no sub-skill calls.` |
>
> — why: unguarded, this edge duplicates a review the parent workflow already runs and closes a `changes-review → domain-entities-review → why-review → changes-review` cycle.
>
> **BLOCKED until:** DDD applicability evaluated with project evidence (or the DDD-specific gate is recorded N/A) · if applicable, trigger evaluated (or `gate N/A` recorded), paradigm + subdomain fit stated, all 6 triggered decision points answered or raised as findings, and guard row checked before any delegation.

<!-- /SYNC:domain-entity-change-gate -->

<!-- SYNC:design-review-checklist -->

> **Front-End Design Review Checklist** — the EXECUTABLE review protocol for any artifact carrying a user-facing front-end surface. Full catalog (`A1`…`Q`, ~130 checks with failure signals and default severities): **`.claude/docs/design-review-checklist.md`**. This gate carries the protocol and the triage pass; the file carries the checks.
>
> **Applies when — and ONLY when — the change, plan, or artifact carries a user-facing front-end surface.** A back-end-only diff, a doc edit, or a config change is `N/A`: state that once and move on. NEVER run a UI review on a non-UI change to manufacture coverage. When it DOES apply, **MUST ATTENTION READ `.claude/docs/design-review-checklist.md` and work its sections** — a review that cites a check ID without opening the catalog is asserting, not checking.
>
> **`CL-1` Context before checks (§0.1).** Establish platform · primary user & expertise · primary task · success metric · constraints · review scope · available artifacts. Fewer than four known → state the gap at the top of the report and mark affected findings **low confidence** — why: a check judged against an unknown task is a guess wearing an ID.
>
> **`CL-2` Evidence or nothing (§0.2).** Every finding cites a specific location (screen · element · `file:line`). NEVER invent a measurement — contrast, tap-target size, and load time that cannot be measured from the given artifact are `NOT VERIFIABLE`, never a guessed number. Tag every finding `MEASURED` · `OBSERVED` · `HEURISTIC`. Status values: `PASS` · `FAIL` · `PARTIAL` · `N/A` · `NOT VERIFIABLE`.
>
> **`CL-3` Severity, then a cap (§0.3).** `P0` blocks task completion / loses data / excludes a protected group (ship blocker) · `P1` significant friction or a legal accessibility floor (fix before release) · `P2` measurable inefficiency (next iteration) · `P3` polish (backlog) · `P4` note. Cap the report at the top 10 by severity unless a full audit was requested. A clean section reports "no issues found" — NEVER pad. Every `P0`/`P1` carries a concrete fix.
>
> **`CL-4` Section sweep, in order.** §A core usability heuristics · §B cognitive load & decision design · §C visual design & hierarchy · §D interaction and relevant product states · §E information architecture · **§F web / §G mobile / §H desktop — conditional on platform** · §I accessibility: use WCAG 2.2 AA as the web baseline and meet any stricter applicable legal or project requirement; for other platforms, use the documented platform standard. Record the selected standard and its source; severity follows the governing release contract · §J content & UX writing · §K trust, ethics & privacy · **§L AI & agentic patterns — conditional on the product having AI features** · §M cross-cutting consistency · §N edge-case probes. Make one focused pass per applicable section and record N/A with evidence for sections the surface does not support.
>
> **`CL-5` Quick Triage Pass (§P)** when a full sweep is not possible — use these prompts for applicable surfaces: (1) can a new user complete the primary task unaided · (2) is feedback timely against the project/platform expectation · (3) do relevant empty/loading/error states offer a forward path · (4) is the primary action obvious and reachable for supported inputs · (5) do contrast and focus meet the selected accessibility standard (WCAG 2.2 AA baseline for web) · (6) can users operate the surface with its supported input modes · (7) do interactive targets meet the platform's size/spacing guidance · (8) are destructive actions recoverable where appropriate · (9) does the surface work at its smallest supported size and required zoom/reflow · (10) are there deceptive or coercive patterns.
>
> **`CL-6` Report shape (§O).** Context (+ known gaps) → Verdict (Ship / Ship with fixes / Do not ship) → What works (2–4 specific strengths, cited) → Findings grouped `P0`→`P3`, each with Location · Evidence + tag · Impact · Principle (checklist ID) · Fix → Open questions → Coverage table. Any `P0` caps the grade at Fail regardless of score; report a score only ALONGSIDE findings, never instead of them.
>
> **Component architecture pass (§M6–§M9) when source code is in scope.** Verify the ownership model documented or demonstrated by the project, reuse/composition decisions, and whether shared behavior is duplicated without a reason. Do not require tiers, a base abstraction, or a particular test hierarchy unless the project uses one. Report applicable checklist IDs with `file:line` evidence; do not infer source architecture from a screenshot alone.
>
> **Precedence and no-double-counting.** The project's design-system / SCSS / frontend-pattern docs and accepted ADRs OUTRANK this checklist; the brief's stated direction outranks aesthetic judgment. A deliberate, documented convention is NEVER a defect — check intent before flagging, and surface a genuine conflict to the user with both sides, NEVER resolve it silently. This checklist is the review PROCEDURE, not a third set of taste rules: `UI-1.1`–`UI-9.4` ask "does it meet the usability floor?", `DD-1`–`DD-8` ask "is this THIS product's interface?", and these checks ask "did the review actually look, with evidence, and rank it?". Where a check restates a `UI-*` or `DD-*` clause, report the defect ONCE under whichever ID the consuming skill already uses.
>
> **For a PLAN or a PLAN REVIEW.** When the plan contains UI work, bind applicable acceptance criteria to the target platform/surface, relevant user states, and the selected accessibility standard. Use WCAG 2.2 AA as the web baseline and meet any stricter applicable legal or project requirement; for other platforms, identify the documented platform standard. Identify conditional sections (§F/§G/§H, §L) that apply. Do not require every catalogued state; record the standard and its source, and keep unsupported checks N/A.

<!-- /SYNC:design-review-checklist -->

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `spawn_agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `tmp/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

<!-- /SYNC:parallel-subagent-dispatch -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:domain-entity-change-gate:reminder -->

**MUST ATTENTION** when a changed model uses DDD tactical patterns or an evidenced equivalent, apply the **Domain Entity Change Gate** — `$domain-entities-review` owns the full A–P checklist; detect paradigm + subdomain fit FIRST, then answer all 6 applicable decisions (classification · invariant ownership + failure signalling · aggregate boundary + concurrency · construction vs reconstitution · events · assertion-backed native test obligation). Use property TCs only under the absent-profile default; a malformed declared `specArtifacts` profile blocks without fallback. When the project does not use this model, record the DDD-specific gate N/A and still protect actual invariants and outcomes through the configured owner. Planning must NAME each applicable decision; plan review treats an unanswered row as a FINDING; change review routes to the owner (Mode A read / Mode B delegate). SKIP under the 3-row duplication guard and record the deferral line. — why: one protocol shared by planner and reviewer is what stops a plan shipping an entity design that review then rejects.

<!-- /SYNC:domain-entity-change-gate:reminder -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code/conventions BEFORE any modification or explanation. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- OVERRIDE:double-round-trip-review:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** execute the review loop (aka **Self-Review Convergence Loop**): review → validate findings → fix validated blocking findings → full re-review. Round 1 ends only with zero findings and the persisted `minRounds` met; in round 2, zero CRITICAL/HIGH/MEDIUM ends the loop once the persisted minimum is met and LOW findings are recorded as deferred. Any newly produced output/judgment gets ≥1 self-review; any new judgment gets ≥1 `$why-review --validate-findings` pass before it is treated as final.
- **MANDATORY** apply the **severity floor**: round 1 exits on zero findings at any severity; **in round 2 the bar is zero CRITICAL/HIGH/MEDIUM — LOW findings are no longer required to be fixed, so a LOW-only round ENDS the loop once the persisted minimum is met.** List every deferred LOW in the report; NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to LOW to reach the exit, and NEVER apply the floor to a binary gate (test-green, security must-fix).
- **MANDATORY** enforce the **HARD round cap of 2 with NO extension — a ceiling, NEVER a target**: a clean pass ends the loop once the persisted `minRounds` is met (default 1; explicit 2 requires an independent pass). Round 2 is the LAST review round, so round 2 completing with ANY validated review blocker still open — CRITICAL, HIGH, MEDIUM, an unresolved `NOT VERIFIABLE`, or a failed non-test binary gate → **STOP & escalate by asking the user directly** with every open finding listed, never a silent PASS and never a round 3. The 2-repeated-no-progress blocker rule is an earlier exit — escalate at whichever trips first. A **failing test gate has NO round cap** — keep fixing and re-running until the tests pass, never forcing green; it never escalates for budget. NEVER loop past round 2 on review blockers, and NEVER re-tier a finding to steer what the cap does.

<!-- /OVERRIDE:double-round-trip-review:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files before concluding when graph.db exists. Pattern: grep → graph trace → grep verify.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:cross-service-check:reminder -->

**IMPORTANT MUST ATTENTION** microservices/event-driven: scan producers, consumers, sagas, contracts in task scope. Per touchpoint: owner · message · consumers · risk (NONE/ADDITIVE/BREAKING). Missing consumer = silent regression.

<!-- /SYNC:cross-service-check:reminder -->

<!-- SYNC:estimation-framework:reminder -->

- **MANDATORY MUST ATTENTION** estimation: bottom-up phase hours drive `man_days_traditional` (`Σh/6 × productivity_factor`); SP DERIVED. UI cost usually dominates — bump SP one bucket if NEW UI surface (page/complex form/dashboard). Frontmatter MUST include `story_points`, `complexity`, `man_days_traditional`, `man_days_ai`, `estimate_scope_included`, `estimate_scope_excluded`, `estimate_reasoning` (UI vs backend cost driver). Cap SP 3 for additive-on-existing-model+existing-UI unless test scope >1.5d. SP 13 SHOULD split, SP 21 MUST split.
<!-- /SYNC:estimation-framework:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Before project-specific work, load the OPTIONAL project-config (default `docs/project-config.json`) via its loader. No config is supported — fall back to portable defaults plus repository evidence, state material assumptions, never block. When present: require non-empty `project.name`, use neutral defaults/skips for omitted optional capabilities, and fail closed on a declared malformed section.
- **MANDATORY** Apply an explicit `referenceDocs` array exactly, including `[]`; when absent use only the capability-aware resolver output, which may be empty. Cite `Reference docs read: ...` and note the selected or empty set.
- **MANDATORY** Load detail JUST IN TIME, immediately before the first target read/grep/edit/test — a hook event or a prior turn is NEVER evidence that the current files were read. Re-resolve selection and re-read after compaction, resume, delegation, or a context change.
- **MANDATORY** The project-init-owned `lessons.md` and docs-index inputs are always-on at their configured owner paths, read independently of task-specific `referenceDocs`. A missing/stale root instruction file or required reference doc, or a malformed declared config section → auto-run `$project-init` (or the narrow lower-level route) before relying on that input. An absent config never gates work — offer `$project-init` or `$project-config` once. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

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

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:design-review-checklist:reminder -->

- **MUST ATTENTION** when the change/plan/artifact has an applicable user-facing UI surface, READ `.claude/docs/design-review-checklist.md` and run it: `CL-1` establish context first (platform · user · task · metric · constraints · scope · artifacts — state missing context and its confidence impact) · `CL-2` evidence or nothing, cite a location per finding, NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), tag `MEASURED`/`OBSERVED`/`HEURISTIC` · `CL-3` rank `P0`–`P4`, cap at top 10 by severity, NEVER pad, concrete fix on every `P0`/`P1` · `CL-4` sweep §A–§N, applying only relevant platform/product sections and the WCAG 2.2 AA web baseline plus any stricter applicable legal/project requirement, or the documented standard for other platforms · `CL-5` short on time → use the §P prompts · `CL-6` report in the §O shape · for source code, assess component ownership, base abstractions, reuse, and duplication using the project's documented taxonomy or observed boundaries. Project design-system docs and ADRs OUTRANK the checklist; report a defect ONCE across `UI-*`/`DD-*`/`CL-*`. For a plan, bind only applicable sections and states to acceptance criteria. Skip when the work has no user-facing UI surface, and state why.

<!-- /SYNC:design-review-checklist:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:review-principle-awareness -->

> **Review Applicability / Current-Principles Awareness** — Every review must first classify the change context (greenfield foundation, brownfield feature/refactor, test/docs/config/UI/infra, or actor-facing/machine surface) and take notice of the applicable current principles below. This is an evidence-gated applicability check, not a mandate to flag or build every item.
>
> **Detailed protocol routing — read/apply only when warranted:**
> - `SYNC:scale-ready-foundation` — greenfield foundation is blocking; big-feature brownfield fit/adapt/defer; architecture review is advisory when auditing. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`.
> - `SYNC:test-architecture-execution-contract` — assertion-bearing tests use the project's configured/native format, name the guarded intent/technical contract, and assert an owned outcome; GWT is one valid format. Detailed carriers: `integration-test`, `workflow-greenfield-init`, and the test-architecture review path.
> - `SYNC:ai-agent-as-user-access` — when an AI/machine actor or future contract is evidenced, inspect identity/delegation, capability boundaries, selected API/CLI/MCP/WebMCP/event/SDK surface, safety/consent, audit/observability, and native-format contract tests. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`, `architecture-review`.
> - `SYNC:design-system-check` — when UI changes, inspect the design-system and component-contract obligations; route visual/UX depth to the owning UI review.
>
> **Review behavior:** Check only principles applicable to the reviewed scope; record `APPLY-NOW`, `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, `BLOCKED`, or `UNVERIFIED` with `file:line`/config/CI evidence, status/severity, owner/route, and next step/revisit trigger. Do not invent findings from a generic checklist, flag unrelated pre-existing gaps as regressions, silently expand the requested scope, or mutate a parent gate merely because advice exists.
>
> **Ownership:** `changes-review` coordinates the applicability pass and routes depth to the owning specialist (`architecture-review`, `integration-test-review`, `security-review`, `performance-review`, `ui-review`, `production-readiness-review`, or another matching review). A specialist reports its own lens and does not duplicate or override another review's verdict; existing brownfield gaps stay advisory unless new, safety-relevant, or explicitly in scope.
>
> **Required review note:** `context/scope | principle/protocol checked | evidence | status/verdict | severity | owner/route | next step/revisit trigger`.
>
> **BLOCKED when:** an applicable principle is required for safety/correctness but missing, unowned, or untestable. Otherwise record an evidence-backed `NOT-APPLICABLE`, advisory, `DEFER-AS-OPPORTUNITY`, or `UNVERIFIED` result according to the lifecycle and change context; creating a greenfield foundation remains subject to its own blocking protocol.

<!-- /SYNC:review-principle-awareness -->

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Block implementation until each plan is hallucination-free (existing-code claims have `file:line` proof) and implementation-ready (every phase is concrete and small enough to code immediately); validate findings, fix only validated plan issues, and full-re-review until the round's exit bar is clear — within a HARD cap of 2 review rounds, escalating to the user instead of opening a round 3 (a failing test gate is outside that budget and loops until green).

**IMPORTANT MUST ATTENTION Applicability:** review Dimension 0 before implementation detail. An embedded plan without the complete decomposition block/slice evidence, an explicit-roadmap plan without an approved milestone/scope/scenario chain, a framework plan without technical evidence, or an isolated plan without its reason/owner is BLOCKED.

**IMPORTANT MUST ATTENTION Main steps (run in order, one task each):** Phase 0 detect plan type → Step 1 read `plan.md`/`goal.md`/all `phase-*.md` → Step 2 dispatch the Parallel Review Wave in ONE message (unconditional `$why-review` rationale sub-agent + triggered lens sub-agents) and meanwhile evaluate the 4 checklist groups (Validity · Correctness [Granularity + Anti-Hallucination + conditional Project Pattern Alignment + spec/TC coverage + Goal-Contract mapping] · Best Practices · Completeness) + Adversarial Techniques 1-6 + 11 + 9 Plan Dimensions + graph-trace each modified file → all-return barrier, merge why-review (Techniques 7-10) + lens reports, close the Anti-Bias Gate → Step 3 score PASS/WARN/FAIL → Step 4 output result → the **Findings Validation Gate** + **Recursive Fix-and-Review Protocol**: `$why-review --validate-findings` → fix validated blocking findings → full re-review until the current round's exit bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred) — why: AI keeps forgetting the skill's own step pipeline; this is the read-this-if-nothing-else order.

**IMPORTANT MUST ATTENTION Impact-aware review:** before scoring, derive every affected surface, run its required review lens (`$ui-review` for frontend, `$domain-entities-review` for entity changes, plus backend, data, security, integration, E2E, performance, dependency, or framework review when triggered) as sub-agents in the same wave as the always-on `$why-review` rationale sub-agent, and record evidence for every N/A row — why: base-plan quality cannot catch a specialist concern that was never selected.

**IMPORTANT MUST ATTENTION** Protocols in force (concise digest of the SYNC/shared blocks this skill carries) — each line is a signpost to its canonical body above; NEVER treat the digest as a substitute for the full block, and ALWAYS apply every protocol below in full:

- **Behavioral Delta Matrix:** bugfix reviews need input × pre × post × delta table before verdict.
- **Graph-Assisted Investigation:** run one graph command on key files when graph.db exists.
- **Cross-Service Check:** scan producers, consumers, sagas, contracts; missing consumer = silent regression.
- **Fresh Context Review:** spawn zero-memory sub-agents (core + `$why-review` rationale + lenses) re-reading from scratch after each fix cycle.
- **Nested Task Creation:** expand child phase tasks; link the parent workflow row when nested.
- **Task Tracking & External Report:** bootstrap task breakdown; persist findings to `tmp/reports/` incrementally.
- **Critical Thinking:** every claim needs traced `file:line` proof; never present guess as fact.
- **Sequential Thinking:** multi-step Thought N/M with REVISION/BRANCH/HYPOTHESIS markers and confidence closer.
- **Project Reference Docs:** read required project-reference docs before target work; conventions override generic defaults.
- **Conditional Project Pattern Alignment:** always verify `code-review-rules.md`; verify frontend/backend pattern refs only when plan scope triggers them; inspect source examples when implementation code exists; unexplained deviation or missing evidence blocks PASS.
- **Understand Code First:** grep 3+ patterns and read code before any modification.
- **Double Round-Trip Review:** review → validate findings → fix only current-round blocking findings → full re-review until the severity bar is clear (Round 1: zero findings; Round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred; binary gates always block).
- **Review Protocol Injection:** embed all 11 protocol bodies verbatim into every fresh review prompt.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Severity Rubric:** classify Critical/High/Medium/Low by consequence using `SYNC:severity-rubric`; round 1 blocks on every validated finding, round 2 blocks only CRITICAL/HIGH/MEDIUM, and LOW is recorded/deferred. Failed binary gates always block.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing — every plan-review pass is one such wave with the `$why-review` rationale sub-agent always a member.

**IMPORTANT MUST ATTENTION** review as SKEPTIC not validator — your job: find what cannot work, not confirm what looks right; run the full Anti-Bias Gate (reality check, assumption stress-test, pre-mortem, contrarian pass in the core pass; steel-man rejected alternative, unseen alternative, pros/cons symmetry from the merged `$why-review` wave report) BEFORE any verdict — why: confirmation bias rubber-stamps well-structured plans.
**MANDATORY IMPORTANT MUST ATTENTION** Anti-Hallucination Gate — every plan claim about existing source code needs `file:line` proof (file exists, symbol grepped, behavior code-traced); "should be"/"probably"/"typically" about existing code = FAIL. Greenfield-only plans → PASS.
**MANDATORY IMPORTANT MUST ATTENTION** Conditional Project Pattern Alignment Gate — independently read `docs/project-config.json`, `docs-index-reference.md`, `lessons.md`, `code-review-rules.md`, and the frontend/backend pattern reference(s) triggered by plan scope; verify every major decision against the applicable documented pattern and source examples when implementation code exists (≥3 when 3 exist, otherwise explicit scarcity/N/A). Generic framework guidance, dead citations, stale docs, or unexplained deviation = FAIL.
**MANDATORY IMPORTANT MUST ATTENTION** Granularity Gate "Detailed & Small Enough" — FAIL any phase >5 files OR >3h OR carrying planning verbs (research/determine/decide/evaluate/explore/investigate); too vague → detail it (file paths, exact method names), too big → break it into sibling phases/sub-plans — why: a plan you can't immediately code from is NOT ready.
**MANDATORY IMPORTANT MUST ATTENTION** detect plan type FIRST (Phase 0) — bugfix MANDATES the Behavioral Delta Matrix (≥3 rows, ≥1 outside the bug report, any REGRESSION → FAIL until a preservation test covers it); security/perf/refactor/contract/infra each add their own focus.
**MANDATORY IMPORTANT MUST ATTENTION** spec-loop scheduling — plan must schedule property/invariant test specs for every `[HARD]` §4 rule / §5 invariant + a MUTATION-SCORE quality bar; FAIL a plan targeting a line-coverage % instead of a mutation-score bar.
**MANDATORY IMPORTANT MUST ATTENTION** when ANY finding exists, run `$why-review --validate-findings` BEFORE editing any `plan.md`/`phase-*.md`; fix ONLY validated blocking findings at the smallest responsible location, then restart the FULL review wave with a fresh zero-memory core sub-agent + a fresh `$why-review` rationale sub-agent + triggered lenses — loop until the current round's bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred); NEVER edit plan files before this gate passes — why: unvalidated fixes corrupt the plan and waste review rounds.
**MANDATORY IMPORTANT MUST ATTENTION** round cap 2 — HARD, NO extension, a CEILING never a target: round 1 = initial review, round 2 = the single re-review after fixes, and for review blockers there is NEVER a round 3 (the canonical extension is refused here — see `OVERRIDE:review-policy`, `OVERRIDE:double-round-trip-review`, `OVERRIDE:fresh-context-review`, and the scope note on `SYNC:severity-rubric`). A failing TEST gate is the sole carve-out: it sits OUTSIDE the round budget and loops until green, never forcing green. A clean pass ends the loop once the persisted `minRounds` is met; escalate by asking the user directly — listing every open finding — when round 2 completes with ANY validated blocking finding open (CRITICAL, HIGH, MEDIUM, or an unresolved `NOT VERIFIABLE`), when the SAME blocker survives 2 consecutive full re-reviews with no progress, or when a finding needs product/owner judgment. NEVER open round 3, NEVER re-tier or weaken the bar to exit, and NEVER convert cap exhaustion into a PASS.
**MANDATORY IMPORTANT MUST ATTENTION** bootstrap task tracking task breakdown BEFORE reads/grep/edits (one task per file read); persist findings to `tmp/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` incrementally and synthesize from disk; add a final review task — why: long plan files exhaust context, the report file is ground truth.
**MANDATORY IMPORTANT MUST ATTENTION** run a graph trace on each "files to modify" entry when `.code-graph/graph.db` exists; flag any downstream file NOT listed in the plan as "potentially missed" — why: catches cross-service/event-handler impact the author overlooked.
**MANDATORY IMPORTANT MUST ATTENTION** Dimension 7 — Estimation Drift: re-derive `bottom_up_hours = Σ phase_hours` from the FINALIZED phase files per the carried `SYNC:estimation-framework` and compare against frontmatter. `|delta| > 20%` → frontmatter MUST carry `reestimate_delta_pct` + a 1-line `reestimate_reason`, and a missing update is a FAIL; `|delta| > 50%` → flag `SHOULD-RESCOPE` and surface the rescope decision to the user BEFORE implementation — why: pre-completion estimates anchor on a scope guess, and locked phases are the first place the real cost is visible.
**MANDATORY IMPORTANT MUST ATTENTION** Dimension 8 — Domain Entity Design (CONDITIONAL): when the plan touches an entity, value object, or aggregate, apply `SYNC:domain-entity-change-gate` — the SAME protocol `$plan` authored under and `$changes-review` reviews under. An unanswered, hand-waved, or deferred-to-implementation decision point is a FINDING with `file:line` into the plan; the word "entity" in a task is NEVER an answer. Verify paradigm + subdomain fit are stated BEFORE any entity task, and that each triggered row names its OWNING FILE. State `No domain-entity surface — Dimension 8 N/A` when it does not fire — why: an aggregate boundary chosen by DB table or UI screen is the costliest decision to reverse after implementation.
**MANDATORY IMPORTANT MUST ATTENTION** standalone runs end with ask the user directly presenting findings + next-step options; skip ONLY inside a workflow.
**MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every finding (confidence >80% to act, <60% DO NOT recommend); NEVER mark PASS while any spec/test/code face disagrees without a logged finding.
**MANDATORY IMPORTANT MUST ATTENTION** READ before reviewing: `.claude/skills/shared/product-roadmap-contract.md` for the Applicability / Plan Gate check, then `.claude/docs/development-rules.md`, plus `code-review-rules.md` and `lessons.md` from the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path), plus skill-specific pattern refs (backend/frontend/integration-test).

**Anti-Rationalization:**

| Evasion | Rebuttal |
| ------- | -------- |
| "Plan looks reasonable" | Structure ≠ correctness. Prove every existing-code claim with `file:line`; plausible text is not evidence. |
| "Phases are well-defined" | Presence of phases ≠ implementable. Apply the 5-point Granularity Gate per phase. |
| "One review pass enough" | Re-review after a validated-finding fix cycle or an explicitly required independent pass; a clean COMPLETE pass ends the loop once the persisted `minRounds` is met. |
| "Implementation can fill gaps" | FAIL vague steps now — implementation executes the plan, it does not invent it. |
| "Alternatives were considered" | Were they real, or strawmen set up to fail? Steel-man the rejected one. |
| "Risk is managed" | "Monitor closely" is not a mitigation. Demand action, owner, trigger. |
| "Already traced the code" | Show `file:line` / grep evidence. No proof = no trace. |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking; add a final review task.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.

**IMPORTANT MUST ATTENTION Goal:** Block implementation until each plan is hallucination-free (existing-code claims have `file:line` proof) and implementation-ready (every phase is concrete and small enough to code immediately); validate findings, fix only validated plan issues, and full-re-review until the round's exit bar is clear — within a HARD cap of 2 review rounds, escalating to the user instead of opening a round 3 (a failing test gate is outside that budget and loops until green).
**IMPORTANT MUST ATTENTION** review as SKEPTIC — `file:line` proof for every existing-code claim; FAIL vague/oversized phases; bugfix → Behavioral Delta Matrix.
**IMPORTANT MUST ATTENTION** validate findings via `$why-review --validate-findings` before editing plan files; fix only validated blocking findings; restart full review until the current round's exit bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred).
**IMPORTANT MUST ATTENTION** EVERY review pass (round 1 and every re-review) is ONE parallel wave: core pass + an UNCONDITIONAL full-mode `$why-review` rationale sub-agent over `plan.md`/`goal.md`/`phase-*.md` + each triggered lens sub-agent, spawned in ONE message; wait for ALL, merge, then verdict — the why-review member is never N/A, and a missing return means re-dispatch or inline rationale lens, never a silent PASS; no sub-agent capability → run the same members inline sequentially and record `host/sub-agent fan-out unavailable → inline fallback`.

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
## Common AI Mistake Prevention (System Lessons)

- **Resolve project applicability before using framework examples.** Read the project config and relevant references, then inspect local evidence; honor explicit N/A and never impose a language, framework, architecture layer, styling method, tool, or runtime surface the project does not use.
- **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
- **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **Ownership before action.** When investigating a failure, ask which part owns the behavior before changing anything. Trace the wrong state to the component responsible for its invariant, then make one authoritative correction there.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec if one exists (the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, and state). Verify each against evidence, not intuition. Ask "what would falsify this?" — if nothing, it is not a hypothesis. The most expensive failure is going deeper into an assumed area while the real issue sits in an unexamined condition.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem; avoid unrelated cleanup. For review or enhancement work, announce improvements beyond the main request rather than silently expanding scope. Ask: "Would this change exist if I were not addressing this request?" — if not, remove it or disclose it.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Judge the environment before judging the code — a competing hypothesis, not a fallback.** A bug, failed test, error, or odd output is NOT proof of a code defect. Before deep tracing and before any verdict, sweep environment preconditions (toolchain/dependency/lockfile state, stale build or cache artifacts, env vars and config profile, service dependencies up-migrated-seeded, ports/network/clock, OS-path/locale, permissions and locks, leftover processes/containers/test data) AND transient resource pressure (RAM/OOM, CPU saturation under parallel workers, disk/temp exhaustion, handle and connection-pool limits, network flakiness, a timeout that is really slowness). Tell-tale shape: non-deterministic, timing-dependent, passes alone but fails in parallel, fails only on one machine or only on CI, or an error naming resources rather than business rules. Cite the discriminator you ran (clean environment? did code on the failing path change since it last passed? one machine or all? concurrency 1 or a clean rebuild?) — a verdict without one is a guess, for code as much as for the environment. Fix an environment cause in the environment or setup; NEVER edit product code or weaken/skip a test to absorb it, and a failure that vanishes on retry stays unexplained until its mechanism is named. — why: forcing green against an environment fault hides the real defect and permanently rots the test.
- **Cross-platform execution is a required contract.** Before authoring or changing a tool, script, process launcher, path assertion, or filesystem test, name the supported Windows, macOS, and Linux behaviors. Use platform-neutral Node APIs and literal argv vectors; never infer shell, temporary-path, executable-extension, ACL, or symlink semantics from the current host. Canonicalize existing paths before identity, hashing, or equality checks; test native Windows and POSIX seams when behavior differs; keep CI platform matrices authoritative. Preserve fail-closed security boundaries — repair the fixture or platform branch, never weaken the guard just to make one OS green.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
