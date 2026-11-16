---
id: offer-harness-inventory
kind: action
title: Report which checks this project has and offer to add the missing ones
added: 2026-11-17
level: recommended
writesState: true
done: ["node", "-e", "const l=require('./.claude/hooks/lib/project-config-loader.cjs');const p=require('path');process.exit(require('fs').existsSync(p.join(l.getDocsRoot('projectReference'),'harness-inventory.md'))?0:1)"]
mergeNotes:
  - ".claude/skills/linter-setup/**: keep the brownfield ratchet path and the Restricted APIs category"
  - ".claude/skills/harness-setup/**: keep the committed inventory path and the runtime row"
---

This version teaches the setup skills to work on an existing project. `/project-init` now reports a
harness inventory: which checks the project has (formatter, linter, type check, tests, pre-commit hook,
CI, architecture boundaries, banned APIs), with evidence, and whether an agent can start the app (the
runtime row). `/linter-setup --mode=brownfield` adds a missing check with a frozen baseline of today's
problems, so only new ones fail and nothing already there turns red. The inventory now lives in a
committed file, `harness-inventory.md` under the project-reference root, instead of `tmp/`.

## Steps

1. Run only the **Harness inventory and setup offer** step of `/project-init` (Phase 2) and report each check with its evidence, including the runtime row. It only reads files. (consent: no)
2. For each missing check, offer `/linter-setup --mode=brownfield`: one plain-language question per tool, recommended option first, and a baseline so only new problems fail. (consent: yes)
3. Save the inventory with `/harness-setup` to `harness-inventory.md` under the project-reference root, or merge a legacy `tmp/harness/harness-inventory.md` into it. (consent: yes)
