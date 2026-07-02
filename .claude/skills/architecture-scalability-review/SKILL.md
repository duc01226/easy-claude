---
name: architecture-scalability-review
version: 1.0.0
description: '[Architecture] Use when grading project architecture and scalability quality for greenfield init or brownfield audit: build/CI scalability, distributed-monolith risk, module isolation, dependency discipline, loose coupling, horizontal scaling, DRY, abstraction, clean architecture, observability, and delivery.'
---

## Quick Summary

**Goal:** Grade a project or planned architecture against the full architecture and scalability quality scorecard, while routing deep checks to the existing owner skills instead of duplicating them.

**Main steps (run in order):** (1) Resolve `mode=init` or `mode=audit` and target scope. (2) Load project context and evidence. (3) Read `references/scorecard.md`. (4) Score all 10 areas 0-2 with evidence. (5) Run pass/fail gates. (6) Emit an architecture scalability review report under `plans/reports/`.

**Key rules:**

- Every score needs `file:line`, command output, architecture artifact evidence, or an explicit `N/A - reason`; unproven criteria score `0`.
- This skill is the scorecard owner, not the deep owner for every concern. Route depth to sibling skills named in the ownership matrix.
- New Tech/Lib: N/A by default. If the audit recommends Nx, Turborepo, Bazel, a new message broker, a new observability stack, or any other tool, present the recommendation for user confirmation before implementation.
- `mode=init` scores planned architecture from greenfield artifacts before implementation planning. `mode=audit` scores an existing brownfield project from real source, config, CI, docs, and ADR evidence.

## When To Use

- During greenfield or project-init flow after `architecture-design`, before implementation planning hardens decisions.
- On demand against an existing repository when the user asks to review project quality, architecture scalability, distributed-monolith risk, module boundaries, build scalability, or setup quality.
- As a periodic architecture health check for a growing codebase.

Do not use this as the every-change diff reviewer. Per-change regression checks belong in `review-architecture`, `performance-review`, `production-readiness-review`, and other sibling reviewers already wired into `workflow-review-changes`.

## Scope And Modes

### `mode=init`

Score intended architecture before implementation exists. Evidence may include architecture reports, ADRs, tech-stack decisions, domain-analysis outputs, build/CI plans, deployment plans, and scaffold handoff tables.

Use `planned` evidence labels when implementation is not yet present. Score `2` only when the plan names enforceable mechanisms, not only intent.

### `mode=audit`

Score an existing repository. Evidence must come from source files, build config, CI config, ADRs, reference docs, tests, dependency-boundary tooling, deployment/IaC files, and graph/grep commands.

If `.code-graph/graph.db` exists, run at least one graph command on key architecture files before concluding.

## Required Context

Read these before scoring:

- `docs/project-config.json`
- `docs/project-reference/docs-index-reference.md`
- `docs/project-reference/lessons.md`
- `docs/project-reference/project-structure-reference.md`
- Relevant stack docs from the docs index, based on target scope
- Accepted ADRs under `docs/adr/**`, when present
- Existing architecture, domain, CI, deployment, and observability artifacts in the target plan or repo

## Ownership Matrix

| Area | Cadence | This skill owns | Route depth to |
| --- | --- | --- | --- |
| Build & CI Scalability | init / audit | Score incremental builds, affected-only detection, cache strategy, parallel test/build strategy, monorepo quality gate posture | `linter-setup` for quality gates; `scaffold` for project foundation |
| Architecture Pattern / distributed-monolith | init / audit + every-change smell | Score modular monolith vs microservices fit and distributed-monolith risk | `architecture-design` for design choices; `review-architecture` for diff-level boundary drift |
| Module Isolation | init / audit + every-change boundary drift | Score bounded-context isolation and independent build/test/deploy expectations | `domain-analysis`, `review-architecture` |
| Dependency Discipline | init / audit + every-change | Score explicit dependency directions and enforcement mechanisms | `review-architecture`, `linter-setup` |
| Loose Coupling | init / audit + every-change | Score event-driven ownership and absence of avoidable sync coupling | `domain-analysis`, `review-architecture` |
| Horizontal Scaling | init / audit + local hot-path review | Score system-level statelessness, load balancing, caching, async, partitioning, autoscaling, SPOF, latency/throughput limits | `performance-review`, `production-readiness-review` |
| DRY | init / audit + every-change duplication drift | Score strategic shared-platform, monorepo/shared-lib, and duplicated-knowledge posture | `review-architecture`, `scaffold` |
| Abstraction / Easy-to-Change | init / audit + every-change conformance | Score swappable technical concerns, stable contracts, and interface boundaries where they reduce future change cost | `architecture-design`, `review-architecture`, `scaffold` |
| Clean Architecture | init / audit + every-change | Score dependency-rule fit, business logic placement, and architecture style enforcement | `review-architecture`, `scaffold` |
| Observability & Delivery | init / audit + production readiness | Score monitoring, logging, metrics, DevOps/deployment, CI/CD, IaC, rollback posture | `production-readiness-review`, `linter-setup` |

