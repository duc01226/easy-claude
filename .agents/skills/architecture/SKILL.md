---
name: architecture
description: '[Architecture] Use when a workflow step or the user asks for architecture design, compliance review, scalability grading or whole-project audit via --mode={design|review|scalability|full}.'
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Host-native execution: Codex runs a skill by loading its `SKILL.md` instructions and executing the required steps with available tools. No separate `Skill` tool is required; a loaded skill is already activated.
> - Source vs execution: prefer the registered `.agents/skills/<name>/SKILL.md` for Codex execution. `.claude/**` remains the canonical authoring source; reading it for a registry or source inspection does not switch this session to Claude Code.
> - Capability check: interpret Claude tool names through the active host before declaring a blocker. Continue when Codex can perform the required operation; stop and ask only when the actual capability is unavailable, naming the step and evidence. Host-native execution is not a protocol deviation and needs no extra approval.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - Use ask user question tool to ask user.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
## Quick Summary

> **Review modes:** For review/audit work, standalone defaults to `--review-only` (`--report-only` alias); `--fix-loop` enables review → validate → authorized fix → fresh re-review, default cap 3. `--fix-loop --loop-owner=caller` returns a read-only pass to the caller that owns fixes/re-review. Create triage, review, validation and re-review todo tasks first; apply the carried `review-policy` contract for LOW deferral and user-approved bounded extensions. Non-review modes and terminal findings validation keep their own dispatch.

**Goal:** Run the selected architecture contract to design a solution, review compliance, grade scalability, or deliver a whole-project health report with evidence-backed decisions.

**Summary:** Select the explicit `--mode` → read its complete reference → execute its own phases, evidence gates, flags and outputs → validate and hand off. No mode prints the table and stops, without questions or work. `full` composes read-only reviewer faces; other modes run independently.

**Workflow:** Dispatch → load the selected contract → triage targets and plan review tasks → execute the mode → validate → hand off.

**Key Rules:**

- Detect `--mode` before any work; load only the selected reference in full.
- Preserve each mode's scope, authority, scores, gates, report paths and round caps.
- For capacity/cache decisions, apply the selected mode's measured-capacity protocol: workload evidence and business availability needs govern the next step.

## Mode Dispatch

Read the named reference in full when its explicit mode is selected. No mode: show this table and stop; ask nothing, run nothing, never infer a default.

| Mode | Purpose and owned contract | Read in full FIRST |
| --- | --- | --- |
| _(none)_ | Show this table; ask nothing; run nothing | — |
| `--mode=design [brief]` | Solution architecture across backend, frontend, data, integration and deployment; ≥3 researched options per concern, ADRs, scaffold/harness handoff and Step-12 user-validation interview | [references/mode-design.md](references/mode-design.md) |
| `--mode=review [scope] [--report-only]` | Change compliance: 13 serial categories, PASS/WARN/BLOCKED report, Phase-5 validation and bounded review rounds. `--report-only` returns a read-only leaf report to the caller that owns fixes | [references/mode-review.md](references/mode-review.md) |
| `--mode=scalability [init\|audit] [scope]` | Project or planned-architecture grade: ten-area `/20` scorecard, G1-G7, non-scoring TVC and advisory matrices | [references/mode-scalability.md](references/mode-scalability.md) |
| `--mode=full [scope]` | Whole-project architecture, scalability and production-readiness audit: INLINE orchestrator, three parallel read-only faces, dedup and one consolidated report/verdict | [references/mode-full.md](references/mode-full.md) |

- `init` / `audit` (also `mode=init` / `mode=audit`) are scalability run types, separate from `--mode=scalability`. Read [references/scorecard.md](references/scorecard.md) when scoring that mode.
- Only `full` composes modes: its children read and run the `scalability` and `review` references plus the separate `production-readiness-review` skill. Never copy or re-implement a face.

<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Run the selected architecture contract to design a solution, review compliance, grade scalability, or deliver a whole-project health report with evidence-backed decisions.

**MUST ATTENTION Main steps:** dispatch explicit mode → read its complete contract → triage targets and plan review tasks → execute the mode's phases → validate → hand off.

- No mode prints the table and stops: no question, inferred mode or audit.
- Load only the selected reference; retain its flags, gates, report paths, score semantics, authority and round caps.
- `full` runs INLINE and composes read-only sub-agent faces; each face loads its own contract.
- Capacity decisions follow workload → safe measured-work reduction → capacity/recovery proof, within the selected mode's contract.

**Anti-Rationalization:**

| Evasion | Required action |
| --- | --- |
| “Architecture means full audit” | Require an explicit mode; otherwise show help and stop. |
| “The summary is enough” | Read the selected reference in full before execution. |
| “Reuse another mode's procedure” | Follow this mode's contract; only `full` composes faces. |

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md
- `review-policy` — Review-only or a three-round fix loop with explicit extension and fresh post-fix evidence; deciding round eligibility, blocking findings or review state → .claude/skills/shared/protocols/review-policy.md

<!-- PROTOCOL-GUIDES:END -->



<!-- SYNC:review-policy:reminder -->

**MUST ATTENTION** Triage all targets, plan and create review/validation/fix/fresh re-review tasks first. Review-only reports without edits; fix-loop freshly reviews every repair under one fixing owner. Default cap three rounds: disclose deferred LOWs, ask and wait before a bounded extension for MEDIUM+ or failed required checks. Preserve scope, coverage and actual operation authority.

<!-- /SYNC:review-policy:reminder -->
