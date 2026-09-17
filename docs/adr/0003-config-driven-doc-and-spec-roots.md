# ADR-0003: Config-Driven Doc and Spec Roots

- **Status:** Accepted
- **Date:** 2026-09-17
- **Plan:** `plans/260917-0521-config-driven-docs-spec-roots/phase-04-adr-and-spec-system-reference.md`
- **Supersedes:** None — this ADR **reverses an undocumented convention**, not a prior ADR. The
  fixed-root rule was never recorded as a decision; it lived as a code comment and two prose
  sentences, which is precisely why it needed reversing on the record rather than in place.

## Context

### What was fixed, and why it was defensible

The harness treated `docs/specs/` as an immovable location. Three surfaces asserted it as a
deliberate design decision rather than an oversight:

- `.claude/hooks/lib/project-config-loader.cjs` — "Runtime gates use this helper instead of
  per-project configuration. The fixed root keeps copied frameworks predictable across projects."
- `docs/project-reference/spec-system-reference.md` — section heading `## 1. Fixed Spec Root`, plus
  "keep the portable `docs/specs/` root **unless the runtime loader and project reference docs are
  intentionally changed together**".
- `.claude/skills/spec/SKILL.md` and `.claude/skills/spec-index/SKILL.md` — "`docs/specs/` is the
  **fixed** Feature Spec root".

The reason was real and worth naming precisely, because it is what this ADR spends. The `.claude/`
directory is **copied** between repositories. A maintainer who had seen the harness once could open
any repository carrying it and know, without reading anything, where the Feature Specs were. Every
skill, every agent, every verifier, every generated mirror, and every AI session agreed on one
string. That is a genuine property: zero configuration to get wrong, zero divergence between what
the AI reads and what the tooling scans, and no class of bug in which a relocated root silently
routes a reader to an empty directory.

### What it cost

Two costs, and the second is the one that made the rule untenable.

**A relocated project had no way to tell the framework.** The schema already declared
`specRoots.business.path` and `specRoots.technical.path` — the configuration key existed and
validated — but the runtime accessor that answers "where do specs live?" ignored it and returned the
literal. A project that stored its specs elsewhere therefore had a config file asserting one
location and a runtime asserting another. That is not "unconfigurable"; it is
**configurable-and-lying**, which is strictly worse, because the adopter has every reason to believe
the declaration took effect.

**The prose outnumbers the code by two orders of magnitude.** Roughly 2,000 raw-read literal
occurrences across `SKILL.md` files, agent definitions, shared protocol bodies, and reference docs
instruct the AI to read the default paths, against roughly 15 code readers. Fixing only the
accessors would have left every surface the model actually reads still naming the wrong directory.
The predictability the fixed root bought was, by this point, predictability about a string rather
than about where a given project's specs are.

### Why the original reason no longer binds

The rule conflated two things: _a stable default_ and _a prohibition on configuring_. Only the first
one delivers the predictability. A copied framework in a project that declares nothing resolves to
exactly the literal it always used — byte-identically, which is an explicit non-negotiable of the
change set and is asserted by its backward-compatibility cases. The maintainer's "I know where specs
live without looking" survives untouched for every project that never relocates, which is the
overwhelming majority. What is removed is only the prohibition, and the prohibition never bought
predictability for the relocated project; it bought _wrongness_ for it.

`spec-system-reference.md` had, in fact, already sanctioned this reversal in advance: it conditioned
relocation on the runtime loader and the project reference docs changing **together**. This change
set is that coordinated pair.

## Decision

### Roots become configurable, with the framework literal as the fallback

Eight relocatable roots are declarable in `docs/project-config.json`. Each resolves from config and
falls back to the literal the framework has always used:

| Token                   | Config key                        | Default when unset        |
| ----------------------- | --------------------------------- | ------------------------- |
| `{SPEC_ROOT}`           | `specRoots.business.path`         | `docs/specs`              |
| `{SPEC_ROOT_TECHNICAL}` | `specRoots.technical.path`        | `docs/specs-technical`    |
| `{REF_DOCS_ROOT}`       | `docsRoots.projectReference.path` | `docs/project-reference`  |
| `{ADR_ROOT}`            | `docsRoots.adr.path`              | `docs/adr`                |
| `{TEMPLATES_ROOT}`      | `docsRoots.templates.path`        | `docs/templates`          |
| `{PLANS_ROOT}`          | `docsRoots.plans.path`            | `plans`                   |
| `{TEAM_ARTIFACTS_ROOT}` | `docsRoots.teamArtifacts.path`    | `team-artifacts`          |
| `{PRODUCT_ROADMAP_DOC}` | `docsRoots.productRoadmap.path`   | `docs/product-roadmap.md` |

`tmp/` and `temp/` are **excluded deliberately** and get no token. They are fixed framework
invariants for disposable output; making the scratch location negotiable would buy nothing and would
put a second failure mode into every report-writing path.

