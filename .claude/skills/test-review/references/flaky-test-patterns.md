# Flaky test patterns

Read when `/test-review` (or a layer owner it calls) judges any test. A flaky test passes or fails without a code change, so it hides real regressions and teaches people to rerun until green. Every pattern below is a `FLAKY-RISK` finding whose fix removes the cause. It blocks in a new or changed test and in an unchanged test that is the only proof of a changed behavior; in any other pre-existing test it is an observation with an owner. Severity follows `SYNC:test-review-gate` item 9. A retry around an assertion, a skip, a widened timeout or a weakened assertion is never an accepted fix; it masks the cause and is itself a finding.

An intermittent failure already observed is investigated, not labelled: run `/investigate --mode=debug` and name the mechanism with a discriminator (`SYNC:environment-fault-hypothesis`). "Flaky" is a symptom, never a verdict.

| Pattern | How to detect it | Cause-level fix |
| --- | --- | --- |
| Fixed sleep used for readiness | A sleep or delay before an assertion or the next action | Wait on an observable signal with a bounded, diagnostic wait: a state change, an event, an idle marker, the runner's native wait. A labelled delay that models a real actor pause is not this pattern. |
| Wall clock, timezone or DST | The test reads the current time or date, or formats dates without a fixed zone | Inject or freeze the clock; set the timezone and locale in the test. |
| Unseeded randomness | Random values, generated IDs or shuffles feed an assertion | Seed or inject the generator; assert properties rather than exact random values. |
| Real network or external service | A unit or integration test reaches a host it does not own | Fake it at the boundary, or run the project's local service with a polled readiness check; an unavailable dependency is `ENVIRONMENT-BLOCKED`, never a pass. |
| Order dependence | The test passes only after another test, or fails when run alone or reordered | Make each test set up its own state; remove reliance on leftovers. |
| Shared mutable state | Module-level variables, singletons, caches or global configuration changed by tests | Reset or recreate per test; inject the dependency instead of mutating a global. |
| Parallel collisions | Fixed ports, file names, database rows, queue names or user IDs across tests | Generate unique, run-scoped identities; clean up only what the test created. |
| Unawaited asynchronous work | A promise, task or callback not awaited before the assertion or teardown | Await it; assert on its completion signal; fail on unhandled rejections. |
| Unordered comparison | Equality on a set, map, hash or a query result without an explicit order | Sort both sides or compare as sets; give queries an explicit order. |
| Unbounded wait or poll | A loop or wait with no timeout or no diagnostic on expiry | Bound it with a timeout that reports what never happened. |
| Environment dependence | Behavior varies with locale, environment variables, OS path separators, line endings or file permissions | Set what the test needs; use platform-neutral path and newline handling. |
| Resource leak between tests | Open handles, servers, timers or connections left by one test that affect another | Close everything the test opened in its teardown; let the runner fail on open handles where it can. |
| Volatile snapshot data | Timestamps, generated IDs or ordering inside a stored snapshot | Mask or fix volatile fields before comparison, or assert the meaningful fields only. |
| Retry around an assertion | A retry helper, a re-run flag or a loop that re-checks a failing assertion | Remove the retry; wait for the precondition in the arrange phase, then assert once. |
| Timing-sensitive assertion | An assertion on elapsed time or throughput in a functional test | Move timing to the performance layer with its budget; assert the functional outcome here. |
