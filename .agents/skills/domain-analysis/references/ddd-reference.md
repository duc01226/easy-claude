# DDD Reference — domain-analysis

Read on demand by `domain-analysis` (SKILL.md → "DDD Reference") and by `--mode=review` (`references/mode-review.md` → Universal DDD Quick Reference: Entity vs Value Object, Aggregate Design, Anti-Patterns → Phase 2 A, B, C, F, K). Section → step map: Strategic Design → Steps 2, 4 · Entity vs Value Object, Entity Design, Aggregate Design, Repository Pattern → Step 3 · Domain Events → Step 5 · ERD Design → Step 6 · Anti-Patterns → Steps 3, 7.

## Contents

- [Strategic design](#ddd-reference-strategic-design)
- [Entity vs value object](#ddd-reference-entity-vs-value-object)
- [Entity design](#ddd-reference-entity-design)
- [Aggregate design](#ddd-reference-aggregate-design)
- [ERD design](#ddd-reference-erd-design)
- [Domain events](#ddd-reference-domain-events)
- [Repository pattern](#ddd-reference-repository-pattern)
- [Anti-patterns](#ddd-reference-anti-patterns-quick-reference)
- [Closing reminders](#closing-reminders)

## DDD Reference: Strategic Design

### Bounded Context Rules

| Signal | Action |
| --- | --- |
| Same term, different meaning across teams | Separate bounded contexts |
| Different data lifecycles for same concept | Separate contexts |
| Different invariants on same entity | Separate contexts |
| Team ownership conflict (Conway's Law) | Separate contexts |
| Shared DB table touched by two services | Extract shared kernel or introduce ACL |

**Ubiquitous Language Rules:**

- Every noun in codebase matches domain expert vocabulary exactly (not "User" when the domain says "Customer")
- Class/method/variable names reflect ubiquitous language — zero translation layers inside bounded context
- Developers say "we call it X but domain means Y" → model is wrong, fix it

### Context Map Pattern Decision Table

| Situation | Pattern |
| --- | --- |
| Two teams, joint success/failure, equal power | Partnership |
| Small shared code nucleus, joint governance acceptable | Shared Kernel |
| Downstream can influence upstream roadmap | Customer-Supplier |
| Downstream has no influence on upstream | Conformist |
| External/legacy system with hostile or polluting model | Anti-Corruption Layer (ACL) |
| One upstream, many downstream consumers | Open Host Service + Published Language |
| Integration cost exceeds integration value | Separate Ways |

**ACL — use when:** upstream is external, legacy, or third-party (Salesforce, SAP, Workday); upstream types NEVER cross ACL into domain model.

**Shared Kernel — avoid when:** teams cannot coordinate every change → use Customer-Supplier + Published Language.

## DDD Reference: Entity vs Value Object

### Decision Matrix

| Question | Entity | Value Object |
| --- | --- | --- |
| Has identity beyond its attributes? | YES | no |
| Can two instances with same data be distinct? | YES | no |
| Has a lifecycle (created, modified, deleted)? | YES | no |
| Identified by an ID in any downstream system? | YES | no |
| Measured or described (quantity, address, money)? | no | YES |
| Replaced rather than modified on change? | no | YES |
| Must be found independently of parent? | YES | no |

**Fast test:** Equal-valued copies interchangeable → VO; tracked across time or fetched independently by ID → Entity. Parent-only retrieval suggests a VO.

### Canonical Value Objects

| VO | Attributes | Key Invariants |
| --- | --- | --- |
| `Money` | amount: Decimal, currency: Currency | amount ≥ 0, valid ISO currency; Add/Subtract require same currency |
| `Email` | value: string | RFC 5322 format, normalized to lowercase |
| `Address` | street, city, country, postalCode | All fields non-empty; composed of Country + PostalCode VOs |
| `DateRange` | start: DateOnly, end: DateOnly | start ≤ end; operations: Contains, Overlaps, Duration |
| `PhoneNumber` | countryCode, number | E.164 format |
| `Percentage` | value: int | 0 ≤ value ≤ 100 |

### Primitive Obsession → Value Object Mapping

Use typed IDs and the VOs above for validated primitives or groups that travel together: amount/currency → Money; address fields → Address; start/end → DateRange. A primitive with validation or formatting rules signals a missing VO.

### Value Object Construction Pattern

VO self-validates invariants at construction via a factory; no public constructor may produce an invalid instance; immutable; equality-by-value. Base class and factory names below are illustrative; adapt to your language.

`Email.Of(raw)` validates before creating an immutable, value-equal VO; changing it replaces the instance.

**Rules:**

- No public constructor without validation — factory method (`Of()` / `Create()`) enforces invariants
- VOs can reference other VOs; VOs NEVER reference entities (lifecycle coupling)
- Mutation means replacement: `email = Email.Of(newValue)`, NEVER `email.Value = newValue`

### VO Persistence Strategies

| Strategy | When to Use | Trade-offs |
| --- | --- | --- |
| Owned types (EF Core) | VO maps to same table as owning entity | Simple, no FK, nullable columns possible |
| Embedded document store | VO stored as subdocument | Natural fit, no joins |
| JSON column | Complex VO, low query frequency on VO fields | Flexible, not queryable by parts |
| Serialized string | Simple VOs (Email, PostalCode) | Compact, unqueryable by parts |

**Rule:** VOs NEVER have own table with primary key — that makes them entities by infrastructure.

## DDD Reference: Entity Design

### Identity Strategies

| Strategy | When to Use | Trade-offs |
| --- | --- | --- |
| **ULID** (default) | New entities in distributed system | Sortable, URL-safe, monotonic, 128-bit |
| **UUID v4** | True randomness / security-sensitive IDs | Not sortable, fragmented indexes |
| **UUID v7** | Sortable UUID needed | Time-ordered, good index locality |
| **Natural key** | Domain guarantees permanent uniqueness (SSN, EAN) | Unstable — domain can change |
| **Surrogate int** | Legacy/single-DB sequences | No distributed generation |
| **Composite key** | Relationship/join table | Harder to reference from other aggregates |

**Rules:**

- Prefer ULID for new entities — sortable, no coordination overhead
- NEVER use email/username as PK — users change them
- Cross-service references use same ID type as the owning service

### Rich vs Anemic Domain Model

A rich model owns behavior and invariants: `order.Hold(reason)` replaces external checks and assignments. Public setters, data bags, and entity rules duplicated in services signal anemia. Review mode first checks whether the subdomain warrants rich modeling.

### Entity Invariant Enforcement

Rich entity guards its state: private constructor for ORM/persistence hydration, valid-creation factories, and intent-named mutation methods that reject invalid transitions and emit domain events. Base class, guard, and ID-generator names below are illustrative; adapt to your language.

`Order.Create(...)` validates required data; a private hydration path loads existing state. `order.Cancel(reason, date)` rejects invalid transitions, updates state and raises `OrderCancelled`.

### Entity Lifecycle State Machines

Document every permitted transition and intent-named method; reject unmodeled transitions through the project's domain failure convention. Example: Draft → Submitted → Approved/Rejected; Approved → Active → Suspended → Active, or Active → Archived.

Use status + transition methods for simple branching lifecycles, state classes for complex per-state behavior, and event sourcing for full audit/reconstruction. Adapt to the paradigm discovered by review mode.

### Domain Validation Layers

| Layer | What It Validates | Failure Signal (per stack) |
| --- | --- | --- |
| **Value Object** | Single-value format/range invariants | Construction failure (raised error or result type) |
| **Entity method** | Aggregate consistency rules, state transitions | Domain rule violation (e.g. `DomainException`) |
| **Application service** | Cross-aggregate rules, authorization, existence | Structured validation result (e.g. `ValidationResult` / problem-details payload) |
| **Infrastructure** | DB constraints (last resort, NEVER first line) | Persistence-layer error (last-resort constraint) |

**Decision rule:**

- Rule requires loading another aggregate? → Application service
- Rule needs only data within aggregate? → Entity method
- Rule concerns single value's format? → Value Object constructor

### Factory Methods on Entities

Use factories for domain creation logic, multiple paths, events or graph initialization: `Create` or a domain verb such as `Place`. Private hydration constructors serve persistence, not public creation.

### Temporal (Bi-Temporal) Entities

Two time axes: **valid time** (fact true in real world) + **transaction time** (recorded in system).

```
ProductPrice {
    validFrom: DateOnly     // valid time: price effective from
    validTo: DateOnly       // valid time: price effective until
    recordedAt: DateTime    // transaction time: when entered into system
}
```

Use when: regulatory compliance, retroactive corrections, "as-of" queries.

## DDD Reference: Aggregate Design

### Aggregate Boundary Rules

- Boundary = objects required for atomic invariants. Start with one entity; add members only for atomic root/member consistency. One transaction per aggregate operation; eventual consistency permits separate aggregates. >5 entities or frequent unrelated write conflicts prompts decomposition.
- Root owns all member invariants, creation/IDs, significant events and every mutation. Outside code holds no direct child references or mutable collection access.
- Cross-aggregate references are IDs, not object navigation (`CustomerId`, not `order.Customer.Name`). Load separately; cascade deletion through events/compensation. If multiple roots need one transaction, revisit boundaries.
- Check invariants before mutation and recompute derived state: `root.AddLineItem(...)` checks status/domain limits, then recomputes totals. The former example's limit of 50 is illustrative.
- Root + embedded VOs need no separate IDs/tables. Nested child entities require atomic invariants; smaller aggregates reduce transaction conflicts.

### When to Break Aggregate Rules (Pragmatic DDD)

Document technical debt and mitigation before exceptions: private owned collections for ORM limitations; embedded VO/owned data for one-query performance; temporary cross-aggregate FKs during legacy migration.

## DDD Reference: ERD Design

### Cardinality Types

| Cardinality | Mermaid | When to Use |
| --- | --- | --- |
| 1:1 | `\|o--o\|` | Same-table extension, optional sub-type, shared lifecycle |
| 1:N | `\|o--{` | Parent-child, one entity owns many dependent records |
| M:N | `}o--o{` | Peer relationship; ALWAYS use explicit join/association entity |

**M:N rule:** Attributes (date joined, role) → explicit named join entity.

**1:1 decision:** Same concept + optional attributes → same table; different concepts with independent lifecycles → separate tables with FK.

### Normalization Targets

Use 1NF (atomic values/no repeated groups), 2NF for composite keys (no partial dependency), and 3NF for OLTP writes (no transitive dependency). Use BCNF when 3NF still has anomalies (every determinant a candidate key). Denormalize read models/projections/OLAP only with documented justification.

### Identifying vs Non-Identifying Relationships

| Type | FK in Child PK? | Child Existence |
| --- | --- | --- |
| Identifying | YES (FK is part of PK) | Child cannot exist without parent (line item without order) |
| Non-identifying | NO (FK is separate column) | Child can exist independently (order without warehouse) |

**Mapping to DDD:** Identifying relationship → child entity inside parent aggregate. Non-identifying FK → likely separate aggregates.

### ERD for Microservices

- Each bounded context has its OWN ERD — NEVER cross-service entity arrows
- Cross-service references shown as `ExternalEntityId (string/ULID)` — ID only, no relationship line
- Shared data shown as replicated/synced data note, NEVER shared table
- Event-sourced aggregates: ERD shows current state projection, not event stream

### ERD Anti-Patterns

| Anti-Pattern | Problem | Fix |
| --- | --- | --- |
| God table (50+ columns) | Every feature adds more columns | Extract sub-entities, decompose by bounded context |
| Cross-service FK | Direct FK across microservice schemas | Replicate needed data, use events to sync |
| Polymorphic association | `entityType + entityId` columns | Separate tables per concrete type or JSON column |
| EAV (Entity-Attribute-Value) | Key-value rows replacing typed columns | JSON column or explicit schema with migration |
| Implicit M:N (two FK cols, no PK) | Hard to add relationship attributes | Explicit join table with surrogate PK |
| Nullable FK everywhere | Unclear cardinality | Separate optional relationship into explicit table |

### ERD to Aggregate Mapping

Identifying parent/child relationships and strong roots with weak dependents suggest owned children; non-identifying FKs suggest separate aggregates. M:N without extra fields connects separate aggregates by IDs/events; association attributes suggest a separate association aggregate.

## DDD Reference: Domain Events

### Event Naming Conventions

Use `{AggregateNoun}{PastTenseVerb}` for what happened: `OrderCancelled`, `OrderConfirmed`, `PaymentProcessed`, `SalaryBandUpdated`. Avoid command names (`CancelOrder`), generic changes (`OrderStatusChanged`), non-past-tense labels (`PaymentComplete`) and vague subjects (`SalaryChanged`).

### Event Payload Design Rules

| Decision | Rule |
| --- | --- |
| Minimal vs fat | **Minimal (default):** AggregateId + what changed. Consumer queries for rest if needed |
| Fat event | Accept when: round-trip cost high AND consumers known AND staleness acceptable |
| Required fields always | `AggregateId`, `OccurredOn` (UTC timestamp), `Version`, `CorrelationId` |
| No mutable references | Payload contains value copies, not object references |

### Domain Events vs Integration Events

| Dimension | Domain Event | Integration Event |
| --- | --- | --- |
| Scope | Within one bounded context | Across bounded contexts |
| Delivery | In-process, post-commit | Via configured message bus or event stream |
| Schema ownership | Domain owns, internal | Published Language contract |
| Versioning | Internal refactor freely | Versioned, backward-compatible |
| Failure handling | Transaction rollback | At-least-once delivery, idempotent consumer |

**Rule:** Domain event raised → in-process handlers fire → if cross-service needed, handler publishes integration event to message bus.

### Event Versioning Strategies

Choose additive-only fields (simple but grows payload), multiple explicit versions (clear; consumers support both), or upcasting on deserialization (transparent; more infrastructure). Optional additions are compatible; removals, renames and type changes break compatibility.

## DDD Reference: Repository Pattern

### Interface Design Principles

1. One repository per aggregate root — NEVER one for child entities
2. Domain language in methods — `GetConfirmedOrdersInWarehouse()` not `FindAll(e => e.Status == Active)`
3. Return domain objects — repositories return entities, not DTOs
4. No infrastructure concerns — no leaked query/ORM types or connection strings in the interface.
5. Async-first — methods return the configured runtime's async primitive.

### Repository vs DAO

A repository exposes domain language and returns entities/VOs for application/domain consumers while hiding persistence. A DAO exposes data operations and returns DTOs/raw data, often tied to infrastructure.

### Query Objects — When to Use Specification

Use when a rule repeats, needs a name/test, or needs composition. A specification is a reusable, composable, testable domain-owned query predicate. The expression-tree form below is illustrative; adapt to your language's predicate, query-builder, or specification-object equivalent.

A reusable named predicate such as `ByWarehouse(warehouseId)` combines warehouse identity and confirmed status; adapt to the stack’s query/specification mechanism.

**When NOT to use Specification:** Simple single-use predicate → inline lambda. Rule only used once → repository method directly.

## DDD Reference: Anti-Patterns Quick Reference

| Anti-Pattern | Detection Signal | Fix |
| --- | --- | --- |
| **Anemic domain model** | Services have entity-specific logic; entity has all public setters | Move logic to entity |
| **God aggregate** | Aggregate > 5 entities or 100+ ms load time | Extract sub-aggregates |
| **Leaky aggregate** | External code mutates child entities directly | Private setters + root mutation methods |
| **Primitive obsession** | 3+ primitives always travel together as group | Introduce Value Object |
| **Implicit concept** | Domain expert names it, code doesn't model it | Explicit class |
| **Feature envy** | Method uses more of B's data than A's | Move method to B |
| **Getter/setter entity** | All mutation via property assignment, no intent-named methods | Replace with `Cancel()`, `Approve()`, etc. |
| **Cross-aggregate loading** | Full aggregate loaded just to read one field | Pass scalar; resolve in app service |
| **Side effects in handler** | Command handler calls multiple services after save | Domain event + separate handlers |
| **Cross-service FK** | Database FK across microservice schemas | ID reference + event-driven sync |
| **Shared Kernel overuse** | Two teams, one shared model, constant coordination overhead | Split to Customer-Supplier |
| **Missing ACL** | External model types bleed into domain classes | ACL at integration boundary |

## Closing Reminders

Classify by identity and lifecycle; size aggregates by atomic invariants; protect mutation through the root. Use domain language, validated immutable VOs, ID-only cross-service references and explicit event contracts. Follow the entrypoint’s section-to-step routing and the project’s discovered conventions.
