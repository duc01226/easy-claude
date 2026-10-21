# Integration test — related skills and standalone chain

> Read when this skill runs outside a workflow and you choose its prerequisites and follow-up steps, or when deciding which neighbouring skill owns a TC, review, run or doc-sync concern. Inside a workflow the workflow's own next step decides what runs.

## Related Skills

| Skill                        | Relationship                                                                         | When to Call                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `$spec [mode=tests]`                  | **Producer** — TCs in feature doc Section 8 are the source for test generation       | Must run spec [mode=tests] before integration-test (CREATE or UPDATE mode). TCs must exist before generating tests. |
| `$work-item --mode=review --type=spec-tests`           | **Upstream reviewer** — validates TC quality before test generation                  | Run before integration-test to ensure TCs have real assertion value                                        |
| `$spec [mode=sync]` | **Sync** — reconciles §8 TCs ↔ executing test code after tests are linked          | Run after integration-test to update the §8 `CoveredBy:` fields with the covering test links         |
| `$spec`              | **TC host** — Section 8 of feature doc is where TCs live                             | If feature doc is missing or Section 8 is empty → run $spec first                                  |
| `$spec [mode=index]`                | **Derived index** — regenerable navigation catalog over the Feature Specs (never a source of truth) | After §8 changes, to refresh the bucket `INDEX.md` TC counts                          |
| `$integration-test --mode=review` | **Reviewer** — one-pass 8-gate audit, including change coverage and real-world fidelity | Call once after generating integration tests                                                              |
| `$integration-test --mode=verify` | **Runner** — executes tests and reports pass/fail                                    | Always call after the --mode=review pass clears                                                           |
| `$docs-manager --mode=update`               | **Orchestrator** — routes to spec [mode=sync] for test traceability              | Run for full doc sync after integration test files updated                                                 |

## Standalone Chain

> **When called outside a workflow**, follow this chain to complete the integration test authoring cycle.

```
integration-test (you are here)
  │
  ├─ PREREQUISITE: TCs must exist in feature doc Section 8
  │    [REQUIRED] Verify: {Bucket}/README.{Feature}.md in the business spec root
  │                 (default docs/specs; specRoots.business.path in docs/project-config.json overrides it)
  │                 Section 8 has TC-{FEATURE}-{NNN} entries
  │    If empty → run $spec [mode=tests] [CREATE mode] first
  │
  ├─ [REQUIRED] → $integration-test --mode=review
  │     One-pass 8-gate audit: assertion value, data state, repeatability, domain logic, traceability, three-way sync, change coverage, real-world fidelity.
  │     Never skip — Gate 6 (three-way sync) is the only place where spec/code/test conflicts surface,
  │     and Gate 7 (change coverage) is the only place where untested changed behavior surfaces.
  │
  ├─ [REQUIRED] → $integration-test --mode=verify
  │     Runs tests and reports pass/fail counts. Never mark complete without real runner output.
  │
  ├─ [REQUIRED] → $spec [mode=sync]
  │     Updates the §8 TCs' CoveredBy: file::method traceability links.
  │
  ├─ [RECOMMENDED] → $docs-manager --mode=update
  │     Updates feature doc evidence fields and version history if test coverage changed materially.
  │
  └─ [RECOMMENDED] → $work-item --mode=review --type=spec-tests
        Re-run if the --mode=review pass (Gate 6) flagged TC issues requiring TC edits.

### Mode-Specific Chains

| Mode | Pre-step | Post-step |
|------|---------|-----------|
| from-changes | verify TCs updated (run $spec [mode=tests] UPDATE first) | $integration-test --mode=review → --mode=verify → /sync |
| from-prompt | confirm TC exists for target feature | $integration-test --mode=review → --mode=verify → /sync |
| review | N/A (read-only) | report findings → $spec [mode=tests] UPDATE if TCs need fixes |
| diagnose | run $test to see failures first | fix identified issue → re-run $integration-test --mode=verify |
| verify-traceability | N/A (read-only) | if orphaned TCs: $spec [mode=tests] UPDATE → $integration-test [from-prompt] |
```
