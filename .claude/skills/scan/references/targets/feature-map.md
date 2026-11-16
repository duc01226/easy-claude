# Scan Target: feature-map

Read `../targets.md` first for selection, roots and ownership; the `scan` host loads this file only for `--target=feature-map`.

- **doc:** `<ref>/feature-map-reference.md` (an index), plus optional per-area docs `<ref>/feature-map/<area>.md` for a large project, each one selected in `referenceDocs` as a custom manual doc.
- **applies when:** the project has an observable surface (UI, API, CLI or service) and either canonical specs with user stories, or route, command or anchor sources a driver can start from. Selection is explicit: the doc is read only when `referenceDocs` names it.
- **skip when:** nothing observable can be driven (a library with no runnable surface), or the doc is not selected. A dependency or an empty routes folder alone is insufficient.
- **description:** `[Documentation] Use when seeding or reconciling the feature map: where each feature lives and how to drive it, linked to spec story ids when specs exist.`
- **sub-agents:** main agent performs the focused scan. Do not start the application during this documentation scan; driver facts come from sources, configuration and runtime-review reports.

## Ownership: the spec owns the user path, the map owns driver facts

Pick the mode from the specs, not from preference:

- **Spec-linked mode** — the business spec root holds canonical specs with `US-` stories. Each entry is headed by the story id and names the spec that owns it. Seed the entries from `spec [mode=index]` output or from the §6 headings: every story listed under §6.5 Per-Story Interaction Flow is UI-bearing and needs an entry. When a native `specArtifacts` profile names its interaction cases differently, use that case identity; when it has none, record that and use standalone mode for the project.
- **Standalone mode** — no specs. Each entry gets a stable `FM-<NNN>` id, seeded from route tables, CLI command registries, API route files or page anchors. Never renumber an existing id.

An entry holds only facts a spec may not carry: the surface id from `experienceVerification.surfaces[]` (or the evidenced surface name), the entry URL or command, the fixture or role (a credential reference, never a value), the observable end state and driving gotchas. It never copies the §6.5 click path, glossary text or acceptance criteria: link the story instead. Secrets, tokens, passwords and personal data never enter the map.

## Evidence lenses

| Section | Record only actionable facts |
| --- | --- |
| Mode and sources | The chosen mode, the spec root or the route/command sources it was seeded from, and per-area docs when the map is split |
| Entries | One `###` entry per story or feature, with `Spec` (story entries only), `Surface`, `Entry`, `Fixture/role`, `End state` and optional `Gotchas` lines |
| Upkeep | How the map stays current: the audit command and the owner who runs it after spec or route changes |

Split into per-area docs only when the index would exceed a few hundred entries; the index then lists each area doc with a `read <path> when <situation>` pointer. Area docs live in a `feature-map/` folder beside the index and hold entries only: the audit reads every `###` heading in an area doc as an entry, so keep prose there out of `###` headings.

## Verification and output

Run the audit and resolve every `error` finding before returning; report `gap` findings as remaining work:

```text
node .claude/scripts/lib/feature-map.cjs audit
```

It reports entries without a stable id, a story id its spec no longer defines, a missing driver fact, a copied §6.5 step, a credential-shaped value, and a UI-bearing story with no entry. Trace each entry URL or command to its source `file:line` in the temporary report. Then refresh through the host's prompt-enhance/verification procedure and return the changed entries, the audit result and the remaining gaps.
