---
name: domain-entities-review
version: 2.0.0
description: '[DDD Quality] Use when a workflow step or the user asks for a domain entity review. Checks entities and value objects for DDD design quality.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Detect DDD design quality violations in domain entities and value objects across any technology stack — adapting to project-specific patterns via config/reference docs discovery — so domain entities and value objects preserve invariants, aggregate boundaries, and discovered DDD conventions.

**Summary:** read-this-if-nothing-else digest — the skill's main steps in order:

- **Phase 0 (gate):** discover the project's real entity/VO base classes, validation API, domain exception type, failure-signalling convention, concurrency mechanism + blast radius FIRST, then **0.4 detect the modelling paradigm** (OO-mutable / type-driven-immutable / event-sourced) per aggregate — discovered conventions override every generic DDD rule. — why: wrong base classes = wrong checklist, and setter rules applied to an immutable or event-sourced model manufacture false findings.
- **Phase 1:** create the report, run the mandatory high-signal grep patterns (hidden `validate()` overrides, leaked persistence/business logic, missing identity markers) BEFORE reading individual files, write every grep result immediately, categorize files (root/entity/VO/unknown).
- **Phase 2:** per-file checklist **A–P** — A–L (entity-vs-VO classification, base-class compliance, VO immutability/structural equality, anemic-model detection, domain invariants, invariant→property-TC Dual-Feedback, aggregate-by-ID, navigation serialization safety, domain events, query expressions, ubiquitous language, OOP) plus **M** invariant-vs-validation ownership + failure signalling, **N** construction-vs-reconstitution, **O** event dispatch timing/outbox/domain-vs-integration contract, **P** aggregate concurrency + transaction boundary — append findings per file, NEVER batch.
- **Phase 3 → 4:** holistic cross-entity synthesis in the current pass, including **3.1 model-level dimensions** (bounded-context sharing; subdomain fit — judge whether a rich model is warranted BEFORE reporting anemia), then final report with health score (`100 − (CRIT×25 + HIGH×10 + MED×3 + LOW×1)`); 10+ entity files → switch to parallel `code-reviewer` sub-agents automatically (never under `--report-only`).
- **Phase 5 (validation-first loop):** validate via `/why-review` gate before any fix, fix only validated findings that block the current round (the caller's fix step when a parent skill/workflow invoked this review, `/fix --target=review` when standalone), then restart the FULL review; Round 1 requires zero findings, while Round 2 requires zero CRITICAL/HIGH/MEDIUM and records LOW-only findings as deferred without another cycle. Every finding needs `file:line` at confidence >80%. Close with `AskUserQuestion` next-steps when standalone (under `--report-only`, a parent skill/workflow, or a sub-agent, return them in the summary).
- **`--report-only`:** read-only leaf mode for a caller that owns every fix — Phases 0–4 plus the Phase 5 validation gate only, no fix loop, no nested sub-agents, no `AskUserQuestion`, no writer beyond the report; return validated findings grouped Critical/High/Medium/Low; see [Report-Only Mode](#report-only-mode---report-only).

**Workflow:**

1. **Phase 0** — Discover project stack + entity/VO base classes + validation API + domain exception type + failure-signalling convention + concurrency mechanism + blast radius, then **0.4 detect modelling paradigm per aggregate** **(MANDATORY FIRST)**
2. **Phase 1** — Create report; run mandatory grep patterns BEFORE per-file reads; write results immediately; categorize files
3. **Phase 2** — Entity-by-entity DDD review (per-file checklist **A–P** + project-specific rules); append per file, never batch
4. **Phase 3** — Holistic cross-entity synthesis in the current pass, incl. **3.1 model-level dimensions** (bounded-context sharing, subdomain fit); fresh-context sub-agent only after validated fixes or explicit high-risk trigger
5. **Phase 4** — Final report: critical issues, health score, refactoring priority, recommendations
6. **Phase 5** — Why-Review self-validation gate (MANDATORY when findings exist) → validate → fix current-round blocking findings → restart full review until the severity bar is clear (Round 1: zero findings; Round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred) → `AskUserQuestion` next-steps (standalone only — see the [Next Steps](#next-steps) exemption)
7. **Scale rule** — 10+ entity files → parallel `code-reviewer` sub-agents, then consolidate (sequential under `--report-only`)

**Key Rules:**

- MUST ATTENTION discover project base classes in Phase 0 — NEVER assume generic patterns apply — why: wrong base classes = wrong checklist.
- MUST ATTENTION run mandatory grep patterns in Phase 1 BEFORE reading individual files — why: highest-signal violations surface fastest and seed the report.
- MUST ATTENTION validate findings via the Phase 5 `/why-review` gate before any fix, then restart the full review after validated fixes — a pass clearing the current severity bar ENDS the review (Round 1: zero findings; Round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred) — why: every fix invalidates the prior verdict and AI reports inherit confirmation bias.
- NEVER report a finding without `file:line` evidence at confidence >80% — why: unproven findings inflate severity downstream.
- MUST ATTENTION append findings per file and persist to `tmp/reports/` incrementally; 10+ entity files → parallel sub-agents — why: batched writes vanish on context/budget cutoff.
- MUST ATTENTION detect the modelling paradigm (0.4) before applying any setter/mutability rule, and judge subdomain fit (3.1) before reporting anemic model — NEVER flag a paradigm-appropriate or appropriately-simple design as a violation — why: uniform tactical DDD over CRUD is itself an anti-pattern, and rules written for mutable OO are meaningless against an immutable or event-sourced model.
- MUST ATTENTION treat invariant and validation as different questions with different owners (entity vs boundary), and keep failure signalling consistent with the Phase 0 convention — why: collapsing them buries UX checks in entities and parks business rules in bypassable validators.

**Severity Classification:**

| Severity | Action      | Definition                                                 |
| -------- | ----------- | ---------------------------------------------------------- |
| CRITICAL | Block merge | Silent runtime failure, data corruption, validation bypass |
| HIGH     | Must fix    | Incorrect behavior, invariant gap, architectural violation |
| MEDIUM   | Should fix  | Design debt, maintainability, likely future bug            |
| LOW      | Nice to fix | Convention, documentation, minor clarity                   |

## Report-Only Mode (`--report-only`)

> **Use when** a caller runs this skill as a read-only leaf — e.g. a workflow specialist parallel batch, a delegated domain-entity gate, or a review batch — and another step owns every fix. `--report-only` in `$ARGUMENTS` is an execution flag, not a mode (`changes`/`scan` still resolve per [Mode Detection](#mode-detection)); without it every phase below applies unchanged.
>
> 1. **Run Phases 0–4, then the Phase 5 Why-Review Self-Validation Gate only.** Phase 5 `/why-review --validate-findings` still validates every finding. The Phase 5 fix and full-review restart, the Phase 3 fresh-context `code-reviewer` spawn, and the Next Steps `AskUserQuestion` do not run: return the validated report; the caller owns fixes and any re-review. Contradictory Phase 2 evidence that would have triggered a fresh read is recorded under `Unresolved Questions` as `NOT VERIFIABLE`. — why: two writers of one artifact inside a barrier race each other.
> 2. **Resolve scope from the caller's brief — never ask.** Use the entity files, diff, or module the brief names (else the default `changes` scope) and record the mode and file set in the report. — why: a leaf cannot reach the user, so an "ask" branch would stall the caller's barrier.
> 3. **No nested fan-out.** Skip the Systematic Review Protocol (10+ entity files) and size-capped batching; review files sequentially in this context, still appending findings per file. — why: this skill is already a leaf of the caller's fan-out; a second level breaks the caller's barrier.
> 4. **Write only the report** under `tmp/reports/`. A missing or stale project-reference doc (including the domain-entities reference) is recorded in the report as a `NOT VERIFIABLE` assumption and returned — never a trigger to run `/scan`, `/project-init`, or any other writer. — why: a leaf that regenerates shared docs races its barrier siblings.
> 5. **Return** the report path, the health score, validated findings grouped Critical/High/Medium/Low per the mapping below, every unconfirmed material trade-off (the `SYNC:trade-off-interrogation-gate` non-asking handoff), and the next-step recommendations the Next Steps prompt would have offered.
>
> **Severity mapping.** This skill's native tiers are the shared `SYNC:severity-rubric` tiers, so they map 1:1: CRITICAL→Critical · HIGH→High · MEDIUM→Medium · LOW→Low, each still classified by consequence. The health score is an evidence input, never a tier; `Positive Observations`, informational notes, and `Unresolved Questions` are not findings; a finding without the evidence to choose a tier is `NOT VERIFIABLE` — it stays open, never Low.
>
> For this mode the declared step order ends at the Phase 5 validation gate; stopping there is the mode's contract, not a skipped step.

---

## Canonical Owner — Domain Entity Change Gate

> This skill is the **canonical owner** of `SYNC:domain-entity-change-gate`. `/plan`, `/plan-review`, and `/changes-review` inline that gate and route here for the full checklist, so a design planned under the gate is reviewed under the same rules. The gate's 6 decision points map to this skill as: classification → **A** · invariant ownership + failure signalling → **E/M** · aggregate boundary + concurrency → **F/P** · construction vs reconstitution → **N** · events → **H/O** · test obligation → **E2**; paradigm detection is **0.4** and subdomain fit is **3.1**.
>
> Do NOT apply the gate as a separate pass when running this skill — Phase 2 A–P **is** the gate, in full. Record `Gate is this skill's own body — A–P checklist owns it.` — why: a second pass over the same rules duplicates findings and inflates severity counts.
>
> Changing an entity rule here → update `.claude/skills/shared/sync-inline-versions.md` FIRST if the rule belongs to the gate's 6 decision points, then propagate to the three consumers. NEVER edit an inlined copy directly.

---

## First Principle — Easy to Change

> **Success metric of every coding decision = _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every technique serves one goal: **make next change cheaper**.

Evaluating code, refactor, test, abstraction — ask: **does this make next change cheaper or more expensive?**

- Reject "best practices" raising change cost (premature abstraction, speculative generality, leaky indirection, ceremony without payoff).
- Name real enemies in findings: **coupling, hidden state, duplicated knowledge, unclear intent, irreversible decisions exposed too early**.
- Simpler design easy to change beats sophisticated design that isn't.

Apply this lens **before** invoking any specific rule, pattern, or checklist below — if a downstream rule raises change cost, this principle wins.

---

## Phase 0: Project Discovery + Mode Detection + Blast Radius

> **MANDATORY FIRST STEP.** Phase 0 gates all other work — wrong base classes = wrong checklist.

**Create `TaskCreate` tasks for all phases NOW before doing anything else:**

- `[Phase 0] Project stack discovery + mode detection + blast radius` — in_progress **(FIRST)**
- `[Phase 1] Collect entity files + grep patterns + create report` — pending
- `[Phase 2] Entity-by-entity DDD review` — pending
- `[Phase 3] Holistic synthesis and fresh-context gate` — pending
- `[Phase 4] Generate final findings` — pending

### 0.1 Discover Project Stack and Entity Conventions

```bash
# Check for project reference docs
ls docs/project-reference/ 2>/dev/null   # default root; docsRoots.projectReference.path in docs/project-config.json overrides it
ls docs/ 2>/dev/null | grep -i "entity\|domain\|backend\|pattern"

# Detect configured build/runtime markers from project config and project-reference docs
rg --files | rg "(project|package|build|config|settings|manifest)" | head -20

# Find entity/VO base classes actually used
rg "class.*Entity|class.*RootEntity|class.*BaseEntity|class.*AbstractEntity" {configured-source-roots} | head -10
rg "ValueObject|Aggregate|Entity" {configured-source-roots} | head -20
rg "{configured-entity-markers}" {configured-source-roots} | head -10
```

**Record in report (required before Phase 2):**

| Convention              | Discovered Value                     |
| ----------------------- | ------------------------------------ |
| Entity base class(es)   | `{class names with file:line}`       |
| VO base class(es)       | `{class names with file:line}`       |
| Validation API          | `{how validation done}`              |
| Domain exception type   | `{exception class used}`             |
| Navigation/FK pattern   | `{annotation + FK property pattern}` |
| Persistence annotations | `{ORM annotations}`                  |
| Failure-signalling convention | `{throws domain exception \| returns Result/Either \| mixed}` |
| Concurrency mechanism   | `{version/rowversion/etag field on roots, or none}` |
| Modelling paradigm      | `{OO-mutable \| type-driven/immutable \| event-sourced}` (0.4) |

If project reference docs exist → read them and extract: service-specific base class requirements, documented anti-patterns, naming conventions, cross-service rules.

### 0.2 Determine Entity File Scope

Apply mode-appropriate command from Mode Detection table, adapted to discovered stack.

### 0.3 Blast Radius Analysis

```bash
# When .code-graph/graph.db exists
python .claude/scripts/code_graph trace <entity-file> --direction both --json --node-mode file
```

Record: entity file count, downstream consumers, risk level. Use to prioritize review order (highest-impact first).

### 0.4 Modelling Paradigm Detection (MUST ATTENTION — gates which per-file rules apply)

> Sections C/D/N assume a mutable OO entity. Applying them to an immutable or event-sourced model manufactures false findings — detect the paradigm BEFORE the checklist. — why: "no public setters" is a finding in OO code and meaningless in a model that has no setters by construction.

Detect from the domain source, NEVER assume:

| Paradigm | Detection signal | Checklist adaptation |
| -------- | ---------------- | -------------------- |
| **OO-mutable** (default) | Classes with private setters + state-changing methods | Full A–P checklist as written |
| **Type-driven / immutable** | Sealed hierarchies, discriminated unions, records-only, `With*()`/copy-returning methods, smart constructors returning `Result` | Section C immutability applies to entities too; Section D reads "no state-mutating method returns void"; illegal-state-representability replaces runtime guards — flag a status enum + nullable per-status fields as the union that was never made |
| **Event-sourced** | `apply`/`evolve`/`when` per event, `From(events)` / stream-fold reconstitution, no persisted state | Section C setter rules N/A; Section N reconstitution = the fold; Section O owns event-schema evolution; a CRUD-shaped event (`{Entity}Updated` with full payload) is a HIGH finding — it carries no business meaning |

- MUST ATTENTION record the detected paradigm in the report before Phase 2 and state which sections were adapted or marked N/A — why: an unrecorded adaptation reads as a skipped check.
- NEVER flag a paradigm-appropriate pattern as a violation of a rule written for another paradigm — verify against 0.4 first.
- Mixed paradigms per aggregate are legitimate (event-source one aggregate, not the system) — detect per aggregate, NEVER once per repo.

---

## Phase 1: Collect Files + Grep Patterns + Create Report

**Create report FIRST:** `tmp/reports/domain-entities-review-{date}-{slug}.md`

Initialize with: Mode, Tech Stack, Discovered Conventions, Blast Radius Summary.

### Mandatory Search Intent

MUST ATTENTION run high-signal searches BEFORE reading individual files. Derive the actual roots, file globs, framework markers, and naming conventions from `docs/project-config.json` plus the repository's project-reference docs. Do not copy a source-root, extension, framework type, or folder name from this skill as if it were canonical.

Search for these intent categories with the configured source roots and discovered stack syntax:

- Validation methods that hide or bypass the base/domain validation path.
- Relationship/navigation fields that can serialize recursively or expose internal graph structure.
- Value objects with mutable public state or missing structural equality.
- Domain methods throwing low-context generic errors instead of configured domain/validation errors.
- Business conditionals and entity mutation leaking into a higher layer when the entity/value object owns the invariant.
- Query/filter expressions placed in handlers/services when the entity, repository extension, specification, or equivalent local pattern owns them.
- Entity classes missing identity markers required by the configured persistence framework.
- Domain models performing direct persistence, network, or infrastructure work.

Representative searches — substitute the markers and source roots discovered from `docs/project-config.json` / project-reference docs (never hardcode the examples):

```bash
# Validation methods that hide or bypass the base/domain validation path
rg "{configured-validation-markers}" {configured-domain-source-roots} | head -20

# Persistence/query-filter expressions or infrastructure work leaked into domain models
rg "{configured-persistence-or-query-markers}" {configured-domain-source-roots} | head -20

# Business conditions / entity mutation leaked above the owning domain layer
rg "{configured-business-condition-patterns}" {configured-application-source-roots} | head -20

# Entity classes missing the identity markers required by the configured persistence framework
rg "{configured-identity-markers}" {configured-domain-source-roots} | head -20
```

Write ALL grep results to report IMMEDIATELY.

### Categorize Files

| Category       | Definition                                               |
| -------------- | -------------------------------------------------------- |
| Aggregate Root | Has dedicated repository; aggregate entry point          |
| Entity         | Has identity; accessed/persisted through root            |
| Value Object   | Structural equality; must be immutable                   |
| Unknown        | Plain class in domain layer without clear classification |

---

## Phase 2: Entity-by-Entity DDD Review

For EACH entity/VO file: read file → append findings to report IMMEDIATELY. NEVER batch.

### Per-File Review Checklist

#### A. Entity vs Value Object Classification (MUST ATTENTION)

> Entity = unique identity persisting across time. VO = defined by attributes, immutable, interchangeable when equal. NEVER swap roles.

- verify: does class need unique persistent identity? No → suspect VO misclassification.
- flag: "snapshot at point in time" (contact at referral, price at purchase, measurement at check-in) → MUST be VO, NEVER entity.
- CRITICAL if VO has primary key or repository → VO masquerading as entity.
- MEDIUM if entity has 3+ scalar fields always moving together → data clump → VO candidate.
- MEDIUM if entity is effectively stateless (no state changes after creation) → suspect VO.

#### B. Base Class Compliance (MUST ATTENTION)

> NEVER assume base class — ALWAYS use discovered values from Phase 0. Project docs override generic rules.

- verify aggregate root extends project's root entity base (from Phase 0 discovery).
- NEVER use root entity base for non-root child entities — child entities MUST NOT have their own repository.
- verify VOs extend project's VO base class — NEVER plain POCO/POJO in domain.
- verify audited entities extend audited base where audit trail required.
- cross-check each entity's base class against service/module-specific requirements from reference docs.

#### C. Value Object Immutability and Equality (MUST ATTENTION)

> Mutable VOs are a design contradiction — they imply identity through mutation, which entities have, not VOs.

- NEVER allow mutable public state on value objects. Use the immutability mechanism idiomatic to the configured language/runtime.
- Parameterless/default constructor allowed when required for framework deserialization.
- verify equality based on structural value — NEVER reference equality. Use the equality mechanism idiomatic to the configured language/runtime or the repository's documented value-object base pattern.
- verify `validate()` overridden when VO has constraints (format, range, required).
- verify factory method exists for non-trivial construction: `Create()`, `New()`, `Of()`, `From*()`.
- NEVER put async operations, repository calls, or infrastructure dependencies inside VO.
- Conversion/implicit operator defined when VO wraps single primitive.

#### D. Encapsulation and Anemic Domain Model (MUST ATTENTION)

> Anemic model = entity is data bag, all logic in handlers. Fix: move behavior to entity (lowest layer).

- verify entity has at least ONE domain method when it has business rules — NEVER pure property bag.
- NEVER allow direct property assignment for state transitions from outside entity — MUST use domain methods (`changeStatus()`, `approve()`, `assign()`).
- flag: same guard clause in 3+ handlers for same entity → extract to `ensureCan*()` on entity.
- flag: handler doing multi-field mutation (`entity.a=x; entity.b=y; entity.c=z`) without validation → domain method candidate.
- flag: business conditionals in application layer referencing single entity's state → move to entity guard.
- Entity behavior MUST be caller-agnostic — methods describe domain intent, NEVER reference who calls them.

**Detection signal:** `entity.property = value` assignments (non-audit) in application layer = anemic model signal.

#### E. Domain Invariants (MUST ATTENTION)

> Invariants enforced only in application layer = domain can reach invalid state via any other entry point.

- verify entity validates own invariants (via `validate()`, constructor guard, or factory) — NEVER handler-only enforcement.
- verify pre-operation guards as `ensureCan*()` / `validateCan*()` methods on entity.
- NEVER throw raw language exceptions for domain violations — MUST use project's domain exception type (discovered Phase 0): `ArgumentException`, `IllegalArgumentException`, `Error`, `ValueError` all WRONG.
- Invariants from creation MUST be enforced in factory method or constructor.
- CRITICAL: `validate()` MUST NOT be hidden by same-name method without calling `super` → silent validation dead zone.

**Detection signal:** Search for `validate()` override not calling `super.validate()` or framework base validation.

#### E2. Spec-Loop Discipline — Invariant → Property-TC Mapping (MUST ATTENTION)

> Every §5 invariant you verify is a property the spec should name and a test should guard universally — an enforced invariant with no property test is one refactor away from silent regression.

- verify each entity/VO invariant maps to a **universally-quantified property TC** (holds for ALL valid inputs) plus a **boundary counter-case** — NEVER accept a single happy-path example as coverage for an invariant.
- flag any invariant with no guarding property TC as a **Dual-Feedback finding**: the spec must NAME the invariant AND a test must GUARD it — blank either axis = INCOMPLETE, NEVER report a behavior-affecting invariant finding as code-only.
- review the whole package (spec + tests + entity code), not the entity diff alone; loop until zero new invariant→property-TC gaps remain — each cycle enriches the spec.

**Detection signal:** an invariant enforced in the entity (constructor/`validate()`/`ensureCan*()`) with no corresponding property TC in the spec's Section 8 or test suite → Dual-Feedback gap.

#### F. Aggregate Design (MUST ATTENTION)

> Aggregate = consistency boundary. All invariants must flow through root. Cross-aggregate coupling = transaction trap.

- NEVER give child entity its own repository — ONLY aggregate root has repository.
- NEVER reference another aggregate by object — MUST use ID only (`string productId` NOT `Product product`).
- NEVER expose mutable collection directly — aggregate root MUST use domain methods for collection mutations.
- verify composite-key entities implement project's composite ID pattern (discovered Phase 0).
- flag aggregates with >5 independent child entities with separate lifecycles → splitting candidate.
- Deletion of aggregate root MUST validate pre-conditions on children (orphan prevention).

#### G. Navigation / Relationship Properties

> Navigation properties serializing into each other = circular reference crash or infinite memory allocation.

- CRITICAL: ALL navigation/relationship properties that can serialize recursively MUST use the configured serialization-ignore mechanism or an explicit DTO/projection boundary.
- Navigation properties MUST be nullable/optional — not always loaded.
- FK ID MUST be stored as primitive alongside navigation — NEVER navigation-only reference.
- NEVER use navigation properties in domain logic without null guard.
- Prefer unidirectional navigation — bidirectional only when both directions actively used.

#### H. Domain Events

> Entity raises events → handlers react. NEVER inline side effects in entity domain methods.

- verify meaningful state changes raise domain events — NEVER tracked only by polling DB.
- Events MUST be raised INSIDE entity domain methods — NEVER from handlers/services.
- Side effects MUST go to event handlers — NEVER inline in entity domain method.
- Domain event naming: `{Entity}{Action}Event` or `{Entity}{PastTense}Event` (e.g., `OrderShippedEvent`).
- Entity domain methods MUST remain focused: raise event + update own state. Nothing else.

#### I. Static Query Expressions

> Query logic belongs on entity (lowest layer) — duplication in repos/handlers = wrong layer.

- verify reusable filter expressions defined as static methods on entity (or companion class) — NEVER duplicated in repos/handlers.
- Expression naming: descriptive static method (e.g., `isActive()`, `filteredByDepartment()`).
- NEVER duplicate expressions across multiple repository or handler files.
- Query expressions MUST have corresponding database indexes (verify in migration/schema files).

#### J. Naming and Ubiquitous Language

> Technical names break the domain model. Entity names ARE the project's vocabulary.

- NEVER use technical class name suffixes: `Manager`, `Helper`, `Processor`, `Util`, `Handler`, `Service`.
- Domain methods MUST use domain verbs: `approve()`, `reject()`, `assign()`, `changeStatus()` — NEVER `process()`, `handle()`, `execute()`.
- Boolean properties MUST use `is*`/`has*`/`can*` prefix: `isActive`, `hasPermission`, `canBeDeleted`.
- Status/type enums MUST be co-located with owning entity — NEVER in shared `Enums/` catch-all folder.
- Method parameters MUST use domain nouns — NEVER `data`, `model`, `obj`, `input`, `payload`.

#### K. Code Smells

| Smell                    | Detection Signal                            | Severity                         |
| ------------------------ | ------------------------------------------- | -------------------------------- |
| **Fat Entity**           | >500 lines with unrelated concerns          | MEDIUM — split by domain concept |
| **Feature Envy**         | Method uses 5+ properties of another entity | HIGH — wrong responsibility      |
| **Data Clump**           | 3+ primitives always together               | MEDIUM — VO candidate            |
| **Primitive Obsession**  | Raw `string` for email/phone/money/ID       | MEDIUM — domain type opportunity |
| **Leaky Abstraction**    | Entity exposes persistence internals        | HIGH                             |
| **Collection Exposure**  | Public mutable collection returned directly | HIGH — domain method needed      |
| **Constructor Overload** | 5+ params without factory method            | MEDIUM                           |

#### L. OOP Principles

- verify SRP: entity represents ONE domain concept — conflating two → flag for split.
- NEVER instantiate infrastructure inside entity (repositories, HTTP clients, loggers) — MUST receive as parameters.
- New behaviors MUST go via new event handlers — NEVER by modifying entity conditionals (Open/Closed).
- Capability traits added via focused interfaces — NEVER monolithic interface bundle (ISP).
- Entity subclasses MUST be substitutable for base — `base.method()` NEVER skipped in override (LSP).

#### M. Invariant vs Validation Ownership + Failure Signalling (MUST ATTENTION)

> Two different questions wearing one word. **Invariant** = "can this state legally exist?" — owned by the entity, failure is a bug. **Validation** = "is this input acceptable right now?" — owned by the application boundary, failure is a user error. Collapsing them produces both classic defects at once: form validation buried in entities, and business rules parked in a bypassable `Validator`.

**Think:** for each rule the entity enforces, ask who is allowed to violate it. A user typo → boundary validation. A code path reaching an impossible state → entity invariant.

- flag input-shape checks inside the entity (required-field, max-length, format-for-UX, localized messages) → MEDIUM, belongs at the boundary — why: the entity now changes when the form changes.
- flag a business rule living ONLY in a `*Validator` / `*Rules` / handler guard while the entity permits the state → HIGH invariant gap — why: every other entry point reaches invalid state.
- NEVER accept a database constraint or trigger as the invariant's enforcement — it is a backstop; the model must state the rule — why: an opaque SQL error is not a domain contract and cannot be unit-tested.
- MUST ATTENTION verify failure signalling matches the convention discovered in Phase 0 — mixed exception/`Result` for the SAME class of failure is a HIGH finding — why: callers cannot know which to handle, so one path goes unhandled.
- Expected business outcomes (insufficient funds, slot taken) returning `Result`, unreachable-state guards throwing → correct split; flag the inverse (throwing for expected outcomes in a hot path, or `Result` for a "cannot happen") as MEDIUM.
- flag mutations returning bare `bool` → MEDIUM: loses WHY and is trivially ignored.
- flag silent clamping of bad input (`if (qty < 0) qty = 0`) → HIGH — why: hides a caller bug and persists wrong data with no signal.

**Detection signal:** business rule text appearing in BOTH a validator/handler and the entity, or appearing ONLY outside the entity.

#### N. Construction vs Reconstitution (MUST ATTENTION)

> Creating a new entity runs business rules and raises events. Loading an existing one from storage MUST do neither. One constructor serving both makes creation rules unenforceable without breaking loading.

**Think:** trace both paths separately — `new` from a command, and materialization by the ORM/stream fold. Ask what each is allowed to run.

- MUST ATTENTION verify a distinct reconstitution path exists (private/protected ctor, ORM materialization hook, or `From(events)` fold) separate from the creation factory — why: without it, creation invariants must be weakened until loading passes.
- CRITICAL if the load path raises domain events — loading N entities emits N phantom events — why: downstream handlers fire for things that did not happen.
- flag creation rules re-run on load (clock checks, uniqueness calls, `startsOn >= today`) → HIGH: historical rows fail to load once the rule tightens.
- MUST ATTENTION verify required data sits in the constructor/factory and optional data in methods — an entity constructible without a value it cannot exist without is a HIGH invariant gap.
- flag public parameterless constructor + public setters as the creation path → CRITICAL anemic entry point (paradigm-adjusted per 0.4; framework-required non-public ctors are fine).
- flag 5+ positional constructor params → MEDIUM: group into VOs FIRST, consider a builder only after.
- NEVER flag a framework-mandated non-public parameterless constructor as a violation — verify the discovered persistence convention first.

**Detection signal:** one public constructor referenced by both the command handler and the ORM/mapping configuration.

#### O. Event Dispatch Timing + Contract Boundary (MUST ATTENTION)

> Section H owns event **raising**. This owns what happens **after** — when they dispatch, who may consume them, and how they evolve. Wrong timing silently couples an unrelated handler's failure to the core write.

**Think:** follow one raised event to its consumer and ask what happens if the consumer throws, if the transaction rolls back, and if the event is delivered twice.

- CRITICAL if events dispatch synchronously INSIDE the write transaction — a handler failure rolls back the business operation — why: an unrelated feature can now break the core write.
- CRITICAL if events publish to a broker BEFORE the transaction commits — you announced a fact that may never have happened; require the transactional outbox (events persisted in the SAME transaction, relayed after commit).
- MUST ATTENTION verify the event buffer is cleared after dispatch — an uncleared buffer republishes on the next save (MEDIUM–HIGH by blast radius).
- MUST ATTENTION verify internal domain events are distinct from published integration events — flag an internal event placed on the bus as HIGH — why: consumers become coupled to your model's internal shape, permanently, and it can no longer be refactored.
- flag fat events carrying the whole aggregate → MEDIUM: violates least privilege and blocks schema evolution. Events carry IDs + the minimal meaningful payload.
- flag events named as commands (`SendEmail`, `UpdateStock`) → MEDIUM: an event states what happened; command-naming re-couples producer to consumer.
- flag handlers with no idempotency guard where delivery is at-least-once → HIGH.
- Event-sourced projects (0.4): MUST ATTENTION verify a versioning/upcasting strategy exists — why: a past event can never be changed, only upcast, and the first schema change without a plan has no rollback.

**Detection signal:** dispatch/publish call inside the same transaction scope as the repository save, or an integration-event type imported from the domain assembly.

#### P. Aggregate Concurrency + Transaction Boundary (MUST ATTENTION)

> Section F owns aggregate *shape*. This owns what makes "one aggregate per transaction" actually safe under concurrent load.

**Think:** two users act on the same aggregate at the same instant — what stops the second write from silently discarding the first?

- MUST ATTENTION verify aggregate roots carry an optimistic-concurrency token (version/rowversion/etag) when the discovered persistence layer supports one — absence is HIGH on any contended or money/data-integrity path — why: last-write-wins silently discards a committed decision.
- NEVER accept a concurrency token on a CHILD entity as the aggregate's token — the version belongs to the ROOT, because a change anywhere inside the aggregate is a change to the aggregate.
- flag a single transaction mutating 2+ aggregate roots → HIGH: lock-ordering and deadlock risk, and it blocks later service extraction. Route the second change through a domain event.
- flag an aggregate whose parts are routinely written by different users concurrently → MEDIUM sizing finding: the boundary is too big and produces concurrency failures on unrelated work.
- MUST ATTENTION check invariants claimed to span aggregates (uniqueness across all instances, "max N active per tenant") — these cannot live inside one aggregate; verify the owning mechanism (DB constraint + domain service, or a reservation pattern) exists and is stated — why: a set-based invariant enforced by an in-memory check races under concurrency and passes every single-threaded test.

**Detection signal:** repository save of two roots inside one unit-of-work scope, or a root type with no version/timestamp concurrency member.

---

## Phase 3: Holistic Synthesis + Fresh-Context Gate

After all Phase 2 files are reviewed, synthesize cross-entity DDD concerns in the current report. Do not spawn a fresh sub-agent only because findings exist. Findings must go through the why-review validation gate before any fix.

### 3.1 Model-Level Dimensions (MUST ATTENTION — judged over the whole model, NEVER per file)

Two concerns are invisible file-by-file and only appear when the model is viewed whole. Run one focused pass each.

**Dimension 1 — Bounded-context sharing.** **Think:** does one entity class serve two different businesses?

- MUST ATTENTION flag a single entity class consumed by two contexts with divergent rules (a `Customer` used by Sales, Support, AND Billing) → HIGH — why: the class accretes every context's fields and rules, becomes the god entity nobody can change, and no context owns it.
- The same word meaning different things per context is CORRECT, NEVER a duplication to eliminate — flag an attempt to unify them as a MEDIUM finding against the unifier.
- MUST ATTENTION verify a translation boundary exists where contexts meet (anti-corruption layer, mapper, published contract) — direct cross-context entity reuse is HIGH.
- flag domain concepts leaking into a shared/generic/infrastructure layer (tenant/customer/product IDs, business rules in a "reusable" base) → HIGH — why: a layer coupled to one consumer's domain is no longer reusable.

**Dimension 2 — Subdomain fit.** **Think:** does this code deserve a rich domain model at all?

- MUST ATTENTION judge fit BEFORE reporting anemic-model findings: a rich entity is correct in a **core** subdomain (complex, differentiating, changes often); Active Record or Transaction Script is CORRECT in supporting/generic subdomains and in pure CRUD.
- NEVER report "anemic model" against code whose subdomain has no invariants beyond required-field — that is CRUD, and the finding is noise — why: uniform tactical DDD over CRUD is itself an anti-pattern, adding ceremony and indirection with no invariant to protect.
- flag the inverse too: a **core** subdomain implemented as Transaction Script with business rules scattered across handlers → HIGH, this is where the rich model was owed.
- flag generic subdomains modelled in-house (auth, billing, email, scheduling) → MEDIUM: buy or adopt, do not model.
- MUST ATTENTION state the subdomain judgment and its evidence in the report — an anemic-model finding without it is unproven — why: "anemic" and "appropriately simple" look identical in a diff.

Spawn a fresh `code-reviewer` sub-agent only when one of these conditions is true (never under `--report-only` — see [Report-Only Mode](#report-only-mode---report-only)):

- A validated-finding fix cycle has already changed the entity review target and this is the full re-review restart.
- The user/workflow explicitly requests an independent high-risk synthesis pass for broad entity-model changes.
- Phase 2 produced contradictory evidence that cannot be resolved in the current session without an independent read.

When a fresh-context pass is triggered, build the Agent call dynamically — set Target Files and Reference Docs from Phase 0/1 discoveries:

```
Agent({
  description: "Fresh full DDD entity review after validated fixes or explicit high-risk trigger",
  subagent_type: "code-reviewer",
  prompt: `
## Task
Review domain entity and value object files holistically for DDD design quality:
- Domain model coherence: entities vs VOs correctly classified across entire model?
- Aggregate boundary consistency across service/module?
- Anemic domain model: business logic consistently in entity or scattered in handlers?
- Navigation property hygiene across entire domain layer
- Ubiquitous language consistency across all entities
- Missed cross-entity interactions
- Bounded-context sharing: one entity class serving two contexts with divergent rules?
- Subdomain fit: does this model deserve rich entities, or is Active Record / Transaction Script correct here?
- Concurrency: do aggregate roots carry an optimistic-concurrency token? Any transaction mutating 2+ roots?
- Set-based invariants (uniqueness across all instances) — enforced by a real mechanism, or by a racy in-memory check?

## Review Mode
Fresh full review after a validated fix cycle or explicit high-risk trigger. ZERO memory of prior rounds. Re-read all target files from scratch via own tool calls.

## Protocols (follow VERBATIM)

### Evidence-Based Reasoning
Every claim needs proof. Cite file:line or grep results. Confidence: >80% act, 60-80% verify first, <60% DO NOT report.
NEVER write: "obviously", "I think", "should be", "probably".

### Project-Specific Discovery (MANDATORY before any finding)
1. Check the reference-docs root (default docs/project-reference/; docsRoots.projectReference.path in docs/project-config.json overrides) for entity reference docs, backend patterns, code review rules
2. grep -rn "class.*Entity\|class.*BaseEntity\|class.*RootEntity" <source-root>/ | head -10
3. grep -rn "ValueObject\|@ValueObject\|AbstractValueObject" <source-root>/ | head -10
4. Read discovered project reference docs — extract project-specific rules
5. NEVER flag violations contradicting discovered project conventions — verify against docs first

### Bug Detection for Domain Entities
Check every entity:
1. Null Safety: navigation properties guarded before use? Computed properties NPE-safe?
2. Boundary Conditions: empty collections in domain methods? Zero/negative invariants?
3. Error Handling: domain violations using project-specific exception type — NEVER raw language exceptions?
4. Aggregate Safety: child collections mutable bypassing domain methods?
5. Serialization Safety: navigation properties missing serialize-ignore annotation?

### DDD Design Patterns Quality
1. Entity = identity + lifecycle. VO = structural equality + immutable. NEVER swap roles.
2. Invariants enforced at entity level (lowest layer) — NEVER application layer only.
3. Aggregate: only root has repository; cross-aggregate = ID only; child mutations = domain method.
4. Domain events raised in entity — NEVER inline side effects in entity methods.
5. Anemic model: entity has no domain methods + handlers contain all logic → CRITICAL violation — BUT judge subdomain fit first: in a CRUD/supporting subdomain with no invariants, simple is CORRECT and "anemic" is a false finding.
6. Invariant vs validation: entity owns "can this state exist?"; the boundary owns "is this input acceptable?". A business rule living ONLY in a validator/handler = HIGH invariant gap. Input-shape/UX checks inside the entity = MEDIUM, wrong layer.
7. Failure signalling consistent with the project convention — mixed exception/`Result` for the same failure class = HIGH. NEVER raw language exceptions for domain violations.
8. Creation vs reconstitution are separate paths. Load path raising domain events = CRITICAL (N loaded entities emit N phantom events). Creation rules re-run on load = HIGH.
9. Event dispatch: synchronous in-transaction dispatch = CRITICAL (handler failure rolls back the business op); publish-before-commit = CRITICAL (announced a fact that may never have happened) — require the outbox. Internal domain events published as integration contracts = HIGH.
10. Concurrency: aggregate roots carry an optimistic-concurrency token (version on the ROOT, never on a child); a transaction mutating 2+ roots = HIGH.
11. Bounded contexts: one entity class shared across contexts with divergent rules = HIGH. The same word meaning different things per context is CORRECT — NEVER unify it.
12. Modelling paradigm: detect OO-mutable vs immutable/type-driven vs event-sourced BEFORE applying setter/mutability rules — NEVER flag a paradigm-appropriate pattern against a rule written for another paradigm.

### Fix-Layer Accountability
NEVER fix at crash site. Validation fails because handler skips entity validate()? → fix entity, not handler. Aggregate boundary violated? → fix entity relationship, not handler defensiveness.

### Graph-Assisted Investigation
When .code-graph/graph.db exists: run trace --direction both on 2-3 entity files.
CLI: python .claude/scripts/code_graph trace <file> --direction both --json --node-mode file

## Reference Docs
{insert docs discovered in Phase 0}
If none: read 3 existing entity files to infer project conventions before reviewing.

## Target Files
{insert entity/VO file list from Phase 1}

## Output
Write to tmp/reports/domain-entities-rerun{N}-{date}.md:
- Status: PASS | FAIL
- Critical Issues (file:line evidence)
- High Priority Issues (file:line evidence)
- Cross-cutting DDD concerns
- Aggregate model coherence assessment
- Refactoring priority

Return report path and status. Every finding MUST have file:line evidence.
`
})
```

After sub-agent returns:

1. Read the sub-agent report
2. Integrate as `## Re-Review {N} Findings` in main report — NEVER filter or override
3. If findings remain: validate the new finding set before any additional fixes
4. Repeat only after another validated-finding fix cycle; if the same blocker repeats across 2 full invocations with no progress, escalate via `AskUserQuestion`
5. Final verdict MUST incorporate every review pass that actually ran

---

## Phase 4: Final Report Generation

```markdown
## Domain Entities DDD Review — Final Report

**Mode:** {scan | changes}
**Tech Stack:** {discovered}
**Entity Base Classes:** {discovered from codebase}
**VO Base Classes:** {discovered from codebase}
**Scope / Date / Entity Count:** {values}

## Blast Radius Summary

Graph risk: {HIGH | MEDIUM | LOW | N/A} | Downstream consumers: {N}

## Health Score

{score}/100 — 100 - (CRITICAL×25 + HIGH×10 + MEDIUM×3 + LOW×1), min 0

## Critical Issues (block merge)

{severity} | {description} | {file:line} | {fix}

## High Priority Issues (must fix)

{severity} | {description} | {file:line} | {fix}

## Medium Issues (should fix)

{severity} | {description} | {file:line} | {fix}

## Low / Informational

{severity} | {description} | {file:line} | {fix}

## Re-Review Findings (if a fresh full re-review ran)

{integrated — not filtered}

## Positive Observations

{observation} | {evidence}

## Refactoring Priority (highest-impact first)

{priority} | {target} | {reason}

## Repository-Specific Rules Applied

{rule} | {evidence}

## Unresolved Questions

{question} | {owner/next step}
```

---

## Universal DDD Quick Reference

### Entity vs Value Object Decision Matrix

| Question                                      | YES →          | NO →             |
| --------------------------------------------- | -------------- | ---------------- |
| Needs unique persistent identity?             | Entity         | VO candidate     |
| Changes state after creation?                 | Entity         | VO candidate     |
| Snapshot at moment in time?                   | VO             | Entity candidate |
| Defined by attributes, not identity?          | VO             | Entity           |
| Two instances with same data interchangeable? | VO             | Entity           |
| Needs repository?                             | Aggregate Root | Entity or VO     |

### Invariant Enforcement Decision Table

| Location               | When to Use                                      |
| ---------------------- | ------------------------------------------------ |
| Constructor / Factory  | Invariants must hold from creation               |
| `validate()` override  | State invariants run before persistence          |
| `ensureCan*()` guard   | Operation preconditions (throw domain exception) |
| Before-delete hook     | Pre-delete constraints                           |
| Application layer ONLY | ← NEVER — always enforce in entity too           |

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

### Aggregate Boundary Rules

```
CORRECT — cross-aggregate by ID:
  Entity A { string EntityBId; EntityB? entityB; }  ← ID + optional navigation

WRONG — cross-aggregate by object:
  Entity A { EntityB entityB; }  ← object reference = implicit coupling

CORRECT — child mutation via domain method:
  order.addLine(product, quantity);

WRONG — direct collection mutation:
  order.lines.add(new OrderLine(product, quantity));
```

### Code Smell Signals

```
Fat Entity:    file > 500 lines, > 20 properties → split by domain concept
Feature Envy:  method accesses 5+ properties of another entity → move to that entity
Data Clump:    3+ primitives always travel together → extract as Value Object
Primitive Obs: string email, string userId, decimal price → wrap in domain type
Anemic Model:  entity has 0 domain methods + all logic in handlers → move logic down
```

---

## Systematic Review Protocol (10+ Entity Files)

> **NON-NEGOTIABLE:** 10+ entity files in scope → switch to parallel sub-agents automatically. Not run under `--report-only` — that mode reviews sequentially in this context.

1. announce: `"Detected {N} entity files. Switching to parallel DDD review protocol."`
2. Group by module/aggregate/type
3. Fire parallel `code-reviewer` sub-agents with `run_in_background: true` (one per group)
4. Each sub-agent: Phase 2 checklist + discovered project-specific rules → write to `tmp/reports/domain-entities-{group}-round1-{date}.md`
5. Main agent consolidates: cross-aggregate violations, naming consistency, model coherence

---

## Output Summary Format

```
Domain Entities DDD Review

Health Score: {N}/100

Critical Issues: (block merge)
- {issue}: file:line — description + fix

High Priority: (must fix)
- {issue}: file:line — description + fix

Medium Issues: (should fix)
Positive Observations:
Unresolved Questions:

Report: tmp/reports/domain-entities-review-{date}-{slug}.md
```

---

## Phase 5: Why-Review Self-Validation Gate (MANDATORY when findings exist)

> **Purpose:** Adversarial validation of own findings BEFORE handoff. Catches over-flagged Highs, false positives, and severity inflation at the source rather than letting them propagate downstream.

**Trigger:** Any finding produced (Critical, High, Medium, OR Low). Skip ONLY when the report's verdict is unconditional PASS with literally zero findings.

**Protocol:**

1. Read own finalized report from `tmp/reports/{skill}-{date}-{slug}.md`
2. Invoke `/why-review` skill with arg: `validate findings in tmp/reports/{skill}-{date}-{slug}.md — verify each finding has file:line proof, steel-man each rejected interpretation, and stress-test severity classifications`
3. Read the validation verdict path returned by why-review, expected as `tmp/reports/why-review-validate-{date}.md`
4. **If why-review demotes/removes any finding:** UPDATE own finalized report with revised severities, remove false positives, and add a `## Why-Review Validation Notes` section citing what changed and why
5. **If why-review confirms all findings:** Append `## Why-Review Validation` line to own report stating "All N findings re-validated against actual code; no severity changes."

**Skip conditions (record explicit reason if skipping):**

- Verdict is unconditional PASS with zero findings → log "Skipped — no findings to validate"
- Why-review skill itself is the active context (avoid recursion)

**Why this exists:** AI sub-agent reports inherit confirmation bias — the orchestrator absorbs severity claims as ground truth. The 2026-05-09 review incident produced 5 Highs; adversarial validation demoted 3 of them. Codify this as standard practice.

---

## Next Steps

MUST ATTENTION when standalone, use `AskUserQuestion` after completing to present:

- **`/fix` (Recommended if FAIL)** — Fix validated findings that block the current round (Round 1: all severities; Round 2: CRITICAL/HIGH/MEDIUM; LOW-only is deferred)
- **`/scan --target=domain-entities`** — Update domain-entities-reference.md (scan mode)
- **`/integration-test`** — Add integration tests for newly-enforced invariants
- **`/docs-update`** — Update feature docs if entity contracts changed
- **"Skip, continue manually"** — user decides

**Exempt** under `--report-only`, when a parent skill or workflow invoked this review, or when running as a sub-agent: do NOT ask — return these next-step recommendations in the returned summary and let the caller decide; the caller's fix step owns any fix. — why: `AskUserQuestion` cannot reach the user from a sub-agent, and a leaf that waits on a prompt stalls its parent's all-return barrier.

---

> **[IMPORTANT]** `TaskCreate` for ALL phases BEFORE starting. Mark each completed immediately.

> **CRITICAL RULES** — (1) MUST ATTENTION run Phase 0 project discovery FIRST — discovered conventions override ALL generic rules. (2) Validate findings before fixes; after validated fixes, restart a full review before declaring PASS. The current severity bar ends the review: Round 1 requires zero findings; Round 2 requires zero CRITICAL/HIGH/MEDIUM, with LOW-only findings deferred. (3) NEVER report a finding without `file:line` evidence.

---

**Prerequisites — MUST ATTENTION discover project-specific rules FIRST:**

> Read the reference-docs root (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — entity reference, backend patterns, code review rules — and `CLAUDE.md`. Find entity/VO base classes, validation API, domain exception type, persistence annotations. Infer from 3+ existing entity files if no docs exist. NEVER apply generic rules that contradict discovered project conventions.

> **Evidence Gate:** Every finding requires `file:line` proof or grep result. Confidence >80% → report. <60% → state uncertainty explicitly.

---

## Mode Detection

**Determine mode BEFORE any other work:**

| Invocation                              | Mode             | Scope                                           |
| --------------------------------------- | ---------------- | ----------------------------------------------- |
| `/domain-entities-review` (default)     | **changes**      | Changed domain entity files from `git diff`     |
| `/domain-entities-review changes`       | **changes**      | Changed domain entity files                     |
| `/domain-entities-review scan`          | **scan**         | All entity/VO files in domain layer directories |
| `/domain-entities-review scan <module>` | **scan-service** | Entities in named module only                   |

**Entity file detection — adapt to discovered stack:**

```bash
git diff --name-only HEAD
rg --files {configured-source-roots}
```

Filter those results using the entity/value-object/aggregate naming conventions discovered from project config and project-reference docs. Never hardcode source roots, extensions, or framework folder names from this skill.

If no domain entity files match in changes mode → announce "No domain entity changes detected" and report clean.

---

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `category-review-thinking` — Derive review concerns per category of changed files from domain knowledge; reviewing a changeset that spans several file categories → .claude/skills/shared/protocols/category-review-thinking.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `double-round-trip-review` — Validated-finding fix loop: review, validate, fix, then a fresh full re-review, capped at two rounds; running a review that fixes findings and must re-review until the severity bar clears → .claude/skills/shared/protocols/double-round-trip-review.md
- `fresh-context-review` — Restart the full review in isolated sub-agents after fixes to avoid confirmation bias; re-reviewing after a fix cycle → .claude/skills/shared/protocols/fresh-context-review.md
- `goal-contract-satisfaction-loop` — Save the goal in a file and loop until every saved criterion passes; executing work against a user goal → .claude/skills/shared/protocols/goal-contract-satisfaction-loop.md
- `graph-assisted-investigation` — Run a code-graph command on the key files before concluding; investigating code while the code graph exists → .claude/skills/shared/protocols/graph-assisted-investigation.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `review-principle-awareness` — Classify the change context first, then apply the current principles that fit it; starting any review → .claude/skills/shared/protocols/review-principle-awareness.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md
- `systematic-review-batching` — Map-reduce review: size-capped batches, one sub-agent per batch, then reduce; reviewing a large changeset → .claude/skills/shared/protocols/systematic-review-batching.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `trade-off-interrogation-gate` — Three trade-off questions before any verdict, score or recommendation; rendering a verdict or recommending an option → .claude/skills/shared/protocols/trade-off-interrogation-gate.md
- `understand-code-first` — Read and trace the target and existing patterns before changing code; planning or editing code → .claude/skills/shared/protocols/understand-code-first.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code/conventions BEFORE any modification or explanation. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files before concluding when graph.db exists. Pattern: grep → graph trace → grep verify.

<!-- /SYNC:graph-assisted-investigation:reminder -->

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

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Detect DDD design quality violations in domain entities and value objects across any technology stack — adapting to project-specific patterns via config/reference docs discovery — so domain entities and value objects preserve invariants, aggregate boundaries, and discovered DDD conventions.

**IMPORTANT MUST ATTENTION** follow the declared path: Phase 0 discover conventions, paradigm, and blast radius → Phase 1 create the report, run mandatory greps, and categorize files → Phase 2 review each entity/VO with checklist A–P and append findings → Phase 3 synthesize holistic model concerns and subdomain fit → Phase 4 produce the final report and health score → Phase 5 validate findings, fix only current-round blocking findings, and restart the full review until the severity bar is clear (Round 1: zero findings; Round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred) → ask next steps when standalone; scale 10+ entity files through parallel batches and consolidation. Under `--report-only` the path ends at the Phase 5 validation gate with no fix, fan-out, or question.

**Protocols in force — MUST ATTENTION (concise digest of the SYNC/shared blocks this skill carries):**

- **Source/Test Drift Check:** Source behavior change → inspect and reconcile affected tests.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** Workflow parent row NEVER replaces child phase tracking.
- **Project Reference Docs Guide:** Read required project-reference docs (incl. `lessons.md`) before target work.
- **Task Tracking & External Report:** Bootstrap tasks; persist review findings to `tmp/reports/` incrementally.
- **Critical Thinking Mindset:** Traced `file:line` proof per claim; confidence >80% to act.
- **Understand Code First:** Discover conventions and grep 3+ patterns before applying checklist.
- **Graph-Assisted Investigation:** Run a graph trace on key entity files when graph.db exists.
- **Double Round-Trip Review:** Validate findings, fix only current-round blocking findings, restart full re-review, and end when the round severity bar is clear (Round 1: zero findings; Round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred; binary gates always block).
- **Fresh Context Review:** Spawn fresh zero-memory sub-agent only after a validated-fix cycle.
- **Systematic Review Batching:** 10+ files → size-capped parallel batches, then reduce.
- **Severity Rubric:** Classify by consequence using `SYNC:severity-rubric`; round 1 blocks on every validated finding, round 2 blocks only CRITICAL/HIGH/MEDIUM, LOW is recorded/deferred, and failed binary gates always block.
- **Category Review Thinking:** Derive each category's concerns from first principles — NEVER a fixed checklist.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**Top-3 (primacy-recency — these 3 are also at file top):**

- **MANDATORY MUST ATTENTION** Phase 0 project discovery FIRST — discovered base classes / validation API / domain exception type override ALL generic rules. NEVER apply generic DDD patterns without verifying the project's real entity/VO base classes — why: wrong base classes = wrong checklist, every downstream finding is then noise.
- **MANDATORY MUST ATTENTION** NEVER report any finding without `file:line` evidence — confidence >80% to report, 60-80% verify first, <60% DO NOT recommend — why: AI sub-agent reports inherit confirmation bias; unproven findings inflate severity downstream.
- **MANDATORY MUST ATTENTION** validate findings before fixing (Phase 5 why-review gate); after validated fixes restart the FULL review before declaring PASS — a pass clearing the current severity bar ends the review (Round 1: zero findings; Round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred) — why: every fix invalidates the prior verdict.

**Evidence + process gates:**

- **MANDATORY MUST ATTENTION** run mandatory Phase 1 grep patterns (hidden `validate()` overrides, leaked persistence/business logic, missing identity markers) BEFORE reading individual files, and write EVERY grep result to the report immediately — why: highest-signal violations surface fastest and batched writes lose findings on context loss.
- **MANDATORY MUST ATTENTION** bootstrap `TaskCreate` for ALL phases before any work; mark one task `in_progress`, mark `completed` immediately after evidence; on context loss call `TaskList` first — never duplicate — why: phase tracking survives compaction, memory does not.
- **MANDATORY MUST ATTENTION** read project-reference docs (`lessons.md`, entity/backend/code-review references) + `CLAUDE.md` and search 3+ existing entity files BEFORE applying any checklist — discovered conventions win — why: local conventions differ from generic framework defaults.
- **MANDATORY MUST ATTENTION** evaluate pattern FIT before copying a nearby entity pattern — verify the new context shares the same base class, scope, and lifetime — why: closest example ≠ matching preconditions.
- **MANDATORY MUST ATTENTION** run a graph trace on key entity files when `.code-graph/graph.db` exists, and inspect entity callers/usages before classifying anemic model or misplaced invariant — why: code existing ≠ code executing; the bug owner is the layer the data flows through.
- **MANDATORY MUST ATTENTION** append findings per file — NEVER batch; persist to `tmp/reports/` incrementally and synthesize from disk — why: long sub-agents hit budget before a final batched write and lose everything.
- **MANDATORY MUST ATTENTION** `--report-only` declares Phases 0–4 plus the Phase 5 validation gate only — scope from the caller's brief, no fix, no restart, no nested sub-agent fan-out, no `AskUserQuestion`/Next Steps prompt, no writer beyond the report; return the report path plus validated findings grouped Critical/High/Medium/Low (native tiers map 1:1) — why: a read-only leaf that fixes, fans out, asks, or regenerates docs stalls or races its barrier siblings.

**Domain rules (this skill's invariants):**

- **MANDATORY MUST ATTENTION** NEVER throw raw language exceptions for domain violations — use the project's discovered domain exception type — why: generic exceptions lose domain context and bypass the invariant contract.
- **MANDATORY MUST ATTENTION** NEVER allow mutable public state or reference equality on Value Objects — structural immutability + structural equality are non-negotiable — why: a mutable VO implies identity-through-mutation, which is an entity, not a VO.
- **MANDATORY MUST ATTENTION** enforce invariants at the entity (lowest layer) via constructor/factory/`validate()`/`ensureCan*()` — NEVER application-layer-only — why: any other entry point can then reach an invalid domain state.
- **MANDATORY MUST ATTENTION** NEVER give a child entity its own repository and NEVER reference another aggregate by object — ID only — why: only the aggregate root owns its consistency boundary; object references create implicit transaction coupling.
- **MANDATORY MUST ATTENTION** map every verified §5 invariant to a universally-quantified property TC + boundary counter-case (Dual-Feedback) — spec NAMES it AND a test GUARDS it — why: an enforced invariant with no property test is one refactor from silent regression.
- **MANDATORY MUST ATTENTION** treat 2+ violations of the same kind as a structural/architectural finding, not isolated style notes — why: repeated leaks reveal a missing pattern, not individual slips.
- **MANDATORY MUST ATTENTION** classify by consequence not fix-effort using `SYNC:severity-rubric` (round 1 blocks every validated tier; round 2 blocks CRITICAL/HIGH/MEDIUM, LOW deferred; failed binary gates always block); 10+ entity files → switch to parallel `code-reviewer` sub-agents automatically — why: one "High" must mean the same everywhere, and serial review of many files exhausts context.
- **MANDATORY MUST ATTENTION** detect the modelling paradigm per aggregate (0.4) BEFORE applying any setter/mutability/reconstitution rule, and record which sections were adapted or marked N/A — NEVER flag a paradigm-appropriate pattern against a rule written for another paradigm — why: "no public setters" is a real finding in OO code and meaningless in a model that has none by construction.
- **MANDATORY MUST ATTENTION** judge subdomain fit (3.1) BEFORE reporting anemic model, and state the judgment with evidence — a rich model is owed in a CORE subdomain and is ceremony in CRUD — why: "anemic" and "appropriately simple" look identical in a diff, and uniform tactical DDD over CRUD is itself an anti-pattern.
- **MANDATORY MUST ATTENTION** separate invariant (entity owns "can this state exist?") from validation (boundary owns "is this input acceptable?"); a business rule living ONLY in a validator/handler is a HIGH invariant gap, and input-shape/UX checks inside the entity are MEDIUM wrong-layer — NEVER accept a DB constraint or trigger as the invariant's enforcement, it is a backstop — why: any other entry point reaches invalid state, and an opaque SQL error is not a domain contract.
- **MANDATORY MUST ATTENTION** keep failure signalling consistent with the Phase 0 convention — mixed exception/`Result` for the SAME failure class is HIGH; NEVER silently clamp bad input or return bare `bool` from a mutation — why: callers cannot know which to handle, so one path goes unhandled, and clamping persists wrong data with no signal.
- **MANDATORY MUST ATTENTION** verify creation and reconstitution are separate paths — the load path raising domain events is CRITICAL (N loaded entities emit N phantom events) and creation rules re-run on load is HIGH — why: without a separate path, creation invariants must be weakened until historical rows load.
- **MANDATORY MUST ATTENTION** NEVER allow synchronous in-transaction event dispatch (a handler failure rolls back the business operation) or publish-before-commit (announces a fact that may never have happened) — require the transactional outbox, clear the buffer after dispatch, and keep internal domain events distinct from published integration contracts — why: unrelated features must not be able to break the core write, and a published internal event couples every consumer to your model's shape permanently.
- **MANDATORY MUST ATTENTION** verify aggregate roots carry an optimistic-concurrency token on the ROOT (never on a child), flag any transaction mutating 2+ roots, and verify set-based invariants (uniqueness across all instances) have a real enforcing mechanism — why: last-write-wins silently discards a committed decision, and an in-memory uniqueness check races under concurrency while passing every single-threaded test.
- **MANDATORY MUST ATTENTION** flag one entity class shared across bounded contexts with divergent rules as HIGH, and NEVER treat the same word meaning different things per context as duplication to unify — verify a translation boundary exists where contexts meet — why: a unified cross-context entity accretes every context's rules until nobody owns it.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using `TaskCreate`; add a final "Analyze AI mistakes & lessons learned" review task.

> **Closing reminder — Easy to Change is the success metric.** Every finding, test, refactor, and abstraction must answer one question: _does this make the next change cheaper or more expensive?_ If it doesn't reduce future change cost, reject it. Coupling, hidden state, duplicated knowledge, and unclear intent are the real enemies — call them out by name.

**Anti-Rationalization:**

| Evasion | Rebuttal |
| ------- | -------- |
| "Generic DDD rule fits, skip Phase 0" | Discovered base classes override generic rules — verify the project's real entity/VO base FIRST or every finding is noise. |
| "Finding is obvious, skip evidence" | No `file:line` proof = no finding. Confidence <60% → DO NOT recommend. |
| "Clean enough, skip the re-review after fixes" | Every fix invalidates the prior verdict — restart the full review until the current round's exit bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred). |
| "Looks anemic, flag it" | Inspect callers + base class first — pattern fit, not pattern resemblance, decides anemic vs. correct delegation. |
| "Invariant enforced in code, that's coverage" | Dual-Feedback: spec must NAME it AND a property TC must GUARD it — code-only is INCOMPLETE. |
| "Many entities, review them inline" | 10+ files → parallel sub-agents; persist per-file findings to `tmp/reports/` or they vanish on budget cutoff. |
| "No setters here, model is fine" | Detect the paradigm (0.4) first — an immutable or event-sourced model has no setters BY CONSTRUCTION; the absence proves nothing until you know which model you are reading. |
| "Entity has no methods → anemic" | Judge subdomain fit (3.1) first. CRUD/supporting subdomain with no invariants → simple IS correct; the finding is noise. |
| "Rule is enforced, location is style" | Location IS the rule. In a validator/handler it is bypassable by every other entry point — that is a HIGH invariant gap, not a preference. |
| "Events are raised correctly, done" | Raising is Section H. Section O owns WHEN they dispatch — in-transaction dispatch and publish-before-commit are CRITICAL regardless of how cleanly they were raised. |
| "Single-threaded tests pass, concurrency is fine" | A set-based invariant checked in memory passes every single-threaded test and races in production. Verify the enforcing mechanism, not the test result. |

**IMPORTANT MUST ATTENTION** Phase 0 discovery FIRST (base classes override generic rules) · NEVER report a finding without `file:line` evidence at confidence >80% · validate findings before fixing, then restart the full review — a clean pass ENDS it once the persisted `minRounds` is met.
