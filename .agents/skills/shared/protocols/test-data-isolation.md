> **Test Data Isolation** — Tests MUST remain independent across the concurrency modes the project supports. Stateful suites should not depend on test order or mutate data another test/run owns.
>
> 1. **Use the isolation boundary the harness supports:** transactions, per-test databases/schemas, namespaces, fixtures, or unique data as appropriate. Unique IDs are essential when tests share a namespace; stable IDs are fine inside isolated disposable fixtures.
> 2. **Isolate mutable state when tests can observe or alter it concurrently.** Shared mutable state is safe only when the runner/project provides an explicit isolation guarantee; immutable reference data may be shared.
> 3. **Account for cross-cutting consumers when they are relevant:** a bulk rebuild, recompute, or cascade can rewrite descendants of a shared parent; inspect that path if another test/run's work could affect the assertion.
> 4. **On an intermittent contradiction, test contamination as a competing cause.** Trace the path first, then inspect other writers/consumers of shared state before attributing the wrong outcome to product code.
> 5. **Prove the relevant isolation claim with a scoped search.** Inspect other tests and consumers that can touch the shared data in question; do not demand a repository-wide search when the test owns an isolated store/transaction.
