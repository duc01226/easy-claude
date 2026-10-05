# Integration Test Reference

<!-- Last scanned: 2026-10-03 -->
<!-- This file is referenced by Claude skills and agents for project-specific context. -->

## Quick Summary

**Goal:** Keep integration-test guidance aligned with the executable custom CJS harness, observable assertions, and repeatable local verification.

**Read when:** writing, repairing or reviewing tests that cross framework process, module or filesystem boundaries.

**Summary:**

- Select configured commands and exercise the real boundary; name the protected intent and assert its owned output or state.
- Isolate fixture projects and restore mutable state in `finally`; preserve the native test format.
- For code-changing work, finish implementation and static review before final-tree verification. Repeat persistent/shared-state suites according to the applicable policy.
- Keep reproducible reports, logs and captures under project-root `tmp/` or `temp/`.

## Workflow

1. Read `docs/project-config.json` (`testing.commands`) and select the configured command.
2. Build a lifecycle payload, execute the real hook, and assert the externally visible contract.
3. Clean up owned temp files/environment in `finally`; verify the settled tree after static review. Read `.claude/skills/shared/protocols/verify-last-order.md` when organizing code-changing work and `.claude/skills/shared/protocols/repeatable-test-principle.md` when persistent/shared state or async effects require repeat proof.

## Key Rules

