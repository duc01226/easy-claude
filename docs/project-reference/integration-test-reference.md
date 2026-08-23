# Integration Test Reference

<!-- Last scanned: 2026-08-04 -->
<!-- This file is referenced by Claude skills and agents for project-specific context. -->

> **Goal:** Keep integration-test guidance aligned with the executable custom CJS harness, observable assertions, and repeatable local verification.

## Quick Summary

- Run real hook entry points as Node child processes with JSON stdin; assert exit code, stdout/stderr, and state.
- Isolate mutable state in unique OS-temp directories and restore environment changes in `finally`.
- Run the canonical suite twice consecutively without resetting state before claiming repeatability.

## Workflow

1. Read `docs/project-config.json:120-130` and select the configured command.
2. Build a lifecycle payload, execute the real hook, and assert the externally visible contract.
3. Clean up temp files/environment in `finally`, then run the full command twice without an intervening reset.

## Key Rules

- **MUST** assert meaningful outputs or state; a smoke-only “does not throw” check is insufficient.
- **MUST** use unique temp directories and deterministic cleanup for mutable tests.
- **NEVER** recommend `--parallel` for suite-level concurrency while the runner still executes suites sequentially.

## Test Architecture

The project uses a dependency-free CommonJS harness (`package.json:3-11`, `docs/project-config.json:120-130`). `.claude/hooks/tests/test-all-hooks.cjs` exercises hook behavior directly; `.claude/hooks/tests/run-all-tests.cjs` discovers suite files by the .test.cjs suffix and executes exported test objects (`.claude/hooks/tests/run-all-tests.cjs:87-99`, `.claude/hooks/tests/run-all-tests.cjs:298-325`).

Integration is process/filesystem based: `runHook` spawns `node`, merges test environment overrides, writes JSON to stdin, captures stdout/stderr, and kills timed-out children (`.claude/hooks/tests/lib/hook-runner.cjs:22-83`). No container, web server, database, broker, or service startup is configured (`docs/project-config.json:120-152`).

## Test Base Classes

There is no integration-test inheritance hierarchy. Suite files export `{ name, tests }`; each test is `{ name, fn, skip? }`, and the runner executes synchronous or async functions (`.claude/hooks/tests/run-all-tests.cjs:108-164`, `.claude/hooks/tests/suites/integration.test.cjs:137-144`).

Standalone tests may use `TestGroup` and `TestSuite` from `.claude/hooks/tests/helpers/test-utils.cjs:361-444`. `TestGroup.afterEach` is skipped when a test throws because teardown is on the success path (`.claude/hooks/tests/helpers/test-utils.cjs:383-399`); use per-test `try/finally` for required cleanup.

## Fixtures & Factories

- `loadFixture` reads committed inputs from `.claude/hooks/tests/fixtures/`; `setupFixtures` materializes a fixture map beneath the test temp directory (`.claude/hooks/tests/helpers/test-utils.cjs:284-303`).
- `setupMockConfig`, state setup helpers, and `createMockFile` create isolated filesystem state rather than seeding a live datastore (`.claude/hooks/tests/lib/test-utils.cjs:29-115`).
- `.claude/hooks/lib/test-fixture-generator.cjs` derives sample paths from project config and exposes cache reset for test isolation (`.claude/hooks/lib/test-fixture-generator.cjs:3-10`, `.claude/hooks/lib/test-fixture-generator.cjs:200-205`).

## Test Helpers

Use `.claude/hooks/tests/lib/assertions.cjs:12-223` for equality, content/regex, throws, nullability, and hook exit-code assertions. `runHook`, `runHookSequence`, and `runHooksParallel` execute real hook boundaries (`.claude/hooks/tests/lib/hook-runner.cjs:22-155`).

```js
const input = createPreToolUseInput('Read', { file_path: '.env' });
const results = await runHookSequence([PRIVACY_BLOCK, SCOUT_BLOCK], input);

assertEqual(results.length, 1, 'Sequence should stop at first block');
assertBlocked(results[0].result.code, 'Privacy block should block .env');
```

Source: `.claude/hooks/tests/suites/integration.test.cjs:66-76`.

`waitFor(condition, timeout, interval)` returns `true` on success and `false` on timeout (`.claude/hooks/tests/lib/test-utils.cjs:227-235`). No suite call site is currently verified; if adopted, assert its returned boolean rather than treating elapsed time as success.

## Configuration

Canonical commands live in `docs/project-config.json:120-130` and `package.json:43-45`. No `integrationTestVerify` override, database connection, or startup/system-check command is configured.

The suite runner sets `CLAUDE_PROJECT_DIR` before loading suites (`.claude/hooks/tests/run-all-tests.cjs:16-24`). Child-process helpers merge per-call `env`; parent-process mutations must use `createEnvSaver`/`setupClaudeEnvFile` and restore in `finally` (`.claude/hooks/tests/lib/test-utils.cjs:141-195`).

