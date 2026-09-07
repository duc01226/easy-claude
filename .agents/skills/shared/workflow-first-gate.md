<!-- Canonical routing block consumed by the root generator. -->

<!-- CK:WORKFLOW-GATE -->

> **[WORKFLOW-GATE] — routing is your FIRST action, before any tool call.** This gate is hook-independent and is the single intent router.
>
> Honor an explicit request to execute a skill/workflow first. Otherwise auto-select by complexity and risk; never ask the user to choose the execution path.
>
> | Intent | Route |
> | --- | --- |
> | Clear, low-risk task or one-off question | direct |
> | Simple coordinated steps | custom-simple: only the necessary skills/steps |
> | Non-trivial bug/regression/stale output | `workflow-bugfix` |
> | Non-trivial feature/enhancement | `workflow-feature`; large/ambiguous/research-heavy scope uses `workflow-big-feature` |
> | Product vision, greenfield or release-scoped idea | owning idea/feature workflow; apply shared `isLargeIdea` and embed decomposition in its artifacts |
> | Explicit roadmap/update/milestone-selection request | `product-roadmap`; only this explicit intent may write `docs/product-roadmap.md` |
> | Milestone/large-idea scope needing adversarial failure, replay, state, ownership, recovery or evidence analysis | conditional `scenario` before `$plan`; no roadmap artifact |
> | Other matching skill/workflow Use clause | that skill/workflow, verified from its canonical definition |
>
> Declare `Route: {workflow-id | skill | custom-simple | direct} — because {reason}`, then ACTIVATE before edits, agents or commands. Workflow: execute `$start-workflow <id>` and use its canonical sequence for tasks 1:1; never improvise that list. Skill: read and execute its SKILL.md through the host's supported mechanism. Custom/direct: create a small task list and execute it. Missing required tools/details: stop and report; never fabricate invocation.
>
> Ordinary large-idea routes do not create a roadmap by default. New foundations in `workflow-greenfield-init`/`workflow-big-feature` require an `architecture-review-full` reviewed scaffold, golden-path examples and project references BEFORE feature fan-out. Routing preserves operation authority, user data and all required quality gates.

<!-- /CK:WORKFLOW-GATE -->
