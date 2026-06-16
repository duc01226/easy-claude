---
name: memory-management
version: 1.0.0
description: '[Utilities] Use when saving or recovering task progress across sessions via file checkpoints — especially before context compaction.'
disable-model-invocation: true
---

## Quick Summary

**Goal:** Persist task progress across sessions using file-based checkpoints so work survives context loss and compaction.

**Workflow:**

1. **File Checkpoints** — Save task-specific context to `plans/reports/checkpoint-*.md` every 30-60 min
2. **Recovery** — On context loss, find latest checkpoint via Glob, read it, resume from documented next steps

**Key Rules:**

- Create checkpoints before expected context compaction and at key milestones
- Always include Recovery Instructions in checkpoint files
- Checkpoints are file-based and permanent; create them with `/checkpoint`, restore with `/recover`

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Memory Management & Task Continuity

Provide external file-based checkpoints for long-running tasks so progress, findings, and next steps survive context loss and compaction.

---

## File-Based External Memory (Checkpoints)

### When to Create File Checkpoints

- Starting complex multi-step tasks (investigation, planning, implementation)
- Every 30-60 minutes during long tasks
- At key milestones
- Before expected context compaction
- After completing significant analysis phases

### Checkpoint File Location

Files saved to: `plans/reports/checkpoint-{YYYYMMDD}-{HHMMSS}-{slug}.md`

### CHECKPOINT_CREATE Protocol

Create a checkpoint file with this structure:

```markdown
# Memory Checkpoint: {Task Description}

> Created: {ISO timestamp}
> Task Type: {investigation|planning|bugfix|feature|docs}
> Phase: {current phase number/name}

## Task Context

{What you're working on and why}

## Key Findings

{Critical discoveries and insights - be specific with file paths and line numbers}

## Files Analyzed

| File              | Purpose     | Status   |
| ----------------- | ----------- | -------- |
| path/file.cs:line | description | ✅/🔄/⏳ |

## Progress

- [x] Completed items
- [ ] In-progress items
- [ ] Remaining items

## Important Context

{Information that must be preserved - decisions, assumptions, rationale}

## Next Steps

1. {Immediate next action}
2. {Following action}

## Recovery Instructions

{Exact steps to resume: which file to read, which line to continue from}
```

### CHECKPOINT_RECOVER Protocol

When recovering from a checkpoint:

1. Search for latest checkpoint: `Glob("plans/reports/checkpoint-*.md")`
2. Read the checkpoint file
3. Load any referenced analysis files
4. Review Progress section
5. Continue from documented Next Steps
6. Create new checkpoint after resuming

### Checkpoint Before Compaction (manual — no auto hook)

There is **no** automatic PreCompact checkpoint hook. Before a long task that risks compaction, create a checkpoint manually with `/checkpoint`. On resume, static `CLAUDE.md` / `SKILL.md` re-read plus `/recover` over the on-disk checkpoint restores context.

---

## Integration with Workflows

### Long-Running Task Memory Pattern

All long-running workflows should follow this pattern:

```
┌─────────────────────────────────────────────────────────┐
│ TASK START                                               │
│   └── Create initial checkpoint with task context        │
│   └── Initialize todo list                               │
│                                                          │
│ EVERY 20-30 OPERATIONS                                   │
│   └── Update checkpoint with progress                    │
│   └── Update todo list status                            │
│                                                          │
│ MILESTONE REACHED                                         │
│   └── Create detailed checkpoint                         │
│                                                          │
│ BEFORE COMPACTION (no auto hook - /checkpoint)           │
│   └── Create a checkpoint manually                       │
│                                                          │
│ AFTER COMPACTION / SESSION RESUME                        │
│   └── Read latest checkpoint                             │
│   └── Continue from documented Next Steps                │
│                                                          │
│ TASK COMPLETE                                             │
│   └── Final checkpoint with summary                      │
│   └── Clean up temporary checkpoints                     │
└─────────────────────────────────────────────────────────┘
```

### Checkpoint Naming Convention

| Type              | Format                                      | Example                                |
| ----------------- | ------------------------------------------- | -------------------------------------- |
| Manual checkpoint | `checkpoint-{YYYYMMDD}-{HHMMSS}-{slug}.md`  | `checkpoint-20250106-143000-user-auth.md` |
| Auto checkpoint   | `checkpoint-{YYYYMMDD}-{HHMMSS}-{slug}.md`  | `checkpoint-20250106-143000-autosave.md`  |
| Analysis notes    | `{type}-{date}-{slug}.md`                   | `analysis-250106-payment-flow.md`      |
| Task notes        | `.ai/workspace/analysis/{slug}.analysis.md` | Used by feature                        |

> **Legacy back-read:** checkpoints written before grammar unification — `memory-checkpoint-*.md`, or `checkpoint-{YYMMDD}-{HHMM}-{slug}.md` without seconds — are still discovered by `/recover`. No on-disk checkpoint is orphaned by the rename. (`/recover` is the sole discoverer — recovery is skill-driven.)

### Related Commands & Skills

| Command/Skill            | Purpose                             |
| ------------------------ | ----------------------------------- |
| `/checkpoint`            | Create manual memory checkpoint     |
| `/context`               | Load project context                |
| `/compact`               | Manually trigger context compaction |
| `/watzup`                | Generate progress summary           |
| `workflow-feature`                | Uses task analysis notes pattern    |
| `debug-investigate`      | Uses investigation logs             |
| `investigate`  | Uses analysis report pattern        |

## Related

- `learn`
- `context-optimization`

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.
> **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. The leak compiles and runs, so it passes review silently while coupling the "reusable" layer to one consumer. Push domain fields/logic down into the consumer via subclass or composition.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
