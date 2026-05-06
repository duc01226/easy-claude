---
name: debug
description: '[Fix & Debug] Systematic debugging with root cause investigation. Use when bugfix workflow reaches debug step.'
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Prefer the `plan-hard` skill for planning guidance in this Codex mirror.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->
## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**
- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Situation-based docs:**
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec/test-case planning or TC mapping: `feature-docs-reference.md`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

> **Understand Code First** — Search codebase for 3+ similar implementations BEFORE writing any code. Read existing files, validate assumptions with grep evidence, map dependencies via graph trace. Never invent new patterns when existing ones work.
> MUST READ `.claude/skills/shared/understand-code-first-protocol.md` for full protocol and checklists.

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs `file:line` proof. Confidence: >95% recommend freely, 80-94% with caveats, <80% DO NOT recommend — gather more evidence. Cross-service validation required for architectural changes.
> MUST READ `.claude/skills/shared/evidence-based-reasoning-protocol.md` for full protocol and checklists.

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (Codex has no hook injection — open this file directly before proceeding)

> **Estimation Framework** — SP scale: 1(trivial) → 2(small) → 3(medium) → 5(large) → 8(very large, high risk) → 13(epic, SHOULD split) → 21(MUST split). MUST provide `story_points` and `complexity` estimate after investigation.
> MUST READ `.claude/skills/shared/estimation-framework.md` for full protocol and checklists.
> **Red Flag STOP Conditions** — STOP current approach when: 3+ fix attempts on same issue (root cause not identified), each fix reveals NEW problems (upstream root cause), fix requires 5+ files for "simple" change (wrong abstraction layer), using "should work"/"probably fixed" without verification evidence. After 3 failed attempts, report all outcomes and ask user before attempt #4.
> MUST READ `.claude/skills/shared/red-flag-stop-conditions-protocol.md` for full protocol and checklists.

## Quick Summary

**Goal:** Investigate and identify root cause of a bug with evidence.

**Workflow:**

1. **Reproduce** — Understand expected vs actual behavior
2. **Hypothesize** — Form theories about root cause
3. **Trace** — Follow code paths with file:line evidence
4. **Confirm** — Verify root cause with grep/read evidence
5. **Report** — Output root cause with confidence level

**Key Rules:**

- Debug Mindset: every claim needs file:line proof
- Never assume first hypothesis is correct
- Output: confirmed root cause OR "hypothesis, not confirmed" with evidence gaps
- This is investigation-only — hand off to $fix for implementation

> **[MANDATORY]** Read `.claude/skills/shared/root-cause-debugging-protocol.md` BEFORE proposing any fix. Responsibility attribution and data lifecycle tracing are required.

## Debug Mindset (NON-NEGOTIABLE)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

- Do NOT assume the first hypothesis is correct — verify with actual code traces
- Every root cause claim must include `file:line` evidence
- If you cannot prove a root cause with a code trace, state "hypothesis, not confirmed"
- Question assumptions: "Is this really the cause?" → trace the actual execution path
- Challenge completeness: "Are there other contributing factors?" → check related code paths

## Confidence & Evidence Gate

**MANDATORY IMPORTANT MUST** declare `Confidence: X%` with evidence list + `file:line` proof for EVERY claim.

| Confidence | Meaning                                  | Action                               |
| ---------- | ---------------------------------------- | ------------------------------------ |
| 95-100%    | Full trace verified                      | Report as confirmed root cause       |
| 80-94%     | Main path verified, edge cases uncertain | Report with caveats                  |
| 60-79%     | Partial trace                            | Report as hypothesis                 |
| <60%       | Insufficient evidence                    | DO NOT report — gather more evidence |

## Workflow Details

### Step 1: Reproduce

- Clarify expected vs actual behavior
- Identify trigger conditions (user action, data state, timing)

### Step 2: Hypothesize

- Form 2-3 theories about root cause
- Rank by likelihood based on symptoms

### Step 3: Trace

- For each hypothesis, trace the code path:
  - Find entry point (API, UI, job, event)
  - Follow through handlers/services
  - Check data transformations and state changes
  - Verify error handling paths
- Use grep/read to collect `file:line` evidence

### Step 4: Confirm

- Match evidence to a single root cause
- Verify the root cause explains ALL symptoms
- Check for secondary contributing factors

## Dependency Tracing (MANDATORY — DO NOT SKIP when graph.db exists)

If `.code-graph/graph.db` exists, you MUST use structural queries to trace dependencies:

**Graph reveals ALL callers and consumers of buggy code — grep alone misses structural relationships.**

