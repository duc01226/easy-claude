---
name: architecture-scalability-review
version: 1.1.0
description: '[Architecture] Use when a workflow step or the user asks for an architecture and scalability grade. Build/CI scale, distributed-monolith risk, module isolation, coupling, horizontal scaling, clean architecture, observability.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Grade a project or planned architecture against architecture + scalability criteria and produce an evidence-backed `/20` verdict (`STRONG` / `NEEDS WORK` / `HIGH RISK`) before scale or delivery decisions harden; route deep checks to owner skills.

**Summary:**
- **Purpose/ownership:** score 10 areas, apply G1-G7 and TVC, route sibling-owned depth, and emit one report; this skill owns the scorecard, not sibling checklists.
- **Ordered run:** (1) resolve `mode=init`/`mode=audit` + scope; (2) load context/evidence; (3) read `references/scorecard.md`; (4) score all 10 areas 0-2; (5) run G1-G7, then TVC; (6) emit the report under `tmp/reports/`; (7) validate sub-80/risk findings with `/why-review` (max 2 passes), or record the zero-risk skip.
- **Evidence/TVC:** every score needs `file:line`, command/artifact proof, or `N/A - reason`; otherwise score `0`. Resolve Unit/Integration/System/E2E applicability plus owner/root/data, full+focused commands, zero-match behavior, CI/simple Windows/macOS/Linux entry, unique run/data identity, and repeat proof; unresolved applicable fields block handoff.
- **Modes/advisories:** `init` scores planned greenfield evidence; `audit` scores existing evidence. Self-audit 11 red flags before emission; treat `— VERIFY` rows/section banners as unverified and confirm named sources or project docs. Technique + Scenario are advice-only and never change `/20`, verdict, or gates; new tools require user confirmation.

**Workflow (run in order):**

1. Resolve `mode=init` or `mode=audit` + target scope.
2. Load project context and evidence.
3. Read `references/scorecard.md`.
4. Score all 10 areas 0-2 with evidence.
5. Run pass/fail gates (G1-G7), then the non-scoring TVC.
6. Emit the architecture scalability review report under `tmp/reports/`.
7. When triggered, validate sub-80 grades/risk findings with `/why-review` (maximum 2 passes); otherwise record the zero-risk skip.

**Key Rules:**

- MUST ATTENTION every score carries `file:line`, command output, architecture-artifact evidence, or explicit `N/A - reason`; unproven criteria score `0`.
- MUST ATTENTION this skill owns the scorecard, not the deep review of every concern — route depth to the sibling skills named in the Ownership Matrix; NEVER duplicate their checklists.
- New Tech/Lib: `N/A` by default. If the audit recommends Nx, Turborepo, Bazel, a new message broker, a new observability stack, or another tool, present it for user confirmation before implementation.
- `mode=init` scores planned architecture from greenfield artifacts before implementation planning; `mode=audit` scores an existing brownfield project from real source, config, CI, docs, and ADR evidence.

## When To Use

- Greenfield/project-init flow after `architecture-design`, before implementation planning hardens decisions.
- On demand for project quality, architecture scalability, distributed-monolith risk, module boundaries, build scalability, or setup quality.
- Periodic architecture health check for a growing codebase.

NEVER use this as the every-change diff reviewer. Per-change regression checks belong in `architecture-review`, `performance-review`, `production-readiness-review`, and other sibling reviewers already wired into `workflow-review-changes`.

> **Combined audit:** For a whole-project architecture + compliance + production-readiness audit, run `/architecture-review-full` (or `/start-workflow workflow-architecture-audit`); it fans out this skill, `architecture-review`, and `production-readiness-review` as parallel sub-agents and synthesizes one report.

## Scope And Modes

### `mode=init`

Score intended architecture before implementation. Evidence may include architecture reports, ADRs, tech-stack decisions, domain-analysis outputs, build/CI plans, deployment plans, and scaffold handoff tables.
Use `planned` labels when implementation is absent. Score `2` only when the plan names enforceable mechanisms, not intent alone.
### `mode=audit`

