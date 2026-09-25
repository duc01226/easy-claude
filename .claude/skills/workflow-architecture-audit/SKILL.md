---
name: workflow-architecture-audit
version: 1.0.0
description: '[Workflow] Use when auditing the whole project''s architecture, running an architecture health check, or checking production readiness — read-only, one consolidated health report.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Activate a read-only whole-project architecture, scalability, and production-readiness audit; synthesize one Architecture Health Report with three sub-scores and one combined verdict, then route validated fixes to a follow-up plan or feature workflow.

**Summary:**

- READ-ONLY audit — produces findings + ONE consolidated Architecture Health Report (3 sub-scores + 1 combined verdict); NEVER applies fixes: every validated fix routes to a FOLLOW-UP `/plan` or feature workflow.
- Core engine `architecture-review-full` runs INLINE (it owns the parallel fan-out + all-return barrier); this workflow declares NO workflow-level parallel groups.
- FINAL `/why-review` gate (step 3) = the machine-visible guarantee no audit finding ships unvalidated — every PRIOR step routes its output into it; `docs-update` runs AFTER the gate and self-validates its own doc diff.
- Main steps in order: **1** investigate scope → **2** Architecture-Review-Full (fan out 3 non-overlapping reviewers → progressive dedup synthesis → per-face `/why-review` fix → Finalize verdict) → **3** Why-Review FINAL gate → **4** Docs-Update → **5** Workflow-End → **6** Watzup.

**Workflow:**

1. **investigate** — locate the modules, boundaries, and hotspots that scope the audit (whole project / current diff / specific path). **→ On completion, hand its scope map forward to the final `/why-review` (step 3) so the audit scope itself is validated (nothing in-scope missed, nothing out-of-scope pulled in).**
2. **Architecture-Review-Full** — the core step: runs INLINE (it spawns sub-agents), fans out three non-overlapping reviewers behind an all-return barrier, then PROGRESSIVELY synthesizes each face into ONE report file (status `IN PROGRESS` → `VALIDATING` → `FINISHED`): dedup, a fix-report-per-review `/why-review` gate that walks each of the three faces, and a Finalize step that locks the combined verdict. **→ On completion, hand the FINISHED consolidated report forward to the final `/why-review` (step 3) for report-level validation.**
3. **Why-Review (FINAL VALIDATION GATE over the audit findings)** — MANDATORY. Validates the findings AND reviews the results of every PRIOR step it can reach: the investigate scope map, the FINISHED consolidated report (verdict-rollup correctness, dedup completeness, cross-review severity consistency), and each of the three review faces' contributions. Every prior step routes its output here; no audit finding ships unvalidated. `docs-update` runs AFTER this gate and is NOT validated by it — it self-validates its own doc diff (see step 4).
4. **Docs-Update** — refresh any documentation the validated audit shows as stale. **→ Self-validates its own output: re-invoke `/why-review` on the doc diff when docs-update makes non-trivial edits, so the doc changes are reviewed before workflow-end.**
5. **Workflow-End** — clear workflow state.
6. **Watzup** — wrap up and summarize.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION treat this as READ-ONLY: produce findings + a verdict; NEVER apply fixes in this workflow — route them to a follow-up plan/feature workflow.
- MUST ATTENTION run `architecture-review-full` INLINE (it owns the parallel fan-out + all-return barrier); this workflow declares NO workflow-level parallel groups.
- MUST ATTENTION every PRIOR step routes its output to the FINAL `/why-review` gate (step 3): each producing step hands its findings + results forward, and the final `/why-review` validates the findings AND reviews the results of every prior step before docs-update — it is the final gate over the AUDIT FINDINGS. `docs-update` runs AFTER the gate and owns validation of its own output via an inline `/why-review` on non-trivial doc edits.
- NEVER skip mandatory workflow or skill gates.

**IMPORTANT MANDATORY Steps:** /investigate -> /architecture-review-full -> /why-review -> /docs-update -> /workflow-end -> /watzup

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

## Audit Protocol (READ-ONLY, ONE PASS)

Audits the WHOLE project architecture + scalability + production readiness in one pass, synthesizing ONE consolidated Architecture Health Report.

