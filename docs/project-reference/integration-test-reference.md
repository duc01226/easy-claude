# Integration Test Reference

<!-- Last scanned: 2026-03-15 -->
<!-- This file is referenced by Claude skills and agents for project-specific context. -->

## Test Architecture

The framework uses a custom CJS test runner with no external test framework dependency. Tests execute hooks as child processes via `node`, feeding JSON payloads through stdin and asserting on exit codes and stdout.

### Two-Layer Design

1. **`test-all-hooks.cjs`** (2150 lines) -- Monolithic test file containing 22 inline test functions covering every hook event type. Uses `logResult()` to count pass/fail. Invoked as the primary CI entry point.
2. **`run-all-tests.cjs`** -- Suite runner that auto-discovers `suites/*.test.cjs` files, loads each module's exported `{ name, tests }` object, and executes them sequentially with `--filter`, `--verbose`, `--bail`, `--parallel`, and `--list` flags.

Both layers can run independently; `test-all-hooks.cjs` does NOT delegate to `run-all-tests.cjs`.

### Component Map

| Component             | Location                                    | Runner                  |
| --------------------- | ------------------------------------------- | ----------------------- |
| Main test runner      | `.claude/hooks/tests/test-all-hooks.cjs`    | Direct `node` execution |
| Suite runner          | `.claude/hooks/tests/run-all-tests.cjs`     | Direct `node` execution |
| Test suites (14)      | `.claude/hooks/tests/suites/*.test.cjs`     | `run-all-tests.cjs`     |
| Standalone tests (10) | `.claude/hooks/tests/test-*.cjs`            | Direct `node` execution |
| Lib unit tests        | `.claude/hooks/lib/__tests__/*.test.cjs`    | Direct `node` execution |
| Scout-block tests (7) | `.claude/hooks/scout-block/tests/test-*.js` | Direct `node` execution |

## Test Suites (14)

Suites export `module.exports = { name: string, tests: Array<{ name, fn, skip? }> }`.

| Suite                  | File                                            | What It Tests                           |
| ---------------------- | ----------------------------------------------- | --------------------------------------- |
| BA Refinement Context  | `suites/ba-refinement-context.test.cjs`         | BA team context injection on PBI writes |
| Bugfix Regression      | `suites/bugfix-regression.test.cjs`             | Regression tests for fixed bugs         |
| Code Patterns Injector | `suites/code-patterns-injector.test.cjs`        | Pattern injection logic                 |
| Context                | `suites/context.test.cjs`                       | Context injection tests                 |
| Init Reference Docs    | `suites/init-reference-docs.test.cjs`           | Doc initialization                      |
| Integration            | `suites/integration.test.cjs`                   | Cross-hook integration                  |
| Lifecycle              | `suites/lifecycle.test.cjs`                     | Session lifecycle events                |
| Notification           | `suites/notification.test.cjs`                  | Notification providers                  |
| Production Readiness   | `suites/production-readiness-protocol.test.cjs` | Quality gates                           |
| Quality Audit          | `suites/quality-audit.test.cjs`                 | Audit logic                             |
| Security               | `suites/security.test.cjs`                      | Security hooks                          |
| Swap Engine            | `suites/swap-engine.test.cjs`                   | Output compression                      |
| Workflow               | `suites/workflow.test.cjs`                      | Workflow routing/tracking               |

## Standalone Test Files (10)

Standalone files in `.claude/hooks/tests/` run directly with `node`. They use the `helpers/test-utils.cjs` `TestGroup`/`TestSuite` classes or inline test/assert patterns.

| File                            | What It Tests                                        |
| ------------------------------- | ---------------------------------------------------- |
| `test-ckignore.js`              | `.ckignore` pattern matching                         |
| `test-context-tracker.cjs`      | Context tracking state                               |
| `test-init-reference-docs.cjs`  | Reference doc initialization                         |
| `test-lib-modules.cjs`          | Lib modules (workflow-state, edit-state, todo-state) |
| `test-lib-modules-extended.cjs` | Extended lib module coverage                         |
| `test-modularization-hook.js`   | Modularization hook logic                            |
| `test-path-boundary-block.js`   | Path boundary blocking                               |
| `test-privacy-block.js`         | Privacy/secrets blocking                             |
| `test-scout-block.js`           | Scout-block entry point                              |
| `test-shared-utilities.cjs`     | Shared utils (debug-log, stdin-parser, hook-runner)  |
| `test-swap-engine.cjs`          | Swap engine compression                              |

## Running Tests

