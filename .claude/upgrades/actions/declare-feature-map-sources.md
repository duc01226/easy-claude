---
id: declare-feature-map-sources
kind: action
title: Declare featureMap.sources so the audit reports pages with no entry
added: 2026-11-17
level: optional
after:
  - seed-feature-map
applies:
  [
    "node",
    "-e",
    "const l=require('./.claude/hooks/lib/project-config-loader.cjs');const p=require('path');const fs=require('fs');if(!fs.existsSync(p.join(l.getDocsRoot('projectReference'),'feature-map-reference.md')))process.exit(3);const s=l.getProjectConfigStatus().config.featureMap;process.exit(s&&Array.isArray(s.sources)?3:0)",
  ]
done:
  [
    "node",
    "-e",
    "const s=require('./.claude/hooks/lib/project-config-loader.cjs').getProjectConfigStatus().config.featureMap;process.exit(s&&Array.isArray(s.sources)?0:1)",
  ]
writesState: true
covers:
  - config:featureMap@459603a1b525
---

The feature-map audit can now hold the map to the project's source files. A project that keeps one
feature-map entry per page, route or command file declares those files as globs in `featureMap.sources`
(for example `["app/**/page.tsx"]`), and each entry names its file on a `- Source: \`<path>\`` line,
repository-relative with forward slashes. `node .claude/scripts/lib/feature-map.cjs audit` then reports a
matching file with no entry (a gap, or an error with `featureMap.strict: true`), an entry whose Source no
longer exists and two entries naming one Source, each with its fix, and a change to a matching file routes
the map to `/docs-manager --mode=update`. Without the option nothing changes. An entry is a `### FM-…` or
`### US-…` heading in the index or in `feature-map/<area>.md`; in the index such a heading now counts
wherever it sits, not only under `## Entries`.

## Steps

1. Explain the option to the user with `/framework-config`: what `featureMap.sources` checks, that it is off by default, and that it fits only a project with one source file per driveable feature (consent: no).
2. If the user agrees, add `featureMap.sources` (and `featureMap.strict` only when the map is complete) with `/project-config`; if they decline, record this action as declined so it is not offered again (consent: yes).
3. Run `/scan --target=feature-map` to add the `Source` line to each existing entry and an entry for each matching file that has none (consent: yes).
4. Run `node .claude/scripts/lib/feature-map.cjs audit` and resolve every error finding before committing the map (consent: no).
