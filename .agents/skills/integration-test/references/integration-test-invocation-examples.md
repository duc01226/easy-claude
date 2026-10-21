# Integration test — exemplar search and invocation examples

> Read when Step 2 needs commands to locate exemplar test files and base classes, or when choosing how to invoke the skill for a case (Section 8 TCs, git changes, after `$spec [mode=tests]`, positional review, diagnose, verify).

## Example Files to Study

Search codebase for existing integration test files:

```bash
find . -name "*IntegrationTests.*" -type f
find . -name "*IntegrationTestBase.*" -type f
find . -name "*IntegrationTestFixture.*" -type f
```

| Pattern                                                            | Shows                        |
| ------------------------------------------------------------------ | ---------------------------- |
| `{Service}.IntegrationTests/{Domain}/*CommandIntegrationTests.*`   | Create + update + validation |
| `{Service}.IntegrationTests/{Domain}/*QueryIntegrationTests.*`     | Query with create-then-query |
| `{Service}.IntegrationTests/{Domain}/Delete*IntegrationTests.*`    | Delete + cascade             |
| `{Service}.IntegrationTests/{Service}ServiceIntegrationTestBase.*` | Service base class pattern   |

### How to Use for Each Case

**Case: Generate tests from existing test specs (feature docs Section 8)**

```
$integration-test CreateOrderCommand
```

→ Reads Section 8 TCs, generates test file with TC annotations

**Case: Generate tests from git changes (default)**

```
$integration-test
```

→ Detects changed command/query files, checks Section 8 for matching TCs, generates tests

**Case: Generate tests after $spec [mode=tests] created new TCs**

```
$spec [mode=tests] → $integration-test
```

→ spec [mode=tests] writes TCs to Section 8, then integration-test generates tests from those TCs

**Case: Review existing tests for quality**

```
$integration-test review Orders
```

→ Audits test quality, finds flaky patterns, checks best practices

**Case: Diagnose test failures**

```
$integration-test diagnose OrderCommandIntegrationTests
```

→ Analyzes failures, determines test bug vs code bug

**Case: Verify test-spec traceability**

```
$integration-test verify {Service}
```

→ Checks test code matches specs and feature docs bidirectionally
