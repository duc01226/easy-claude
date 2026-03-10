# Integration Test Reference

<!-- Last scanned: 2026-03-10 -->
<!-- This file is referenced by Claude skills and agents for project-specific context. -->

## Test Architecture

The framework uses a custom CJS test runner (no external test framework dependency).

| Component               | Location                                    | Runner                  |
| ----------------------- | ------------------------------------------- | ----------------------- |
| Hook tests (suites)     | `.claude/hooks/tests/suites/*.test.cjs`     | `run-all-tests.cjs`     |
| Hook tests (standalone) | `.claude/hooks/tests/test-*.cjs`            | Direct `node` execution |
| Main test runner        | `.claude/hooks/tests/test-all-hooks.cjs`    | Runs all hooks tests    |
| Lib unit tests          | `.claude/hooks/lib/__tests__/*.test.cjs`    | Direct `node` execution |
| Scout block tests       | `.claude/hooks/scout-block/tests/test-*.js` | Direct `node` execution |

## Test Suites (13)

| Suite                  | File                                            | Tests                           |
| ---------------------- | ----------------------------------------------- | ------------------------------- |
| Bugfix Regression      | `suites/bugfix-regression.test.cjs`             | Regression tests for fixed bugs |
| Code Patterns Injector | `suites/code-patterns-injector.test.cjs`        | Pattern injection logic         |
| Context                | `suites/context.test.cjs`                       | Context injection tests         |
| Init Reference Docs    | `suites/init-reference-docs.test.cjs`           | Doc initialization              |
| Integration            | `suites/integration.test.cjs`                   | Cross-hook integration          |
| Lifecycle              | `suites/lifecycle.test.cjs`                     | Session lifecycle events        |
| Notification           | `suites/notification.test.cjs`                  | Notification providers          |
| Production Readiness   | `suites/production-readiness-protocol.test.cjs` | Quality gates                   |
| Quality Audit          | `suites/quality-audit.test.cjs`                 | Audit logic                     |
| Search Before Code     | `suites/search-before-code.test.cjs`            | Search enforcement              |
| Security               | `suites/security.test.cjs`                      | Security hooks                  |
| Swap Engine            | `suites/swap-engine.test.cjs`                   | Output compression              |
| Workflow               | `suites/workflow.test.cjs`                      | Workflow routing/tracking       |

## Running Tests

```bash
# Run all hook tests
node .claude/hooks/tests/test-all-hooks.cjs

# Run test suites only
node .claude/hooks/tests/run-all-tests.cjs

# Run a single suite
node .claude/hooks/tests/suites/workflow.test.cjs

# Run scout-block tests
node .claude/hooks/scout-block/tests/test-pattern-matcher.js

# Run lib unit tests
node .claude/hooks/lib/__tests__/ck-config-utils.test.cjs
```

## Test Helpers

| Helper                       | Location               | Purpose                    |
| ---------------------------- | ---------------------- | -------------------------- |
| `test-utils.cjs`             | `hooks/tests/helpers/` | Common test utilities      |
| `test-utils.cjs`             | `hooks/tests/lib/`     | Assertion helpers          |
| `assertions.cjs`             | `hooks/tests/lib/`     | Custom assertion functions |
| `hook-runner.cjs`            | `hooks/tests/lib/`     | Hook execution harness     |
| `test-fixture-generator.cjs` | `hooks/lib/`           | Generate test fixtures     |
