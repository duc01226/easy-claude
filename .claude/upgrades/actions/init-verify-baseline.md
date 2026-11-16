---
id: init-verify-baseline
kind: action
title: Freeze today's verify failures as the committed baseline
added: 2026-11-16
level: recommended
after:
  - fill-verify-commands
applies: ["node","-e","const r = require('child_process').spawnSync(process.execPath, ['.claude/hooks/lib/verify-receipt.cjs', 'plan'], { encoding: 'utf8' }); const p = JSON.parse(r.stdout); process.exit(p.mode !== 'off' && p.commands.some(c => c.state === 'configured') && !require('fs').existsSync('.verify-baseline.json') ? 0 : 3)"]
done: ["node", "-e", "process.exit(require('fs').existsSync('.verify-baseline.json') ? 0 : 1)"]
writesState: true
covers:
  - config:reviewGate@PENDING-P0-HASH
---

An existing project usually has some lint errors or failing tests already. The verify baseline (`.verify-baseline.json`, committed) records them once, so the commit gate reports only new failures and the list only ever shrinks: a prune removes entries as they start passing. The gate warns by default; `enforce` is a separate, opt-in choice.

## Steps

1. Run `node .claude/hooks/lib/verify-receipt.cjs run` and show the user the current failures per command (consent: no).
2. With the user's agreement, run `node .claude/hooks/lib/verify-receipt.cjs baseline-init` to freeze them, then commit `.verify-baseline.json` through `/commit` (consent: yes).
