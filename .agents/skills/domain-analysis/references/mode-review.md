# `$domain-analysis --mode=review` — domain entity and value-object DDD quality review reference

> Read this complete contract when `$domain-analysis --mode=review [changes | scan [<module>]] [--report-only]` is selected. It replaces default business analysis with evidence-based A–P/E2 review, finding validation, and the severity-gated fix/re-review loop. `--report-only` returns validated findings without fixes. Read `references/ddd-reference.md` sections on demand as routed below.

## Quick Summary

**Goal:** Review entity/VO design against discovered project conventions so invariants and aggregate boundaries remain safe.

**Summary:** Discover conventions/scope/paradigm → search/report → A–P/E2 → holistic fit/fresh-context gate → final report/score → validate/fix/full restart → standalone Next Steps. Adapt to each aggregate's paradigm/subdomain; persist evidence per file. `--report-only` returns after validation and leaves fixes to its caller.

**Workflow:** Execute Phases 0–5 in order; restart the full review after validated blocking fixes. Offer Next Steps only after standalone closure; `--report-only` stops after validation.

**Key Rules:** Discover conventions first; require `file:line` at >80% confidence; validate before fixes and fully re-review afterward. Round 1: zero open findings; Round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred. Failed binary gates always block. Persist findings per file, never batch.

| Severity | Consequence |
| --- | --- |
| CRITICAL | Silent runtime failure, corruption or validation bypass; blocks merge |
| HIGH | Incorrect behavior, invariant gap or architectural violation; must fix |
| MEDIUM | Design debt, maintainability or likely future bug; should fix |
| LOW | Convention, documentation or minor clarity |

## Contents

