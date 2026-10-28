---
id: single-server-capacity
title: Single-server capacity — memory and GC cap concurrency before CPU
description: Use when sizing how many concurrent users one server holds, load or capacity testing it, or diagnosing throughput that stops growing with more cores
kind: practice
review: unreviewed
reviewed: 2026-10-28
sources:
  - kind: file
    ref: "Pasted post 'How many of 1,000,000 users can a 16-core server handle?' summarizing Arjay McCandless's open-source Social Media API benchmark (C#, Java, Go, Rust, Node.js, Python)"
triggers:
  prompt: [concurrent users, connection pool, garbage collection, memory pressure, virtual threads, capacity test]
  skills: [performance-review, performance-test, production-readiness-review]
  agents: [performance-optimizer, performance-tester]
---

## Digest

- Suspect configuration before the language: one gzip middleware plus TCP keep-alive probes held Go at 248k users; fixing both gave 650k on the same 16 cores.
- Concurrency costs memory: each open connection and in-flight request holds buffers. At hundreds of thousands of connections, memory pressure and GC cap throughput before CPU; more cores do not help a memory-starved process.
- Backlog × per-request allocation = death spiral: slow backend → requests pile up → heap grows → GC runs constantly → app slows further, while the database sits idle.
- A bigger connection pool helps only when the app can hold what it admits; on a memory-bound app it fills the heap faster.
- Moving the database off-host adds network, driver and pool cost: 16-core capacity fell for 5 of 6 stacks, and tuning won back only part of it.
- A capacity pass needs a sustained window: a run holding 900k users for 2 minutes failed at minute 5 on a checkpoint stall.

## KB-CAP-1 Capacity test method

- Realistic workload, not "Hello World": held-open connections, read-heavy traffic, think time between actions, occasional writes, production middleware (gzip) on every response.
- Prove the OS and network layer first: the 16 vCPU / 32 GB VM held 1.2 million open connections with light pings, so later limits sit in the application or database.
- Pass criteria: sustain the load 5 minutes; p95 < 500 ms; p99 < 1 s; error rate < 1%.
- 1 million simulated concurrent users with think time ≈ 42,000 requests/s; a user count is not a request rate.
- Ramp connections gradually: too fast a ramp spikes p99 at the start.

## KB-CAP-2 Measured results (one benchmark, standard configurations, users held)

| Stack | 1 core, SQLite | 16 cores, SQLite | 16 cores, Postgres | Postgres after tuning |
| --- | --- | --- | --- | --- |
| C# ASP.NET Core | 60k | 722–728k | 665k | 700k (pool limit 256) |
| Node.js Fastify, multi-worker | 75k | 665k | 587k | 639k (slower connection ramp-up) |
| Java Spring Boot, virtual threads | 36k | 550k | 321k | 340k (larger heap) |
| Rust Axum + SQLx | 52k | 535k | 413k | — |
| Python FastAPI, Uvicorn workers | 35k | 420k | 213k | — |
| Go Gin, goroutines | 50k | 198k | 248k | 650k (other gzip middleware, keep-alive probes off) |

- No stack reached 1 million users on 16 cores (Intel Xeon Platinum 8260 VM).
- Rankings shift with core count and configuration; one run is not a language ranking.

## KB-CAP-3 Memory pressure and GC

- Virtual threads and goroutines remove OS-thread cost, not memory cost: each in-flight request still holds heap buffers.
- When the database answers slower than requests arrive, buffers fill the heap; at the ceiling even a fully busy GC frees too little and the app chokes.
- Signal: doubling cores barely moves capacity (8 → 16 cores: Go 236k → 248k, Java 312k → 321k) → investigate memory and GC, not compute.
- Java: a larger heap lifted 321k → 340k; a larger database pool made results worse by admitting more data into memory at once.
- C#: raising the Postgres pool limit to 256 lifted 665k → 700k. Pool sizing depends on how the runtime holds in-flight data.

## KB-CAP-4 Middleware and per-connection overhead

- Allocation before the handler multiplies with backlog: the gzip middleware allocated a ~1 MB compression writer per incoming request, so a backlog kept many writers alive and drove constant GC.
- Periodic TCP keep-alive probes over hundreds of thousands of connections added heavy overhead; turning them off was half of Go's fix.
- Audit per-request middleware allocation and per-connection timers before tuning the runtime.

## KB-CAP-5 Database placement

- SQLite on the same host removes network latency but allows one writer at a time; WAL checkpoints (log synced back into the main file) stalled C# past the latency limit at minute 5 after GC and write-coordination tuning reached 900k.
- Some SQLite builds' default memory accounting (shared bookkeeping) caused lock contention as cores grew; it was turned off.
- PostgreSQL on its own server used a connection pool, prepared statements, and the planner's Memoize feature off (too CPU-heavy).
- An off-host database turns in-process calls into network I/O: latency, async driver behaviour, pool management and longer in-memory wait per request. The split is needed for long-term scaling but costs single-host capacity, and tuning won back only part of it: C# 700k vs 722k on SQLite (pool limit 256), Node.js 639k vs 665k, Java 340k vs 550k.