```bash
# Primary entry point (all hook tests)
node .claude/hooks/tests/test-all-hooks.cjs

# With flags
node .claude/hooks/tests/test-all-hooks.cjs --verbose --filter=session
node .claude/hooks/tests/test-all-hooks.cjs --validate-output --verify-state

# Run suites only (auto-discovers suites/*.test.cjs)
node .claude/hooks/tests/run-all-tests.cjs
node .claude/hooks/tests/run-all-tests.cjs --filter=security --verbose
node .claude/hooks/tests/run-all-tests.cjs --list          # list available suites
node .claude/hooks/tests/run-all-tests.cjs --bail           # stop on first failure
node .claude/hooks/tests/run-all-tests.cjs --parallel       # run suites in parallel

# Run a single suite
node .claude/hooks/tests/suites/workflow.test.cjs

# Run standalone tests
node .claude/hooks/tests/test-lib-modules.cjs --verbose
node .claude/hooks/tests/test-shared-utilities.cjs

# Run scout-block tests
node .claude/hooks/scout-block/tests/test-pattern-matcher.js

# Run lib unit tests
node .claude/hooks/lib/__tests__/ck-config-utils.test.cjs
```

### Exit Codes

| Code | Meaning                  |
| ---- | ------------------------ |
| 0    | All tests passed         |
| 1    | One or more tests failed |

### Filter Keywords (`test-all-hooks.cjs --filter=`)

`session`, `subagent`, `user`, `prompt`, `init`, `pre`, `tool`, `block`, `compact`, `post`, `notify`, `lib`, `dedup`, `edge`

## Test Helpers

### `helpers/test-utils.cjs` -- Primary Utility Library

Used by `test-all-hooks.cjs` and standalone `test-*.cjs` files.

**Assertions:** `assertEqual`, `assertDeepEqual`, `assertTrue`, `assertFalse`, `assertContains`, `assertNotContains`, `assertJsonValid`, `assertJsonHasKey`, `assertExitCode`, `assertMatches`, `assertGreaterThan`, `assertLessThan`

**Temp Directory:** `createTempDir()`, `cleanupTempDir(dir)`, `cleanupAllTestDirs()`

**File Operations:** `writeTestFile(dir, path, content)`, `readTestFile(dir, path)`, `fileExists(dir, path)`

**Hook Runner:** `runHook(hookFile, input, options)` -- spawns hook as child process, pipes JSON via stdin, returns `{ code, stdout, stderr, duration, killed }`

**Output Validation:** `parseBlockingDecision(stdout)`, `parseSubagentOutput(stdout)`, `containsSystemReminder(stdout)`, `containsMarkdownSection(stdout, title)`, `extractJsonFromOutput(stdout)`

**State Verification:** `verifyFileCreated(path)`, `verifyFileContent(path, checker)`, `verifyJsonFile(path, validator)`, `verifyJsonlFile(path, validator)`

**Fixtures:** `loadFixture(name)`, `setupFixtures(tempDir, fixturesMap)`

**Payload Builders:** `buildBashPayload(cmd, exitCode)`, `buildEditPayload(path, old, new)`, `buildReadPayload(path)`, `buildWritePayload(path, content)`, `buildTodoPayload(todos)`, `buildUserPromptPayload(prompt, sessionId)`, `buildSessionPayload(sessionId, cwd)`

**Test Runner Classes:** `TestGroup` (with `beforeEach`/`afterEach`), `TestSuite` (groups multiple `TestGroup`s)

### `lib/test-utils.cjs` -- Suite-Specific Mock Setup

Used by `suites/*.test.cjs` files.

**Mock Setup:** `setupMockConfig(tmpDir, config)`, `setupTodoState(tmpDir, state)`, `setupEditState(tmpDir, state)`, `setupCheckpoint(tmpDir, data)`, `setupAceLessons(tmpDir, lessons)`, `setupCkIgnore(tmpDir, patterns)`, `setupWorkflowState(tmpDir, state)`, `setupWorkflowConfig(tmpDir, config)`, `setupCompactMarker(tmpDir, sessionId, data)`, `setupCalibration(tmpDir, calibration)`, `setupMetrics(tmpDir, metrics)`, `setupClaudeEnvFile(tmpDir)`

**State Reading:** `readStateFile(tmpDir, name)`, `readCalibration(tmpDir)`, `readMetrics(tmpDir)`, `parseEnvFile(content)`

**Utilities:** `createMockFile(tmpDir, path, content)`, `fileExists(tmpDir, path)`, `createEnvSaver()`, `waitFor(condition, timeout, interval)`, `getHooksDir()`, `getTestsDir()`, `createTimestamp(hoursAgo)`, `createDaysAgoTimestamp(daysAgo)`

### `lib/assertions.cjs` -- Extended Assertion Library