- **Who calls the buggy function:** `python .claude/scripts/code_graph query callers_of <function> --json`
- **Who imports the buggy module:** `python .claude/scripts/code_graph query importers_of <file> --json`
- **What tests exist:** `python .claude/scripts/code_graph query tests_for <function> --json`
- **What does this function call:** `python .claude/scripts/code_graph query callees_of <function> --json`

### Graph-Assisted Debugging

After identifying suspect files, use graph trace to understand the full context:
1. `python .claude/scripts/code_graph trace <suspect-file> --direction both --json` — see what calls this code AND what it triggers downstream
2. `python .claude/scripts/code_graph trace <suspect-file> --direction upstream --json` — find all callers that could trigger the bug
3. This reveals implicit connections (MESSAGE_BUS, event handlers) that may propagate the issue across services

### Step 5: Report

- Output: confirmed root cause with evidence chain
- Include: affected files, data flow, fix recommendation
- Hand off to `$fix` for implementation

## ⚠️ MANDATORY: Post-Fix Verification

**After `$fix` applies changes, `$prove-fix` MUST be run.** It builds code proof traces per change with confidence scores. This is non-negotiable in all fix workflows.

## Red Flags — STOP (Debugging-Specific)

If you're thinking:

- "I see the problem, let me fix it" — Seeing symptoms is not understanding root cause. Investigate first.
- "Quick fix for now, investigate later" — Quick fixes mask bugs and create debt. Find root cause.
- "Just try changing X and see" — One hypothesis at a time. Scientific method, not trial and error.
- "Already tried 2+ fixes, one more" — 3+ failed fixes = STOP. Question the architecture, not the fix.
- "The error message is misleading" — Read it again carefully. Error messages are usually right.
- "It works on my machine" — Reproduce in the failing environment. Your environment hides bugs.
- "This can't be the cause" — Verify with evidence, not intuition. Unlikely causes are still causes.

## IMPORTANT Task Planning Notes (MUST FOLLOW)

- Always plan and break work into many small todo tasks using task tracking
- Always add a final review todo task to verify work quality and identify fixes/enhancements

---

## Workflow Recommendation

> **IMPORTANT MUST:** If you are NOT already in a workflow, use a direct user question to ask the user:
>
> 1. **Activate `bugfix` workflow** (Recommended) — scout → investigate → debug → plan → fix → prove-fix → review → test
> 2. **Execute `$debug-investigate` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST** after completing this skill, use a direct user question to recommend:

- **"$fix (Recommended)"** — Apply fix based on debug findings
- **"$plan-hard"** — If fix requires planning
- **"Skip, continue manually"** — user decides

## Standalone Review Gate (Non-Workflow Only)

> **MANDATORY IMPORTANT MUST:** If this skill is called **outside a workflow** (standalone `$debug-investigate`), you MUST create a task tracking todo task for `$review-changes` as the **last task** in your task list. This ensures all changes are reviewed before commit even without a workflow enforcing it.
>
> If already running inside a workflow (e.g., `bugfix`), skip this — the workflow sequence handles `$review-changes` at the appropriate step.

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
> **Stop conditions:** confidence <60% on any critical decision → escalate via ask the user directly · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).
>
> **Deep-dive:** see `$sequential-thinking` skill (`.claude/skills/sequential-thinking/SKILL.md`) for worked examples (api-design, debug, architecture), advanced techniques (spiral refinement, hypothesis testing, convergence), and meta-strategies (uncertainty handling, revision cascades).

<!-- /SYNC:sequential-thinking-protocol -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer; see `$sequential-thinking` skill.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

## Closing Reminders

**MANDATORY IMPORTANT MUST** break work into small todo tasks using task tracking BEFORE starting.
**MANDATORY IMPORTANT MUST** validate decisions with user via a direct user question — never auto-decide.
**MANDATORY IMPORTANT MUST** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST** READ the following files before starting:
- **MUST** READ `.claude/skills/shared/understand-code-first-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/evidence-based-reasoning-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/estimation-framework.md` before starting
- **MUST** READ `.claude/skills/shared/red-flag-stop-conditions-protocol.md` before starting

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure:
   - Question: "Which workflow do you want to activate?"
   - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
   - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
## Learned Lessons

# Lessons Learned

> **[CRITICAL]** Hard-won project debugging/architecture rules. MUST ATTENTION apply BEFORE forming hypothesis or writing code.

## Quick Summary

**Goal:** Prevent recurrence of known failure patterns — debugging, architecture, naming, AI orchestration, environment.

**Top Rules (apply always):**

