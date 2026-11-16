---
id: fill-architecture-rules
kind: action
title: Record the project's module layers as architecture rules and let a tool enforce them
added: 2026-11-17
level: optional
after:
  - offer-harness-inventory
covers:
  - config:architectureRules@54ceae80652d
writesState: true
done: ["node", "-e", "const c=require('./.claude/hooks/lib/project-config-loader.cjs').loadProjectConfig();process.exit(c&&c.architectureRules&&c.architectureRules.enforcedBy?0:1)"]
mergeNotes:
  - ".claude/skills/project-config/references/architecture-rules-config.md: keep the evidence order and the preview-then-consent rule"
---

This version adds `architectureRules.enforcedBy` to the project config: the tool that enforces the
layer rules in lint or CI. When it is declared, reviewers read the tool's result instead of grepping
imports. `/project-config` can now fill `architectureRules.layerBoundaries` from evidence (an existing
boundary tool, an architecture decision, or folders whose imports already go one way), and
`/linter-setup` generates the tool config from it with a baseline. A project with no layers that depend
in one direction records this action as not applicable.

## Steps

1. Run `/project-config` to fill `architectureRules.layerBoundaries` from evidence; it shows the proposed rules and their evidence and merges only what the user accepts. (consent: yes)
2. Run `/linter-setup` (Architecture Fitness) to generate the boundary tool config from those rules, baseline today's violations and record `architectureRules.enforcedBy`. (consent: yes)