Partial declaration stays an **error**, not a silent per-field default — matching the rule
`specRoots` already enforced. A project declaring half a root block gets a validation failure rather
than a half-resolved path.

### Two expression forms, because the consumers are not alike

The same root has to reach two kinds of surface, and one mechanism cannot serve both:

- **Form (a) — tokens**, for strings that pass through a resolver before a model reads them:
  `workflows.json` `injectContext`/`description` fields, generated `CLAUDE.md` marker sections, and
  the Codex mirror generator's output.
- **Form (b) — the default-plus-override prose idiom**, for files read **raw**: `SKILL.md` bodies,
  `.claude/agents/*.md`, shared protocol bodies, and project reference docs. The idiom is a single
  sentence — _default `<literal>`; a `<config key>` entry in `docs/project-config.json` overrides the
  path_ — and the repository already shipped it before this change set.

A bare `{SPEC_ROOT}` in a raw-read file would render to the model as the literal seven characters
`{SPEC_ROOT}`, which is **strictly worse than the hardcoded path**: the hardcoded path is at least
correct for the default project. The split is therefore forced by the delivery mechanism, not chosen
for elegance. **No bare unresolved token may ever reach a raw-read file**; a build-gating verifier
enforces the boundary from both sides.

### The two-plane contract — and its accepted limitation

Resolution behaves differently in validation than at runtime, and this is deliberate:

| Plane          | Behaviour                                                                                                        | Where enforced                                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Validation** | **fail-CLOSED** — a declared-but-invalid key (missing subfield, `../` traversal) is an error that exits non-zero | `node .claude/hooks/lib/project-config-schema.cjs --validate docs/project-config.json`, wired into `verify:all` as an explicit gate |
| **Runtime**    | **fail-SOFT** — an invalid, unreadable, or absent config yields the documented default; no accessor throws       | `project-config-loader.cjs` accessors                                                                                               |

The runtime loader wraps its read and parse in a `try`/`catch` that caches `{}` for the process
lifetime. A malformed config, an unreadable config, and an **absent** config are therefore
indistinguishable to every accessor: all three yield the documented default.

**This limitation is recorded, not hidden.** A project that relocates its specs and then typos
`docsRoots` is silently told the default path, with no runtime error on any surface. Fail-soft is
still the right runtime behaviour, because these accessors run inside hooks: an accessor that threw
on a bad config would block every tool call in the session, which is a worse failure than a wrong
path — an unreadable directory listing versus an unusable session.

The mitigation is the validation plane, and it only counts because it is **wired into the build**.
Before this change set, `project-config-schema.cjs --validate` was not referenced by any npm script,
so the fail-closed claim had no enforcement surface anywhere. Wiring it into `verify:all` is what
converts "we validate" from an aspiration into a gate. A separate test case asserts that a malformed
config yields defaults rather than a throw, so the fail-soft half is a tested contract rather than
an accident of the `catch`.

### Prose honesty is machine-checked

A build-gating verifier (`.claude/scripts/codex/verify-configurable-root-literals.mjs`) scans for
residual hardcoded root literals and passes an occurrence only when it sits in a form-(b) sentence
that names `docs/project-config.json`, sits inside a config-example fence, or lives in a file
allowlisted with a recorded reason. Residue is computed dynamically on every run; the allowlist is a
suppression list, never the inventory. Without this, ~2,000 prose literals would drift back to
asserting the default one edit at a time, and nothing would notice.

## Consequences

**Positive:**

- An adopter who relocates any of the eight roots is told the correct path by every surface the AI
  reads — injected context, generated `CLAUDE.md` tables, and skill/agent prose — instead of by the
  config file alone.
- The schema stops lying: a declared `specRoots.business.path` now takes effect at runtime.
- Eight roots are configurable where zero were, and the configurable set is enumerated in one table
  rather than discovered per reader.
- Prose drift back to hardcoded literals is a build failure rather than a silent regression.

**Negative / Trade-offs:**

- **Cross-project predictability is spent.** A maintainer can no longer assume `docs/specs/` in a
  copied harness and must read `docs/project-config.json` before trusting a path. **Who pays:**
  framework maintainers, on every future path-touching change. This is the real cost of the reversal
  and it is accepted knowingly — see the Trade-Off note below.
- **Two resolution forms instead of one literal.** Contributors must know which surface takes a
  token and which takes the prose idiom, and must not mix them. Mitigated by the verifier policing
  both directions, but it is genuinely two mechanisms to learn.
- **Adopters who relocate own their config correctness.** Because the runtime plane is fail-soft, a
  typo'd root is not reported at runtime — it is reported only by the validation gate. An adopter
  who relocates roots and does not run `--validate` in their own CI can be silently served defaults.
  **Who pays:** the relocating adopter, at the moment of the typo; the framework cannot detect it
  for them.
- **The default is now a fallback, not a guarantee.** Reading a literal in source no longer proves
  where that project's specs are. Every future reader of a path must ask whether it is the default
  or the configured value.

