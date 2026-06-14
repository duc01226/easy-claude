# ADR-0001: Skill Lifecycle Schema, Cadence, and Catalog Migration

- **Status:** Accepted (amended 2026-06-13 — `last_reviewed` field retired; see Amendments)
- **Date:** 2026-05-14
- **Plan:** `plans/260514-1407-harness-quality-refactor/phase-02a-deprecation-policy.md`
- **Supersedes:** None (first ADR)

## Context

The portable `.claude/` harness ships 270+ skills. Prior to this ADR there was no
machine-checkable signal for whether a skill was current, deprecated, or
experimental. Skill removal happened ad-hoc by directory `rm -rf` with no
deprecation window, no scheduled GC, and no ownership trail. The
LLM-Council audit (`plans/reports/council-260514-1407-harness-quality-refactor.md:46`)
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
- `plans/reports/council-260514-1407-harness-quality-refactor.md`

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
