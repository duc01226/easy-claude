---
name: architecture-review
version: 2.3.0
description: '[Code Quality] Use when reviewing architecture compliance — layers, messaging, service boundaries, CQRS, repos, entity events, data/consistency/tenancy boundaries.'
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
- **Main phases — run in order:** Phase 0 load architecture rules → Phase 1 determine scope → Phase 2 blast radius (if `graph.db`) → Phase 3 architecture review (13 categories) → Phase 4 finalize compliance report → Phase 5 `/why-review` self-validation gate → Next Steps `AskUserQuestion`.
- **The 13 Phase-3 categories — review EVERY applicable one, serially:** 0 quality-tooling baseline · 1 architecture boundaries and layers · 2 messaging and delivery · 3 application conventions such as CQRS, validation, and mapping · 4 data access · 5 service-pattern era · 6 side effects and events · 7 service/module boundaries · 8 frontend architecture (frontend files only) · 9 ADR conformance · 10 spec-loop discipline · 11 scalability and coupling regression · **12 data, consistency, and tenancy boundaries**. Use the Phase-3 evidence gate for all pattern-specific checks, plus Categories 9–12's stated triggers. Per applicable check: `Think:` derivation → project evidence → `file:line` proof + relevant counterexamples → verdict. NEVER scan categories in parallel; codebase convention wins over a suspected violation. — why: skipping an applicable category loses a violation class, while treating examples as mandates creates false findings.
- **Workload-first scalability gate:** before judging a scale technique, prove read/write ratio · sustained/peak load · query shapes · data growth · burst/hot-key skew · geography · latency/consistency budgets; then check the reversible ladder (measure/tune → vertical and/or stateless horizontal from headroom + availability → read/write tactics → partition/shard LAST). Missing evidence means INFO/route, never a scale violation. — why: architecture review must catch regressions without penalizing a lean system for scale it does not have.
- **Optional AI-agent-as-user advice:** when the reviewed change or an accepted future contract exposes machine interaction, apply `SYNC:ai-agent-as-user-access` to inspect agent identity, authority, capability contracts, safety, and observable outcomes; classify only evidence-backed gaps and record adaptation, deferral, N/A, or blockers — no agent finding is invented when the surface is not applicable.
- Phase 0 is non-negotiable and first: read the project configuration and docs index, then load references triggered by the changed area — backend patterns for backend/API/data work, project structure for boundaries, frontend patterns for UI, and review rules when present. Every rule and symbol comes from project evidence, NEVER general knowledge; honor explicit N/A decisions.
- **Universal reasoning comes from `.claude/docs/architecture-knowledge.md`** (coupling taxonomy + four coupling dimensions, distributed-monolith signature, module-design principles §4, isolation levels + coordination primitives §8-§9, ~100-entry anti-pattern catalog, symptom→root-cause triage, judgment checklists §20) — use it to RECOGNIZE a defect class, then prove it with `file:line`. **The project's own reference docs and accepted ADRs OUTRANK that catalog on every conflict — NEVER flag a deviation from the catalog as a project violation.** An anti-pattern match is a HYPOTHESIS until evidence plus the damaged quality attribute are both named. — why: pattern-shape matching without project grounding is exactly the guess-as-fact failure this skill exists to prevent.
- Stay in lane: deep-review only what this skill OWNS (layers, messaging/CQRS/repos/service boundaries, entity events, frontend architecture, quality tooling, generated artifacts, ADRs); record a one-line `→ route to {sibling}` pointer for security/performance/DDD/UI/test findings instead of expanding them. — why: duplicated findings across reviewers inflate severity counts and bury issues each reviewer uniquely owns.
- Read-only until validated: **self-audit every draft finding against the 11 thinking red flags (`architecture-knowledge.md` §20.3) FIRST** — a finding whose sacrifice/trade-off you cannot name, or that rests on "best practice", is demoted or deleted, never reworded — then run the Phase 5 `/why-review` self-validation gate before handoff; fixes happen only in the validated fix loop, and every fix restarts a full review from Phase 0. That loop fixes only findings that block the current round: Round 1 = every validated severity; Round 2 = CRITICAL/HIGH/MEDIUM; LOW-only is recorded as deferred and ends the loop, while failed binary gates always block. Write findings to `tmp/reports/arch-review-{date}-{slug}.md`.

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
7. **Next Steps** — `AskUserQuestion`: `/code-simplifier` / `/code-review` / skip

**Key Rules (top 3 critical first):**

- MUST ATTENTION read project architecture docs in Phase 0 BEFORE reviewing — rules come from docs, NEVER general knowledge.
- Every violation needs `file:line` proof. Grep 3+ relevant examples/counterexamples when established code patterns are the evidence; use config, references, and accepted ADRs as direct evidence and check for conflicting code.
- MUST ATTENTION review one category at a time: doc rule → source evidence → verdict — NEVER scan categories simultaneously.
- MUST ATTENTION when an agent-facing surface or accepted future contract is in scope, apply `SYNC:ai-agent-as-user-access`; inspect the existing setup and classify only evidenced identity, authorization, capability, safety, contract, audit, or observability gaps as PASS/WARN/BLOCKED. If not applicable, record evidence-backed N/A or no finding; never prescribe every machine surface.
- Write findings to `tmp/reports/arch-review-{date}-{slug}.md`.
- BLOCKED = must fix before merge | WARN = review and decide | PASS = compliant.
- Review is read-only until `/why-review --validate-findings` confirms findings; fixes happen only in the validated fix loop or downstream plan/feature-implement, and every fix restarts a full architecture review from Phase 0 with a fresh task breakdown. Apply the round severity bar: Round 1 clears only at zero findings; Round 2 clears at zero CRITICAL/HIGH/MEDIUM, with LOW findings deferred. Failed binary gates remain blocking.

## Your Mission

<task>
$ARGUMENTS
</task>

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

**MANDATORY — NO EXCEPTIONS:** After completing, use `AskUserQuestion` to present:

