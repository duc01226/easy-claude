# ADR-0007: Framework Updates Merge, and Adopter-Specific Behavior Ships as Opt-In Switches

- **Status:** Accepted
- **Date:** 2026-10-22
- **Extended by:** [ADR-0008](0008-self-update-from-upstream.md) — how a project fetches the upstream and runs
  this merge itself.
- **Supersedes:** None. It replaces the undocumented practice of re-exporting `.claude/` over an
  installed copy (`export-claude.mjs --force`) to upgrade.

## Context

`.claude/` is copied into each adopting project. Projects then change some framework files: they
fix a defect before upstream does, wire a project skill, or change a behavior to suit their team.
The only upgrade path was a fresh export, which replaces every framework file. On 2026-10-22 one
adopter (Orient One) compared a fresh copy with its tree:

- 64 files would have been deleted or reverted: five project skills, a session-start hook, a quiet-mode
  design, generated Codex/OpenCode files.
- The copy also undid upstream's own seven newest commits, because the copied checkout was behind its
  `origin/main` and held uncommitted work.

Every one of that project's framework changes turned out to be generic: none of them named the
project's domain. They had diverged only because nothing in upstream could hold them.

## Decision

1. **Updates merge, never copy.** `node .claude/scripts/framework-update.mjs <easy-claude-dir>` takes a
   newer upstream into a project three-way. The base is the upstream commit the project last took, which
   `.claude/framework-lock.json` records.
   - A file unchanged in the project takes upstream, and a project-only change stays.
   - A change on both sides goes through `git merge-file`, and an overlap is left marked and reported.
   - A file upstream never had is never touched.
   - Count markers are recomputed and generated catalogs regenerated, so neither causes conflicts.
   - `--record-only` bootstraps a project that was synced by hand.
2. **Generic fixes become upstream defaults.** Examples: the BOM-tolerant config read, and hook tests
   isolated from a developer's personal runtime mode.
3. **Behavior one adopter wants but others may not ships as a switch that is off by default.** Every
   other project keeps its behavior until it opts in:
   - `frameworkRuntime.quietNative: restrict`;
   - `frameworkRuntime.offMode: as-quiet` (team only);
   - `frameworkRuntime.autoApplyNative`;
   - `portability.generateClaudeMd: false`.
4. **Settings live where an update cannot reset them, and each person can override them.** Team values go
   in the project config. Personal values go in `~/.claude/.ck.json`, `.claude/.ck.local.json` or the
   environment. The router switches gain both layers. `framework-features.cjs` lists every switch with its
   effective value, the layer that set it and who may set it, and `framework-config`, `project-config` and
   `project-init` point agents to it.

## Consequences

- An adopter's change survives an update while upstream keeps improving the same file, and conflicts
  surface where both changed the same lines instead of silently reverting.
- A project's framework edits become visible debt: the guidance tells agents to look for a switch
  first, and to propose one upstream instead of editing a framework file.
- Upstream carries more switches. Each is one schema entry, one resolver and one catalog entry, and
  defaults to the previous behavior, so other adopters are unaffected.
- The tool needs Git and the upstream repository, at a commit that contains the recorded base. A
  project that took an uncommitted upstream tree (`--working-tree`) has only hashes for its base, so
  the next update compares by hash where it would otherwise merge.

## Alternatives considered

- **Git subtree or submodule of `.claude/`.** It gives merges for free, but it ties every adopter to
  the upstream repository's history and layout. It also cannot keep the per-project generated mirrors
  out of the merge, and the portability contract requires a plain copyable folder.
- **Copy, then hand-reapply the project's changes.** That is today's failure mode: it depends on someone
  remembering every local change.
- **Make the stricter behavior the upstream default.** It would change quiet and off for every adopter
  at once, for one project's preference.