**Neutral:**

- A project that declares nothing is **byte-identical to before**. Backward compatibility is a
  non-negotiable of the change set, proven by the existing suites passing unchanged rather than by
  new assertions.
- `tmp/` and `temp/` are untouched and stay fixed.
- The `referenceDocs[]` canonical floor is unchanged; convention merge stays additive and opt-in.

### Trade-Off note — why predictability was the right thing to spend

Predictability was never lost for the projects that had it: an undeclared root resolves to the same
literal, so the copied-harness reader is exactly as well off as before. It is spent only in projects
that deliberately relocated — and in those, the "predictable" answer was already the **wrong**
answer. The change converts a guaranteed-wrong answer for some projects into a
must-check-the-config answer for all of them. That is a real cost paid by maintainers on every
path-touching change, and it is worth it because a confidently wrong path is more expensive than a
path you have to look up.

## Alternatives Considered

**Alt A — Keep the fixed root; document it harder.**

- Pros: zero code change; one string everywhere; no two-form split to learn.
- Cons: leaves `specRoots` in the schema as a validated key with no runtime effect. Documenting a
  restriction does not give a relocated project a way to declare itself, and the schema would keep
  advertising a capability it does not deliver.
- Rejected. The defect is configurable-and-ignored, and better prose does not close it.

**Alt B — Configure the code readers only; leave the ~2,000 prose literals hardcoded.**

- Pros: ~15 files instead of ~140; no verifier, no allowlist, no propagation risk.
- Cons: the AI reads prose, not accessors. A relocated project would have correct tooling and
  incorrect instructions — the model would be told to read the default path by every `SKILL.md` it
  opens. The outcome that makes this change worthwhile is specifically that _every_ surface the
  agent reads reports the configured path.
- Rejected. It fixes the half nobody reads.

**Alt C — One mechanism everywhere: tokens in raw-read files too.**

- Pros: a single form to learn; no idiom to police; no ambiguity about which surface gets which.
- Cons: raw-read files are handed to the model verbatim, so an unresolved `{SPEC_ROOT}` renders as a
  literal placeholder — the model is told to read a directory whose name contains braces. That is
  worse than the hardcoded path it replaced, which at least works for the default project.
- Rejected on a hard delivery constraint, not on taste.

**Alt D — Make the runtime plane fail-closed too (throw on an invalid config).**

- Pros: closes the typo gap; one consistent failure model; no silently-wrong path.
- Cons: these accessors execute inside hooks on the tool-call path. A throw would block every tool
  call in the session, so a one-character config typo would take the session down entirely. That is
  a strictly worse failure than a wrong directory.
- Rejected, with the residual gap recorded above and mitigated by the wired `--validate` gate rather
  than pretended away.

**Alt E — Record the reversal in `lessons.md` instead of an ADR.**

- Pros: no new file; the lessons file is read frequently.
- Cons: `lessons.md` holds AI failure modes, not architecture decisions, and a reversed design
  decision with a named cost is precisely what `docs/adr/` exists for.
- Rejected.

## Implementation Notes

- Token table and resolution: `PORTABILITY_TOKENS` in `.claude/hooks/lib/project-config-loader.cjs`
  is the single definition; `.claude/scripts/codex/sync-context-workflows.mjs` reads that table so
  the Claude runtime and the Codex mirror generator cannot disagree by construction.
- Every token resolves **slash-free** (file tokens resolve to a file path); consuming prose supplies
  its own separator. The two spec accessors keep their historical trailing slash — token and
  accessor deliberately return different forms.
- Schema keys, required-subfield checks, and traversal rejection: `.claude/hooks/lib/project-config-schema.cjs`.
- Prefix matching against a configured root goes through the shared path normalizer, so
  trailing-slash / backslash / case variance cannot make a prefix check fail open.
- Prose residue gate: `.claude/scripts/codex/verify-configurable-root-literals.mjs` plus
  `.claude/scripts/codex/config/root-literal-allowlist.json`.
- Reversed surfaces: the loader banner in `.claude/hooks/lib/project-config-loader.cjs`,
  `docs/project-reference/spec-system-reference.md` section 1, and the fixed-root sentences in
  `.claude/skills/spec/SKILL.md` and `.claude/skills/spec-index/SKILL.md`.

## Related

- `plans/260917-0521-config-driven-docs-spec-roots/plan.md` — `## Token vocabulary`,
  `## Two-plane resolution contract — and a KNOWN LIMITATION`
- `plans/260917-0521-config-driven-docs-spec-roots/goal.md` — SC-3, SC-7, SC-11, SC-13
- `docs/project-reference/spec-system-reference.md` — `## 1. Configured Spec Roots`, the
  reference-doc half of this decision
- `docs/adr/0002-canonical-count-metrics.md` — sibling precedent for defining a contested metric
  once instead of per consumer
