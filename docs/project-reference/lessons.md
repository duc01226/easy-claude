# Lessons

<!-- This file is referenced by Claude skills and agents for project-specific context. -->
<!-- Fill in your project's details below. -->

- [2026-03-10] **Mirror copies create staleness traps.** Editing a canonical source is insufficient when mirror copies exist — must trace and update ALL mirrored files (configs, skill definitions, docs). Grep verification after edits catches missed mirrors.
- [2026-03-10] **Docs embedding derived data stale on source modification.** Documentation that inlines data from a canonical source (e.g., workflow sequences, API schemas) goes stale silently when the source changes. Map all docs that embed canonical data and update them alongside the source.
- [2026-04-14] **Front-load report-write in sub-agent prompts for large reviews.** Sub-agents reviewing many files exhaust token budget before writing the final report — all findings lost. Design prompts so: (1) report-write is the explicit first deliverable, (2) findings appended per-file immediately (not batched), (3) scope is bounded. If sub-agent returns truncated output with no report, spawn a new one with narrower scope.
- [2026-04-14] **After context compaction, re-verify all prior phase outcomes before continuing.** Session summaries describe what the AI intended — not what persisted in the environment. When resuming a multi-phase task, the first action must be a state audit: re-check git status, re-read files, verify filesystem state. Treat every "completed" phase claim as an untested hypothesis.