Score an existing repository. Evidence must come from source, build/CI config, ADRs, reference docs, tests, dependency-boundary tooling, deployment/IaC files, and graph/grep commands.
If `.code-graph/graph.db` exists, run at least one graph command on key architecture files before concluding.

## Required Context

Read these before scoring:

- `docs/project-config.json`
- Under the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path): `docs-index-reference.md`, `lessons.md`, `project-structure-reference.md`
- Relevant stack docs from the docs index, based on target scope
- Accepted ADRs under the ADR root (default `docs/adr/**`; a `docsRoots.adr.path` entry in `docs/project-config.json` overrides the path), when present
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

When a concern belongs to a sibling, record a one-line route pointer and continue scoring from evidence; NEVER expand into the sibling's checklist.

## Workflow

Run in order; scorecard validation follows report emission when its trigger applies.

### Step 1: Resolve Mode And Scope

Determine mode (`mode=init` or `mode=audit`), target (repo, plan directory, service/module, or artifact set), evidence roots (source, CI/build, ADRs, reference docs, workflow outputs), and report slug (project/module name).
If mode is missing, infer from context:
- Greenfield/project-init/plan artifacts only -> `mode=init`
- Existing repo/source/config review -> `mode=audit`

### Step 2: Gather Evidence

Use narrow grep/glob searches first. For brownfield audits, collect:

- Build files and CI pipeline config
- Workspace/monorepo config, if present
- Dependency-boundary or architecture-rule tooling
- Module/service folder structure
- Message bus, event, API, and cross-context communication patterns
- Deployment, IaC, observability, and runtime config
- ADRs and architecture reports

When `.code-graph/graph.db` exists, run a graph trace on key architecture/module-boundary files. If relevant files are absent, record the limitation and continue with grep/file evidence.

### Step 3: Score The 10 Areas

Read `references/scorecard.md`, then score each area:

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

After scoring, invoke `SYNC:scale-technique-gate`: derive the scale tier from users/RPS, SLO, data volume, tenancy, and topology with `file:line`/config/infra evidence + confidence; emit the **Technique Applicability Matrix** (`technique | tier-warranted? | present? | verdict | advice | evidence`) for all 10 concern groups; advise on warranted gaps and flag unwarranted `OVER-ENGINEERED` techniques.

> **Advisory only — does NOT change the `/20` score or any verdict band.** A `MISSING-WARRANTED` technique is guidance, never a deduction; a correctly-lean small system stays a PASS. Full catalog → `.claude/docs/scale-technique-catalog.md`.

### Step 4: Run Pass/Fail Gates

Run these pass/fail overlays after scoring; they do not change `/20` math.

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

Run this cross-cutting setup gate after G1-G7 and before report emission. Consume architecture-design plus scaffold/harness evidence; do not re-implement tier-specific child checklists.

1. Verify one row each for Unit, Integration/System, and E2E. Each row is `APPLICABLE` only with runner/framework/configuration/root evidence, or `N/A — {specific evidence}`. An E2E `N/A` must cite the verified absence of a browser runner/configuration/command, never the absence of a preferred tool.
2. For every applicable row, verify copy-ready full and focused commands, invalid/zero-match non-zero behavior, CI gate, simple Windows/macOS/Linux entry point where needed, owner, and exact result fields.
3. Verify the declared run identity and business-data suffix, supported public setup path, realistic valid data, idempotent/restart-safe reference setup, additive persistent-data policy, mutable-root/parallel-worker isolation, pacing/arrange barrier, and two consecutive no-reset full runs for each applicable persistent-state suite. Missing or placeholder evidence is `BLOCKED`, not a guessed pass.
4. Emit `TVC: PASS | PARTIAL | BLOCKED` with the matrix, evidence, owner, and follow-up. `PASS` means every tier is resolved and every applicable field is evidenced; `PARTIAL` records the bounded gap without inventing a tier or command.

