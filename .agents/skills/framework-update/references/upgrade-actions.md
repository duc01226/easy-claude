# Upgrade actions and notices after an update

Read this when a framework update (or `--list-upgrades`) prints a `NEXT` block. Copying new framework
files is not the whole update: some changes need the project to do something (fill new config, set up a
baseline, decide on a new check), and the entries in the block say what.

**Rules first:**

- Handle the entries only inside the update the user asked for; never start one on your own later.
- Ask the user before every step marked `(consent: yes)`, and before choosing a tool or installing
  anything. Change a project-owned file (`docs/project-config.json`, `CLAUDE.md`) only through the skill
  the step names.
- Record every entry, whatever happened, with the command the block prints. An entry left unrecorded is
  listed again at the next update.

## What the block lists

Each line names an entry, its kind and its file (`.claude/upgrades/actions/<id>.md`):

| Kind | What you do |
| --- | --- |
| `action, required` | run its steps; when the user declines, record `declined` with their reason |
| `action, recommended` / `action, optional` | recommend it (or offer it), run it on a yes, record `declined` on a no |
| `notice` | tell the user what the body says; record `done` |
| `cannot be read` | read the file yourself; when it is still unclear, tell the user and record `failed` with the reason |

Entries are listed in the order to run them. `waits for: <id>` means run that entry first; when it
failed, leave the waiting one for the next update and say so.

## Running an entry

1. Read the entry's file: why it exists and its numbered `## Steps`.
2. Run each step with the skill or command it names. A `(consent: yes)` step needs the user's yes first;
   one question can cover several entries.
3. Record the outcome:

```text
node .claude/scripts/framework-update.mjs --mark=<id> --status=done
node .claude/scripts/framework-update.mjs --mark=<id> --status=not-applicable --reason="<why>"
node .claude/scripts/framework-update.mjs --mark=<id> --status=declined --reason="<the user's reason>"
node .claude/scripts/framework-update.mjs --mark=<id> --status=failed --reason="<what failed>"
```

| Status | Meaning | Listed again? |
| --- | --- | --- |
| `done` | the steps ran, or the notice was relayed | no |
| `not-applicable` | the change does not concern this project | no |
| `declined` | the user chose not to do it | no |
| `failed` | a step failed; the reason is shown next time | yes, until it is resolved |

Some actions carry checks that the engine runs after the files are in. A done check that passes records
the action `done` (the work is already there, so a second run never redoes it); an applicability check
that answers "does not apply" records it `not-applicable`; a check that crashes or cannot run settles nothing. The engine prints a `SETTLED` line for each.

## Special cases

- **Conflicts stopped the update.** The engine prints only how many entries are pending, plus a
  `MERGE-NOTE` line for each conflicted file that an entry warns about: keep what the note says while
  resolving. After the conflicts are resolved and the sync passed, run
  `node .claude/scripts/framework-update.mjs --list-upgrades` for the full block.
- **The project is already current.** Run `--list-upgrades` anyway: entries left open last time are
  still listed.
- **The project had no lock.** Its first update records the entries its base version already had as
  not applicable, because that version was installed with them; only newer entries are listed.
- **An older engine.** `--engine=local` with an engine from before upgrade entries, or `--ref` to such a
  version, writes a lock without the recorded outcomes. Warn the user first: the next update lists every
  entry again (done checks still skip finished work).
- **A notice disappeared.** Upstream deletes notices 180 days after they were added; actions are kept.

## Report and commit

Add one line per entry to the update report: its id and outcome, with the reason for anything not done.
`.claude/framework-lock.json` holds the outcomes; it goes in the same commit as the update.