Core step `architecture-review-full` runs INLINE in the main session (it SPAWNS sub-agents). It:

1. **Resolves scope** — whole project / current diff / specific path.
2. **Fans out three deliberately-non-overlapping reviewers** as PARALLEL read-only sub-agents in one message behind an all-return barrier:
    - `architecture-scalability-review` (architect, scorecard /20)
    - `architecture-review` (architect, 13-category PASS/WARN/BLOCKED)
    - `production-readiness-review` (code-reviewer, SRE /24 + 8-item gate)
3. **Progressive synthesis (`IN PROGRESS`)** — opens ONE consolidated report file at status `🚧 IN PROGRESS` when fan-out starts, merges + **dedups** each face into it AS that face returns (never held in memory to the end). Siblings route to each other by design, so one underlying issue surfaces from multiple angles; collapse duplicates to one root finding citing every source.
4. **Fix-report-per-review `/why-review` gate (`VALIDATING`)** — ONE merged `/why-review` pass that WALKS EACH of the three review faces + the dedup and fixes the report in place (revise severities, drop false positives, restore any distinct issue the dedup collapsed).
5. **Finalize (`FINISHED`)** — locks the combined verdict (worst-case rollup: any BLOCKED / NOT READY / HIGH RISK dominates) and flips the report status to `✅ FINISHED`.

Parallelism lives INSIDE `architecture-review-full` (it owns the fan-out + all-return barrier), so this workflow declares NO workflow-level parallel groups.

After `architecture-review-full` returns the FINISHED report, the workflow-level **`why-review`** step runs the FINAL VALIDATION GATE over the AUDIT FINDINGS — a distinct altitude from the engine's per-face fix, and the machine-visible guarantee no audit finding ships without a why-review pass. Every PRIOR step routes its output into this gate; the gate BOTH validates findings AND reviews results across the steps it reaches:

- **investigate scope map** → validate audit scope (nothing in-scope missed, nothing out-of-scope pulled in).
- **`architecture-review-full` FINISHED report** → validate verdict-rollup correctness, dedup completeness, cross-review severity consistency; confirm each of the three review faces' contributions survived the per-face fix intact.
- **`docs-update` output** → NOT validated by this gate (docs-update runs AFTER it); `docs-update` self-validates its own doc diff by re-invoking `/why-review` inline on non-trivial edits (see step 4) before workflow-end.

Each PRIOR step, on completion, hands its findings + results forward to this gate — the AI MUST call the final `/why-review` to validate/review every prior step's output; a prior step is not "done" until routed to the gate. `docs-update`, running after the gate, owns validation of its own output.

READ-ONLY audit: produces findings + a verdict only. Every validated finding routes to a FOLLOW-UP `/plan` or feature workflow owning the fix — no fixes applied in this workflow. After the final `why-review` gate confirms the report, `docs-update` refreshes impacted documentation, then `workflow-end` clears state and `watzup` wraps up.

**UNIVERSAL RULES:**

- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when a finding touches specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.

Activate the `workflow-architecture-audit` workflow. Run `/start-workflow workflow-architecture-audit` with the user's prompt as context and the audit protocol above.

**Steps:** /investigate → /architecture-review-full → /why-review → /docs-update → /workflow-end → /watzup

---

**IMPORTANT MANDATORY Steps:** /investigate -> /architecture-review-full -> /why-review -> /docs-update -> /workflow-end -> /watzup

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Activate a read-only whole-project architecture, scalability, and production-readiness audit; synthesize one Architecture Health Report with three sub-scores and one combined verdict, then route validated fixes to a follow-up plan or feature workflow.

**IMPORTANT MUST ATTENTION Main steps in order:** **1** /investigate (scope) → **2** /architecture-review-full (INLINE: fan out 3 non-overlapping reviewers → progressive dedup synthesis → per-face `/why-review` fix → Finalize combined verdict) → **3** /why-review (FINAL validation gate over the audit findings — every prior step routes its output here) → **4** /docs-update (self-validates its own doc diff) → **5** /workflow-end → **6** /watzup. NEVER skip a gate; NEVER apply fixes inline.

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
