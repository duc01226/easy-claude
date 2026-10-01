# `$pbi --mode=review` — `--type=spec-tests` checklist and output template

Loaded by `references/mode-review.md` when the resolved type is `spec-tests`. Scoring, verdict rule, M1-M7 gate and the validated-fix loop stay in `references/mode-review.md`; the M1-M7 criteria live in `.claude/skills/shared/m1-m7-gates.md`.

## Checklist — Test Spec Review

> **[BLOCKING] MUST ATTENTION resolve the case profile before applying this rubric.** Read `docs/project-config.json`, the required project-reference docs, and `.claude/skills/shared/sdd-artifact-contract.md`. If the config or required references declare a native case contract, use its canonical owner, logical IDs, section/field roles, evidence carriers, and cardinality. Use `shared/tc-format.md` and the TC/Section 8 rules below only when no native case contract is declared. Invalid, incomplete, unreadable, or contradictory profile evidence is `BLOCKED`/`UNKNOWN`; do not fall back to the TC default or claim coverage.
> **[BLOCKING] Read** `spec-principles.md` under the configured reference-docs root for local prose/evidence rules. Under the strict default, also use `shared/tc-format.md` for TC fields, priorities, and coverage. Under a native profile, apply the same semantic checks through its declared case and evidence fields; do not require a duplicate Section 8 registry or default-only field.
> **[BLOCKING] Tech-agnostic check:** flag framework/product/language/design-pattern names in behavioral prose as findings (per the selected profile's prose policy). Source paths, class names, and test identifiers are valid only inside declared evidence carriers; the strict default uses `**Evidence**`, `CoveredBy`, legacy `IntegrationTest`, `[Source:]`, frontmatter, and Mermaid. Never flag a declared carrier as narrative leakage.
> **[BLOCKING] Business-oriented cases and cardinality:** Each business case must state an actor-facing acceptance outcome, not merely mirror a class/method. Flag a case split or narrowed only to match code structure when the user-observable behavior and invariant are the same. Preserve the strict default's one-TC-to-many-tests rule when selected; a native profile may declare another cardinality. In every profile, MUST ATTENTION preserve owner-qualified scenario identity and any variant identity, and MUST ATTENTION trace every claimed result to its actual executor and inspected assertion. Repeated scenario IDs with distinct declared variants are not duplicates; exact duplicate owner/scenario/variant identities are.

### Required (all must pass)

| #   | Check | Presence | Quality Depth |
| --- | --- | --- | --- |
| 1 | **Logical case identity** — every case follows the selected profile's identifier and owner rule; the strict default uses `TC-{FEATURE}-{NNN}`. | Does each case have a valid identity in the configured owner/carrier? | Are identities unique under the profile's full key, including owner and any declared variant? |
| 2 | **Actor/outcome coverage** — every in-scope user story or actor-facing outcome maps to at least one canonical case. | Is each story/outcome represented in the configured case set? | Does the case exercise the behavior, or merely cite a story ID? |
| 3 | **Requirement coverage** — each acceptance criterion or normative requirement maps to an applicable case. | Is every configured acceptance/requirement ID covered? | Would at least one mapped case fail if the criterion or requirement were violated? |
| 4 | **Healthy path** — each applicable outcome has a realistic success case. | Is a happy path present where the behavior permits success? | Does it assert the full observable outcome rather than a stub? |
| 5 | **Negative/failure path** — relevant errors, denied access, and invalid transitions have explicit cases. | Are negative paths represented where the contract requires them? | Do they assert the exact rejected outcome and preserve healthy behavior? |
| 6 | **No duplicate canonical cases** — identity uniqueness follows the selected profile. | Are exact profile identities unique? | Flag cases with the same intent and identity; under a native profile, distinct declared variants of one scenario are valid and must remain distinct. |
| 7 | **Meaningful expected outcome and assertion** — each case states a precise expected positive or negative outcome. | Is an authored expected value/state present in the configured carrier? | Would the mapped assertion fail if the protected outcome were wrong? An ID, comment, or aggregate result alone is not assertion proof. |
| 8 | **Intent / invariant guarded** — each executable case names the business intent or technical contract it protects. | Is the guarded intent stated in the profile's case/rationale field or an equivalent carrier? | Would the assertion fail if that intent or invariant broke? |
| 9 | **Authorization coverage** — each story or actor outcome with an authorization boundary includes a denied-access case. | Is a negative authorization case present for each applicable story/outcome? | Does it use a realistic unauthorized principal and assert the denied outcome while preserving authorized behavior? |
| 10 | **Profile format and coverage evidence** — the required fields and links match the selected profile. | Under the default, are required TC fields and `CoveredBy:` present? Under a native profile, are its required fields and case-to-test relation used? | For every claimed tested case, can the reviewer follow its owner/case/variant identity to the actual executor and inspected assertion, or an explicitly approved manual-QC carrier? `UNKNOWN`/unresolved is never PASS. |
| 11 | **Preservation cases (bugfix context)** — pre-existing healthy behavior remains protected. | Is the relevant preservation case present when a bug fix could regress existing behavior? | Would its assertion detect recurrence, not merely prove that no exception occurred? |
| 12 | **Invariant/property and boundary coverage** — each universal hard rule has a universally quantified property plus a boundary counter-case. | Does every applicable hard rule/invariant in the configured contract sections (default: `[HARD]` §4 and §5) map to both cases? | Would the property and boundary assertion fail if the invariant broke? A single example is insufficient. |
| 13 | **UI interaction intent (UI-bearing specs)** — required views, navigation, observable states, and user flows are present in the selected profile. | Under the default, are §6.2–§6.5 present or is the backend-only skip reason stated? Under a native profile, are its declared interaction fields covered? | Is UI intent linked to configured logical IDs and M1-clean, with visual fidelity left to its linked design artifact? An absent applicable interaction contract is a finding. |

> **[BLOCKING] Spec-Loop property coverage (`--type=spec-tests`):** Verify every universal hard rule/invariant in the selected contract sections maps to a universally quantified property case **and** a boundary counter-case. For the strict default, these are `[HARD]` §4/§5 invariants and property TCs. For a native profile, resolve the configured contract section and case carrier. Example-only coverage is a blocking finding; a missing/unresolvable property case is `NEEDS WORK` or `BLOCKED`, never a pass.

### Recommended (≥50% should pass)

| #   | Check                                                                                                                                                       | Presence                                                                 | Quality Depth                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Edge cases** — Boundary values, empty inputs, max limits tested                                                                                           | Are edge cases listed in the selected carrier?                           | Are these the RIGHT edge cases? Do they cover the 3 most likely production failure modes for this feature?                  |
| 2   | **Integration points** — Cross-service scenarios covered                                                                                                    | Are cross-service cases present where applicable?                        | Do integration cases verify actual data flow across services, or just that a downstream call was made?                     |
| 3   | **Performance cases** — Response time or throughput expectations where relevant; production-like data volume cases if >1000 records expected                 | Are performance cases present where data volume or SLA expectations exist?| Do they use production-like data volumes, not toy datasets that trivially pass?                                            |
| 4   | **Security cases** — Auth, authorization, input validation tested                                                                                           | Are security cases present for auth, authz, and input validation?        | Do they attempt realistic attack vectors (SQLi, over-posting, privilege escalation) not just "invalid token → 401"?       |
| 5   | **Seed data cases** — If feature needs reference data, cases verify data exists and seeding produces the intended state                                      | If reference data is needed, is a case present (or N/A)?                 | If present, does the case assert the exact seeded data shape, not just that the seeder ran without error?                   |
| 6   | **Data migration cases** — If schema changes exist, cases verify transforms, rollback behavior, and absence of data loss                                    | If schema changes exist, is a migration case present (or N/A)?           | If present, does it verify rollback behavior and zero data loss, not just forward migration success?                        |
| 7   | **Test data requirements specified** — the data setup needed to run each test is documented                                                                 | Are test data requirements stated per test?                              | Is test data specific enough to create fixtures without guessing? Vague data requirements ("a valid user") will cause test setup divergence across environments. |
| 8   | **GIVEN/WHEN/THEN format used** — tests follow the structured BDD format                                                                                    | Are all tests written in GIVEN/WHEN/THEN?                                | Are the THEN clauses assertions on observable outcomes, or on internal state? Tests asserting on internal state are brittle and break on refactoring.            |

## Output template

```markdown
## Test Spec Review Result

**Status:** PASS | WARN | FAIL
**Canonical cases reviewed:** {count} (strict default: TCs)
**Artifact identity:** {path} · sha256:{hex digest of the file bytes}
**Coverage:** {X}% of stories, {Y}% of acceptance criteria

### Coverage Matrix

| Story/AC | Case IDs (default: TC IDs) | Happy | Error | Edge |
| -------- | ------ | ----- | ----- | ---- |

### Required ({X}/{Y})

- ✅/❌ Check description

### Recommended ({X}/{Y})

- ✅/⚠️ Check description

### Missing Coverage

- {Stories/AC without mapped canonical cases}

### Verdict

{PROCEED | REVISE_FIRST}
```
