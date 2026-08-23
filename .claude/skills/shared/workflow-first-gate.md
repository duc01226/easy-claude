<!-- CANONICAL SOURCE of the Workflow-First Gate. Hook-independent primacy anchor stamped at the
     top of every generated context file so Claude and Codex get the same routing rule
     with ZERO hooks. Consumers (keep in lockstep — they read this file, with an inline fallback):
       - .claude/skills/claude-md-init/scripts/generate-claude-md.cjs  → CLAUDE.md (mirrored into AGENTS.md / .codex/CODEX_CONTEXT.md)
     The block between the CK:WORKFLOW-GATE markers below is what gets stamped verbatim. -->

## Quick Summary

**Goal:** Route each request before tool use, sending ordinary large/ambiguous ideas to their owning workflow with embedded decomposition and reserving standalone roadmap writing for explicit user intent.

**Summary:** classify complexity/risk → choose direct, custom, skill, or workflow route → activate it before edits/tools → apply the four-signal large-idea rule → preserve explicit-only roadmap writing and conditional scenario analysis.

**Main steps:** classify complexity/risk → declare the route → activate it before tools or edits → apply the selected protocol → verify the route preserved the explicit-only roadmap boundary.

**Key Rules:** the gate is hook-independent; explicit skill/workflow requests win; ordinary product vision/big/greenfield routes NEVER create a roadmap file by default; only an explicit roadmap request enters `product-roadmap`.

<!-- CK:WORKFLOW-GATE -->

> **[WORKFLOW-GATE] — routing is your FIRST action, before any tool call.**
> This rule is hook-independent: it binds Claude and Codex equally. Do not wait for any injected reminder to apply it.
>
> Classify complexity and risk first, then route it:
>
> | Request is about… | Default route |
> | --- | --- |
> | A simple, straightforward task with a clear target and low risk | **direct execution** — do it without a workflow |
> | A simple task that needs a few coordinated steps or skills | **custom simple workflow** — sequence only the necessary skills/steps |
> | A non-trivial bug, error, crash, regression, or wrong/stale output | **`workflow-bugfix` workflow** — `/start-workflow workflow-bugfix` |
> | A non-trivial new feature, capability, or enhancement | **`workflow-feature` workflow** — `/start-workflow workflow-feature` (use `workflow-big-feature` when scope is large, ambiguous, or research-heavy) |
> | A product vision, greenfield app, big/ambiguous capability, or release-scoped idea | **the owning idea/feature workflow** — apply the shared `isLargeIdea` rule and embed decomposition in PBI/spec/story/presentation/mock-up artifacts; do not create a roadmap file by default |
> | An explicit request for a product roadmap, roadmap update, or milestone selection | **`product-roadmap` skill** — the standalone writer is explicit-only and may create/update `docs/product-roadmap.md` |
> | A selected roadmap milestone or a large idea whose embedded decomposition needs adversarial failure, replay, state, ownership, recovery, or evidence analysis | **`scenario` skill** — run conditionally for that scope before `/plan`; it does not create a roadmap artifact |
> | Anything matching a skill's or workflow's "Use" clause | that skill / workflow |
> | A one-off question, or a truly trivial edit | direct execution |
>
> 1. **An explicit `/skill` or `/workflow` in the prompt is the user's choice — execute it directly.** Otherwise auto-select the route yourself; never ask the user which path to take.
> 2. **Analyze whether the task is simple and straightforward before defaulting to a standard workflow.** If the target is clear, the change is low-risk, and a short direct execution can satisfy it, choose direct execution.
> 3. **For simple but multi-step work, build a custom simple workflow with only the few relevant skills/steps.** Do not expand to a full standard workflow when a small custom sequence is enough.
> 4. **Use standard workflows for non-trivial bugs and feature/enhancement work** — they force the investigation, tests, and review that risky or broad changes need.
> 5. **Declare the route, then ACTIVATE it — declaring is not activating.** State `Route: {workflow-id | skill | custom-simple | direct} — because {reason}`, then:
>     - **Workflow route →** invoke `/start-workflow <id>` as a tool call. That skill loads the workflow's canonical step `sequence` and creates the task list **1:1** from it. You MUST NOT hand-author your own task list for a workflow route — the canonical `sequence` is the only source of truth. Writing `Route: …` in prose and then improvising a few tasks is the failure this gate exists to prevent.
>     - **Skill route →** invoke that skill via the `Skill` tool.
>     - **Custom simple workflow →** create a small task list from the selected skills/steps, then execute them in order.
>     - **Direct route →** build the task list yourself, then proceed.
>   In every case the route must be activated BEFORE the first edit, sub-agent, or command.
> 6. **Direct execution is a legitimate route** for trivial, one-off, or simple straightforward work — but the declare-route and activate steps still apply.
> 7. **Scaffolding-first for new foundations.** `workflow-greenfield-init` and `workflow-big-feature` scaffold a REVIEWED (`architecture-review-full`), example-rich, convention-bearing foundation — base abstractions + golden-path example code + a project-reference doc set — BEFORE fanning out feature work; features never build on an unreviewed foundation.

<!-- /CK:WORKFLOW-GATE -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Route first and preserve the product-roadmap boundary: ordinary routes embed large-idea scope in owning artifacts, while only explicit roadmap requests may write `docs/product-roadmap.md`.

**IMPORTANT MUST ATTENTION Main steps:** classify complexity/risk → declare route → activate route → apply the matching workflow/skill protocol → verify the selected route did not create an unauthorized roadmap artifact.
