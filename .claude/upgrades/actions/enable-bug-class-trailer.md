---
id: enable-bug-class-trailer
kind: action
title: Offer the opt-in Bug-Class commit trailer that counts which bug classes recur
added: 2026-11-17
level: optional
after:
  - bug-class-prevention
applies: ["node","-e","const p = require(require('path').resolve('.claude/scripts/lib/workflow-routing-config.cjs')).resolveProjectConfigPath(process.cwd()); if (!require('fs').existsSync(p)) process.exit(3); const c = JSON.parse(require('fs').readFileSync(p, 'utf8').replace(/^\\uFEFF/, '')); process.exit(c.commit && c.commit.bugClassTrailer === true ? 3 : 0)"]
done: ["node","-e","const p = require(require('path').resolve('.claude/scripts/lib/workflow-routing-config.cjs')).resolveProjectConfigPath(process.cwd()); const c = JSON.parse(require('fs').readFileSync(p, 'utf8').replace(/^\\uFEFF/, '')); process.exit(c.commit && typeof c.commit.bugClassTrailer === 'boolean' ? 0 : 1)"]
writesState: true
covers:
  - config:commit@1ef4272c73e1
---

This version can add a `Bug-Class: <class>` line to commits that fix a bug, taken from the fix's prevention
record, so the team can count which classes of bug keep coming back. It is off by default, applies to new
commits only, and never rewords history.

## Steps

1. Explain the switch to the user with `/framework-config`: what the `Bug-Class:` line records, that it is off by default, and that it is written only for a fix with a valid prevention record (consent: no).
2. If the user agrees, set `commit.bugClassTrailer: true` with `/project-config`; if they decline, set it to `false` so the offer is not repeated (consent: yes).
