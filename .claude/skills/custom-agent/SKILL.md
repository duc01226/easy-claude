---
name: custom-agent
description: '[AI & Tools] Use when creating, verifying, or enhancing Claude Code custom agent files.'
---

## Quick Summary

**Goal:** Create new custom agents, audit existing agent quality, or enhance agent definitions so each agent is valid, least-privilege, structurally complete, and ready for safe delegation.

**Summary:** Route the request to Create, Audit, or Enhance; inspect existing agents and conventions; apply only confirmed changes; then validate frontmatter, tools, prompt structure, and quality score.

**Workflow:** Detect mode (Create/Audit/Enhance) from `$ARGUMENTS` → Execute → Validate

**Key Rules:**

- Agent files: `.claude/agents/{name}.md` with YAML frontmatter + markdown body as system prompt
- Agent does NOT inherit Claude Code system prompt — write complete instructions
- Minimize tools to only what the agent needs
- System prompt structure: `## Role` → `## Workflow` → `## Key Rules` → `## Output`

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Modes

| Mode        | Trigger                                        | Action                 |
| ----------- | ---------------------------------------------- | ---------------------- |
| **Create**  | `$ARGUMENTS` describes a new agent             | Create agent file      |
| **Audit**   | mentions verify, audit, review, check, quality | Audit existing agents  |
| **Enhance** | mentions refactor, enhance, improve, optimize  | Improve existing agent |

## Mode 1: Create Agent

1. **Clarify** — `AskUserQuestion`: purpose, read-only vs read-write, model preference, memory needs
2. **Check Existing** — Glob `.claude/agents/*.md` for similar agents. Avoid duplication.
3. **Scaffold** — Create `.claude/agents/{name}.md` using frontmatter template below
4. **Write System Prompt** — Structure: `## Role` → `## Workflow` → `## Key Rules` → `## Output`
5. **Validate** — Run audit checklist below

## Mode 2: Audit Agents

1. **Discover** — Glob `.claude/agents/*.md`
2. **Parse** — Read first 30 lines of each, extract frontmatter
3. **Validate** — Check each audit rule below
4. **Report** — Issues grouped by severity (Error > Warning > Info), include quality scores
5. **Fix** — If user confirms, fix Error-level issues automatically

## Mode 3: Enhance Agent

1. **Read** — Load specified agent file
2. **Analyze** — Check against best practices and audit checklist
3. **Recommend** — List improvements with rationale
4. **Apply** — If user confirms, apply enhancements

---

## Agent Frontmatter Schema

```yaml
---
# REQUIRED
name: my-agent # Lowercase + hyphens only
description: >- # Claude uses this to decide when to delegate
    Use this agent when [specific trigger scenarios].

# OPTIONAL — Tools
tools: Read, Grep, Glob, Bash # Allowlist (omit both → inherits all)
disallowedTools: Write, Edit # Denylist (removes from inherited set)
# Task(agent1, agent2) restricts spawnable subagents

# OPTIONAL — Model
model: inherit # inherit | sonnet | opus | haiku

# OPTIONAL — Permissions
permissionMode: default # default | acceptEdits | dontAsk | bypassPermissions | plan

# OPTIONAL — Skills (content injected at startup)
skills:
    - skill-name

# OPTIONAL — MCP Servers
mcpServers:
    - server-name

# OPTIONAL — Hooks (scoped to this agent)
hooks:
    PreToolUse:
        - matcher: 'Bash'
          hooks:
              - type: command
                command: './scripts/validate.sh'

# OPTIONAL — Memory (MEMORY.md auto-injected, Read/Write/Edit auto-added)
memory: project # user (~/.claude/agent-memory/) | project (.claude/agent-memory/) | local (gitignored)

# OPTIONAL — Execution
background: false # true = always background task
isolation: worktree # Run in temporary git worktree
---
```

## Tool Restriction Patterns

| Agent Type           | Recommended `tools`                     |
| -------------------- | --------------------------------------- |
| Explorer / `/investigate` | `Read, Grep, Glob, Bash`                |
| Reviewer (read-only) | `Read, Grep, Glob`                      |
| Writer/Implementer   | `Read, Write, Edit, Grep, Glob, Bash`   |
| Researcher           | `Read, Grep, Glob, WebFetch, WebSearch` |
| Orchestrator         | `Read, Grep, Glob, Task(sub1, sub2)`    |