- **"/code-simplifier" (Recommended)** — Simplify and refine code
- **"/code-review"** — Deep code quality review
- **"Skip, continue manually"** — user decides

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
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
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
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 11 protocol bodies pre-embedded.

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

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation** — MANDATORY when `.code-graph/graph.db` exists.
>
> **HARD-GATE:** MUST ATTENTION run at least ONE graph command on key files before concluding any investigation.
>
> **Pattern:** Grep finds files → `trace --direction both` reveals full system flow → Grep verifies details
>
> | Task                | Minimum Graph Action                         |
> | ------------------- | -------------------------------------------- |
> | Investigation | `trace --direction both` on 2-3 entry files  |
> | Fix/Debug           | `callers_of` on buggy function + `tests_for` |
> | Feature/Enhancement | `connections` on files to be modified        |
> | Code Review         | `tests_for` on changed functions             |
> | Blast Radius        | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Use `--node-mode file` first (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] /skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate (static JIT)** — Run after task-tracking bootstrap and immediately before target/source file reads, grep, edits, tests, or analysis. Project docs override generic framework assumptions; hooks may remind or accelerate this gate, but never prove that it ran.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. **Read the configured project-config file first, if it exists.** Resolve its path through the project-config loader (default `docs/project-config.json`). **The project config is OPTIONAL: a project with no config is a supported, first-class state, not an error.** When it is absent, run on the framework's portable defaults and derive project facts (paths, run commands, conventions, architecture, test and spec layout) from repository evidence — manifests, lockfiles, scripts, CI definitions, directory layout, root instruction files — stating the assumption whenever one is material; do not block, and do not demand a bootstrap route before ordinary work. When it IS present, the minimum valid shape has a non-empty `project.name`; omitted optional capability properties use neutral defaults or skip that capability. A section its author DECLARED but left malformed or incomplete is a configuration error: fail closed on that section and run `/project-init` or `/project-config` before relying on it, because silently substituting defaults would present wrong project facts as authoritative. Use valid config for the adopter's paths, commands, architecture, specs, tests, and workflows, then verify material hints against repository evidence; never assume generic defaults are project facts.
> 3. **Always-on vs task-specific references:** Project initialization owns and ensures the project's `lessons.md` and docs-index inputs at their configured owner paths. Read them under the static project-context contract independently of task-specific `referenceDocs`; do not append them to that selection. For task-specific docs, when the configured `referenceDocs` property is an array, follow it exactly, including subsets and `[]`. When absent, use the runtime capability-aware resolver: its portable baseline plus only configuration- or repository-evidenced capabilities; a minimal project with no capability evidence may resolve to an empty task-specific set. The full scan-target manifest is a registry of metadata/aliases, not a default selection. Resolve configured paths using `docsRoots.projectReference.path` when present (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A custom reference doc declares `filename` and `purpose`, with optional `sections`, `templatePath`, and `scanTarget`. Built-in filenames keep their exact framework-owned target; other custom docs default to manual ownership, while `scanTarget: "generic"` opts one exact selected file into evidence-based scanning. Manual docs are not freshness-tracked or impact-routed. Never infer a target by basename; config and runtime path resolution reject lexical traversal and physical symlink escapes.
> 4. Read selected task-specific docs just in time before target work, then state: `Reference docs read: ... | Not applicable: ...`; an explicit empty selection means no task-specific docs are selected by the catalog. Still honor separately required references named by the active skill or task. An absent project config is not a missing doc: proceed on repository evidence and, at most, OFFER `/project-init` or `/project-config` as an optional one-time recording of those facts. If an always-on input or a selected/otherwise required doc is missing or stale, or a declared config section is malformed, use `/project-init` or the narrow owner route (`/project-config`, `/docs-init`, `/scan --target=<key>`, `/ai-context-refresh`) before relying on that input. If Codex mirrors are stale, use the explicit `/sync-codex` route or its documented `/ai-context-refresh` completion handoff for the active source-authoring task. After compaction, resume, delegation, or material context change, repeat selection and reading; prior conversation and hook output are not proof of current loading.
>
> **Ready when:** scope evaluated, the configured project-config file consulted or its absence recorded and the portable-defaults fallback applied, root always-on inputs are confirmed (completing project initialization if they are missing or stale), the declared task-specific `referenceDocs` selection is applied exactly or, when absent, the runtime capability-aware resolver output is applied (which may be empty), selected docs are read or an explicit empty selection is recorded, and the citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `tmp/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: tmp/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:sequential-thinking-protocol -->

> **Sequential Thinking Protocol** — Structured multi-step reasoning for complex/ambiguous work. Use when planning, reviewing, debugging, or refining ideas where one-shot reasoning is unsafe.
>
> **Trigger when:** complex problem decomposition · adaptive plans needing revision · analysis with course correction · unclear/emerging scope · multi-step solutions · hypothesis-driven debugging · cross-cutting trade-off evaluation.
>
> **Format (explicit mode — visible thought trail):**
>
> 1. `Thought N/M: [aspect]` — one aspect per thought, state assumptions/uncertainty
> 2. `Thought N/M [REVISION of Thought K]: ...` — when prior reasoning invalidated; state Original / Why revised / Impact
> 3. `Thought N/M [BRANCH A from Thought K]: ...` — explore alternative; converge with decision rationale
> 4. `Thought N/M [HYPOTHESIS]: ...` then `[VERIFICATION]: ...` — test before acting
> 5. `Thought N/N [FINAL]` — only when verified, all critical aspects addressed, confidence >80%
>
> **Mandatory closers:** Confidence % stated · Assumptions listed · Open questions surfaced · Next action concrete.
>
> **Stop conditions:** confidence <80% on any critical decision → escalate via AskUserQuestion · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).

<!-- /SYNC:sequential-thinking-protocol -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Do not present inference as fact; ground material claims in evidence appropriate to the task.
>
> 1. Cite `file:line` for repository claims, configuration or reference paths for project rules, and URLs or artifact locations for external or observed claims.
> 2. State confidence when a conclusion is uncertain; verify material assumptions before acting and withhold recommendations when evidence is insufficient.
> 3. Trace the consumers, boundaries, or dependencies that exist in the affected path; do not assume services, modules, or architectural styles that the project does not use.
> 4. "I don't have enough evidence" is valid and expected output.
>
> **BLOCKED until:** material claims have traceable evidence, relevant searches are complete, and uncertainties are stated. Search comparable patterns when the task has existing implementations; record when none are available.
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

<!-- SYNC:double-round-trip-review -->

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle or an explicitly declared independent-pass minimum, not by a round number alone. Review purpose: `review → validate findings → fix validated findings that block the current round → full re-review` until a complete review pass clears the round's exit bar (see **Severity floor** below). **A clean review ENDS the loop once the persisted `minRounds` is met (default 1); an explicitly declared minimum such as 2 still requires that independent pass.**
>
> _aka **Self-Review Convergence Loop**._ The name is historical — "double-round-trip" means a validated-finding fix cycle forces at least one fresh re-review. It runs until the current round's exit bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred), bounded by the **2-round ceiling — extendable ONCE to round 3 when CRITICAL/HIGH remain** — defined below. A failing **test gate** (a suite that must actually pass) is outside that ceiling: the loop keeps fixing and re-running until the tests pass.
>
> **Round cap — 2 rounds MAX, extendable ONCE to round 3 (a ceiling, NEVER a target).** A clean pass ENDS the loop at ANY round once `round >= minRounds` — round 1 included with the default minimum; the cap never obliges an extra round. What happens when round 2 completes with blocking findings still open (severity floor applied) depends on WHAT is still open:
>
> - **Validated CRITICAL or HIGH still open → ONE extra round is granted (round 3, the review hard cap).** A failed non-test binary gate (security must-fix, required artifact, generated parity, policy compliance) counts as a CRITICAL blocker here. The extension is earned by that evidence alone, is never a default, is granted at most once per run, and never renews. Record the granting findings in the run record and report.
> - **Only MEDIUM (or an unresolved `NOT VERIFIABLE`) still open → NO extension.** → **STOP and escalate via `AskUserQuestion`** with the still-open findings listed.
> - **Round 3 completes with ANY review blocker still open → STOP and escalate via `AskUserQuestion`.** Round 3 is the review hard cap; no review finding or non-test gate opens a round 4.
> - **A failing TEST gate → NO round cap, at any round.** Failing tests never escalate for budget or no-progress and never buy or spend the extension: run the failed-test investigation gate, fix at the owning layer, and re-run until the tests pass — past round 3 if needed. NEVER weaken an assertion, add a skip, or relax a timeout to force green. Review blockers open beside failing tests still follow the bullets above.
>
> NEVER emit a silent "good enough" PASS on cap exhaustion, NEVER let the cap substitute for the clean-review requirement, and NEVER loop past round 3 on review blockers — only failing test gates continue beyond it. The 2-repeated-no-progress blocker rule stays an EARLIER exit — escalate at whichever trips first.
>
> **Severity floor — from round 2, LOW stops blocking.** The exit bar tightens after the first review pass, so the loop converges on consequence instead of spinning on polish:

> Define one predicate everywhere: `blocking_findings(round, findings)` returns all validated findings in round 1 and only validated CRITICAL/HIGH/MEDIUM findings from round 2 onward. A binary gate (test-green, security must-fix, required artifact) is exempt only when its owning invariant explicitly says so; in practice binary gates always remain blocking when they fail.
>
> | Round | Exit bar — loop ENDS when the fresh full review has… | Must be fixed to continue |
> | --- | --- | --- |
> | 1 | zero validated findings at ANY severity | CRITICAL · HIGH · MEDIUM · LOW |
> | 2 | zero validated CRITICAL / HIGH / MEDIUM findings — **LOW-only clears the severity bar** | CRITICAL · HIGH · MEDIUM only |
> | 3 — extension round, reachable ONLY when round 2 left CRITICAL/HIGH open (or failing tests were the only blocker) | zero validated CRITICAL / HIGH / MEDIUM findings — **LOW-only clears the severity bar** | CRITICAL · HIGH · MEDIUM only |
> | 4+ — test-gate continuation, reachable ONLY while failing test gates were the sole blocker | the tests pass and no review blocker is open | failing tests; any review blocker here escalates |
>
> From round 2 onward LOW findings are **NOT required to be fixed**: a round whose validated findings are ALL LOW **ENDS the loop once the persisted minimum is met** — do not open another fix/re-review round for them. Severity tiers are `SYNC:severity-rubric` (CRITICAL block-merge · HIGH must-fix · MEDIUM must clear the current round · LOW record/defer); round 1 remains strict, so a LOW found initially is still validated and fixed when warranted before the floor can apply.
>
> **Severity-floor rules:**
>
> - **Never silently drop a deferred LOW.** Every unfixed LOW is listed in the final report under `## Deferred LOW Findings (severity floor, round ≥2)` with file, line, and description, so the owner can schedule it. Dropping it from the report is a protocol violation, not a clean pass.
> - **Never re-tier a finding to trigger the exit.** Downgrading a real CRITICAL/HIGH/MEDIUM to LOW so the loop can end is a FALSE PASS. Severity is set by consequence per `SYNC:severity-rubric` before the round bar is applied — never after, and never with the exit in view. — why: a floor that can be reached by relabeling is not a floor.
> - **Never re-tier a finding to reach — or to dodge — the extension.** The extension is unlocked by a real CRITICAL/HIGH, so promoting a MEDIUM to HIGH to buy round 3, or demoting a real CRITICAL/HIGH to MEDIUM to force an earlier escalation, are both FALSE classifications. Severity is set by consequence before the round bar and the extension test are applied. — why: an extension that can be reached by relabeling bounds nothing.
> - **The floor bounds the loop, not the standard.** It ends *iteration*; it never authorizes shipping a known CRITICAL/HIGH/MEDIUM, and it never lowers the finding-survival bar that admits a finding in the first place.
> - **The floor never applies to a hard gate.** Test-green gates (a suite must actually pass), security must-fix gates, and any gate whose criterion is binary rather than severity-rated are unaffected — a failing test is a failure, not a LOW finding.
>
> **Universal scope (any new output/judgment):** any newly produced output or judgment gets **≥1 self-review**; any **new judgment** gets **≥1 `/why-review --validate-findings` pass**; anything flagged to re-check is re-checked **≥1 time** — before that output is treated as final. This loop is the default convergence contract for ANY work-producing skill, not review skills only.
>
> **Routing invariant (author-facing):** a skill that validates findings MUST route them through `/why-review --validate-findings` (the terminal validator) — NEVER fork an inline finding-validation. Routing through why-review is what makes the finding-survival bar and this loop apply; the `verify-review-validate-coverage` sensor enforces this exact route mechanically.
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS if `round >= minRounds`; otherwise perform the explicitly required independent pass. Do NOT invent a confirmation pass.
> - **`blocking_findings(round, findings)` is non-empty** → run the active review skill's findings-validation gate first; for review skills the default gate is `/why-review --validate-findings <report-path>`. Fix only validated findings that block the current round, then restart the full review protocol from the beginning with a fresh task breakdown.
>
> **Fresh full re-review after every fix cycle:** Re-run the whole review protocol over the current full target. When sub-agents are part of that protocol, spawn NEW `Agent` calls — never reuse prior agents. Reviewers re-read ALL files from scratch with ZERO memory of prior rounds. See `SYNC:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. Each fresh full review must catch:
>
> - Cross-cutting concerns missed in the prior round
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the prior round rationalized away
> - Regressions introduced by the fixes themselves
>
> **Loop termination:** After each full re-review, repeat the same decision against **that round's exit bar**: bar cleared and persisted minimum met → END; blocking findings remain → validate findings → fix → restart from the first review phase. Round 1 clears only on zero findings at any severity; **from round 2 the bar is zero CRITICAL/HIGH/MEDIUM, so a LOW-only round ENDS the loop once the persisted minimum is met** (deferred LOWs go in the report). Capped at **2 rounds, extendable ONCE to round 3 when round 2 leaves validated CRITICAL/HIGH open**. Escalate via `AskUserQuestion` at whichever comes first: the same validated finding repeats for 2 full invocations with no progress · a fix requires product/owner input · round 2 completes with MEDIUM-only (or `NOT VERIFIABLE`) blocking, which earns no extension · round 3 completes with any review blocker still open. A failing test gate triggers none of these escalations — it loops until green. NEVER loop past round 3 on review blockers, and NEVER convert cap exhaustion into a PASS.
>
> **Rules:**
>
> - A clean Round 1 ENDS the review when `minRounds=1`; an explicitly declared `minRounds=2` requires the independent second pass
> - From round 2 on, a round whose validated findings are ALL LOW ENDS the loop once the persisted minimum is met — never open round N+1 to fix LOW alone; list those LOWs as deferred instead
> - NEVER re-tier a CRITICAL/HIGH/MEDIUM down to LOW to reach the round-2 exit — severity is assigned by consequence before the bar is applied
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - Every surviving finding must additionally clear the **finding-survival bar** defined in why-review's Findings Validation Routine (a deliberately higher bar than the generic act-gate — "keep this finding?" is a stricter question than "act on this evidence?"); a finding below the bar is demoted or dropped, not kept
> - NEVER skip the full re-review after a fix cycle (every fix invalidates the prior verdict)
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns NEW Agent calls
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - The round cap NEVER replaces the clean-review requirement — it bounds runaway looping, it does not authorize shipping an un-clean review; a clean pass ends the loop early once the persisted minimum is met, and cap exhaustion escalates rather than passes
> - Enforce the base cap of 2 rounds, the single conditional extension to round 3 (unlocked ONLY by validated CRITICAL/HIGH open at round 2; a failed non-test binary gate counts as CRITICAL), and the 2 repeated-no-progress blocker rule together; all three are escalation triggers for review blockers, none is a completion criterion
> - The extension is granted at most ONCE per run and never renews — round 3 is the review hard cap regardless of what it finds
> - Failing test gates are outside the round budget: never escalate them for budget or no-progress, never let them buy the extension, and keep fixing and re-running until the tests pass — never forcing green
> - Persist completed rounds, repeated blockers, findings and the explicit minimum in the owning run's `review-policy.cjs` record. Resume that record after interruption; target changes invalidate evidence and acceptance but preserve the bounded round budget. In-flight attempt IDs may be session-local; they do not replace or reset completed-round state
> - Final verdict must incorporate ALL rounds executed
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2 that was executed, plus `## Deferred LOW Findings (severity floor, round ≥2)` whenever the loop ended on the severity floor with LOWs still open. When round 3 ran, the report must name the CRITICAL/HIGH findings that granted the extension; when rounds continued on failing tests, it must name the failing test gates of each such round.**

