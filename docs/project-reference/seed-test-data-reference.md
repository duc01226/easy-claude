# Seed Test Data Reference

<!-- Last scanned: 2026-10-03 -->

Read this guide when arranging repeatable test fixtures or assessing seed-data capability. This repository has reusable hook-test fixture setup; application/database seeding remains not applicable. Keep generated sample paths separate from persisted data and clean up every mutable fixture through its owning helper.

## Seeder/Fixture Capability

`makeHookTreeProject(prefix)` creates a fresh, canonicalized OS-temp project containing the hook tree and shared script libraries. It excludes top-level hook tests, notifications and dependencies. Launcher tests then add the settings/configuration needed for their contract and run the real hook in that fixture (`.claude/hooks/tests/lib/hook-runner.cjs:359`; `.claude/hooks/tests/suites/codex-launcher.test.cjs:208`).

The helper is also used by workflow-route and judgement-route tests (`.claude/hooks/tests/suites/workflow-route-modes.test.cjs:56`; `.claude/hooks/tests/suites/judgement-integrity-route.test.cjs:240`). This is repeatable test-project setup, not an application startup seeder.

`generateTestFixtures()` produces cached synthetic module names and path strings from project configuration, with portable fallback values. It does not create files or insert records. `clearFixtureCache()` resets its process-local cache when a test changes configuration (`.claude/hooks/lib/test-fixture-generator.cjs:83`; `.claude/hooks/lib/test-fixture-generator.cjs:203`).

## Safety & Scope

Application stores, database transactions, tenant seed scope, DI lifetimes and cross-service seed waits are not configured in `docs/project-config.json`. Do not derive those conventions from generic framework examples or sample path strings.

A fixture root selects which hook tree and project settings execute; use an explicit test cwd and per-call environment overrides. `childEnv` removes case-equivalent inherited keys on Windows before applying overrides, while fixture project resolution keeps execution from falling back to the host repository (`.claude/hooks/tests/lib/hook-runner.cjs:23`; `.claude/hooks/tests/lib/hook-runner.cjs:340`).

Read `docs/project-reference/integration-test-reference.md` when designing fixture environment isolation; its Portable Test Contract owns home-directory, provider-key and feature-switch scrubbing requirements. Default-root example; `docsRoots.projectReference.path` in `docs/project-config.json` overrides this location.

## Repeatability & Cleanup

Create a fresh root for each mutable fixture. The copied-tree helper is not an idempotent updater for an existing directory. Callers remove it in `finally`, including when a hook invocation or assertion fails (`.claude/hooks/tests/suites/judgement-integrity-route.test.cjs:240`).

`removeTempDir` canonicalizes both target and OS-temp root, checks a nonempty contained relative path, and refuses removal outside that boundary. The separate `test-utils.cleanupTempDir` uses a string-prefix check; do not assume it has the same canonical containment guarantee (`.claude/hooks/tests/lib/hook-runner.cjs:372`; `.claude/hooks/tests/lib/test-utils.cjs:23`).

## Data Ownership & Persistence

Fixture files belong to the test that creates them. Shared helpers supply setup/cleanup; no persistent project/demo data loader, database migration seeder or runtime seeder registration is established by this scope. Configuration-derived sample values belong to the fixture generator's process cache, not a data store.

Read `.claude/hooks/tests/lib/hook-runner.cjs` when preparing a copied hook project and tracing its cwd/environment behavior. Read `.claude/hooks/lib/test-fixture-generator.cjs` when interpreting generated path/name samples or resetting that cache.

## Closing Reminders

Verify the actual fixture/loader entry point and its callers before documenting a convention. Preserve fixture environment isolation and finally cleanup. Re-run `scan --target=seed-test-data` when a real application seeder or a new reusable data-loading owner is introduced; no base class, DI scope or database pattern is implied by the target name.
