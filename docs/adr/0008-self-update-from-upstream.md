# ADR-0008: Projects Update the Framework Themselves, from the Upstream Repository

- **Status:** Accepted (amended 2026-10-26 — the sync keeps mirror entries it did not generate; see [Amendment](#amendment-2026-10-26-the-sync-keeps-mirror-entries-it-did-not-generate))
- **Date:** 2026-10-26
- **Builds on:** [ADR-0007](0007-framework-updates-merge-and-opt-in-switches.md), which made updates a
  three-way merge. This record decides how a project gets the upstream and runs that merge.

## Context

Projects adopt easy-claude by copying `.claude/`, `.codex/`, `.agents/` and `.opencode/` into their
root. To take a newer version, a maintainer cloned or pulled easy-claude, then either copied it over the
project (which reverts the project's own changes) or ran `framework-update.mjs <easy-claude-dir>`. That
engine merges well, but it had gaps that kept the job manual:

- It needs a local upstream checkout, and a first run needs `--base=<the commit the project copied>`,
  which nobody records when copying by hand.
- Its own copy in an older project may predate fixes to the merge rules, or be missing altogether.
- The closing mirror sync rebuilds `.agents/skills/` from `.claude/skills/` and deletes anything else,
  so a skill a project wrote for Codex only, or installed there with another tool, is lost.
- A Windows checkout with CRLF line endings makes every text file look changed, so a merge of text
  that differs only in line endings fails as a whole-file conflict.

The goal: in any adopting project, the user says "update the skills framework to the latest version"
and the agent takes upstream `main` and merges it, keeping the project's skills, hooks, agents,
settings and edits.

## Options considered

| Option                                                                                                                                                                       | For                                                                                                                                                                                      | Against                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Copy the new folders over the project (the old practice, or `export-claude.mjs --force`)                                                                                  | Simple; no tooling                                                                                                                                                                       | Reverts every project edit to a framework file; leaves files upstream deleted; ADR-0007 rejected it                                                                                                                                                    |
| 2. Git submodule or subtree of `.claude/`                                                                                                                                    | Git does the merging                                                                                                                                                                     | Ties every project to the upstream repository's history and layout; `.claude/` is one folder of a larger repository, so subtree needs a split; the generated mirrors cannot stay out of it; the copyable-folder portability contract breaks (ADR-0007) |
| 3. Add easy-claude as a Git remote and merge it into the project                                                                                                             | Full Git merge tooling                                                                                                                                                                   | Unrelated histories; merges the whole upstream repository (its `docs/`, specs, README, tests) into the project's own files; huge conflict surface and history noise                                                                                    |
| 4. Publish a package (`npx easy-claude update`)                                                                                                                              | Familiar versioned install                                                                                                                                                               | Needs a release pipeline and registry access; still needs the same merge logic; the framework promises to run with plain `node` and no package manager                                                                                                 |
| 5. A Claude Code plugin from a marketplace                                                                                                                                   | Built-in install and update                                                                                                                                                              | Installs per user, not per project; Codex and OpenCode get nothing; projects cannot keep edits to framework files; hooks and settings bind differently                                                                                                 |
| 6. Download archive snapshots (GitHub zip/tarball) and merge                                                                                                                 | No Git history needed                                                                                                                                                                    | A three-way merge needs the base snapshot too; host-specific URLs, rate limits and archive tools differ by platform; the engine already requires Git                                                                                                   |
| 7. Let the agent read upstream changes and merge file by file                                                                                                                | No new tooling                                                                                                                                                                           | About 1,300 framework files: slow, costly and nondeterministic; easy to drop a project change silently                                                                                                                                                 |
| 8. **A skill that keeps a blobless clone of upstream, runs the upstream's own merge engine against the project, and guides the agent through what the engine cannot decide** | Deterministic merge for nearly every file; agent judgment only for real conflicts; small download; works offline from a local checkout; plain `node` and Git on Windows, macOS and Linux | Needs Git and network access (or a local checkout); conflicts still need a person or agent to judge                                                                                                                                                    |

Measured on the upstream repository (2026-10-26): a blobless clone takes about 2 s and 3.5 MB.
Downloading the ~1,300 `.claude/` files of one version in one batched request takes about 6 s; letting
Git fetch them lazily one by one would take about 15 minutes. A full dry run on a project copied by
hand 40 commits behind took 20 s, and found the version it was copied from by content (978 of 984 files
matched).

## Decision

Option 8.

1. **One skill, run only on request.** `/framework-update` (`$framework-update` on Codex) is
   model-invocable so that plain words ("update the skills framework to the latest version") reach it,
   and its description limits it to explicit requests, as `commit` is limited.
2. **The skill script owns fetching.** `update-from-upstream.mjs` keeps a blobless bare clone in
   `tmp/framework-update/upstream.git` (cloned once, fetched later), defaults to `main` of
   `https://github.com/duc01226/easy-claude.git`, and records the address in the lock so later runs need
   no arguments. A local folder works as the upstream for offline or proxied networks.
3. **The newest merge rules always run.** The script runs the engine file from the upstream version
   being taken, falling back to the project's copy only for an upstream older than this change.
   The engine imports Node built-ins only, so it runs from any folder with `--project=<dir>`.
4. **No recorded base is needed.** `--base=auto` picks the upstream commit whose `.claude/` files
   match the most project files by content, and a tie goes to the older commit (a merge repeats changes
   the project already has cleanly; a base that is too new reads the project's older lines as edits).
   The dry run reports the match, and the skill asks the user to confirm when it is weak.
5. **Project content in the mirrors is protected.** An `.agents/skills/` entry with no `.claude/skills/`
   source and no framework name is reported as mirror-only, and the engine skips the sync until the user
   moves it into `.claude/skills/` (recommended: it is then mirrored to every host) or lets it go.
6. **Line endings are not edits.** Text is compared and merged with CRLF read as LF.
7. **The agent settles only what needs judgment**, following `references/merge-guide.md`: keep both
   sides' intent, never drop a project addition, prefer upstream when it fixed the same problem, ask when
   intents clash, and move project behavior into settings or skill overlays so the next update merges
   cleanly.

## Consequences

- An adopting project updates with one request, and the update is one reviewable diff that Git can undo.
- A project that has no copy of the skill yet updates once from any easy-claude checkout with
  `--project=<dir>`; that update brings the skill along.
- The merge engine can improve without every project first updating its local copy.
- Updating needs Git and either network access to the upstream or a local checkout.
- The sync's wholesale rebuild of `.agents/skills/` is unchanged; the update guards it, but a plain
  `/sync-codex` run still deletes a mirror-only skill. (Closed by the amendment below.)

## Amendment (2026-10-26): the sync keeps mirror entries it did not generate

The sync now records the top-level `.agents/skills/` entries it writes in the mirror's marker,
`.agents/skills/.codex-mirror.json` (`generatedEntries`). Each run replaces the entries it generates,
removes the recorded ones whose `.claude/skills/` source is gone, and leaves every other entry as it is,
printing one `kept` line per entry. It builds the mirror in a temporary folder first, so its rewrites
never touch a kept skill. The divergence gate compares the marker and does not compare kept entries.

A marker an older sync wrote records no names, so on the first run the sync cannot tell a stale mirror
of a retired framework skill from a project's own skill, and keeps both. The update knows the framework's
skill names, so it now removes the mirror of a framework skill the project no longer has (Decision 5
keeps the rest: it still lists mirror-only skills and skips the sync so the user decides where each
belongs). A plain sync after that first run removes such mirrors itself.
