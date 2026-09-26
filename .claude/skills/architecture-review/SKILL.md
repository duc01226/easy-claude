---
name: architecture-review
version: 2.3.0
description: '[Code Quality] Use when a workflow step or the user asks for an architecture compliance review. Checks layers, messaging, service boundaries, CQRS, repos, entity events and data/consistency/tenancy boundaries.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Review changed code against the architecture and contracts the project actually establishes. Preserve ownership, consistency, boundaries, and generated artifact integrity; classify framework-specific pattern checks from project evidence so the handoff carries a trustworthy, actionable PASS/WARN/BLOCKED decision.

**Summary:**

- **Purpose:** validate a changeset against architecture rules the project records in its OWN reference docs; classify every finding PASS/WARN/BLOCKED with `file:line` proof; self-validate before handoff — one reviewer in the `workflow-review-changes` pipeline.
- **Main phases — run in order:** Phase 0 load architecture rules → Phase 1 determine scope → Phase 2 blast radius (if `graph.db`) → Phase 3 architecture review (13 categories) → Phase 4 finalize compliance report → Phase 5 `/why-review` self-validation gate → Next Steps `AskUserQuestion` (standalone only — under `--report-only`, a parent skill/workflow, or a sub-agent, next steps return in the summary).
- **The 13 Phase-3 categories — review EVERY applicable one, serially:** 0 quality-tooling baseline · 1 architecture boundaries and layers · 2 messaging and delivery · 3 application conventions such as CQRS, validation, and mapping · 4 data access · 5 service-pattern era · 6 side effects and events · 7 service/module boundaries · 8 frontend architecture (frontend files only) · 9 ADR conformance · 10 spec-loop discipline · 11 scalability and coupling regression · **12 data, consistency, and tenancy boundaries**. Use the Phase-3 evidence gate for all pattern-specific checks, plus Categories 9–12's stated triggers. Per applicable check: `Think:` derivation → project evidence → `file:line` proof + relevant counterexamples → verdict. NEVER scan categories in parallel; codebase convention wins over a suspected violation. — why: skipping an applicable category loses a violation class, while treating examples as mandates creates false findings.
- **Workload-first scalability gate:** before judging a scale technique, prove read/write ratio · sustained/peak load · query shapes · data growth · burst/hot-key skew · geography · latency/consistency budgets; then check the reversible ladder (measure/tune → vertical and/or stateless horizontal from headroom + availability → read/write tactics → partition/shard LAST). Missing evidence means INFO/route, never a scale violation. — why: architecture review must catch regressions without penalizing a lean system for scale it does not have.
- **Optional AI-agent-as-user advice:** when the reviewed change or an accepted future contract exposes machine interaction, apply `SYNC:ai-agent-as-user-access` to inspect agent identity, authority, capability contracts, safety, and observable outcomes; classify only evidence-backed gaps and record adaptation, deferral, N/A, or blockers — no agent finding is invented when the surface is not applicable.
- Phase 0 is non-negotiable and first: read the project configuration and docs index, then load references triggered by the changed area — backend patterns for backend/API/data work, project structure for boundaries, frontend patterns for UI, and review rules when present. Every rule and symbol comes from project evidence, NEVER general knowledge; honor explicit N/A decisions.
- **Universal reasoning comes from `.claude/docs/architecture-knowledge.md`** (coupling taxonomy + four coupling dimensions, distributed-monolith signature, module-design principles §4, isolation levels + coordination primitives §8-§9, ~100-entry anti-pattern catalog, symptom→root-cause triage, judgment checklists §20) — use it to RECOGNIZE a defect class, then prove it with `file:line`. **The project's own reference docs and accepted ADRs OUTRANK that catalog on every conflict — NEVER flag a deviation from the catalog as a project violation.** An anti-pattern match is a HYPOTHESIS until evidence plus the damaged quality attribute are both named. — why: pattern-shape matching without project grounding is exactly the guess-as-fact failure this skill exists to prevent.
- Stay in lane: deep-review only what this skill OWNS (layers, messaging/CQRS/repos/service boundaries, entity events, frontend architecture, quality tooling, generated artifacts, ADRs); record a one-line `→ route to {sibling}` pointer for security/performance/DDD/UI/test findings instead of expanding them. — why: duplicated findings across reviewers inflate severity counts and bury issues each reviewer uniquely owns.
- Read-only until validated: **self-audit every draft finding against the 11 thinking red flags (`architecture-knowledge.md` §20.3) FIRST** — a finding whose sacrifice/trade-off you cannot name, or that rests on "best practice", is demoted or deleted, never reworded — then run the Phase 5 `/why-review` self-validation gate before handoff; fixes happen only in the validated fix loop, and every fix restarts a full review from Phase 0. That loop fixes only findings that block the current round: Round 1 = every validated severity; Round 2 = CRITICAL/HIGH/MEDIUM; LOW-only is recorded as deferred and ends the loop, while failed binary gates always block. Write findings to `tmp/reports/arch-review-{date}-{slug}.md`.
- **`--report-only`:** read-only leaf mode for a caller that owns every fix — Phases 0–5 only, no nested sub-agents, no `AskUserQuestion`, no writer beyond the report; return validated findings grouped Critical/High/Medium/Low via the explicit BLOCKED/WARN mapping; see [Report-Only Mode](#report-only-mode---report-only).

**Default scope:** All uncommitted changes (staged + unstaged). Override: specify files, directories, services, or full codebase.

> **MANDATORY MUST ATTENTION** Plan tasks to read project context BEFORE reviewing. Read `docs/project-config.json` first, resolve the project-reference root using `docsRoots.projectReference.path` when configured, then read `docs-index-reference.md` and `lessons.md` from that root. Use the docs index and changed-file triggers to select applicable references:
>
> - `project-structure-reference.md` — when module, service, layer, ownership, or deployment boundaries are in scope.
> - `backend-patterns-reference.md` — when backend, API, persistence, or messaging code is in scope; apply its N/A decisions.
> - `frontend-patterns-reference.md` — when frontend files are in scope; apply its N/A decisions.
> - `code-review-rules.md` — when present and relevant to the review.
> - Accepted ADRs — when the changed area may affect a recorded decision.
>
> Missing or stale required context → run the project’s initialization or narrow documentation setup route before ordinary review. Rules come from project evidence — NOT general knowledge.

**Workflow:**

1. **Phase 0: Load Architecture Rules** — Read project architecture docs (rules come from docs, NEVER general knowledge)
2. **Phase 1: Determine Scope** — Changed files (default) or user-specified scope
3. **Phase 2: Blast Radius** — Run `/graph-blast-radius` if `graph.db` exists
4. **Phase 3: Architecture Review** — Classify applicability for each file, then review all applicable checks serially across the 13 categories (0 tooling → 12 data, consistency & tenancy)
5. **Phase 4: Finalize** — Generate compliance report with PASS/BLOCKED/WARN verdicts
6. **Phase 5: Why-Review Self-Validation Gate** — Adversarially validate own findings via `/why-review` before handoff (MANDATORY when any finding exists)
7. **Next Steps** — `AskUserQuestion`: `/code-simplifier` / `/code-review` / skip (standalone only — see the [Next Steps](#next-steps) exemption)

**Key Rules (top 3 critical first):**

- MUST ATTENTION read project architecture docs in Phase 0 BEFORE reviewing — rules come from docs, NEVER general knowledge.
- Every violation needs `file:line` proof. Grep 3+ relevant examples/counterexamples when established code patterns are the evidence; use config, references, and accepted ADRs as direct evidence and check for conflicting code.
- MUST ATTENTION review one category at a time: doc rule → source evidence → verdict — NEVER scan categories simultaneously.
- MUST ATTENTION when an agent-facing surface or accepted future contract is in scope, apply `SYNC:ai-agent-as-user-access`; inspect the existing setup and classify only evidenced identity, authorization, capability, safety, contract, audit, or observability gaps as PASS/WARN/BLOCKED. If not applicable, record evidence-backed N/A or no finding; never prescribe every machine surface.
- Write findings to `tmp/reports/arch-review-{date}-{slug}.md`.
- BLOCKED = must fix before merge | WARN = review and decide | PASS = compliant.
- Review is read-only until `/why-review --validate-findings` confirms findings; fixes happen only in the validated fix loop — the caller's fix step when a parent skill/workflow invoked this review, `/fix --target=review` when standalone — and every fix restarts a full architecture review from Phase 0 with a fresh task breakdown. Apply the round severity bar: Round 1 clears only at zero findings; Round 2 clears at zero CRITICAL/HIGH/MEDIUM, with LOW findings deferred. Failed binary gates remain blocking.

## Your Mission

<task>
$ARGUMENTS
</task>

## Report-Only Mode (`--report-only`)

> **Use when** a caller runs this skill as a read-only leaf — e.g. a workflow specialist parallel batch, a delegated review lane, or a review batch — and another step owns every fix. `--report-only` in `$ARGUMENTS` is an execution flag, not a scope override; without it every phase below applies unchanged.
>
> 1. **Run Phases 0–5 only.** Phase 3 still reviews every applicable category serially; Phase 5 `/why-review --validate-findings` still validates every finding. No fix, no full-review restart, no fresh-context re-review round, and no Next Steps `AskUserQuestion`: return the validated report; the caller owns fixes and any re-review. — why: two writers of one artifact inside a barrier race each other.
> 2. **Resolve scope from the caller's brief — never ask.** Use the files, diff, or target the brief names (else the default uncommitted-changes scope) and record it in the report. — why: a leaf cannot reach the user, so an "ask" branch would stall the caller's barrier.
> 3. **No nested fan-out.** Skip the Systematic Review Protocol's parallel `architect` sub-agents and size-capped batching; review sequentially in this context. — why: this skill is already a leaf of the caller's fan-out; a second level breaks the caller's barrier.
> 4. **Write only the report** under `tmp/reports/`. A missing or stale project-reference doc is recorded in the report as a `NOT VERIFIABLE` assumption and returned — never a trigger to run `/scan`, `/project-init`, or any other writer. — why: a leaf that regenerates shared docs races its barrier siblings.
> 5. **Return** the report path, the local verdict (PASS/WARN/BLOCKED/N/A), validated findings grouped Critical/High/Medium/Low per the mapping below, every unconfirmed material trade-off (the `SYNC:trade-off-interrogation-gate` non-asking handoff), and the next-step recommendations the Next Steps prompt would have offered.
>
> **Severity mapping (local verdict → caller tier, per `SYNC:severity-rubric` domain-vocabulary normalization).** Classify each finding by consequence; the local label sets the starting tier, and the report records both (`BLOCKED→High`):
>
> | Local finding | Caller tier |
> | --- | --- |
> | `BLOCKED` with immediate material risk — data loss/corruption, cross-tenant exposure, authority/safety bypass, critical-path silent failure — or a failed binary gate | **Critical** |
> | `BLOCKED`, any other must-fix-before-merge violation (broken boundary/contract/invariant, accepted-ADR contradiction, removed quality gate) | **High** (Medium only when evidence shows a bounded consequence; the local BLOCKED still holds) |
> | `WARN` with a consequential impact (credible defect, coupling/resilience/testability drift, unrecorded one-way door) | **Medium** (High when the consequence warrants) |
> | `WARN` where evidence shows no credible present material impact | **Low** |
> | `PASS`, `N/A`, or an advisory INFO block (technique applicability, scenario stress) | not a finding |
> | Evidence missing to choose a tier | `NOT VERIFIABLE` — stays open, never Low |
>
> For this mode the declared step order ends at Phase 5; stopping there is the mode's contract, not a skipped step.

## First Principle — Easy to Change

> **Success metric: future change cost.** DRY, SRP, abstraction, patterns, naming, layering, tests exist to make next change cheaper.

Before applying any rule, ask: **does this lower or raise future change cost?**

- Reject "best practices" raising cost: premature abstraction, speculative generality, leaky indirection, ceremony without payoff. — why: cost added now with no payoff is debt, not quality.
- Name real enemies: **coupling, hidden state, duplicated knowledge, unclear intent, irreversible decisions exposed too early**.
- Prefer simple reversible design over sophisticated rigid design. — why: reversible decisions cost less to undo when wrong.
- If downstream rule raises change cost, this principle wins.

---

## Quality Tooling Principle — Tech-Stack Adaptive

> Architecture review includes automated quality guardrails. Without stack-appropriate linting, formatting, type checks, static analysis, dependency/security-review scanning, CI enforcement, defects depend on reviewer memory.

Evaluate detected stacks, not fixed tool list:

- Detect stacks from project-reference docs, manifests, lock files, build files, CI before recommending tools.
- Per production stack, verify formatter/style config, linter/code analyzer, compiler/type-check strictness, dependency/vulnerability scanning, tests/coverage, CI/pre-commit enforcement.
- Prefer official or ecosystem-standard tooling; local docs absent/stale → check current official docs before recommending setup.
- MUST ATTENTION recommend enforceable best practice only: installed but unwired tool = WARN; production source with no relevant automated quality gate = BLOCKED.
- Identify missing capability first; map to local equivalent before prescribing new tooling. — why: prescribing a tool that duplicates an existing gate adds noise, not coverage.

---

## Review Mindset (NON-NEGOTIABLE)

Skeptical. Every claim needs traced proof, confidence >80%.

- NEVER flag violations without reading actual code + tracing dependency — READ the code, trace the import chain, then flag.
- Every finding MUST include `file:line` evidence.
- Before flagging a pattern based on code: inspect 3+ relevant examples/counterexamples where they exist; documented config, references, or accepted ADRs are also evidence, and conflicts must be surfaced.
- Question: "Actually a violation, or an established exception?"

## Ownership & Handoff (own vs delegate)

This skill = one reviewer in a multi-reviewer pipeline — `workflow-review-changes` runs it beside the siblings below. Review ONLY what this skill owns; route the rest so findings are not double-reported across reviewers.

| This skill OWNS (deep-review here)                                                                                            | Delegate to sibling (one-line pointer only — do NOT deep-review)         |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Layer boundaries, dependency direction, business-logic placement                                                            | —                                                                         |
| Messaging, CQRS, data-access, service-era, event-handling, and service-boundary conventions when applicable                | —                                                                         |
| Frontend architecture and lifecycle/style conventions established by the project                                               | Visual/SCSS/responsive/z-index quality → `ui-review`                      |
| Quality-tooling baseline, generated-artifact integrity, ADR / recorded-decision conformance                                 | —                                                                         |
| Architecture-level auth PLACEMENT (a gate exists at the boundary)                                                           | OWASP, secrets, dependency/supply-chain, authz-matrix depth → `security-review` |
| Structural soundness of a hot path (no obvious N+1 introduced by the diff)                                                  | Query plans, indexing depth, latency/throughput budgets → `performance-review` |
| —                                                                                                                          | Domain entity / value-object DDD design quality → `domain-entities-review` |
| —                                                                                                                          | Integration-test assertion quality, coverage, traceability → `integration-test-review` |
| —                                                                                                                          | Runtime production-readiness of service/API changes (observability wiring, rollback) → `production-readiness-review` |

When a finding clearly belongs to a sibling, record one-line `→ route to {skill}` pointer and move on — NEVER expand it. — why: duplicated findings across reviewers inflate severity counts and bury issues each reviewer uniquely owns.

## Phase 0: Load Architecture Rules (MANDATORY FIRST)

> **MUST ATTENTION:** Read project docs BEFORE reviewing. Rules come from docs, NEVER general knowledge.

Every doc below sits under the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path):

- read `backend-patterns-reference.md` — extract messaging naming, layer rules, CQRS patterns, repo rules, entity event handler patterns, validation patterns
- read `project-structure-reference.md` — extract service map, layer structure, DB ownership
- frontend files in scope → read `frontend-patterns-reference.md`
- read `code-review-rules.md` — extract anti-patterns + review rules directly

**Universal reasoning layer (secondary, never authoritative):** consult `.claude/docs/architecture-knowledge.md` for the coupling taxonomy + four coupling dimensions, the distributed-monolith detection signature, the ~100-entry anti-pattern catalog, and the symptom→root-cause triage matrix. Use it to RECOGNIZE a defect class the project docs do not name explicitly. **Honor its provenance markers in §3/§8/§9/§10:** a row or section banner marked `— VERIFY` is an UNVERIFIED assertion — it may seed a hypothesis, but NEVER quote it as the authority for a finding; confirm against the named source (or the project's own docs) first.

> **MUST ATTENTION — precedence is absolute.** Project reference docs and accepted ADRs > the knowledge catalog > general knowledge. **NEVER report a deviation from the catalog as a project violation**, and NEVER let a catalog entry override an established, grepped codebase convention. Every catalog-derived observation is a HYPOTHESIS until you have BOTH `file:line`/config/topology evidence AND the named quality attribute it damages — otherwise record it as INFO or drop it. — why: universal patterns applied as project rules generate confident false positives, the most expensive output this skill can produce.

## Phase 1: Determine Scope

**Default (no override):** Review all uncommitted changes.

```bash
git status          # List changed files
git diff            # Staged + unstaged changes
git diff --cached   # Staged only
```

- Collect file list to review.
- Categorize: backend (.cs), frontend (.ts/.html), config, docs, other.
- Filter to architecture-relevant files (skip pure docs, configs, tests unless architecture-relevant).

## Phase 2: Blast Radius (if graph.db exists)

- `.code-graph/graph.db` exists → call `/graph-blast-radius` skill.
- Record: impacted file count, cross-service impact, risk level.
- Prioritize review by highest-impact files first.
- Graph unavailable → note "Graph not available — skipping blast radius" and proceed.

Per changed file with downstream impact:

```bash
python .claude/scripts/code_graph trace <changed-file> --direction downstream --json
```

For changes touching message or event contracts, trace the project's actual consumers, handlers, and downstream effects.

## Phase 3: Architecture Review

Create report: `tmp/reports/arch-review-{date}-{slug}.md`

Per file in scope, evaluate the categories that apply to the file type and change. Pattern applicability requires project evidence; do not infer a stack or architecture from this skill's examples.

MUST ATTENTION review serially. Per applicable category: read docs/source evidence → derive risk with `Think:` → grep 3+ examples/counterexamples where relevant → record PASS/WARN/BLOCKED. NEVER scan categories simultaneously — why: parallel scanning collapses per-category evidence into one undifferentiated pass and drops findings.

> **Pattern applicability gate (MUST ATTENTION):** Before judging any concrete architecture, framework, stack, transport, persistence, or project-convention check in Categories 0–12 or elsewhere in this skill, record it as **Applicable** or **N/A** in the review report, with its evidence (`docs/project-config.json`, a configured project-reference doc, an accepted ADR, or established code in the relevant boundary). Check at least three relevant examples when code is the evidence. A project-reference doc that marks a pattern N/A remains authoritative unless a later accepted ADR or established current code provides contrary evidence; surface doc/code conflicts instead of resolving them silently. If config, references, ADRs, and relevant code do not establish a pattern, record N/A and do not BLOCK because the project lacks it. N/A skips that pattern's implementation-specific checklist; still assess any real invariant, ownership, consistency, idempotency, coupling, or boundary-quality concern using the project's actual design.

| Pattern-specific check | Applicability evidence to record |
| --- | --- |
| Layer names, dependency direction, domain purity, and port placement | Configured architecture/layer rules, project references, accepted ADRs, or established module dependencies |
| Message transport and delivery guarantees | Configured broker/transport or message contract, project references, accepted ADRs, or established producers/consumers |
| Message naming, producer/consumer bases, outbox, retries, ordering, and replay | Evidence for each named convention; a configured transport alone does not establish these choices |
| CQRS, command/query file layout, validation API, DTO mapping, and entity events | Evidence for each convention separately; one does not imply the others |
| Repository abstractions, query extensions, and database indexes | Project data-access contract, configured store/schema, accepted ADRs, or established repository/query patterns for each check |
| Legacy/modern service eras and frontend base/store/API/lifecycle/style conventions | Project references, accepted ADRs, config, or established code for the affected service or frontend; classify separately |

> **Portability note (MUST ATTENTION):** Framework symbols, base-class names, directory conventions, and patterns mentioned across Categories 0–12 are examples, not default requirements. Resolve applicable project references from config and the docs index, then use the applicability gate above to map each concrete check to project evidence. Flag deviations from an established project convention; NEVER treat a hardcoded name or a pattern's absence as a project violation.

---

### Category 0: Quality Tooling Baseline — Severity: BLOCKED/WARN

**Think:** Can project automatically catch style, type, complexity, security, dependency, boundary regressions for detected stacks?

- Detect production stacks via `docs/project-config.json`, relevant docs, manifests, lock files, build files, CI.
- Inventory gates: formatter, linter, code/static analyzer, compiler/type checker, dependency audit/SCA/SBOM, SAST, test/coverage, architecture/dependency-boundary checks, pre-commit, CI/build.
- Verify stack-appropriate coverage: `.editorconfig`/language analyzers, JavaScript/TypeScript linting, UI template linting when supported, formatter config, dependency vulnerability scans, semantic security analysis.
- BLOCKED when production stack lacks runnable lint/static-analysis/type-check command and equivalent enforced gate, or CI/build references missing/broken quality command.
- WARN when tooling local-only, not wired into CI/build/pre-commit, partial for active production code, broadly/unexplainedly suppressed, unclear on generated-code exclusions, or stale for stack.
- **Scope to the change (MUST ATTENTION):** On normal change-level review, *pre-existing* tooling gap unrelated to diff is WARN with single note — NEVER BLOCK whole review on standing, change-unrelated condition. Reserve BLOCKED for: new stack/service introduced by this change with no gate, change itself removing/breaking existing gate, or explicit full-codebase/greenfield audit scope. — why: change review that BLOCKs on unrelated standing gap produces noise that buries regression the diff actually introduced.
- Before recommending tools, find current official/ecosystem setup and cite it; recommend capabilities first, tools second.

**Fitness-function enforcement (architectural rules must be EXECUTABLE):** an architectural rule not automatically verified is a SUGGESTION and will be violated within a quarter. Check whether the project's own recorded architectural rules have a machine check — and whether THIS change adds a rule with no check:

| Rule the project records | Fitness function expected (any equivalent counts) |
| --- | --- |
| Layer / dependency direction | Architecture test in CI (ArchUnit / NetArchTest / dependency-cruiser / import-linter / lint boundary rules) |
| No module cycles | Cycle detection failing the build |
| Domain purity | Assertion that the domain package imports no framework/ORM/HTTP namespace |
| API / event schema compatibility | OpenAPI-or-protobuf diff gate · schema-registry backward-compat check · consumer contract tests |
| Multi-tenant isolation | Test asserting a cross-tenant query returns zero rows (see Category 12) |
| Resilience | "Every outbound call has a timeout" lint or test |
| Performance / bundle budget | Latency-or-size assertion in the pipeline |
| Test strength / no vacuous assertions | Mutation-or-fault-injection gate scoped to CHANGED code; where no tool exists, a recorded defect-seeding drill (break a top invariant → record which named test went red → restore). Line coverage % is a diagnostic, NEVER the gate |

- **WARN** when a recorded architectural rule has NO machine check and relies on review discipline alone. **BLOCKED** when this change REMOVES or disables an existing architecture/boundary check, or introduces a new enforced-by-prose-only boundary while the project already has a fitness-function mechanism available.
- Existing violation backlog is fine if it is a RATCHET (new violations blocked, count only decrements) — a "cleanup later" comment with no gate is WARN.

**Violation format:**

```
BLOCKED: {stack} has no enforced lint/static-analysis/type-check quality gate ({evidenceFile}:{line})
WARN: recorded architecture rule "{rule}" has no fitness function — enforced by review discipline only ({docFile}:{line})
```

---

### Category 1: Architecture Boundaries and Layers — Severity: BLOCKED/WARN when an evidenced rule is violated

**Applicability:** Apply named layer rules, domain purity, and dependency-inversion requirements only when config, project references, accepted ADRs, or established code define those boundaries. Otherwise record those pattern checks N/A and review the actual module dependencies, ownership, and change coupling.

**Think:** What are the actual module or layer boundaries? Which imports are allowed by the project's contract, and where does the changed behavior's invariant or state belong?

- Read any architecture and layer rules present in `docs/project-config.json`, configured references, and accepted ADRs. Do not assume a particular config key or layer taxonomy.
- Determine a file's module/layer from the project's own structure and established dependencies; do not infer `Domain/`, `Application/`, `Persistence/`, or `Service/` from a path alone.
- Scan the configured language's imports against documented dependency constraints. When none are defined, assess whether the change introduces concrete coupling, cycles, or a boundary leak and cite its impact.
- Place state changes and behavior with the owner of the relevant invariant under the project's architecture; do not impose a fixed Entity/Service/Controller ordering.
- Enforce inward-only dependencies, domain purity, or policy/adapter port placement only when that architecture is evidenced.
- Keep domain concepts out of generic shared or infrastructure layers where those layers exist; cite the consumer-specific coupling and affected boundary.
- **Module cycles (WARN/BLOCKED by evidenced impact):** where package/module boundaries exist, detect new cycles with the project dependency tool or graph. Report one only when it violates a documented acyclic rule or creates a concrete dependency, initialization, testing, build, or release problem; a graph cycle alone is not a violation.
- **Domain purity (pattern-specific):** when an evidenced domain layer exists, check only the framework/infrastructure dependencies that its project contract excludes. Otherwise record N/A.
- **Shared/infra layer domain leak (WARN/BLOCKED by impact):** where a generic/shared/infrastructure layer exists, assess whether it references consumer-specific concepts or rules. Cite the resulting coupling and affected reuse boundary; keep generic types domain-free and place consumer-specific behavior in the consumer.
- **Cohesion / dumping ground (WARN):** a new or growing `Utils`/`Common`/`Shared`/`Helpers`/`Managers` module that everything imports is coincidental cohesion — it becomes the coupling hub and the cycle source. Test: "how many DIFFERENT reasons would make me edit this file?" More than one actor ⇒ split.
- **Pass-through layer (WARN):** a layer that only forwards calls unchanged (sinkhole) adds cost with no responsibility — collapse it or give it a real job.
- **Shallow module / pass-through method (WARN):** a new type whose public interface is nearly as large as its implementation, or a method that only forwards to the next layer with no added responsibility, earns nothing — it is interface cost with no hidden complexity. Judge module VALUE as *functionality hidden ÷ interface surface*: many tiny one-method classes ("classitis") raise total complexity while looking modular. Prefer pulling the complexity DOWNWARD into one deep module over spreading it across N call sites. — why: reviewers count classes and read it as modularity, so this defect is the one that survives review and then makes every future change touch five files.
- **Dependency inversion / port placement (pattern-specific):** when project evidence requires ports in a policy/domain module, check the declaration site and dependency direction. Otherwise record that specific placement rule N/A and assess the actual dependency boundary.
- **Wrong-abstraction extraction (WARN):** a diff that MERGES two code paths that look alike but change for DIFFERENT reasons creates a shared module with two actors. Duplication is cheaper than the wrong abstraction — require three real occurrences sharing the same reason to change (**rule of three**) before extracting. Verify against the project's own strategic-DRY decision before flagging. — why: a premature abstraction is defended by everyone who depends on it, so its cost compounds while duplication's cost stays linear.

**Violation format:**

```
BLOCKED: {layer} layer file {filePath}:{line} imports from {forbiddenLayer} layer ({importStatement})
WARN/BLOCKED: {filePath}:{line} introduces module cycle {A} → {B} → {A}, violating {documentedRuleOrImpact} ({evidenceFile}:{line})
BLOCKED: shared/infra {filePath}:{line} references consumer domain concept {concept} — shared layer must stay domain-free
```

---

### Category 2: Asynchronous Messaging and Message Buses — Severity: BLOCKED/WARN when an evidenced contract or risk is breached

**Applicability:** Mark transport-specific checks N/A unless project config, references, an accepted ADR, or established code show that the project uses or requires the transport. Classify message naming/type, producer/consumer bases, outbox, retry, ordering, replay, and acknowledgement rules separately; evidence for a bus does not establish every sub-pattern. For another asynchronous mechanism, inspect its actual contract without imposing bus-specific infrastructure.

**Think:** What state or contract crosses the boundary, who owns it, and what delivery, consistency, and failure guarantees does the project rely on?

- Enforce message names, event/request types, fields, producer/consumer abstractions, and dependency-wait mechanisms only when project evidence establishes those conventions.
- Trace changes that update data and publish or enqueue work. Assess partial-failure outcomes against the business invariant; require an outbox, CDC, or another mechanism only when the project contract defines it. Report a demonstrated consistency failure even when no named outbox convention exists.
- Read the actual delivery contract. Where retries, replay, or reordering can repeat or change the order of work, verify that the consumer preserves the relevant business state; use the project's established idempotency and ordering mechanisms.
- Review retry bounds, dead-letter handling, and durability settings only when the configured transport and changed flow make them relevant. Use that transport's documented guarantees; do not assume a broker, acknowledgement model, or exact retry policy.
- Check message compatibility when the changed contract can reach old and new consumers during a supported rollout. Require project-defined versioning or compatibility rules where they exist.
- Preserve data ownership across service boundaries. Require a particular communication path only when the project's references, accepted ADRs, or established code define it.

**Violation format:**

```
BLOCKED: {filePath}:{line} violates the evidenced messaging or delivery contract ({evidenceFile}:{line})
BLOCKED: {filePath}:{line} creates a demonstrated partial-failure or duplicate-effect path that violates {invariant}
```

---

### Category 3: CQRS and Application Patterns — Severity: BLOCKED/WARN when the specific convention applies

**Applicability:** Classify CQRS, command/query file layout, validation API, DTO mapping, and entity-event handling separately. Apply each requirement only when project config, references, an accepted ADR, or established code in the relevant boundary demonstrates it. Otherwise mark that check N/A and evaluate the actual validation/error, mapping, invariant-ownership, and side-effect consistency behavior without imposing a framework shape.

**File organization (project-specific when documented):**

- Follow the project's documented command/query/handler placement and grouping when it exists. Do not require one-file or separate-file layouts unless project evidence establishes that exact choice.

**Validation:**

- Preserve the project's documented validation and error-signaling contract. Require a specific result type, fluent API, exception policy, or sync/async validation hook only when project evidence names it.

**Mapping:**

- Follow the project's established mapping boundary. DTO-owned mapping and specific base methods are requirements only when project evidence establishes them; otherwise assess whether the changed mapping has a clear owner and preserves invariants.

**Side effects and consistency:**

- Preserve ownership, transaction boundaries, idempotency, and failure behavior for side effects. Require entity event handlers or a particular folder only when the project uses or requires that pattern.
- Use an entity-event-handler folder only when project evidence establishes that convention.
- Where the project has separate handlers, review whether each has a coherent responsibility and whether failure isolation matches the documented contract.

---

### Category 4: Data Access and Repository Patterns — Severity: BLOCKED/WARN when the specific convention applies

**Applicability:** Repository interfaces, service-specific repositories, query extensions, and database-index requirements are separate checks. Mark each applicable only when the project's data-access contract, configured store/schema, accepted ADR, or established code demonstrates it; otherwise record N/A and inspect the project's actual persistence boundary.

- Preserve documented data ownership and persistence boundaries; require a repository abstraction only when the project establishes one.
- Require a query-extension or expression pattern only when references or established code show it.
- Review database indexes only when a configured database and changed query/schema are in scope; justify concerns from the actual query shape and workload rather than requiring an index for every filter, foreign key, or sort field.

**Violation format:**

```
BLOCKED: {filePath}:{line} violates the evidenced repository/data-access contract ({evidenceFile}:{line})
```

---

### Category 5: Service Pattern Era — Severity: BLOCKED/WARN only when a project-defined split applies

**Applicability:** Record N/A unless project references, accepted ADRs, config, or established code define distinct eras and identify the affected service/module. Do not assume every project has a legacy/modern split.

**New services:** When the project defines a modern baseline, check new services against that documented checklist and use its severity.

**Existing services:** Flag mixed-era patterns only when project evidence shows the mixture creates a concrete inconsistency or maintenance risk. A consistent legacy implementation is not a violation by itself.

**Determining era:** Resolve the affected module's era from project references, accepted ADRs, config, or established code; if none is established, record N/A.

---

### Category 6: Side Effects and Event Handlers — Severity: BLOCKED/WARN when an evidenced contract or invariant is violated

**Applicability:** Classify entity/domain events, handler placement, producer bases, filters, and naming separately. Require each event-specific convention only when config, project references, an accepted ADR, or established code demonstrates it. Otherwise mark that check N/A.

**Think:** Where does the project own this side effect and its consistency boundary? What happens on failure, retry, or duplicate execution?

- Evaluate side effects in their actual transaction and failure context. A command or request handler is not inherently the wrong owner; report concrete coupling, partial-commit, or downstream failure consequences.
- Follow the event-handler location, base type, filter, and naming convention established by the project when that pattern applies.
- Where work may retry, replay, or run concurrently, check idempotency and invariant ownership against the actual delivery contract.
- Where separate handlers are established, assess whether responsibility boundaries and failure isolation match the project contract.

---

### Category 7: Service and Module Boundaries — Severity: BLOCKED/WARN when an evidenced boundary or ownership contract is violated

**Applicability:** Review service-specific rules when config, references, accepted ADRs, or established code show distinct service ownership. Apply the same ownership and coupling reasoning to meaningful module boundaries. A message bus is required only when the project's boundary contract establishes it.

**Think:** Which module or service owns the changed state? Does the change cross that boundary using its documented contract, and what coupling or consistency consequence follows?

- Resolve the actual data owners and communication contract from config, project references, accepted ADRs, and relevant code. Assess whether the change crosses that contract or adds coupling with concrete consequences.
- Direct database access or project references across an evidenced ownership boundary are findings only when they violate the project's contract or transfer writes without the owner's authorization; do not prescribe a message bus by default.
- **One writer per owned dataset (BLOCKED when ownership is established):** when project evidence identifies an owner, flag a change that adds an unauthorized writer. If ownership is unclear, record that uncertainty and trace actual write paths before concluding.
- **Shared domain library (WARN by impact):** when domain modules are shared across independently changing services, assess release, semantic, and operational coupling. Do not reject reuse by category name alone; cite the affected change path and project decision.
- **Data-shaped boundaries (WARN by impact):** treat noun-named CRUD modules as a hypothesis, not a violation. Flag only when evidence shows the boundary creates avoidable synchronous dependencies or obscures ownership; route domain redesign to `domain-analysis`.

**Violation format:**

```
BLOCKED: {filePath}:{line} violates the documented boundary or data-owner contract ({evidenceFile}:{line})
```

---

### Category 8: Frontend Architecture (frontend files only) — Severity: BLOCKED/WARN when the evidenced convention or invariant is violated

**Applicability:** Classify component bases, state stores, API-service wrappers, subscription/resource cleanup, CSS naming, and layer conventions separately. Mark a check N/A unless frontend references, config, an accepted ADR, or established code shows that convention.

**Think:** How does this frontend stack own state, data access, component lifetimes, and presentation boundaries?

Verify frontend-specific conventions against the configured frontend reference and relevant source; do not infer a component framework or design system from this checklist.

- Require component bases, state-management patterns, API wrappers, lifecycle operators, or CSS naming only when project evidence establishes those exact conventions.
- Assess state and side-effect ownership against the project's actual component/service/module boundaries; do not impose a Model > Service > Component order.
- Where subscriptions, effects, or other owned resources exist, check cleanup against the framework lifecycle and project contract.

> **Boundary with `/ui-review`:** This category owns frontend architecture and lifecycle findings grounded in the project's actual stack. Visual layout and styling quality — including content overflow, responsiveness, sizing, layering, and CSS details — belong to `/ui-review`, which `/changes-review` invokes when frontend changes are present. Defer visual/styling depth there to avoid double-reporting.

---

### Category 9: ADR / Recorded-Decision Conformance (if recorded ADRs exist) — Severity: BLOCKED/WARN

**Think:** Does any changed file contradict a binding decision recorded in an *accepted* ADR — a rejected library/technology, a forbidden dependency direction, a recorded quality-attribute/NFR budget, a banned pattern — without a superseding ADR?

> This category closes design→review loop: `/architecture-design` emits ADRs + fitness-function choices; this category verifies changed code still conforms to them. Checks CONFORMANCE only — NEVER re-runs deep performance or security analysis (those route to siblings in the Ownership & Handoff matrix).

- Locate recorded decisions under the ADR root (default `docs/adr/**`; a `docsRoots.adr.path` entry in `docs/project-config.json` overrides the path), or the ADR location named in the project's reference docs. Read only ADRs with `Status: Accepted` — skip `Superseded`/`Proposed`/`Rejected`.
- Extract each accepted ADR's binding constraints: chosen vs rejected options, layer/dependency rules, NFR targets (latency/throughput/availability/RPO-RTO), banned patterns.
- Per changed file, check conformance against those constraints — grep the diff for reintroduced rejected options or forbidden references; cite `file:line`.
- **BLOCKED** when change contradicts an accepted ADR's binding decision and no superseding ADR exists. Correct way to change a recorded decision = new superseding ADR (per the ADR-0001 lifecycle recorded under the configured ADR root), NEVER a silent violation in the diff. — why: silent ADR violations erode the decision record and let rejected options creep back unreviewed.
- **WARN** when change drifts from a recorded guideline, or is NFR-impacting against a recorded budget — flag it and route depth check to `performance-review`/`security-review`.
- **New one-way door with NO ADR (WARN, or BLOCKED when the project mandates ADRs):** when the diff makes a decision that is expensive to REVERSE and no ADR records it, flag it. One-way doors: a new data model or primary-key strategy · a tenancy-model change · a consistency-model change on a read path · a NEW sync-vs-async choice at a boundary · a new public API or event contract · a new service boundary · a new cloud-primitive lock-in · an auth/identity model change · a data residency or retention decision. — why: an unrecorded irreversible decision cannot be enforced by this category later, and the next engineer relitigates or silently breaks it.
- No ADRs exist → record "No recorded ADRs — conformance N/A" and skip (this category NEVER blocks a project that has chosen not to keep ADRs). Do NOT retroactively demand ADRs for pre-existing decisions on a change-level review — scope to what the diff decides.

**Violation format:**

```
BLOCKED: {filePath}:{line} contradicts {adr-id} ("{decision}") with no superseding ADR
WARN: {filePath}:{line} makes a hard-to-reverse decision ({decision}) with no recorded ADR
```

---

### Category 10: Project Spec and Test Contract — Severity: BLOCKED/WARN when the project contract applies

**Applicability:** Determine the project's spec and test-case formats from `docs/project-config.json`, configured project-reference docs, accepted ADRs, and existing artifacts. If the project maintains a canonical spec/test-case system for the changed behavior, apply its format and traceability rules. Otherwise record the spec axis N/A and use the project's actual test contract; do not require Feature Spec sections or property-based testing by default.

**Think:** Does the project's applicable contract require this behavior-affecting architecture change to be recorded and guarded? Do the relevant spec, tests, and code agree?

- When the project requires a spec and test case for the changed contract, carry a **Dual-Feedback row** in its actual format: name the governing spec rule and the test that guards it. When no project spec system applies, record why the spec axis is N/A and assess test coverage against the project's test contract.
- BLOCKED when an evidenced `[HARD]` architecture rule or cross-boundary invariant lacks the test protection required by the project. Require a universally-quantified property test plus boundary counter-case only when the project's test contract supports or requires that form; otherwise assess the strongest applicable test for the invariant.
- When a project spec exists, review it together with the relevant tests and structural diff; record a stale/missing spec only when the project's contract requires one. Keep a behavior-changing fix from being code-only where its documented spec/test cycle applies.

**Violation format:**

```
BLOCKED: {filePath}:{line} [HARD] {rule/invariant} lacks required project test protection (spec axis: {present/N/A} | test evidence: {file:line or missing})
```

---

### Category 11: Scalability & Coupling Regression — Severity: BLOCKED/WARN

> **Diff-scoped regression guard, NOT a project audit.** This category catches architecture/scalability regressions a change *introduces*; it does NOT re-grade the whole system. Init/on-demand grading of all 10 scorecard areas is owned by `architecture-scalability-review`. Cross-cutting spec-loop discipline (Category 10) also applies to findings from this category. Cross-references Category 7 (service boundaries) and Category 9 (ADR / recorded-decision conformance).

**Think:** Does this diff introduce a new **sync cross-context** call, shared-DB reach, statefulness, or copy-pasted cross-context logic that regresses module isolation, loose coupling, or horizontal scaling — turning a clean boundary into **distributed-monolith** coupling?

**Workload evidence gate (before any scalability verdict):** derive read/write ratio · sustained/peak RPS/events · dominant query/write shapes · dataset size/growth · payload size · burst duration · hot-key/tenant skew · user regions · p95/p99 + SLO/RPO/RTO · consistency/staleness budget. If the project records none, state `scale profile unknown`, keep technique observations INFO/advisory, and route measurement depth to `performance-review`/`production-readiness-review` — NEVER invent a high-scale requirement.

**Judge the FOUR coupling dimensions SEPARATELY — low code coupling proves nothing on its own:**

| Dimension | Question | Evidence to pull |
| --- | --- | --- |
| **Code** | Who imports whom? Any cycle? | Import graph / `trace --direction both` |
| **Temporal (runtime)** | Must both be UP at once? A sync chain makes your SLO the PRODUCT of the chain's | Call graph across the boundary, sync vs async |
| **Semantic (contract)** | Does a change in their MEANING force a change in mine? | Shared schema, shared entity/domain lib, shared enum |
| **Operational (deployment)** | Must these ship TOGETHER? If yes they ARE one service | Release coordination, shared version pin |

> **Distributed-monolith signature (BLOCKED when the diff moves the system toward it):** LOW code coupling + HIGH temporal + semantic + deployment coupling. Concrete detection: services that must release together · a shared database or shared entity/domain library · a request synchronously traversing ≥4 services · one team blocked by another's deploy · "we roll back all services together." — why: it pays every distributed cost and buys none of the benefits; it is the most expensive and most common modern architecture failure, and every diff that deepens it makes the exit harder.

- **BLOCKED** when a change adds a NEW forbidden cross-context dependency, a circular context dependency, or a direct **sync cross-context** call where the recorded architecture requires an event/message or an owned contract (producer calling consumer directly — "I call you" instead of "you listen to me").
- **BLOCKED** when the diff adds a NEW outbound network call, lock or long query with **no timeout** — a missing timeout is the single most common resilience defect, and the dangerous dependency failure is SLOW, not down: it exhausts your pool while every health check stays green. Also flag uncapped or unjittered retries on the new call, and retries on a NON-idempotent operation.
- **BLOCKED** when the diff deepens a synchronous chain to ≥4 hops, or adds a sync hop to a path the recorded architecture requires to be async. Availability MULTIPLIES down a sync chain (five 99.9% deps ⇒ ~99.5%) and latency SUMS.
- **WARN** for a new connascence of **Value** or **Timing** ACROSS a boundary (two services that must change a value together, or that depend on execution order). That is a BOUNDARY error, not a bug to patch — either the invariant belongs in one transactional boundary, or it must be made eventual ON PURPOSE with a designed compensating action. Route the redesign to `domain-analysis`.
- **BLOCKED** when a change makes a previously **stateless**/scalable path stateful in a way that breaks horizontal scaling — in-memory session/cache assumed node-local, sticky-instance state, a new SPOF, or unbounded fan-out on a hot path — where the ADR/scale budget requires statelessness.
- **BLOCKED** when a change contradicts a recorded availability target by adding a single-instance load balancer/cache/queue/database or failover path with no redundant authority/health routing. **WARN** when a new replicated topology omits its sync/async/quorum acknowledgement, promotion authority, RPO/RTO, or multi-primary conflict rule. — why: replication without failure semantics is a copy, not a high-availability design.
- **WARN** when a diff changes public work from synchronous completion to queued/background processing but still reports success as completed, with no accepted/pending/succeeded/failed state, status lookup/callback, or terminal-failure owner. — why: fast acknowledgement is not completed work; hiding this creates false success and invisible backlog.
- **WARN** when a new cache/CDN path has no authoritative source, cache policy, invalidation/TTL+purge strategy, cache-key dimensions (`Vary`, identity/tenant/permission), max size/eviction, or warranted stampede/hot-key/cold-start protection. Route hit-rate/query depth to `performance-review`; keep cross-tenant key omission in Category 12. — why: caching moves load and consistency obligations; it does not erase them.
- **WARN** when a change jumps to partitioning/sharding, multi-region writes, or another datastore without evidence that query/index/pool tuning, caching, available vertical headroom, and read replicas/read models cannot meet the target. Require query-aligned distribution, hotspot analysis, resharding and cross-shard transaction/query consequences; route benchmark depth to `performance-review`. — why: sharding is the hardest database scale choice to reverse.
- **WARN** for **cross-context duplication** (copy-pasted domain rule/util across contexts — a DRY regression), a new shared-DB read across a boundary, or a distributed-monolith smell with weaker evidence; record the smell and route the deep fix.
- **Detect-only smells → route, do NOT deep-analyze here:** local hot-path/query/N+1 latency → `performance-review`; rollout/capacity/SRE/runtime readiness → `production-readiness-review`; bounded-context / aggregate re-modeling → `domain-analysis`; auth/secret/tenant-boundary coupling → `security-review`. This category flags the regression at `file:line`; the sibling owns the depth. — why: a diff reviewer that re-runs full capacity/DDD analysis blows its context and duplicates the sibling's job.
- Behavior-affecting findings carry a Dual-Feedback row (spec axis + test axis) per Category 10 — a coupling/scaling regression that changes a contract MUST enrich BOTH the spec AND a guarding test, never code-only.

**Violation format:**

```
BLOCKED: {filePath}:{line} new sync cross-context call to {context} — recorded architecture requires event/message (route deep coupling design to domain-analysis)
WARN: {filePath}:{line} cross-context duplication of {rule/util} — DRY regression (route shared-lib decision to architecture-scalability-review / scaffold)
```

**Technique applicability (advisory — INFO, does NOT alter this category's verdict):** When the diff touches a scale-sensitive surface, invoke `SYNC:scale-technique-gate` — derive the scale tier from evidence, then emit the Technique Applicability Matrix as an **INFO/advisory** block noting warranted-but-missing techniques and any `OVER-ENGINEERED` ones. This is guidance only: it is NEVER a BLOCKED/WARN finding, does NOT change the Category 11 severity, and does NOT feed the Phase 4 verdict table. A `MISSING-WARRANTED` technique is advice to consider, not a regression. Full catalog → `.claude/docs/scale-technique-catalog.md`.

---

### Category 12: Data, Consistency & Tenancy Boundaries — Severity: BLOCKED/WARN

> **Diff-scoped, and the LEAST reversible category.** Data outlives every service, framework and team: a defect here can cause migration cost, silent divergence, or an ownership breach. Skip when the diff touches no persistence, consistency boundary, message consumer, or tenant-scoped data. When the category applies, classify each check below independently as Applicable or N/A: publication consistency only for state-plus-message/effect flows · delivery idempotency only where retry/replay can repeat work · isolation checks only for transactional concurrent state · fencing only for distributed locks/election · tenant checks only for tenant/identity-scoped data · migration checks only for schema changes under the actual deployment strategy · query/cache/replication checks only for those configured surfaces. A surface's presence does not imply every other pattern. Overlaps with Category 2 (messaging delivery) and Category 7 (dataset ownership) — record the finding ONCE in the category that owns the mechanism, and cross-reference.

**Think:** For each applicable surface, does the change preserve the business invariant through partial failure, replay, concurrency, ownership, rollout, or staleness? Record N/A for checks whose triggering resource or contract is absent.

**Consistency & atomicity (BLOCKED):**

- **Dual write** — state committed to one store and a message/webhook/second-store effect performed independently, with no project-defined atomic publication or consistency mechanism. Outbox/CDC are examples, not defaults. Cross-reference Category 2.
- **Non-idempotent consumer or mutation** — a changed message handler or unsafe endpoint with no dedup key, version check, or naturally idempotent write, under at-least-once delivery or client retry. Cross-reference Category 2.
- **Cross-network transaction** — a storage transaction held open across an HTTP/RPC/queue call. Locks held during I/O can convert one slow dependency into a storage-wide stall.
- **Distributed transaction across services** — assess availability, coupling, recovery, and consistency against the project's accepted boundary contract. Recommend a saga, outbox, and compensation only when they fit that contract; compensation records a new business fact, not a pretend rollback of a real-world effect.
- **Unprotected concurrent invariant** — when a transactional store is in scope, identify its isolation and concurrency guarantees, then verify that read-check-write invariants cannot race. For relational databases, constraints, row/range locks, serializable execution with retry handling, or conditional writes are possible mechanisms; use the configured engine's contract rather than prescribing one mechanism universally.
- **Range invariant under row locking** — when the project uses relational row locks, verify that the selected lock/constraint protects ranges or rows that do not yet exist. Use the datastore's documented mechanism for other storage models.
- **Distributed lock / leader election** — when a changed flow uses one, verify stale-owner protection, lease expiry, and recovery against the project's storage and coordination contract. A fencing token is one proven mechanism where supported. Review quorum sizing only when the changed deployment uses a quorum protocol; derive failure tolerance from that protocol rather than applying a node-count rule to unrelated systems.
- **Distributed ordering or expiry (WARN/BLOCKED by impact):** when correctness depends on ordering across hosts or multi-region writes, assess the clock and conflict-resolution guarantees. Use the project's supported version, logical-clock, or bounded-clock mechanism; do not assume wall-clock order is sufficient.

**Staleness (WARN):**

- A newly eventually-consistent read path with **no declared, monitored staleness budget** — unbounded, unmeasured lag IS the defect.
- A read-after-write path newly routed to a replica with no **read-your-writes** guarantee (sticky read / read-from-primary / version token). Most user-visible "consistency bugs" are this, not missing linearizability.
- A replication/failover change with no declared acknowledgement semantics or data-loss window: synchronous replication buys lower RPO with write latency/availability cost; asynchronous replication buys latency with lag/failover loss risk; quorum must name read/write thresholds; multi-primary must name conflict resolution. Route runtime failover drills to `production-readiness-review`.

**Tenant isolation (only when tenant/identity-scoped data is in scope; BLOCKED by demonstrated exposure):**

- A tenant-scoped query, repository method, projection, background job, export or report with **no tenant predicate**, where the project's mechanism (row-level security / ORM global filter / mandatory repository base) does not automatically apply it. **One missing `WHERE tenant_id = ?` is a cross-tenant breach that passes every functional test.**
- `tenant_id` (or user/role/price) taken from a **client-supplied field** rather than the authenticated principal. Cross-reference `security-review` for authz depth — this category owns only the BOUNDARY placement.
- A cache, memo, or shared in-memory map keyed WITHOUT the tenant/identity/permission dimension. **Cache-key omission is a recurring cross-tenant leak vector that no functional test detects.**
- **WARN** when a tenant-isolation change lands with no test asserting a cross-tenant read returns ZERO rows (the fitness function from Category 0).

**Migrations & schema (only when a schema change is in scope; severity by rollout impact):**

- A **breaking schema change in one deploy** — for example, dropping/renaming a field, narrowing a type, or adding a required field without a default — while the evidenced deployment strategy runs old and new versions together. Assess the migration sequence against that rollout contract; expand–contract is one option when compatible with the project's tooling and release process.
- A migration whose retry or rollback behavior violates the project's migration-runner and release contract, or that blocks writes on a large table where the documented availability target and workload require an online/batched strategy.

**Data-access structure (only when a database query or storage path is in scope; route query-plan depth to `performance-review`):**

- Unbounded query with no store-side filter or pagination on a path whose result set grows with data (memory and latency can scale with the result set). **Check row COUNT before row SIZE** — pushing a supported filter to the store beats projecting columns.
- Deep `OFFSET` pagination when keyset/cursor pagination is supported and fits the access pattern; a new query filter/FK/sort with no index when the configured datastore and workload warrant one; analytics query newly added against a primary whose project role is transactional.
- Composite index whose ordered prefix does not match the changed filter/join/sort shape, or an added index with no write-cost/plan evidence. Route plan/selectivity depth to `performance-review`.
- Distributed cache treated as source of truth (data unrecoverable after eviction/restart), a new unbounded cache, or a cache with no invalidation/consistency contract.
- A new denormalized copy with no mechanism keeping it aligned where the project contract requires it to track an authoritative source.
- A new shard/partition key with no evidence of uniform distribution + query alignment, no hot-key/whale-tenant analysis, or no resharding plan; sharding added before earlier scaling rungs are proven insufficient.
- Large immutable blobs/media/backups placed in the transactional database/block volume without access-pattern justification or object-storage comparison; database files placed on object storage without a database-supported abstraction. Block storage fits DB/filesystem random I/O; object storage fits keyed blobs and archival scale; shared file storage fits required filesystem semantics. — why: application data type and physical storage substrate are different decisions.

**Lifecycle (WARN):**

- A new field covered by the project's privacy, retention, residency, or regulated-data requirements with no applicable handling decision — retrofitting erasure into denormalized or immutable stores can be costly or constrained.
- New public identifier exposing an internal sequential PK (enumerable, leaks volume).

**Violation format:**

```
BLOCKED: {filePath}:{line} commits {stateChange} and performs {effect} without the project's required atomicity/consistency mechanism — invariant can diverge
BLOCKED: {filePath}:{line} tenant-scoped access lacks the project's required isolation enforcement — cross-tenant read possible
BLOCKED: {filePath}:{line} cache key omits tenant/identity dimension ({key}) — cross-tenant leak
BLOCKED: {migrationFile}:{line} changes schema incompatibly while old and new versions run together — use a migration sequence compatible with the release contract
BLOCKED: {filePath}:{line} concurrent check-then-act at {isolationLevel} has no store-supported protection for {invariant} — conflicting writes possible
BLOCKED: {filePath}:{line} distributed lock lacks the project's required stale-owner and recovery protection — split brain possible
WARN: {filePath}:{line} relies on wall-clock ordering where the contract requires cross-host order — use the project's supported ordering mechanism
WARN: {filePath}:{line} new eventually-consistent read path with no declared staleness budget or SLI
WARN: {filePath}:{line} adds sharding before earlier scaling rungs are proven insufficient or without a reshard/hot-key plan
WARN: {filePath}:{line} cache/CDN path has no authoritative source + invalidation/key/eviction contract
```

**MUST ATTENTION** before any Category-12 finding, record the triggering surface and classify the specific check as Applicable or N/A; inspect its actual configured mechanism and verify lower-layer enforcement before flagging. Check tenant filters only for tenant-scoped data and outbox/atomic-publication mechanisms only for state-plus-effect flows; neither is a universal requirement. — why: automatic enforcement and alternative consistency designs can make a missing call-site pattern correct.

---

## Phase 4: Finalize — Architecture Compliance Report

Update report with final sections:

### Verdict Scoring

| Verdict     | Condition                                                                        |
| ----------- | -------------------------------------------------------------------------------- |
| **BLOCKED** | 1+ BLOCKED findings — must fix before merge                                      |
| **WARN**    | 0 BLOCKED, 1+ WARN findings — review and decide                                 |
| **PASS**    | 0 BLOCKED, 0 WARN, and at least one applicable check — all applicable checks pass |
| **N/A**     | No architecture check applies to the reviewed scope; state the reason            |

### Report Structure

```markdown
# Architecture Review Report — {date}

## Scope

- Files reviewed: {count}
- Modules/services/packages affected: {list or N/A}
- Blast radius: {summary from Phase 2}

## Verdict: {PASS | WARN | BLOCKED | N/A}

## BLOCKED Findings (Must Fix)

### {Category}: {description}

- **File:** {path}:{line}
- **Rule:** {rule from project evidence: configured reference, accepted ADR, or established code pattern}
- **Evidence:** {what was found}
- **Fix:** {what to change}

## WARN Findings (Review)

### {Category}: {description}

- **File:** {path}:{line}
- **Rule:** {rule from project evidence: configured reference, accepted ADR, or established code pattern}
- **Evidence:** {what was found}
- **Recommendation:** {suggested action}

## PASS Categories

- {list of categories that passed with no findings}

## Pattern Applicability

| Check | Status | Evidence or N/A reason |
| --- | --- | --- |
| {architecture/framework/project convention} | {Applicable/N/A} | {config, configured reference, accepted ADR, or established code `file:line`} |

## Architecture Health Summary

- Quality Tooling Baseline: {PASS/WARN/BLOCKED/N/A}
- Architecture Boundaries and Layers: {PASS/WARN/BLOCKED/N/A}
- Messaging and Delivery: {PASS/WARN/BLOCKED/N/A}
- Application Patterns (CQRS/validation/mapping): {PASS/WARN/BLOCKED/N/A}
- Data Access and Repository Patterns: {PASS/WARN/BLOCKED/N/A}
- Project-Defined Service Patterns: {PASS/WARN/BLOCKED/N/A}
- Side Effects and Event Handling: {PASS/WARN/BLOCKED/N/A}
- Service and Module Boundaries: {PASS/WARN/BLOCKED/N/A}
- Frontend Architecture: {PASS/WARN/BLOCKED/N/A}
- ADR / Recorded-Decision Conformance: {PASS/WARN/BLOCKED/N/A}
- Project Spec and Test Contract: {PASS/WARN/BLOCKED/N/A}
- Scalability & Coupling Regression (4 coupling dimensions): {PASS/WARN/BLOCKED}
- Data, Consistency & Tenancy Boundaries: {PASS/WARN/BLOCKED/N/A}
- Technique applicability (advisory — INFO, does NOT alter verdict): {matrix summary or N/A-by-scale}
```

> The "Technique applicability" line is **advisory/INFO only** — it reports the scale-tier technique matrix as guidance and NEVER changes any category severity or the Phase 4 verdict.

---

## Architecture Boundary Check (Automated)

Per changed file:

1. Read `docs/project-config.json` → `architectureRules.layerBoundaries`
2. Determine layer — match file path against each rule's `paths` glob patterns
3. Scan imports — grep for configured language's import/include statements
4. Check violations — import path contains layer name in `cannotImportFrom` = violation
5. Exclude framework — skip files matching `architectureRules.excludePatterns`
6. BLOCK on violation: `"BLOCKED: {layer} layer file {filePath} imports from {forbiddenLayer} layer ({importStatement})"`

`architectureRules` absent from project-config.json → skip silently.

---

## Systematic Review Protocol (10+ changed files)

Not run under `--report-only` — that mode reviews sequentially in this context.

1. **Categorize** — Group files by service/layer/concern.
2. **Parallel Sub-Agents** — Launch one `architect` sub-agent per category with architecture-specific checklist.
3. **Synchronize** — Collect findings, cross-reference service boundaries.
4. **Consolidate** — Single holistic report with per-category verdicts.

---

## Phase 5: Why-Review Self-Validation Gate (MANDATORY when findings exist)

> **Purpose:** Adversarial validation of own findings BEFORE handoff — catch over-flagged Highs, false positives, severity inflation at source, not downstream.

**Trigger:** Any finding produced (Critical, High, Medium, OR Low). Skip ONLY when report's verdict is unconditional PASS with literally zero findings.

**Protocol:**

1. Read own finalized report from `tmp/reports/{skill}-{date}-{slug}.md`
2. Invoke `/why-review` skill with arg: `validate findings in tmp/reports/{skill}-{date}-{slug}.md — verify each finding has file:line proof, steel-man each rejected interpretation, and stress-test severity classifications`
3. Read validation verdict path returned by why-review, expected as `tmp/reports/why-review-validate-{date}.md`
4. **why-review demotes/removes any finding →** UPDATE own finalized report with revised severities, remove false positives, add `## Why-Review Validation Notes` section citing what changed + why.
5. **why-review confirms all findings →** Append `## Why-Review Validation` line to own report stating "All N findings re-validated against actual code; no severity changes."

**Self-audit your OWN findings FIRST (before invoking why-review):** run the 11 thinking red flags in `.claude/docs/architecture-knowledge.md` §20.3 against each draft finding and each recommendation. The four that fire most often in this skill: **you cannot name what your recommendation SACRIFICES** · **you say "best practice" instead of naming the forces it balances** · **you flagged a scale problem you cannot evidence** · **you are treating a two-way door as irreversible**. Any hit invalidates the REASONING — demote or delete the finding, do not reword it. — why: a finding that survives only because it sounds authoritative consumes the team's fix budget and trains them to ignore the report.

**Skip conditions (record explicit reason if skipping):**

- Verdict unconditional PASS with zero findings → log "Skipped — no findings to validate".
- Why-review skill itself is active context (avoid recursion).

**Why this exists:** AI sub-agent reports inherit confirmation bias — orchestrator absorbs severity claims as ground truth. The 2026-05-09 review incident produced 5 Highs; adversarial validation demoted 3. Codified as standard practice.

---

## Next Steps

**MANDATORY when standalone:** After completing, use `AskUserQuestion` to present:

- **"/code-simplifier" (Recommended)** — Simplify and refine code
- **"/code-review"** — Deep code quality review
- **"Skip, continue manually"** — user decides

**Exempt** under `--report-only`, when a parent skill or workflow invoked this review, or when running as a sub-agent: do NOT ask — return these next-step recommendations in the returned summary and let the caller decide. — why: `AskUserQuestion` cannot reach the user from a sub-agent, and a leaf that waits on a prompt stalls its parent's all-return barrier.

> **Combined audit:** For a whole-project architecture + compliance + production-readiness audit in one pass, run `/architecture-review-full` (or `/start-workflow workflow-architecture-audit`) — it fans out this skill, `architecture-scalability-review`, and `production-readiness-review` as parallel sub-agents and synthesizes one consolidated report.

## AI Agent Integrity Gate (NON-NEGOTIABLE)

Before reporting ANY work done:

1. **Grep every removed name.** Extraction/rename/delete → grep confirms 0 dangling refs across ALL file types.
2. **Ask WHY before changing.** Existing values intentional until proven otherwise — NEVER "fix" without traced rationale.
3. **Verify ALL outputs.** One build passing ≠ all builds passing — check every affected stack.
4. **Evaluate pattern fit.** Copying nearby code? Verify preconditions match — same scope, lifetime, base class, constraints.
5. **New artifact = wired artifact.** Created something? Prove registered, imported, reachable by all consumers.

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. Simple tasks: ask user whether to skip.

<!-- OVERRIDE:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable.
>
> **Why:** The main agent knows what it (or `/feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** ONLY after a validated-finding fix cycle, or when the user/workflow explicitly requests an independent high-risk architecture synthesis pass. A review pass that finds issues triggers validation first; it does NOT trigger a fresh-context pass over the same findings before validation/fix.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn a NEW `Agent` tool call — use `architect` subagent_type for architecture reviews (see Sub-Agent Type Override above)
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. A reviewer prompt carries every protocol body inline and is never handed a path to go read (the reviewer-prompt rule of `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `tmp/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns a NEW `Agent` call
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - NEVER skip the full review restart after a validated fix cycle — every fix invalidates the prior verdict
> - Continue until a complete full review pass clears the current round's exit bar and persisted `minRounds` (round 1: zero findings; round 2 and the conditional round 3: zero CRITICAL/HIGH/MEDIUM, LOW deferred). The budget is 2 rounds plus ONE extension to round 3, granted only when round 2 leaves a validated CRITICAL/HIGH open (a failed non-test binary gate counts as CRITICAL); round 3 is the review hard cap. A failing test gate is not budgeted — keep fixing and re-running until the tests pass, never forcing green. If the same blocker repeats across 2 full invocations with no progress, or the budget is spent with blocking findings open, escalate via `AskUserQuestion`
> - Persist completed rounds, repeated blockers, findings and the explicit minimum in the owning run's `review-policy.cjs` record. Resume that record after interruption; target changes invalidate evidence and acceptance but preserve the bounded round budget. In-flight attempt IDs may be session-local; they do not replace or reset completed-round state

<!-- /OVERRIDE:fresh-context-review -->

## Sub-Agent Type Override

> **MANDATORY:** Architecture reviews spawn `architect` sub-agent, NOT `code-reviewer`.
> Keep `subagent_type: "architect"` from canonical template below; NEVER revert to `code-reviewer`.
> **Rationale:** `architect` carries cross-service impact analysis, ADR creation, multi-service security/performance context that `code-reviewer` lacks for architecture-level decisions.

<!-- OVERRIDE:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 11 protocol blocks VERBATIM, copied WHOLESALE and unmodified. They are the review-tier renderings of their canonical `SYNC:` tags, not literal copies; when a canonical protocol changes, update the matching body here in the same edit. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** A fresh reviewer must hold every rule it reviews against from its first token; a path or a placeholder would make it depend on a file read, or on a hook that may not fire for it. Reviewer prompts are therefore the one place the hybrid policy (`SYNC:shared-protocol-duplication-policy`) always keeps full bodies: the template carries all 11 protocol bodies pre-embedded, and the orchestrator copies it wholesale.

### Subagent Type Selection

- `architect` — ALWAYS for architecture reviews (cross-service, ADR, security/performance at system level)
- `code-reviewer` — for code quality reviews only (NOT architecture)

### Canonical Agent Call Template (Copy Verbatim)

```
Agent({
  description: "Fresh Round {N} review",
  subagent_type: "architect",
  prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Review plan files under {plan-dir}" | "Review integration tests in {path}"}

## Round
Round {N}. You have ZERO memory of prior rounds. Re-read all target files from scratch via your own tool calls. Do NOT trust anything from the main agent beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Spec ↔ Tests ↔ Code Triangulation
DO THIS FIRST — before any per-protocol check below. The review target is the WHOLE PACKAGE, not the diff alone. Read `docs/project-config.json` and resolve `specArtifacts`: a valid profile selects its configured `intent/contracts/evidence` section roles, identifiers, ownership rule, and test-carrier dialects; only an absent profile selects the strict-default business-spec shape (§3 ACs / §4 BRs / §5 invariants / §8 TCs). A malformed or unsupported declaration is `BLOCKED`; never treat it as absent or fall back. Load the governing artifact, its tests, and the changed code TOGETHER, and reason about their mutual consistency BEFORE judging any one in isolation.
1. Locate all three faces: the canonical owner section(s), the tests that guard them, and the production code that implements them. With a native profile, preserve owner path + case/scenario ID + optional variant and resolve each through its configured carrier to the actual test. A missing face is itself a finding (SPEC-GAP / TEST-GAP / DEAD-SPEC).
2. Triangulate pairwise — every disagreement is a finding; classify which face is wrong:
   - code vs spec: behavior the code does that no configured `intent/contracts` rule (or strict-default §3/§4/§5/§8 rule) describes → CODE-EXTRA or SPEC-STALE; a hard contract/invariant with no enforcing path → CODE-WRONG.
   - tests vs spec: a configured native case with no executing assertion, or a test asserting behavior no native rule/case names → TEST-GAP or SPEC-SILENT. Without `specArtifacts`, check strict-default §8 TCs.
   - tests vs code: a changed code path with no covering test → TEST-GAP; a test that still passes against a deliberately broken invariant → WEAK-TEST (apply the mutation thinking in Bug Detection).
3. Hidden-rule capture: any invariant the code enforces but the spec never states (SPEC-SILENT) MUST be surfaced as a finding, added to the profile's configured `intent` or `contracts` section, and linked from its `evidence` section to a native case whose executing assertion is inspected. Without a profile, use strict-default §3/§4/§5/§8 and TC. This is the enrichment loop, never a silent pass.
4. Only after the three faces agree — or every disagreement is logged as a finding — proceed to the per-protocol checks below; when enrichment adds spec/test content, re-review the package against the enriched spec.
NEVER mark review PASS while any spec/test/code face disagrees without a logged finding. The diff is the entry point; the package is the unit of judgment.

### Evidence-Based Reasoning
Speculation is FORBIDDEN. Every claim needs proof.
1. Cite file:line, grep results, or framework docs for EVERY claim
2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
3. Cross-service validation required for architectural changes
4. "I don't have enough evidence" is valid and expected output
BLOCKED until: Evidence file path (file:line) provided; Grep search performed; 3+ similar patterns found; Confidence level stated.
Forbidden without proof: "obviously", "I think", "should be", "probably", "this is because".
If incomplete → output: "Insufficient evidence. Verified: [...]. Not verified: [...]."

### Bug Detection
MUST check categories 1-4 for EVERY review. Never skip.
1. Null Safety: Can params/returns be null? Are they guarded? Optional chaining gaps? .find() returns checked?
2. Boundary Conditions: Off-by-one (< vs <=)? Empty collections handled? Zero/negative values? Max limits?
3. Error Handling: Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
4. Resource Management: Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
5. Concurrency (if async): Missing await? Race conditions on shared state? Stale closures? Retry storms?
6. Stack-Specific: Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
Classify every finding by consequence (never by effort): CRITICAL = immediate material security/safety/data-loss risk or failed binary gate → block; HIGH = material correctness, contract, privacy, or authority risk → must fix; MEDIUM = bounded consequential edge/resilience/maintainability gap → must clear the current round, or escalate with an explicit residual-risk follow-up that does not create a clean pass; LOW = non-blocking polish with no credible present impact → record/defer from round 2; `NOT VERIFIABLE` is unresolved evidence, not LOW.

### Design Patterns Quality
Priority checks for every code change:
1. Consistency and reuse: follow documented local patterns; extract a shared abstraction only when repetition or a demonstrated consumer need justifies its cost. Similar names alone do not require a shared base class.
2. Responsibility: follow the architecture established by project configuration, references, accepted decisions, and existing code. Place behavior with its actual owner; do not presume an entity/service/controller hierarchy or forbid a layer without project evidence.
3. Apply cohesion, coupling, and dependency-management principles when their assumptions fit the project's paradigm. SOLID is useful for object-oriented boundaries, not a mandatory checklist for every language or codebase.
4. After extraction/move/rename: Grep ENTIRE scope for dangling references. Zero tolerance.
5. YAGNI gate: Treat repeated patterns as evidence to evaluate extraction, not a numeric threshold. Extract when a shared reason to change, real consumers, or an evidenced ownership/substitution boundary lowers total change cost; do not create patterns for hypothetical future use.
6. Purpose-oriented naming: Name public or cross-layer abstractions by the capability, domain purpose, or contract consumers rely on—not the current provider, SDK, framework, database, or transport. `IStorage`/`Storage` → `AzureBlobStorage`; use `IAzureStorage` only when Azure-specific semantics are intentionally part of the contract.
7. Contract-fit check: Read callers and every implementation before judging a name; narrow an over-broad abstraction (`IObjectStore`, `DocumentStore`) instead of rewarding a generic name that lies about behavior.
8. Mechanism/generic-name smell: Treat `Manager`, `Helper`, `Utils`, `Data`, `Thing`, `Service`, `Interface`, type decorations, and unexplained abbreviations as review signals—not automatic defects; flag them only when they hide purpose, scope, or responsibility.
9. Concrete implementation names: Provider, strategy, transport, or test-double names are valid on concrete types when they distinguish real behavior (`AzureBlobStorage`, `InMemoryStorage`, `RetryingStorage`); keep those details out of the caller-facing contract unless the contract promises them.
10. Language convention: Preserve local interface syntax and naming style; `.NET` `I` prefixes and Google TypeScript's unmarked interfaces are both valid local conventions.
Anti-patterns to flag: God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

### Logic & Intention Review
Verify WHAT code does matches WHY it was changed.
1. Change Intention Check: Every changed file MUST serve the stated purpose. Flag unrelated changes as scope creep.
2. Happy Path Trace: Walk through one complete success scenario through changed code.
3. Error Path Trace: Walk through one failure/edge case scenario through changed code.
4. Acceptance Mapping: If plan context available, map every acceptance criterion to a code change.
5. Tests Verify Intent: For test/spec changes, verify tests name the protected business rule or invariant and would fail if that intent breaks.
6. Migration Test Exclusion: Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.
NEVER mark review PASS without completing both traces (happy + error path).

### Test Spec Verification
Map changed code to test specifications.
1. Identify the project's test/spec format from existing docs, test-case files, BDD feature files, or spec folders.
2. Every changed code path MUST map to a corresponding test case/spec (or flag as "needs test case").
3. New functions/endpoints/handlers → flag for test spec creation.
4. Migration files are excluded from test/spec creation; schema/data migrations are one-time execution paths, not core application logic.
5. If spec evidence fields exist, verify they point to actual code (file:line, not stale references).
6. Verify each meaningful test case names the business intent/invariant; flag behavior-only cases that only mirror implementation details.
7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
8. If no specs exist for a changed path → log the gap and recommend the project's test-spec workflow.
NEVER skip test mapping. Untested code paths are the #1 source of production bugs.

### Behavioral Delta Matrix
MANDATORY for any bugfix review. Produce input-state × pre-fix × post-fix × delta table BEFORE writing verdict.
- Minimum 3 rows; include at least one row OUTSIDE the original bug report.
- Any "REGRESSION" delta → review returns FAIL until a preservation test is added.
- Narrative descriptions do NOT substitute for the matrix.
Example rows (external-record sync fix):
| Input                 | Pre-fix | Post-fix                  | Delta      |
| --------------------- | ------- | ------------------------- | ---------- |
| Record exists (valid) | Reused  | Always recreated → orphan | REGRESSION |
| Record missing (404)  | Error   | Recreated                 | Fixed      |

### Fix-Layer Accountability
Do not assume the crash site owns the defect. Trace the actual execution and data flow, then fix the component that owns the violated contract.
MANDATORY before ANY fix:
1. Trace the affected path — map the real origin, transformations, boundaries, and observed failure in the surfaces this project uses. Do not invent absent layers.
2. Identify the contract owner — use project architecture and code evidence to find which component is responsible for the invalid state or behavior.
3. Choose the correction point — fix the authoritative owner and retain any validation required at untrusted boundaries. A multi-file correction can be valid; justify it by the contracts each file owns rather than a file-count threshold.
4. Check bypass paths — inspect relevant constructors, adapters, parsers, caches, persistence, or other entry points that actually exist in the affected flow.
BLOCKED until: The affected path is traced; the owner is supported by file:line evidence; relevant consumers and bypass paths are checked; and the correction point fits the project's architecture.
Anti-patterns (REJECT): assuming the symptom site is the owner; scattering workarounds without tracing the contract; assuming the lowest technical layer is always authoritative; removing validation from a real trust boundary to force a single correction point.

### Rationalization Prevention
AI skips steps via these evasions. Recognize and reject:
- "Too simple for a plan" → Simple + wrong assumptions = wasted time. Plan anyway.
- "I'll test after" → RED before GREEN. Write/verify test first.
- "Already searched" → Show grep evidence with file:line. No proof = no search.
- "Just do it" → Still need TaskCreate. Skip depth, never skip tracking.
- "Just a small fix" → Small fix in wrong location cascades. Verify file:line first.
- "Code is self-explanatory" → Future readers need evidence trail. Document anyway.
- "Combine steps to save time" → Combined steps dilute focus. Each step has distinct purpose.

### Graph-Assisted Investigation
MANDATORY when .code-graph/graph.db exists.
HARD-GATE: MUST run at least ONE graph command on key files before concluding any investigation.
Pattern: Grep finds files → trace --direction both reveals full system flow → Grep verifies details.
- Investigation: trace --direction both on 2-3 entry files
- Fix/Debug: callers_of on buggy function + tests_for
- Feature/Enhancement: connections on files to be modified
- Code Review: tests_for on changed functions
- Blast Radius: trace --direction downstream
CLI: python .claude/scripts/code_graph {command} --json. Use --node-mode file first (10-30x less noise), then --node-mode function for detail.

### Understand Code First
HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
1. Search 3+ similar patterns (grep/glob) — cite file:line evidence.
2. Read existing files in target area — understand structure, base classes, conventions.
3. Run python .claude/scripts/code_graph trace <file> --direction both --json when .code-graph/graph.db exists.
4. Map dependencies via connections or callers_of — know what depends on your target.
5. Write investigation to tmp/analysis/ for non-trivial tasks (3+ files).
6. Re-read analysis file before implementing — never work from memory alone.
7. NEVER invent new patterns when existing ones work — match exactly or document deviation.
BLOCKED until: Read target files; Grep 3+ patterns; Graph trace (if graph.db exists); Assumptions verified with evidence.

## Reference Docs (READ before reviewing)
- code-review-rules.md, under the reference-docs root (default docs/project-reference; docsRoots.projectReference.path in docs/project-config.json overrides it)
- {skill-specific reference docs — e.g., integration-test-reference.md for integration-test-review; backend-patterns-reference.md for backend reviews; frontend-patterns-reference.md for frontend reviews}

## Target Files
{explicit file list OR "run git diff to see uncommitted changes" OR "read all files under {plan-dir}"}

## Output
Write a structured report to tmp/reports/{review-type}-round{N}-{date}.md with sections:
- Status: PASS | FAIL
- Issue Count: {number}
- Critical Issues (with file:line evidence)
- High Priority Issues (with file:line evidence)
- Medium / Low Issues
- Cross-cutting findings

Return the report path and status to the main agent.
Every finding MUST have file:line evidence. Speculation is forbidden.
`
})
```

### Rules

- DO copy the template wholesale — including all 11 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO choose `architect` subagent_type for architecture reviews — do NOT revert to `code-reviewer` (see Sub-Agent Type Override above)
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /OVERRIDE:review-protocol-injection -->

> **Critical Purpose:** Architecture compliance — no layer violations, no messaging anti-patterns, no service boundary breaches, no pattern drift.
> **External Memory:** Complex/lengthy work → write findings to `tmp/reports/`. Prevents context loss, serves as deliverable.
> **Evidence Gate:** MANDATORY — every finding requires `file:line` proof + confidence percentage (>80% act, <80% verify first).

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-agent-as-user-access` — Treat an AI agent as a first-class machine actor with its own identity and authority; creating a greenfield system or reviewing actor-facing architecture → .claude/skills/shared/protocols/ai-agent-as-user-access.md
- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `category-review-thinking` — Derive review concerns per category of changed files from domain knowledge; reviewing a changeset that spans several file categories → .claude/skills/shared/protocols/category-review-thinking.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `double-round-trip-review` — Validated-finding fix loop: review, validate, fix, then a fresh full re-review, capped at two rounds; running a review that fixes findings and must re-review until the severity bar clears → .claude/skills/shared/protocols/double-round-trip-review.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `goal-contract-satisfaction-loop` — Save the goal in a file and loop until every saved criterion passes; executing work against a user goal → .claude/skills/shared/protocols/goal-contract-satisfaction-loop.md
- `graph-assisted-investigation` — Run a code-graph command on the key files before concluding; investigating code while the code graph exists → .claude/skills/shared/protocols/graph-assisted-investigation.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `review-principle-awareness` — Classify the change context first, then apply the current principles that fit it; starting any review → .claude/skills/shared/protocols/review-principle-awareness.md
- `scale-technique-gate` — Which scale techniques a system warrants, and which it does not; reviewing architecture or production readiness → .claude/skills/shared/protocols/scale-technique-gate.md
- `scenario-stress-eval` — Judge the system under concrete failure and load scenarios; evaluating resilience or production readiness → .claude/skills/shared/protocols/scenario-stress-eval.md
- `sequential-thinking-protocol` — Structured multi-step reasoning with revision, branch and hypothesis markers; planning, debugging or reviewing complex or ambiguous work → .claude/skills/shared/protocols/sequential-thinking-protocol.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md
- `sub-agent-selection` — Pick the sub-agent type from the routing guide; choosing which sub-agent to spawn → .claude/skills/shared/protocols/sub-agent-selection.md
- `systematic-review-batching` — Map-reduce review: size-capped batches, one sub-agent per batch, then reduce; reviewing a large changeset → .claude/skills/shared/protocols/systematic-review-batching.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `trade-off-interrogation-gate` — Three trade-off questions before any verdict, score or recommendation; rendering a verdict or recommending an option → .claude/skills/shared/protocols/trade-off-interrogation-gate.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files before concluding when graph.db exists. Pattern: grep → graph trace → grep verify.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `/project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:systematic-review-batching:reminder -->

- **MANDATORY** Large changeset → batch by size cap (≤8 files OR ≤2000 diff-lines), one parallel sub-agent per batch; never review many files one-by-one.
- **MANDATORY** > 6 categories OR > 40 files → add the hierarchical synthesis tier; each concern-synthesizer emits cross-concern interaction candidates and the orchestrator runs the cross-concern pass before concluding.

<!-- /SYNC:systematic-review-batching:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->


<!-- SYNC:category-review-thinking:reminder -->

- **MANDATORY** Derive review categories from file language + directory semantics + change nature; create a sub-task per category.
- **MANDATORY** Derive each category's concerns from first principles with `file:line` evidence — never a fixed checklist.

<!-- /SYNC:category-review-thinking:reminder -->

<!-- SYNC:scale-technique-gate:reminder -->

**IMPORTANT MUST ATTENTION** scale-technique gate: derive the scale tier from evidence FIRST (T0 internal · T1 <10k · T2 10k–1M · T3 millions+), then judge each warranted technique `PRESENT`/`MISSING-WARRANTED`/`N/A-by-scale`/`OVER-ENGINEERED`. Advise on warranted-but-missing gaps AND advise AGAINST unwarranted heavyweight techniques (anti-over-engineering). **ADVICE-ONLY — emit the Technique Applicability Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scale-technique-catalog.md` (authoritative for tier thresholds & per-technique warranting tiers — on any change update the catalog FIRST, then re-run `inject_scale_technique_gate.py`).

<!-- /SYNC:scale-technique-gate:reminder -->

<!-- SYNC:scenario-stress-eval:reminder -->

**IMPORTANT MUST ATTENTION** scenario-stress gate: reuse the scale tier `T0`–`T3` AND derive business-criticality `B0`–`B3` from evidence first — apply the **criticality-signal floor** (regulated/PII/financial/health data · money movement · auth/identity · legal-compliance → at least `B2` even absent SLA docs; do NOT default to `B3`). Select only the scenarios the `B`/`T` combination warrants, then walk each (simulate → trace → failure signature → self-heal/MTTR → trade-off) and assign `WITHSTANDS`/`DEGRADES-GRACEFULLY`/`FAILS-HARD`/`N/A-by-business`/`OVER-HARDENED`. Anti-over-engineering is first-class (a lean system that needs no HA/DR is a PASS) AND symmetric (never under-harden a `B2`+ system for low traffic). **ADVICE-ONLY — emit the Scenario Stress Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scenario-stress-catalog.md` (authoritative for scenarios/verdicts/business-tiers — on any change update the catalog FIRST, then re-run `inject_scenario_stress_gate.py`; scale tier stays single-sourced in `scale-technique-catalog.md`).

<!-- /SYNC:scenario-stress-eval:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:double-round-trip-review:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** run the review loop (aka **Self-Review Convergence Loop**): review → validate findings → fix validated blocking findings → FULL re-review. Any newly produced output/judgment gets ≥1 self-review, and any new judgment ≥1 `/why-review --validate-findings` pass, before it is treated as final.
- **MANDATORY severity floor:** round 1 exits only on zero findings at any severity; from round 2 the bar is zero CRITICAL/HIGH/MEDIUM, so a LOW-only round ENDS the loop once the persisted `minRounds` is met — list every deferred LOW in the report. NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to reach the exit, and NEVER apply the floor to a binary gate (test-green, security must-fix).
- **MANDATORY round cap of 2, extendable ONCE to round 3 — a ceiling, NEVER a target.** A clean pass ends the loop once the persisted `minRounds` is met (default 1; explicit 2 requires an independent pass). Round 2 ending with a validated CRITICAL/HIGH still open (a failed non-test binary gate counts as CRITICAL) grants exactly ONE extra round; round 2 ending with only MEDIUM/`NOT VERIFIABLE` open, or round 3 ending with any review blocker open → **STOP and escalate via `AskUserQuestion`**, never a silent PASS. The 2-repeated-no-progress blocker rule escalates earlier if it trips first. A failing TEST gate has NO round cap and buys no extension — keep fixing and re-running until tests pass, never forcing green.

<!-- /SYNC:double-round-trip-review:reminder -->




<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `AskUserQuestion` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:ai-agent-as-user-access:reminder -->

**IMPORTANT MUST ATTENTION** Greenfield strongly recommends treating AI agents as first-class non-human actors from inception; choose evidence-backed API/CLI/MCP/WebMCP/event/SDK surfaces over one application capability core with authorization, consent, schemas, idempotency, audit, contract tests in the project's native format (GWT is one option), and observability. Big feature and architecture review are optional/advisory: inspect evidence, adapt, defer as an owned opportunity, record `NOT-APPLICABLE`, or block safety gaps; never build every surface or assume agent = administrator.

<!-- /SYNC:ai-agent-as-user-access:reminder -->

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Review changed code against project-evidenced architecture and contracts; preserve invariant and data ownership, consistency, coupling, boundary quality, and generated artifact integrity; hand off evidence-backed PASS/WARN/BLOCKED findings and concrete next steps.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Graph-Assisted Investigation:** Run one graph command on key files when graph.db exists.
- **Nested Task Creation:** Child skill expands visible phase tasks; link parent when nested.
- **Project Reference Docs Guide:** Read required project-reference docs before target work; `lessons.md` always.
- **Task Tracking External Report:** Bootstrap tasks; persist plan/review findings to `tmp/reports/` incrementally.
- **Critical Thinking Mindset:** Traced proof per claim, confidence >80%; NEVER present guess as fact.
- **Sequential Thinking Protocol:** Multi-step Thought N/M with REVISION/BRANCH/HYPOTHESIS markers and confidence closer.
- **Evidence-Based Reasoning:** Cite `file:line` for every claim; <60% confidence = do NOT recommend.
- **Double-Round-Trip Review:** Validate findings, fix only current-round blocking findings, and full re-review until the round severity bar is clear (Round 1: zero findings; Round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred; binary gates always block).
- **Sub-Agent Selection:** Route specialized domains to the matching specialist agent, NEVER `code-reviewer`.
- **Source/Test Drift Check:** Source behavior changes → inspect affected tests; decide fix vs update.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Systematic Review Batching:** Large changeset → size-capped parallel batches, then reduce; NEVER one-by-one.
- **Severity Rubric:** Classify by consequence Critical/High/Medium/Low using `SYNC:severity-rubric`; round 1 blocks on every validated finding, round 2 blocks only CRITICAL/HIGH/MEDIUM, and LOW is recorded/deferred. Failed binary gates always block.
- **Category Review Thinking:** Derive each category's concerns from first principles with evidence, NEVER a checklist.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.
- **AI Agent as User:** Optional, evidence-gated review of agent identity/delegation, least-privilege capabilities, selected API/CLI/MCP/WebMCP/event surfaces, safety/consent, contract tests, audit, and observability; record N/A, owned deferral, or blockers rather than inventing gaps or expanding scope.

**IMPORTANT MUST ATTENTION** read `docs/project-config.json` and resolve applicable architecture references in Phase 0 BEFORE reviewing — project config, configured references, accepted ADRs, and established code determine the rule; never assume a stack, path, or framework convention from general knowledge — why: hardcoded framework names rot on rename and break portability to other repos.
**IMPORTANT MUST ATTENTION** every violation requires `file:line` proof + confidence >80% (60-80% verify first, <60% do NOT recommend); inspect 3+ relevant code examples when the code establishes the pattern, and check for exceptions where relevant. Use config, references, and accepted ADRs as direct evidence; surface conflicting evidence instead of choosing silently. NEVER speculate — instead state "Insufficient evidence. Verified: [...]. Not verified: [...]."
**IMPORTANT MUST ATTENTION** review serially, one category at a time (Cat 0 tooling baseline → Cat 12 data, consistency & tenancy): doc rule → source evidence → `Think:` derivation → PASS/WARN/BLOCKED. NEVER scan categories simultaneously — why: parallel scanning collapses per-category evidence and drops findings.
**IMPORTANT MUST ATTENTION** review every applicable Phase-3 category and record each concrete architecture, framework, stack, transport, persistence, or project-convention check as Applicable or N/A with project evidence — never stop early. Category subjects: 0 quality tooling · 1 actual architecture boundaries · 2 messaging/delivery · 3 application conventions · 4 data access · 5 project-defined service eras · 6 side effects/events · 7 service/module boundaries · 8 frontend conventions (frontend files only) · 9 ADR conformance · 10 spec-loop discipline · 11 scalability/coupling · 12 data, consistency, and tenancy. N/A skips only the named implementation pattern; assess invariant ownership, data ownership, idempotency, coupling, and boundary quality wherever the changed flow makes them relevant — why: the review catches real regressions without turning framework examples into false requirements.
**IMPORTANT MUST ATTENTION** judge coupling in FOUR separate dimensions — code, temporal (runtime), semantic (contract), operational (deployment). Low code coupling proves nothing: the distributed-monolith signature is low code coupling + high temporal + semantic + deployment coupling (services releasing together, shared DB or shared domain lib, sync chain ≥4 hops) — why: a diff that deepens it looks clean file-by-file and makes the exit permanently harder.
**IMPORTANT MUST ATTENTION** prove workload before technique — read/write ratio, peak load, query shapes, growth, hot-key skew, geography and consistency budgets — then judge measure/tune → vertical and/or stateless horizontal from headroom + availability → cache/CDN/read replicas or queue/LSM write path → partition/shard LAST. No evidence = INFO/route, NEVER a scale violation; a lean system that meets its targets is compliant.
**IMPORTANT MUST ATTENTION** check high-consequence data and consistency risks only when their trigger applies: state-plus-effect flows without a contract-compatible consistency mechanism · repeatable work without sufficient idempotency · tenant-scoped access without the project's isolation enforcement · incompatible schema changes during overlapping releases · unbounded outbound work · concurrent invariants without store-supported protection · distributed locks without stale-owner/recovery protection. Outboxes, tenant predicates, SQL isolation/locks, and fencing tokens are possible mechanisms, not universal requirements; inspect the project's actual contract and implementation — why: the failure modes are broadly relevant but their correct protections depend on the system.
**IMPORTANT MUST ATTENTION** self-audit your OWN draft findings against the 11 thinking red flags (`.claude/docs/architecture-knowledge.md` §20.3) BEFORE Phase 5 — a finding whose SACRIFICE you cannot name, one resting on "best practice", one asserting a scale problem with no evidence, or one treating a two-way door as irreversible is DEMOTED or DELETED, never reworded — why: a finding that survives on authoritative tone alone consumes the team's fix budget and teaches them to ignore the report.
**IMPORTANT MUST ATTENTION** when the project uses modules or port/adapter boundaries, judge a module by functionality hidden ÷ interface surface and check whether a port is declared where the project dependency rule requires it; otherwise assess actual cohesion and coupling without requiring a port pattern — why: interface count alone does not prove useful modularity.
**IMPORTANT MUST ATTENTION** universal architecture knowledge (`.claude/docs/architecture-knowledge.md`) is a RECOGNITION aid, never authority — project reference docs and accepted ADRs OUTRANK it, an anti-pattern match is a HYPOTHESIS until `file:line`/config/topology evidence AND the damaged quality attribute are both named, and a grepped codebase convention beats any catalog entry — why: catalog-shaped false positives are confident, plausible, and the most expensive output this skill can produce.
**IMPORTANT MUST ATTENTION** follow the phase order Phase 0 → 1 → 2 → 3 → 4 → 5 → Next Steps; Phase 5 `/why-review` self-validation is MANDATORY whenever any finding exists, and Next Steps MUST present `/code-simplifier` / `/code-review` / skip via `AskUserQuestion` when standalone (under `--report-only`, a parent skill/workflow, or a sub-agent, return them in the summary instead) — why: the AI repeatedly forgets the validation gate and stops at Phase 4, shipping unvalidated severities downstream.
**IMPORTANT MUST ATTENTION** `--report-only` declares Phases 0–5 only — scope from the caller's brief, no fix, no restart, no nested sub-agent fan-out, no `AskUserQuestion`, no writer beyond the report; return the report path plus validated findings grouped Critical/High/Medium/Low via the BLOCKED/WARN mapping — why: a read-only leaf that fixes, fans out, asks, or regenerates docs stalls or races its barrier siblings.
**IMPORTANT MUST ATTENTION** break work into small tasks using `TaskCreate` BEFORE starting; mark one `in_progress`/`completed` at a time; on context loss call `TaskList` first — why: resume existing tasks, never duplicate after compaction.
**IMPORTANT MUST ATTENTION** stay in lane — deep-review only what this skill OWNS (layers, messaging/CQRS/repos/service boundaries, entity events, frontend architecture, quality tooling, generated artifacts, ADRs); record a one-line `→ route to {sibling}` pointer for security/performance/DDD/UI/integration-test findings instead of expanding them — why: duplicated findings across reviewers inflate severity counts and bury issues each reviewer uniquely owns.
**IMPORTANT MUST ATTENTION** each framework, base-class, directory, transport, storage, test, and file-layout check anywhere in this skill needs its own applicability evidence from config, project references, accepted ADRs, or established code; record unsupported or explicitly N/A patterns as N/A and NEVER flag their absence.
**IMPORTANT MUST ATTENTION** scope tooling/ADR/spec-loop severity to the change — a pre-existing gap unrelated to the diff is WARN with one note, reserve BLOCKED for a new stack/service with no gate, a change removing an existing gate, an accepted-ADR contradiction with no superseding ADR, or an evidenced `[HARD]` rule/invariant lacking test protection required by the project's contract — why: blocking on standing change-unrelated conditions buries the regression the diff actually introduced.
**IMPORTANT MUST ATTENTION** when the project maintains a spec/test contract, review the WHOLE package (spec + tests + structural diff), not the diff alone — each behavior-affecting finding carries a Dual-Feedback row in the project's format. Otherwise record the spec axis N/A and assess the project's actual test contract; do not invent a spec requirement — why: a boundary change that compiles but is never asserted can regress silently when a sibling caller is next touched.
**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when `.code-graph/graph.db` exists (grep → `trace --direction both` → verify) — why: trace reveals cross-service blast radius grep alone cannot.
**IMPORTANT MUST ATTENTION** evaluate pattern fit before flagging — copying-nearby ≠ matching preconditions; verify the same scope, lifetime, project contract, constraints, and established exceptions before calling a deviation a violation.
**IMPORTANT MUST ATTENTION** review is read-only until validated — NEVER fix code in this skill; after ANY finding run the Phase 5 `/why-review --validate-findings` self-validation gate BEFORE handoff, and every validated fix restarts a full review from Phase 0 with a fresh task breakdown — why: AI reports inherit confirmation bias; adversarial validation demotes false-positive Highs at the source.
**IMPORTANT MUST ATTENTION** write findings to `tmp/reports/arch-review-{date}-{slug}.md` incrementally and synthesize from disk; use `AskUserQuestion` to present next steps (`/code-simplifier` / `/code-review` / skip) after completing a standalone review — why: long reviews exhaust context before a final batch write, losing findings.

**Anti-Rationalization:**

| Evasion                              | Rebuttal                                                           |
| ------------------------------------ | ------------------------------------------------------------------ |
| "Too simple for architecture review" | Simple code hides layer violations. Apply all phases.              |
| "Already read the docs"              | Show the extracted `file:line` rule — no recall = no read.         |
| "I know this framework's base classes" | Resolve from Phase 0 reference docs — literal names are illustrative; the project's convention wins. |
| "Just flag obvious violations"       | Gray areas matter most. Apply `Think:` to every applicable category. |
| "Found a violation, I'll just fix it" | Read-only skill. Validate via `/why-review` first, then route the fix; every fix restarts review from Phase 0. |
| "Tests pass, so the data path is fine" | When data, messaging, locking, or tenancy is in scope, inspect the relevant Category 12 consistency and ownership contract; functional tests alone may miss these failures. |
| "It is inside a transaction, so it is atomic" | When a transactional store is in scope, name its isolation level and engine, then assess the actual concurrent invariant. |
| "It takes a distributed lock, so it is exclusive" | When a distributed lock is in scope, verify the project's stale-owner and recovery protections, including fencing where its contract requires it. |
| "More small classes/interfaces means better modularity" | Judge functionality hidden ÷ interface surface. Classitis and pass-through methods raise total complexity. |
| "These two blocks look the same — extract them" | Same shape ≠ same reason to change. Rule of three, and the wrong abstraction costs more than duplication. |
| "It is just one more boundary hop" | Where the change crosses a real module or service boundary, judge code, temporal, semantic, and operational coupling from evidence. |
| "The catalog says this is an anti-pattern" | The catalog RECOGNIZES; the project's docs, ADRs and grepped conventions DECIDE. No evidence + no damaged attribute = no finding. |
| "Data/migration concerns belong to the DBA" | They are the least reversible decisions in the diff. Category 12 owns the boundary; route only query-plan depth to `performance-review`. |
| "This finding is clearly someone else's domain, skip it" | Record a one-line `→ route to {sibling}` pointer — surfacing the route is owned here; expanding it is not. |
| "Graph not needed here"              | Run ONE trace. 5 seconds → full blast radius revealed.             |
| "Skill reviews only changed files"   | Default scope, not a limit. User can override.                     |

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.
