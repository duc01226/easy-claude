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

## RVP Native Supporting Assertion Relation

For `docs/specs/WorkflowExecution/README.ReviewPreparation.md` only, the native `node:test` relation permits one executor to support several existing owner-qualified cases, as allowed by `.claude/skills/shared/tc-format.md` under “TC ↔ Test Code Cardinality”. The canonical owner, existing case identities and Section 8 fields retain their strict-default representation; this declaration selects only the local execution relation. It creates no `specArtifacts` profile, alias bridge, duplicate business case or second case registry. Other capabilities retain their declared/default relation. Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location.

The first `TC-RVP-*` identity in a registered executor’s exact title is its single primary case. Further identities in that title are hints, not primary cases or evidence of an alias. An executor with no TC in its title has no declared primary business case; its inspected assertions may support existing owner-qualified cases through `CoveredBy`, without inventing an annotation or case. Supporting cases are declared by that case’s existing `CoveredBy` field, which names the actual test file and exact executor title. Resolve that field in the context of its canonical owner and case heading; a title search alone cannot recover the supporting relation.

For every primary or supporting claim, the run’s disposable assertion ledger under `tmp/reports/` records canonical owner path, case ID, any existing input/variant identity, test file, exact registered executor title, inspected assertion spans (`file:line` or ranges), and actual selected-runner result with log/artifact location. Inspect those assertions against the case’s preconditions, action and owned outcome. One executor may support multiple cases only when the ledger identifies the assertions that guard each claimed case; a supporting claim need not receive a duplicate executor. The authoritative join is the union of primary title identities and inspected supporting `CoveredBy` relations, with this evidence tuple preserved for each claimed result.

An authored join without an observed runner result is `mapped/unverified`; record the result as `UNVERIFIED` and retain Planned status. Failed, skipped, untriggered or unresolved assertion rows remain explicit and cannot be promoted by an aggregate pass. An actual result for a shared executor establishes only the case/variant rows whose assertions were inspected and shown to execute. The ledger describes execution evidence and never becomes another business-case owner.

For example, TC-RVP-072’s supporting `CoveredBy` link to `.claude/scripts/tests/review-rule-policy.test.cjs::TC-RVP-003 overlapping groups retain all standards and deterministic declaration ties` resolves to the registered executor and its assignment assertions. Preserve its first-title primary TC-RVP-003 and separately record TC-RVP-072 with the canonical owner, exact title, inspected assertion span and observed result; the string match alone establishes no passing coverage.

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

Targeted suites may require host executables: count-drift resolves `python` then Windows `py -3` (`.claude/hooks/tests/suites/count-drift.test.cjs:39-63`), and doc-sync tests probe/use Git in isolated temporary repositories (`.claude/hooks/tests/test-doc-sync-gate.cjs:69-82`). No real hardcoded test credential was verified; notification literals are synthetic enablement sentinels (`.claude/hooks/tests/suites/notification.test.cjs:137-175`).

## Service-Specific Setup

Traditional service-specific setup is **N/A** because the repository has no configured services or application infrastructure (`docs/project-config.json`, `databases`, `messaging`, `api`, `infrastructure`). Hook-specific setup belongs in focused temp-state helpers and lifecycle payload builders. Concurrent hook behavior is represented in `.claude/hooks/tests/suites/integration.test.cjs:41-69`.

## Test Data Patterns

Create one OS-temp directory per mutable test and remove it in `finally`. `createTempDir` uses `mkdtempSync`; `cleanupTempDir` checks a raw string prefix against the OS-temp path (`.claude/hooks/tests/lib/test-utils.cjs:15-27`). For canonical target containment, read `.claude/hooks/tests/lib/hook-runner.cjs` when using `removeTempDir`; the separate helper canonicalizes and checks a nonempty contained relative path. Representative suites follow `try/finally` cleanup (`.claude/hooks/tests/suites/integration.test.cjs:45-66`, `.claude/hooks/tests/suites/agent-files-gate.test.cjs:348-354`).

Use payload builders for valid lifecycle inputs and assert the observable contract. There is no production repository/database setup path (`docs/project-config.json`, `databases`, `messaging`, `api`, `infrastructure`); direct datastore writes remain unsupported unless a future idempotent, service-owned fixture seeder is verified.

For portable review preparation, read `.claude/scripts/tests/review-portability.test.cjs` when building a clean adopter CLI fixture: it copies the shipped payload into bare and typical projects, denies acquisition/execution/network, empties PATH, invokes the copied CLI with `process.execPath`, checks complete rule artifacts and replay/drift, and asserts adopter dependencies and isolated machine files remain unchanged. Read `.claude/scripts/tests/review-target-fixture.cjs` when substituting opaque Git output: its private Module instance changes only that owner’s dependencies, not global loader state. Synthetic binary headers and injected download/version seams in `.claude/scripts/tests/review-tool-process.test.cjs` prove their stated parsing, publication and ownership contracts; they do not prove native Windows/Linux execution or an AI review verdict.

Read `.claude/scripts/tests/review-setup.test.cjs` when testing adoption saves: isolated absent/minimum/rule-only configs exercise accepted enablement, preserved settings/rules/groups, quiet Off/re-enable, consent-source drift and unsafe/unwritable refusal before publication and truthful unconfirmed outcomes after publication. Its copied generated-path helper case checks canonical loader relocation through literal child-process arguments; private Module/fs seams cover deterministic refusal without changing the global loader. Refusal before publication must preserve destination bytes/existence; publication followed by confirmation failure must report `config-publication-unverified`, may have changed the preference, and must not be labelled saved or unchanged. The caller re-inspects settings and discards its earlier target/policy capture before ordinary-review fallback, without rollback over another owner’s settings. The fixture scrubs inherited feature/provider variables and redirects home/temp paths, restoring environment in `finally` (`.claude/scripts/tests/review-setup.test.cjs:16-48`). These assertions cover project preference and capture boundaries; native host questions and actual OCR acquisition/execution require separate evidence. Read `.claude/skills/shared/review-preparation.md` when mapping durable preference and invocation-only Skip to parent/child/recheck behavior.

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

For tooling and mirror verification, run `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --verify-only`. This is read-only and includes the tooling test stages; it verifies only selected hook integrity suites, so it supplements the full hook command. A focused diagnostic can run an actual `node:test` file with literal argv, for example `node --test .claude/scripts/tests/review-preparation.test.cjs`; it proves only that file. Do not run custom hook suites through `node --test`.

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
