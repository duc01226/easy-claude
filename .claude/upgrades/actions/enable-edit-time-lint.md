---
id: enable-edit-time-lint
kind: action
title: Offer edit-time lint that reports only new problems on the lines an edit changed
added: 2026-11-17
level: optional
applies:
  [
    "node",
    "-e",
    "const r = require('./.claude/scripts/framework-features.cjs').catalog({ rootDir: process.cwd() }).find(x => x.key === 'editTimeLint.enabled'); process.exit(r && r.value === true ? 3 : 0)",
  ]
done:
  [
    "node",
    "-e",
    "const r = require('./.claude/scripts/framework-features.cjs').catalog({ rootDir: process.cwd() }).find(x => x.key === 'editTimeLint.enabled'); process.exit(r && r.value === true ? 0 : 1)",
  ]
writesState: true
covers:
  - config:editTimeLint@f9c8019f390c
---

This version can lint each file right after the assistant edits it and tell the assistant only the
problems on lines that differ from the last commit, so a fix happens while the change is fresh and a
legacy file never floods the conversation. It is off by default: it runs one lint per edit (bounded by
`editTimeLint.timeoutSeconds`, default 10 s), needs git, and needs a command that lints one file.

## Steps

1. Explain the switch to the user in plain words with `/framework-config`: what edit-time lint shows, that it is off by default, its cost of one lint run per edit, and that it can be turned on for the team or only for this person (consent: no).
2. If `testing.commands.lintFile` is not set, run `/project-config` to fill it from the project's own linter, as a command that lints one file with `{file}` where the path goes, for example `npx eslint --format json {file}` or `ruff check --output-format concise {file}` (consent: yes).
3. If the user agrees, turn it on with `/framework-config`: `editTimeLint.enabled: true` in the project config for the team, or in `~/.claude/.ck.json` or `.claude/.ck.local.json` for one person (consent: yes).
4. Confirm with `node .claude/scripts/framework-features.cjs` that `editTimeLint.enabled` reads `true` and names the layer that set it (consent: no).
