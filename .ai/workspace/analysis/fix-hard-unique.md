
      <!-- /SYNC:estimation-framework:reminder -->
   1.5. Write investigation results to `.ai/workspace/analysis/{issue-name}.analysis.md`. Re-read ENTIRE file before planning fix.
## Closing Reminders
## Debug Mindset (NON-NEGOTIABLE)
## Next Steps (Standalone: MUST ATTENTION ask user via `AskUserQuestion`. Skip if inside workflow.)
## Quick Summary
## Workflow:
## ⚠️ MANDATORY: Confidence & Evidence Gate
### Fix the issue
### Fullfill the request
* **IMPORTANT:** In reports, list any unresolved questions at the end, if any.
* **IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
**95%+** recommend freely | **80-94%** with caveats | **60-79%** list unknowns | **<60% STOP — gather more evidence.**
**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**
**Goal:** Systematically diagnose and fix complex bugs using parallel subagent investigation.
**IMPORTANT MUST ATTENTION** STOP after 3 failed fix attempts — report outcomes, ask user before #4
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** trace full data flow and fix at the owning layer, not the crash site. Audit all access sites before adding `?.`.
**Key Rules:**
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:
**MANDATORY IMPORTANT MUST ATTENTION** declare `Confidence: X%` with evidence list + `file:line` proof for EVERY claim.
**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
**Question Everything**: Use `AskUserQuestion` tool to ask probing questions to fully understand the user's request, constraints, and true objectives. Don't assume - clarify until you're 100% certain.
**REMEMBER**:
**Ultrathink** to plan & start fixing these issues follow the Orchestration Protocol, Core Responsibilities, Subagents Team and Development Rules:
**Workflow:**
**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
- **"/prove-fix"** — Prove fix correctness with code traces
- **"/test"** — Run tests to verify fix
- **"Proceed with full workflow (Recommended)"** — I'll detect the best workflow to continue from here (fix applied). This ensures prove-fix, review, testing, and docs steps aren't skipped.
- **"Skip, continue manually"** — user decides
- **After fixing, MUST ATTENTION run `/prove-fix`** — build code proof traces per change with confidence scores. Never skip.
- **MANDATORY MUST ATTENTION** estimation: bottom-up phase hours drive `man_days_traditional` (`Σh/6 × productivity_factor`); SP DERIVED. UI cost usually dominates — bump SP one bucket if NEW UI surface (page/complex form/dashboard). Frontmatter MUST include `story_points`, `complexity`, `man_days_traditional`, `man_days_ai`, `estimate_scope_included`, `estimate_scope_excluded`, `estimate_reasoning` (UI vs backend cost driver). Cap SP 3 for additive-on-existing-model+existing-UI unless test scope >1.5d. SP 13 SHOULD split, SP 21 MUST split.
- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.
- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.
- Always create a plan before implementing complex fixes
- Ask 1 question at a time, wait for the user to answer before moving to the next question.
- Ask the user if they want to commit and push to git repository, if yes, use `git-manager` subagent to commit and push to git repository.
- Challenge completeness: "Are there other contributing factors?" → check related code paths
- Debug Mindset: every claim needs `file:line` evidence
- Do NOT assume the first hypothesis is correct — verify with actual code traces
- Every root cause claim must include `file:line` evidence
- For image editing (removing background, adjusting, cropping), use `media-processing` skill as needed.
- If you cannot prove a root cause with a code trace, state "hypothesis, not confirmed"
- If you don't have any questions, start the next step.
- If you have any questions, use `AskUserQuestion` tool to ask the user to clarify them.
- No "should fix it" without proof — verify the fix addresses the traced root cause
- Question assumptions: "Is this really the cause?" → trace the actual execution path
- Report back to user with a summary of the changes and explain everything briefly, guide user to get started and suggest the next steps.
- Use subagents for parallel investigation of multiple hypotheses
- You always read and analyze the generated assets with `ai-multimodal` skills to verify they meet requirements.
- You can always generate images with `ai-multimodal` skills on the fly for visual assets.
- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (read directly when relevant; do not rely on hook-injected conversation text)
---
1. **Scout** — Use scout/researcher subagents to explore the issue in parallel
1. Use `debugger` subagent to find the root cause of the issues and report back to main agent.
2. **Diagnose** — Trace root cause through code paths with evidence
2. Use `researcher` subagent to research quickly about the root causes on the internet (if needed) and report back to main agent.
3. **Plan** — Create fix plan with impact analysis
3. Use `planner` subagent to create an implementation plan based on the reports, then report back to main agent.
4. **Fix** — Implement and verify the fix
4. **🛑 Present root cause + fix plan → `AskUserQuestion` → wait for user approval.**
5. Then use `/code` SlashCommand to implement the plan step by step.
6. Final Report:
<!-- /SYNC:ai-mistake-prevention -->
<!-- /SYNC:ai-mistake-prevention:reminder -->
<!-- /SYNC:critical-thinking-mindset -->
<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- /SYNC:estimation-framework -->
<!-- /SYNC:evidence-based-reasoning -->
<!-- /SYNC:evidence-based-reasoning:reminder -->
<!-- /SYNC:fix-layer-accountability -->
<!-- /SYNC:fix-layer-accountability:reminder -->
<!-- /SYNC:nested-task-creation -->
<!-- /SYNC:nested-task-creation:reminder -->
<!-- /SYNC:project-reference-docs-guide -->
<!-- /SYNC:project-reference-docs-guide:reminder -->
<!-- /SYNC:root-cause-debugging -->
<!-- /SYNC:task-tracking-external-report -->
<!-- /SYNC:task-tracking-external-report:reminder -->
<!-- /SYNC:understand-code-first -->
<!-- /SYNC:understand-code-first:reminder -->
<!-- SYNC:ai-mistake-prevention -->
<!-- SYNC:ai-mistake-prevention:reminder -->
<!-- SYNC:critical-thinking-mindset -->
<!-- SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:estimation-framework -->
<!-- SYNC:estimation-framework:reminder -->
<!-- SYNC:evidence-based-reasoning -->
<!-- SYNC:evidence-based-reasoning:reminder -->
<!-- SYNC:fix-layer-accountability -->
<!-- SYNC:fix-layer-accountability:reminder -->
<!-- SYNC:nested-task-creation -->
<!-- SYNC:nested-task-creation:reminder -->
<!-- SYNC:project-reference-docs-guide -->
<!-- SYNC:project-reference-docs-guide:reminder -->
<!-- SYNC:root-cause-debugging -->
<!-- SYNC:task-tracking-external-report -->
<!-- SYNC:task-tracking-external-report:reminder -->
<!-- SYNC:understand-code-first -->
<!-- SYNC:understand-code-first:reminder -->
<issues>$ARGUMENTS</issues>
>
>     (a) UI tier — row applied
>     (b) Backend tier — row applied
>     (c) Test scope — case breakdown by driver, file count, fixtures, tier row
>     (d) Cost driver — dominant tier + why
>     (e) Blast radius — touched, complex, regression scope
>     (f) Risk factors — list driving margin; why not larger/smaller
>     1 new fixture → tier 13-25 ~1.5d. Driver: UI composition + new states. Blast: 4 areas, 1 complex.
>     5-7 lines covering:
>     Example: "UI: compose Form/Table/Dialog → NEW screen (~1.5d). Backend: NEW command on existing aggregate,
>     Risk: base 35% + touches-complex +20% = 55% → max 3.9d → range 2.5-4d."
>     complex_touched: <n>
>     downstream_consumers: [list or count]
>     reuses validation+repo (~1d). Tests: 4 transitions × 2 actors + 3 validation + 2 UI states = 13 cases,
>     shared_common_code: yes | no
>     touched_areas: <n>
> **AI Mistake Prevention** — Failure modes to avoid on every task:
> **AI speedup:** SP 1≈2x · 2-3≈3x · 5-8≈4x · 13+≈5x. AI cost = `(code_gen × 1.3) + (test_gen × 1.3)` (30% review overhead).
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
> **Anti-patterns (REJECT these):**
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
> **BLOCKED until:** `- [ ]` Full data flow traced (origin → crash) `- [ ]` Invariant owner identified with `file:line` evidence `- [ ]` All access sites audited (grep count) `- [ ]` Fix layer justified (lowest layer that protects most consumers)
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence
> **Blast Radius (mandatory pre-pass — affects code AND test):**
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.
> **Blocked until:** scope evaluated, required docs checked/read, `lessons.md` confirmed, citation emitted.
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Collapse rule:** total margin >100% → STOP, split (padding past 2x is dishonesty). Margin <15% on `likely_days ≥5` → under-estimated, widen.
> **Cost Driver Heuristic (apply BEFORE work-type row):**
> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Estimation Framework** — Bottom-up first; SP DERIVED; output min-max range when likely ≥3d. Stack-agnostic. Baseline: 3-5yr dev, 6 productive hrs/day. AI estimate assumes Claude Code + project context.
> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
> **Fix-Layer Accountability** — NEVER fix at the crash site. Trace the full flow, fix at the owning layer.
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`
> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If this skill was called **outside a workflow**, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:
> **MANDATORY before ANY fix:**
> **MANDATORY frontmatter:**
> **Method:**
> **NEVER:** Guess without evidence. Fix symptoms instead of cause. Skip reproduction step.
> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
> **Productivity factor:** 0.8 strong scaffolding+codegen+AI hooks · 1.0 mature default · 1.2 weak patterns · 1.5 greenfield
> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
> **Reuse-vs-Create axis (PRIMARY lever, per layer):**
> **Risk Margin (drives max bound):**
> **Risk-factor add-ons (additive — enumerate in `risk_factors`):**
> **Root Cause Debugging** — Systematic approach, never guess-and-check.
> **Rule:** Complex touch → add `risk_factors`. Each downstream consumer → +1-3 regression cases. Blast >5 areas OR >2 complex → re-evaluate SPLIT before estimating.
> **Rule:** Sum tiers across UI+backend+tests, apply productivity factor. Reuse short-circuits tiers — call out.
> **SP→Days (validation only):** 1=0.5d/0.25d · 2=1d/0.35d · 3=2d/0.65d · 5=4d/1.0d · 8=6d/1.5d · 13=10d/2.0d (Trad/AI likely)
> **Sanity self-check:**
> **Skill Variant:** Variant of `/fix` — deep investigation with subagents for complex issues.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
> **Test multipliers:** new fixture/seed harness +0.5d · cross-service/bus assertion +0.3d each · UI E2E ×1.5 · each new role +1-2 cases
> **Test-Scope drivers (compute test_count EXPLICITLY — "+tests" hand-wave is #1 failure):**
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Work-Type Caps (hard ceilings on `likely_days`):**
> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.
> **⚠️ Validate Before Fix (NON-NEGOTIABLE):** After root cause + plan creation, MUST ATTENTION present findings + proposed fix plan to user via `AskUserQuestion` and get explicit approval BEFORE any code changes. No silent fixes.
> - "Add defensive checks at every consumer" — Scattered defense = wrong layer. One authoritative fix > many scattered guards.
> - "Both fix is safer" — Pick ONE authoritative layer. Redundant checks across layers send mixed signals about who owns the invariant.
> - "Fix it where it crashes" — Crash site ≠ cause site. Trace upstream.
> - **Backend dominates ONLY:** multi-aggregate invariants, cross-service contracts, schema migrations, heavy query/perf, new event flows
> - **UI dominates** in CRUD/business apps — 1.5-3x backend (states, validation, responsive, a11y, polish)
> - Backend cross-service / migration / multi-aggregate? → SP 8+ regardless of UI
> - Blast `>5` areas OR `>2` complex, no split discussion? → reject
> - Complex existing feature touched, no regression budget in `(c)`? → reject
> - Margin <15% on `likely_days ≥5d`? → under-estimated, widen
> - Margin >100%? → STOP, split instead of buffer
> - NEW UI surface (page/complex form/dashboard)? → SP 5+ even if backend one endpoint
> - Purely additive on existing model AND existing UI? → cap SP 3 unless tests >1.5d
> - Reasoning called out UI vs backend vs blast vs risk factors? → if missing, add
> - Without tests, SP drops ≥1 bucket? → tests dominate; state explicitly
> - `bottom_up_hours / 6` vs SP-Days disagreement >50%? → trust bottom-up, downgrade SP
> - `likely_days ≥3d` and single-point? → reject, must be range
> 1. **Blast Radius pass** (below) — drives code AND test cost
> 1. **Reproduce** — Confirm the issue exists with evidence (error message, stack trace, screenshot)
> 1. **Trace full data flow** — Map the complete path from data origin to crash site across ALL layers (storage → backend → API → frontend → UI). Identify where the bad state ENTERS, not where it CRASHES.
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 1. Files/components directly modified — count
> 1. Identify scope: file types, domain area, and operation.
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. **Identify the invariant owner** — Which layer's contract guarantees this value is valid? That layer is responsible. Fix at the LOWEST layer that owns the invariant — not the highest layer that consumes it.
> 2. **Isolate** — Narrow to specific file/function/line using binary search + graph trace
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 2. Decompose phases → hours/phase → `bottom_up_hours = Σ phase_hours`
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 2. Of those, "complex" (>500 LOC, multi-handler, central, frequently-modified) — count
> 2. Read existing files in target area — understand structure, base classes, conventions
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-docs-reference.md`; architecture/new area `project-structure-reference.md`.
> 3. **One fix, maximum protection** — Ask: "If I fix here, does it protect ALL downstream consumers with ONE change?" If fix requires touching 3+ files with defensive checks, you are at the wrong layer — go lower.
> 3. **Trace** — Follow data flow from input to failure point. Read actual code, don't infer.
> 3. Cross-service validation required for architectural changes
> 3. Downstream consumers (callers, event subscribers, cross-service) — list
> 3. For plan/review work, create `plans/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 3. Read every required doc that exists; skip absent docs as not applicable. Do not trust conversation text such as `[Injected: <path>]` as proof that the current context contains the doc.
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 3. `likely_days = ceil(bottom_up_hours / 6) × productivity_factor`
> 4. "I don't have enough evidence" is valid and expected output
> 4. **Hypothesize** — Form theory with confidence %. State what evidence supports/contradicts it
> 4. **Verify no bypass paths** — Confirm all data flows through the fix point. Check for: direct construction skipping factories, clone/spread without re-validation, raw data not wrapped in domain models, mutations outside the model layer.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 4. Before target work, state: `Reference docs read: ... | Missing/not applicable: ...`.
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 4. Shared/common code touched (multi-app blast) — yes/no
> 4. Sum **Risk Margin** (base + add-ons) → `max_days = likely_days × (1 + margin)`
> 5. **Verify** — Test hypothesis with targeted grep/read. One variable at a time.
> 5. Final output cites `Full report: plans/reports/{filename}`.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 5. Regression scope — areas needing re-test
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 5. `min_days = likely_days × 0.9`
> 6. **Fix** — Address root cause, not symptoms. Verify fix doesn't break callers via graph `connections`
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
> 6. Output as range when `likely_days ≥3`; single point allowed `<3` (still record margin)
> 6. Re-read analysis file before implementing — never work from memory alone
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation
> 7. `man_days_ai` = same range × AI speedup
> 8. `story_points` DERIVED from `likely_days` via SP-Days — NEVER driver. Disagreement >50% → trust bottom-up
> AI default behavior: see error at Place A → fix Place A. This is WRONG. The crash site is a SYMPTOM, not the cause.
> If already inside a workflow, skip — the workflow handles sequencing.
> ```
> ```yaml
> blast_radius:
> complexity: low | medium | high | critical
> estimate_reasoning: |
> estimate_scope_excluded: [unit-tests, e2e, perf, deployment, code-review-rounds]
> estimate_scope_included: [code, integration-tests, frontend, i18n, docs]
> man_days_ai: '<min>-<max>d'
> man_days_traditional: '<min>-<max>d' # range when likely ≥3d; '<N>d' when <3d
> risk_factors: [touches-complex-existing-feature, regression-fan-out] # closed-list from add-ons; [] if none
> risk_margin_pct: <n> # base + add-ons
> story_points: <n>
> | **Additive endpoint + minor UI control** (button/menu/column), reuses fixtures | **3** | **2-3d** |
> | --- | --- | --- |
> | ------------------- | ------------------------------- |
> | --------------------------------- | ------------------------------------------------------ |
> | ------------------------------------------ | -------- |
> | -------------------------------------------- | -------- |
> | ---------------------------------------------------- | --------- |
> | --------------------------------------------------------------------- | ------- |
> | 1-2d small additive | +20%                            |
> | 1-5 cases, fixtures reused                 | 0.3-0.5d |
> | 13-25 cases, multi-entity setup            | 1-2d     |
> | 26-50 cases OR new state-machine coverage  | 2-3d     |
> | 3-4d real feature   | +35%                            |
> | 5-7d large          | +50%                            |
> | 6-12 cases, 1 new fixture                  | 0.5-1d   |
> | 8-10d very large    | +75%                            |
> | <1d trivial         | +10%                            |
> | >10d                | +100% AND **flag SHOULD SPLIT** |
> | >50 cases OR full E2E journey              | 3-5d     |
> | Add control/column to existing screen        | 0.3-0.8d |
> | Add property to existing model + bind to existing UI | 2 | 1d |
> | Additive endpoint + **NEW UI surface** OR additive multi-layer + new domain rule + 2+ test files | 5 | 3-5d |
> | Authorization matrix              | (owner, non-owner, elevated, unauth) × each mutation   |
> | Backend tier                                         | Cost      |
> | Beyond | 21 | MUST split |
> | Compose components into NEW screen           | 1-2d     |
> | Cross-service contract + migration combined | 13 | SHOULD split |
> | Driver                            | Count                                                  |
> | Factor                                                                | +margin |
> | Happy-path journeys               | 1 per story / AC main flow                             |
> | Multi-aggregate invariant / heavy domain rule        | 3-5d      |
> | Multi-entity state combos         | state(A) × state(B) — REACHABLE only, not Cartesian    |
> | NEW UI surface + (NEW aggregate OR migration OR cross-service contract) | 13 | SHOULD split |
> | NEW aggregate/entity (repo, validation, events)      | 2-4d      |
> | NEW command/handler on existing aggregate (additive) | 1-2d      |
> | NEW cross-service contract OR schema migration       | 2-4d each |
> | NEW model/aggregate OR migration OR cross-module contract OR heavy test (>1.5d) OR NEW UI + non-trivial backend | 8 | 5-7d |
> | NEW query on existing repo/model                     | 0.5-1d    |
> | NEW screen, custom layout/states/validation  | 2-4d     |
> | NEW shared/common component (themed, tested) | 3-6d+    |
> | Negative paths / invariants       | 1 per violatable business rule                         |
> | Reuse component on existing screen           | 0.1-0.3d |
> | Reuse query/handler from new place                   | 0.1-0.3d  |
> | Single field / config flag / style fix | 1 | 0.5d |
> | Small update existing handler/entity                 | 0.3-0.8d  |
> | State-machine transitions         | reachable transitions × allowed actors                 |
> | Test tier (Trad, incl. setup+assert+flake) | Cost     |
> | UI states (per new screen/dialog) | happy, loading, empty, error, partial — present only   |
> | UI tier                                      | Cost     |
> | Validation rules                  | 1 per required field / boundary / format / cross-field |
> | Work type | Max SP | Max likely |
> | `concurrency-race-event-ordering`                                     | +25%    |
> | `cross-service-contract` change                                       | +25%    |
> | `new-tech-or-unfamiliar-pattern`                                      | +30%    |
> | `performance-or-latency-critical`                                     | +20%    |
> | `regression-fan-out` (≥3 downstream areas re-test)                    | +20%    |
> | `schema-migration-on-populated-data`                                  | +25%    |
> | `shared-common-code` (multi-consumer/multi-app)                       | +25%    |
> | `touches-complex-existing-feature` (>500 LOC, multi-handler, central) | +20%    |
> | `unclear-requirements-or-design`                                      | +30%    |
> | likely_days         | Base margin                     |
Analyze the skills catalog and activate other skills that are needed for the task during the process.
If the user provides a screenshots or videos, use `ai-multimodal` skill to describe as detailed as possible the issue, make sure developers can predict the root causes easily based on the description.
Use `problem-solving` skills to tackle the issues.
Use `sequential-thinking` skill to break complex problems into sequential thought steps.
description: '[Implementation] Use when planning and fixing hard issues with subagents.'
disable-model-invocation: false
name: fix-hard
version: 1.0.0
