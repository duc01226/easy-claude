---
id: test-review-gate
kind: notice
title: Every review now runs the new test-review skill, and pull requests record Test review and Spec sync lines
added: 2026-11-17
covers:
  - skills@621411d84eb3
  - workflow:workflow-review-changes@e6ebd08fbc9e
---

A new skill, `/test-review`, reviews the tests of a change: it maps every changed behavior to its tests at
each test layer the project uses (unit, integration, E2E, performance, seed data), judges whether those tests
would fail when the behavior breaks, flags flaky patterns (fixed sleeps, real time, randomness, order
dependence, retries around assertions) and checks that the spec, the tests and the code still agree. Unit
tests are judged by the skill itself; the other layers go to their owners' review modes, including the new
static `/e2e-test --mode=review`.

`/changes-review` calls it on every pass, `/workflow-review-changes` runs it as its tests gate (step
`tests-review`, in place of the integration-test review step, which it now calls), and `/pull-request` writes
its `Test review:` and `Spec sync:` lines into the pull-request body. A review of a change with nothing
testable records `N/A` and costs one short pass.

Nothing to run. Tell the user that reviews now include a test review, that pull requests carry the two new
lines, and that a project with its own test conventions can add them on top with
`/project-skill-protocol add` targeting `test-review`.