- **MUST** assert meaningful outputs or state; a smoke-only “does not throw” check is insufficient.
- **MUST** name the guarded intent/invariant or technical contract and make input, action and owned observable outcome clear in the native test format. Given/When/Then is an option; read `.claude/skills/shared/protocols/test-architecture-execution-contract.md` when reviewing assertion quality.
- **MUST** use unique temp directories and deterministic cleanup for mutable tests.
- **MUST** keep every test portable: it runs green when `.claude/` is copied into any project layout on Windows, macOS and Linux — see [Portable Test Contract](#portable-test-contract).
- The suite runner executes sequentially and exposes no `--parallel` option; `runHooksParallel` creates explicit concurrent child-hook cases.

## Test Architecture

The project uses a dependency-free CommonJS harness (`package.json:1-24`; `docs/project-config.json`, `testing`). `.claude/hooks/tests/test-all-hooks.cjs` exercises hook behavior directly; `.claude/hooks/tests/run-all-tests.cjs` discovers suite files by the .test.cjs suffix and executes exported test objects (`.claude/hooks/tests/run-all-tests.cjs:100-110`, `.claude/hooks/tests/run-all-tests.cjs:298-325`).

Tooling and mirror tests use `node:test` under `.claude/scripts/tests/`, `.claude/scripts/codex/tests/`, and `.claude/scripts/opencode/tests/`. The hook aggregate discovers only its own `suites/`; it does not discover these tooling roots. Read `.claude/skills/sync-codex/scripts/run-codex-sync.mjs` when selecting their verification stages: it discovers test files itself, passes literal argv, serializes scripts-test files where the Node version supports the concurrency flag, and uses the same Node executable for that flag and child. Read `.claude/skills/sync-opencode/scripts/run-opencode-sync.mjs` when verifying an OpenCode surface; the Codex pipeline delegates to it only when `.opencode/` is present.

Integration is process/filesystem based: `runHook` spawns `node`, merges test environment overrides, writes JSON to stdin, captures stdout/stderr, and kills timed-out children (`.claude/hooks/tests/lib/hook-runner.cjs:37-119`). No container, web server, database, broker, or service startup is configured (`docs/project-config.json`, `databases`, `messaging`, `api`, `infrastructure`).

## Test Base Classes

There is no integration-test inheritance hierarchy. Suite files export `{ name, tests }`; each test is `{ name, fn, skip? }`, and the runner executes synchronous or async functions (`.claude/hooks/tests/run-all-tests.cjs:120-180`, `.claude/hooks/tests/suites/integration.test.cjs:72-77`). Both `runTest` and `TestGroup.run` await whatever `fn` returns, so a plain function returning a promise (`fn: () => withFixture(...)`) is settled before it counts as passed (`.claude/hooks/tests/suites/runner-await-contract.test.cjs`).

Standalone tests may use `TestGroup` and `TestSuite` from `.claude/hooks/tests/helpers/test-utils.cjs:355-444`. `TestGroup.afterEach` is skipped when a test throws because teardown is on the success path (`.claude/hooks/tests/helpers/test-utils.cjs:383-399`); use per-test `try/finally` for required cleanup.

## Fixtures & Factories

- `loadFixture` reads committed inputs from `.claude/hooks/tests/fixtures/`; `setupFixtures` materializes a fixture map beneath the test temp directory (`.claude/hooks/tests/helpers/test-utils.cjs:282-303`).
- `setupMockConfig`, state setup helpers, and `createMockFile` create isolated filesystem state rather than seeding a live datastore (`.claude/hooks/tests/lib/test-utils.cjs:29-115`).
- `.claude/hooks/lib/test-fixture-generator.cjs` derives sample paths from project config and exposes cache reset for test isolation (`.claude/hooks/lib/test-fixture-generator.cjs:3-10`, `.claude/hooks/lib/test-fixture-generator.cjs:200-205`).

## Test Helpers

Use `.claude/hooks/tests/lib/assertions.cjs:12-223` for equality, content/regex, throws, nullability, and hook exit-code assertions. `runHook`, `runHookSequence`, and `runHooksParallel` execute real hook boundaries (`.claude/hooks/tests/lib/hook-runner.cjs:37-206`). `runCodexLauncher(hookFile, stdin, { cwd, env, timeout })` runs a hook through the exact `node -e` command the generated `.codex/hooks.json` wires (where `require.main` is undefined) and returns `{ code, stdout, stderr, command }` without asserting, so a blocking gate's exit `2` stays assertable (`.claude/hooks/tests/lib/hook-runner.cjs:316-338`; `.claude/hooks/tests/suites/codex-launcher.test.cjs`).

```js
const results = await runHooksParallel(hooks, { cwd: tmpDir, timeout: SPAWN_TIMEOUT_MS });

for (const { result } of results) {
    assertAllowed(result.code, 'Parallel execution should not crash');
    assertFalse(result.timedOut, 'Should not timeout');
}
```

Source: `.claude/hooks/tests/suites/integration.test.cjs:55-64`. This is a concurrent readiness smoke check: exit/timeout assertions prove the children completed, not that every shared-state corruption invariant is protected. For a behavioral case, assert the state/output owned by the specific hook contract, as the launcher suite does (`.claude/hooks/tests/suites/codex-launcher.test.cjs`, `launcherTests`).

`waitFor(condition, timeout, interval)` returns `true` on success and `false` on timeout (`.claude/hooks/tests/lib/test-utils.cjs:199-207`). No suite call site is currently verified; if adopted, assert its returned boolean rather than treating elapsed time as success.

## Configuration

Canonical commands live in `docs/project-config.json` (`testing.commands`). There is no host `package.json` script — the framework is self-running by design. No `integrationTestVerify` override, database connection, or startup/system-check command is configured.

The suite runner sets `CLAUDE_PROJECT_DIR` before loading suites (`.claude/hooks/tests/run-all-tests.cjs:16-24`). Child-process helpers merge per-call `env`; parent-process mutations must use `createEnvSaver`/`setupClaudeEnvFile` and restore in `finally` (`.claude/hooks/tests/lib/test-utils.cjs:117-195`).

Targeted suites may require host executables. The shared test launcher at `.claude/hooks/tests/lib/python-command.cjs` probes `python3` then `python` on macOS/Linux and `python` then `py -3` on Windows. It verifies Python 3 and the caller's minor-version minimum (3.10 for graph tests), without requiring third-party packages during executable discovery. Count-drift, graph CLI/config/storage and Windows stdio suites use it; deterministic launcher cases live in `python-fallback.test.cjs`.

The catalog count suite prepares PyYAML before its bounded catalog operations; the stdio suite prepares it on the real host before simulating Windows. `preparePythonYaml` delegates missing-package recovery to `.claude/scripts/lib/python_dependencies.py`: a bounded interpreter-wide install, then a verified local target if needed. Each captured child receives the verified import location; a cached target therefore works without a manual `PYTHONPATH` export. Installed packages remain usable when automatic installation is disabled; exhausted recovery remains a test failure. Installer cases in `.claude/scripts/codex/tests/python-yaml-preflight.test.mjs` cover denial, timeout, unavailable pip, local reuse, opt-out and broken transitive imports; the hook aggregate does not discover that tooling suite.

Doc-sync tests probe/use Git in isolated temporary repositories (`.claude/hooks/tests/test-doc-sync-gate.cjs:69-82`). No real hardcoded test credential was verified; notification literals are synthetic enablement sentinels (`.claude/hooks/tests/suites/notification.test.cjs:137-175`).

## Service-Specific Setup

Traditional service-specific setup is **N/A** because the repository has no configured services or application infrastructure (`docs/project-config.json`, `databases`, `messaging`, `api`, `infrastructure`). Hook-specific setup belongs in focused temp-state helpers and lifecycle payload builders. Concurrent hook behavior is represented in `.claude/hooks/tests/suites/integration.test.cjs:41-69`.

## Test Data Patterns

Create one OS-temp directory per mutable test and remove it in `finally`. `createTempDir` uses `mkdtempSync`; `cleanupTempDir` checks a raw string prefix against the OS-temp path (`.claude/hooks/tests/lib/test-utils.cjs:15-27`). For canonical target containment, read `.claude/hooks/tests/lib/hook-runner.cjs` when using `removeTempDir`; the separate helper canonicalizes and checks a nonempty contained relative path. Representative suites follow `try/finally` cleanup (`.claude/hooks/tests/suites/integration.test.cjs:45-66`, `.claude/hooks/tests/suites/agent-files-gate.test.cjs:348-354`).

Use payload builders for valid lifecycle inputs and assert the observable contract. There is no production repository/database setup path (`docs/project-config.json`, `databases`, `messaging`, `api`, `infrastructure`); direct datastore writes remain unsupported unless a future idempotent, service-owned fixture seeder is verified.

## New Test Quickstart

1. Copy the structure of `.claude/hooks/tests/suites/integration.test.cjs` into a topic-named file beneath `.claude/hooks/tests/suites/`; the runner discovers the .test.cjs suffix automatically (`.claude/hooks/tests/run-all-tests.cjs:100-110`).
2. Import the real hook runner, payload builder, and focused assertion helpers.
3. Name tests with a behavioral bracket prefix such as `[concurrent]`; include the governing `TC-*` ID when a canonical spec supplies one (`.claude/hooks/tests/suites/integration.test.cjs:43`, `.claude/hooks/tests/suites/workflow.test.cjs:240-241`).
4. Name the guarded intent/invariant or technical contract, make input/action/outcome clear in the native format (Given/When/Then is valid), act through the boundary being tested, assert owned output/state, and clean up in `finally`.
5. At the final verify gate, run the affected configured suite after static review; a focused diagnostic run does not prove broader coverage. Apply the repeat policy below when state/isolation requires it.

## Portable Test Contract

Every suite under `.claude/` ships with the bundle: it must pass in an adopter project of any layout, on any developer machine, on Windows, macOS and Linux. A test leaning on its authoring repo or workstation passes here and fails — or reaches real endpoints — only at the consumer.

- **Own fixture project:** build config, docs and layout in a temp dir (`makeHookTreeProject`, `.claude/hooks/tests/lib/hook-runner.cjs:359`); never read this repo's `docs/`, specs, config or git state outside a guarded self-check. Guard a self-check truly about the authoring repo with `isFrameworkRepo`: a CJS suite (`*.test.cjs`) uses the synchronous `.claude/hooks/tests/lib/framework-repo-guard.cjs:53`, because its `skip:` is computed while the test list is built and an async guard there reports a false pass; an ESM suite (`*.mjs`) uses `.claude/scripts/codex/tests/framework-repo.helper.mjs:97`. Keep a tripwire proving the guard resolves active here — PORT-011 for the ESM helper, and the content-presence parity tripwire (`.claude/hooks/tests/suites/content-presence.test.cjs:2783-2840`) proving the CJS guard agrees with it.
- **Clean machine:** blank or delete every inherited feature switch and provider key (blank when an env file could refill it), and point `HOME`/`USERPROFILE` plus `TMPDIR`/`TEMP`/`TMP` at the temp dir — Node reads `TEMP` first on Windows and `TMPDIR` first on POSIX (`isolatedRouterEnv`, `.claude/hooks/tests/suites/notification.test.cjs:219-231`; `childEnv`, `.claude/hooks/tests/lib/hook-runner.cjs:340`).
- **Explicit OS behavior:** state Windows vs POSIX expectations for separators, case, symlink/junction (`EPERM` → logged skip only where the OS forbids it), executable lookup (`py -3` vs `python3`) and line endings; read `.claude/skills/shared/protocols/ai-mistake-prevention.md` when the test behavior differs by OS; its cross-platform contract owns those requirements.
- **Gate before commit:** `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --verify-only` (residue stage, root-literal via `TC-DOCROOT-038`, `PORT-*` suite) AND `node .claude/hooks/tests/run-all-tests.cjs` on a machine that has those switches set, proving the scrub — verify-only skips hook-behaviour suites (`.claude/skills/sync-codex/scripts/run-codex-sync.mjs:175-179`), so it cannot prove machine isolation.

## Running Tests

```powershell
# Canonical full verification (every suite)
node .claude/hooks/tests/run-all-tests.cjs

# Hook-only layer
node .claude/hooks/tests/test-all-hooks.cjs

# Suite-name substring filter; a zero-match filter exits non-zero
node .claude/hooks/tests/run-all-tests.cjs --filter=integration --verbose
```

The filter selects suite names and runs every test in each selected suite; a non-matching explicit filter in a nonempty discovered corpus exits `1` to prevent a vacuous green (`.claude/hooks/tests/run-all-tests.cjs:168-174,271-306`). An empty scaffold or `--list` is informational and may exit `0`; it proves no assertions ran. A complete, clean run exits `1` for a second, non-test reason: a post-summary count guard compares the tests it discovered against aggregate counts documented in `.claude/docs/hooks/README.md` and `.claude/docs/claude-ai-agent-framework-guide.md` and fails the process on drift, so the summary can read `All N tests passed` while the exit code is still `1` (`.claude/hooks/tests/run-all-tests.cjs:421-501`). It keys on the DISCOVERED total (passed + failed + skipped) rather than the pass count, because host-gated tests move the passed/skipped split per machine, and it stays silent under `--filter` or after any failure — neither total is the canonical figure. The runner exposes no parallel option and awaits selected suites sequentially (`.claude/hooks/tests/run-all-tests.cjs:66-95,309-318`).

**Verification order and repeatability:** code-changing work implements all phases and tests, completes static review, then verifies the final tree through the configured affected runner. Preserve the mutation, failure-adjudication and bounded re-review requirements in `verify-last-order`. No `integrationTestVerify.guidance` is configured here. For suites with persistent/shared state, or async effects that make one run insufficient, use two fresh green runs with the harness isolation policy; clean up only owned fixture state and never reset another run’s data (`.claude/skills/shared/protocols/integration-test-execution-discipline.md`; `.claude/skills/shared/protocols/repeatable-test-principle.md`). A mandatory second full run for every isolated case is not the local policy.

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

**IMPORTANT MUST ATTENTION Goal:** Keep integration-test guidance aligned with the executable custom CJS harness, observable assertions, and repeatable local verification.
**Workflow:** select commands → exercise the owned boundary → assert meaningful outcomes → restore owned state → static review and final-tree verification → apply evidence-triggered repeat policy → persist results.

- **MUST** use final-tree verification and the applicable repeat/isolation policy; preserve another run’s data.
- **MUST** verify example paths, declarations, and filters against current source.
- **NEVER** publish hardcoded test-file or pass totals; keep coverage queries executable.
- **MUST** keep tests portable — own temp fixture project, scrubbed env + HOME/TMPDIR/TEMP/TMP, explicit Windows/macOS/Linux behavior; pass `run-codex-sync.mjs --verify-only` plus the hooks suite (on a machine with those switches set) before commit.
