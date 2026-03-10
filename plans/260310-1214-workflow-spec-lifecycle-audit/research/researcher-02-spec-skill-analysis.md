# Spec Skill Analysis

## Skill Capability Comparison

| Aspect                  | tdd-spec                                                            | test-spec                  | integration-test                                   | test-specs-docs                    |
| ----------------------- | ------------------------------------------------------------------- | -------------------------- | -------------------------------------------------- | ---------------------------------- |
| **Purpose**             | Write specs to canonical registry (Section 17)                      | Plan tests, detailed specs | Generate integration test code                     | Sync Section 17 ↔ docs/test-specs/ |
| **Update After Bugfix** | YES—UPDATE mode                                                     | NO—generates only          | N/A                                                | N/A (passive sync)                 |
| **Business-Readable**   | YES—GWT + Gherkin                                                   | YES—GWT + detailed         | NO—code artifacts                                  | YES—mirrors specs                  |
| **Modes**               | 5: TDD-first, implement-first, UPDATE, sync, from-integration-tests | 2: From PBI, From Codebase | 5: Generate, review, diagnose, verify, from-prompt | Forward + reverse sync             |
| **Output**              | Feature doc Section 17 (canonical)                                  | team-artifacts/test-specs/ | {Service}.IntegrationTests                         | docs/test-specs/{Module}/README.md |

## tdd-spec UPDATE Mode (Key for Post-Fix Scenarios)

1. Reads existing Section 17 TCs
2. Runs `git diff` to identify code changes since last TC update
3. Finds gaps: new commands/queries not covered
4. For bugfixes: auto-generates regression TC (e.g., TC-GM-040)
5. Updates BOTH feature doc Section 17 AND dashboard

## test-spec-update Workflow (Reference Pattern)

```
review-changes → tdd-spec [UPDATE] → tdd-spec-review → test-specs-docs → integration-test → test
```

This is the existing pattern for post-change spec sync. It uses tdd-spec in UPDATE mode.

## Key Findings

1. **tdd-spec is the right tool for spec lifecycle** — supports UPDATE mode, business-readable output, canonical registry
2. **Feature doc Section 17 is canonical source of truth** — all tools read/write to it
3. **test-specs-docs is passive sync** — aggregates from Section 17 to docs/test-specs/ dashboard
4. **integration-test reads Section 17** — generates test code from TCs, verifies traceability
5. **test-spec is heavyweight planning** — use BEFORE tdd-spec for complex features (tdd-spec SKILL.md:304)

## Stakeholder Value

| Stakeholder | What They Get from Specs                                          |
| ----------- | ----------------------------------------------------------------- |
| **BA/PO**   | Business-readable GWT specs in feature docs = acceptance criteria |
| **DEV**     | TDD contracts: what to implement, regression boundaries           |
| **QC/QA**   | Test cases with priority, data, and traceability                  |
| **Anyone**  | docs/test-specs/ dashboard = browsable spec index                 |
