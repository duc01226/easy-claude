---
id: fill-verify-commands
kind: action
title: Fill the verify command fields and choose the commit gate's verify mode
added: 2026-11-16
level: required
applies: ["node","-e","const p = require(require('path').resolve('.claude/scripts/lib/workflow-routing-config.cjs')).resolveProjectConfigPath(process.cwd()); process.exit(require('fs').existsSync(p) ? 0 : 3)"]
done: ["node","-e","const p = require(require('path').resolve('.claude/scripts/lib/workflow-routing-config.cjs')).resolveProjectConfigPath(process.cwd()); const c = JSON.parse(require('fs').readFileSync(p, 'utf8').replace(/^\\uFEFF/, '')); process.exit(c.reviewGate && typeof c.reviewGate.verify === 'string' ? 0 : 1)"]
writesState: true
covers:
  - config:testing@PENDING-P0-HASH
  - config:reviewGate@PENDING-P0-HASH
mergeNotes:
  - .claude/hooks/lib/review-receipt.cjs: keep the project's own review kinds; the new exports (receiptStoreDirectory and the Git environment helpers) and the verify-record exclusion in hasAnyReceipt are additive
  - .claude/scripts/lib/commit-review-policy.cjs: keep the project's own review-gate rules (for example a quiet-mode rule); resolveVerifyGate is a new function beside them
  - .claude/hooks/lib/project-config-schema.cjs: keep the project's own descriptions; the reviewGate verify fields, the testing.commands description and validateVerifyCommandSemantics are additive
  - .claude/hooks/review-commit-gate.cjs: keep the project's review rules; the verify check runs only after the review check allows a commit
  - .claude/hooks/tests/suites/review-commit-gate.test.cjs: keep the project's own cases; upstream did not change this suite for verify
---

The commit gate now checks a verify receipt: proof that the project's lint, type and test commands passed on the exact tree being committed. It reads the commands from `testing.commands` (`verify`, or `lint`, `typecheck` and `affected`, plus `build` when opted in) and its mode from `reviewGate.verify` (`warn` by default, which never stops a commit). Until the commands are filled, the default mode says nothing and nothing is proven.

## Steps

1. Run `/project-config` to fill `testing.commands.verify`, `lint`, `typecheck`, `affected` and `lintFile` from the project's own scripts and tool configs, setting a key to "none" when it does not apply; it never invents a command (consent: yes).
2. Run `node .claude/hooks/lib/verify-receipt.cjs plan` and show the user which commands the commit gate will expect (consent: no).
3. Explain `reviewGate.verify` in plain words (`warn` tells, `enforce` refuses, `off` for a project that proves merges another way, such as required CI checks) and write the user's choice with `/project-config`; the recorded choice is what marks this action done, so commands that were already in `testing.commands` are never adopted without the user seeing them (consent: yes).
