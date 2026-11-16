# Lessons

<!-- This file is referenced by Claude skills and agents for project-specific context. -->
<!-- Fill in your project's details below. -->

- [2026-11-17] A process that holds a lock or a shared slot must pass termination signals on to its children and wait for them. A killed holder frees the lock (dead-pid reclaim) while its orphaned children keep working, so the next holder collides with them.
- [2026-11-17] Size worker pools and admission from the machine's live state (usable cores, available memory, load, peers already running), never from a constant or the core count alone. A per-process default such as "one worker per core" multiplies when many agents run at once.
