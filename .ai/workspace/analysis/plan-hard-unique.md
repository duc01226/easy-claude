
      <!-- /SYNC:estimation-framework:reminder -->
    - Abstract/base classes: `abstract class.*Base|Base[A-Z]\w+|Abstract[A-Z]\w+`
    - DI/IoC registration: search for DI registration patterns idiomatic to the project's framework
    - Frontend foundations: `base.*component|base.*service|base.*store|abstract.*component` (if frontend present)
    - Generic interfaces: `interface I\w+<|IGeneric|IBase`
    - Infrastructure abstractions: `IRepository|IUnitOfWork|IService|IHandler`
    - Utility/extension layers: `Extensions|Helpers|Utils|Common` (directories or classes)
    ---
    1. **Task: "Write test specifications for each phase"** — Add `## Test Specifications` with TC-{FEAT}-{NNN} IDs to every phase file. Use `/tdd-spec` if feature docs exist. Use `Evidence: TBD` for TDD-first mode.
    2. **Task: "Run /plan-validate"** — Trigger `/plan-validate` skill to interview the user with critical questions and validate plan assumptions
    3. **Task: "Run /plan-review"** — Trigger `/plan-review` skill with deep 3-round protocol (R1: checklist, R2: code-proof trace, R3: adversarial simulation). Review depth based on SP: ≤3 → 2 rounds min, 4-8 → 3 rounds, >8 → 3 rounds + code-proof mandatory.
    4. **Task: "Run /why-review (standalone only)"** — If NOT inside a workflow, trigger `/why-review` to validate design rationale, alternatives considered, and risk assessment in the plan. Skip if a workflow already includes `/why-review` in its sequence.
    5. **Task: "Re-evaluate estimation against finalized plan"** — Pre-completion estimates anchor on scope guesses; finalized phases reveal true cost. After phases/TCs/decisions are locked: (a) re-derive `bottom_up_hours = Σ phase_hours` from finalized phase files; (b) recompute `likely_days`, `risk_margin_pct`, `min-max range` per `SYNC:estimation-framework`; (c) compare to current frontmatter `man_days_traditional` / `story_points`. If `|delta| > 20%` → UPDATE frontmatter, add `reestimate_delta_pct: <signed>` + 1-line `reestimate_reason`. If `|delta| > 50%` → flag `SHOULD-RESCOPE` and surface to user via `AskUserQuestion` before implementation.
    ```
    ```yaml
    branch: { current git branch }
    created: { YYYY-MM-DD }
    description: '{One sentence for card preview}'
    effort: { sum of phases, e.g., 4h }
    man_days_ai: '{ total with AI e.g., 3d (2d code + 1d test) }'
    man_days_traditional: '{ total e.g., 6d (4d code + 2d test) }'
    priority: P2
    status: pending
    story_points: { sum of phase SPs, e.g., 8 }
    tags: [relevant, tags]
    title: '{Brief title}'
   **ONLY PERFORM THIS IF docs not found or older than 3 days**: Use `/scout <instructions>` to search the codebase for files needed.
   Each agent research for a different aspect of the task and are allowed to perform max 5 tool calls.
   If reusing: Use the active plan path from Plan Context.
   Make sure you pass the directory path to every subagent during the process.
