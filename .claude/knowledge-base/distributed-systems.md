---
id: distributed-systems
title: Distributed systems — failure modes and quality gate
description: Use when designing, building or reviewing anything that calls another service, retries, queues messages, replicates data or spans a workflow across services
kind: practice
review: unreviewed
reviewed: 2026-10-22
sources:
  - kind: team-decision
    ref: Distributed-systems knowledge and quality gate supplied by the framework maintainer (2026-10-22)
triggers:
  skills: [architecture, production-readiness-review]
  agents: [architect, backend-developer]
---

## Digest

- A timeout is an unknown outcome, not a failure: the request may never have arrived, may have succeeded with its response lost, or may still be running.
- Failure is partial: some components fail while others run, and each failure needs defined behavior.
- There is no reliable global clock: timestamps from different servers do not order events.
- Replicas disagree: decide where stale data is unacceptable.
- No transaction spans services: undoing a completed step is a separate business event that can be delayed or fail.
- Messages arrive duplicated, delayed or reordered; broker exactly-once delivery is not an exactly-once business effect.
- Retries can turn a slowdown into a cascading outage.
- Every guarantee costs latency, sync work or traceability; choose by business risk. Distribution must earn its cost against a modular monolith.

## KB-DIST-1 Concerns and risks

| Concern | Risk if unhandled |
| --- | --- |
| Ambiguous timeouts | Double charges, duplicate writes |
| Partial failure | Cascading failures; work stuck in an undefined state |
| Clock skew, event ordering | Wrong "latest" value, lost updates |
| Replica lag, stale reads | Wrong balance or limit checks |
| Cross-service workflows | Money taken but no order; stock reserved but unpaid |
| Duplicate or out-of-order messages | Corrupted state, invalid state transitions |
| Retry storms | Overloaded dependencies, system-wide outage |
| Poor observability | A lost, slow and succeeded request look the same |

## KB-DIST-3 Quality gate: calls and retries

- [ ] Every remote call has a bounded wait.
- [ ] Retries are bounded and cannot amplify load into an outage.
- [ ] A retried operation never applies its effect twice.
- [ ] An unknown outcome is an explicit state (for example `PAYMENT_PENDING`) with a defined way to resolve it.

## KB-DIST-4 Quality gate: failure handling

- [ ] Each dependency's down-behavior is defined: fail fast, degrade or defer.
- [ ] A failing dependency cannot exhaust the caller or spread its failure.
- [ ] In-flight work resolves correctly when a dependency recovers.

## KB-DIST-5 Quality gate: data and consistency

- [ ] Each data type or operation documents its required consistency.
- [ ] Critical decisions (money, limits, inventory) never act on stale data.
- [ ] No correctness logic compares wall-clock timestamps across servers.

## KB-DIST-6 Quality gate: workflows and messaging

- [ ] Every multi-service workflow defines how each completed step is undone when a later step fails; a failed undo is never silent.
- [ ] Duplicate, delayed or out-of-order messages never corrupt state or repeat an effect.
- [ ] Every state transition is valid from the current state.

## KB-DIST-7 Quality gate: observability

- [ ] Any request can be followed across calls, queues and workers.
- [ ] Latency, error rate, queue lag and in-flight work are measured.
- [ ] Anomalies surface before users are widely affected.

## KB-DIST-8 Quality gate: architecture justification

- [ ] Distribution's benefits (scaling, team independence, geographic reach, fault isolation) are shown to outweigh its cost against a modular monolith.