Available tools: Read, Write, Edit, MultiEdit, Glob, Grep, Bash, WebFetch, WebSearch, Task, NotebookRead, NotebookEdit, TaskCreate, TaskUpdate, AskUserQuestion, + MCP tools.

## Model Selection

| Model     | Best For                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------ |
| `haiku`   | Fast read-only: scanning, search, file listing                                                         |
| `sonnet`  | Balanced: code review, debugging, analysis                                                             |
| `opus`    | High-stakes: architecture, complex implementation. Better quality for code review, debugging, analysis |
| `inherit` | Default — match parent's model                                                                         |

## Description Best Practices

```yaml
# BAD — too vague, Claude won't auto-delegate
description: Reviews code

# GOOD — specific trigger conditions
description: >-
  Use this agent for comprehensive code review after implementing features,
  before merging PRs, or when assessing code quality and technical debt.
```

- Include "Use this agent when..." phrasing with concrete scenarios
- Add "use proactively" to encourage auto-invocation

## Common Anti-Patterns

| Anti-Pattern                       | Fix                                       |
| ---------------------------------- | ----------------------------------------- |
| No tool restrictions               | Add `tools` allowlist                     |
| Vague description                  | Write specific trigger conditions         |
| Giant system prompt                | Keep concise, use `skills` for detail     |
| Recursive subagents                | Restrict `Task` in tools                  |
| Windows long prompts (>8191 chars) | Use file-based agents, not `--agents` CLI |

## Context Passing

- Agent receives ONLY its system prompt + task prompt — NOT parent conversation
- Parent receives ONLY agent's final result — NOT intermediate tool calls
- This isolation is the primary context management benefit

## Audit Checklist

| #   | Check                | Rule                           | Severity |
| --- | -------------------- | ------------------------------ | -------- |
| 1   | Frontmatter exists   | Must have `---` delimiters     | Error    |
| 2   | Name present & valid | Lowercase + hyphens only       | Error    |
| 3   | Description present  | Non-empty, >20 chars           | Error    |
| 4   | No duplicate names   | Unique across all agent files  | Error    |
| 5   | Description quality  | Specific trigger scenarios     | Warning  |
| 6   | Tools minimal        | Only what agent needs          | Warning  |
| 7   | Prompt structure     | Has `## Role` + `## Workflow`  | Warning  |
| 8   | Model set            | When task differs from default | Info     |

**Quality Score:** Valid frontmatter (20) + Description >50 chars (20) + Tools restricted (15) + Role section (15) + Workflow section (10) + Model set (10) = 90. Rating: 80+ Excellent, 60-79 Good, 40-59 Needs Work, <40 Poor.

## File Priority (highest first)

1. `--agents` CLI flag (session only)
2. `.claude/agents/*.md` (project)
3. `~/.claude/agents/*.md` (user)
4. Plugin `agents/` directory

Same `name` across levels: higher-priority wins. Use `claude agents` CLI to list all.

## Requirements

<user-prompt>$ARGUMENTS</user-prompt>

---

**IMPORTANT Task Planning Notes (MUST ATTENTION FOLLOW)**

- Always break work into small todo tasks
- Always add a final review todo task

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Project applicability gate.** Before applying a stack, layer, style, tool, or architecture rule, read the project's config and relevant references, then check local implementations. Treat framework examples as examples; honor explicit N/A and do not require a technology or convention the project does not use.
> **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
> **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Judge the environment before judging the code.** A bug report, failed test, error, or unexpected output is not proof of a code defect. Before and during adjudication, weigh environment causes as a competing hypothesis — setup, config, version and dependency state, service dependencies, stale artifacts or leftover state, and transient resource pressure (RAM, CPU, disk, handles, network). State the discriminator you ran; fix an environment cause in the environment, never by editing product code or weakening a test to absorb it.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.
<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Create new custom agents, audit existing agent quality, or enhance agent definitions so each agent is valid, least-privilege, structurally complete, and ready for safe delegation.

**IMPORTANT MUST ATTENTION** follow the mode-specific path: detect mode → Create: clarify, check existing agents, scaffold, write the system prompt, validate; Audit: discover, parse, validate, report, and fix only after confirmation; Enhance: read, analyze, recommend, apply only after confirmation; then run the final audit checklist and quality-score validation.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistakes:** holistic-first debug, fix at responsible layer, surgical diff, verify ALL outputs.
- **Critical Thinking:** traced `file:line` proof every claim, confidence >80% to act, NEVER guess.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
