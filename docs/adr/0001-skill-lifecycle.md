# ADR-0001: Skill Lifecycle Schema, Cadence, and Catalog Migration

- **Status:** Accepted (amended 2026-06-13 — `last_reviewed` field retired; amended 2026-09-16 — consolidation cleanup exception recorded, then corrected; see Amendments)
- **Date:** 2026-05-14
- **Last amended:** 2026-09-16
- **Plan:** `plans/260514-1407-harness-quality-refactor/phase-02a-deprecation-policy.md`
- **Supersedes:** None (first ADR)

## Context

The portable `.claude/` harness ships 123 skills (authoritative count: the
`<!-- COUNT:skills -->` marker in `CLAUDE.md`; it shipped 270+ when this ADR was
first written). Prior to this ADR there was no
machine-checkable signal for whether a skill was current, deprecated, or
experimental. Skill removal happened ad-hoc by directory `rm -rf` with no
deprecation window, no scheduled GC, and no ownership trail. The
LLM-Council audit (`tmp/reports/council-260514-1407-harness-quality-refactor.md:46`)
flagged this as a Risk Register item:
"No garbage collector. Whatever you cut today regrows in six months."

We need (a) an additive frontmatter schema that records lifecycle state per
skill, (b) a scheduled GC pass that consumes that schema, and (c) a clean
migration path for the existing catalog shape consumed by hooks and docs.

## Decision

### Schema (additive, non-breaking)

`.claude/skills/<name>/SKILL.md` frontmatter MAY carry these new optional fields:

| Field              | Type   | Default   | Semantics                                                                                |
| ------------------ | ------ | --------- | ---------------------------------------------------------------------------------------- |
| `status`           | enum   | `active`  | One of `active` \| `deprecated` \| `experimental`. Absent = `active`.                    |
| `deprecated_by`    | string | _(unset)_ | When `status=deprecated`: canonical skill name that supersedes this one.                 |
| `deprecated_since` | date   | _(unset)_ | When `status=deprecated`: ISO date the deprecation landed.                               |
| `removal_after`    | date   | _(unset)_ | When `status=deprecated`: explicit earliest date GC may delete. Missing value blocks GC. |

