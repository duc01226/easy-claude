---
name: architecture-scalability-review
version: 1.1.0
description: '[Architecture] Use when grading architecture and scalability — build/CI scale, distributed-monolith risk, module isolation, coupling, horizontal scaling, clean architecture, observability.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Grade a project or planned architecture against the full architecture + scalability quality scorecard, routing deep checks to the existing owner skills instead of duplicating them — so the project earns an evidence-backed `/20` verdict (STRONG / NEEDS WORK / HIGH RISK) before scale or delivery hardens the decisions.

**Summary:**
- **Testability contract:** resolve Unit/Integration/System/E2E applicability from runner/config evidence; record owner/root/data, copy-ready full + focused commands, zero-match behavior, CI/simple-Windows entry, unique run/data identity, and repeat proof; unresolved applicable fields block handoff, while non-applicable tiers require evidence-backed `N/A`.

- This skill is the scorecard OWNER, not the deep owner — it scores 10 areas 0-2 (`/20`), then routes sibling-owned depth (architecture-design/review, domain-analysis, performance-review, production-readiness-review, security-review, linter-setup, scaffold) via the Ownership Matrix; NEVER expand into a sibling's checklist.
- Scoring is evidence-gated — `file:line`/command/artifact proof or explicit `N/A - reason`, else `0`; then 7 pass/fail gates (G1-G7) overlay the score without changing the `/20` math.
- Before emitting, self-audit every grade against the 11 thinking red flags (`architecture-knowledge.md` §20.3) — a deduction for unevidenced scale, a tool named before the requirement, or a recommendation whose sacrifice you cannot state is re-derived or dropped, NEVER reworded. **A `— VERIFY` row or section banner in `architecture-knowledge.md` §3/§8/§9/§10 is UNVERIFIED** — it can never be the sole basis for a deduction; confirm against the named source or the project's own docs.
- Two conditional advisory gates ride along — Technique Applicability + Scenario Stress — emitting guidance ONLY; NEVER mutate the `/20` score, verdict band, or gate pass/fail.
- Runs in `mode=init` (planned greenfield architecture) or `mode=audit` (existing brownfield source/config/CI/ADR evidence).

**Workflow (run in order):**

1. Resolve `mode=init` or `mode=audit` + target scope.
2. Load project context and evidence.
3. Read `references/scorecard.md`.
4. Score all 10 areas 0-2 with evidence.
5. Run pass/fail gates (G1-G7).
6. Emit the architecture scalability review report under `plans/reports/`.

**Key Rules:**

- MUST ATTENTION every score carries `file:line`, command output, architecture-artifact evidence, or explicit `N/A - reason`; unproven criteria score `0`.
- MUST ATTENTION this skill owns the scorecard, not the deep review of every concern — route depth to the sibling skills named in the Ownership Matrix; NEVER duplicate their checklists.
- New Tech/Lib: `N/A` by default. If the audit recommends Nx, Turborepo, Bazel, a new message broker, a new observability stack, or any other tool, present it for user confirmation before implementation.
- `mode=init` scores planned architecture from greenfield artifacts before implementation planning; `mode=audit` scores an existing brownfield project from real source, config, CI, docs, and ADR evidence.

## When To Use

- Greenfield/project-init flow after `architecture-design`, before implementation planning hardens decisions.
- On demand against an existing repository when the user asks to review project quality, architecture scalability, distributed-monolith risk, module boundaries, build scalability, or setup quality.
- Periodic architecture health check for a growing codebase.

NEVER use this as the every-change diff reviewer. Per-change regression checks belong in `architecture-review`, `performance-review`, `production-readiness-review`, and other sibling reviewers already wired into `workflow-review-changes`.

> **Combined audit:** For a whole-project architecture + compliance + production-readiness audit in one pass, run `/architecture-review-full` (or `/start-workflow workflow-architecture-audit`) — it fans out this skill, `architecture-review`, and `production-readiness-review` as parallel sub-agents and synthesizes one consolidated report.

## Scope And Modes

### `mode=init`

Score intended architecture before implementation exists. Evidence may include architecture reports, ADRs, tech-stack decisions, domain-analysis outputs, build/CI plans, deployment plans, and scaffold handoff tables.

Use `planned` evidence labels when implementation is not yet present. Score `2` only when the plan names enforceable mechanisms, not intent alone.

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
| Architecture Pattern / distributed-monolith | init / audit + every-change smell | Score modular monolith vs microservices fit and distributed-monolith risk | `architecture-design` for design choices; `architecture-review` for diff-level boundary drift |
| Module Isolation | init / audit + every-change boundary drift | Score bounded-context isolation and independent build/test/deploy expectations | `domain-analysis`, `architecture-review` |
| Dependency Discipline | init / audit + every-change | Score explicit dependency directions and enforcement mechanisms | `architecture-review`, `linter-setup` |
| Loose Coupling | init / audit + every-change | Score event-driven ownership and absence of avoidable sync coupling | `domain-analysis`, `architecture-review` |
| Horizontal Scaling | init / audit + local hot-path review | Score system-level statelessness, load balancing, caching, async, partitioning, autoscaling, SPOF, latency/throughput limits | `performance-review`, `production-readiness-review` |
| DRY | init / audit + every-change duplication drift | Score strategic shared-platform, monorepo/shared-lib, and duplicated-knowledge posture | `architecture-review`, `scaffold` |
| Abstraction / Easy-to-Change | init / audit + every-change conformance | Score swappable technical concerns, stable contracts, and interface boundaries where they reduce future change cost | `architecture-design`, `architecture-review`, `scaffold` |
| Clean Architecture | init / audit + every-change | Score dependency-rule fit, business logic placement, and architecture style enforcement | `architecture-review`, `scaffold` |
| Observability & Delivery | init / audit + production readiness | Score monitoring, logging, metrics, DevOps/deployment, CI/CD, IaC, rollback posture | `production-readiness-review`, `linter-setup` |

When a concern belongs to a sibling, record a one-line route pointer and continue scoring from evidence. NEVER expand into the sibling's full checklist.

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

#### Technique Applicability (advisory — NON-SCORING)

After scoring, invoke `SYNC:scale-technique-gate`: derive the system's scale tier from evidence (users/RPS, SLO, data volume, tenancy, topology — cite `file:line`/config/infra + confidence), then emit the **Technique Applicability Matrix** (`technique | tier-warranted? | present? | verdict | advice | evidence`) across the 10 concern groups. Surface warranted-but-missing techniques as advice AND flag `OVER-ENGINEERED` techniques the tier does not warrant (anti-over-engineering).

> **Advisory only — does NOT change the `/20` score or any verdict band.** A `MISSING-WARRANTED` technique is guidance, never a deduction; a correctly-lean small system stays a PASS. Full catalog → `.claude/docs/scale-technique-catalog.md`.

### Step 4: Run Pass/Fail Gates

Run these gates after scoring. Gates are pass/fail overlays and do not change the `/20` math.

