<!-- Canonical routing block consumed by tracked context generators and the optional runtime refresh hook. -->

<!-- CK:WORKFLOW-GATE -->

> **[WORKFLOW-GATE] — routing is your FIRST action; only a quick read-only look may precede it.**
>
> Honor an explicit skill/workflow request first. Otherwise assess, auto-select and proceed; never ask the user to choose the execution path — the declared route is the user's override point.
>
> **Mid-session: never auto-activate a workflow.** Auto-activation applies only to the first task of a session (its first user prompt; compaction or resume does not reset it). Once work is under way (follow-up, correction, next step, or a new ask), do it directly or with the best-fit skill or a lean chain of at most 3 skills; required gates (root-cause investigation for a bug, test, review, spec/doc sync, and any other required quality gate) still run and do not count toward that cap, and continuing a workflow already running is not activating one. An explicit workflow request always runs, mid-session included — a `/workflow-*` or `/start-workflow <id>` call, or the user asking in words to use a workflow; follow it.
>
> **Assess (brief, from the prompt plus that quick look):** scope · change type (answer, tweak, behavior, public contract) · risk (irreversible, data, security, cross-module) · ambiguity · artifacts actually needed. Escalate on risk and ambiguity, not file count alone.
>
> | Signals | Route |
> | --- | --- |
> | Question, lookup, or trivial low-risk edit; one skill covers it | direct: plain answer or that one skill |
> | Focused change (one module/policy, clear intent, no public-contract change) | custom-simple: only the canonical steps it needs, in dependency order |
> | Non-trivial bug/regression/stale output, cause unknown or wide reach | `workflow-bugfix` |
> | Non-trivial feature/enhancement changing behavior or a contract across modules | `workflow-feature` (`workflow-big-feature` if large/ambiguous/research-heavy) |
> | Product vision, greenfield or release-scoped idea | owning idea/feature workflow; apply shared `isLargeIdea` and embed decomposition in its artifacts |
> | Explicit roadmap/update/milestone-selection request | `product-roadmap`; the only writer of the product-roadmap artifact (default `docs/product-roadmap.md`; `docsRoots.productRoadmap.path` in `docs/project-config.json` overrides) |
> | Milestone/large-idea scope needing adversarial failure/replay/state/ownership/recovery/evidence analysis | conditional `scenario` before planning; no roadmap artifact |
> | Other matching skill/workflow Use clause | that skill/workflow, verified from its canonical definition |
>
> **Catalog fit:** the table route is the default. Keep a catalog workflow when >80% of its unconditional steps would do real work; otherwise downgrade to custom-simple, trimming only steps that would do no real work. A behavior change keeps its test and review steps; a downgraded route also keeps root-cause investigation for bugs and spec/doc sync when behavior or a public contract changes. Re-declare if evidence changes the complexity.
>
> Declare `Route: {workflow-id | skill | custom-simple [step → step] | direct} — because {key signals}` (e.g. `Route: custom-simple [investigate → fix → test → changes-review] — because known cause, one module`), then ACTIVATE before edits, agents or commands. Workflow: invoke `start-workflow` with its id; map its canonical sequence to tasks 1:1. Skill: read and execute its SKILL.md. Custom/direct: one task per step plus a final review. Missing tools/details: stop and report; never fabricate invocation.
>
> New foundations in `workflow-greenfield-init`/`workflow-big-feature` require an `architecture-review-full` reviewed scaffold, golden-path examples and project references BEFORE feature fan-out. Routing preserves operation authority, user data and all required quality gates.

<!-- /CK:WORKFLOW-GATE -->