> `last_reviewed` (date) was part of the original schema but was retired
> 2026-06-13 — see [Amendments](#amendments).

All four fields are optional. Existing skills with no lifecycle frontmatter
are treated as `status: active` by every consumer.

### Baseline Cleanup Exception

This ADR also records the one-time baseline cleanup in the same change set.
The removed shortcut/alias skills below were deleted before lifecycle metadata
was available, and this exception must not be used as precedent for future
removals:

- `cook-auto`, `cook-auto-fast`, `cook-auto-parallel`, `cook-fast`, `cook-hard`, `cook-parallel`
- `fix-fast`, `fix-hard`, `fix-parallel`
- `plan-fast`, `plan-hard`, `plan-parallel`, `plan-two`
- `test-specs-docs`

Starting with this ADR, direct directory deletion is no longer the approved
path. Maintainers deprecate first, then run GC after `removal_after`.

### Consolidation Cleanup Exception (2026-09-16)

A second, explicitly bounded exception records the skill-consolidation change set
of 2026-09-16, in which **49 skill directories** were removed by direct deletion
rather than through deprecate-then-GC. It is scoped to that change set only and,
like the baseline exception above, **must not be used as precedent for future
removals** — deprecate-then-GC remains the standing rule.

**Count derivation.** The change set has 51 distinct directory roots under
`.claude/skills/` containing deleted files. Two of them — `plan` and
`release-notes` — lost only some files and still exist on disk, so **49**
directories were removed outright. Every count in this section was derived that
way (change-set deleted-file roots, filtered against what remains on disk), not
estimated.

#### Scope — two classes, materially different impact

The 49 removals are **not** one kind of change. An earlier version of this
exception described all of them as loop/shortcut variants folded into a flag.
That was true of a minority and false of the rest, and it made a large capability
removal read as a rename. The corrected scope:

**Class 1 — a named successor exists (14 directories).** Behavior moved onto a
flag, a merged skill, or an explicitly designated successor skill, so each
removed name has a live route:

| Removed                                | Successor                                                                                                               | Source                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `changes-review-loop`                  | `changes-review --fix-loop`                                                                                             | merge                   |
| `why-review-loop`                      | `why-review --fix-loop`                                                                                                 | merge                   |
| `e2e-test-verify-loop`                 | `e2e-test-verify --fix-loop`                                                                                            | merge                   |
| `integration-test-verify-loop`         | `integration-test-verify --fix-loop`                                                                                    | merge                   |
| `workflow-review-changes-loop`         | `workflow-review-changes --fix-loop`                                                                                    | merge                   |
| `docx-to-markdown`, `markdown-to-docx` | `docx-convert`                                                                                                          | merge                   |
| `pdf-to-markdown`, `markdown-to-pdf`   | `pdf-convert`                                                                                                           | merge                   |
| `docs-seeker`                          | `/web-research`                                                                                                         | change-set decision D4  |
| `quality-gate-review`                  | pre-dev → `/dor-gate`; pre-qa/spec → `/artifact-review --type=spec-tests`; pre-release → `/production-readiness-review` | change-set decision D6  |
| `project-manager`                      | `/plan-execute` (status duty runs inline in the main session)                                                           | change-set decision D3  |
| `webapp-testing`                       | `/playwright-cli` + `/experience-review`                                                                                | change-set decision D11 |
| `plan-analysis`                        | `/plan-review` + `/plan-validate`                                                                                       | see note below          |

All 16 successor skills were verified present on disk in this change set.

Two qualifications on Class 1, so the table is not read as a clean rename:

- The last five rows are **route substitutions, not flag renames.** The
  invocation changes shape and, for `quality-gate-review`, splits three ways by
  mode. A caller must pick the right successor rather than append a flag.
- `project-manager`'s report-consolidation duty was **dropped outright** (D3);
  only the status-update duty has a successor. `webapp-testing`'s _Python_
  Playwright driver has no named equivalent — `/playwright-cli` is the driving
  half and `/experience-review` the local-run half, but neither names Python.
- `plan-analysis` was listed as successor-less in the change set's own decision
  D11. That was wrong on the evidence: its purpose (analyze a supplied plan file,
  assess impact, verify planned changes) is covered by the surviving
  `/plan-review` and `/plan-validate`. Recorded here as Class 1 so the ADR does
  not price a covered capability as a functional regression.

**Class 2 — capability removals with no successor (35 directories).**

`ask`, `branch-comparison`, `business-analyst`, `changelog`, `checkpoint`,
`claude-code`, `compact`, `context`, `context-optimization`, `copywriting`,
`dependency`, `devops`, `documentation`, `dual-ai`, `estimate-actual`,
`figma-design`, `git-merge`, `greenfield`, `journal`, `lint`,
`markdown-novel-viewer`, `memory-management`, `pr`, `problem-solving`,
`product-owner`, `prove-fix`, `quality-gate`, `recover`, `refactoring`,
`release-doc`, `research`, `sequential-thinking`, `test-ui`, `threejs`,
`worktree`

For these there is **no successor, no flag, and no equivalent invocation**. The
capability left the harness; the name did not move somewhere else.
`business-analyst` and `product-owner` stay in this class deliberately: the
change set names no successor skill for either role, and their nearest neighbours
(`/story`, `/prioritize`) cover individual tasks the roles performed, not the
roles themselves.

### Deliberately not carried forward — the release-time PO acceptance verdict

D6 folded `quality-gate-review`'s PO-acceptance mode into `/artifact-review`, but
only the PBI-readiness checks survived the fold. **No surviving skill emits an
ACCEPT | REJECT | CONDITIONAL ACCEPT verdict against a built implementation.**

This is **intended**, confirmed by the maintainer, and is not an oversight to be
rediscovered and "fixed" later. The harness keeps artifact-quality gates
(`/artifact-review`, `/dor-gate`) and implementation-readiness gates
(`/production-readiness-review`), and leaves the release-time acceptance verdict
to a human. Restoring the verdict template requires a new decision, not a bug
fix.

#### Rationale

The justification for skipping the deprecation window applies to Class 1 only: a
`deprecated` shim for `changes-review-loop` would have advertised, for the length
of the window, a path that merely forwarded to `changes-review --fix-loop`. The
grace period would have protected a spelling, not a capability.

That reasoning **does not transfer to Class 2**. Those 35 had no forwarding
target, so a deprecation window would have carried real information — "this
capability is going away, plan for it" — and it was not offered. This ADR records
that the window was skipped for them; it does not claim the skip was costless,
and it does not record a per-skill rationale for the individual removals. That
scope decision is documented, if anywhere, in the change set and release notes,
not here.

#### Residual risk accepted

- **Class 1 (14 skills) — low.** Users pinned to a removed name get no grace
  window and see the name disappear at the next release. Remediation is a
  mechanical rewrite to the successor, which the table above gives in full — a
  flag form for the nine merges, a different skill name for the other five.
- **Class 2 (35 skills) — material, and a functional regression.** Users lose
  the **capability**, not merely a name that forwards elsewhere. There is nothing
  to rewrite the invocation to. Anyone depending on one of these 35 must restore
  the directory from git history and vendor it locally, or do the work without
  harness support. No deprecation window, no successor, and no migration path was
  offered for any of them.

The mitigation is this record plus the release notes, not a `removal_after`
window. For Class 2 the mitigation is weaker than the harm: a record explains a
loss, it does not restore the capability.

#### Carrier references — what was and was not verified

Verified: `.claude/workflows.json` names **zero** removed skills — all 49 names
were checked against every string value in the file, including flag-bearing step
names, with no match. Generated mirrors and catalogs are regenerated from source
in the same change set.

**Hand-written prose carriers: swept, and now clean of invocation pointers.** The
earlier claim that "no carrier references a removed directory" was asserted
without evidence and was false as written. A spot audit for this amendment found
two live references — a routing instruction naming the deleted `/recover` skill
in `.claude/agents/framework-maintainer.md`, and an illustrative path naming
`docs-seeker` in `.claude/skills/.env.example` (still present at `:93-94` in
`HEAD`). **Both were remediated in this same changeset**, so that audit's own
citations are already historical; it is recorded here as the reason the sweep was
run, not as an open defect.

An exhaustive sweep has since been run across all 923 tracked text files outside
the generated mirrors, for all 49 names in three reference forms — the path form
`.claude/skills/<name>`, the invocation form `/<name>`, and a bare-name form for
the 27 names distinctive enough that a bare match cannot be ordinary prose.
**No invocation-form or path-form pointer to a removed skill survives.** The
bare-name matches that remain are all intentional and were checked individually:
this ADR's own successor table, `https://claude.com/claude-code` URLs, the common
phrase "quality-gate row", regex literals inside test assertions, a historical
release note describing what shipped at the time, and the `sequential-thinking`
instructions — which are deliberate, because that capability was **embedded into
the agent definitions rather than deleted outright** (see
`.claude/docs/claude-ai-agent-framework-guide.md` §18 Principles).

Two limits on that result, both deliberate. Ordinary-English names (`ask`,
`research`, `plan`, `pr`, `lint`, `context`, and the rest of the 22 ambiguous
set) were swept in the path and invocation forms only — a bare-name sweep for
those returns prose, not pointers, so a clean result there would be meaningless
rather than reassuring. And a sweep proves absence of _references_, never that a
removal was harmless: the 35 capability removals above have no successor, and
that residual risk is unchanged by this paragraph. **Still grep before relying on
any of these 49 names**, and re-run the sweep after any change that reintroduces
hand-written routing prose.

**A third direct deletion requires either a lifecycle change proposed in a new
ADR, or deprecate-then-GC as written above.** Two exceptions are the limit this
ADR tolerates before the rule is fiction.

### Lifecycle Phases

```
active ──(human PR adds deprecated_*)──> deprecated ──(GC after removal_after)──> removed
                                              │
                                              └──(human PR reverts)──> active
```

- `active`: current canonical skill. Listed in catalog `active` section.
- `deprecated`: superseded by `deprecated_by` skill; retained until `removal_after` for muscle-memory grace. Listed in catalog `deprecated` section.
- `experimental`: opt-in, may break or be removed without deprecation. Listed in catalog `experimental` section. NOT auto-promoted to deprecated.
- `removed`: directory deleted. No frontmatter trail (git history is the record).

**No skill is auto-deprecated.** Promotion from `active` to `deprecated`
requires a human PR that sets `status`, `deprecated_by`, `deprecated_since`,
and (typically) `removal_after`. The GC tool (Phase 2B `skill-gc.cjs`) is the
only thing that auto-transitions `deprecated → removed`, and only when
`removal_after` has passed AND no non-self references remain (grep-gated).

### Removal Date Guideline

Set `removal_after = deprecated_since + 90 days` unless the deprecation needs
a different grace period. A PR author MAY set a longer date for high-usage
skills or a shorter date for clear deprecations. Shorter than 30 days requires
reviewer approval.

The GC tool does not derive a missing `removal_after` from `deprecated_since`.
Missing `removal_after` means "do not delete yet" and returns
`WAITING-NO-DATE`.

### GC Cadence

Quarterly. The GC pass (`.claude/scripts/skill-gc.cjs`, shipped in Phase 2B)
is opt-in and dry-run by default. A maintainer:

1. Runs `node .claude/scripts/skill-gc.cjs` (dry-run) to list `READY` candidates.
2. Reviews the list (human gate).
3. Runs `--apply` against the approved subset.

The cadence is a calendar reminder, not an automation. The harness does not
self-prune.

### Ownership

Authorship of a deprecation = whoever sets `deprecated_by` in the PR. They
are responsible for:

- Verifying the successor skill (`deprecated_by` value) is `active`.
- Updating call sites to use the successor before merging the deprecation.
- Setting a defensible `removal_after`.

If the deprecating author leaves the project, the skill stays in the
`deprecated` bucket past `removal_after` until another maintainer claims and
GCs it. The GC tool refuses to delete anything that still has non-self
references, so abandonment is fail-safe.

### Breaking output-format change — `total_skills` shape

`generate_catalogs.py` previously emitted:

```yaml
metadata:
    total_skills: 273 # int
```

After this ADR, the generator emits BOTH the legacy `total_skills: int` AND
the new `total_by_status: dict` for one release window, then drops the
legacy field:

```yaml
metadata:
    total_skills: 273 # legacy; will be removed in the next release
    total_by_status:
        active: 260
        deprecated: 10
        experimental: 3
```

**Dual-emit migration plan:**

| Release window | `total_skills` | `total_by_status` |
| -------------- | -------------- | ----------------- |
| This release   | emitted (int)  | emitted (dict)    |
| Next release   | REMOVED        | emitted (dict)    |

Downstream consumers reading `total_skills: int` (hooks, docs, dashboards)
have one release to migrate to `total_by_status['active']` (or the sum of
`active + deprecated + experimental` if they need the legacy total). The
next-release removal is gated on a grep audit confirming zero consumers
remain on the legacy field.

### Catalog Sections

`SKILLS.yaml` (when materialized to a file via `--output`) gains three
top-level keys derived from `status`:

```yaml
skills:
    active: { <category>: [<skill>, ...], ... }
    deprecated: { <category>: [<skill>, ...], ... } # may be empty
    experimental: { <category>: [<skill>, ...], ... } # may be empty
```

Within each status bucket, the existing category grouping is preserved.

### `--check` Mode

`generate_catalogs.py --check <PATH>` regenerates the catalog in-memory,
compares against `<PATH>` on disk, and exits:

- `0` if identical (clean tree).
- `1` if drift detected, emitting a unified diff to stderr.
- `2` if `<PATH>` does not exist (target not committed yet).

The 1 vs 2 split lets CI distinguish "catalog stale" (1 — operator must
re-run with `--output` and re-commit) from "catalog not committed yet"
(2 — operator must generate and commit the canonical file first). Both
are non-zero so CI fails fast either way.

`--check` requires exactly one of `--skills` or `--commands` (same constraint
as `--output`). This is the CI-ready signal consumed by Phase 4's drift gate.

## Consequences

**Positive:**

- Skill removal becomes a documented, reviewable lifecycle, not an ad-hoc rm.
- Catalog consumers can filter by status (e.g., docs hide `deprecated` from
  newcomer-facing pages but keep them searchable for power users).
- GC tool gets an unambiguous gate (`removal_after` + grep).
- Schema is additive; zero existing skills need edits.

**Negative / Trade-offs:**

- Frontmatter parser gains 5 new optional fields — minor parser surface
  growth.
- Catalog shape changes; downstream consumers of `total_skills: int` have
  one release to migrate. We accept this cost; the legacy shape is too
  lossy to keep long-term.
- ADR documents a project-specific convention. If Anthropic later ships a
  framework-level `status` field, we will write a successor ADR migrating
  to it.

**Neutral:**

- No new tooling required at the framework level — the schema is just
  YAML frontmatter, consumed by existing `scan_skills.py` (after Phase 2A
  extension).

## Alternatives Considered

**Alt A — In-band `[DEPRECATED]` description prefix.**

- Pros: zero schema change.
- Cons: not machine-checkable; can't carry `deprecated_by`, `removal_after`.
- Rejected.

**Alt B — Separate `LIFECYCLE.yaml` registry file.**

- Pros: keeps SKILL.md clean.
- Cons: two sources of truth; sync drift inevitable.
- Rejected. Frontmatter is the canonical home (matches researcher-02 L32
  "frontmatter is the source of truth" pattern).

**Alt C — `status` enum with more values (`beta`, `stable`, `legacy`, `archived`).**

- Pros: richer semantics.
- Cons: nobody asked for them; YAGNI.
- Rejected. Start with three; add later via a successor ADR if real demand
  appears.

## Implementation Notes

- Frontmatter parser: `.claude/scripts/scan_skills.py` (Phase 2A Step 4).
- Catalog generator: `.claude/scripts/generate_catalogs.py:83-126` extended
  for status split + dual-emit (Phase 2A Step 5) + `--check` mode (Step 6).
- GC tool: `.claude/scripts/skill-gc.cjs` (Phase 2B).
- PoC deletion: `test-specs-docs` skill via Phase 2B `--apply` after grep
  verifies zero non-self references.

## Related

- `plans/260514-1407-harness-quality-refactor/plan.md`
- `plans/260514-1407-harness-quality-refactor/phase-02a-deprecation-policy.md`
- `plans/260514-1407-harness-quality-refactor/phase-02b-gc-script-and-poc.md`
- `tmp/reports/council-260514-1407-harness-quality-refactor.md`

## Amendments

### 2026-06-13 — `last_reviewed` retired

The `last_reviewed` field is removed from the lifecycle schema. It was the only
field of the original five not consumed by the GC mechanism — purely an
informational "maintainer last audited" signal — and in practice carried a
value on fewer than five of ~156 skills while ~150 emitted `null`. The cost
(an extra frontmatter field, a catalog column, a validator convention entry)
outweighed its non-existent operational use.

Removed from: the five `SKILL.md` files that set it, `scan_skills.py` emit,
`docs/project-config.json` `skillConventions.conventionFields`,
`skill-creator/references/schema-reference.md` (and its `.agents` mirror), and
the regenerated `SKILLS.yaml` / `skills_data.yaml` catalogs. The four remaining
lifecycle fields (`status`, `deprecated_by`, `deprecated_since`,
`removal_after`) are unaffected. This does **not** touch the unrelated Feature
Spec `last_reviewed` frontmatter under `docs/specs/**`.

### 2026-09-16 — consolidation cleanup exception recorded, then corrected

The [Consolidation Cleanup Exception](#consolidation-cleanup-exception-2026-09-16)
was added to the Decision section to record the 2026-09-16 change set. As first
written it was factually wrong in ways that understated what it authorized, and
it was corrected the same day:

| Claim as first written                                      | Corrected to                                                               |
| ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| "31 skill directories" removed                              | **49** — derived from the change set's deleted-file roots                  |
| All removals were loop/shortcut variants folded into a flag | True of **9**; the other **40** are capability removals with no successor  |
| "Each removed name has a live successor"                    | True of 9 only; for 40 the capability is gone, not renamed                 |
| "No carrier references a removed directory"                 | Unevidenced and false as written; replaced with what was actually verified |

The correction does not change what the exception permits — the same 49
directories stay deleted. It changes what the record _says_ was permitted: a
large capability removal had been described as a rename. The exception remains
bounded to that change set and non-precedential.

Also corrected in the same pass: the stale "270+ skills" figure in Context (now
123, per the `<!-- COUNT:skills -->` marker in `CLAUDE.md`).

**Second correction pass, same day — the 9/40 split above became 14/35.** The
first correction sorted the 49 removals by whether behavior had been folded onto
a flag, which caught only the merges. It did not consult the change set's own
decision record, where four further names carry an explicitly designated
successor (D4 `docs-seeker` → `/web-research`; D6 `quality-gate-review` → three
mode-specific successors; D3 `project-manager` status duty → `/plan-execute`;
D11 `webapp-testing` → `/playwright-cli` + `/experience-review`), and it repeated
D11's own error on `plan-analysis`, whose purpose is covered by the surviving
`/plan-review` and `/plan-validate`. Those five moved to Class 1, which is now
"a named successor exists" rather than "folded onto a flag". Class 2 is 35. All
16 successors were verified present on disk before the move. The set of deleted
directories is unchanged; only their classification is.

Recorded in the same pass: the release-time PO acceptance verdict
(ACCEPT | REJECT | CONDITIONAL ACCEPT against an implementation) is
**deliberately not carried forward** — see the subsection of that name in the
Consolidation Cleanup Exception.