| Gate | Blocks STRONG when failing | Check |
| --- | --- | --- |
| G1 Evidence Integrity | yes | Any `2` score without evidence is downgraded; repeated unproven claims fail the gate. |
| G2 Build & CI Scalability | yes for init/audit scope with multi-module growth | Incremental/affected-only/caching strategy exists or a clear N/A rationale is documented. |
| G3 Distributed-Monolith Risk | yes | Chosen architecture avoids service/module split with shared DB, circular sync calls, or deploy-together-only coupling disguised as distribution. |
| G4 Boundary Enforcement | yes | Dependency direction and module boundaries are explicit and enforceable. |
| G5 Horizontal Scaling Bottlenecks | yes for high-scale target | Statelessness, bottlenecks, SPOF, resource ceilings, and async/back-pressure posture are known and owned. **Also required: a named ESCAPE HATCH out of a metastable high-load state** (shed at the edge / drain-or-truncate the queue / warm the cache / restart at lower concurrency) — retry storms, cold caches and queue backlog form a self-sustaining loop that OUTLIVES its trigger, so removing load does not recover the system. **And latency evidence with no stated load-generation method cannot support a Pass — grade G5 `Partial` at best and ask for the method** (per `references/scorecard.md:38`; do NOT discard the figure as missing evidence) — because a harness that waits for slow responses deletes the worst samples (coordinated omission), so its p99 is a lie. |
| G6 Reuse Without Coupling | no | Shared libraries/platform code reduce duplicated knowledge without leaking consumer domain concepts. |
| G7 Secrets And Sensitive Output | yes | Audit report redacts credentials and does not expose secrets found during inspection. |

Critical/high gate failures require an owner-accepted risk or follow-up plan before reporting STRONG.

### Testability & Verification Contract (TVC — non-scoring gate)

Run this cross-cutting setup gate after G1-G7 and before emitting the report. Consume the architecture-design matrix plus scaffold/harness evidence; do not re-implement their tier-specific test checklists.

1. Verify one row each for Unit, Integration/System, and E2E. Each row is `APPLICABLE` only with runner/framework/configuration/root evidence, or `N/A — {specific evidence}`. An E2E `N/A` must cite the verified absence of a browser runner/configuration/command, never the absence of a preferred tool.
2. For every applicable row, verify copy-ready full and focused commands, invalid/zero-match non-zero behavior, CI gate, simple/Windows entry point where needed, owner, and exact result fields.
3. Verify the declared run identity and business-data suffix, supported public setup path, realistic valid data, idempotent/restart-safe reference setup, additive persistent-data policy, mutable-root/parallel-worker isolation, pacing/arrange barrier, and two consecutive no-reset full runs for each applicable persistent-state suite. Missing or placeholder evidence is `BLOCKED`, not a guessed pass.
4. Emit `TVC: PASS | PARTIAL | BLOCKED` with the matrix, evidence, owner, and follow-up. `PASS` means every tier is resolved and every applicable field is evidenced; `PARTIAL` records the bounded gap without inventing a tier or command.

TVC is a setup/verification status, not an eighth score area: it MUST NOT change any 0-2 grade, the `/20` denominator, score total, verdict band, G1-G7 status, or either advisory matrix. A `BLOCKED` TVC prevents a `setup complete` claim and remains a follow-up in this report; it does not become a score deduction.

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

## Testability & Verification Contract (non-scoring)

**Status:** `TVC: PASS | PARTIAL | BLOCKED`

| Tier | Applicability + evidence | Owner | Runner/config/root | Data + run identity | Full command | Focused/partial command | Zero-match behavior | CI / simple-Windows entry point | Repeat proof |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Unit | `APPLICABLE` / `N/A — {evidence}` | {owner} | {runner/config/root} | {identity + fixture policy} | `{command}` | `{filter}` | `{non-zero behavior}` | {CI / command} | {result or planned owner} |
| Integration/System | `APPLICABLE` / `N/A — {evidence}` | {owner} | {runner/config/root} | {identity + additive/public-path policy} | `{command}` | `{filter}` | `{non-zero behavior}` | {CI / command} | `{two no-reset runs}` |
| E2E | `APPLICABLE` / `N/A — {evidence}` | {owner} | {runner/config/root} | {identity + reachable-data policy} | `{command}` | `{filter}` | `{non-zero behavior}` | {CI / command} | {result or evidence-backed N/A} |

This section is copied from the owner evidence and remains separate from the scorecard, G1-G7, and advisory outputs; do not infer `PASS` when the child report omits it.

## Cadence Matrix

| Area | Init/on-demand home | Every-change home | Rationale |
| ---- | ------------------- | ----------------- | --------- |

## Findings

### Critical / High
### Medium / Low

## New Tech/Lib Recommendations

List only user-confirmed recommendations or mark `N/A`.
```

## Scorecard Validation Gate (why-review, MANDATORY when the scorecard has any sub-80 grade or risk finding)

> **Purpose:** A scorecard is a JUDGMENT. Validate it adversarially before emitting it so a mis-scored area or an inflated risk finding does not ship as ground truth. This gate validates findings only — it routes any fix to the owning sibling review, it does NOT self-converge a fix-loop.

**Trigger:** Any area graded below 80, or any risk/gap finding. Skip ONLY when every area scored ≥80 with zero risk findings.

**Protocol:**

1. Read the finalized scorecard report from `plans/reports/{skill}-{date}-{slug}.md` (or the exact report path written).
2. Invoke `/why-review --validate-findings <report-path>` — verify each sub-80 grade and each risk finding has `file:line` evidence and clears why-review's finding-survival bar.
3. **If why-review demotes/removes any grade or finding:** update the scorecard with the revised grade/severity and add a `## Why-Review Validation Notes` section citing what changed and why.
4. **If the scorecard changed after validation:** re-run this gate — maximum 2 validation passes — until the remaining grades/findings are validated. No fix-loop: this skill grades and routes fixes to siblings; it never restarts a full review over its own fixes.

**Anti-bias (MANDATORY before emitting):** steel-man each grade — argue the score should be one band better AND one band worse; a grade that survives its own steel-man ships. A scorecard whose grades were never challenged is not validated.

**Self-audit against the thinking red flags (MANDATORY before emitting):** run the 11 red flags in `.claude/docs/architecture-knowledge.md` §20.3 against every grade, gap and recommendation. The four that fire most often in a scorecard: **grading down for a scale you cannot evidence** · **recommending a tool before stating the requirement** · **"best practice" with no named forces** · **cannot say what your recommendation SACRIFICES**. Any hit invalidates the GRADE's reasoning — re-derive it from evidence or drop the finding; NEVER just reword it. — why: an unevidenced deduction reads as rigour and sends the team to fix a problem they do not have.

## Completion Criteria

- All 10 areas are scored.
- Every score has evidence or explicit `N/A - reason`.
- All gates have `pass`, `partial`, `fail`, or `N/A - reason`.
- Cadence matrix maps each area to init/on-demand and every-change homes.
- Sibling deep checks are routed, not duplicated.
- TVC has a resolved Unit/Integration/System/E2E matrix with evidence-backed applicability or N/A, commands, owners, data/run policy, and repeat proof.
- TVC remains non-scoring and does not alter the `/20` score, verdict band, G1-G7, or advisory semantics.

<!-- SYNC:scale-technique-gate -->

