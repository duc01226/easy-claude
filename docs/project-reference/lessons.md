# Lessons

<!-- This file is referenced by Claude skills and agents for project-specific context. -->
<!-- Fill in your project's details below. -->

- [2026-03-10] **Mirror copies create staleness traps.** Editing a canonical source is insufficient when mirror copies exist — must trace and update ALL mirrored files (configs, skill definitions, docs). Grep verification after edits catches missed mirrors.
- [2026-03-10] **Docs embedding derived data stale on source modification.** Documentation that inlines data from a canonical source (e.g., workflow sequences, API schemas) goes stale silently when the source changes. Map all docs that embed canonical data and update them alongside the source.