- MUST ATTENTION verify ALL preconditions (config, env, DB names, DI regs) BEFORE code-layer hypothesis
- MUST ATTENTION fix responsible layer — NEVER patch symptom sites with caller-specific defensive code
- MUST ATTENTION use `ExecuteInjectScopedAsync` for parallel async + repo/UoW — NEVER `ExecuteUowTask`
- MUST ATTENTION name by PURPOSE not CONTENT — adding member forces rename = abstraction broken
- MUST ATTENTION persist sub-agent findings incrementally after each file — NEVER batch at end
- MUST ATTENTION Windows bash: verify Python alias (`where python`/`where py`) — NEVER assume `python`/`python3` resolves

---

## Debugging & Root Cause Reasoning

- [2026-04-11] **Holistic-first: verify environment before code.** Failure → list ALL preconditions (config, env vars, DB names, endpoints, DI regs, credentials, permissions, data prerequisites) → verify each via evidence (grep/cat/query) BEFORE code-layer hypothesis. Worst rabbit holes: diving nearest layer while bug sits elsewhere — e.g., hours debugging "sync timeout", real cause: test appsettings pointing wrong DB. Cheapest check first.
- [2026-04-01] **Ask "whose responsibility?" before fixing.** Trace: bug in caller (wrong data) or callee (wrong handling)? Fix responsible layer — NEVER patch symptom site masking real issue.
- [2026-04-01] **Trace data lifecycle, not error site.** Follow data: creation → transformation → consumption. Bug usually where data created wrong, not consumed.
- [2026-04-01] **Code is caller-agnostic.** Functions/handlers/consumers don't know who invokes them. Comments/guards/messages describe business intent — NEVER reference specific callers (tests, seeders, scripts).

## Architecture Invariants

- [2026-03-31] **ParallelAsync + repo/UoW MUST use `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask`.** `ExecuteUowTask` creates new UoW but reuses outer DI scope (same DbContext) — parallel iterations sharing non-thread-safe DbContext silently corrupt data. `ExecuteInjectScopedAsync` creates new UoW + new DI scope (fresh repo per iteration).
- [2026-03-31] **Bus message naming MUST include service name prefix — core services NEVER consume feature events.** Prefix declares schema ownership (`AccountUserEntityEventBusMessage` = Accounts owns). Core services (Accounts, Communication) are leaders. Feature services (Growth, Talents) sending to core MUST use `{CoreServiceName}...RequestBusMessage` — never define own event for core to consume.

## Naming & Abstraction

- [2026-04-12] **Name PURPOSE not CONTENT — "OrXxx" anti-pattern.** `HrManagerOrHrOrPayrollHrOperationsPolicy` names set members, not what it guards. Add role → rename = broken abstraction. **Rule:** names express DOES/GUARDS, not CONTAINS. **Test:** adding/removing member forces rename? YES = content-driven = bad → rename to purpose (e.g., `HrOperationsAccessPolicy`). **Nuance:** "Or" fine in behavioral idioms (`FirstOrDefault`, `SuccessOrThrow`) — expresses HAPPENS, not membership.

## Environment & Tooling

- [2026-04-20] **Windows bash: NEVER assume `python`/`python3` resolves — verify alias first.** Python may not be in bash PATH under those names. Check: `where python` / `where py`. Prefer `py` (Windows Python Launcher) for one-liners, `node` if JS alternative exists.

> Test-specific lessons → `docs/project-reference/integration-test-reference.md` Lessons Learned section. Production-code anti-patterns → `docs/project-reference/backend-patterns-reference.md` Anti-Patterns section. Generic debugging/refactoring reminders → System Lessons in `.claude/hooks/lib/prompt-injections.cjs`.

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** holistic-first: verify ALL preconditions (config, env, DB names, endpoints, DI regs) BEFORE code-layer hypothesis — cheapest check first
- **IMPORTANT MUST ATTENTION** fix responsible layer — NEVER patch symptom site; trace caller (wrong data) vs callee (wrong handling), fix root owner
- **IMPORTANT MUST ATTENTION** parallel async + repo/UoW → ALWAYS `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask` (shared DbContext = silent data corruption)
- **IMPORTANT MUST ATTENTION** bus message prefix = schema ownership; feature services NEVER define events for core services — use `{CoreServiceName}...RequestBusMessage`
- **IMPORTANT MUST ATTENTION** name by PURPOSE — adding/removing member forces rename = broken abstraction
- **IMPORTANT MUST ATTENTION** sub-agents MUST write findings after each file/section — NEVER batch all findings into one final write
- **IMPORTANT MUST ATTENTION** Windows bash: NEVER assume `python`/`python3` resolves — run `where python`/`where py` first, use `py` launcher or `node`
## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**
1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