> **Scalability & Production-Readiness Technique Gate** — CONDITIONAL, evidence-gated, scale-tiered. Judge which system-design techniques a system *warrants* at its scale — flag warranted-but-missing gaps AND advise AGAINST unwarranted heavyweight ones. **ADVICE-ONLY: emit the matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.**
>
> 1. **Derive the scale tier FIRST — from evidence, never assumed.** Read users/RPS, SLO/latency targets, data volume, tenancy, topology from config/infra/specs; cite `file:line` + confidence. Tiers: `T0` internal/single-instance · `T1` small SaaS (<10k users) · `T2` high-scale (10k–1M) · `T3` massive/multi-region (millions+). Unknown tier → state assumption, do NOT default to T3.
> 2. **Judge each concern group only at/above its warranting tier** (member techniques → owning review skill for depth):
>    - Traffic & Edge — Rate Limiting, Load Balancing, Reverse Proxy, API Gateway, CDN, Edge Caching, WAF, DDoS (T1+; CDN/WAF T2+) → security-review owns WAF/DDoS
>    - Caching & Data Access — Caching, Cache Invalidation, DB Indexing, Query Optimization, N+1, Connection Pooling (T1+) → performance-review owns depth
>    - Data Scaling & Consistency — Read Replicas, Sharding, Partitioning, Replication, CAP, Eventual Consistency, Locks, Leader Election (T2+; sharding/multi-region T3) → performance-review
>    - Async & Messaging — Message Queues, Pub/Sub, Event-Driven, Saga, DLQ, Distributed Transactions, Backpressure, Webhooks, WebSockets/SSE (T2+)
>    - Resilience — Circuit Breakers, Timeouts, Retries, Backoff, Idempotency, Health Checks, Liveness/Readiness, Failover, Graceful Degradation (T1+) → production-readiness-review
>    - Scaling & Compute — Autoscaling, Horizontal/Vertical Scaling, Serverless Limits, Cold Starts, Cron Jobs, Thread Safety, GC/Memory Leaks (T1+; autoscaling T2+)
>    - Deployment & Release — CI/CD, Docker, Kubernetes, Blue-Green/Canary/Rolling, Rollbacks, Feature Flags, IaC/Terraform/Helm, Build Caching (CI/CD T0+; K8s/canary T2+)
>    - Observability — Monitoring, Logging, Distributed Tracing, Metrics, Alerting, SLOs/SLIs, Error Budgets (T1+; tracing/error-budgets T2+) → production-readiness-review
>    - Security & Compliance — Secrets Management, IAM, OAuth, JWT Rotation, TLS, Encryption at Rest/Transit, CORS, CSRF, SQLi, XSS, SSRF (T0+) → security-review owns
>    - DR & Infra — Backups, Disaster Recovery, Multi-Region, Chaos Engineering, Schema Versioning, DB Migrations, Cost Optimization (backups T1+; DR/multi-region/chaos T3) → production-readiness-review
> 3. **Assign one of 4 verdicts per warranted technique:** `PRESENT` · `MISSING-WARRANTED` (→ **advise only** — guidance, NOT a score/gate lever) · `N/A-by-scale` (below warranting tier) · `OVER-ENGINEERED` (present but unwarranted at this tier → advise AGAINST).
> 4. **Anti-over-engineering guard (first-class):** do NOT recommend K8s, sharding, multi-region, service mesh, event sourcing, or distributed transactions below their warranting tier. A correctly-lean small system is a PASS, never a gap.
> 5. **Output — Technique Applicability Matrix:** `technique | tier-warranted? | present? | verdict | advice | evidence (file:line/config/infra)`. Full grouped catalog + per-tier baseline → `.claude/docs/scale-technique-catalog.md`. Hosting reviews surface this matrix WITHOUT changing any `/20`, `/24`, verdict band, or PASS/FAIL (per user decision 2026-07-06). **Drift-guard: tier thresholds & per-technique warranting tiers are AUTHORITATIVE in `.claude/docs/scale-technique-catalog.md` — the inline tier summary above is a condensed pointer; on any tier/technique change, update the catalog FIRST, then re-run `.claude/scripts/inject_scale_technique_gate.py` to re-propagate this block.**
>
> **BLOCKED until:** `- [ ]` tier derived from evidence (not assumed) `- [ ]` matrix emitted `- [ ]` over-engineering guard applied `- [ ]` advisory-only (no score/verdict mutation) confirmed

<!-- /SYNC:scale-technique-gate -->

<!-- SYNC:scenario-stress-eval -->

> **Scenario Stress & Resilience Evaluation** — CONDITIONAL, evidence-gated, business-criticality-aware. The top-down companion to `SYNC:scale-technique-gate`: instead of *"is technique X present?"*, put the system UNDER concrete failure/load scenarios and judge whether it SURVIVES, SELF-HEALS, and whether its BUSINESS needs it to. **ADVICE-ONLY: emit the Scenario Stress Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.**
>
> 1. **Reuse the scale tier** derived by `SYNC:scale-technique-gate` (or derive it identically from evidence); **also derive business-criticality `B0`–`B3`** from specs/SLA/product docs + the domain, cite `file:line` + confidence. `B0` best-effort · `B1` important · `B2` business-critical · `B3` mission-critical/regulated. Unknown → state the assumption, do **NOT** default to `B3`/`T3`. **Criticality-signal floor (both-directions safety):** regulated / PII / financial / health data, money movement, auth/identity, or legal-compliance scope raises `B` to **at least `B2` even absent SLA/SLO docs**; anti-over-engineering lowers hardening ONLY when NO such signal is present. `B` (blast if it fails) and `T` (scale of load/data) are independent — a low-traffic payroll run is low-`T`, high-`B`.
> 2. **Select in-scope scenarios** — only those the system's `B`/`T` combination warrants (a `B0` internal PoC skips region-loss/DR entirely; a `B3`/`T0` regulated service still needs backups + DR by BUSINESS, not scale).
> 3. **Walk each in-scope scenario:** simulate the stimulus → trace the break path → name the failure signature → answer the self-heal/recovery question (auto-recover? MTTR? manual runbook?) → name the trade-off it forces. Families: traffic spike · sustained growth · data-volume growth · write/ingest burst · dependency down/slow · instance/node loss · zone/region loss · **data loss/corruption** · poison-message/retry-storm · cascading failure/backpressure · cold-start/deploy-blip · clock-skew/duplicate-delivery.
> 4. **Assign one verdict per scenario:** `WITHSTANDS` · `DEGRADES-GRACEFULLY` · `FAILS-HARD` (→ **advise only**) · `N/A-by-business` (not warranted → skip, not a gap) · `OVER-HARDENED` (resilience beyond business need → **advise AGAINST**, cite carrying cost).
> 5. **Anti-over-engineering guard (first-class):** a lean system whose business does not need HA/DR is a PASS; `OVER-HARDENED` flags resilience the business does not warrant. This guard is symmetric with the criticality-signal floor above — never under-harden a `B2`+ system just because its traffic is low.
> 6. **Output — Scenario Stress Matrix:** `scenario | in-scope (B/T)? | verdict | self-heal | trade-off | evidence (file:line/config/infra)`. Full catalog + Business×Scale in-scope baseline + verdict/tier tables → `.claude/docs/scenario-stress-catalog.md`. **ADVISORY-ONLY: NEVER mutate any `/20`, `/24`, verdict band, or gate pass/fail. Drift-guard: scenarios/verdicts/business-tiers are AUTHORITATIVE in the catalog — update it FIRST, then re-run `.claude/scripts/inject_scenario_stress_gate.py`. Scale tier stays single-sourced in `scale-technique-catalog.md`.**
>
> **BLOCKED until:** `- [ ]` scale tier + business-criticality (with criticality-signal floor) derived from evidence `- [ ]` in-scope scenarios selected `- [ ]` matrix emitted `- [ ]` over-hardening guard applied `- [ ]` advisory-only (no score/verdict mutation) confirmed