## **IMPORTANT Task Planning Notes (MUST ATTENTION FOLLOW)**
## Closing Reminders
## Greenfield Mode
## Important Notes
## New Tech/Lib Gate (MANDATORY for all plans)
## Next Steps (Standalone: MUST ATTENTION ask user via `AskUserQuestion`. Skip if inside workflow.)
## Output Requirements
## PLANNING-ONLY — Collaboration Required
## Post-Plan Granularity Self-Check (MANDATORY)
## Post-Plan Validation (Optional)
## Pre-Creation Check (Active vs Suggested Plan)
## Preservation Inventory (MANDATORY for bugfixes)
## Quick Summary
## Scaffolding-First Protocol (Conditional)
## Standalone Review Gate (Non-Workflow Only)
## Workflow
## Your mission
$ARGUMENTS
**Activation conditions (ALL must be true):**
**Check `## Plan Context` -> `Validation: mode=X, questions=MIN-MAX`:**
**Goal:** Research, analyze the codebase, and create a detailed phased implementation plan with user collaboration.
**IMPORTANT MUST ATTENTION** include `## Test Specifications` with TC IDs per phase. Call `TaskList` before creating new tasks.
**IMPORTANT MUST ATTENTION** microservices/event-driven: scan producers, consumers, sagas, contracts in task scope. Per touchpoint: owner · message · consumers · risk (NONE/ADDITIVE/BREAKING). Missing consumer = silent regression.
**IMPORTANT MUST ATTENTION** score complexity first. Score >=6 → decompose. Each phase: plan → implement → review → fix → verify. No skipping.
**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
**IMPORTANT MUST ATTENTION** trace full data flow and fix at the owning layer, not the crash site. Audit all access sites before adding `?.`.
**IMPORTANT MUST ATTENTION** verify all phases pass 5-point granularity check. Failing phases → sub-plan. "Can I start coding RIGHT NOW?"
**If mode is `prompt`:** Use `AskUserQuestion` tool with options above.
**If user chooses validation or mode is `auto`:** Execute `/plan-validate {plan-path}` SlashCommand.
**Key Rules:**
**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST ATTENTION** after plan creation, detect new tech/packages/libraries not in the project. If found: `TaskCreate` per lib → WebSearch top 3 alternatives → compare (fit, size, community, learning curve, license) → recommend with confidence % → `AskUserQuestion` to confirm. **Skip if** plan uses only existing dependencies.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer; see `/sequential-thinking` skill.
**Plan Directory Structure** (use `Plan dir:` from `## Naming` section)
**Plan File Specification**
**Research Output Requirements**
**When activated:**
**When greenfield is detected:**
**When skipped:** Plan proceeds normally — feature stories build on existing base classes.
**Workflow:**
**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
- **"/plan-review"** — Validate plan before implementation
- **"/plan-validate"** — Interview user to confirm plan decisions
- **"/why-review"** — Validate design rationale in the plan before implementation (standalone only — skipped when workflow includes it)
- **"Proceed with full workflow (Recommended)"** — I'll detect the best workflow to continue from here (plan created). This ensures review, validation, implementation, and testing steps aren't skipped.
- **"Skip, continue manually"** — user decides
- **External Memory**: Write all research and analysis to `.ai/workspace/analysis/{task-name}.analysis.md`. Re-read ENTIRE analysis file before generating plan.
- **MANDATORY FINAL TASKS:** After creating all planning todo tasks, ALWAYS add these final tasks:
- **MANDATORY IMPORTANT MUST ATTENTION** detect new tech/lib in plan and create validation task (see New Tech/Lib Gate below)
- **MANDATORY MUST ATTENTION** estimation: bottom-up phase hours drive `man_days_traditional` (`Σh/6 × productivity_factor`); SP DERIVED. UI cost usually dominates — bump SP one bucket if NEW UI surface (page/complex form/dashboard). Frontmatter MUST include `story_points`, `complexity`, `man_days_traditional`, `man_days_ai`, `estimate_scope_included`, `estimate_scope_excluded`, `estimate_reasoning` (UI vs backend cost driver). Cap SP 3 for additive-on-existing-model+existing-UI unless test scope >1.5d. SP 13 SHOULD split, SP 21 MUST split.
- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.
- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.
- **UI Layout**: For frontend-facing phases, include ASCII wireframe. Classify components by tier (common/domain-shared/page-app). For backend-only phases: `## UI Layout` → `N/A — Backend-only change.`
- Activate needed skills from catalog during process.
- Always add a final review todo task to verify work quality and identify fixes/enhancements
- Always plan and break work into many small todo tasks using `TaskCreate`
- Always run /plan-review after plan creation
- Ask user to confirm before any next step
- Ensure every research markdown report remains concise (<=150 lines) while covering all requested topics and citations.
- Every `plan.md` MUST ATTENTION start with YAML frontmatter:
- For each phase, create `{plan-dir}/phase-XX-phase-name-here.md` with sections: Context links, Overview, Key Insights, Requirements, **Alternatives Considered** (minimum 2 approaches with pros/cons), **Design Rationale** (WHY chosen approach), Architecture, **UI Layout** (see below), Related code files, Implementation Steps, Todo list, Success Criteria, Risk Assessment, Security Considerations, Next steps.
- If "Plan: none" -> Create new plan using naming from `## Naming` section.
- If "Plan:" shows a path -> Active plan exists. Ask user: "Continue with this? [Y/n]"
- If "Suggested:" shows a path -> Branch-matched hint only. Ask if they want to activate or create new.
- PLANNING ONLY: do NOT implement or execute code changes
- Research reports <=150 lines; plan.md <=80 lines
- Save overview at `{plan-dir}/plan.md` (<80 lines): list each phase with status, progress, and links to phase files.
- Token efficiency without sacrificing quality. Sacrifice grammar for concision in reports.
- Unresolved questions → list at end of report.
- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (read directly when relevant; do not rely on hook-injected conversation text)
- `docs/specs/` — Test specifications by module (read existing TCs to include test strategy in plan)
---
1. **Pre-Check** — Detect active/suggested plan or create new directory
1. Active workflow is `greenfield-init` OR `big-feature`
1. If creating new: Create directory using `Plan dir:` from `## Naming` section, then run `node .claude/scripts/set-active-plan.cjs {plan-dir}`
1. Score each phase against the 5-point criteria (file paths, no planning verbs, ≤30min steps, ≤5 files, no open decisions)
1. Skip codebase analysis phase (researcher subagents that grep code)
2. **Replace with:** market research + business evaluation phase using WebSearch + WebFetch
2. **Research** — Parallel researcher subagents explore different aspects (max 5 tool calls each)
2. AI MUST ATTENTION self-investigate for existing base/foundational abstractions using these patterns:
2. Follow strictly to the "Plan Creation & Organization" rules of `planning` skill.
2. For each FAILING phase → create task to decompose it into a sub-plan (with its own /plan → /plan-review → /plan-validate → fix cycle)
3. **Codebase Analysis** — Search for project reference docs (patterns-reference, project-structure, architecture, adr); scout if not found
3. Delegate architecture decisions to `solution-architect` agent
3. If existing scaffolding found → **SKIP.** Log: "Existing scaffolding detected at {file:line}. Skipping Phase 1 scaffolding."
3. Re-score new phases. Repeat until ALL leaf phases pass (max depth: 3)
3. Use multiple `researcher` agents (max 2 agents) in parallel to research for this task:
4. **Plan Creation** — Planner subagent creates plan.md + phase-XX files with full sections
4. **Self-question:** "For each phase, can I start coding RIGHT NOW? If any needs 'figuring out' → sub-plan it."
4. Analyze the codebase: search for project reference docs (`patterns-reference`, `project-structure`, `architecture`, `adr`) and read those found.
4. If NO foundational abstractions found → **PROCEED** with scaffolding phase.
4. Output: `plans/{id}/plan.md` with greenfield-specific phases (domain model, tech stack, project structure)
5. **Post-Validation** — Optionally interview user to confirm decisions via /plan-validate
5. Main agent gathers all research and scout report filepaths, and pass them to `planner` subagent with the prompt to create an implementation plan of this task.
5. Skip reading project reference docs (won't exist in greenfield)
6. Enable broad web research for tech landscape, best practices, framework comparisons
6. Main agent receives the implementation plan from `planner` subagent, and ask user to review the plan
7. Every decision point requires AskUserQuestion with 2-4 options + confidence %
8. **[CRITICAL] Business-First Protocol:** Tech stack decisions come AFTER full business analysis. Do NOT ask user to pick a tech stack upfront. Instead: complete business evaluation → derive technical requirements → research current market options → produce comparison report → present to user for decision. See `solution-architect` agent for the full tech stack research methodology.
<!-- /SYNC:ai-mistake-prevention -->
<!-- /SYNC:ai-mistake-prevention:reminder -->
<!-- /SYNC:critical-thinking-mindset -->
<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- /SYNC:cross-service-check -->
<!-- /SYNC:cross-service-check:reminder -->
<!-- /SYNC:estimation-framework -->
<!-- /SYNC:fix-layer-accountability -->
<!-- /SYNC:fix-layer-accountability:reminder -->
<!-- /SYNC:iterative-phase-quality -->
<!-- /SYNC:iterative-phase-quality:reminder -->
<!-- /SYNC:nested-task-creation -->
<!-- /SYNC:nested-task-creation:reminder -->
<!-- /SYNC:plan-granularity -->
<!-- /SYNC:plan-granularity:reminder -->
<!-- /SYNC:plan-quality -->
<!-- /SYNC:plan-quality:reminder -->
<!-- /SYNC:preservation-inventory -->
<!-- /SYNC:project-reference-docs-guide -->
<!-- /SYNC:project-reference-docs-guide:reminder -->
<!-- /SYNC:sequential-thinking-protocol -->
<!-- /SYNC:sequential-thinking-protocol:reminder -->
<!-- /SYNC:task-tracking-external-report -->
<!-- /SYNC:task-tracking-external-report:reminder -->
<!-- /SYNC:understand-code-first -->
<!-- /SYNC:understand-code-first:reminder -->
<!-- SYNC:ai-mistake-prevention -->
<!-- SYNC:ai-mistake-prevention:reminder -->
<!-- SYNC:critical-thinking-mindset -->
<!-- SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:cross-service-check -->
<!-- SYNC:cross-service-check:reminder -->
<!-- SYNC:estimation-framework -->
<!-- SYNC:estimation-framework:reminder -->
<!-- SYNC:fix-layer-accountability -->
<!-- SYNC:fix-layer-accountability:reminder -->
<!-- SYNC:iterative-phase-quality -->
<!-- SYNC:iterative-phase-quality:reminder -->
<!-- SYNC:nested-task-creation -->
<!-- SYNC:nested-task-creation:reminder -->
<!-- SYNC:plan-granularity -->
<!-- SYNC:plan-granularity:reminder -->
<!-- SYNC:plan-quality -->
<!-- SYNC:plan-quality:reminder -->
<!-- SYNC:preservation-inventory -->
<!-- SYNC:project-reference-docs-guide -->
<!-- SYNC:project-reference-docs-guide:reminder -->
<!-- SYNC:sequential-thinking-protocol -->
<!-- SYNC:sequential-thinking-protocol:reminder -->
<!-- SYNC:task-tracking-external-report -->
<!-- SYNC:task-tracking-external-report:reminder -->
<!-- SYNC:understand-code-first -->
<!-- SYNC:understand-code-first:reminder -->
</task>
<task>
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
> **Auto-detected:** If no existing codebase is found (no code directories like `src/`, `app/`, `lib/`, `server/`, `packages/`, etc., no manifest files like `package.json`/`*.sln`/`go.mod`, no populated `project-config.json`), this skill switches to greenfield mode automatically. Planning artifacts (docs/, plans/, .claude/) don't count — the project must have actual code directories with content.
> **BLOCKED until:** Producers scanned · Consumers scanned · Sagas checked · Contracts reviewed · Breaking-change risk flagged
> **BLOCKED until:** `- [ ]` Full data flow traced (origin → crash) `- [ ]` Invariant owner identified with `file:line` evidence `- [ ]` All access sites audited (grep count) `- [ ]` Fix layer justified (lowest layer that protects most consumers)
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence
> **BLOCKED until:** ≥3 rows · every File cell has `file:line` · every Verification cell has TC-ID or grep (not "manually verify")
> **Blast Radius (mandatory pre-pass — affects code AND test):**
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.
> **Blocked until:** scope evaluated, required docs checked/read, `lessons.md` confirmed, citation emitted.
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.
> **COLLABORATE** with the user: ask decision questions, present options with recommendations.
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Collapse rule:** total margin >100% → STOP, split (padding past 2x is dishonesty). Margin <15% on `likely_days ≥5` → under-estimated, widen.
> **Columns:** `Invariant | file:line | Why (data consequence if broken) | Verification (TC-ID or grep)`
> **Complexity signals:** >5 files +2, cross-service +3, new pattern +2, DB migration +2
> **Cost Driver Heuristic (apply BEFORE work-type row):**
> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Cross-Service Check** — Microservices/event-driven: MANDATORY before concluding investigation, plan, spec, or feature doc. Missing downstream consumer = silent regression.
> **DO NOT** implement or execute any code changes.
> **DO NOT** use the `EnterPlanMode` tool — you are ALREADY in a planning workflow.
> **Deep-dive:** see `/sequential-thinking` skill (`.claude/skills/sequential-thinking/SKILL.md`) for worked examples (api-design, debug, architecture), advanced techniques (spiral refinement, hypothesis testing, convergence), and meta-strategies (uncertainty handling, revision cascades).
> **Estimation Framework** — Bottom-up first; SP DERIVED; output min-max range when likely ≥3d. Stack-agnostic. Baseline: 3-5yr dev, 6 productive hrs/day. AI estimate assumes Claude Code + project context.
> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).
> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.
> **Failing phases →** create sub-plan. Repeat until ALL leaf phases pass (max depth: 3).
> **Fix-Layer Accountability** — NEVER fix at the crash site. Trace the full flow, fix at the owning layer.
> **Format (explicit mode — visible thought trail):**
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).
> **Iterative Phase Quality** — Score complexity BEFORE planning.
> **MANDATORY IMPORTANT MUST ATTENTION:** If this skill is called **outside a workflow** (standalone `/plan-hard`), the generated plan MUST ATTENTION include `/review-changes` as a **final phase/task** in the plan. This ensures all implementation changes get reviewed before commit even without a workflow enforcing it.
> **MANDATORY before ANY fix:**
> **MANDATORY frontmatter:**
> **Mandatory closers:** Confidence % stated · Assumptions listed · Open questions surfaced · Next action concrete.
> **Method:**
> **Mode:** TDD-first → reference existing TCs with `Evidence: TBD`. Implement-first → use TBD → `/tdd-spec` fills after.
> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
> **Per touchpoint:** owner service · message name · consumers · risk (NONE / ADDITIVE / BREAKING).
> **Phase success = all TCs pass + code-reviewer agent approves + no CRITICAL findings.**
> **Plan Granularity** — Every phase must pass 5-point check before implementation:
> **Plan Quality** — Every plan phase MUST ATTENTION include test specifications.
> **Preservation Inventory** — MANDATORY for bugfix plans. Trigger keywords in plan title/frontmatter: `fix`, `bug`, `regression`, `broken`, `defect`. Author MUST produce this table BEFORE writing implementation steps.
> **Productivity factor:** 0.8 strong scaffolding+codegen+AI hooks · 1.0 mature default · 1.2 weak patterns · 1.5 greenfield
> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
> **Reuse-vs-Create axis (PRIMARY lever, per layer):**
> **Risk Margin (drives max bound):**
> **Risk-factor add-ons (additive — enumerate in `risk_factors`):**
> **Rule:** Complex touch → add `risk_factors`. Each downstream consumer → +1-3 regression cases. Blast >5 areas OR >2 complex → re-evaluate SPLIT before estimating.
> **Rule:** Sum tiers across UI+backend+tests, apply productivity factor. Reuse short-circuits tiers — call out.
> **SP→Days (validation only):** 1=0.5d/0.25d · 2=1d/0.35d · 3=2d/0.65d · 5=4d/1.0d · 8=6d/1.5d · 13=10d/2.0d (Trad/AI likely)
> **Sanity self-check:**
> **Score >=6 →** MUST ATTENTION decompose into phases. Each phase:
> **Self-question:** "Can I start coding RIGHT NOW? If any step needs 'figuring out' → sub-plan it."
> **Sequential Thinking Protocol** — Structured multi-step reasoning for complex/ambiguous work. Use when planning, reviewing, debugging, or refining ideas where one-shot reasoning is unsafe.
> **Stop conditions:** confidence <80% on any critical decision → escalate via AskUserQuestion · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
> **Test multipliers:** new fixture/seed harness +0.5d · cross-service/bus assertion +0.3d each · UI E2E ×1.5 · each new role +1-2 cases
> **Test-Scope drivers (compute test_count EXPLICITLY — "+tests" hand-wave is #1 failure):**
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trigger when:** complex problem decomposition · adaptive plans needing revision · analysis with course correction · unclear/emerging scope · multi-step solutions · hypothesis-driven debugging · cross-cutting trade-off evaluation.
> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Work-Type Caps (hard ceilings on `likely_days`):**
> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.
> - "Add defensive checks at every consumer" — Scattered defense = wrong layer. One authoritative fix > many scattered guards.
> - "Both fix is safer" — Pick ONE authoritative layer. Redundant checks across layers send mixed signals about who owns the invariant.
> - "Fix it where it crashes" — Crash site ≠ cause site. Trace upstream.
> - **Backend dominates ONLY:** multi-aggregate invariants, cross-service contracts, schema migrations, heavy query/perf, new event flows
> - **UI dominates** in CRUD/business apps — 1.5-3x backend (states, validation, responsive, a11y, polish)
> - Backend cross-service / migration / multi-aggregate? → SP 8+ regardless of UI
> - Blast `>5` areas OR `>2` complex, no split discussion? → reject
> - Complex existing feature touched, no regression budget in `(c)`? → reject
> - Do NOT start Phase N+1 until Phase N passes VERIFY
> - Follows cycle: plan → implement → review → fix → verify
> - Margin <15% on `likely_days ≥5d`? → under-estimated, widen
> - Margin >100%? → STOP, split instead of buffer
> - NEW UI surface (page/complex form/dashboard)? → SP 5+ even if backend one endpoint
> - Purely additive on existing model AND existing UI? → cap SP 3 unless tests >1.5d
> - Reasoning called out UI vs backend vs blast vs risk factors? → if missing, add
> - Without tests, SP drops ≥1 bucket? → tests dominate; state explicitly
> - `bottom_up_hours / 6` vs SP-Days disagreement >50%? → trust bottom-up, downgrade SP
> - `likely_days ≥3d` and single-point? → reject, must be range
> - ≤3h effort
> - ≤5 files modified
> 1. **Blast Radius pass** (below) — drives code AND test cost
> 1. **Trace full data flow** — Map the complete path from data origin to crash site across ALL layers (storage → backend → API → frontend → UI). Identify where the bad state ENTERS, not where it CRASHES.
> 1. Add `## Test Specifications` section with TC-{FEAT}-{NNN} IDs to every phase file
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 1. Files/components directly modified — count
> 1. Identify scope: file types, domain area, and operation.
> 1. Lists exact file paths to modify (not generic "implement X")
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 1. `Thought N/M: [aspect]` — one aspect per thought, state assumptions/uncertainty
> 2. **Identify the invariant owner** — Which layer's contract guarantees this value is valid? That layer is responsible. Fix at the LOWEST layer that owns the invariant — not the highest layer that consumes it.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 2. Decompose phases → hours/phase → `bottom_up_hours = Σ phase_hours`
> 2. Map every functional requirement to ≥1 TC (or explicit `TBD` with rationale)
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 2. No planning verbs (research, investigate, analyze, determine, figure out)
> 2. Of those, "complex" (>500 LOC, multi-handler, central, frequently-modified) — count
> 2. Read existing files in target area — understand structure, base classes, conventions
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-docs-reference.md`; architecture/new area `project-structure-reference.md`.
> 2. `Thought N/M [REVISION of Thought K]: ...` — when prior reasoning invalidated; state Original / Why revised / Impact
> 3. **One fix, maximum protection** — Ask: "If I fix here, does it protect ALL downstream consumers with ONE change?" If fix requires touching 3+ files with defensive checks, you are at the wrong layer — go lower.
> 3. Downstream consumers (callers, event subscribers, cross-service) — list
> 3. For plan/review work, create `plans/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 3. Read every required doc that exists; skip absent docs as not applicable. Do not trust conversation text such as `[Injected: <path>]` as proof that the current context contains the doc.
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 3. Steps ≤30min each, phase total ≤3h
> 3. TC IDs follow `TC-{FEATURE}-{NNN}` format — reference by ID, never embed full content
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 3. `Thought N/M [BRANCH A from Thought K]: ...` — explore alternative; converge with decision rationale
> 3. `likely_days = ceil(bottom_up_hours / 6) × productivity_factor`
> 4. **Verify no bypass paths** — Confirm all data flows through the fix point. Check for: direct construction skipping factories, clone/spread without re-validation, raw data not wrapped in domain models, mutations outside the model layer.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 4. Before any new workflow step: call `TaskList` and re-read the phase file
> 4. Before target work, state: `Reference docs read: ... | Missing/not applicable: ...`.
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 4. Shared/common code touched (multi-app blast) — yes/no
> 4. Sum **Risk Margin** (base + add-ons) → `max_days = likely_days × (1 + margin)`
> 4. `Thought N/M [HYPOTHESIS]: ...` then `[VERIFICATION]: ...` — test before acting
> 4. ≤5 files per phase
> 5. Final output cites `Full report: plans/reports/{filename}`.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 5. No open decisions or TBDs in approach
> 5. On context compaction: call `TaskList` FIRST — never create duplicate tasks
> 5. Regression scope — areas needing re-test
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 5. `Thought N/N [FINAL]` — only when verified, all critical aspects addressed, confidence >80%
> 5. `min_days = likely_days × 0.9`
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
> 6. Output as range when `likely_days ≥3`; single point allowed `<3` (still record margin)
> 6. Re-read analysis file before implementing — never work from memory alone
> 6. Verify TC satisfaction per phase before marking complete (evidence must be `file:line`, not TBD)
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation
> 7. `man_days_ai` = same range × AI speedup
> 8. `story_points` DERIVED from `likely_days` via SP-Days — NEVER driver. Disagreement >50% → trust bottom-up
> AI default behavior: see error at Place A → fix Place A. This is WRONG. The crash site is a SYMPTOM, not the cause.
> ASK user to confirm the plan before any next step.
> After plan creation, ALWAYS run `/plan-review` to validate the plan.
> Each phase file MUST ATTENTION satisfy: <=5 files per phase, <=3h effort, clear success criteria, mapped test cases.
> If already running inside a workflow (e.g., `feature`, `bugfix`), skip this — the workflow sequence handles `/review-changes` at the appropriate step.
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
> | ------------------- | ------------------------------------------------------------------------------- |
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
> | Boundary            | Grep terms                                                                      |
> | Compose components into NEW screen           | 1-2d     |
> | Cross-service contract + migration combined | 13 | SHOULD split |
> | Data ownership      | Other service reads/writes same table/collection → Shared-DB anti-pattern       |
> | Driver                            | Count                                                  |
> | Event consumers     | `Consumer`, `EventHandler`, `Subscribe`, `@EventListener`, `inbox`              |
> | Event producers     | `Publish`, `Dispatch`, `Send`, `emit`, `EventBus`, `outbox`, `IntegrationEvent` |
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
> | Sagas/orchestration | `Saga`, `ProcessManager`, `Choreography`, `Workflow`, `Orchestrator`            |
> | Shared contracts    | OpenAPI spec, proto, shared DTO — flag breaking changes                         |
> | Single field / config flag / style fix | 1 | 0.5d |
> | Small update existing handler/entity                 | 0.3-0.8d  |
> | State-machine transitions         | reachable transitions × allowed actors                 |
> | Sync service calls  | HTTP/gRPC calls to/from other services                                          |
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
Activate `planning` skill.
After creating all phase files, run the **recursive decomposition loop**:
After plan creation, offer validation interview to confirm decisions before implementation.
Check the `## Plan Context` section in the injected context:
Phase 1 of the plan MUST ATTENTION be **Architecture Scaffolding** — all base abstract classes, generic interfaces, infrastructure abstractions, and DI registration with OOP/SOLID principles. Runs BEFORE feature stories. AI self-investigates what base classes the tech stack needs. All infrastructure behind interfaces with at least one concrete implementation (Dependency Inversion).
```
description: '[Planning] Use when you need research, analyze, and create an implementation plan.'
disable-model-invocation: false
name: plan-hard
version: 1.0.0
{plan-dir}/
| -------- | -------------------------------------------------------------------------------- |
| Mode     | Behavior                                                                         |
| `auto`   | Automatically execute `/plan-validate {plan-path}`                               |
| `off`    | Skip validation step entirely                                                    |
| `prompt` | Ask user: "Validate this plan with a brief interview?" -> Yes (Recommended) / No |
│   └── ...
│   ├── XX-report.md
│   ├── researcher-XX-report.md
│   ├── scout-XX-report.md
└── ...
├── phase-XX-phase-name-here.md
├── plan.md
├── reports/
├── research/
├── scout/
