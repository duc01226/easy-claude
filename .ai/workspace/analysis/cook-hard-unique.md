
      <!-- /SYNC:graph-assisted-investigation:reminder -->
      <!-- /SYNC:plan-quality:reminder -->
      <!-- /SYNC:ui-system-context:reminder -->
      <!-- /SYNC:understand-code-first:reminder -->
    - Edge cases and failure modes
    - Edge cases from research
    - Error handling paths
    - Happy path scenarios
    - Performance considerations
    - Rollback strategy
    - Run relevant tests
    - Run type-check and compile
    - Security implications
    - Self-review before proceeding
    - Success criteria for each phase
    - Technical approach validation
    - `phase-XX-*.md` - Detailed phase files
    - `plan.md` - Overview with risk assessment
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:
## Closing Reminders
## Next Steps (Standalone: MUST ATTENTION ask user via `AskUserQuestion`. Skip if inside workflow.)
## Quality Gates
## Quick Summary
## When to Use
## Workflow
### 1. Deep Research Phase
### 2. Comprehensive Planning
### 3. Verified Implementation
### 4. Mandatory Testing
### 5. Mandatory Code Review
### 6. Documentation Update
### 7. Final Report
### Batch Checkpoint (Large Plans)
### Frontend/UI Context (if applicable)
### Graph-Trace Before Implementation
**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**
**Goal:** Implement features with deep research, comprehensive planning, and maximum quality verification.
**Key Rules:**
**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
**Mode:** HARD - Extra research, detailed planning, mandatory reviews.
**Ultrathink** to plan and implement these tasks with maximum verification:
**Workflow:**
**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
- **"/code-simplifier"** — Simplify and clean up implementation
- **"/workflow-review-changes"** — Review changes before commit
- **"Proceed with full workflow (Recommended)"** — I'll detect the best workflow to continue from here (feature implemented). This ensures review, testing, and docs steps aren't skipped.
- **"Skip, continue manually"** — user decides
- **External Memory**: Write all research to `.ai/workspace/analysis/{task-name}.analysis.md`. Re-read ENTIRE file before planning.
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** include `## Test Specifications` with TC IDs per phase. Call `TaskList` before creating new tasks.
- **MANDATORY IMPORTANT MUST ATTENTION** read frontend-patterns-reference, scss-styling-guide, design-system/README before any UI change.
- **MANDATORY IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when graph.db exists. Pattern: grep → graph trace → grep verify.
- **MANDATORY IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide
- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.
- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.
- Address all critical and major findings
- After each phase:
- Ask user to review and approve
- Break work into todo tasks; add final self-review task
- Component patterns: `docs/project-reference/frontend-patterns-reference.md`
- Create full plan directory with:
- Critical production features
- Cross-service integrations
- Database schema changes
- Design system tokens: `docs/project-reference/design-system/README.md`
- Generate research reports (max 150 lines each)
- Implement one phase at a time
- Launch 2-3 `researcher` subagents in parallel covering:
- Maximum thoroughness: research → plan → implement → review → test → docs
- NO mocks or fake data allowed
- Public API modifications
- Re-run tests after fixes
- Record any architectural decisions
- Repeat until all tests pass
- Repeat until approved
- Security considerations addressed
- Security-sensitive changes
- Styling/BEM guide: `docs/project-reference/scss-styling-guide.md`
- Summary of all changes
- Test coverage metrics
- This prevents breaking implicit dependencies (bus message consumers, event handlers)
- Unresolved questions (if any)
- Use `/scout-ext` for comprehensive codebase analysis
- Use `code-reviewer` subagent
- Use `docs-manager` to update relevant docs
- Use `planner` subagent with all research reports
- Use `project-manager` to update project status
- Use `tester` subagent for full test coverage
- User approval required at plan stage
- Write tests for:
- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (read directly when relevant; do not rely on hook-injected conversation text)
- `docs/specs/` — Test specifications by module (read existing TCs; generate/update test specs via `/tdd-spec` after implementation)
- `python .claude/scripts/code_graph trace <file-to-modify> --direction both --json` — see what calls this code AND what it triggers
- `python .claude/scripts/code_graph trace <file-to-modify> --direction downstream --json` — see all downstream consumers
---
1. **Execute batch** — Complete next 3 tasks (or user-specified batch size)
1. **Research** — Deep investigation with multiple researcher subagents
2. **Plan** — Detailed plan with `/plan-hard`, user approval required
2. **Report** — Show what was implemented, verification output, any concerns
3. **Implement** — Execute with full code review and SRE review
3. **Wait** — Say "Ready for feedback" and STOP. Do NOT continue automatically.
4. **Apply feedback** — Incorporate changes, then execute next batch
4. **Verify** — Run all tests, review changes, update docs
5. **Repeat** until all tasks complete
<!-- /SYNC:ai-mistake-prevention -->
<!-- /SYNC:ai-mistake-prevention:reminder -->
<!-- /SYNC:critical-thinking-mindset -->
<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- /SYNC:graph-assisted-investigation -->
<!-- /SYNC:nested-task-creation -->
<!-- /SYNC:nested-task-creation:reminder -->
<!-- /SYNC:plan-quality -->
<!-- /SYNC:project-reference-docs-guide -->
<!-- /SYNC:project-reference-docs-guide:reminder -->
<!-- /SYNC:task-tracking-external-report -->
<!-- /SYNC:task-tracking-external-report:reminder -->
<!-- /SYNC:ui-system-context -->
<!-- /SYNC:understand-code-first -->
<!-- SYNC:ai-mistake-prevention -->
<!-- SYNC:ai-mistake-prevention:reminder -->
<!-- SYNC:critical-thinking-mindset -->
<!-- SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:graph-assisted-investigation -->
<!-- SYNC:graph-assisted-investigation:reminder -->
<!-- SYNC:nested-task-creation -->
<!-- SYNC:nested-task-creation:reminder -->
<!-- SYNC:plan-quality -->
<!-- SYNC:plan-quality:reminder -->
<!-- SYNC:project-reference-docs-guide -->
<!-- SYNC:project-reference-docs-guide:reminder -->
<!-- SYNC:task-tracking-external-report -->
<!-- SYNC:task-tracking-external-report:reminder -->
<!-- SYNC:ui-system-context -->
<!-- SYNC:ui-system-context:reminder -->
<!-- SYNC:understand-code-first -->
<!-- SYNC:understand-code-first:reminder -->
</HARD-GATE>
<HARD-GATE>
<tasks>$ARGUMENTS</tasks>
>
> **AI Mistake Prevention** — Failure modes to avoid on every task:
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.
> **Blocked until:** scope evaluated, required docs checked/read, `lessons.md` confirmed, citation emitted.
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Use `--node-mode file` first (10-30x less noise), then `--node-mode function` for detail.
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Graph-Assisted Investigation** — MANDATORY when `.code-graph/graph.db` exists.
> **HARD-GATE:** MUST ATTENTION run at least ONE graph command on key files before concluding any investigation.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If this skill was called **outside a workflow**, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:
> **MUST ATTENTION READ before implementing:**
> **Mode:** TDD-first → reference existing TCs with `Evidence: TBD`. Implement-first → use TBD → `/tdd-spec` fills after.
> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
> **Pattern:** Grep finds files → `trace --direction both` reveals full system flow → Grep verifies details
> **Plan Quality** — Every plan phase MUST ATTENTION include test specifications.
> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
> **Skill Variant:** Variant of `/cook` — thorough implementation with maximum verification.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **UI System Context** — For ANY task touching `.ts`, `.html`, `.scss`, or `.css` files:
> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.
> 1. Add `## Test Specifications` section with TC-{FEAT}-{NNN} IDs to every phase file
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 1. Identify scope: file types, domain area, and operation.
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 1. `docs/project-reference/frontend-patterns-reference.md` — component base classes, stores, forms
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 2. Map every functional requirement to ≥1 TC (or explicit `TBD` with rationale)
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 2. Read existing files in target area — understand structure, base classes, conventions
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-docs-reference.md`; architecture/new area `project-structure-reference.md`.
> 2. `docs/project-reference/scss-styling-guide.md` — BEM methodology, SCSS variables, mixins, responsive
> 3. For plan/review work, create `plans/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 3. Read every required doc that exists; skip absent docs as not applicable. Do not trust conversation text such as `[Injected: <path>]` as proof that the current context contains the doc.
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 3. TC IDs follow `TC-{FEATURE}-{NNN}` format — reference by ID, never embed full content
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 3. `docs/project-reference/design-system/README.md` — design tokens, component inventory, icons
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 4. Before any new workflow step: call `TaskList` and re-read the phase file
> 4. Before target work, state: `Reference docs read: ... | Missing/not applicable: ...`.
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Final output cites `Full report: plans/reports/{filename}`.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 5. On context compaction: call `TaskList` FIRST — never create duplicate tasks
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
> 6. Re-read analysis file before implementing — never work from memory alone
> 6. Verify TC satisfaction per phase before marking complete (evidence must be `file:line`, not TBD)
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation
> After implementing, run `python .claude/scripts/code_graph connections <file> --json` on modified files to verify no related files need updates.
> If already inside a workflow, skip — the workflow handles sequencing.
> Reference `docs/project-config.json` for project-specific paths.
> When this task involves frontend or UI changes,
> | ------------------- | -------------------------------------------- |
> | Blast Radius        | `trace --direction downstream`               |
> | Code Review         | `tests_for` on changed functions             |
> | Feature/Enhancement | `connections` on files to be modified        |
> | Fix/Debug           | `callers_of` on buggy function + `tests_for` |
> | Investigation/Scout | `trace --direction both` on 2-3 entry files  |
> | Task                | Minimum Graph Action                         |
For plans with 10+ tasks, do NOT execute all tasks continuously without checkpoint.
For plans with 10+ tasks, execute in batches with human review:
Stop after every batch for human review. This prevents runaway execution where early
When graph DB is available, BEFORE writing code, trace to understand the blast radius:
description: '[Implementation] Use when you need thorough implementation with maximum verification.'
mistakes compound through later tasks.
name: cook-hard
version: 1.0.0
| -------- | ------------------------- |
| Docs     | Updated if needed         |
| Gate     | Criteria                  |
| Planning | Full plan directory       |
| Research | 2+ researcher reports     |
| Review   | 0 critical/major findings |
| Tests    | All pass, no mocks        |
