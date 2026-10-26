---
id: incremental-scaling
title: Scaling a system step by step — fix the measured bottleneck
description: Use when planning how a system grows under load — vertical vs horizontal scaling, stateless tiers, replicas, caching, queues, splitting services or scaling database writes
kind: practice
review: unreviewed
reviewed: 2026-10-26
sources:
  - kind: file
    ref: "Pasted post 'When Backend Load Grows: How to Decompose and Scale a System from 1 to 10 Million Users' (Architecture Corner), summarizing AWS re:Invent 2019 ARC211-R by Brian Farnhill and Hong Pham"
triggers:
  prompt: [scale out, scale up, horizontal scaling, vertical scaling, read replica, database sharding, scalable system, scaling roadmap]
  skills: [architecture, performance-review, production-readiness-review]
  agents: [solution-architect, performance-optimizer]
---

## Digest

- Measure the real bottleneck and fix that choke point. Stay simple and flexible early; decompose only when metrics call for it, never every technique at once.
- Order, cheapest first: scale up → redundancy → stateless tier behind a load balancer → offload static files and reads → autoscaling with telemetry → queues and services → database write scaling.
- Scaling out needs stateless instances; sessions go to a shared external store.
- Every read offload trades freshness; latest-data reads stay on the primary.
- Queued work needs retries, idempotency, backlog monitoring and a dead-letter route.
- Write scaling pushes joins, transactions, routing and rebalancing into the application: use it last.

## KB-SCALE-1 Starting point

- Day one: application and database on separate instances.
- Default to a relational database (mature, rich tooling, decades of proven scaling patterns); pick SQL vs NoSQL by access patterns and data model.

## KB-SCALE-2 Scale up first

No architecture or code change, but a hardware ceiling, diminishing returns and still a single point of failure.

## KB-SCALE-3 Managed services and redundancy

- Managed database: no OS patching or backup work. Self-managed: the team owns backup, failover, monitoring and capacity planning.
- Spread the database across independent failure zones (separate power and network) in one region.
- Primary serves all reads and writes; standby gets synchronous replication, serves no reads, activates only on failover — availability, not read capacity.

## KB-SCALE-4 Stateless compute

- When one instance is not enough, run more in parallel behind a load balancer.
- Minimize local in-memory state so any instance serves any request; keep server-side sessions in a shared store (e.g. Redis), not one process's memory.

## KB-SCALE-5 Offload by load type

More app servers stop helping unless load types are separated:

- Static files (JS, CSS, images) → object storage + CDN edge; app servers keep bandwidth and CPU for dynamic work.
- Read replicas take routine reads so the primary keeps resources for writes; accept async replication lag.
- In-memory cache for repeated reads; define TTL, refresh or invalidation, and acceptable staleness before production.

## KB-SCALE-6 Observability, autoscaling, automation

- Instrument from day one, through Build → Measure → Learn: infrastructure metrics (CPU, RAM), application metrics (latency, error rate), central logs, distributed tracing.
- Compare instances by percentile (e.g. p90); an average hides imbalance.
- Traffic cycles (day/night) and spikes; capacity fixed at peak wastes off-peak. Autoscale on actual load once the tier is stateless and monitored.
- Infrastructure as Code and CI/CD keep environments, patching and releases consistent with less manual work.

## KB-SCALE-7 Queues and services

- Split the monolith gradually into services (containers or serverless) that deploy and scale independently. Cost: pack `microservices-cost`.
- Background work (notification emails, report files) goes through a queue or pub/sub; reply "accepted" once the message is queued.
- The queue absorbs spikes (load leveling); workers scale independently of the web tier.
- Requires retries, idempotent handling (reprocessing repeats no side effect), backlog monitoring, and a dead-letter queue where appropriate. Failure detail: pack `distributed-systems`.

## KB-SCALE-8 Database writes as the bottleneck

After caching and replicas, write capacity can still hit its limit:

- Federation — split by business function (e.g. Users, Products). Spreads load; cross-database joins and transactions move into the application; each part can still bottleneck.
- Sharding — same schema, one table's rows split across servers by shard key. Scales writes; the application owns routing, schema sync and rebalancing.
- NoSQL for suitable data (metadata, non-relational) — scales independently; choose by data model and access patterns.

## KB-SCALE-9 Reading scaling roadmaps

- User-count milestones (1 → 10 million) illustrate workload growth; they are not capacity commitments or concurrent users.
- Vendor services stand for roles (VM, managed relational database, load balancer, cache cluster, object storage, CDN, message queue); mapping across providers is by role, not 1:1 in APIs or operational guarantees.