<!-- /SYNC:double-round-trip-review -->


<!-- SYNC:sub-agent-selection -->

> **Sub-Agent Selection** — Full routing contract: `.claude/skills/shared/sub-agent-selection-guide.md`
> **Rule:** Route specialized domains (architecture, security, performance, DB, E2E, integration-test, git) to the matching specialist agent (see guide above) — NEVER use `code-reviewer` for these. — why: `code-reviewer` lacks each domain's checklist, so specialized issues slip through.

<!-- /SYNC:sub-agent-selection -->

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Project applicability gate.** Before applying a stack, layer, style, tool, or architecture rule, read the project's config and relevant references, then check local implementations. Treat framework examples as examples; honor explicit N/A and do not require a technology or convention the project does not use.
> **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
> **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Judge the environment before judging the code.** A bug report, failed test, error, or unexpected output is not proof of a code defect. Before and during adjudication, weigh environment causes as a competing hypothesis — setup, config, version and dependency state, service dependencies, stale artifacts or leftover state, and transient resource pressure (RAM, CPU, disk, handles, network). State the discriminator you ran; fix an environment cause in the environment, never by editing product code or weakening a test to absorb it.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:systematic-review-batching -->

> **Systematic Review Batching (map-reduce)** — When a changeset is large, do NOT review files one-by-one. Partition into size-capped batches, fire one specialized sub-agent per batch in parallel, then reduce. This bounds EVERY context — each batch agent AND the orchestrator — so coverage stays complete as file count grows.
>
> **Trigger ladder (one ordered escalation — not competing thresholds):**
>
> 1. **< 10 changed files** → sequential per-file review (default; no batching).
> 2. **≥ 10 changed files** → switch to systematic parallel mode. Announce: `"Detected {N} changed files. Switching to systematic parallel review protocol."` Then: categorize → size-capped batches → flat consolidation.
> 3. **categories > 6 OR files > 40** → additionally insert the hierarchical synthesis tier (below). Everything from rung 2 still applies.
>
> **Step 1 — Categorize.** Group changed files into logical categories derived from the project's actual structure (not forced). Category is the *concern axis*; orient with these examples, derive what fits the repository:
>
> | Category Type | Example Groupings |
> | --- | --- |
> | Agent/Tooling | AI scripts, hooks, skill definitions, workflow configs, linting rules |
> | Root config/docs | Root README, project config, CI/CD pipeline configs |
> | Reference docs | Architecture docs, patterns references, setup guides |
> | Feature/domain docs | Business feature documentation, spec files, ADRs |
> | Backend logic | Service/handler/controller source (infer from project structure) |
> | Frontend logic | UI component/state/API source (infer from project structure) |
> | Data/Schema | Migrations, schema files, seed data |
> | Tests | Unit, integration, E2E test files |
> | Infrastructure | Docker, k8s, CI/CD, cloud manifests |
>
> **Step 2 — Size-capped batches.** One sub-agent per batch of **≤8 files OR ≤2000 diff-lines**, whichever hits first. Category stays the concern axis, but any category exceeding a cap splits into multiple size-capped batches (30 backend files → 4 batches). Size caps — not category caps — make "many files" safe: a category cap alone lets one giant category blow a single agent's context.
>
> **Step 2a — Sub-agent type per batch** (match the batch's dominant concern):
>
> - Code logic (any stack) → `code-reviewer`
> - Security-sensitive changes → `security-auditor`
> - Performance-critical paths → `performance-optimizer`
> - Docs, plans, specs, configs, infra → `general-purpose`
>
> Each batch sub-agent receives: its full file list; `SYNC:category-review-thinking` as its primary thinking model — derive each category's concerns from first principles, NOT a fixed checklist (if the consuming skill does not carry that block, apply category-first thinking directly); project reference docs relevant to its concern (discover via `*patterns*`, `*conventions*`, `*style-guide*`); cross-reference verification instructions (counts, tables, links). All batch agents run in parallel and write findings to `tmp/reports/` (per `SYNC:task-tracking-external-report`); reducers read from disk, never from memory.
>
> **Step 3 — Reduce.**
>
> - **Flat reduction (rung 2, ≤6 categories AND ≤40 files):** the orchestrator collects each batch report, cross-references counts/tables/contracts ACROSS batches, detects gaps visible only across categories (feature in code but missing from docs; new API endpoint with no client call), and consolidates into one categorized holistic report.
> - **Hierarchical reduction (rung 3, > 6 categories OR > 40 files):** insert a mid-tier — each concern gets ONE synthesizer agent that reads only its own batch reports and emits a single concern-synthesis. The orchestrator reads the **concern-syntheses (~5)**, never the raw batch reports — keeping the reducer's context O(#concerns), not O(#files).
>   - **Cross-concern interaction pass (mandatory at rung 3 — closes the synthesis-tier blind spot):** concern-siloed synthesis can drop an interaction spanning two concerns AND two batches (tainted source in data-layer/batch 7 → sink in api/batch 3). So: (a) each concern-synthesizer MUST emit an explicit **"cross-concern interaction candidates"** list — entities/symbols/contracts it touched that plausibly bind to another concern (shared DTOs, event names, table/collection names, exported symbols); (b) the orchestrator MUST run the Step-3 cross-reference/gap step **over those candidate lists across all concern-syntheses**, not only within a batch, before concluding. Without this pass the tier trades completeness for context-bounding on exactly the large diffs it targets.
>
> **Step 4 — Holistic assessment.** With all findings combined, judge: overall coherence as a unified intent; cross-category sync (docs match code? contracts match callers?); risk areas where categories interact; missing doc/spec updates for changed artifacts.
>
> **No silent truncation.** If any cap forces sampling or a batch is dropped for budget, ANNOUNCE the dropped/sampled scope explicitly — bounded coverage must never read as complete coverage.

<!-- /SYNC:systematic-review-batching -->

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
> | LOW | Record and defer; never open another fix/re-review round from round 2 onward, and never counts toward the round-3 extension | Non-blocking polish with no credible present correctness, security, privacy, authority, availability, or data-integrity impact: wording/formatting, minor documentation or convention drift, optional defensive cleanup, or a cosmetic/refinement suggestion. |
>
> **Consequence decision tree (apply in order):** (1) Is a binary gate failed? Keep it as a separate hard blocker (the executable helper represents it as synthetic CRITICAL); do not use the ordinary severity label to hide what failed. Otherwise, would shipping permit immediate material security/safety/authority harm, irreversible destruction, data loss/corruption, or a critical-path silent failure? → **CRITICAL**. (2) Otherwise, does a supported path, invariant, public contract, privacy/authority boundary, compatibility promise, or behavior-changing proof fail with material user/downstream impact? → **HIGH**. (3) Otherwise, is there a bounded but consequential edge, resilience, observability, testability, maintainability, or architectural gap with a credible impact? → **MEDIUM**. (4) Otherwise, is the evidence sufficient to show only non-blocking polish with no credible present material impact? → **LOW**. (5) If the evidence needed to choose between steps 1–4 is missing, → **NOT VERIFIABLE**, not LOW. When multiple tiers fit, select the highest credible consequence; effort, implementation cost, reviewer discomfort, frequency alone, proximity to the round cap, and whether a tier would unlock or forfeit the conditional round-3 extension never decide the tier.
>
> **Boundary examples (normalize before applying the round predicate):** an auth bypass, exposed secret/PII, destructive command without an authority gate, or failed required test/generation/parity gate is **CRITICAL**; a wrong supported response, broken invariant/API/schema, meaningful privacy/authority defect, or unproven behavior-changing fix is **HIGH**; a bounded retry/timeout/alert/testability gap or credible maintainability drift is **MEDIUM**; a typo, formatting inconsistency, optional cleanup, or cosmetic suggestion proven not to affect present behavior is **LOW**. A missing fact about any of those boundaries is **NOT VERIFIABLE** until evidence or an explicitly documented residual-risk decision exists.
>
> **Classification procedure (required for every finding):** (1) state the affected user, system, data, contract, or gate; (2) assess consequence if the issue ships; (3) assess exposure/likelihood and reversibility/detectability; (4) select the highest tier justified by those facts; (5) cite `file:line` or equivalent evidence and a confidence percentage. Effort, implementation cost, reviewer discomfort, and proximity to the round cap are never severity inputs. `NOT VERIFIABLE` is a pending evidence state, not one of the four tiers and never a LOW escape hatch: if the unresolved claim could affect required behavior, security, privacy, authority, availability, data integrity, or a binary gate, it remains an open evidence blocker until resolved or explicitly owner-accepted with documented residual risk. Classify an item LOW only when evidence supports the absence of credible present material impact.
>
> **Hard-gate rule:** Binary gates (tests, required artifacts, security must-fix checks, generated parity, policy compliance) are not ordinary severity-rated findings. The executable helper records a failed gate as a synthetic CRITICAL blocker solely so one predicate can carry it; the report must still name the gate and failure evidence. A failed gate blocks at every round, including when all ordinary findings are LOW; never disguise a failed gate as LOW. A failed non-test gate counts as CRITICAL for the round-3 extension; a failing test gate is outside the round budget and loops until the tests pass.
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
> A finding's tier drives the gate: CRITICAL/HIGH/MEDIUM remain actionable and blocking under the round policy, and only an open CRITICAL/HIGH at round 2 (a failed non-test binary gate counts as CRITICAL) unlocks the single conditional extension round; LOW may be tracked as a follow-up and, from round 2, does not by itself justify another fix/re-review. An owner decision may explain or schedule an open MEDIUM but does not turn it into a clean pass; owner acceptance never makes a failed binary gate pass and must record scope, rationale, and residual risk.

<!-- /SYNC:severity-rubric -->


<!-- SYNC:category-review-thinking -->

> **Category Review Thinking** — A thinking framework for reviewing any category of changed files. NOT a fixed checklist — derive concerns from domain knowledge; the examples are starting points only. Your knowledge of the category exceeds any list here — trust it.
>
> **Step 1 — Understand the category's role.** What is this category responsible for in the overall system? What invariants must it uphold? What are its consumer contracts (who depends on it, what do they expect)?
>
> **Step 2 — Read project conventions for this category.** Search for reference docs, style guides, ADRs, or READMEs specific to this area. Grep 3+ existing similar files — extract naming conventions, structural patterns, shared base classes. If no docs exist, derive conventions empirically from existing code.
>
> **Step 3 — Derive concerns from first principles.** Apply all that are relevant; expand beyond this list based on the actual category:
>
> - **Correctness:** Does the logic match the intent? Trace happy path AND error path.
> - **Boundary contracts:** Are interfaces/APIs/events/protocols honored? No implicit coupling introduced?
> - **Project conventions:** Does new code follow the patterns found in Step 2? Evidence-confirmed, not assumed.
> - **Security:** Auth enforced at every entry point? Input validated at boundaries? No secrets in the diff?
> - **Performance:** Unbounded operations? N+1 patterns? Blocking calls in async context? Unindexed queries?
> - **Maintainability:** DRY? Single responsibility? Complexity within reason? Names reveal intent?
> - **Boundary naming:** When the category exposes public or cross-layer types, APIs, events, or modules, verify that names describe the capability, domain purpose, or contract rather than the current provider/framework/transport; concrete adapters may carry those details. Check callers and implementations before flagging a name, and treat generic names (`Manager`, `Helper`, `Utils`, `Data`) as signals rather than automatic violations.
> - **Test coverage:** Are the changed paths covered by tests? Are existing tests still valid after the change?
> - **Documentation:** Do related docs, specs, or READMEs reflect the changes?
>
> **Step 4 — Create sub-tasks and execute.** For each identified concern: create a `TaskCreate` sub-task, work through it with `file:line` evidence, mark done. No findings without proof.
>
> **Illustrative concern examples by category type** (not exhaustive — trust your knowledge beyond this):
>
> - _Server-side logic:_ handler/service structure conventions, validation layer placement, side-effect isolation, cross-service boundary enforcement, data-access layer separation, error propagation strategy
> - _Client-side logic:_ component lifecycle management, resource cleanup (subscriptions, listeners, timers), state management patterns, API integration layer separation, reactive stream composition
> - _Data/Schema:_ migration reversibility (rollback script), lock impact on table volume, backfill idempotency, index coverage for query patterns, deployment ordering
> - _Configuration:_ present in ALL environments? No secrets in diff? App fails fast if config missing (not silently null)? Documented in setup guide?
> - _Infrastructure:_ dev/prod parity? No hardcoded dev values (localhost, debug flags)? Pinned image/dependency versions? CI/CD secret requirements documented?
> - _Styles/Assets:_ follows project naming conventions? Uses design variables/tokens (no hardcoded magic values)? Correct scope (no global side effects from component styles)?
> - _Documentation:_ accurate? Links valid? Examples still match current code/behavior? Covers new scenarios?
> - _Tests:_ assertions verify specific outcomes (not just "no exception")? Idempotent (repeatable N times)? Covers edge cases, not just happy path?
> - _Security artifacts:_ all code paths reach the gate? Negative tests exist (unauthorized denied)? Both enforcement AND display control updated?
> - _Build/Tooling:_ rule changes apply consistently? No exceptions that silently swallow violations? Impact on CI runtime documented?

<!-- /SYNC:category-review-thinking -->

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
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md` (plans root default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
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

- **MANDATORY** Before project-specific work, load the OPTIONAL project-config (default `docs/project-config.json`) via its loader. No config is supported — fall back to portable defaults plus repository evidence, state material assumptions, never block. When present: require non-empty `project.name`, use neutral defaults/skips for omitted optional capabilities, and fail closed on a declared malformed section.
- **MANDATORY** Apply an explicit `referenceDocs` array exactly, including `[]`; when absent use only the capability-aware resolver output, which may be empty. Cite `Reference docs read: ...` and note the selected or empty set.
- **MANDATORY** Load detail JUST IN TIME, immediately before the first target read/grep/edit/test — a hook event or a prior turn is NEVER evidence that the current files were read. Re-resolve selection and re-read after compaction, resume, delegation, or a context change.
- **MANDATORY** The project-init-owned `lessons.md` and docs-index inputs are always-on at their configured owner paths, read independently of task-specific `referenceDocs`. A missing/stale root instruction file or required reference doc, or a malformed declared config section → auto-run `/project-init` (or the narrow lower-level route) before relying on that input. An absent config never gates work — offer `/project-init` or `/project-config` once. Project config and conventions override generic framework defaults.

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

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `Agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `tmp/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

<!-- /SYNC:parallel-subagent-dispatch -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:ai-agent-as-user-access -->

> **AI Agent as a First-Class User / Machine-Interaction Contract** — Strong recommendation when creating a greenfield system; optional, evidence-gated advice for a big feature or architecture review. Treat an AI agent as a potential non-human actor with its own identity, authority, tenancy, safety policy, and observable outcomes — not as a trusted administrator or UI automation shortcut. This supplements, never replaces, the shared authorization, API, security, and test contracts.
>
> 1. **Classify the actor and relationship.** From product and threat-model evidence, identify agent personas (user-delegated copilot, tenant automation, platform operator, service agent, integration agent), the human or organization it may act for, tenant/resource scope, trust level, allowed autonomy, data/action budgets, and human approval points. An agent is not automatically the human, tenant administrator, or platform administrator.
> 2. **Make one application capability core.** Express business use cases in a stable application boundary reused by human UI and machine surfaces. API, CLI, MCP, WebMCP, webhook/event, SDK, or batch adapters may translate contracts, but must not duplicate domain rules or bypass validation/authentication/authorization. Name and version contracts by purpose, use machine-readable input/output schemas, stable error codes, idempotency for retries, pagination or asynchronous status where needed, timeouts/cancellation, correlation IDs, quotas/rate limits, and deprecation policy.
> 3. **Choose surfaces by evidence.** Use API/OpenAPI for remote machine integrations (`https://spec.openapis.org/oas/latest.html`); CLI for local/operator/automation; MCP for LLM-host discovery of tools, resources, and prompts; WebMCP for a browser-integrated agent when an applicable browser/runtime supports it; webhooks/events for push integration; SDK only when it lowers consumer cost. Evaluate relevant surface(s) and record `APPLY-NOW`, `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, or `BLOCKED`; never build all surfaces without a user/job and owner.
> 4. **MCP contract.** When MCP is applicable, expose least-privilege, capability-oriented tools/resources/prompts over currently supported transports (stdio for local, Streamable HTTP for remote, or another explicitly justified adapter). Tool names and descriptions are concise and truthful; input/output schemas, structured results/errors, pagination, deterministic discovery, progress/cancellation, long-running task polling, idempotency, and audit/tool-call IDs are explicit. Use the official specification (`https://modelcontextprotocol.io/specification/`) and authorization guidance (`https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization`) as the current protocol references.
> 5. **WebMCP is progressive enhancement.** When a web surface and browser-agent support exist, expose narrow page capabilities through the current WebMCP draft API behind a project-owned adapter; never make the domain or primary API contract depend on a draft/browser-only feature. Register only safe, purpose-named tools, validate at server-side/application boundaries, and test direct tool execution against the UI path. Treat tool metadata, page content, and tool output as untrusted input; defend against prompt/output injection and confused-deputy behavior. The official WebMCP page currently labels the proposal a Draft Community Group Report, not a W3C Standard or Standards Track feature (`https://webmachinelearning.github.io/webmcp/`).
> 6. **Secure every agent path.** Give agents distinct authentication and authorization. Resolve delegated human, organization, service-account, or integration identity; enforce deny-by-default, least privilege, tenant/resource scope, action-specific permissions, expiry/revocation, rate/usage budgets, replay/idempotency protection, and separation of duties at the application boundary. No agent self-granting, client-supplied role/tenant claims, privilege escalation, or inbound-token passthrough to downstream services. High-impact, destructive, financial, or privacy-sensitive actions require explicit consent, preview/dry-run, or step-up policy unless an approved autonomous policy says otherwise.
> 7. **Make consent and audit inspectable.** Record who/what acted (agent identity, delegating principal, tenant, client/host, model/session/run where available), capability/tool/action, redacted inputs, policy/consent decision, result/error, correlation ID, and timestamp. Provide discoverable scopes, tool permissions, revoke/rotate paths, and human-visible confirmation for high-impact actions. Keep agent output/data boundaries and retention explicit.
> 8. **Operate it like a product surface.** Document onboarding/discovery, credentials, environment, schema/version compatibility, examples, rate/timeout/error behavior, partial-failure/retry semantics, long-running jobs, support/deprecation, and safe rollback. Monitor adoption, denied calls, latency, errors, retries, quota/cost, sensitive-data exposure signals, and anomalous behavior; provide runbooks and kill/revoke controls.
> 9. **Test the contract and equivalence.** Every agent-facing contract test names the business intent/technical contract and expresses its preconditions, action, and owned outcome in the project's native test format; Given/When/Then is one option. Verify allowed/denied/cross-tenant paths, schema compatibility, the same outcome as the human/API path, idempotent retries/replay, prompt/output injection, unsafe tool descriptions, authorization expiry/revocation, pagination, timeout/cancellation, rate limits, and audit records. Assert the outcome owned by the application, not only tool-call or transport bookkeeping.
> 10. **Apply lifecycle scope correctly.** Greenfield must produce an agent actor/access matrix, selected surfaces and rationale, capability contracts, threat/consent model, test/observability plan, and explicit owner before the first implementation plan; a warranted omission requires an explicit decision/acceptance. Big-feature and architecture-review use this as optional advice: inspect existing setup and advise only when agent use is evidenced or a future contract is accepted; safely adapt in the slice, or create an owned `DEFER-AS-OPPORTUNITY` with owner, trigger, dependency order, smallest next step, and cost of delay. If safety/correctness requires the work, mark `BLOCKED`; never silently turn a feature into an agent-platform refactor.
>
> **Required output:** `agent/persona | relationship/delegation | identity/authn | tenant/resource scope | capabilities/actions | selected surface(s) | contract/version | consent/safety | observability/audit | status/owner/next step | acceptance/revisit trigger`.
>
> **BLOCKED until (when applicable/selected):** actor and authority are explicit · each exposed capability has an owner, schema, authz, safety policy, and observable outcome · the selected API/CLI/MCP/WebMCP adapter reuses the application capability core · allowed/denied/cross-tenant paths and high-impact controls are tested · version/discovery/rollback/telemetry are planned · greenfield omissions are explicitly accepted; otherwise record evidence-backed `NOT-APPLICABLE` or `DEFER-AS-OPPORTUNITY`.

<!-- /SYNC:ai-agent-as-user-access -->

<!-- SYNC:ai-agent-as-user-access:reminder -->

**IMPORTANT MUST ATTENTION** Greenfield strongly recommends treating AI agents as first-class non-human actors from inception; choose evidence-backed API/CLI/MCP/WebMCP/event/SDK surfaces over one application capability core with authorization, consent, schemas, idempotency, audit, contract tests in the project's native format (GWT is one option), and observability. Big feature and architecture review are optional/advisory: inspect evidence, adapt, defer as an owned opportunity, record `NOT-APPLICABLE`, or block safety gaps; never build every surface or assume agent = administrator.

<!-- /SYNC:ai-agent-as-user-access:reminder -->

<!-- SYNC:review-principle-awareness -->

> **Review Applicability / Current-Principles Awareness** — Every review must first classify the change context (greenfield foundation, brownfield feature/refactor, test/docs/config/UI/infra, or actor-facing/machine surface) and take notice of the applicable current principles below. This is an evidence-gated applicability check, not a mandate to flag or build every item.
>
> **Detailed protocol routing — read/apply only when warranted:**
> - `SYNC:scale-ready-foundation` — greenfield foundation is blocking; big-feature brownfield fit/adapt/defer; architecture review is advisory when auditing. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`.
> - `SYNC:test-architecture-execution-contract` — assertion-bearing tests use the project's configured/native format, name the guarded intent/technical contract, and assert an owned outcome; GWT is one valid format. Detailed carriers: `integration-test`, `workflow-greenfield-init`, and the test-architecture review path.
> - `SYNC:ai-agent-as-user-access` — when an AI/machine actor or future contract is evidenced, inspect identity/delegation, capability boundaries, selected API/CLI/MCP/WebMCP/event/SDK surface, safety/consent, audit/observability, and native-format contract tests. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`, `architecture-review`.
> - `SYNC:design-system-check` — when UI changes, inspect the design-system and component-contract obligations; route visual/UX depth to the owning UI review.
>
> **Review behavior:** Check only principles applicable to the reviewed scope; record `APPLY-NOW`, `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, `BLOCKED`, or `UNVERIFIED` with `file:line`/config/CI evidence, status/severity, owner/route, and next step/revisit trigger. Do not invent findings from a generic checklist, flag unrelated pre-existing gaps as regressions, silently expand the requested scope, or mutate a parent gate merely because advice exists.
>
> **Ownership:** `changes-review` coordinates the applicability pass and routes depth to the owning specialist (`architecture-review`, `integration-test-review`, `security-review`, `performance-review`, `ui-review`, `production-readiness-review`, or another matching review). A specialist reports its own lens and does not duplicate or override another review's verdict; existing brownfield gaps stay advisory unless new, safety-relevant, or explicitly in scope.
>
> **Required review note:** `context/scope | principle/protocol checked | evidence | status/verdict | severity | owner/route | next step/revisit trigger`.
>
> **BLOCKED when:** an applicable principle is required for safety/correctness but missing, unowned, or untestable. Otherwise record an evidence-backed `NOT-APPLICABLE`, advisory, `DEFER-AS-OPPORTUNITY`, or `UNVERIFIED` result according to the lifecycle and change context; creating a greenfield foundation remains subject to its own blocking protocol.

<!-- /SYNC:review-principle-awareness -->

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
**IMPORTANT MUST ATTENTION** follow the phase order Phase 0 → 1 → 2 → 3 → 4 → 5 → Next Steps; Phase 5 `/why-review` self-validation is MANDATORY whenever any finding exists, and Next Steps MUST present `/code-simplifier` / `/code-review` / skip via `AskUserQuestion` — why: the AI repeatedly forgets the validation gate and stops at Phase 4, shipping unvalidated severities downstream.
**IMPORTANT MUST ATTENTION** break work into small tasks using `TaskCreate` BEFORE starting; mark one `in_progress`/`completed` at a time; on context loss call `TaskList` first — why: resume existing tasks, never duplicate after compaction.
**IMPORTANT MUST ATTENTION** stay in lane — deep-review only what this skill OWNS (layers, messaging/CQRS/repos/service boundaries, entity events, frontend architecture, quality tooling, generated artifacts, ADRs); record a one-line `→ route to {sibling}` pointer for security/performance/DDD/UI/integration-test findings instead of expanding them — why: duplicated findings across reviewers inflate severity counts and bury issues each reviewer uniquely owns.
**IMPORTANT MUST ATTENTION** each framework, base-class, directory, transport, storage, test, and file-layout check anywhere in this skill needs its own applicability evidence from config, project references, accepted ADRs, or established code; record unsupported or explicitly N/A patterns as N/A and NEVER flag their absence.
**IMPORTANT MUST ATTENTION** scope tooling/ADR/spec-loop severity to the change — a pre-existing gap unrelated to the diff is WARN with one note, reserve BLOCKED for a new stack/service with no gate, a change removing an existing gate, an accepted-ADR contradiction with no superseding ADR, or an evidenced `[HARD]` rule/invariant lacking test protection required by the project's contract — why: blocking on standing change-unrelated conditions buries the regression the diff actually introduced.
**IMPORTANT MUST ATTENTION** when the project maintains a spec/test contract, review the WHOLE package (spec + tests + structural diff), not the diff alone — each behavior-affecting finding carries a Dual-Feedback row in the project's format. Otherwise record the spec axis N/A and assess the project's actual test contract; do not invent a spec requirement — why: a boundary change that compiles but is never asserted can regress silently when a sibling caller is next touched.
**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when `.code-graph/graph.db` exists (grep → `trace --direction both` → verify) — why: trace reveals cross-service blast radius grep alone cannot.
**IMPORTANT MUST ATTENTION** evaluate pattern fit before flagging — copying-nearby ≠ matching preconditions; verify the same scope, lifetime, project contract, constraints, and established exceptions before calling a deviation a violation.
**IMPORTANT MUST ATTENTION** review is read-only until validated — NEVER fix code in this skill; after ANY finding run the Phase 5 `/why-review --validate-findings` self-validation gate BEFORE handoff, and every validated fix restarts a full review from Phase 0 with a fresh task breakdown — why: AI reports inherit confirmation bias; adversarial validation demotes false-positive Highs at the source.
**IMPORTANT MUST ATTENTION** write findings to `tmp/reports/arch-review-{date}-{slug}.md` incrementally and synthesize from disk; use `AskUserQuestion` to present next steps (`/code-simplifier` / `/code-review` / skip) after completing review — why: long reviews exhaust context before a final batch write, losing findings.

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
