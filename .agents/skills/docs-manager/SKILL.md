---
name: docs-manager
description: '[Documentation] Use when a workflow step or the user asks for documentation sync after code/spec/test changes (--mode=update), or explicit reference-doc initialization and reconciliation (--mode=init).'
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Host-native execution: Codex runs a skill by loading its `SKILL.md` instructions and executing the required steps with available tools. No separate `Skill` tool is required; a loaded skill is already activated.
> - Source vs execution: prefer the registered `.agents/skills/<name>/SKILL.md` for Codex execution. `.claude/**` remains the canonical authoring source; reading it for a registry or source inspection does not switch this session to Claude Code.
> - Capability check: interpret Claude tool names through the active host before declaring a blocker. Continue when Codex can perform the required operation; stop and ask only when the actual capability is unavailable, naming the step and evidence. Host-native execution is not a protocol deviation and needs no extra approval.
> - Todo tracking mandate: BEFORE executing any workflow or skill step, create/update todo tracking for all steps and keep it synchronized as progress changes.
> - Use ask user question tool to ask user.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
> **[BLOCKING] Mode routing — detect FIRST.** Explicit `--mode=update` or `--mode=init` selects that mode. `$docs-manager --mode=update` and `$docs-manager --mode=init` are the former `/docs-update` and `/docs-init`: those slash commands no longer exist, and each mode works called directly with no workflow. No mode flag and no natural-language request matching the `update` Intent column: show the [Mode Dispatch](#mode-dispatch) table and stop — ask nothing and run nothing (`init` is heavy and runs only on an explicit `--mode=init`). Read the mode file in full before anything else.

## Quick Summary

**Goal:** Keep documentation true to code: update impacted context, config, specs/tests and derived/demo outputs; explicitly initialize or reconcile selected reference docs.

**Summary:** Update impacted docs or explicitly initialize reference docs: detect mode → read its contract → resolve scope/owners → run gates → review and report evidence.

**Workflow:** Detect mode → read its full reference → execute its contract → verify and report.

**Key Rules:**

- One mode per invocation; load only the selected mode's body.
- A natural-language request that matches the `update` Intent column selects `update`; `init` is selected only by an explicit `--mode=init`. No mode flag and no such request: show the [Mode Dispatch](#mode-dispatch) table and stop.
- `--mode=` (two dashes) selects the skill mode. The `update` caller flag `mode=update` (no dashes, see that mode's Scope and inputs) only overrides `$spec` mode detection and never selects a skill mode.
- The `docs-manager` sub-agent (`agent_type="docs-manager"`) is an agent, not this skill; it drives `$docs-manager --mode=update`.
- MUST ATTENTION keep claims evidence-based (`file:line`, confidence >80% to act) and task tracking live as each step starts and completes.

## Mode Dispatch

| Mode | Purpose | Intent (natural-language triggers) | Read in full FIRST |
| --- | --- | --- | --- |
| `--mode=update [modules=… changed_files=… phases=… skip_phases=… tc_mode=… freshness={impact\|full\|off} base=…]` | Impact-scoped context/config checks → spec/test owners → derived/demo outputs → report. Formerly `/docs-update` | "update docs", "docs impacted by my changes", "sync docs after code change", "doc sync", "documentation update" | `references/mode-update.md` |
| `--mode=init` | Initialize or reconcile selected, applicable reference docs through `scan`. Formerly `/docs-init` | _(explicit `--mode=init` only)_ | `references/mode-init.md` |

- **[BLOCKING]** When `--mode=update`, read `references/mode-update.md` in full FIRST; it owns scope, owners, freshness, intent/coverage, caller flags and the report (`tmp/reports/docs-update-{YYMMDD}-{HHMM}.md`). Workflow invocation and standalone both run the full contract.
- **[BLOCKING]** When `--mode=init`, read `references/mode-init.md` in full FIRST; it owns optional config, document selection and applicability-gated scans.
- One-doc rebuilds stay in `scan` (`$scan --target=<key>`); refreshing every selected reference doc at once stays in `scan-all`. `--mode=update` escalates to them and `--mode=init` delegates to `scan`; neither is a mode of this skill.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Keep project documentation true to the code through the selected update or init contract.

**IMPORTANT MUST ATTENTION Main steps:** detect mode → read its full reference → resolve scope and ownership → run quality gates → review and report evidence.

- **MANDATORY IMPORTANT MUST ATTENTION** `--mode=<x>` reads `references/mode-<x>.md` in full FIRST; no mode flag and no `update`-intent request shows the mode table and stops — never guess a mode, never start `init` without an explicit `--mode=init`
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)

**[TASK-PLANNING]** Track the selected contract before acting, with a final consistency review.

| Evasion | Required action |
| --- | --- |
| "Direct call, skip the reference" | Standalone calls retain the full selected contract. |
