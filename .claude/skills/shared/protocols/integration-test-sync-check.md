> **Integration Test Sync Check** — Verify changed business logic files have corresponding tests.
>
> 1. From changed files → identify **business logic files**: handlers, commands, queries, services, controllers, resolvers, event processors. Naming varies by stack — infer from project conventions (e.g., `*Service.*`, `*Handler.*`, `*Controller.*`, `*Command.*`, `*Query.*`, `*Resolver.*`). Exclude migration files: schema/data migrations are one-time execution paths, not core application logic.
> 2. For each identified file → search for a corresponding test file. Infer test naming from existing tests in the project (e.g., `*.test.ts`, `*Tests.java`, `*_test.py`, `*.spec.js`, `*Tests.cs`). Check standard test directories (`tests/`, `spec/`, `__tests__/`, or adjacent test projects/packages).
> 3. If test EXISTS → check if test methods cover changed behavior (new methods/parameters/logic paths)
> 4. If test MISSING → **MANDATORY**: use `AskUserQuestion`: "Business logic file `{file}` has no integration tests — run `/integration-test` before proceeding, or confirm tests already written?" Options: "Run `/integration-test` first" (Recommended) | "Tests already written/updated — proceed"
> 5. Severity: **HIGH** — missing tests for changed business logic MUST be surfaced to the user; do NOT silently flag and continue
>
> **Surface every business-logic change that lacks test coverage for an explicit `AskUserQuestion` decision — never silently skip. — why: a silent skip ships untested business logic to production.**
