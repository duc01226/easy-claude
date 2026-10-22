# Project config — spec-system and documentation-root configuration

> Read when the task declares, changes or validates `specRoots`, `specArtifacts`, `docsRoots` or `techSpecScan` (including Phase 2 §2s and §2t). All of these sections are optional; a declared one must validate.

## Contents

- [Deriving the Spec-System Config From Source (`specRoots` + `specArtifacts` + `docsRoots` + `techSpecScan`)](#deriving-the-spec-system-config-from-source-specroots--specartifacts--docsroots--techspecscan)
- [2s. Documentation Roots — `docsRoots` (declare only evidenced relocations)](#2s-documentation-roots--docsroots-declare-only-evidenced-relocations)
- [2t. Native Spec Artifact Profile — Derive Only from Stable Source](#2t-native-spec-artifact-profile--derive-only-from-stable-source)

## Deriving the Spec-System Config From Source (`specRoots` + `specArtifacts` + `docsRoots` + `techSpecScan`)

**`specRoots`** — declare each tree's location AND semantics:

| Field | Derive from | Typical value |
| --- | --- | --- |
| `business.path` | The hand-authored feature-spec dir (where `/spec` writes). | default `docs/specs`; this key in `docs/project-config.json` is what overrides it |
| `business.authorship` / `business.m1Policy` | Business tree is human-authored, tech-free prose. | `hand` / `strict` |
| `technical.path` | The generated technical-view dir (where `/tech-spec` writes). | e.g. `docs/tech-specs` |
| `technical.authorship` / `technical.m1Policy` | Technical tree is projected from code — naming code IS the point. | `derived` / `exempt` |

**`specArtifacts`** — optional, versioned data contract for a project's established native requirement, case, and evidence structure. Omit it when the project uses the framework's strict business-spec and TestSpec defaults; never add a profile just to avoid adapting the corpus. Derive it from multiple canonical owner artifacts and their executing tests, not one convenient file.

Before deriving a native profile, read **§2t Native Spec Artifact Profile** below in full; it owns supported fields, carriers, source discovery, assertion/cardinality proof and fail-closed validation. Read `--describe` for the closed `decimal-lower-suffix` / `hyphen-tokens` grammars. Map exact stable headings once; subheadings inherit their nearest configured parent, and missing or unmapped enforced content is UNKNOWN, never exempt. The profile resolver owns normalization; never create a second case registry.

**`docsRoots`** — the six relocatable documentation roots, sibling to `specRoots` and sharing its exact shape and its exact rules. A project that keeps the framework layout declares NOTHING; every accessor then returns its documented default, byte-identically to a repo with no `docsRoots` at all. Declare a sub-object ONLY when that tree has actually moved, and derive its value from what is on disk — never copy another project's literals.

| Key (all six live under `docsRoots` in `docs/project-config.json`) | Source of truth (derive from) | Framework default | How to derive |
| --- | --- | --- | --- |
| `docsRoots.projectReference.path` in `docs/project-config.json` | The generated reference-doc tree `/scan` writes and skills read. | `docs/project-reference` | Locate the configured reference root. The reference-doc catalog is metadata; selected filenames and task-specific references remain configurable. Always-on context inputs are resolved separately. |
| `docsRoots.adr.path` in `docs/project-config.json` | The Architecture Decision Record tree. | `docs/adr` | Find the dir of ADRs (or the one an existing ADR index points at). |
| `docsRoots.templates.path` in `docs/project-config.json` | The document-template tree. | `docs/templates` | Find the dir the project's doc/spec templates live in. |
| `docsRoots.plans.path` in `docs/project-config.json` | The implementation-plan tree `/plan` writes. | `plans/` | Find the dir of plan folders. `.ck.json` `paths.plans` is a legacy fallback — this key WINS when both are set. |
| `docsRoots.teamArtifacts.path` in `docs/project-config.json` | The initiative / task / story tree. | `team-artifacts` | Find the dir holding the project's team artifacts. |
| `docsRoots.productRoadmap.path` in `docs/project-config.json` | The roadmap document. | `docs/product-roadmap.md` | A FILE path, not a dir — the single roadmap doc `/product-roadmap` maintains. |

Rules that bind every one of the six — identical to `specRoots`, and enforced by the schema, not by convention:

1. **A declared sub-object MUST carry its `path`.** A partial declaration (`"adr": {}`) is an **ERROR**, never a silent default — the same asymmetry `specRoots` already enforces. Absent = default; declared-but-invalid = build failure.
2. **Paths are repo-relative.** An absolute path or any `..` segment is rejected as repo-escaping.
3. **A declared path that does not exist on disk is a WARNING**, not an error — it lets `/project-init` seed the block before the tree is created.
4. **Validate on the fail-CLOSED plane before finishing.** The runtime accessors are fail-SOFT by design: a malformed, unreadable or absent config yields the documented DEFAULT and never throws, so a typo'd key is invisible at runtime. The ONLY surface that catches it is the validator — run it after every edit to this block:

   ```bash
   node .claude/hooks/lib/project-config-schema.cjs --validate <configured-project-config-path>
   ```

5. **Never invent a relocation.** If the tree sits at the default, OMIT the sub-object. A declared key restating the default is noise that later drifts from the code it was supposed to track.

**`techSpecScan`** — how `/tech-spec` finds annotated tests. Derive all three from the stack:

1. **`sourceRoot`** — the project's primary source dir (from `project.` layout / `modules[].pathRegex`), e.g. `src`.
2. **`fileExtensions`** — the source-language extensions (from `project.languages`), e.g. `[".cs"]`, `[".ts"]`, `[".java"]`.
3. **`annotationPattern`** — a regex matching THIS project's spec-annotation convention. **CONTRACT (hard): exactly two capture groups — group 1 = trait name (`TestSpec` or `TechnicalSpec`), group 2 = the non-empty spec id.** The generator validates both at parse time and refuses to run on a mismatch. Detect the convention by grepping existing tests, then build the pattern:

   | Stack / convention (illustrative) | Example annotation in source | `annotationPattern` |
   | --- | --- | --- |
   | C# xUnit `[Trait]` | `[Trait("TestSpec", "TC-001")]` | `\[Trait\("(TestSpec\|TechnicalSpec)"\s*,\s*"([^"]+)"\)\]` |
   | Java/Kotlin JUnit `@Tag` | `@Tag("TestSpec:TC-001")` | `@Tag\("(TestSpec\|TechnicalSpec):([^"]+)"\)` |
   | TS/JS test title tag | `describe('[TestSpec:TC-001] ...')` | `\[(TestSpec\|TechnicalSpec):([^\]]+)\]` |

   Adapt to whatever the project actually uses — the table is illustrative, not a fixed list. **Validate the 2-group contract before saving:**

   ```bash
   node -e "const p=/YOUR_PATTERN/; const c=(new RegExp(p.source+'|')).exec('').length-1; console.log('capture groups:', c, c===2?'OK':'FIX — must be exactly 2 (trait, id)')"
   ```

4. **No spec-annotation convention?** Do NOT invent one and do NOT leave `techSpecScan` half-filled. **Omit `techSpecScan` and set `_techSpecScanNote`** with a one-line reason — the generator then exits cleanly naming the missing key instead of reporting zero annotations, and the omission reads as a decision.

### 2s. Documentation Roots — `docsRoots` (declare only evidenced relocations)

Inspect a docs root when the task uses it or repository evidence shows that it moved. Defaults apply when a root property is omitted; do not create directories or config objects just to populate the full root catalog. Resolve `projectReference` before scanning reference docs when it is relocated.

**Detect** — probe each of the 6 roots against what the repo actually has. The accessor returns the DEFAULT whenever nothing is declared, so a mismatch between the probe and the tree on disk is exactly the relocation you must record:

```bash
node -e "const l=require('./.claude/hooks/lib/project-config-loader.cjs');const fs=require('fs');const keys=['projectReference','adr','templates','plans','teamArtifacts','productRoadmap'];console.log(JSON.stringify(keys.map(k=>{const p=l.getDocsRoot(k);return{key:k,resolved:p,exists:fs.existsSync(p)}}),null,2))"
```

- If a root used by this task exists outside its resolved default, locate its owner directory/file and declare only that moved sub-object with a repo-relative `path`.
- If the optional root is not used or does not exist, omit it. Do not create placeholder `adr`, plans, team-artifact, or roadmap roots merely to satisfy the schema catalog.

**Declare** — write only the moved sub-objects, each with its required `path` (a declared-but-pathless sub-object is an ERROR, not a default; see the `docsRoots` derivation section above for all six keys, their defaults, and their rules).

**Validate — MANDATORY, and the only surface that can catch a typo.** Runtime resolution is fail-SOFT (a bad optional config silently yields defaults); validation is fail-CLOSED. Pass the configured project-config path, including any `.claude/.ck.json` relocation:

```bash
node .claude/hooks/lib/project-config-schema.cjs --validate <configured-project-config-path>
```

Errors (missing `path`, absolute or `..`-escaping path) MUST be fixed before continuing. A "does not exist on disk" **warning** is acceptable only when `/project-init` is seeding a tree that is about to be created.

### 2t. Native Spec Artifact Profile — Derive Only from Stable Source

Run only when a spec/test-artifact capability already exists or is selected. Skip with evidence when the project has no such capability; do not create a spec profile or case corpus as part of generic setup. When selected, inspect the configured business root and applicable docs before convention detection.

1. Resolve `specRoots.business.path` (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides it) when configured or needed. Inspect representative canonical owner artifacts plus executing tests/case files; exclude derived technical projections. Trace native IDs and assertions to their executors before declaring a profile.
2. If no native profile is declared, strict business-spec and Section-8 TestSpec behavior applies by default, including TC IDs. Preserve this default; do not infer or add a native profile from one example.
3. For an established native format, declare only the supported v1 fields: `version: 1`, `kind: "engineering-contract"`, literal `sections` aliases for `intent`, `contracts`, and `evidence`; `identifiers` for `requirement`, `acceptance`, and `scenario` with a literal prefix + named grammar; `ownership: "spec-path-and-case-id"`; and one or more supported `carriers`.
4. Supported carriers are closed: `js-title-v1` maps literal suite/case call names; `js-keyed-cases-v1` maps a named binding and its `variant`, `scenario`, `requirements`, `rationale`, and `input` fields; `yaml-cases-v1` maps `scenario`, `status`, `requirements`, `acceptance`, `lists`, `variant`, `input`, and `expected`. For YAML, `acceptedStatuses` declares the local value(s) eligible for extraction; omitted values preserve the `approved` compatibility default. Derive roots, extensions, binding, call names, field names, and lifecycle values from source. Never add custom regexes, callbacks, parser plug-ins, or a second case registry.
5. Preserve real many-to-many coverage: one executor may assert several scenarios, and one scenario may have multiple variants/tests. Keep each owner + case/scenario ID + optional variant distinct, then inspect the assertion path for each claimed row. An aggregate result or ID grep alone is not evidence.
6. Validate with the exact schema description and fail-closed validator, using the configured config path:

   ```bash
   node .claude/hooks/lib/project-config-schema.cjs --describe
   node .claude/hooks/lib/project-config-schema.cjs --validate <configured-project-config-path>
   ```

   Unknown versions, grammars, aliases, fields, or overlapping incompatible carriers are errors; correct the profile at its source rather than silently dropping it or falling back to TC defaults. An invalid declared profile blocks spec-related setup until corrected.
