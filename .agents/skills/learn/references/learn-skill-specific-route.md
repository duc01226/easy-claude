# Learn — skill-specific project-protocol route procedure

> Read when any trigger T1–T4 of the Skill-Specific Project-Protocol Route in `SKILL.md` holds. Every step marked BLOCKING stays blocking.

## Skill-Specific Project-Protocol Route (BLOCKING) — procedure

**Resolve the owning skill (T3/T4):** match the lesson's task kind against skill `Use when …` descriptions in the skills catalog; cite the matching description. One clear owner → `exact` target. A family sharing a name pattern (e.g. every `*-review` skill) → `glob` target. Two or more owners that share no name pattern → one `exact` overlay per owner, listed together in the Carrier Choice question. No owner, or the rule applies across unrelated tasks → the lesson is NOT skill-specific; use the generic Routing Table. — why: a guessed owner puts the rule where it never fires.

When any trigger holds:

1. Identify the target skill (or glob family) by its exact name, with the evidence that matched it.
2. Treat the lesson as a candidate extension of that skill's project protocol.
3. **Compare carriers before recommending (BLOCKING).** The overlay is a candidate, not the default. Check it against the same carriers the generic route uses: the [Reference Doc Catalog](../SKILL.md#reference-doc-catalog-read-before-routing) and [Routing Table](../SKILL.md#routing-table) (resolved under the reference-docs root, default `docs/project-reference`), and `docs/project-config.json` (FACT vs RULE). Recommend the reference doc when its Read Trigger already fires for this kind of task and the rule is not about the skill's own steps (a T4 lesson about integration tests usually belongs in `integration-test-reference.md`); recommend the overlay when the rule changes what the skill itself does. — why: a project-reference doc is read by every agent doing that kind of work, while an overlay reaches only runs of that one skill.
4. **Carrier Choice question (BLOCKING).** `ask user question tool` with the recommended option FIRST, labelled `(Recommended)`, each option naming its concrete target path:
    - *Skill overlay for `<skill>` via `$project-skill-protocol`* — an `exact` overlay applies on every run of that skill; a `glob` overlay applies unless an `exact` overlay for the same skill exists, because the most specific tier wins
    - *Overlay + reference doc* — only when the lesson also carries a project-wide rule beyond the skill; name the doc path
    - *Reference doc only* — name the path, e.g. `integration-test-reference.md` or `lessons.md` under the reference-docs root
    - *Project config field* — when the lesson is a machine-readable FACT (see FACT vs RULE)
    - *Root `CLAUDE.md` project note + `sync-codex`* — only when the lesson also passes the Project Root Context Route candidate test (C1–C5) despite being skill-related; each question holds 2–4 options, so drop the weakest

    State a one-line reason for the recommendation. When the Prevention Depth Assessment applies, ask it as a SECOND question in the same `ask user question tool` call (each question holds 2–4 options), so the user answers once. — why: the user owns where a persistent rule lives; a silent carrier choice is the main way lessons land where no future run reads them.
5. **MUST ATTENTION** On an overlay choice, call `$project-skill-protocol add ...` for a new overlay or `$project-skill-protocol update <exact-name> ...` only after exact-name resolution identifies an existing overlay (run its `list` first when unsure).
6. **MUST ATTENTION** Let `$project-skill-protocol` perform its own mode resolution, target/scope resolution, additive-only screen, target-collision and contradiction handling, proposal/user-confirmation gate and two-write contract. Do not write overlay bodies or index rows directly from Learn.
7. On a *Reference doc only* or *Project config field* pick, continue with Routing Decision Process steps 9–10 (append to the doc, or route the config value through `$project-config`). On *Overlay + reference doc*, do both. Do not save the candidate only to `lessons.md` or another generic prose carrier unless the user picked that option.