<!-- /SYNC:scenario-stress-eval -->

<!-- SYNC:goal-contract-satisfaction-loop -->

> **Goal Contract Satisfaction Loop** — Persist the user goal in an external file, execute against it, and loop review/fix until every saved required criterion passes or a blocker escalates. Bounded closed loop — NEVER open-ended autonomous exploration.
>
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
> 2. **Required sections:** Original Request, Purpose, Success Criteria (checkboxes; mark required vs optional), Constraints, Evidence Required, Iteration Log, Goal Satisfaction matrix.
> 3. **Before work:** read the active goal and map planned work to saved success criteria — execution serves the saved criteria, never chat memory alone.
> 4. **After execution/verification:** append an Iteration Log entry — result, evidence references (`file:line`, command output, report path), remaining gaps.
> 5. **Review gate:** emit a Goal Satisfaction matrix — `| Success Criterion | Evidence | Status |` with PASS/FAIL/BLOCKED. Overall PASS requires every required criterion PASS.
> 6. **Loop rule (retry):** required criterion FAIL → validate the gap is real → fix → re-review only the affected criteria. Stop cleanly when all required criteria PASS.
> 7. **Escalation rule (stop):** two consecutive iterations with no criterion progressing, or a blocker needing user input → mark the criterion BLOCKED with a user-facing reason and escalate. NEVER loop indefinitely.
> 8. **Skip rule:** tiny conversational tasks may skip the goal file ONLY with a recorded one-line reason. User-accepted gate skips are recorded in the goal file with reason and scope.
> 9. **Security:** NEVER store secrets, tokens, credentials, or private customer data in goal files — store evidence references and redact sensitive values.
>
> **Blocked until:** active goal resolved (or skip reason recorded) · saved success criteria read before edits · iteration evidence appended after execution · Goal Satisfaction matrix emitted before any PASS verdict.

<!-- /SYNC:goal-contract-satisfaction-loop -->

<!-- SYNC:trade-off-interrogation-gate -->

> **Trade-Off Interrogation Gate** — ALWAYS ask these THREE questions before ANY verdict, score, finding, or recommendation — about the thing under review AND about every recommendation YOU make. — why: naming a benefit without its price is an endorsement, not a review; the costliest trade-offs are the ones nobody wrote down.
>
> 1. **Is there any trade-off?** Name what it SACRIFICES. "None" / "pure win" is an unfinished analysis, NOT an answer — to claim none, state which dimensions you checked and why each is unaffected: future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.
> 2. **Is it worth it?** Weigh gain against sacrifice EXPLICITLY — what is gained (with a metric) · what it costs · WHO pays · WHEN it comes due — then emit **WORTH IT / NOT WORTH IT / UNCLEAR**. "Better" with no metric and no cost FAILS this question. NOT WORTH IT → withdraw or replace the recommendation, never keep it as-is.
> 3. **Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. **MATERIAL** when ANY holds: irreversible / one-way door (data migration, public contract, storage format, vendor lock-in) · cost shifted onto someone else (another team, ops/on-call, future maintainer, end user) · one quality attribute traded for another (correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility) · a boundary crossed (client↔server tier, service contract, event contract, shared library) · a high-consequence path (auth, money, data integrity, breaking change, High/Medium residual risk) · the worth-it verdict is UNCLEAR.
>
> **MATERIAL → STOP and confirm via `AskUserQuestion` BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it via `AskUserQuestion` on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

<!-- /SYNC:trade-off-interrogation-gate -->

<!-- SYNC:test-architecture-execution-contract -->

> **Test Architecture & Execution Contract** — Treat testability as a setup/architecture acceptance condition. For every potentially applicable tier — Unit, Integration/System, E2E, and Performance/Scale (warranted at `T1+`/`B2+`) — record `APPLICABLE` only with evidence of its runner/framework/configuration; otherwise record `N/A — <evidence>` and never fabricate coverage.
>
> 1. **Matrix before implementation:** Record applicability, owner, runner/framework, test root, fixture/data strategy, full command, focused/partial command, zero-match behavior, CI gate, a simple/Windows entry point (a `.cmd` when the project needs one), the **host-mode AND container-mode commands** where the project supports both, and the **environment reach** (which of local / CI / production-shaped this tier can target).
> 2. **Runnable scopes:** Full and focused commands must be copy-ready, fail on invalid or zero-match selections, report exact counts and exit status, and be safe to repeat. E2E uses only configured browser/service commands.
> 3. **Fresh valid state:** Each run/test owns a unique run identity and business-data suffix, arranges through supported public paths, and uses realistic valid data. Reference setup is count-before-create, idempotent, and restart-safe. Intentional accumulation is additive, keyed, and integrity-checked; never hide contamination with destructive reset.
>    Run-scoped cleanup, when supported, is opt-in and idempotent: after evidence capture it may remove only ephemeral resources owned by the current run; it must never delete persistent/additive data or another run's data, reset shared state, or replace no-reset proof.
> 4. **Isolation and fidelity:** Isolate mutable roots and parallel workers; share only immutable/reference data. Preserve real actor pacing and observable arrange barriers. Do not widen retries or weaken assertions to make a scenario pass.
> 5. **Evidence gate:** Report command, scope, identity, seed/accumulation mode, exact result, and repeat proof. For each applicable persistent-state suite, require two consecutive no-reset full runs. Treat line coverage as diagnostic only; use meaningful property/invariant, mutation, change, and behavior coverage signals.
> 6. **Execution modes and environment reach:** A tier claiming two run modes must have **BOTH exercised** — the bare-host command and the fully-containerized command, driven from ONE source of truth for config and topology; record which mode CI exercises, because an unexercised mode rots silently and a claimed-but-rotten mode is worse than one never claimed. The SAME suite must reach local, CI and (where warranted) a production-shaped target, **parameterized by configuration, never by forked test code** — only one fork ever stays maintained, so forking guarantees divergence. A target lacking a required capability reports `ENVIRONMENT-BLOCKED`, never a silent pass. Tests unsafe against production are excluded by an **ENFORCED** mechanism whose absence fails loudly, not by a convention someone must remember; *"runs in prod"* means a safe, declared, **NON-MUTATING** subset. Reproducibility underwrites all of it — pinned toolchain, locked dependencies, declared external prerequisites — which is the difference between a suite that passes anywhere and one that passes on its author's machine. Depth → `SYNC:engineering-foundation-gate` **F1/F2/F3**.
>
> **Ownership:** Architecture/harness defines the matrix; scaffold/workflow makes it runnable; test writers implement tier-specific cases; reviewers verify the contract; the runner reports; seed-data owners preserve uniqueness, idempotency, realism, and accumulation integrity. Missing required evidence blocks setup completion.

