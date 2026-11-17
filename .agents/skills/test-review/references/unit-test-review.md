# Unit test review — eight gates

Read when `$test-review` judges the unit layer of a change. Judge each gate `PASS`, `FAIL`, `N/A` or `NOT VERIFIABLE` per covering test, with `file:line` evidence. The cross-layer bar of `SYNC:test-review-gate` applies first; these gates add what is specific to unit tests. Use the project's test framework, naming and file layout; nothing here requires a particular library.

## U1 — Assertion value

- Name the break (mutant) the test must catch: an inverted condition, an off-by-one, a dropped error branch, a wrong constant. If the test would still pass, it is `WEAK-TEST`.
- Flag assertions that only check non-null, a type, a truthy value, a call count with no argument check, or the input echoed back.
- Snapshot assertions count only when the snapshot is small, reviewed and free of volatile values; an accepted-without-reading snapshot is not an assertion.

## U2 — Owned outcome and seams

- Assert the unit's own outcome: its return value, its resulting state or the event it emits.
- Replace only collaborators at the unit's boundary (I/O, clock, randomness, network, another module's port). Mocking the unit's own internals makes the test mirror the implementation.
- An interaction-only assertion (a mock was called) is valid only when the interaction is the contract — for example, a port the unit must call with given arguments.

## U3 — Determinism

- Time comes from an injected or frozen clock; timezone and locale are set by the test when they matter.
- Randomness is seeded or injected; generated IDs are controlled when asserted.
- No real network, database, file system or subprocess: a unit test that needs them belongs to the integration layer.
- Asynchronous work is awaited; timers are faked or driven, never waited on with a real sleep.

## U4 — Isolation

- No mutable module state, singleton or global shared between tests; setup happens per test or is immutable.
- Spies, stubs, environment variables and patched globals are restored after each test.
- The test passes alone, in any order and under the runner's parallel mode; temporary paths and ports are unique per test.

## U5 — Case completeness

- Happy path, every error path the unit can take, empty/null/one/many inputs, and boundaries (minimum, maximum, just outside each limit).
- Each [HARD] rule the unit enforces is tested as a property — table-driven or property-based over its input domain — with a boundary counter-case that must be rejected.
- A bug fix adds a regression case that fails without the fix.

## U6 — Intent named

- The test name states behavior, condition and expected outcome; one behavior per test.
- When a spec governs the behavior, the test carries the project's case identity (for example a TC ID) so the case-to-test join resolves to this assertion.

## U7 — Maintainability and speed

- Setup reuses the project's builders, factories and fixtures; no copied setup blocks across files.
- No loop or branch that can skip an assertion; no commented-out test; no skipped test without a named owner and reason.
- A unit test runs in milliseconds; a slow one usually hides I/O and belongs to another layer.

## U8 — Change coverage

- Every changed branch, error path and boundary of the unit has a case, or the coverage matrix names the cheaper or more fitting layer that owns it.
- Removed behavior has its tests removed or changed with it; a test still asserting removed behavior is `TEST-WRONG`.

## Verdict

The unit layer passes when every covering unit test passes U1–U8 and every changed unit behavior has a case. Report each failed gate as a finding with the break or cause it names; route a finding that reveals a production defect to `$investigate --mode=debug`.