When a concern belongs to a sibling, record a one-line route pointer and continue scoring from evidence. Do not expand into the sibling's full checklist.

## Workflow

### Step 1: Resolve Mode And Scope

Determine:

- Mode: `mode=init` or `mode=audit`
- Target: current repo, plan directory, specific service/module, or architecture artifact set
- Evidence roots: source paths, CI/build files, ADRs, reference docs, workflow outputs
- Report slug: project/module name

If mode is missing, infer from context:

- Greenfield/project-init/plan artifacts only -> `mode=init`
- Existing repo/source/config review -> `mode=audit`

### Step 2: Gather Evidence

Use narrow grep/glob searches first. For brownfield audits, collect at least:

- Build files and CI pipeline config
- Workspace/monorepo config, if present
- Dependency-boundary or architecture-rule tooling
- Module/service folder structure
- Message bus, event, API, and cross-context communication patterns
- Deployment, IaC, observability, and runtime config
- ADRs and architecture reports

Run graph trace on key architecture or module-boundary files when `.code-graph/graph.db` exists. If the graph lacks relevant files, record that limitation and continue with grep/file evidence.

### Step 3: Score The 10 Areas

Read `references/scorecard.md` and score each area:

- `0` = absent, contradicted, or unproven
- `1` = partially addressed, documented but weakly enforced, or implemented in only some areas
- `2` = designed and enforced with evidence

Total score: `/20`.

| Total | Verdict | Meaning |
| ---: | --- | --- |
| 17-20 | STRONG | Architecture/scalability posture is credible; address any non-blocking gaps. |
| 11-16 | NEEDS WORK | Material gaps exist; plan follow-up before growth or high-scale use. |
| 0-10 | HIGH RISK | Architecture/setup quality is not yet safe for scale; fix gates before major delivery. |

### Step 4: Run Pass/Fail Gates

Run these gates after scoring. Gates are pass/fail overlays and do not change the `/20` math.

| Gate | Blocks STRONG when failing | Check |
| --- | --- | --- |
| G1 Evidence Integrity | yes | Any `2` score without evidence is downgraded; repeated unproven claims fail the gate. |
| G2 Build & CI Scalability | yes for init/audit scope with multi-module growth | Incremental/affected-only/caching strategy exists or a clear N/A rationale is documented. |
| G3 Distributed-Monolith Risk | yes | Chosen architecture avoids service/module split with shared DB, circular sync calls, or deploy-together-only coupling disguised as distribution. |
| G4 Boundary Enforcement | yes | Dependency direction and module boundaries are explicit and enforceable. |
| G5 Horizontal Scaling Bottlenecks | yes for high-scale target | Statelessness, bottlenecks, SPOF, resource ceilings, and async/back-pressure posture are known and owned. |
| G6 Reuse Without Coupling | no | Shared libraries/platform code reduce duplicated knowledge without leaking consumer domain concepts. |
| G7 Secrets And Sensitive Output | yes | Audit report redacts credentials and does not expose secrets found during inspection. |

Critical/high gate failures require an owner-accepted risk or follow-up plan before reporting STRONG.

### Step 5: Emit Report

Write:

`plans/reports/architecture-scalability-review-{YYMMDD}-{HHmm}-{slug}.md`

Report structure:

```markdown
# Architecture Scalability Review

**Mode:** init | audit
**Scope:** {project/module/artifacts}
**Date:** {date}
**Score:** {X}/20
**Verdict:** STRONG | NEEDS WORK | HIGH RISK

## Scorecard

| # | Area | Score | Evidence | Route / Owner |
| - | ---- | ----: | -------- | ------------- |

## Pass/Fail Gates

| Gate | Status | Evidence | Required follow-up |
| ---- | ------ | -------- | ------------------ |

## Cadence Matrix

| Area | Init/on-demand home | Every-change home | Rationale |
| ---- | ------------------- | ----------------- | --------- |

## Findings

### Critical / High
### Medium / Low

## New Tech/Lib Recommendations

List only user-confirmed recommendations or mark `N/A`.
```

## Completion Criteria

- All 10 areas are scored.
- Every score has evidence or explicit `N/A - reason`.
- All gates have `pass`, `partial`, `fail`, or `N/A - reason`.
- Cadence matrix maps each area to init/on-demand and every-change homes.
- Sibling deep checks are routed, not duplicated.

