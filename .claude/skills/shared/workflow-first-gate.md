<!-- CANONICAL SOURCE of the Workflow-First Gate. Hook-independent primacy anchor stamped at the
     top of every generated context file so Claude, Codex, and Copilot get the same routing rule
     with ZERO hooks. Consumers (keep in lockstep — they read this file, with an inline fallback):
       - .claude/skills/claude-md-init/scripts/generate-claude-md.cjs  → CLAUDE.md (mirrored into AGENTS.md / .codex/CODEX_CONTEXT.md)
       - .claude/scripts/sync-copilot-workflows.cjs                     → .github/copilot-instructions.md
     The block between the CK:WORKFLOW-GATE markers below is what gets stamped verbatim. -->

<!-- CK:WORKFLOW-GATE -->

> **[WORKFLOW-GATE] — routing is your FIRST action, before any tool call.**
> This rule is hook-independent: it binds Claude, Codex, and Copilot equally. Do not wait for any injected reminder to apply it.
>
> Classify the request, then route it:
>
> | Request is about… | Default route |
> | --- | --- |
> | A bug, error, crash, regression, or wrong/stale output | **`bugfix` workflow** — `/workflow-start bugfix` |
> | A new feature, capability, or enhancement | **`feature` workflow** — `/workflow-start feature` (use `big-feature` when scope is large, ambiguous, or research-heavy) |
> | Anything matching a skill's or workflow's "Use" clause | that skill / workflow |
> | A one-off question, or a truly trivial edit | direct execution |
>
> 1. **An explicit `/skill` or `/workflow` in the prompt is the user's choice — execute it directly.** Otherwise auto-select the route yourself; never ask the user which path to take.
> 2. **Prefer the workflow for bug fixes and for feature/enhancement work** — workflows force the investigation, tests, and review that ad-hoc edits silently skip.
> 3. **Declare the route, then ACTIVATE it — declaring is not activating.** State `Route: {workflow-id | skill | direct} — because {reason}`, then:
>     - **Workflow route →** invoke `/workflow-start <id>` as a tool call. That skill loads the workflow's canonical step `sequence` and creates the task list **1:1** from it. You MUST NOT hand-author your own task list for a workflow route — the canonical `sequence` is the only source of truth. Writing `Route: …` in prose and then improvising a few tasks is the failure this gate exists to prevent.
>     - **Skill route →** invoke that skill via the `Skill` tool.
>     - **Direct route →** build the task list yourself, then proceed.
>   In every case the route must be activated BEFORE the first edit, sub-agent, or command.
> 4. **Direct execution is a legitimate route** for trivial or one-off work — but the declare-route and activate steps still apply.

<!-- /CK:WORKFLOW-GATE -->
