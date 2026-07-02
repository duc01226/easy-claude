---
name: workflow-architecture-audit
version: 1.0.0
description: '[Workflow] Use when activating the Architecture Audit workflow to review the whole project''s architecture, run an architecture health check, or check production readiness/scalability in one pass — read-only, produces one consolidated Architecture Health Report.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** [Workflow] Audit the WHOLE project's architecture, scalability, and production readiness in ONE read-only pass and synthesize a single consolidated Architecture Health Report — three sub-scores and one combined verdict. Findings only; every validated fix routes to a FOLLOW-UP `/plan` or feature workflow.

**Workflow:**

1. **Scout** — locate the modules, boundaries, and hotspots that scope the audit (whole project / current diff / specific path).
2. **Architecture-Review-Full** — the core step: runs INLINE (it spawns sub-agents), fans out three non-overlapping reviewers behind an all-return barrier, dedups their intentional cross-references, synthesizes one report with three sub-scores + one combined verdict, then self-validates via `/why-review`.
3. **Docs-Update** — refresh any documentation the audit shows as stale.
4. **Workflow-End** — clear workflow state.
5. **Watzup** — wrap up and summarize.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION treat this as READ-ONLY: produce findings + a verdict; NEVER apply fixes in this workflow — route them to a follow-up plan/feature workflow.
- MUST ATTENTION run `architecture-review-full` INLINE (it owns the parallel fan-out + all-return barrier); this workflow declares NO workflow-level parallel groups.
- NEVER skip mandatory workflow or skill gates.

**IMPORTANT MANDATORY Steps:** /scout -> /architecture-review-full -> /docs-update -> /workflow-end -> /watzup

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

## Audit Protocol (READ-ONLY, ONE PASS)

This workflow audits the WHOLE project architecture + scalability + production readiness in one pass and synthesizes ONE consolidated Architecture Health Report.

The core step `architecture-review-full` runs INLINE in the main session because it SPAWNS sub-agents. It:

1. **Resolves scope** — whole project / current diff / specific path.
2. **Fans out three deliberately-non-overlapping reviewers** as PARALLEL read-only sub-agents in one message behind an all-return barrier:
    - `architecture-scalability-review` (architect, scorecard /20)
    - `architecture-review` (architect, 12-category PASS/WARN/BLOCKED)
    - `production-readiness-review` (code-reviewer, SRE /24 + 8-item gate)
3. **Dedups** the siblings' intentional cross-references — the reviewers route to each other by design, so one underlying issue surfaces from multiple angles; collapse duplicates to one root finding.
4. **Synthesizes** one report with three sub-scores + one combined verdict.
5. **Runs a `/why-review` self-validation gate** on the merged findings before handoff.

Parallelism lives INSIDE `architecture-review-full` (it owns the fan-out + all-return barrier), so this workflow declares NO workflow-level parallel groups.

This is a READ-ONLY audit: it produces findings + a verdict only. Every validated finding routes to a FOLLOW-UP `/plan` or feature workflow that owns the fix — no fixes are applied in this workflow. After `architecture-review-full` returns, `docs-update` refreshes any impacted documentation, then `workflow-end` clears state and `watzup` wraps up.

**UNIVERSAL RULES:**

- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when a finding touches specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.

Activate the `workflow-architecture-audit` workflow. Run `/start-workflow workflow-architecture-audit` with the user's prompt as context and the audit protocol above.

**Steps:** /scout → /architecture-review-full → /docs-update → /workflow-end → /watzup

---

**IMPORTANT MANDATORY Steps:** /scout -> /architecture-review-full -> /docs-update -> /workflow-end -> /watzup

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:incremental-persistence -->

> **Incremental Result Persistence** — MANDATORY for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `plans/reports/{skill}-{date}-{slug}.md`
> 2. **After each file/section reviewed:** Append findings to report immediately — never hold in memory
> 3. **Return to main agent:** Summary only (per SYNC:subagent-return-contract) with `Full report:` path
> 4. **Main agent:** Reads report file only when resolving specific blockers
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings. Each disk write survives compaction. Partial results are better than no results.
>
> **Report naming:** `plans/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

<!-- /SYNC:incremental-persistence -->

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY this structure. Main agent reads only this summary — NEVER requests full sub-agent output inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
>
> ### Findings (Critical/High only — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description]
>
> Full report: plans/reports/[skill-name]-[date]-[slug].md
> ```
>
> Main agent reads `Full report` file ONLY when: (a) resolving a specific blocker, or (b) building a fix plan.
> Sub-agent writes full report incrementally (per SYNC:incremental-persistence) — not held in memory.
>
> **Context budget** — the return payload is a SUMMARY, not a transcript: ≤10 finding bullets, no raw file contents / full diffs / verbatim logs inline, no re-pasted source. Everything beyond the summary lives in the `Full report` on disk. A sub-agent that would exceed the summary shape MUST write the detail to its report and return only the pointer — the orchestrator's context is the scarce resource the whole map-reduce protects.

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** expand child phases, link parent when nested.
- **Critical Thinking:** traced `file:line` proof, confidence >80% to act.
- **Incremental Persistence:** append findings to report file after each section.
- **Subagent Return Contract:** sub-agent returns summary-only with `Full report:` pointer.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