<!-- /SYNC:test-architecture-execution-contract -->

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Classify every finding by consequence, not by effort, reviewer preference, or how annoying the fix is. One scale applies to every review, skill, agent, workflow, and host so a tier has the same meaning everywhere. Choose the highest credible consequence supported by evidence; do not lower a tier to make a round pass.
>
> **Finding vs observation (required):** An observation becomes a finding only when it names the affected user/system/data/contract, the shipped consequence, the evidence location, and the normalized tier. `INFO`, advice, preference, duplicate wording, or an unsubstantiated concern is not a finding and must not reopen a loop. If the concern might affect a required behavior or gate but evidence is incomplete, emit `NOT VERIFIABLE` with the missing evidence and keep it unresolved; never silently convert uncertainty into LOW.
>
> | Severity | Action | Definition and examples |
> | --- | --- | --- |
> | CRITICAL | Block immediately; escalate | Immediate material risk if shipped: authentication/authorization or safety bypass; secrets/PII exposure; irreversible destructive action; data loss/corruption; or a silent failure on a critical path. A failed binary gate that makes the result untrustworthy is represented as a separate synthetic blocker by the executable policy (not as an ordinary severity judgment). |
> | HIGH | Must fix before PASS/merge | Material correctness or contract risk: wrong behavior on a supported path; violated business/data invariant; meaningful privacy or authority gap; breaking API/schema/compatibility change; likely harm to users/downstream systems; or a missing proof for a behavior-changing fix. |
> | MEDIUM | Must clear the current round; escalate if the fix needs an owner decision | Bounded but consequential risk: an edge case, resilience/observability/testability/maintainability gap, credible future defect, or local architectural drift whose impact is real but not immediate material loss. An explicit follow-up records the escalation/residual risk; it does not make an open MEDIUM a clean pass. |
> | LOW | Record and defer; never open another fix/re-review round from round 2 onward | Non-blocking polish with no credible present correctness, security, privacy, authority, availability, or data-integrity impact: wording/formatting, minor documentation or convention drift, optional defensive cleanup, or a cosmetic/refinement suggestion. |
>
> **Consequence decision tree (apply in order):** (1) Is a binary gate failed? Keep it as a separate hard blocker (the executable helper represents it as synthetic CRITICAL); do not use the ordinary severity label to hide what failed. Otherwise, would shipping permit immediate material security/safety/authority harm, irreversible destruction, data loss/corruption, or a critical-path silent failure? → **CRITICAL**. (2) Otherwise, does a supported path, invariant, public contract, privacy/authority boundary, compatibility promise, or behavior-changing proof fail with material user/downstream impact? → **HIGH**. (3) Otherwise, is there a bounded but consequential edge, resilience, observability, testability, maintainability, or architectural gap with a credible impact? → **MEDIUM**. (4) Otherwise, is the evidence sufficient to show only non-blocking polish with no credible present material impact? → **LOW**. (5) If the evidence needed to choose between steps 1–4 is missing, → **NOT VERIFIABLE**, not LOW. When multiple tiers fit, select the highest credible consequence; effort, implementation cost, reviewer discomfort, frequency alone, and proximity to the round cap never decide the tier.
>
> **Boundary examples (normalize before applying the round predicate):** an auth bypass, exposed secret/PII, destructive command without an authority gate, or failed required test/generation/parity gate is **CRITICAL**; a wrong supported response, broken invariant/API/schema, meaningful privacy/authority defect, or unproven behavior-changing fix is **HIGH**; a bounded retry/timeout/alert/testability gap or credible maintainability drift is **MEDIUM**; a typo, formatting inconsistency, optional cleanup, or cosmetic suggestion proven not to affect present behavior is **LOW**. A missing fact about any of those boundaries is **NOT VERIFIABLE** until evidence or an explicitly documented residual-risk decision exists.
>
> **Classification procedure (required for every finding):** (1) state the affected user, system, data, contract, or gate; (2) assess consequence if the issue ships; (3) assess exposure/likelihood and reversibility/detectability; (4) select the highest tier justified by those facts; (5) cite `file:line` or equivalent evidence and a confidence percentage. Effort, implementation cost, reviewer discomfort, and proximity to the round cap are never severity inputs. `NOT VERIFIABLE` is a pending evidence state, not one of the four tiers and never a LOW escape hatch: if the unresolved claim could affect required behavior, security, privacy, authority, availability, data integrity, or a binary gate, it remains an open evidence blocker until resolved or explicitly owner-accepted with documented residual risk. Classify an item LOW only when evidence supports the absence of credible present material impact.
>
> **Hard-gate rule:** Binary gates (tests, required artifacts, security must-fix checks, generated parity, policy compliance) are not ordinary severity-rated findings. The executable helper records a failed gate as a synthetic CRITICAL blocker solely so one predicate can carry it; the report must still name the gate and failure evidence. A failed gate blocks at every round, including when all ordinary findings are LOW; never disguise a failed gate as LOW.
>
> **Score-based skills** map their numeric scale onto these tiers — do not invent a parallel vocabulary:
>
> - **0-2 criterion scoring** (e.g. production-readiness-review): `0` = CRITICAL/HIGH (criterion unmet, blocks readiness), `1` = MEDIUM (partial, consequential gap), `2` = pass (no finding). If the criterion is only polish, use LOW rather than forcing a `0`.
> - **Two-axis scoring** (e.g. performance-review, impact × likelihood): high impact + high exposure → CRITICAL/HIGH; material impact with bounded exposure → HIGH/MEDIUM; low impact and low exposure → LOW. Record the axes and why the selected tier is the highest credible consequence.
> - **Scorecards / `/20` grades** (e.g. architecture-scalability-review): the aggregate score and verdict band are separate from finding severity. A sub-80 area is evidence to investigate, not an automatic CRITICAL/HIGH/MEDIUM/LOW label; classify each underlying gap by the consequence decision tree and keep advisory score deductions separate from blocking findings.
>
> **Domain-vocabulary normalization (mandatory):** Specialized skills may keep a local reporting vocabulary, but it MUST feed this same four-tier round predicate — never a second severity system:
>
> - `BLOCKED`, `HARD FAIL`, or `FAIL` is a blocking local verdict, not an automatic CRITICAL label. Classify the underlying consequence as CRITICAL when it is an immediate material risk or failed binary gate; otherwise classify it as HIGH or MEDIUM with evidence, while preserving the local block until the owning gate is satisfied.
> - `WARN` is not permission to ignore a finding. Map it to MEDIUM when the gap is consequential, to LOW only when evidence supports no credible present material impact, or upward to HIGH/CRITICAL when the consequence warrants it. `PASS`/compliant is not a finding.
> - UI `P0`/`P1`/`P2`/`P3`/`P4` map to CRITICAL/HIGH/MEDIUM/LOW/LOW respectively as a starting point; override upward only when the evidence shows a higher shipped consequence. A P0/P1 accessibility or task-completion floor remains a blocking gate even when a local UI report calls it a priority rather than a severity.
> - Numeric SRE/readiness or impact/likelihood scores are evidence inputs, not replacement tiers. Emit the score, the consequence, and the normalized CRITICAL/HIGH/MEDIUM/LOW tier together. `INFO`/advisory observations are not findings unless the evidence shows a material consequence.
>
> A finding's tier drives the gate: CRITICAL/HIGH/MEDIUM remain actionable and blocking under the round policy; LOW may be tracked as a follow-up and, from round 2, does not by itself justify another fix/re-review. An owner decision may explain or schedule an open MEDIUM but does not turn it into a clean pass; owner acceptance never makes a failed binary gate pass and must record scope, rationale, and residual risk.