TVC is setup/verification status, not an eighth score area. It MUST NOT change any 0-2 grade, `/20` denominator or total, verdict band, G1-G7 status, or advisory matrix. `BLOCKED` prevents a `setup complete` claim and remains a report follow-up, not a score deduction.

### Step 5: Emit Report

Write `tmp/reports/architecture-scalability-review-{YYMMDD}-{HHmm}-{slug}.md`.

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

| Tier | Applicability + evidence | Owner | Runner/config/root | Data + run identity | Full command | Focused/partial command | Zero-match behavior | CI / simple Windows/macOS/Linux entry point | Repeat proof |
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

## Scorecard Validation Gate (why-review; required for any sub-80 grade or risk finding)

> **Purpose:** A scorecard is a JUDGMENT. Validate it adversarially before handoff so a mis-scored area or inflated risk finding does not become ground truth. This gate validates findings only; fixes route to the owning sibling and this skill does not self-converge a fix-loop.

**Trigger:** Any area below 80 or any risk/gap finding. Skip ONLY when every area is ≥80 with zero risk findings.

**Protocol:**

1. Read the finalized report from `tmp/reports/{skill}-{date}-{slug}.md` (or the exact path written).
2. Invoke `/why-review --validate-findings <report-path>`; verify every sub-80 grade/risk finding has `file:line` evidence and clears the finding-survival bar.
3. **If why-review demotes/removes a grade or finding:** update the scorecard, add `## Why-Review Validation Notes`, and cite what changed + why.
4. **If validation changes the scorecard:** re-run this gate, maximum 2 passes, until remaining grades/findings are validated. No fix-loop: route fixes to siblings; do not restart this review over its own fixes.

**Anti-bias (MANDATORY before emitting):** steel-man each grade one band better and one band worse; only a grade surviving both arguments ships. An unchallenged grade is not validated.

> **Architecture self-audit (§20.3):** Reject tool-first choices, unevidenced scale, unnamed sacrifices/forces, unjustified layers/splits, mishandled reversibility/consistency, unknown first load break, and decisions the maintainer cannot explain.
>
> **MUST ATTENTION READ** `.claude/docs/architecture-knowledge.md` §20.3 before applying this audit.

**Self-audit against the thinking red flags (MANDATORY before emitting):** run the 11 red flags in `.claude/docs/architecture-knowledge.md` §20.3 against every grade, gap and recommendation. The four that fire most often in a scorecard: **grading down for a scale you cannot evidence** · **recommending a tool before stating the requirement** · **"best practice" with no named forces** · **cannot say what your recommendation SACRIFICES**. Any hit invalidates the GRADE's reasoning — re-derive it from evidence or drop the finding; NEVER just reword it. — why: an unevidenced deduction reads as rigour and sends the team to fix a problem they do not have.

## Completion Criteria

- All 10 areas are scored.
- Every score has evidence or explicit `N/A - reason`.
- All gates have `pass`, `partial`, `fail`, or `N/A - reason`.
- Cadence matrix maps each area to init/on-demand and every-change homes.
- Sibling deep checks are routed, not duplicated.
- TVC has a resolved Unit/Integration/System/E2E matrix with evidence-backed applicability or N/A, commands, owners, data/run policy, and repeat proof.
- TVC remains non-scoring and does not alter the `/20` score, verdict band, G1-G7, or advisory semantics.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `engineering-foundation-gate` — Seven engineering-foundation dimensions judged by project profile; creating or reviewing how a project is built, run, tested or checked → .claude/skills/shared/protocols/engineering-foundation-gate.md
- `goal-contract-satisfaction-loop` — Save the goal in a file and loop until every saved criterion passes; executing work against a user goal → .claude/skills/shared/protocols/goal-contract-satisfaction-loop.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `review-principle-awareness` — Classify the change context first, then apply the current principles that fit it; starting any review → .claude/skills/shared/protocols/review-principle-awareness.md
- `scale-technique-gate` — Which scale techniques a system warrants, and which it does not; reviewing architecture or production readiness → .claude/skills/shared/protocols/scale-technique-gate.md
- `scenario-stress-eval` — Judge the system under concrete failure and load scenarios; evaluating resilience or production readiness → .claude/skills/shared/protocols/scenario-stress-eval.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
- `trade-off-interrogation-gate` — Three trade-off questions before any verdict, score or recommendation; rendering a verdict or recommending an option → .claude/skills/shared/protocols/trade-off-interrogation-gate.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:scale-technique-gate:reminder -->

