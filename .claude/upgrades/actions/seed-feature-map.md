---
id: seed-feature-map
kind: action
title: Offer a feature map that says where each feature lives and how to drive it
added: 2026-11-17
level: optional
done:
  [
    "node",
    "-e",
    "const l=require('./.claude/hooks/lib/project-config-loader.cjs');const p=require('path');process.exit(require('fs').existsSync(p.join(l.getDocsRoot('projectReference'),'feature-map-reference.md'))?0:1)",
  ]
writesState: true
covers:
  - scan-targets@3b9590b1fe45
---

The framework now has a feature-map reference doc, owned by `/scan --target=feature-map`. It lets the
agent go from a vague report ("the export page is broken") to the feature and the facts needed to drive
it. When the project has feature specs, each entry is named after its spec story (`US-` id) and holds
only driver facts the spec cannot carry: surface, entry URL or command, fixture or role, observable end
state and gotchas; the spec's §6.5 keeps the user path, and the map links it instead of copying it.
Without specs, entries get stable `FM-` ids. The doc is opt-in: it is read only when `referenceDocs`
names it. Derived run commands are kept on the next runtime review, after the user agrees.

## Steps

1. Explain the feature map to the user and ask whether the project wants one; a project with nothing observable to drive (no UI, API, CLI or service) records this action as not applicable through `/framework-update` (consent: yes).
2. Run `/project-config` to add `feature-map-reference.md` to an explicit `referenceDocs` array, keeping every doc the project already resolves (consent: yes).
3. Run `/scan --target=feature-map` to seed the map: story-linked entries when specs exist, `FM-` ids otherwise, per-area docs for a large project (consent: yes).
4. Run `node .claude/scripts/lib/feature-map.cjs audit` and resolve every error finding before committing the map (consent: no).