- [Summary and severity](#quick-summary)
- [Report-only contract](#report-only-mode---report-only)
- [Domain gate ownership](#canonical-owner--domain-entity-change-gate)
- [Phase 0: Discovery and scope](#phase-0-project-discovery--mode-detection--blast-radius)
- [Phase 1: Search and report](#phase-1-collect-files--grep-patterns--create-report)
- [Phase 2: A–P/E2 checklist](#phase-2-entity-by-entity-ddd-review)
- [Phase 3: Holistic and fresh-context gate](#phase-3-holistic-synthesis--fresh-context-gate)
- [Phase 4: Report and health score](#phase-4-final-report-generation)
- [DDD quick reference](#universal-ddd-quick-reference)
- [Review strategy](#systematic-review-strategy)
- [Returned summary](#output-summary-format)
- [Phase 5: Finding validation](#phase-5-why-review-self-validation-gate-mandatory-when-findings-exist)
- [Next Steps](#next-steps)
- [Scope detection](#mode-detection)
- [Full mode protocols](#mode-protocols)
- [Closing reminders](#closing-reminders)

## Report-Only Mode (`--report-only`)

> **Use when** a caller runs this mode as a read-only leaf — e.g. a workflow specialist parallel batch, a delegated domain-entity gate, or a review batch — and another step owns every fix. `--report-only` in `$ARGUMENTS` is an execution flag, not a scope (`changes`/`scan` still resolve per [Mode Detection](#mode-detection)); review-only is the default; standalone `--fix-loop` alone runs repair/restart phases.
>
> **MANDATORY — when `--report-only` is passed, read `.claude/skills/workflow-review-changes/references/caller-mode.md` § `--report-only` in full FIRST.** It holds the rules every read-only leaf shares (no fix or restart, scope from the caller's brief, no nested fan-out, no user questions, write only the report, return contract); the rules below are this skill's own.
>
> 1. **Run Phases 0–4, then the Phase 5 Why-Review Self-Validation Gate only.** Phase 5 `$why-review --validate-findings` still validates every finding. The Phase 5 fix and full-review restart, the Phase 3 fresh-context `code-reviewer` spawn, and the Next Steps `ask user question tool` do not run: return the validated report; the caller owns fixes and any re-review. Contradictory Phase 2 evidence that would have triggered a fresh read is recorded under `Unresolved Questions` as `NOT VERIFIABLE`. — why: two writers of one artifact inside a barrier race each other.
> 2. **Default scope.** Use the entity files, diff or module the brief names (else the default `changes` scope) and record the mode and file set in the report.
> 3. **No nested fan-out.** Skip the Systematic Review Strategy's delegated assignments; review files sequentially in this context, still appending findings per file and respecting working-set bounds.
> 4. **Return** the report path, the health score, validated findings grouped Critical/High/Medium/Low per the mapping below, every unconfirmed material trade-off (the `SYNC:trade-off-interrogation-gate` non-asking handoff), and the next-step recommendations the Next Steps prompt would have offered.
>
> **Severity mapping.** This mode's native tiers are the shared `SYNC:severity-rubric` tiers, so they map 1:1: CRITICAL→Critical · HIGH→High · MEDIUM→Medium · LOW→Low, each still classified by consequence. The health score is an evidence input, never a tier; `Positive Observations`, informational notes, and `Unresolved Questions` are not findings; a finding without the evidence to choose a tier is `NOT VERIFIABLE` — it stays open, never Low.
>
> For this mode the declared step order ends at the Phase 5 validation gate; stopping there is the mode's contract, not a skipped step.


## Canonical Owner — Domain Entity Change Gate

> `$domain-analysis --mode=review` is the **canonical owner** of `SYNC:domain-entity-change-gate`. `$plan`, `$plan --mode=review`, and `$changes-review` inline that gate and route here for the full checklist, so a design planned under the gate is reviewed under the same rules. The gate's 6 decision points map to this skill as: classification → **A** · invariant ownership + failure signalling → **E/M** · aggregate boundary + concurrency → **F/P** · construction vs reconstitution → **N** · events → **H/O** · test obligation → **E2**; paradigm detection is **0.4** and subdomain fit is **3.1**.
>
> Do NOT apply the gate as a separate pass when running this mode — Phase 2 A–P **is** the gate, in full. Record `Gate is this skill's own body — A–P checklist owns it.` — why: a second pass over the same rules duplicates findings and inflates severity counts.
>
> Changing an entity rule here → update `.claude/skills/shared/sync-inline-versions.md` FIRST if the rule belongs to the gate's 6 decision points, then propagate to the three consumers. NEVER edit an inlined copy directly.


## First Principle — Easy to Change · Easy to Scale · Easy to Maintain

> The full gate is `SYNC:core-engineering-principles` (full body in the protocol section of this file); its closing digest ends this file.


## Phase 0: Project Discovery + Mode Detection + Blast Radius

> **MANDATORY FIRST STEP.** Phase 0 gates all other work — wrong base classes = wrong checklist.

Create tasks for Phases 0–5 and final lessons review before any work. Set Phase 0 in progress; complete phases immediately with evidence.

### 0.1 Discover Project Stack and Entity Conventions

Read `CLAUDE.md` and discovered entity/backend/code-review references under the configured reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides). Locate build/runtime markers, entity/VO bases and persistence annotations in configured source roots. If docs are absent, infer conventions from 3+ existing entities; verify fit before reusing a pattern.

**Record in report (required before Phase 2):**

| Convention | Discovered Value |
| --- | --- |
| Entity base class(es) | `{class names with file:line}` |
| VO base class(es) | `{class names with file:line}` |
| Validation API | `{how validation done}` |
| Domain exception type | `{exception class used}` |
| Navigation/FK pattern | `{annotation + FK property pattern}` |
| Persistence annotations | `{ORM annotations}` |
| Failure-signalling convention | `{throws domain exception \| returns Result/Either \| mixed}` |
| Concurrency mechanism | `{version/rowversion/etag field on roots, or none}` |
| Modelling paradigm | `{OO-mutable \| type-driven/immutable \| event-sourced}` (0.4) |

If project reference docs exist → read them and extract: service-specific base class requirements, documented anti-patterns, naming conventions, cross-service rules.

### 0.2 Determine Entity File Scope

Apply mode-appropriate command from Mode Detection table, adapted to discovered stack.

### 0.3 Blast Radius Analysis

For high-risk blast radius, an existing `.code-graph/graph.db` can supplement grep/read tracing; verify its possibly stale hints in source. Use the framework's discovered graph command, adapted to the host.

Record: entity file count, downstream consumers, risk level. Use to prioritize review order (highest-impact first).

### 0.4 Modelling Paradigm Detection (— gates which per-file rules apply)

> Sections C/D/N assume a mutable OO entity. Applying them to an immutable or event-sourced model manufactures false findings — detect the paradigm BEFORE the checklist. — why: "no public setters" is a finding in OO code and meaningless in a model that has no setters by construction.

Detect from the domain source, NEVER assume:

| Paradigm | Detection signal | Checklist adaptation |
| --- | --- | --- |
| **OO-mutable** (default) | Classes with private setters + state-changing methods | Full A–P checklist as written |
| **Type-driven / immutable** | Sealed hierarchies, discriminated unions, records-only, `With*()`/copy-returning methods, smart constructors returning `Result` | Section C immutability applies to entities too; Section D reads "no state-mutating method returns void"; illegal-state-representability replaces runtime guards — flag a status enum + nullable per-status fields as the union that was never made |
| **Event-sourced** | `apply`/`evolve`/`when` per event, `From(events)` / stream-fold reconstitution, no persisted state | Section C setter rules N/A; Section N reconstitution = the fold; Section O owns event-schema evolution; a CRUD-shaped event (`{Entity}Updated` with full payload) is a HIGH finding — it carries no business meaning |

- record the detected paradigm in the report before Phase 2 and state which sections were adapted or marked N/A — why: an unrecorded adaptation reads as a skipped check.
- NEVER flag a paradigm-appropriate pattern as a violation of a rule written for another paradigm — verify against 0.4 first.
- Mixed paradigms per aggregate are legitimate (event-source one aggregate, not the system) — detect per aggregate, NEVER once per repo.


## Phase 1: Collect Files + Grep Patterns + Create Report

**Create report FIRST:** `tmp/reports/domain-entities-review-{date}-{slug}.md`

Initialize with: Mode, Tech Stack, Discovered Conventions, Blast Radius Summary.

### Mandatory Search Intent

run high-signal searches BEFORE reading individual files. Derive the actual roots, file globs, framework markers, and naming conventions from `docs/project-config.json` plus the repository's project-reference docs. Do not copy a source-root, extension, framework type, or folder name from this skill as if it were canonical.

Search for these intent categories with the configured source roots and discovered stack syntax:

- Validation methods that hide or bypass the base/domain validation path.
- Relationship/navigation fields that can serialize recursively or expose internal graph structure.
- Value objects with mutable public state or missing structural equality.
- Domain methods throwing low-context generic errors instead of configured domain/validation errors.
- Business conditionals and entity mutation leaking into a higher layer when the entity/value object owns the invariant.
- Query/filter expressions placed in handlers/services when the entity, repository extension, specification, or equivalent local pattern owns them.
- Entity classes missing identity markers required by the configured persistence framework.
- Domain models performing direct persistence, network, or infrastructure work.

Build stack-specific `rg` searches from those intents; configured roots, syntax and markers determine the commands.

Write ALL grep results to report IMMEDIATELY.

### Categorize Files

| Category | Definition |
| --- | --- |
| Aggregate Root | Has dedicated repository; aggregate entry point |
| Entity | Has identity; accessed/persisted through root |
| Value Object | Structural equality; must be immutable |
| Unknown | Plain class in domain layer without clear classification |


## Phase 2: Entity-by-Entity DDD Review

For EACH entity/VO file: read file → append findings to report IMMEDIATELY. NEVER batch.

### Per-File Review Checklist

#### A. Entity vs Value Object Classification

- verify: does class need unique persistent identity? No → suspect VO misclassification.
- flag: "snapshot at point in time" (contact at referral, price at purchase, measurement at check-in) → MUST be VO, NEVER entity.
- CRITICAL if VO has primary key or repository → VO masquerading as entity.
- MEDIUM if entity has 3+ scalar fields always moving together → data clump → VO candidate.
- MEDIUM if entity is effectively stateless (no state changes after creation) → suspect VO.

#### B. Base Class Compliance

- verify aggregate root extends project's root entity base (from Phase 0 discovery).
- NEVER use root entity base for non-root child entities — child entities MUST NOT have their own repository.
- verify VOs extend project's VO base class — NEVER plain POCO/POJO in domain.
- verify audited entities extend audited base where audit trail required.
- cross-check each entity's base class against service/module-specific requirements from reference docs.

#### C. Value Object Immutability and Equality

- NEVER allow mutable public state on value objects. Use the immutability mechanism idiomatic to the configured language/runtime.
- Parameterless/default constructor allowed when required for framework deserialization.
- verify equality based on structural value — NEVER reference equality. Use the equality mechanism idiomatic to the configured language/runtime or the repository's documented value-object base pattern.
- verify `validate()` overridden when VO has constraints (format, range, required).
- verify factory method exists for non-trivial construction: `Create()`, `New()`, `Of()`, `From*()`.
- NEVER put async operations, repository calls, or infrastructure dependencies inside VO.
- Conversion/implicit operator defined when VO wraps single primitive.

#### D. Encapsulation and Anemic Domain Model

- verify entity has at least ONE domain method when it has business rules — NEVER pure property bag.
- NEVER allow direct property assignment for state transitions from outside entity — MUST use domain methods (`changeStatus()`, `approve()`, `assign()`).
- flag: same guard clause in 3+ handlers for same entity → extract to `ensureCan*()` on entity.
- flag: handler doing multi-field mutation (`entity.a=x; entity.b=y; entity.c=z`) without validation → domain method candidate.
- flag: business conditionals in application layer referencing single entity's state → move to entity guard.
- Entity behavior MUST be caller-agnostic — methods describe domain intent, NEVER reference who calls them.

#### E. Domain Invariants

- verify entity validates own invariants (via `validate()`, constructor guard, or factory) — NEVER handler-only enforcement.
- verify pre-operation guards as `ensureCan*()` / `validateCan*()` methods on entity.
- NEVER throw raw language exceptions for domain violations — MUST use project's domain exception type (discovered Phase 0): `ArgumentException`, `IllegalArgumentException`, `Error`, `ValueError` all WRONG.
- Invariants from creation MUST be enforced in factory method or constructor.
- CRITICAL: `validate()` MUST NOT be hidden by same-name method without calling `super` → silent validation dead zone.

#### E2. Spec-Loop Discipline — Invariant → Property-TC Mapping

- verify each entity/VO invariant maps to a **universally-quantified property TC** (holds for ALL valid inputs) plus a **boundary counter-case** — NEVER accept a single happy-path example as coverage for an invariant.
- flag any invariant with no guarding property TC as a **Dual-Feedback finding**: the spec must NAME the invariant AND a test must GUARD it — blank either axis = INCOMPLETE, NEVER report a behavior-affecting invariant finding as code-only.
- review the whole package (spec + tests + entity code), not the entity diff alone; loop until zero new invariant→property-TC gaps remain — each cycle enriches the spec.

#### F. Aggregate Design

- NEVER give child entity its own repository — ONLY aggregate root has repository.
- NEVER reference another aggregate by object — MUST use ID only (`string productId` NOT `Product product`).
- NEVER expose mutable collection directly — aggregate root MUST use domain methods for collection mutations.
- verify composite-key entities implement project's composite ID pattern (discovered Phase 0).
- flag aggregates with >5 independent child entities with separate lifecycles → splitting candidate.
- Deletion of aggregate root MUST validate pre-conditions on children (orphan prevention).

#### G. Navigation / Relationship Properties

- CRITICAL: ALL navigation/relationship properties that can serialize recursively MUST use the configured serialization-ignore mechanism or an explicit DTO/projection boundary.
- Navigation properties MUST be nullable/optional — not always loaded.
- FK ID MUST be stored as primitive alongside navigation — NEVER navigation-only reference.
- NEVER use navigation properties in domain logic without null guard.
- Prefer unidirectional navigation — bidirectional only when both directions actively used.

#### H. Domain Events

- verify meaningful state changes raise domain events — NEVER tracked only by polling DB.
- Events MUST be raised INSIDE entity domain methods — NEVER from handlers/services.
- Side effects MUST go to event handlers — NEVER inline in entity domain method.
- Domain event naming: `{Entity}{Action}Event` or `{Entity}{PastTense}Event` (e.g., `OrderShippedEvent`).
- Entity domain methods MUST remain focused: raise event + update own state. Nothing else.

#### I. Static Query Expressions

- verify reusable filter expressions defined as static methods on entity (or companion class) — NEVER duplicated in repos/handlers.
- Expression naming: descriptive static method (e.g., `isActive()`, `filteredByDepartment()`).
- NEVER duplicate expressions across multiple repository or handler files.
- Query expressions MUST have corresponding database indexes (verify in migration/schema files).

#### J. Naming and Ubiquitous Language

- NEVER use technical class name suffixes: `Manager`, `Helper`, `Processor`, `Util`, `Handler`, `Service`.
- Domain methods MUST use domain verbs: `approve()`, `reject()`, `assign()`, `changeStatus()` — NEVER `process()`, `handle()`, `execute()`.
- Boolean properties MUST use `is*`/`has*`/`can*` prefix: `isActive`, `hasPermission`, `canBeDeleted`.
- Status/type enums MUST be co-located with owning entity — NEVER in shared `Enums/` catch-all folder.
- Method parameters MUST use domain nouns — NEVER `data`, `model`, `obj`, `input`, `payload`.

#### K. Code Smells

| Smell | Detection Signal | Severity |
| --- | --- | --- |
| **Fat Entity** | >500 lines with unrelated concerns | MEDIUM — split by domain concept |
| **Feature Envy** | Method uses 5+ properties of another entity | HIGH — wrong responsibility |
| **Data Clump** | 3+ primitives always together | MEDIUM — VO candidate |
| **Primitive Obsession** | Raw `string` for email/phone/money/ID | MEDIUM — domain type opportunity |
| **Leaky Abstraction** | Entity exposes persistence internals | HIGH |
| **Collection Exposure** | Public mutable collection returned directly | HIGH — domain method needed |
| **Constructor Overload** | 5+ params without factory method | MEDIUM |

#### L. OOP Principles

- verify SRP: entity represents ONE domain concept — conflating two → flag for split.
- NEVER instantiate infrastructure inside entity (repositories, HTTP clients, loggers) — MUST receive as parameters.
- New behaviors MUST go via new event handlers — NEVER by modifying entity conditionals (Open/Closed).
- Capability traits added via focused interfaces — NEVER monolithic interface bundle (ISP).
- Entity subclasses MUST be substitutable for base — `base.method()` NEVER skipped in override (LSP).

#### M. Invariant vs Validation Ownership + Failure Signalling

**Think:** for each rule the entity enforces, ask who is allowed to violate it. A user typo → boundary validation. A code path reaching an impossible state → entity invariant.

- flag input-shape checks inside the entity (required-field, max-length, format-for-UX, localized messages) → MEDIUM, belongs at the boundary — why: the entity now changes when the form changes.
- flag a business rule living ONLY in a `*Validator` / `*Rules` / handler guard while the entity permits the state → HIGH invariant gap — why: every other entry point reaches invalid state.
- NEVER accept a database constraint or trigger as the invariant's enforcement — it is a backstop; the model must state the rule — why: an opaque SQL error is not a domain contract and cannot be unit-tested.
- verify failure signalling matches the convention discovered in Phase 0 — mixed exception/`Result` for the SAME class of failure is a HIGH finding — why: callers cannot know which to handle, so one path goes unhandled.
- Expected business outcomes (insufficient funds, slot taken) returning `Result`, unreachable-state guards throwing → correct split; flag the inverse (throwing for expected outcomes in a hot path, or `Result` for a "cannot happen") as MEDIUM.
- flag mutations returning bare `bool` → MEDIUM: loses WHY and is trivially ignored.
- flag silent clamping of bad input (`if (qty < 0) qty = 0`) → HIGH — why: hides a caller bug and persists wrong data with no signal.

#### N. Construction vs Reconstitution

**Think:** trace both paths separately — `new` from a command, and materialization by the ORM/stream fold. Ask what each is allowed to run.

- verify a distinct reconstitution path exists (private/protected ctor, ORM materialization hook, or `From(events)` fold) separate from the creation factory — why: without it, creation invariants must be weakened until loading passes.
- CRITICAL if the load path raises domain events — loading N entities emits N phantom events — why: downstream handlers fire for things that did not happen.
- flag creation rules re-run on load (clock checks, uniqueness calls, `startsOn >= today`) → HIGH: historical rows fail to load once the rule tightens.
- verify required data sits in the constructor/factory and optional data in methods — an entity constructible without a value it cannot exist without is a HIGH invariant gap.
- flag public parameterless constructor + public setters as the creation path → CRITICAL anemic entry point (paradigm-adjusted per 0.4; framework-required non-public ctors are fine).
- flag 5+ positional constructor params → MEDIUM: group into VOs FIRST, consider a builder only after.
- NEVER flag a framework-mandated non-public parameterless constructor as a violation — verify the discovered persistence convention first.

#### O. Event Dispatch Timing + Contract Boundary

**Think:** follow one raised event to its consumer and ask what happens if the consumer throws, if the transaction rolls back, and if the event is delivered twice.

- CRITICAL if events dispatch synchronously INSIDE the write transaction — a handler failure rolls back the business operation — why: an unrelated feature can now break the core write.
- CRITICAL if events publish to a broker BEFORE the transaction commits — you announced a fact that may never have happened; require the transactional outbox (events persisted in the SAME transaction, relayed after commit).
- verify the event buffer is cleared after dispatch — an uncleared buffer republishes on the next save (MEDIUM–HIGH by blast radius).
- verify internal domain events are distinct from published integration events — flag an internal event placed on the bus as HIGH — why: consumers become coupled to your model's internal shape, permanently, and it can no longer be refactored.
- flag fat events carrying the whole aggregate → MEDIUM: violates least privilege and blocks schema evolution. Events carry IDs + the minimal meaningful payload.
- flag events named as commands (`SendEmail`, `UpdateStock`) → MEDIUM: an event states what happened; command-naming re-couples producer to consumer.
- flag handlers with no idempotency guard where delivery is at-least-once → HIGH.
- Event-sourced projects (0.4): verify a versioning/upcasting strategy exists — why: a past event can never be changed, only upcast, and the first schema change without a plan has no rollback.

#### P. Aggregate Concurrency + Transaction Boundary

**Think:** two users act on the same aggregate at the same instant — what stops the second write from silently discarding the first?

- verify aggregate roots carry an optimistic-concurrency token (version/rowversion/etag) when the discovered persistence layer supports one — absence is HIGH on any contended or money/data-integrity path — why: last-write-wins silently discards a committed decision.
- NEVER accept a concurrency token on a CHILD entity as the aggregate's token — the version belongs to the ROOT, because a change anywhere inside the aggregate is a change to the aggregate.
- flag a single transaction mutating 2+ aggregate roots → HIGH: lock-ordering and deadlock risk, and it blocks later service extraction. Route the second change through a domain event.
- flag an aggregate whose parts are routinely written by different users concurrently → MEDIUM sizing finding: the boundary is too big and produces concurrency failures on unrelated work.
- check invariants claimed to span aggregates (uniqueness across all instances, "max N active per tenant") — these cannot live inside one aggregate; verify the owning mechanism (DB constraint + domain service, or a reservation pattern) exists and is stated — why: a set-based invariant enforced by an in-memory check races under concurrency and passes every single-threaded test.


## Phase 3: Holistic Synthesis + Fresh-Context Gate

After all Phase 2 files are reviewed, synthesize cross-entity DDD concerns in the current report. Do not spawn a fresh sub-agent only because findings exist. Findings must go through the why-review validation gate before any fix.

### 3.1 Model-Level Dimensions (— judged over the whole model, NEVER per file)

Two concerns are invisible file-by-file and only appear when the model is viewed whole. Run one focused pass each.

**Dimension 1 — Bounded-context sharing.** **Think:** does one entity class serve two different businesses?

- flag a single entity class consumed by two contexts with divergent rules (a `Customer` used by Sales, Support, AND Billing) → HIGH — why: the class accretes every context's fields and rules, becomes the god entity nobody can change, and no context owns it.
- The same word meaning different things per context is CORRECT, NEVER a duplication to eliminate — flag an attempt to unify them as a MEDIUM finding against the unifier.
- verify a translation boundary exists where contexts meet (anti-corruption layer, mapper, published contract) — direct cross-context entity reuse is HIGH.
- flag domain concepts leaking into a shared/generic/infrastructure layer (tenant/customer/product IDs, business rules in a "reusable" base) → HIGH — why: a layer coupled to one consumer's domain is no longer reusable.

**Dimension 2 — Subdomain fit.** **Think:** does this code deserve a rich domain model at all?

- judge fit BEFORE reporting anemic-model findings: a rich entity is correct in a **core** subdomain (complex, differentiating, changes often); Active Record or Transaction Script is CORRECT in supporting/generic subdomains and in pure CRUD.
- NEVER report "anemic model" against code whose subdomain has no invariants beyond required-field — that is CRUD, and the finding is noise — why: uniform tactical DDD over CRUD is itself an anti-pattern, adding ceremony and indirection with no invariant to protect.
- flag the inverse too: a **core** subdomain implemented as Transaction Script with business rules scattered across handlers → HIGH, this is where the rich model was owed.
- flag generic subdomains modelled in-house (auth, billing, email, scheduling) → MEDIUM: buy or adopt, do not model.
- state the subdomain judgment and its evidence in the report — an anemic-model finding without it is unproven — why: "anemic" and "appropriately simple" look identical in a diff.

Spawn a fresh `code-reviewer` sub-agent only when one of these conditions is true (never under `--report-only` — see [Report-Only Mode](#report-only-mode---report-only)):

- A validated-finding fix cycle has already changed the entity review target and this is the full re-review restart.
- The user/workflow explicitly requests an independent high-risk synthesis pass for broad entity-model changes.
- Phase 2 produced contradictory evidence that cannot be resolved in the current session without an independent read.

When triggered, dispatch a fresh `code-reviewer` with zero prior-round memory. Build the brief from Phase 0 conventions/reference paths and Phase 1 target files; require its own complete reads of this mode, applicable DDD-reference sections and the targets.

The brief must contain the complete `SYNC:review-protocol-injection` template (all 11 full bodies, verbatim from `.claude/skills/shared/sync-inline-versions.md`); pointers/digests do not substitute for injected bodies.

Assign holistic model coherence, classification, aggregate boundaries, navigation/serialization, language, cross-context translation, paradigm/subdomain fit, concurrency and set-based invariants. Include null-safe computed/navigation paths, empty/zero/negative boundaries, failure signalling and root-only mutation. Apply A–P/E2 and discovered conventions; trace cause to the invariant owner before suggesting a fix. Optional graph hints require source verification.

Require **PASS/FAIL, severity-grouped evidence, cross-cutting concerns, aggregate coherence and refactoring priorities** in `tmp/reports/domain-entities-rerun{N}-{date}.md`; return path/status. Infer conventions from 3+ entities when references are absent. No finding without `file:line`; >80% report, 60–80% verify, <60% withhold. Judge anemia against subdomain fit; do not overrule local patterns.

After sub-agent returns:

1. Read the sub-agent report
2. Integrate as `## Re-Review {N} Findings` in main report — NEVER filter or override
3. If findings remain: validate the new finding set before any additional fixes
4. Repeat only after another validated-finding fix cycle; if the same blocker repeats across 2 full invocations with no progress, escalate via `ask user question tool`
5. Final verdict MUST incorporate every review pass that actually ran


## Phase 4: Final Report Generation

Write the report with these sections:

- **Metadata:** mode, stack, entity/VO bases, scope, date, entity count and blast radius/downstream consumers (graph hint optional).
- **Health Score:** 100 - (CRITICAL×25 + HIGH×10 + MEDIUM×3 + LOW×1), min 0. Score is evidence, not severity.
- **Critical / High / Medium / Low:** each finding includes description, `file:line`, consequence and fix. Keep informational notes separate.
- **Re-Review Findings:** integrate every fresh pass without filtering.
- **Positive Observations:** evidence-backed strengths.
- **Refactoring Priority:** targets and reasons, highest impact first.
- **Repository-Specific Rules Applied:** rule and evidence.
- **Unresolved Questions:** question, owner and next step.

## Universal DDD Quick Reference

### Entity vs Value Object / Aggregate Boundary (reused from `domain-analysis`)

> The decision matrix, fast heuristics, primitive-obsession → VO mapping, aggregate boundary rules and the anti-pattern list live once in `references/ddd-reference.md` (sections **Entity vs Value Object**, **Aggregate Design**, **Anti-Patterns Quick Reference**). Read the section you need on demand while applying Phase 2 A, B, C, F and K — never classify from memory. Two review-specific rows are not in that matrix: a **snapshot at a moment in time** (contact at referral, price at purchase) is a VO candidate; a class that **needs its own repository** is an Aggregate Root.

### Invariant Enforcement Decision Table

| Location | When to Use |
| --- | --- |
| Constructor / Factory | Invariants must hold from creation |
| `validate()` override | State invariants run before persistence |
| `ensureCan*()` guard | Operation preconditions (throw domain exception) |
| Before-delete hook | Pre-delete constraints |
| Application layer ONLY | ← NEVER — always enforce in entity too |

### Invariant vs Validation Decision Table

| | **Invariant** | **Validation** |
| --- | --- | --- |
| Question | "Can this state legally exist?" | "Is this input acceptable right now?" |
| Owner | entity / aggregate | application boundary |
| Failure means | a bug, a broken model | a user error |
| Signalled as | domain exception (or `Result` per convention) | validation result / problem details |
| Example | order total always equals the sum of its lines | the email field is required |

### Paradigm Adaptation Table (from Phase 0.4)

| Rule as written | OO-mutable | Type-driven / immutable | Event-sourced |
| --- | --- | --- | --- |
| "No public setters" (D) | applies | N/A — nothing mutates | N/A — no state to set |
| "VO immutable" (C) | applies | applies to entities too | applies |
| "Reconstitution path separate" (N) | ORM ctor/hook | smart constructor | the event fold |
| "Status enum + guards" | correct | **anti-pattern** — should be a union | replaced by event stream |
| "Events raised in entity" (H/O) | applies | applies | events ARE the state |

### Code Smell Signals

Read **K** for code-smell thresholds. >20 properties prompts a cohesion check, not an automatic finding; no methods plus handler-owned rules suggests anemia only after subdomain-fit assessment.

### Related decisions

Read **Phase 0.4** when adapting to immutable or event-sourced models; **M** for invariant versus boundary validation; **F** for root-only mutation and ID references.

## Systematic Review Strategy

> Follow `SYNC:systematic-review-batching` to choose from risk, related flows, working-set fit and delegation cost; file counts are planning cues. Not run under `--report-only` — that mode reviews sequentially in this context.

1. Record the chosen scope/approach, reason, fit and coverage before source reads.
2. Group related module/aggregate/type flows and preserve cross-group links.
3. Review inline or in bounded sequential assignments; use authorized fresh parallel `code-reviewer` assignments when independent flows or necessary depth justify delegation.
4. Each reviewer: Phase 2 checklist + discovered project-specific rules → write to `tmp/reports/domain-entities-{group}-round1-{date}.md`
5. Main agent consolidates: cross-aggregate violations, naming consistency, model coherence


## Output Summary Format

Return the health score, findings grouped by severity with `file:line` and fix, positive observations, unresolved questions, and report path. Include every pass and deferred item.

## Phase 5: Why-Review Self-Validation Gate (MANDATORY when findings exist)

> **Purpose:** Adversarial validation of own findings BEFORE handoff. Catches over-flagged Highs, false positives, and severity inflation at the source rather than letting them propagate downstream.

**Trigger:** Any finding produced (Critical, High, Medium, OR Low). Skip ONLY when the report's verdict is unconditional PASS with literally zero findings.

**Protocol:**

1. Read own finalized report from `tmp/reports/domain-entities-review-{date}-{slug}.md`
2. Invoke `$why-review` skill with arg: `validate findings in tmp/reports/domain-entities-review-{date}-{slug}.md — verify each finding has file:line proof, steel-man each rejected interpretation, and stress-test severity classifications`
3. Read the validation verdict path returned by why-review, expected as `tmp/reports/why-review-validate-{date}.md`
4. **If why-review demotes/removes any finding:** UPDATE own finalized report with revised severities, remove false positives, and add a `## Why-Review Validation Notes` section citing what changed and why
5. **If why-review confirms all findings:** Append `## Why-Review Validation` line to own report stating "All N findings re-validated against actual code; no severity changes."

**Skip conditions (record explicit reason if skipping):**

- Verdict is unconditional PASS with zero findings → log "Skipped — no findings to validate"
- Why-review skill itself is the active context (avoid recursion)



## Next Steps

when standalone, use `ask user question tool` after completing to present:

- **`$fix` (Recommended if FAIL)** — Fix validated findings that block the current round (Round 1: all severities; Round 2: CRITICAL/HIGH/MEDIUM; LOW-only is deferred)
- **`$scan --target=domain-entities`** — Update domain-entities-reference.md (scan mode)
- **`$integration-test`** — Add integration tests for newly-enforced invariants
- **`$docs-manager --mode=update`** — Update feature docs if entity contracts changed
- **"Skip, continue manually"** — user decides

**Exempt** under `--report-only`, when a parent skill or workflow invoked this review, or when running as a sub-agent: do NOT ask — return these next-step recommendations in the returned summary and let the caller decide; the caller's fix step owns any fix. — why: `ask user question tool` cannot reach the user from a sub-agent, and a leaf that waits on a prompt stalls its parent's all-return barrier.




## Mode Detection

**Determine the review scope BEFORE any other work** (the invocation already selected `--mode=review`; `--report-only` composes with any scope):

| Invocation | Scope | Files |
| --- | --- | --- |
| `$domain-analysis --mode=review` (default) | **changes** | Changed domain entity files from `git diff` |
| `$domain-analysis --mode=review changes` | **changes** | Changed domain entity files |
| `$domain-analysis --mode=review scan` | **scan** | All entity/VO files in domain layer directories |
| `$domain-analysis --mode=review scan <module>` | **scan-service** | Entities in named module only |

**Entity file detection — adapt to discovered stack:**

```bash
git diff --name-only HEAD
rg --files {configured-source-roots}
```

Filter those results using the entity/value-object/aggregate naming conventions discovered from project config and project-reference docs. Never hardcode source roots, extensions, or framework folder names from this mode.

If no domain entity files match in changes mode → announce "No domain entity changes detected" and report clean.


## Mode protocols

> Full protocol bodies carried by this mode (canonical text: `.claude/skills/shared/sync-inline-versions.md`).

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
> **Step 4 — Create sub-tasks and execute.** For each identified concern: create a task tracking sub-task, work through it with `file:line` evidence, mark done. No findings without proof.
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

<!-- SYNC:core-engineering-principles -->

> **Core Engineering Principles — Easy to Change · Easy to Scale · Easy to Maintain** — The success metric of every plan, implementation and review is _future change cost_: the next change must be cheap, safe and provable. DRY, reuse, abstraction, interfaces, wrappers, patterns, layering, tests and the harness exist only to serve that goal. Apply this gate BEFORE any narrower design rule or checklist; when a narrower design rule would raise change cost, this principle wins — it never waives a required gate (tests, review, security, user confirmation). It is evidence-gated: judge fit against the project's config, accepted decisions and local patterns, and never impose a technique the project does not use.
>
> 1. **Easy to change.** Keep one owner per piece of knowledge — DRY the rule, not look-alike text. Reuse an existing helper, component or module before writing a new one (search 3+ siblings and cite them). Put purpose-named interfaces or ports at volatile boundaries: wrap a third-party SDK or infrastructure dependency in an adapter when it is volatile, likely to be swapped, or needs a test seam, so a swap touches one place — a stable dependency used directly is fine, and a pass-through wrapper that lowers no change cost is a defect. Keep units small and cohesive with explicit dependencies; no hidden state, boolean traps or leaked implementation detail. Extract an abstraction for a real second consumer or an evidenced change axis, never for speculation; prefer the reversible decision and defer an irreversible one until evidence forces it. Depth → `SYNC:design-patterns-quality`, `SYNC:complexity-prevention`.
> 2. **Easy to scale.** Growth in features, modules, team, data or load must not multiply edit sites or cost. Add a variant by extension (a new handler, registration or config entry), not by editing every switch over the same discriminator. Keep module boundaries and dependency direction explicit. Bound every loop, query, result set, queue and concurrency on the paths that matter, so work grows with the request, not with total data. Scale only what the project's profile warrants — no speculative distribution or infrastructure. Depth → `SYNC:scale-technique-gate`, `SYNC:engineering-foundation-gate` (F5, F6).
> 3. **Easy to maintain.** Protect every changed behavior with tests that name the business intent or invariant and FAIL when it breaks — happy, error, edge, boundary and regression paths, not only the changed line. Tests are repeatable and isolated. The mechanical harness (format, lint, types, build, test — the same command locally and in CI) runs and passes. Names and structure state intent, and docs or specs that embed the behavior stay in sync. Depth → `SYNC:engineering-foundation-gate` (F3, F4, F7), `SYNC:harness-setup`.
>
> **By phase:**
>
> - **Plan** — each phase names what it reuses (`file:line`), the seam or abstraction it adds or why none is needed, the next plausible change and its edit-site count, the growth bound, and the test that proves each invariant — or `N/A` with a reason where an item cannot apply (a docs-only phase has no growth bound).
> - **Implement** — search for reuse before writing; after writing, recount the edit sites of the next plausible change, confirm each new test fails when its intent breaks, and run the harness.
> - **Review** — judge each pillar `PASS` / `FAIL` / `N/A` with `file:line` evidence and name the real enemy: coupling, duplicated knowledge, hidden state, unbounded growth, untested intent, unclear intent or an irreversible decision exposed too early. A finding names its consequence for the next change; absence of a pattern is not a defect.
>
> **Self-check before claiming done:** (1) What is the next plausible change, and how many files would it touch? (2) What breaks at 10× features, data or load? (3) Which named test goes red if this behavior breaks, and does the harness run it?

<!-- /SYNC:core-engineering-principles -->


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

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation (optional advice)** — Optional: for high-risk blast radius (shared contract, many callers, cross-module/cross-service flow, public API), `.code-graph/graph.db` may add callers, dependents and impacted tests beyond grep/read. Treat it as a hint, NOT proof: stale or incomplete graphs lag uncommitted edits and unindexed paths. verify anything that matters by reading files/grep. Skip it for low-risk or local changes.
>
> An absent or stale graph is never a finding and never blocks, fails or gates work.
>
> **Pattern:** grep/read → optional graph suggestions → grep/read verification.
>
> | Situation                          | Optional graph query                         |
> | ---------------------------------- | -------------------------------------------- |
> | High-risk investigation            | `trace --direction both` on 2-3 entry files  |
> | Fix/debug with wide reach          | `callers_of` on buggy function + `tests_for` |
> | Feature touching a shared contract | `connections` on files to be modified        |
> | Review of a high-risk change       | `tests_for` on changed functions             |
> | Blast radius                       | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Start `--node-mode file` (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->


<!-- SYNC:review-principle-awareness -->

> **Review Applicability / Current-Principles Awareness** — Every review must first classify the change context (greenfield foundation, brownfield feature/refactor, test/docs/config/UI/infra, or actor-facing/machine surface) and take notice of the applicable current principles below. This is an evidence-gated applicability check, not a mandate to flag or build every item.
>
> **Detailed protocol routing — read/apply only when warranted:**
> - `SYNC:scale-ready-foundation` — greenfield foundation is blocking; big-feature brownfield fit/adapt/defer; architecture review is advisory when auditing. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`.
> - `SYNC:test-architecture-execution-contract` — assertion-bearing tests use the project's configured/native format, name the guarded intent/technical contract, and assert an owned outcome; GWT is one valid format. Detailed carriers: `integration-test`, `workflow-greenfield-init`, and the test-architecture review path.
> - `SYNC:ai-agent-as-user-access` — when an AI/machine actor or future contract is evidenced, inspect identity/delegation, capability boundaries, selected API/CLI/MCP/WebMCP/event/SDK surface, safety/consent, audit/observability, and native-format contract tests. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`, `architecture --mode=review`.
> - `SYNC:design-system-check` — when UI changes, inspect the design-system and component-contract obligations; route visual/UX depth to the owning UI review.
>
> **Review behavior:** Check only principles applicable to the reviewed scope; record `APPLY-NOW`, `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, `BLOCKED`, or `UNVERIFIED` with `file:line`/config/CI evidence, status/severity, owner/route, and next step/revisit trigger. Do not invent findings from a generic checklist, flag unrelated pre-existing gaps as regressions, silently expand the requested scope, or mutate a parent gate merely because advice exists.
>
> **Ownership:** `changes-review` coordinates the applicability pass and routes depth to the owning specialist (`architecture --mode=review`, `integration-test --mode=review`, `security-audit`, `performance-review`, `ui-design --mode=review`, `production-readiness-review`, or another matching review). A specialist reports its own lens and does not duplicate or override another review's verdict; existing brownfield gaps stay advisory unless new, safety-relevant, or explicitly in scope.
>
> **Required review note:** `context/scope | principle/protocol checked | evidence | status/verdict | severity | owner/route | next step/revisit trigger`.
>
> **BLOCKED when:** an applicable principle is required for safety/correctness but missing, unowned, or untestable. Otherwise record an evidence-backed `NOT-APPLICABLE`, advisory, `DEFER-AS-OPPORTUNITY`, or `UNVERIFIED` result according to the lifecycle and change context; creating a greenfield foundation remains subject to its own blocking protocol.

<!-- /SYNC:review-principle-awareness -->

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Use one consequence-based scale across reviews, skills, agents, workflows and hosts. Choose the highest credible tier supported by evidence; never lower it to pass a round. Effort, cost, preference, annoyance, frequency alone and round-budget pressure do not determine severity.
>
> **Finding vs observation:** admit a finding only with an affected user/system/data/contract, shipped consequence, reachable supported trigger (caller, input, state or event sequence), evidence location and confidence percentage. Assess exposure/likelihood and reversibility/detectability before assigning a tier.
>
> **Keep as observations:** advice, preference, duplicates, unsupported concerns, unreachable paths, issues already reported by this change’s compiler/type checker/linter/tests, intended behavior changes, reasoned suppressions predating the change, and pre-existing issues neither touched nor made reachable. Review newly added suppressions. Observations/INFO do not reopen loops.
>
> | Tier | Consequence and boundary examples | Action |
> | --- | --- | --- |
> | CRITICAL | Immediate material security, safety or authority harm; auth bypass; secrets/PII exposure; irreversible destruction; data loss/corruption; critical-path silent failure. | Block immediately; escalate. |
> | HIGH | Material supported-path correctness, invariant, privacy/authority, public-contract or compatibility failure; likely user/downstream harm; missing proof for a behavior-changing fix. | Fix before PASS/merge. |
> | MEDIUM | Bounded consequential edge, resilience, observability, testability, maintainability or architectural gap; credible future defect. | Clear this round; escalate decisions needing an owner. A follow-up is not a clean pass. |
> | LOW | Proven non-blocking polish with no credible present correctness, security, privacy, authority, availability or data-integrity impact: wording, formatting, minor docs/conventions, optional cleanup, cosmetics. | Record/defer; alone never opens another round from round 2 or increases the budget. |
>
> **Consequence decision tree:** check binary gates separately, then select the first evidenced tier from CRITICAL → HIGH → MEDIUM → LOW. Missing evidence is **NOT VERIFIABLE**, not a fifth tier or a LOW fallback: name the missing proof. Unsettled reachability is NOT VERIFIABLE for potential MEDIUM+ impact and an observation for polish. Claims potentially affecting required behavior, security, privacy, authority, availability, data integrity or a gate remain evidence blockers until proved or explicitly owner-accepted with scope, rationale and residual risk. Owner acceptance does not make an open MEDIUM a clean pass or a failed gate pass.
>
> **Hard gates and rounds:** failed tests, required artifacts, security must-fix checks, generated parity and policy compliance block every round, independently of finding severity. The executable helper carries failures as synthetic CRITICAL blockers; reports name the gate and failure evidence. Default review budget is three rounds; unresolved findings or failed required checks at the cap ask the user for a bounded extension under `SYNC:review-policy`. Failed checks never pass by severity deferral.
>
> **Domain-vocabulary normalization and scores:**
> - `BLOCKED`/`HARD FAIL`/`FAIL` are local blocking verdicts, not automatic CRITICAL; classify by consequence while preserving the owning gate. `WARN` can be any tier; `PASS`/compliant is not a finding. INFO/advisory remains observational unless material consequence is evidenced.
> - UI `P0/P1/P2/P3/P4` start at CRITICAL/HIGH/MEDIUM/LOW/LOW; raise only with evidence. P0/P1 accessibility or task-completion floors remain blocking gates.
> - Criterion `0/1/2` → CRITICAL or HIGH (unmet readiness)/MEDIUM (partial consequential gap)/pass; polish is LOW, never forced to `0`.
> - Impact × likelihood: high impact/exposure → CRITICAL/HIGH; material impact with bounded exposure → HIGH/MEDIUM; low impact/exposure → LOW. Record both axes and justify the highest credible tier.
> - Aggregate scorecards and `/20` verdict bands stay separate; sub-80 areas prompt investigation, not automatic severity. Keep advisory deductions separate from blockers. Emit numeric SRE/readiness or impact/likelihood scores with consequence and normalized tier.

<!-- /SYNC:severity-rubric -->

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

<!-- SYNC:systematic-review-batching -->

> **Adaptive Review Planning** — Triage the complete target and make a short plan before deep review. Optimize attention and time while preserving coverage and all applicable quality gates.
>
> 1. **Understand the work.** Inventory all changed paths/status and intent; distinguish behavior, contracts, tests, docs/config and mechanical outputs. Identify risk, dependency links and governing rules. Prioritize the paths whose failure has the largest consequence; size alone does not decide depth.
> 2. **Choose an approach.** Review inline when useful. Group connected behavior with its callers, tests and rules; use authorized specialist agents for independent work or necessary expertise. Decide grouping, read sizes and concurrency from the actual working set, context headroom and delegation cost. There are no universal file, line, byte or group-size caps, and no mandated split or hierarchy. Preserve host limits and leave room to reason.
> 3. **Track and persist.** Create todo tasks for the planned review work, findings validation and fix/re-review checks. Track coverage so every file is reviewed or accounted for by relevant evidence; generated/mechanical changes can use verified generator/parity or pattern checks with an explicit rationale. Read relevant source and rules on demand, persist findings and remaining work as you go, and resume from that record after interruption. If context is tight, checkpoint and regroup; never silently truncate or call unreviewed work clean.
> 4. **Coordinate and validate.** Give each delegated reviewer a clear scope, governing rules, report path and the required full review protocol template. Independent readers may run together; fixes wait until their reports return. Validate findings before acting, preserve rejected/re-tiered candidates and reconcile conflicts by evidence. The coordinator independently checks material findings, uncertain claims and cross-group interactions, choosing additional validation where risk warrants it. Reconcile all coverage and required checks before the final verdict.
>
> **Quality bar:** a thousand-file review may need several passes, but file count never waives end-to-end correctness, required rules, tests, finding validation or fresh post-fix review.

<!-- /SYNC:systematic-review-batching -->

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

<!-- SYNC:trade-off-interrogation-gate -->

> **Trade-Off Interrogation Gate** — ALWAYS ask these THREE questions before ANY verdict, score, finding, or recommendation — about the thing under review AND about every recommendation YOU make. — why: naming a benefit without its price is an endorsement, not a review; the costliest trade-offs are the ones nobody wrote down.
>
> **Review/audit decisions:** apply `SYNC:review-decision-autonomy` before any user-choice or confirmation prompt below. Select the supported recommendation and record its rationale; round-limit extension, indispensable missing facts and operation authority retain their explicit boundaries.
>
> 1. **Is there any trade-off?** Name what it SACRIFICES. "None" / "pure win" is an unfinished analysis, NOT an answer — to claim none, state which dimensions you checked and why each is unaffected: future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.
> 2. **Is it worth it?** Weigh gain against sacrifice EXPLICITLY — what is gained (with a metric) · what it costs · WHO pays · WHEN it comes due — then emit **WORTH IT / NOT WORTH IT / UNCLEAR**. "Better" with no metric and no cost FAILS this question. NOT WORTH IT → withdraw or replace the recommendation, never keep it as-is.
> 3. **Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. **MATERIAL** when ANY holds: irreversible / one-way door (data migration, public contract, storage format, vendor lock-in) · cost shifted onto someone else (another team, ops/on-call, future maintainer, end user) · one quality attribute traded for another (correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility) · a boundary crossed (client↔server tier, service contract, event contract, shared library) · a high-consequence path (auth, money, data integrity, breaking change, High/Medium residual risk) · the worth-it verdict is UNCLEAR.
>
> **MATERIAL → STOP and confirm via `ask user question tool` BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** `ask user question tool` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it via `ask user question tool` on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

<!-- /SYNC:trade-off-interrogation-gate -->

<!-- SYNC:understand-code-first -->

> **Understand Existing Code First** — For code changes, read and trace the target before planning or editing; do not apply a code workflow to work with no code surface.
>
> 1. Search for relevant existing implementations and cite `file:line`; aim for 3+ comparable examples when they exist, and record when the project has fewer or none.
> 2. Read the target area and its configured project references; identify actual structure, owners, and conventions without assuming a framework, layer model, or base class.
> 3. Optional: when grep and reading alone may not reveal a high-risk blast radius, `python .claude/scripts/code_graph trace <file> --direction both --json` (when `.code-graph/graph.db` exists) can add callers and dependents — a hint that may be stale, verified by reading the files.
> 4. Map affected dependencies and callers with available repository tools (grep, reading); an absent, stale or unsupported graph never blocks or fails the task.
> 5. Write investigation to `tmp/analysis/` for non-trivial tasks (3+ files).
> 6. Re-read the analysis before implementing; update it when evidence changes.
> 7. Follow a fitting local pattern, or state why no suitable pattern exists and justify a project-appropriate choice.
>
> **BLOCKED until:** target and relevant existing patterns are inspected, applicable dependencies are traced, and material assumptions have evidence. If an item does not apply or the repository has no comparable implementation, record that fact rather than fabricating a gate result.

<!-- /SYNC:understand-code-first -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code/conventions BEFORE any modification or explanation. The code graph is optional advice for high-risk blast radius (a hint that may be stale), never a requirement.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**Optional advice:** the code graph (`.code-graph/graph.db`) can hint at a high-risk blast radius grep misses; it can be stale, so verify by reading files. Never required.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->


<!-- SYNC:systematic-review-batching:reminder -->

**MUST ATTENTION** Triage all files, write a short review plan and create review/validation/fix/re-review tasks first. Choose inline work or authorized specialists from risk, relationships and context headroom; no fixed file/line/byte caps. Persist coverage, reconcile interactions and validate findings before fixes or PASS.

<!-- /SYNC:systematic-review-batching:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** A finding names a reachable trigger path (caller, input, state or event that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (an observation otherwise) — never a speculative LOW.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:category-review-thinking:reminder -->

- **MANDATORY** Derive review categories from file language + directory semantics + change nature; create a sub-task per category.
- **MANDATORY** Derive each category's concerns from first principles with `file:line` evidence — never a fixed checklist.

<!-- /SYNC:category-review-thinking:reminder -->


<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

**Review/audit invocations:** follow `SYNC:review-decision-autonomy` for every decision prompt; choose supported recommendations without asking, preserve round-extension approval and actual authority.

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `ask user question tool` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** `ask user question tool` reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->


<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

## Closing Reminders

**Goal:** Review entity/VO design against discovered project conventions so invariants and aggregate boundaries remain safe.

**MUST ATTENTION** Phase 0 discovery/paradigm/scope → 1 search/report → 2 A–P/E2 → 3 holistic fit/fresh-context gate → 4 report/score → 5 validate/fix/full restart → standalone Next Steps. `--report-only` ends after validation: no fixes, restart, delegation or user questions.

- Discover before judging; verify callers and all execution paths. Require `file:line` and >80% confidence (60–80% verify first; <60% do not recommend).
- Adapt rules per aggregate and subdomain; check pattern fit, base class, scope and lifetime. Two or more same-kind violations signal a structural concern.
- Validate all findings before fixing; respect the round severity bar and binary gates. A clean pass ENDS the review only once the persisted `minRounds` is met. Each fix invalidates the prior verdict.
- Bootstrap all phase tasks plus the final lessons review; keep one in progress, complete with evidence, resume existing tasks after context loss, and persist findings per file.

<!-- SYNC:core-engineering-principles:reminder -->

**MUST ATTENTION** Core Engineering Principles — every plan, implementation and review must be **Easy to change** (reuse first, one owner per rule, interfaces/adapters at volatile boundaries, no speculative abstraction) · **Easy to scale** (extend by addition, bounded growth, explicit boundaries, sized to the project's real profile) · **Easy to maintain** (intent-named tests that fail when the rule breaks across happy/error/edge paths; harness green locally and in CI). Before done: next change → how many edit sites? 10× → what breaks? which test goes red?

<!-- /SYNC:core-engineering-principles:reminder -->