**IMPORTANT MUST ATTENTION** scale-technique gate: derive the scale tier from evidence FIRST (T0 internal · T1 <10k · T2 10k–1M · T3 millions+), then judge each warranted technique `PRESENT`/`MISSING-WARRANTED`/`N/A-by-scale`/`OVER-ENGINEERED`. Advise on warranted-but-missing gaps AND advise AGAINST unwarranted heavyweight techniques (anti-over-engineering). **ADVICE-ONLY — emit the Technique Applicability Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scale-technique-catalog.md` (authoritative for tier thresholds & per-technique warranting tiers — on any change update the catalog FIRST, then re-run `inject_scale_technique_gate.py`).

<!-- /SYNC:scale-technique-gate:reminder -->

<!-- SYNC:scenario-stress-eval:reminder -->

**IMPORTANT MUST ATTENTION** scenario-stress gate: reuse the scale tier `T0`–`T3` AND derive business-criticality `B0`–`B3` from evidence first — apply the **criticality-signal floor** (regulated/PII/financial/health data · money movement · auth/identity · legal-compliance → at least `B2` even absent SLA docs; do NOT default to `B3`). Select only the scenarios the `B`/`T` combination warrants, then walk each (simulate → trace → failure signature → self-heal/MTTR → trade-off) and assign `WITHSTANDS`/`DEGRADES-GRACEFULLY`/`FAILS-HARD`/`N/A-by-business`/`OVER-HARDENED`. Anti-over-engineering is first-class (a lean system that needs no HA/DR is a PASS) AND symmetric (never under-harden a `B2`+ system for low traffic). **ADVICE-ONLY — emit the Scenario Stress Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scenario-stress-catalog.md` (authoritative for scenarios/verdicts/business-tiers — on any change update the catalog FIRST, then re-run `inject_scenario_stress_gate.py`; scale tier stays single-sourced in `scale-technique-catalog.md`).

<!-- /SYNC:scenario-stress-eval:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `AskUserQuestion` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:engineering-foundation-gate:reminder -->

**IMPORTANT MUST ATTENTION** engineering-foundation gate — judges whether the team can build, run, test, and change the system repeatably as it grows. Derive lifecycle, scale, criticality, repository shape, and runtime from evidence; take the lower supported tier when unknown. Judge all 7 dimensions, using `N/A-by-profile` with evidence when a concern truly does not apply. **F1** reproducible build/run/test path · **F2** document and exercise each supported or required execution mode; dual host/container or other modes only when the project uses or needs them · **F3** environment portability at applicable local/CI/production-shaped targets · **F4** meaningful test-strength evidence without making one mutation tool universal · **F5** measured performance where scale/risk warrants it · **F6** change/build scalability where the repository has meaningful module boundaries · **F7** mechanical checks selected for the stack/profile. For each, judge outcomes rather than tools, and preserve anti-over-engineering. Foundation creation may block on missing warranted outcomes; brownfield audits advise and name the smallest next step. Catalog → `.claude/docs/engineering-foundation-catalog.md` (update first, then re-run `inject_engineering_foundation_gate.py`).

