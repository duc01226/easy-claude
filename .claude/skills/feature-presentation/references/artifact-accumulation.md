# Artifact Accumulation — Scope Resolution, Parse Map, Gap-Fill Routing, Branches

Collect-side reference for `feature-presentation`. Governs **content collection**: which artifacts enter the deck (scope resolution), which slide section each artifact type feeds (parse map), how missing artifacts are filled (gap-fill routing), and the spec-only / empty-state branches. (Rendering correctness lives in `deck-template.md`.)

---

## 1. Scope Resolution (SKILL.md Step 1)

Three modes, in priority order:

### A. Default — active-plan anchor (created→now date range)

1. Read `activePlan` from the session file `/tmp/ck-session-{id}.json` (set by `.claude/scripts/set-active-plan.cjs`).
2. Read the plan to get its **created date** (frontmatter `created:`) and its declared artifact/spec outputs.
3. Compute the **created→now date range** and enumerate every `{YYMMDD}` in it.
4. Glob each artifact root for EVERY `{YYMMDD}` in the range (NOT just today):
    - `team-artifacts/ideas/{YYMMDD}-*`
    - `team-artifacts/pbis/{YYMMDD}-pbi-*.md`
    - `team-artifacts/pbis/stories/{YYMMDD}-us-*.md`
    - `team-artifacts/pbis/*-mockup.html` (date-prefixed via their PBI)
    - `team-artifacts/design-specs/{YYMMDD}-designspec-*.md`
    - the plan's `docs/specs/{Bucket}/README.{Feature}.md` outputs
5. **Multi-day rule (why the range, not today):** a workflow spanning midnight authors specs on day 1 and PBIs on day 2. A single-day `{YYMMDD}` glob silently drops the day-1 artifacts. Always glob the whole created→now range.

### B. Custom prompt — widen scope

If the user names specs/features, widen the in-scope set to those named artifacts plus their dependents (the PBIs, stories, mockups, and design-specs derived from them).

### C. Standalone + no prompt — ask

If invoked standalone with no prompt/scope and no resolvable `activePlan`, use `AskUserQuestion` to ask which specs/ideas to present. NEVER silently guess scope.

---

## 2. Per-Artifact-Type Parse Map

Each in-scope artifact feeds one or more stakeholder slide sections:

| Artifact type | Source path                                         | Parse → slide section                                                                 |
| ------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Idea          | `team-artifacts/ideas/{YYMMDD}-*`                   | Business context (problem, value, idea→spec narrative)                                 |
| Feature Spec  | `docs/specs/{Bucket}/README.{Feature}.md`           | Business context (§1-3); Behavior & rules (§4 rules / §5 invariants); QC view (§8 TCs) |
| PBI           | `team-artifacts/pbis/{YYMMDD}-pbi-*.md`             | Scope & backlog (PBI cards, acceptance criteria, priority)                             |
| User story    | `team-artifacts/pbis/stories/{YYMMDD}-us-*.md`     | Scope & backlog (As-a/I-want/So-that, acceptance criteria)                             |
| Design-spec   | `team-artifacts/design-specs/{YYMMDD}-designspec-*.md` | UI / mockups (ASCII wireframe + Component Inventory / States / Design-Tokens tables) |
| Mockup        | `team-artifacts/pbis/*-mockup.html`                 | UI / mockups (embedded via `<iframe srcdoc>` — see `deck-template.md` §3)             |

**Real domain data:** populate sample data from `docs/project-reference/domain-entities-reference.md` — real entity field names + realistic values, never Lorem ipsum or "Item 1, Item 2". Keep accompanying prose tech-agnostic (business/observable terms, not framework/CSS class names).

---

## 3. Gap-Fill Routing (SKILL.md Step 2 — sub-agent)

Fill missing downstream artifacts so the deck is complete:

| Gap                                              | Fill action                                                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Targeted spec has NO PBIs                         | Invoke `workflow-spec-to-pbi` **AS A SUB-AGENT** (Agent tool) — returns a summary, writes full findings to `plans/reports/` |
| PBIs lack `-mockup.html` AND workflow is mockup-bearing (`idea-to-pbi`) | Invoke `pbi-mockup` per PBI to generate the missing mockup                       |
| Spec-only `idea-to-spec` context                 | SKIP all mockup generation — never invoke `pbi-mockup` (deck uses design-spec visuals only)          |

**Sub-agent rule (why):** per CLAUDE.md "Workflow Step Advancement §3", a step that itself activates a multi-step workflow MUST run as a sub-agent — it returns only a summary and writes full findings to `plans/reports/`. Running it inline would pollute the deck-build context with the entire workflow transcript and exhaust the budget before assembly.

---

## 4. Branches

### Spec-only vs mockup-bearing

| Context             | Visual source for the "UI / mockups" section                                              |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `idea-to-pbi`       | Embedded `pbi-mockup` HTML via `<iframe srcdoc>` (full HTML mockups)                       |
| `idea-to-spec`      | Design-spec ASCII wireframe + Component Inventory / States / Design-Tokens tables ONLY — NO HTML mockups, NO `pbi-mockup` invocation |

The spec-only branch preserves the `idea-to-spec` no-mockup / no-code contract: in that context the deck NEVER generates or embeds an HTML mockup, even if one could be produced.

### Empty-state (F3)

- If scope resolves to **zero artifacts**, emit an explicit empty-state slide rather than failing.
- If an in-scope feature has **no `-mockup.html` AND no design-spec**, render an explicit empty-state slide ("No mockup/design-spec available for {feature}") — never a broken/blank iframe.

---

## 5. Accumulation Output (handed to `deck-template.md`)

The accumulation step produces an ordered, stakeholder-sectioned content model:

1. **Title / agenda** — feature(s), run date, resolved scope.
2. **Business context** — from ideas + Feature Spec §1-3.
3. **Scope & backlog** — from PBIs + stories.
4. **Behavior & rules** — from Feature Spec §4 rules / §5 invariants + §8 test cases.
5. **UI / mockups** — per the spec-only vs mockup-bearing branch (or empty-state).
6. **QC view** — from Feature Spec §8 test specifications + states matrix + edge cases.
7. **Summary / next steps**.

The render-side (`deck-template.md`) turns this content model into the single standalone HTML deck.
