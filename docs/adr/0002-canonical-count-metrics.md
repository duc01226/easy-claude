# ADR-0002: Canonical Count Metrics for Harness Inventory

- **Status:** Accepted
- **Date:** 2026-05-14
- **Plan:** `plans/260514-1407-harness-quality-refactor/phase-04-docgen-tooling.md`
- **Supersedes:** None

## Context

The `.claude/` harness is described by 20+ documents that hand-type inventory counts (skills, hooks, agents, workflows, shared modules, lib-modules). Scout Part B (`scout/scout-01-imperatives-and-mirrors.md:57-103`) enumerated 30+ drift sites with observed values for "skills" alone ranging across 202 / 231 / 236 / 258 / 266 / 272 / 280.

Phase 4 introduces a generator (`generate_catalogs.py --inject-counts`) that replaces hand-typed numbers with marker-region tokens populated from filesystem truth. Before generating any number, the **canonical metric** must be defined per kind — otherwise the generator simply produces a defined-wrong value that future contributors will trust.

Scout blocker #3 (`scout-01-...md:126`): "`.claude/skills/shared/` has 3 entries on disk, but docs claim 19 / 25 / 27. Either the docs count a different directory ... or they're all wrong. Phase 1 must define the canonical metric before fixing the numbers."

## Decision

### Canonical metrics, by kind

| Kind          | Glob                          | Counted                                                              | Filter dimension                                   |
| ------------- | ----------------------------- | -------------------------------------------------------------------- | -------------------------------------------------- |
| `skills`      | `.claude/skills/*/SKILL.md`   | Direct skill directories with a `SKILL.md` entry point               | `active` / `deprecated` / `experimental` / `total` |
| `hooks`       | `.claude/hooks/*.cjs`         | Direct `.cjs` files in `.claude/hooks/` (excluding `lib/`, `tests/`) | `total` only                                       |
| `agents`      | `.claude/agents/*.md`         | Direct `.md` files in `.claude/agents/`                              | `total` only                                       |
| `workflows`   | `.claude/workflows.json` keys | Top-level workflow IDs in `workflows.json`                           | `total` only                                       |
| `shared`      | `.claude/skills/shared/*`     | Direct children (files + dirs at depth 1) of `shared/`               | `total` only — **Metric A**                        |
| `lib-modules` | `.claude/hooks/lib/*.cjs`     | Direct `.cjs` files in `.claude/hooks/lib/`                          | `total` only                                       |

### Shared modules — Metric A (the disputed one)

`.claude/skills/shared/` is counted as **direct children at depth 1, files + dirs**, via glob `.claude/skills/shared/*`.

- On-disk today (2026-05-14): 3 entries (`tc-format.md`, `sub-agent-selection-guide.md`, `sync-inline-versions.md`). All files, zero subdirs.
- Metric A maps to what a human counts when reading the directory.
- The pattern is `shared/*` (NOT `shared/*/` which only matches subdirectories and would return 0 today).

Metric A is preferred over Metric B (transitive recursive count) because:

- Metric A diverges from Metric B only when nested subdirectories appear. Today both return 3.
- The moment a contributor adds `.claude/skills/shared/some-helper/file.md`, Metric B counts 1 (the nested file) while Metric A counts 1 (the parent dir as a single child). Metric A's "directory is one entry regardless of its internals" semantics matches how the directory is conceptualized in docs.

### Filter semantics for `skills`

The `skills` kind supports four filters:

- `active` — count of skill dirs whose `SKILL.md` frontmatter has `status: active` (or absent, per ADR-0001 default).
- `deprecated` — count of skill dirs whose `SKILL.md` frontmatter has `status: deprecated`.
- `experimental` — count of skill dirs whose `SKILL.md` frontmatter has `status: experimental`.
- `total` — sum of all three.

This is sourced from `scan_skills.py` outputs (the same data that powers `SKILLS.yaml`'s status buckets per ADR-0001).

### Marker-region token convention

```
<!-- COUNT:<kind>:<filter> -->NNN<!-- /COUNT -->
```

- `<kind>` is from the table above.
- `<filter>` is optional; default `total` is implied when omitted (`<!-- COUNT:skills -->NNN<!-- /COUNT -->` ≡ `<!-- COUNT:skills:total -->NNN<!-- /COUNT -->`).
- `NNN` is the digit-only count populated by `--inject-counts`.
- Regex is anchored to `COUNT:` prefix + digits-only middle, so user-content `<!-- COUNT something -->` strings without the `:kind` form are not matched.

### Out of scope (deferred)

- **Logical hooks** — `.claude/docs/README.md:30` notes "~37 logical hooks (53 files)" where multi-part hooks like `prompt-context-assembler.cjs` + `-claude.cjs` + `-closers.cjs` are one logical hook spread across multiple files. Phase 4 ships RAW file counts only; logical-hook semantics requires a separate counter and is deferred to a follow-up.
- **Plugin commands, MCP servers, slash-command aliases** — not part of Phase 4's pilot scope.

## Consequences

**Positive:**

- Generated counts have a single defensible source per kind.
- `--check-counts` CI gate prevents future drift.
- Future contributors can extend the kind table without re-litigating metric semantics.

**Negative / Trade-offs:**

- `shared` Metric A semantics may surprise contributors who expected transitive counts. Mitigated by this ADR's explicit definition and the marker token format making the kind visible at the call site.
- Logical-hook ambiguity remains for `.claude/docs/README.md`. That doc retains hand-typed numbers until a follow-up plan defines `logical-hooks` as a separate kind.

**Neutral:**

- The `<filter>` dimension is only meaningful for `skills` today. Other kinds always use `total`. The schema accommodates future per-kind filters (e.g., `hooks:active` if hook lifecycle ever lands).

## Alternatives Considered

**Alt A — Metric B (transitive recursive) for `shared`**

- Pros: counts every file regardless of nesting.
- Cons: contributor adding a nested helper file silently inflates the count without changing the visible directory layout. Diverges from human intuition.
- Rejected.

**Alt B — Don't count `shared` at all; remove from docs.**

- Pros: zero metric to define.
- Cons: docs reference shared modules; removing the count leaves a referenced-but-unmeasured concept.
- Rejected. Define and count.

**Alt C — `logical-hooks` as a Phase 4 kind.**

- Pros: solves the `.claude/docs/README.md` "~37 logical hooks" ambiguity.
- Cons: requires defining what "logical hook" means structurally (filename prefix? frontmatter? manifest?). No precedent in the repo for that grouping. Out of scope for Phase 4 pilot.
- Rejected; deferred to follow-up.

## Implementation Notes

- Counter implementation: `count_kind(kind, filter)` in `.claude/scripts/generate_catalogs.py` (Phase 4 Step 2).
- For `skills`, the counter reads `scan_skills.py` output to honor the status split.
- For `hooks` / `agents` / `lib-modules`, the counter uses Python `glob` against the table's globs.
- For `workflows`, the counter loads `.claude/workflows.json` and counts top-level keys.
- For `shared`, the counter uses `os.listdir('.claude/skills/shared/')` filtered by file/dir existence (Metric A).

## Related

- `plans/260514-1407-harness-quality-refactor/phase-04-docgen-tooling.md`
- `docs/adr/0001-skill-lifecycle.md` (sibling — status enum used by `skills:active` filter)
- `plans/260514-1407-harness-quality-refactor/scout/scout-01-imperatives-and-mirrors.md` (blocker #3)
- `plans/260514-1407-harness-quality-refactor/research/researcher-02-deprecation-and-docgen.md` (industry pattern citations)