<!-- /SYNC:engineering-foundation-gate:reminder -->

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `/project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Grade a project or planned architecture against architecture + scalability criteria and produce an evidence-backed `/20` verdict (`STRONG` / `NEEDS WORK` / `HIGH RISK`) before scale or delivery decisions harden; route deep checks to owner skills.
**IMPORTANT MUST ATTENTION scorecard scope:** assess all 10 areas — Build & CI Scalability, Architecture Pattern/distributed-monolith, Module Isolation, Dependency Discipline, Loose Coupling, Horizontal Scaling, DRY, Abstraction/Easy-to-Change, Clean Architecture, and Observability & Delivery — then route sibling-owned depth instead of duplicating it.
**IMPORTANT MUST ATTENTION main steps (same order):** (1) resolve `mode=init`/`mode=audit` + scope; (2) load project context + evidence; (3) read `references/scorecard.md`; (4) score all 10 areas 0-2 with evidence; (5) run G1-G7, then TVC; (6) emit the report under `tmp/reports/`; (7) validate sub-80/risk findings with `/why-review` (maximum 2 passes), or record the zero-risk skip.
**IMPORTANT MUST ATTENTION modes/gates:** `mode=init` scores planned greenfield evidence; `mode=audit` scores existing evidence. Every score needs proof or explicit `N/A - reason`; unproven criteria score `0`. `TVC: BLOCKED` prevents a `setup complete` claim but never changes `/20`.
**IMPORTANT MUST ATTENTION** Testability contract: resolve evidence-backed Unit/Integration/System/E2E rows, owner/root/data, copy-ready full/focused commands, zero-match failures, CI/simple Windows/macOS/Linux entry, unique run identity, and repeat proof before claiming setup, review, or test completion.
**IMPORTANT MUST ATTENTION advisory boundaries:** derive scale and business-criticality from evidence; Technique and Scenario matrices advise only and NEVER mutate `/20`, verdict, or G1-G7. Engineering Foundation `MISSING-WARRANTED` blocks when creating a foundation and stays advisory when auditing. A correctly-lean system is a PASS; new Tech/Lib recommendations require user confirmation.
**IMPORTANT MUST ATTENTION scale-technique gate:** derive T0 internal/single-instance, T1 small SaaS (<10k users), T2 high-scale (10k–1M), or T3 massive/multi-region (millions+) from evidence, then emit `PRESENT`/`MISSING-WARRANTED`/`N/A-by-scale`/`OVER-ENGINEERED`. Advise against unwarranted heavyweight techniques.
**IMPORTANT MUST ATTENTION scenario-stress gate:** reuse `T0`–`T3`, derive `B0`–`B3` with the criticality-signal floor, select warranted scenarios, trace stimulus → break path → failure signature → self-heal/MTTR → trade-off, and emit the advisory matrix. NEVER turn it into a score, verdict, or gate result.
**IMPORTANT MUST ATTENTION** self-audit every grade, gap, and recommendation against the 11 thinking red flags in `.claude/docs/architecture-knowledge.md` §20.3 BEFORE emitting. A scale deduction without evidence, tool-first recommendation, unnamed forces/sacrifice, or `— VERIFY` source is re-derived or dropped, NEVER reworded.
**IMPORTANT MUST ATTENTION** G5 requires a named ESCAPE HATCH from a metastable high-load state (shed / drain / warm / restart at lower concurrency). NEVER accept a latency number without its load-generation method; coordinated omission can delete the worst samples.
**IMPORTANT MUST ATTENTION trade-offs:** ALWAYS ask the 3 trade-off questions before every verdict, score, finding, or recommendation; name sacrifice, weigh gain vs cost, decide materiality, and confirm material choices with the user or hand them off. A material unconfirmed trade-off can NEVER be an unqualified PASS.

**Anti-Rationalization:**

| Evasion | Rebuttal |
| --- | --- |
| “This is only a diff.” | Keep the project-level `/20` scorecard; this skill is not the every-change diff reviewer. |
| “The plan names it.” | Require `file:line`/command/artifact proof or explicit `N/A - reason`; otherwise score `0`. |
| “The tool is standard.” | State the requirement, trade-off, and user confirmation before recommending new Tech/Lib. |
| “A lean system lacks scale tooling.” | Derive `T`/`B` from evidence and apply the anti-over-engineering guard; do not invent a scale gap. |
| “A latency number proves capacity.” | Require the load-generation method; G5 is at most `Partial` without it. |
