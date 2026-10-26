# Resolving framework-update conflicts

Read this before settling any conflict the update reports. It says how to see both sides, how to
keep each side's intent, and what to do per kind of file.

## Contents

- [Principles](#principles)
- [See what each side changed](#see-what-each-side-changed)
- [Marker conflicts](#marker-conflicts)
- [JSON files](#json-files)
- [Side copies](#side-copies)
- [Afterwards](#afterwards)

## Principles

1. **The project's change is deliberate; upstream's change is an improvement.** The default result
   keeps both: the project's addition or fix, plus upstream's new lines.
2. **Never drop a project addition** such as a hook registration, permission, skill override, custom
   workflow entry or added paragraph, unless upstream now does the same thing; then keep one copy.
3. **When upstream fixed the same problem** the project patched, prefer upstream's version, check it
   covers the project's case, and drop the duplicate patch.
4. **When the intents clash** (the same setting set to different values, a rule changed two ways), show
   the user both versions with one line on what each does, recommend one, and wait for the answer.
5. **Keep project behavior out of framework files next time.** When the project changed a framework
   file to get a behavior, look for a setting first (`node .claude/scripts/framework-features.cjs`).
   For extra rules on a framework skill, offer an additive overlay through `$project-skill-protocol`.
   Those survive every update. A behavior other projects could use belongs upstream as an opt-in switch.

## See what each side changed

The upstream clone is `tmp/framework-update/upstream.git`. With `<base>` = the dry run's base and
`<target>` = `upstream.commit`:

```text
git show HEAD:<path>                                                   # the project's version before the update
git -C tmp/framework-update/upstream.git diff <base> <target> -- <path> # what upstream changed
git -C tmp/framework-update/upstream.git show <base>:<path>             # the version both started from
```

What the project changed: save the base version (`show <base>:<path>` above) and the project's version
(`git show HEAD:<path>`) as two files under `tmp/framework-update/compare/`, then run
`git diff --no-index <base copy> <project copy>`. A renamed upstream file shows up in
`git -C tmp/framework-update/upstream.git diff -M --name-status <base> <target> -- .claude`.

## Marker conflicts

A `conflict` entry has markers in the file:

```text
<<<<<<< project
the project's lines
=======
upstream's lines
>>>>>>> upstream
```

Replace each block with the combined result and delete the three marker lines. By file kind:

| File | Resolution |
| --- | --- |
| Markdown docs | Keep both texts. `<!-- COUNT -->` values were merged as 0 and are recomputed by the sync; do not hand-count. |
| Hook or script code | Understand both changes before combining. If upstream fixed the same defect, take upstream (principle 3). Run the file's own test when the project has one, and `node --check <file>` for JavaScript. |
| A framework `SKILL.md` or reference the project edited | Merge the text, then offer to move the project's rules into an overlay (principle 5). |
| `.claude/.ck.json` | Shipped defaults the project should not edit. Keep upstream's file, and offer to move each project value to `docs/project-config.json` or a personal layer (`$framework-config` explains the layers). |

## JSON files

Text merges break JSON easily, so resolve these by structure, then parse the file.

**`.claude/settings.json`**

- `hooks.<Event>`: an array of matcher groups. When both sides appended a group at the same place,
  keep both groups. When the project added a command to a group upstream also changed, start from
  upstream's group and add the project's command to it. Remove exact duplicates. Every
  `command` path must exist (`.claude/hooks/<name>.cjs`).
- `permissions.allow` / `permissions.deny` / `permissions.ask`: union of both lists, without duplicates.
  A rule on both lists is a clash (principle 4).
- `env`, `skillOverrides`, `statusLine` and other scalars: keep the project's value where it set one on
  purpose; take upstream's for keys the project never touched.

**`.claude/workflows.json`**: keep workflows and steps the project added; take upstream's changes to
framework workflows. The sync's `wf-cycle` stage validates the result.

**Any JSON file**: after editing, parse it:

```text
node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" <file>
```

## Side copies

A `conflict-side` entry keeps the project's file in place and puts upstream's copy at
`tmp/framework-update/<path>`. The reason names the case:

| Reason | What happened | Resolution |
| --- | --- | --- |
| added on both sides | The project created a file at a path upstream now ships, usually a project skill whose name upstream now also uses. | Compare purposes. Same purpose: adopt upstream's version (copy the side file into place) and keep the project's specifics as an overlay. Different purpose: ask the user for a new name for the project's skill, rename its folder, update every reference (`git grep -n <old-name>`), then copy upstream's file into the freed path. |
| deleted in the project, changed upstream | The project removed a framework file, upstream since improved it. | Keep it deleted when the removal was deliberate (ask when unsure). Restore upstream's copy when other framework files still reference it (`git grep -n <file-name> -- .claude`). |
| changed in the project, deleted upstream | Upstream removed or renamed a file the project changed. | Look for a rename (`diff -M --name-status`, above). Renamed: port the project's change to the new file, then delete the old one. Removed: tell the user what the project's change was and delete the file only once they agree it is obsolete. |
| no base text to merge | A binary file, or the lock has hashes only. | Pick one side with the user; nothing can be merged line by line. |

## Afterwards

- No markers remain: `git grep -n -E "^(<<<<<<< project|=======$|>>>>>>> upstream)" -- .claude`.
- After renaming or moving a skill, run `node .claude/scripts/framework-update.mjs --regenerate` (catalogs and counts).
- Run `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs` to rebuild the mirrors and verify.
- `tmp/framework-update/` is disposable; leave it, or remove it once the update is committed.
- In the report, list each conflict with the choice made and why, and anything that still waits on the user.
