---
id: quality-counters-in-performance-report
kind: notice
title: The developer performance report shows quality counters beside each speed figure
added: 2026-11-17
---

`/git-developer-performance` now counts, per contributor and for the team over the same period as the
velocity figures: revert commits made and commits later reverted, fix commits that followed up earlier
work on the same paths within 14 days (and the commits they followed), and `Bug-Class: <class>` commit
trailers per class. When the repository commits a verify baseline (`.verify-baseline.json`), the summary
also shows how many baselined failures remained at the start and at the end of the period. The counters
appear in `summary.md` (Quality Counters Beside Velocity), in each developer page and as new columns in
`contributors.csv`. They are deterministic evidence to read beside the effort and man-day estimates, never
a score.

Nothing to run. Tell the user that reports generated from now on carry the new section and columns, so a
spreadsheet or script that reads `contributors.csv` by column position should read by column name.