<!-- /SYNC:severity-rubric -->

<!-- SYNC:engineering-foundation-gate -->

> **Engineering Foundation Gate** — CONDITIONAL, evidence-gated, profile-tiered. Judges the PROJECT'S ENGINEERING FOUNDATION: _can this team build, run, test and change the system safely — anywhere, repeatably, as it grows?_ Its companions judge the running system's DESIGN (`scale-technique-gate`: is technique X present? · `scenario-stress-eval`: does it survive scenario Y?) — a system can score perfectly on both while nobody but its author can build it. **State OUTCOMES, never tools:** detect the stack, research the current ecosystem, present 2–3 options, the user decides, record the decision — best practice turns over, the outcome does not.
>
> 1. **Derive the project profile FIRST — from evidence, never assumed.** `Lifecycle` **G** greenfield (foundation being created) / **B** brownfield (foundation exists, under audit) · scale `T0`–`T3` (**reuse** `scale-technique-catalog.md`, never re-derive) · criticality `B0`–`B3` with its criticality-signal floor (**reuse** `scenario-stress-catalog.md`) · repo shape `R0` single module / `R1` few (2–5) / `R2` many modules, multi-team / `R3` monorepo estate · runtime surface. Cite `file:line`/config/CI + confidence. Unknown axis → state the assumption and take the **LOWER** tier; NEVER default to `T3`/`B3`/`R3` — an over-stated profile turns this gate into busywork a small team correctly ignores.
> 2. **Judge all 7 dimensions — always all 7, never a filtered subset** (an omitted row is indistinguishable from an overlooked one). Depth belongs to the named owner; this gate decides only present/absent:
>    - **F1 Reproducible environment** (ALL profiles — the floor) — one documented path takes a clean machine to a running system; toolchain versions pinned; dependencies locked to exact versions; every external prerequisite declared with a way to obtain or fake it; config environment-injected, never machine-implicit; build deterministic. This is what kills _"works on my machine"_ — not carelessness, but a build depending on ambient state nobody declared. → `scaffold` · `architecture-scalability-review`
>    - **F2 Dual execution modes** (`T1+`, multi-contributor, or containerized target; `B2+` regardless of scale) — the system runs on the **bare host** AND **fully containerized** from ONE source of truth for config and topology, and the suites run in BOTH directions (host-run against a containerized system, and wholly inside a container). Both modes **exercised**, so neither rots. Host mode buys a fast inner loop and a debugger; container mode buys CI/production parity and a trustworthy day one — a project with only one teaches people to work around it undocumented. A mode honestly dropped with a stated reason is `N/A`; the defect is the **claimed-but-rotten** mode. → `scaffold` · `devops` · `production-readiness-review`
>    - **F3 Environment-portable tests** (local+CI all profiles; production-shaped `T1+`/`B2+`) — the SAME suites run against local, CI and production-like targets, **parameterized by configuration, never by forked test code** (only one fork ever stays maintained, so forking guarantees divergence). Missing capability reports `ENVIRONMENT-BLOCKED` rather than silently passing; unsafe-in-production tests are excluded by an **enforced** mechanism whose absence fails loudly, not by a convention someone must remember. _"Runs in prod"_ means a safe, declared, **NON-MUTATING** subset. → `test-architecture-execution-contract` · `integration-test-review`
>    - **F4 Test-strength proof** (wherever tests exist) — evidence the suite **actually fails when the code is wrong**; a passing suite means nothing until it is known to be capable of failing for the right reason. Strongest available first: (a) **automated fault injection** scoped to CHANGED code — a surviving defect is a missing or vacuous assertion; gate on it where the ecosystem offers a workable tool. (b) **Deliberate defect-seeding drill — the universal fallback, needing no tooling and available in every ecosystem:** break the production code behind a top invariant, run the suite, record **WHICH NAMED TEST went red**, restore. Nothing went red ⇒ that behavior has no protection — write the killing test. (c) **Assertion-intent audit:** flag assertions that would still hold under an inverted implementation, that assert only non-nullness or a type, that re-assert the input, or that assert infrastructure bookkeeping instead of the outcome the system owns. **Line coverage is a DIAGNOSTIC, never a gate** — low coverage is a useful negative signal; high coverage is not evidence of quality, and gating on the percentage reliably produces tests written to touch lines rather than protect behavior. **Scope boundary — do NOT re-litigate a solved question:** this gate asks only whether the PROJECT HAS a test-strength mechanism wired into its harness at all; PER-CHANGE enforcement is already owned by `integration-test-review` Gate 1's Mutation Probe Ledger (tool path + manual fallback, ledger required either way). Report the setup gap here, the assertion gap there, never both. → `harness-setup` (sensor design) · `integration-test-review` (per-change enforcement)
>    - **F5 Performance & scale-under-data** (`T1+`/`B2+` for a real tier; `T0`/`B0` = one documented largest-expected-volume check) — performance **MEASURED by something that RUNS and CAN FAIL**, not reasoned about. The companion gates can be fully satisfied by a system that has never once been run against a large dataset; this is the executable counterpart. Requires: a runnable perf tier with a documented command (it belongs in the tier matrix); on-demand **realistic volume AND realistic shape** — distribution, cardinality, skew, not a million identical rows; **named latency/throughput/memory budgets the run ASSERTS** (a perf test that only reports numbers is a dashboard, and eventually nobody reads it); growth compared across **≥2 volumes ~10× apart**, because one data point cannot distinguish O(n) from O(n²); and resource exhaustion as a **tested, bounded** outcome — backpressure, paging or a clean error rather than an OOM kill, with unbounded result-sets, unbounded in-memory accumulation and unbounded concurrency provably absent or bounded on the paths that matter. State whether a number is a regression signal or a capacity statement. → `performance-review` · `seed-test-data`
>    - **F6 Build & change scalability** (`R1+` declared style + boundaries; `R2+` computable affected set, enforced checks, measured incrementality) — build/test cost and blast radius **do NOT grow with the codebase**. Every project is fast on day one; the foundation question is whether the tenth module costs what the second did. Requires: the affected module/sub-domain set is **COMPUTABLE** because inter-module dependencies are explicit and declared; incrementality and caching are real and **measured** (claimed caching that never hits is an invisible failure); boundaries enforced **MECHANICALLY**, since unenforced boundaries decay silently until the affected set is "everything"; a **declared** architecture style (modular monolith / clean / hexagonal / layered — which one matters far less than that one is declared, written down and enforced, because an undeclared style is indistinguishable from none after two years); implementation hidden behind abstraction so a technology swaps without touching business code (depth → `complexity-prevention`); and a fast scoped inner-loop check — if the only available check is the slow exhaustive one, that is the finding. **Scope boundary:** `architecture-scalability-review` **G2 Build & CI Scalability** already SCORES incremental/affected-only/caching/monorepo posture and **G4** scores boundary enforcement — where that review has run, cite its verdict rather than re-scoring; this gate only confirms the dimension was examined and is not silently absent. → `architecture-scalability-review` (G2/G4 depth) · `architecture-review` (diff-level boundary drift) · `complexity-prevention` (cost of change in the code itself)
>    - **F7 Mechanical quality harness** (format + lint + type/static analysis + build/test at ALL profiles; architecture-fitness `R1+`; dependency health + secret scanning wherever real data ships, unconditional at `B2+`; complexity/duplication + drift `R1+`/`T1+`) — no human reviewer spends attention on a defect class a machine could have caught; reviewer attention is the scarcest resource in the project. **Account for EVERY class or record it `N/A` with a reason** — an unlisted class is an unexamined one: formatting · lint/correctness · type & static analysis · complexity & duplication · **executable architecture-fitness** · dependency vulnerability & license · secret scanning · build/test gates plus the **F4** signal · documentation/config drift. Local and CI must run the **SAME** command, configuration and version (divergence means CI failures nobody can reproduce); checks must **ENFORCE**, not warn (an unread warning stream is not a harness); strictest reasonable defaults, loosened only with a recorded reason, since a large silent suppression list is itself a finding; cheap checks first, expensive last. Brownfield adoption uses a **ratchet** — fail on NEW violations, tolerate the existing baseline — which counts as `PRESENT`, not partial, because it stops regression from day one. → `linter-setup` · `harness-setup` · `security-review`
> 3. **Assign one verdict per dimension:** `PRESENT` (achieved and proven by cited evidence) · `MISSING-WARRANTED` · `PARTIAL-WITH-PATH` (gap named + concrete incremental step) · `N/A-by-profile` (below the warranting profile — **a correctly-lean project is a PASS here, never a gap; never report it as a deficiency**) · `OVER-ENGINEERED` (present but unwarranted → advise AGAINST, name the carrying cost) · `UNVERIFIED` (could not be checked — say so honestly; **NEVER score an unverified dimension `PRESENT`**).
> 4. **Authority is context-split — the one place this gate differs from its two companions.** **CREATING** a foundation (greenfield init, scaffold, a plan standing up build/test/CI) → a `MISSING-WARRANTED` dimension is **BLOCKING**: you are choosing the foundation right now, so omitting a warranted one must be an explicit decision, not a silent default. **AUDITING** an existing foundation (brownfield review, architecture audit, changes review) → **ADVISORY ONLY**: emit the matrix plus a prioritized adoption path and **NEVER mutate any score, `/20`, `/24`, verdict band, or gate PASS/FAIL**. — why the split: the cost of adding a foundation is near zero at creation and high afterwards, so strictness should track that cost; blocking a review of a ten-year-old codebase on foundations it never had produces a useless report, not a better project.
> 5. **Anti-over-engineering guard (first-class, and symmetric).** Do NOT demand a container mode of a single-author local utility, a distributed load-generation platform for a small internal service, affected-set computation or boundary enforcement for a single module, or four overlapping analyzers reporting one defect class (the carrying cost is noise and slow builds, and people learn to ignore the output). Splitting a small system into many modules to _look_ modular buys a distributed monolith — the coupling survives the split while the build cost doubles; the trigger is real module and team count, never aesthetics. Symmetric with the criticality floor: never UNDER-harden a `B2+` system merely because its traffic is low.
> 6. **Every brownfield finding names the smallest next step that is valuable on its own.** Seven `MISSING-WARRANTED` verdicts with no first step is a demoralizing document nobody acts on. Default ladder, each rung independently valuable and making the next cheaper: pin the toolchain & commit the lockfile → make one local command that CI also runs → ratchet the harness on (fail-on-new) → run the defect-seeding drill on the top invariants → repair the missing execution mode → seed a realistic volume and assert ONE budget → declare the style, then enforce dependency direction. Deviate on evidence, and say why; what is not acceptable is a gap list with no first step.
> 7. **Output — Foundation Readiness Matrix:** `dimension | warranted at this profile? | present? | verdict | evidence (file:line/config/CI) | smallest next step`, preceded by the derived profile with per-axis evidence and confidence, followed by the ordered adoption path (brownfield) or the blocking list (greenfield). Full catalog — per-dimension proof lists, warranting matrix, adoption ladder → `.claude/docs/engineering-foundation-catalog.md`. **Drift-guard: profile axes, dimensions, verdicts and warranting tiers are AUTHORITATIVE in that catalog — update it FIRST, then re-run `.claude/scripts/inject_engineering_foundation_gate.py` to re-propagate. Scale tier stays single-sourced in `scale-technique-catalog.md`; business criticality in `scenario-stress-catalog.md`.**
>
> **BLOCKED until:** `- [ ]` profile derived from evidence (lifecycle + `T` + `B` + `R`, lower tier when unknown) `- [ ]` all 7 dimensions judged, none omitted `- [ ]` matrix emitted with `file:line`/config/CI evidence `- [ ]` anti-over-engineering guard applied `- [ ]` authority confirmed — creating ⇒ blocking, auditing ⇒ advisory-only with no score mutation `- [ ]` every brownfield gap carries a smallest-next-step

