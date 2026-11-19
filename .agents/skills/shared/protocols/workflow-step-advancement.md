## Workflow Step Advancement & Parallel Phases

**Provision missing dependencies.** Confirm the declared package/version and try one bounded, noninteractive global install with a supported manager. Fall back to an isolated or local runtime or an equivalent tool, then recheck the consumer. Skip only optional capabilities and report blocked checks. Avoid sudo, forcing system Python and repeated retries.

**Host-native skill execution.** Use the registered skill loader in Claude Code or OpenCode, or load and follow the registered `SKILL.md` in Codex. Author in `.claude/**`. Native execution and equivalent tracking need no deviation approval. Check for an equivalent host operation before asking. Name the step and evidence when a required operation is unavailable.

Follow the canonical sequence, gates and authority limits. Advance from verified outputs and task state without waiting for a hook. Apply the same acceptance criteria to inline and delegated work. Mark conditional steps skipped when their triggers are absent.

Declare waves before work. Mark substantial, independent tasks with disjoint write sets `PAR`. Mark other tasks `SEQ` and name dependencies. Never parallelize shared writers, fixed gates, pending approvals or work too small to justify delegation. Plans need explicit `PAR`/`SEQ` tags and phase write sets for fan-out. Dispatch each wave together and wait for every verified result before advancing or mutating.

Nested workflows use a sub-agent with incremental reporting. Run `workflow-review-changes` inline in the main session and delegate its reviewers. Limit fan-out to one level unless the agent definition allows more. Brief each agent on scope, owned files, context and required evidence.