Targeted suites may require host executables: count-drift resolves `python` then Windows `py -3` (`.claude/hooks/tests/suites/count-drift.test.cjs:24-59`), and doc-sync tests probe/use Git in isolated temporary repositories (`.claude/hooks/tests/test-doc-sync-gate.cjs:65-76`). No real hardcoded test credential was verified; notification literals are synthetic enablement sentinels (`.claude/hooks/tests/suites/notification.test.cjs:140-154`).

## Service-Specific Setup

Traditional service-specific setup is **N/A** because the repository has no configured services or application infrastructure (`docs/project-config.json:23-73`, `docs/project-config.json:149-152`). Hook-specific setup belongs in focused temp-state helpers and lifecycle payload builders. Security composition and concurrent hook behavior are represented in `.claude/hooks/tests/suites/integration.test.cjs:47-132`.

## Test Data Patterns

Create one OS-temp directory per mutable test and remove it in `finally`. `createTempDir` uses `mkdtempSync`; cleanup refuses paths outside the OS temp root (`.claude/hooks/tests/lib/test-utils.cjs:15-27`). Representative integration/security tests follow `try/finally` cleanup (`.claude/hooks/tests/suites/integration.test.cjs:86-108`, `.claude/hooks/tests/suites/security.test.cjs:161-170`).

Use payload builders for valid lifecycle inputs and assert the observable contract. There is no production repository/database setup path (`docs/project-config.json:149-152`); direct datastore writes remain unsupported unless a future idempotent, service-owned fixture seeder is verified.

## New Test Quickstart

1. Copy the structure of `.claude/hooks/tests/suites/integration.test.cjs` into a topic-named file beneath `.claude/hooks/tests/suites/`; the runner discovers the .test.cjs suffix automatically (`.claude/hooks/tests/run-all-tests.cjs:87-99`).
2. Import the real hook runner, payload builder, and focused assertion helpers.
3. Name tests with a behavioral bracket prefix such as `[security-chain]`; include the governing `TC-*` ID when a canonical spec supplies one (`.claude/hooks/tests/suites/integration.test.cjs:47-77`, `.claude/hooks/tests/suites/workflow.test.cjs:197-198`).
4. Arrange isolated input, act through the real process boundary, assert specific output/state, and clean up in `finally`.
5. Run a matching suite filter, then the full repeatability gate.

## Running Tests

```powershell
# Canonical full verification
npm test

# Configured layers
npm run test:hooks
npm run test:suites

# Suite-name substring filter; a zero-match filter exits non-zero
node .claude/hooks/tests/run-all-tests.cjs --filter=security --verbose
```

The filter selects suite names and runs every test in each selected suite; a non-matching explicit filter exits `1` to prevent a vacuous green (`.claude/hooks/tests/run-all-tests.cjs:158-164`, `.claude/hooks/tests/run-all-tests.cjs:275-286`). A complete, clean run exits `1` for a second, non-test reason: a post-summary count guard compares the tests it discovered against the aggregate count documented in `.claude/docs/hooks/README.md` and fails the process on drift, so the summary can read `All N tests passed` while the exit code is still `1` (`.claude/hooks/tests/run-all-tests.cjs:333-400`). It keys on the DISCOVERED total (passed + failed + skipped) rather than the pass count, because host-gated tests move the passed/skipped split per machine, and it stays silent under `--filter` or after any failure — neither total is the canonical figure. Although `--parallel` is parsed and advertised, the runner currently awaits suites in a sequential loop (`.claude/hooks/tests/run-all-tests.cjs:51-75`, `.claude/hooks/tests/run-all-tests.cjs:295-304`).

**Repeatability gate:** run `npm test`, then run `npm test` again without deleting temp/global state or resetting the repository. Both consecutive runs **MUST** pass.

Use live expressions instead of hardcoded coverage totals:

```powershell
# Suite surface
rg --files .claude/hooks/tests/suites | rg '\.test\.cjs$'

# Standalone surface
rg --files .claude/hooks/tests | rg '(^|[\\/])test-[^\\/]+\.(cjs|js)$'

# Spec-linked tests
rg -n 'TC-[A-Z0-9-]+-[0-9]+' .claude/hooks/tests -g '*.cjs' -g '*.js'
```

## Closing Reminders

- **MUST** run the complete integration command twice consecutively without reset.
- **MUST** verify example paths, declarations, and filters against current source.
- **NEVER** publish hardcoded test-file or pass totals; keep coverage queries executable.

> **Goal:** Keep integration-test guidance aligned with the executable custom CJS harness, observable assertions, and repeatable local verification.
