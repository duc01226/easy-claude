# Commit trailers

Read when the commit skill writes the commit message. Both trailers are opt-in project settings in `docs/project-config.json` → `commit`, both are off by default, and both apply to new commits only: never reword history to add one, and never claim a check reads them.

| Setting | Trailer | Value |
| --- | --- | --- |
| `commit.fixOriginTrailer: true` | `Fix-Origin: <origin>` | `feedback` (a requested fix), `regression` (an earlier defect) or `not-applicable` (not a fix) |
| `commit.bugClassTrailer: true` | `Bug-Class: <class>` | the `bugClass` of the fix's prevention record |

**`Bug-Class:`** — write it only when the setting is `true` and the commit contains a bug fix whose bug-class prevention task wrote a valid record (`node .claude/hooks/lib/prevention-record.cjs check` reports `VALID`; `/fix --mode=prevent` writes it under `tmp/prevention/records/`). The value is that record's `bugClass` exactly, one of the closed vocabulary (`node .claude/hooks/lib/prevention-record.cjs classes`), for example `Bug-Class: state-transition`. Write the line in exactly this form, `Bug-Class: <class>`, one line per class when the commit fixes bugs of several classes, because tools count these lines to see which classes recur. A commit that fixes no bug, or whose record says `not-a-code-defect` or `not-applicable` or is missing, gets no `Bug-Class:` line; never guess a class to fill it.
