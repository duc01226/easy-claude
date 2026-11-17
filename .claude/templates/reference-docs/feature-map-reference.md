# Feature Map

<!-- Fill in your project's details below. -->

Read when you need to find where a feature lives or how to drive it: a vague bug report, a runtime review, a demo or a pull request's runtime evidence. Each entry gives the facts a driver needs and links the spec story that owns the feature's meaning and user path. Keep this map current with `/scan --target=feature-map`; check it with `node .claude/scripts/lib/feature-map.cjs audit`.

## Mode and Sources

State the mode. **Spec-linked:** entries are headed by the spec story id (`US-<CODE>-<NN>`) and name the spec that owns it; the spec's §6.5 Per-Story Interaction Flow holds the user path, so the map links it and never copies it. **Standalone** (no specs): entries use stable `FM-<NNN>` ids. Name the spec root or the route, command and anchor sources the entries were seeded from. When `featureMap.sources` in the project config lists source globs (one page, route or command file per entry), each entry names its file on a `Source` line and the audit reports a matching file with no entry, an entry whose Source is gone and two entries naming one Source. For a large project, list the per-area docs here, each as `read <path> when <situation>`.

## Entries

<!-- One ### entry per story or feature. Example (delete it when you add real entries):

### US-ABC-01 · Short feature name
- Spec: `<spec root>/<Area>/README.<Feature>.md`
- Surface: `web` (the experienceVerification surface id)
- Entry: `/path/to/page` or `npm run cli -- command`
- Fixture/role: seeded member account (a credential reference, never a value)
- End state: what the driver observes when the flow worked
- Gotchas: anything that makes driving it fail for a non-product reason
- Source: `path/to/the/page-or-command-file` (repository-relative, forward slashes; required for each file `featureMap.sources` matches)
-->

## Upkeep

Name who updates the map and when: after a spec story is added, renamed or removed, after a route, page or command file is added, moved or removed, and after a runtime review finds a stale entry. `docs-manager --mode=update` runs the audit and reports its findings.