Richer versions for suite tests: `assertEqual`, `assertDeepEqual`, `assertTrue`, `assertFalse`, `assertContains`, `assertNotContains`, `assertMatches`, `assertThrows`, `assertThrowsAsync`, `assertNullish`, `assertNotNullish`, `assertExitCode`, `assertBlocked` (exit 2), `assertAllowed` (exit 0)

### `lib/hook-runner.cjs` -- Hook Execution Harness

**Async:** `runHook(hookPath, input, options)` -- returns `{ code, stdout, stderr, timedOut }`
**Sync:** `runHookSync(hookPath, input, options)` -- returns `{ code, stdout, stderr }`
**Sequence:** `runHookSequence(hookPaths, input, options)` -- runs hooks in order, stops on block (exit 2)
**Parallel:** `runHooksParallel(hooks, options)` -- runs all hooks concurrently
**Path:** `getHookPath(hookName)` -- resolves absolute path to a hook
**Input Builders:** `createPreToolUseInput`, `createPostToolUseInput`, `createUserPromptInput`, `createSessionStartInput`, `createSubagentStartInput`, `createPreCompactInput`, `createSessionEndInput`

Default timeout: 10000ms per hook.

## Fixture Structure

All fixtures live in `.claude/hooks/tests/fixtures/`.

| File             | Purpose                                         |
| ---------------- | ----------------------------------------------- |
| `deltas.json`    | Mock code-pattern deltas with stats/candidates  |
| `workflows.json` | Mock workflow definitions with trigger patterns |
| `patterns.yaml`  | Mock pattern index/definitions (YAML)           |
| `.ckignore`      | Test `.ckignore` rules for ignore-pattern tests |

Test docs fixture: `.claude/hooks/tests/docs/project-config.json` -- empty-shell project config for doc initialization tests.

## How to Add New Tests

### Option A: Add a Suite (Recommended)

1. Create `.claude/hooks/tests/suites/<name>.test.cjs`
2. Import helpers from `../lib/hook-runner.cjs`, `../lib/assertions.cjs`, `../lib/test-utils.cjs`
3. Define test array with `{ name, fn }` objects (fn can be async)
4. Export `module.exports = { name: 'Suite Name', tests: [...] }`

```javascript
const { runHook, getHookPath, createPreToolUseInput } = require('../lib/hook-runner.cjs');
const { assertEqual, assertContains, assertAllowed } = require('../lib/assertions.cjs');
const { createTempDir, cleanupTempDir } = require('../lib/test-utils.cjs');

const HOOK = getHookPath('my-hook.cjs');

const tests = [
    {
        name: '[my-hook] does something',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Bash', { command: 'echo hi' });
                const result = await runHook(HOOK, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

module.exports = { name: 'My Hook Tests', tests };
```

The suite is auto-discovered by `run-all-tests.cjs` -- no registration needed.

### Option B: Add a Standalone Test File

1. Create `.claude/hooks/tests/test-<name>.cjs`
2. Import from `./helpers/test-utils.cjs`
3. Use `TestGroup`/`TestSuite` classes or inline `test()`/`assert()` pattern
4. Run directly with `node`

### Option C: Add to `test-all-hooks.cjs`

1. Add a new `async function testMyFeature()` function
2. Use `logResult(name, passed)`, `logSection(title)`, `logSubsection(title)`, `skipTest(name, reason)`
3. Add the call to the `runAllTests()` function with a filter guard

## Latest Test Stats

As of 2026-03-15 scan:

- **test-all-hooks.cjs:** 296 passed, 4 failed (22 test sections covering all hook event types)
- **Suites:** 14 suite files in `suites/`
- **Standalone:** 10+ test files in `tests/`
- **Scout-block:** 7 test files in `scout-block/tests/`
- **Lib unit tests:** 1 file (`ck-config-utils.test.cjs`)

## Naming Conventions

| Type             | Pattern                             | Example                                        |
| ---------------- | ----------------------------------- | ---------------------------------------------- |
| Suite file       | `suites/<topic>.test.cjs`           | `suites/workflow.test.cjs`                     |
| Standalone (CJS) | `test-<topic>.cjs`                  | `test-lib-modules.cjs`                         |
| Standalone (JS)  | `test-<topic>.js`                   | `test-privacy-block.js`                        |
| Scout-block test | `scout-block/tests/test-<topic>.js` | `test-pattern-matcher.js`                      |
| Lib unit test    | `lib/__tests__/<module>.test.cjs`   | `ck-config-utils.test.cjs`                     |
| Test name prefix | `[hook-name]` in suite test names   | `[ba-refinement-context] injects for Write...` |
