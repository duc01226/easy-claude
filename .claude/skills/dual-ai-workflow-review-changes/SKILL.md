---
name: dual-ai-workflow-review-changes
version: 1.1.2
description: '[User-Invoked] Use ONLY when the user explicitly types /dual-ai-workflow-review-changes — runs the review-changes workflow in two fresh parallel xhigh full-permission sessions: /workflow-review-changes in Claude Code and $workflow-review-changes in Codex. NEVER auto-activate.'
disable-model-invocation: true
---

## Quick Summary

**Goal:** Fan out the Review Current Changes workflow to two independent fresh AI sessions at xhigh effort and full-permission mode — Claude Code runs its native `/workflow-review-changes` skill, Codex runs its mirrored `$workflow-review-changes` skill — so the user gets two independent reviews of the same working tree.

**Workflow:**

1. **Delegate** — execute the `dual-ai` skill workflow with fixed per-tool prompts (no user prompt needed)
2. **Report** — relay dual-ai's report (run folder, window titles / headless output files)

**Key Rules:**

- **MANUAL-ONLY:** Spawns external AI sessions that consume quota. Run ONLY on explicit user invocation. NEVER auto-activate
- Fixed prompts — pass them as opaque literals, never rewrite:
  - `CLAUDE_PROMPT` = `/workflow-review-changes`
  - `CODEX_PROMPT` = `$workflow-review-changes`
- Do NOT run any review yourself in the current session — orchestrate only

# Dual AI: Review Current Changes

## Variables

- `CLAUDE_PROMPT`: `/workflow-review-changes` (literal — Claude Code slash-skill invocation)
- `CODEX_PROMPT`: `$workflow-review-changes` (literal — Codex mirrored-skill invocation; the `$` is part of the prompt text, never expand it as a shell variable)
- `MODE`: `--orchestrate` (alias `--headless`) flag in $ARGUMENTS → forward to dual-ai orchestrated mode. RECOMMEND this mode to the user when they want the two reviews collected and merged automatically — the runner waits for both sessions, tracks `status.json`/`events.ndjson` start-to-end, and this session then compares both review outputs
- Any other $ARGUMENTS text: append verbatim to BOTH prompts after the skill invocation (extra reviewer instructions, e.g. scope hints)

## Workflow

1. Read `.claude/skills/dual-ai/SKILL.md` and execute its full workflow for the detected MODE (validate CLIs + detect OS → persist prompts → then interactive launcher spawn OR orchestrated runner per its step 5 → report). Do NOT invoke it via the Skill tool — `dual-ai` is `disable-model-invocation: true`; this wrapper carries the user's explicit invocation, so executing its instructions directly is the sanctioned path.
2. Supply the per-tool prompts from Variables above as dual-ai's `CLAUDE_PROMPT` / `CODEX_PROMPT` values in its "Persist prompts" step — verbatim, single line, no quoting added. The prompt file names/locations are owned by dual-ai's SKILL.md; do not restate them here.
3. Both sessions run from the repo root, so each reviews the same uncommitted working tree independently.
4. Report exactly what dual-ai's report step specifies, plus: remind the user the two reviews are independent — divergent findings are signal. In interactive mode they can paste both back here for a merge/compare; in orchestrated mode the merge/compare happens automatically when the runner finishes (agreement matrix: findings both reviewers raised, findings only one raised, contradictions).

## Failure Modes

Inherit all dual-ai failure modes. Additionally:

- **Codex has no `$workflow-review-changes` skill mirror** → the Codex session will treat the prompt as plain text and improvise a review; tell the user to check the Codex prompts/skills mirror sync if the output ignores the workflow steps.
- **No uncommitted changes in the working tree** → both sessions will report nothing to review; check `git status` BEFORE spawning and warn the user (still spawn if they confirm).

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
**Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
**Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
**Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
**Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
**When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
**Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
**Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
**Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
**Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
**Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.
**Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. The leak compiles and runs, so it passes review silently while coupling the "reusable" layer to one consumer. Push domain fields/logic down into the consumer via subclass or composition.

<!-- /SYNC:ai-mistake-prevention -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** run ONLY on explicit user invocation — never auto-activate
**IMPORTANT MUST ATTENTION** pass `/workflow-review-changes` and `$workflow-review-changes` as opaque literals — never expand or rewrite
**IMPORTANT MUST ATTENTION** execute dual-ai's SKILL.md workflow directly; do not review anything yourself in this session
<!-- SYNC:critical-thinking-mindset:reminder -->
**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->
**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
<!-- /SYNC:ai-mistake-prevention:reminder -->