<!-- /SYNC:engineering-foundation-gate -->

<!-- SYNC:scale-technique-gate:reminder -->

**IMPORTANT MUST ATTENTION** scale-technique gate: derive the scale tier from evidence FIRST (T0 internal · T1 <10k · T2 10k–1M · T3 millions+), then judge each warranted technique `PRESENT`/`MISSING-WARRANTED`/`N/A-by-scale`/`OVER-ENGINEERED`. Advise on warranted-but-missing gaps AND advise AGAINST unwarranted heavyweight techniques (anti-over-engineering). **ADVICE-ONLY — emit the Technique Applicability Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scale-technique-catalog.md` (authoritative for tier thresholds & per-technique warranting tiers — on any change update the catalog FIRST, then re-run `inject_scale_technique_gate.py`).

<!-- /SYNC:scale-technique-gate:reminder -->

<!-- SYNC:scenario-stress-eval:reminder -->

**IMPORTANT MUST ATTENTION** scenario-stress gate: reuse the scale tier `T0`–`T3` AND derive business-criticality `B0`–`B3` from evidence first — apply the **criticality-signal floor** (regulated/PII/financial/health data · money movement · auth/identity · legal-compliance → at least `B2` even absent SLA docs; do NOT default to `B3`). Select only the scenarios the `B`/`T` combination warrants, then walk each (simulate → trace → failure signature → self-heal/MTTR → trade-off) and assign `WITHSTANDS`/`DEGRADES-GRACEFULLY`/`FAILS-HARD`/`N/A-by-business`/`OVER-HARDENED`. Anti-over-engineering is first-class (a lean system that needs no HA/DR is a PASS) AND symmetric (never under-harden a `B2`+ system for low traffic). **ADVICE-ONLY — emit the Scenario Stress Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scenario-stress-catalog.md` (authoritative for scenarios/verdicts/business-tiers — on any change update the catalog FIRST, then re-run `inject_scenario_stress_gate.py`; scale tier stays single-sourced in `scale-technique-catalog.md`).

