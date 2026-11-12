## Full Test Coverage Goal

Every feature, bug fix, refactor or other code change aims for 100% test coverage of the behavior it adds, changes or restructures, at every test layer the project applies (`APPLICABLE` or `N/A — <evidence>`, `SYNC:test-architecture-execution-contract`):

- **Unit** — every changed unit of logic: each branch, error path, edge and boundary case.
- **Integration** — every changed boundary, contract, use case and data-state outcome, through the project's integration harness.
- **E2E** — every changed user journey, through the project's E2E runner.
- **Specs** — every user story and every acceptance criterion of the governing spec (or of the task when no spec governs it) maps to at least one test case and an executing test that asserts its outcome; one without is a TEST-GAP. The change covers the stories and criteria it adds or touches; name any other uncovered one of that spec with an owner, so the spec still reaches 100%, instead of widening the change. A bug fix adds a regression test that fails without the fix.

Plan the tests per layer and per story and criterion before building; report coverage the same way with the work evidence. A test counts only when it asserts an owned outcome and fails when the protected intent breaks; never pad coverage with assertion-free or duplicate tests. Line and branch reports find untested code but stay diagnostics, never pass/fail gates. Name every gap left below 100% with its reason and owner; never accept one silently.
