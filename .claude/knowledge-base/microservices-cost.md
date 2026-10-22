---
id: microservices-cost
title: Microservices vs monolith — the measured cost of distribution
description: Use when choosing between a monolith and microservices, splitting a service out, or sizing and scaling services
kind: practice
review: unreviewed
reviewed: 2026-10-22
sources:
  - kind: research-report
    ref: Arjay McCandless, monolith vs HTTP/JSON vs gRPC microservices benchmark (Conduit RealWorld app, Go), via a community summary supplied by the framework maintainer
triggers:
  skills: [architecture, tech-stack-research]
  agents: [architect, solution-architect]
---

## Digest

- Default to a modular monolith with enforced internal module boundaries. Split a service out only for an evidenced need: organizational (independent team, release cadence, rollback or technology choice), measured load one component cannot meet inside the monolith, or availability and fault isolation. A speculative performance gain is not one.
- Distribution costs throughput and compute: every in-process call or JOIN that becomes a network call adds serialization, connection and scheduling work, multiplied along call chains. One benchmark (one web app in Go, one hardware setup) measured services serving about half the users with 2–3× the compute; a single study's result, not a constant.
- Scale a monolith horizontally before splitting it.
- A faster protocol or autoscaling shrinks or pays for the overhead; neither removes it.
- Decide from measurements: your workload against a latency and error target at equal budget.

## KB-MSC-1 Concerns to check

- Network hops per user request and the depth of service call chains.
- Data one service needs from another (former JOINs), and how often.
- Load per service: uneven demand strands capacity on equally sized hosts.
- Release coupling: a feature that needs several services changed and deployed together (a distributed monolith) loses monolith performance without gaining independence.
- Failure coupling: without fault tolerance, one core service's outage takes down its dependents.

## KB-MSC-2 Quality gate

- [ ] The split names the evidenced need it serves (organizational, measured load, or availability and fault isolation) and estimates its compute cost.
- [ ] A horizontally scaled monolith was considered first.
- [ ] Cross-service hops per request are counted and bounded; no N+1 cross-service calls.
- [ ] Each service builds, tests, deploys and rolls back on its own.
- [ ] Each service has defined behavior when a dependency it calls is down.
- [ ] Each service is sized from its measured load.
- [ ] Capacity claims come from a load test against the latency and error target.

## KB-MSC-3 Best practices

| Practice | Gain | Cost |
| --- | --- | --- |
| Batch cross-service lookups by ID list | No N+1 calls | — |
| Reuse connections; validate auth tokens locally | No per-request connection or auth call | — |
| Binary internal protocol (for example gRPC) | Less encoding CPU | Overhead remains (about 2× a monolith in the one benchmark cited; measure your own) |
| Size and replicate services by measured load | More capacity at the same budget | Per-service load measurement |
| Database per service | Independent tuning and storage scaling | — |
| Local copy or cache of another service's data | Fewer network calls | Sync, invalidation, eventual consistency |
| Asynchronous events for work needing no immediate answer | Lower response time | — |