<!-- /SYNC:scenario-stress-eval:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **is there any trade-off?** name what it SACRIFICES (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis, so state the dimensions checked; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it material enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `AskUserQuestion` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; NEVER bury one as a Low-severity note, NEVER decide it silently, and NEVER let delivery or convergence pressure authorize a one-way door. — why: an un-walked-back one-way door is the user's call to make, not the reviewer's.
- **MANDATORY — non-asking contexts escalate BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. There the duty is REDIRECTED, not waived — still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, **state the unconfirmed MATERIAL trade-off in your RETURNED verdict/summary so the CALLER escalates it** (a note only in an on-disk report is not a handoff), and never emit an unqualified PASS. Applies ONLY where the user is genuinely unreachable (spawned sub-agent, terminal validate mode, headless run) — if you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset:reminder -->
**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.
<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->
**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.
<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Before implementation, record evidence-backed Unit/Integration/System/E2E **and Performance/Scale** (`T1+`/`B2+`) applicability (or explicit N/A), copy-ready full + focused commands, zero-match behavior, a simple/Windows entry point, **the host-mode AND container-mode commands where both are supported, plus each tier's environment reach (local / CI / production-shaped)**, unique run identity, realistic valid data, idempotent/restart-safe reference setup, intentional additive accumulation, parallel isolation, exact results, and two no-reset full runs for each applicable persistent-state suite. **Both claimed run modes must be EXERCISED** (an unexercised mode rots; a claimed-but-rotten mode is worse than one never claimed), the same suite reaches every target **parameterized by config, never by forked test code**, a missing capability reports `ENVIRONMENT-BLOCKED` rather than passing silently, and *"runs in prod"* means a safe, declared, **NON-MUTATING** subset excluded by an enforced mechanism, not by convention.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:engineering-foundation-gate:reminder -->

**IMPORTANT MUST ATTENTION** engineering-foundation gate — judges whether the team can **build, run, test and change** the system safely, anywhere, as it grows (its companions judge the running system's design; a system can pass both while nobody but its author can build it). Derive the profile from evidence FIRST: lifecycle **G**reenfield/**B**rownfield · scale `T0`–`T3` (reuse `scale-technique-catalog.md`) · criticality `B0`–`B3` with its signal floor (reuse `scenario-stress-catalog.md`) · repo shape `R0`–`R3` — take the **LOWER** tier when unknown, NEVER default to `T3`/`B3`/`R3`. Judge **ALL 7** dimensions, never a subset: **F1** reproducible environment (pinned toolchain, locked deps, declared prerequisites, deterministic build — kills _"works on my machine"_) · **F2** dual execution modes (bare host AND fully containerized from one source of truth, suites runnable BOTH directions, both exercised so neither rots — the defect is the claimed-but-rotten mode) · **F3** environment-portable tests (same suites local/CI/production-shaped, parameterized by CONFIG not forked code; missing capability ⇒ `ENVIRONMENT-BLOCKED` not silent pass; _"runs in prod"_ = a safe NON-MUTATING subset) · **F4** test-strength proof (automated fault injection on changed code where a tool exists, else the universal **defect-seeding drill** — break the code behind a top invariant, record WHICH NAMED TEST went red, restore; nothing red ⇒ no protection. **Line coverage is a DIAGNOSTIC, never a gate**) · **F5** performance measured by something that **RUNS and CAN FAIL** (realistic volume AND shape, **asserted** budgets not a dashboard, ≥2 volumes ~10× apart to expose super-linear growth, resource exhaustion bounded rather than an OOM kill) · **F6** build & change scalability (computable affected set, measured incrementality, **mechanically** enforced boundaries, a **declared** architecture style, implementation hidden behind abstraction) · **F7** mechanical harness completeness (every machine-catchable class accounted for or `N/A`; local and CI run the SAME command; checks **ENFORCE**, not warn; brownfield uses a fail-on-new **ratchet**). Verdicts: `PRESENT`/`MISSING-WARRANTED`/`PARTIAL-WITH-PATH`/`N/A-by-profile`/`OVER-ENGINEERED`/`UNVERIFIED`. **Authority splits — CREATING a foundation ⇒ `MISSING-WARRANTED` is BLOCKING; AUDITING one ⇒ ADVISORY ONLY, never mutating any score, verdict band or PASS/FAIL.** Anti-over-engineering is first-class and symmetric (a correctly-lean project is a PASS; never under-harden a `B2+` system for low traffic). Every brownfield gap names the smallest next step. **State OUTCOMES, never tools.** Full catalog → `.claude/docs/engineering-foundation-catalog.md` (authoritative — update it FIRST, then re-run `inject_engineering_foundation_gate.py`).

<!-- /SYNC:engineering-foundation-gate:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** Testability contract: resolve evidence-backed Unit/Integration/System/E2E rows, copy-ready full/focused commands, zero-match failures, owner/root/data, CI/simple-Windows entry, unique run identity, and repeat proof before claiming setup, review, or test completion.
**IMPORTANT MUST ATTENTION Goal:** Grade project architecture & scalability quality on the evidence-backed scorecard — build/CI scalability, distributed-monolith risk, module isolation, dependency discipline, loose coupling, horizontal scaling, DRY, abstraction, clean architecture, observability, and delivery — routing sibling-owned depth (security, performance, production-readiness) rather than duplicating it.

**IMPORTANT MUST ATTENTION main steps (run in order):** (1) resolve `mode=init`/`mode=audit` + scope; (2) load project context + evidence; (3) read `references/scorecard.md`; (4) score all 10 areas 0-2 with evidence; (5) run pass/fail gates G1-G7; (6) emit the report under `plans/reports/`.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Scale-Technique Gate (advisory):** Derive the scale tier from evidence FIRST (T0 internal · T1 <10k · T2 10k–1M · T3 millions+), then judge each warranted technique `PRESENT`/`MISSING-WARRANTED`/`N/A-by-scale`/`OVER-ENGINEERED`. **ADVICE-ONLY — surface the Technique Applicability Matrix as guidance; NEVER mutate the scorecard score, a verdict band, or a pass/fail gate.**

**IMPORTANT MUST ATTENTION** every score carries `file:line`/config/infra evidence or an explicit `N/A - reason`; confidence >80% to act, <60% do NOT recommend — NEVER present a guess as fact.
**IMPORTANT MUST ATTENTION** the Technique Applicability Matrix is ADVISORY guidance only — advise on warranted-but-missing gaps AND advise AGAINST over-engineering below tier, but it NEVER changes the scorecard score, a verdict band, or a gate result (per user decision 2026-07-06).
**IMPORTANT MUST ATTENTION** anti-over-engineering is first-class — a correctly-lean small system is a PASS, never a gap; do NOT recommend Kubernetes, sharding, multi-region, or service mesh below their warranting tier.
**IMPORTANT MUST ATTENTION** self-audit every grade, gap and recommendation against the 11 thinking red flags (`.claude/docs/architecture-knowledge.md` §20.3) BEFORE emitting — a deduction for a scale you cannot evidence, a tool named before the requirement, "best practice" with no named forces, or a recommendation whose SACRIFICE you cannot state is re-derived from evidence or dropped, NEVER reworded — why: an unevidenced deduction reads as rigour and sends the team to fix a problem they do not have.
**IMPORTANT MUST ATTENTION** G5 requires a named ESCAPE HATCH out of a metastable high-load state (shed / drain / warm / restart at lower concurrency) — a self-sustaining retry-cache-queue loop OUTLIVES its trigger, so load removal alone does not recover the system; and NEVER accept a latency number without knowing how the load was generated (coordinated omission deletes the worst samples).
