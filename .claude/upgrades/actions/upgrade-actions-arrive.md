---
id: upgrade-actions-arrive
kind: notice
title: Framework updates now end with the upgrade steps this project still needs
added: 2026-11-16
---

From this version on, each framework update ends with a `NEXT` block. It lists the upgrade actions
(steps the agent runs, asking first where a step needs consent) and notices (things to tell the user)
that this project has not yet resolved, including any left unfinished last time. Each one is recorded in
`.claude/framework-lock.json` once it is done, not applicable, declined or failed, so the next update
asks only about what is still open.

Nothing to do now. Tell the user that later updates may list steps like this, and that the lock file
belongs in the same commit as the update.
