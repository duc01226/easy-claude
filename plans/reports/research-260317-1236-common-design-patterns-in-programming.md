# Common Design Patterns in Programming — Comprehensive Research Report

**Date:** 2026-03-17
**Confidence:** 92% overall — major claims cross-validated across 2+ authoritative sources; emerging patterns (§10) at 80%
**Sources:** 42 collected via web search, 28 cited in report, 10 deep-dived (Tier 1: 5, Tier 2: 13, Tier 3: 10)

---

## Executive Summary

Design patterns are reusable solutions to recurring software design problems. Originally formalized in 1994 by the Gang of Four (GoF), the field now spans **8 major categories**: GoF Creational, GoF Structural, GoF Behavioral, Architectural, Enterprise/DDD, Concurrency, Functional, and Distributed/Cloud-Native patterns. This report catalogs **80+ patterns** across all categories with definitions, use cases, and modern relevance.

---

## Table of Contents

1. [GoF Creational Patterns (5)](#1-gof-creational-patterns)
2. [GoF Structural Patterns (7)](#2-gof-structural-patterns)
3. [GoF Behavioral Patterns (11)](#3-gof-behavioral-patterns)
4. [Architectural Patterns (10+)](#4-architectural-patterns)
5. [Enterprise & DDD Patterns (10+)](#5-enterprise--ddd-patterns)
6. [Concurrency Patterns (10+)](#6-concurrency-patterns)
7. [Functional Programming Patterns (8+)](#7-functional-programming-patterns)
8. [Distributed & Cloud-Native Patterns (10+)](#8-distributed--cloud-native-patterns)
9. [Anti-Patterns & Criticism](#9-anti-patterns--criticism)
10. [Modern & Emerging Patterns (2025-2026)](#10-modern--emerging-patterns)
11. [Sources](#11-sources)

---

## 1. GoF Creational Patterns

**Purpose:** Abstract object instantiation, making systems independent of how objects are created, composed, and represented. [1][2][3]

**Confidence: 98%** — unanimous across 5+ sources.

| #   | Pattern              | Problem It Solves                                                        | When to Use                                                                                                      |
| --- | -------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 1   | **Factory Method**   | Clients need to create objects without knowing concrete classes          | When a class can't anticipate the type of objects it needs to create; subclasses should decide                   |
| 2   | **Abstract Factory** | Creating families of related objects without specifying concrete classes | When system must be independent of how its products are created; families of products must be used together      |
| 3   | **Builder**          | Constructing complex objects step-by-step                                | When object construction involves many optional parameters; same process should create different representations |
| 4   | **Prototype**        | Creating new objects by cloning existing ones                            | When instantiation is expensive; objects differ only in state, not type                                          |
| 5   | **Singleton**        | Ensuring a class has exactly one instance with global access             | When exactly one instance is needed (config managers, connection pools, loggers)                                 |

### Key Relationships

- **Factory Method** is a specialization within a class; **Abstract Factory** creates families of objects
- **Builder** focuses on step-by-step construction; **Prototype** focuses on cloning
- **Singleton** is often used alongside Factory to ensure a single factory instance

---

## 2. GoF Structural Patterns

**Purpose:** Compose classes and objects into larger structures while keeping them flexible and efficient. [1][2][3]

**Confidence: 98%** — unanimous across 5+ sources.

| #   | Pattern       | Problem It Solves                                        | When to Use                                                                   |
| --- | ------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | **Adapter**   | Making incompatible interfaces work together             | Integrating legacy code or third-party libraries with different interfaces    |
| 2   | **Bridge**    | Decoupling abstraction from implementation               | When both abstraction and implementation need to vary independently           |
| 3   | **Composite** | Treating individual objects and compositions uniformly   | Tree structures (file systems, UI component hierarchies, org charts)          |
| 4   | **Decorator** | Adding responsibilities to objects dynamically           | When extension by subclassing is impractical; adding behavior at runtime      |
| 5   | **Facade**    | Providing a simplified interface to a complex subsystem  | Reducing coupling between clients and subsystem; simplifying API surface      |
| 6   | **Flyweight** | Sharing common state among many objects to reduce memory | Large numbers of similar objects (text characters, game particles, map tiles) |
| 7   | **Proxy**     | Controlling access to another object                     | Lazy initialization, access control, logging, caching, remote objects         |

### Key Relationships

- **Adapter** changes interface; **Decorator** adds behavior; **Proxy** controls access — all wrap objects but for different purposes
- **Composite** and **Decorator** both use recursive composition but with different intents
- **Facade** simplifies; **Adapter** translates — both can wrap subsystems

---

## 3. GoF Behavioral Patterns

**Purpose:** Define algorithms and responsibility assignment between objects, promoting loose coupling. [1][2][3]

**Confidence: 98%** — unanimous across 5+ sources.

| #   | Pattern                     | Problem It Solves                                                   | When to Use                                                                             |
| --- | --------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | **Chain of Responsibility** | Passing requests along a chain of handlers                          | Multiple handlers possible; handler determined at runtime (middleware, event pipelines) |
| 2   | **Command**                 | Encapsulating requests as objects                                   | Undo/redo, queuing, logging, transactional behavior                                     |
| 3   | **Interpreter**             | Defining a grammar representation and interpreter                   | DSLs, rule engines, expression evaluators, SQL parsers                                  |
| 4   | **Iterator**                | Sequential access to collection elements without exposing internals | Traversing any aggregate structure uniformly                                            |
| 5   | **Mediator**                | Centralizing complex communication between objects                  | Reducing direct dependencies between UI components; chat rooms; air traffic control     |
| 6   | **Memento**                 | Capturing and restoring object state                                | Undo mechanisms, save/load state, database transaction rollback                         |
| 7   | **Observer**                | Notifying multiple objects of state changes                         | Event systems, pub/sub, reactive UI updates, data binding                               |
| 8   | **State**                   | Changing object behavior when internal state changes                | Finite state machines, workflow engines, UI state management                            |
| 9   | **Strategy**                | Defining interchangeable algorithms                                 | Sorting algorithms, payment methods, compression strategies, validation rules           |
| 10  | **Template Method**         | Defining algorithm skeleton with customizable steps                 | Frameworks with hook methods; standardized processes with variable steps                |
| 11  | **Visitor**                 | Adding operations to object structures without modifying them       | Compilers (AST traversal), document export (PDF/HTML/XML), analytics                    |

### Key Relationships

- **Command** and **Memento** work together for undo/redo
- **Observer** and **Mediator** both manage communication — Observer is distributed, Mediator is centralized
- **Strategy** and **State** both change behavior — Strategy is chosen externally, State changes internally
- **Chain of Responsibility** and **Command** both decouple senders from receivers

---

## 4. Architectural Patterns

**Purpose:** Define the overall structure, component interaction, and responsibility separation of an entire system. [16][17][18]

**Confidence: 95%** — confirmed across 3+ authoritative sources.

### 4.1 Presentation Layer Patterns

| Pattern                         | Core Idea                                                  | Key Differentiator                                                         |
| ------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| **MVC** (Model-View-Controller) | Separates data, UI, and control logic                      | Controller mediates between Model and View; both can communicate           |
| **MVP** (Model-View-Presenter)  | Presenter handles all communication between Model and View | No direct Model-View communication; Presenter is the "middle-man"          |
| **MVVM** (Model-View-ViewModel) | ViewModel exposes data streams that View binds to          | Data binding eliminates manual UI updates; ViewModel has no View reference |
| **MVI** (Model-View-Intent)     | Unidirectional data flow: Intent → Model → View            | Immutable state, predictable state management (Redux-like)                 |

### 4.2 Application Architecture Patterns

| Pattern                                       | Core Idea                                                                            | Key Principle                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| **Hexagonal Architecture** (Ports & Adapters) | Separate application core from external tools via ports (specs) and adapters (impls) | Business logic has zero dependency on infrastructure; tools are interchangeable [16] |
| **Onion Architecture**                        | Concentric layers with dependencies directed inward                                  | Layers: UI → Application → Domain; domain is center [16]                             |
| **Clean Architecture** (Robert C. Martin)     | Dependency rule: source code dependencies point inward only                          | Entities → Use Cases → Interface Adapters → Frameworks & Drivers [16]                |
| **Layered Architecture** (N-Tier)             | Horizontal layers: Presentation → Business → Data                                    | Each layer depends only on the layer below it                                        |
| **Microservices**                             | Application as collection of small, independent services                             | Each service owns its data, deploys independently, communicates via APIs or messages |
| **Monolithic**                                | Single deployable unit containing all functionality                                  | Simpler to develop, test, and deploy for small applications                          |
| **Event-Driven Architecture**                 | Components communicate through events                                                | Loose coupling, high scalability, asynchronous processing                            |
| **Service-Oriented Architecture** (SOA)       | Services communicate via well-defined interfaces                                     | Enterprise integration, service reuse, protocol independence                         |
| **Serverless**                                | Functions-as-a-Service; no server management                                         | Pay-per-execution, auto-scaling, reduced ops overhead                                |
| **Pipe and Filter**                           | Data flows through a sequence of processing stages                                   | ETL pipelines, Unix pipes, streaming data processing                                 |

### Relationship Between Architectural Patterns

Per herbertograca.com [16]: "Hexagonal provides the outer structure; Onion organizes internal layers; DDD structures components; CQRS handles command/query separation; Clean Architecture guides principle application." These are **complementary, not competing**.

---

## 5. Enterprise & DDD Patterns

**Purpose:** Manage complexity in large business applications with rich domain logic. [12][13][14][15][16]

**Confidence: 95%** — confirmed via Microsoft Learn (Tier 1) + multiple Tier 2 sources.

### 5.1 Domain-Driven Design Patterns

| Pattern             | Definition                                                            | When to Use                                                                 |
| ------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Aggregate**       | Cluster of domain objects treated as a single unit with a root entity | Enforcing consistency boundaries within a bounded context                   |
| **Entity**          | Object with identity that persists across state changes               | Objects that need to be tracked over time (User, Order, Product)            |
| **Value Object**    | Immutable object defined by its attributes, not identity              | Money, DateRange, Address — equality by value, not reference                |
| **Domain Event**    | Record of something significant that happened in the domain           | Decoupling domain logic; audit trails; triggering side effects              |
| **Domain Service**  | Stateless operation that doesn't belong to any entity                 | Logic spanning multiple aggregates (e.g., transfer between accounts)        |
| **Bounded Context** | Explicit boundary within which a domain model applies                 | Separating models for different subdomains (Billing vs Shipping)            |
| **Repository**      | Mediates between domain and data mapping layers                       | Abstracting persistence; providing collection-like interface for aggregates |
| **Specification**   | Encapsulates a business rule as a composable, reusable object         | Complex queries, validation rules, selection criteria                       |

### 5.2 Data & Persistence Patterns

| Pattern                | Definition                                                                                     | When to Use                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **CQRS**               | Segregates read (Query) and write (Command) operations into separate models                    | High read-to-write ratio systems; complex domains; independent scaling needs [12] |
| **Event Sourcing**     | Stores state as a chronological series of events rather than current state                     | Full audit trail needed; temporal queries; rebuilding state from history [15]     |
| **Unit of Work**       | Maintains a list of objects affected by a business transaction and coordinates writing changes | Ensuring transactional consistency across multiple repository operations          |
| **Identity Map**       | Ensures each object is loaded only once per transaction                                        | Preventing duplicate objects in memory; maintaining object identity               |
| **Data Mapper**        | Maps between in-memory objects and database tables                                             | Decoupling domain model from database schema                                      |
| **Active Record**      | Object that wraps a database row, encapsulating data access                                    | Simple CRUD with 1:1 table-to-object mapping (Rails, Laravel)                     |
| **Table Data Gateway** | Object that acts as gateway to a database table                                                | Centralizing SQL for a table; thin data access layer                              |

### 5.3 CQRS Deep-Dive (from Microsoft Learn [12])

**Key Points:**

- Commands represent business tasks (e.g., "Book hotel room"), not low-level data updates
- Queries return DTOs with no domain logic
- Can use single data store (basic) or separate read/write stores (advanced)
- Benefits: independent scaling, optimized schemas, better security, separation of concerns
- Challenges: increased complexity, messaging issues, eventual consistency
- Often combined with Event Sourcing where event store = write model

**When NOT to use:** Simple domains, basic CRUD, no scaling asymmetry.

### 5.4 Saga Pattern Deep-Dive (from Microsoft Learn [14])

**Definition:** Manages distributed transactions as a sequence of local transactions with compensating transactions for rollback.

**Two approaches:**

- **Orchestration:** Central coordinator tells participants what to do. Better for complex workflows; avoids cyclic dependencies; introduces single point of failure.
- **Choreography:** Services react to events without central controller. Good for simple workflows; no single point of failure; harder to track as complexity grows.

**Key concepts:** Compensable transactions, pivot transactions (point of no return), retryable transactions (idempotent, after pivot).

---

## 6. Concurrency Patterns

**Purpose:** Address multithreading, parallelism, and asynchronous execution challenges. [19][20][21][22]

**Confidence: 85%** — confirmed across academic + practitioner sources. POSA2 source unavailable for deep-dive.

### 6.1 Core Concurrency Patterns

| Pattern                     | Problem It Solves                                         | How It Works                                                                        |
| --------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Producer-Consumer**       | Decoupling data production from consumption               | Shared buffer/queue between producers and consumers; enables different speeds [22]  |
| **Actor Model**             | Concurrent computation without shared state               | Actors communicate via async messages; each has private state; no locks needed [21] |
| **Active Object**           | Decoupling method execution from invocation               | Each object has its own thread of control; methods execute asynchronously [19]      |
| **Monitor Object**          | Synchronizing concurrent access to an object              | Object's methods are mutually exclusive; condition variables for waiting            |
| **Thread Pool**             | Reusing threads for multiple tasks                        | Pre-created threads pick up tasks from a queue; reduces thread creation overhead    |
| **Reactor**                 | Handling multiple service requests delivered concurrently | Single-threaded event loop dispatches to handlers (Node.js, Nginx)                  |
| **Proactor**                | Asynchronous I/O completion handling                      | OS handles async I/O; completion handler called when operation finishes             |
| **Half-Sync/Half-Async**    | Combining sync and async processing                       | Async layer for I/O, queue in middle, sync layer for processing [19]                |
| **Leader/Followers**        | Efficient thread demultiplexing                           | One leader thread waits for events; promotes a follower on event arrival [19]       |
| **Read-Write Lock**         | Allowing concurrent reads but exclusive writes            | Multiple readers or one writer at a time; optimizes read-heavy workloads            |
| **Thread-Specific Storage** | Per-thread data without passing parameters                | Thread-local variables; avoids synchronization for thread-specific state [19]       |
| **Barrier**                 | Synchronizing multiple threads at a point                 | All threads must reach barrier before any can proceed                               |
| **Future/Promise**          | Representing a value that will be available later         | Placeholder for async computation result; enables non-blocking composition          |
| **Fork-Join**               | Dividing work into subtasks and combining results         | Recursive decomposition; work stealing for load balancing                           |

### 6.2 Actor Model Deep-Dive [21]

- Actors are lightweight primitives (millions possible vs thousands of threads)
- Each actor: receives messages, creates new actors, sends messages, designates behavior for next message
- No shared state → no locks → no deadlocks
- Implementations: Erlang/OTP, Akka (JVM), Orleans (.NET), Pony

---

## 7. Functional Programming Patterns

**Purpose:** Manage computation, side effects, and composition in functional paradigms. [23][24][25]

**Confidence: 90%** — confirmed across Wikipedia + Software Patterns Lexicon + academic sources.

### 7.1 Core FP Patterns

| Pattern                   | Definition                                                                      | Key Operations                             | When to Use                                                             |
| ------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| **Functor**               | Type that can be mapped over                                                    | `map(f)` — apply function to wrapped value | Transforming values inside containers without unwrapping                |
| **Applicative Functor**   | Functor that can apply wrapped functions to wrapped values                      | `apply(wrappedFn)`                         | When both function and value are wrapped in context                     |
| **Monad**                 | Functor that supports chaining operations with context                          | `bind`/`flatMap`, `unit`/`return`          | Sequencing computations, managing side effects, error handling [24]     |
| **Higher-Order Function** | Function that takes/returns functions                                           | —                                          | Abstraction, callbacks, decorators, strategies                          |
| **Function Composition**  | Combining functions: output of one becomes input of next                        | `compose(f, g)` = `f(g(x))`                | Building complex transformations from simple functions                  |
| **Currying**              | Transforming multi-argument function into sequence of single-argument functions | `f(a, b)` → `f(a)(b)`                      | Partial application, creating specialized functions                     |
| **Partial Application**   | Fixing some arguments of a function, producing a function with fewer arguments  | `partial(f, a)` → `g(b)`                   | Creating specialized variants of general functions                      |
| **Lazy Evaluation**       | Deferring computation until result is needed                                    | —                                          | Infinite sequences, performance optimization, avoiding unnecessary work |

### 7.2 Common Monad Implementations [24]

| Monad             | Purpose                                         | Example Use                                   |
| ----------------- | ----------------------------------------------- | --------------------------------------------- |
| **Maybe/Option**  | Computations that may fail or return nothing    | Null-safe chaining: `user?.address?.city`     |
| **Either/Result** | Success or error with explicit error info       | Error handling without exceptions             |
| **IO**            | Encapsulates side effects                       | Pure functional I/O composition               |
| **List**          | Computations returning multiple values          | List comprehensions, flatMap over collections |
| **State**         | Computations that carry mutable state           | Stateful computations in pure functional code |
| **Reader**        | Computations dependent on shared environment    | Dependency injection in FP                    |
| **Writer**        | Computations that produce a log alongside value | Logging, audit trails in pure computations    |

### 7.3 Monad Laws [24]

1. **Left Identity:** `unit(x).bind(f) == f(x)`
2. **Right Identity:** `m.bind(unit) == m`
3. **Associativity:** `m.bind(f).bind(g) == m.bind(x => f(x).bind(g))`

### 7.4 Pattern Hierarchy

```
Functor (map) → Applicative Functor (apply) → Monad (bind/flatMap)
```

Each layer adds capabilities. Every Monad is an Applicative; every Applicative is a Functor. Not every Functor is a Monad.

---

## 8. Distributed & Cloud-Native Patterns

**Purpose:** Address reliability, consistency, and scalability in distributed systems. [14][31][38]

**Confidence: 92%** — confirmed via Microsoft Learn (Tier 1) + IBM + multiple practitioner sources.

### 8.1 Resilience Patterns

| Pattern             | Problem It Solves                             | How It Works                                                                                         |
| ------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Circuit Breaker** | Cascading failures from failing services      | Monitors failure rate; "opens circuit" to block requests when threshold exceeded; auto-recovers [31] |
| **Bulkhead**        | Failure in one component affecting others     | Isolates resource pools (threads, connections) per service/function [31]                             |
| **Retry**           | Transient failures in distributed calls       | Retries failed operations with backoff strategy (exponential, jitter)                                |
| **Timeout**         | Indefinite waiting for unresponsive services  | Sets maximum wait time; fails fast when exceeded                                                     |
| **Fallback**        | Primary service unavailable                   | Provides alternative response (cached data, default value, degraded experience) [31]                 |
| **Rate Limiter**    | Overwhelming a service with too many requests | Controls request rate; queues or rejects excess requests                                             |

### 8.2 Data Consistency Patterns

| Pattern                  | Problem It Solves                            | How It Works                                                              |
| ------------------------ | -------------------------------------------- | ------------------------------------------------------------------------- |
| **Saga**                 | Distributed transactions across services     | Sequence of local transactions with compensating actions [14]             |
| **Event Sourcing**       | Maintaining full history of state changes    | Stores events, not current state; replay to rebuild [15]                  |
| **Outbox Pattern**       | Reliable event publishing with DB updates    | Write event to outbox table in same transaction; publish asynchronously   |
| **Two-Phase Commit**     | Atomic distributed transactions              | Coordinator asks participants to prepare, then commit — blocking protocol |
| **Eventual Consistency** | Synchronizing data across distributed stores | Accepts temporary inconsistency; converges over time                      |

### 8.3 Structural Patterns

| Pattern                        | Problem It Solves                                     | How It Works                                                                |
| ------------------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------- |
| **API Gateway**                | Single entry point for microservices                  | Routes, aggregates, and transforms requests; handles cross-cutting concerns |
| **Service Mesh**               | Managing service-to-service communication             | Sidecar proxies handle discovery, load balancing, encryption, observability |
| **Sidecar**                    | Adding capabilities to a service without modifying it | Co-deployed helper process (logging, monitoring, networking)                |
| **Strangler Fig**              | Migrating from monolith to microservices              | Gradually replace monolith components; route traffic to new services        |
| **Backend for Frontend** (BFF) | Different API needs per client type                   | Separate backend per client (mobile, web, IoT)                              |
| **Ambassador**                 | Offloading cross-cutting concerns from services       | Proxy that handles retries, monitoring, routing on behalf of services       |

### 8.4 Messaging Patterns

| Pattern                 | Problem It Solves                         | How It Works                                                             |
| ----------------------- | ----------------------------------------- | ------------------------------------------------------------------------ |
| **Publish-Subscribe**   | Broadcasting events to multiple consumers | Publisher sends to topic; all subscribers receive independently          |
| **Message Queue**       | Decoupling producer from consumer         | Messages stored in queue; consumed by one consumer (competing consumers) |
| **Dead Letter Queue**   | Handling messages that can't be processed | Failed messages routed to separate queue for investigation               |
| **Idempotent Consumer** | Duplicate message delivery                | Consumer handles same message multiple times without side effects        |

---

## 9. Anti-Patterns & Criticism

**Confidence: 90%** — confirmed across refactoring.guru [26] + multiple practitioner sources [27][28].

### 9.1 Criticisms of Design Patterns [26]

| Criticism                      | Argument                                                                                        | Counterpoint                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Kludges for weak languages** | Patterns compensate for missing language features (e.g., Strategy = lambda in modern languages) | Valid for some patterns; but many patterns address design concerns beyond language features |
| **Inefficient solutions**      | Dogmatic application without contextual adaptation                                              | Misuse issue, not pattern methodology flaw                                                  |
| **Unjustified use**            | "If all you have is a hammer, everything looks like a nail" — novices overapply patterns        | Learning curve issue; experience teaches appropriate application                            |

**Consensus:** Criticisms target **misuse** of patterns, not inherent problems with the methodology itself.

### 9.2 Common Anti-Patterns [28][40]

| Anti-Pattern               | Description                                           | Why It's Harmful                                               |
| -------------------------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| **God Object**             | Class that knows/does too much                        | Violates SRP; impossible to test, maintain, or extend          |
| **Golden Hammer**          | Using familiar solution for every problem             | Leads to suboptimal solutions; ignores better alternatives     |
| **Spaghetti Code**         | Tangled, unstructured code with no clear architecture | Unmaintainable, fragile, impossible to onboard new developers  |
| **Lava Flow**              | Dead code that nobody dares to remove                 | Accumulates confusion; wastes resources; hides real logic      |
| **Singleton Overuse**      | Using Singleton for everything                        | Hides dependencies, breaks testability, creates tight coupling |
| **Premature Optimization** | Optimizing before understanding bottlenecks           | Increases complexity; often optimizes the wrong thing          |
| **Copy-Paste Programming** | Duplicating code instead of abstracting               | DRY violation; bugs must be fixed in multiple places           |
| **Boat Anchor**            | Keeping unused code "just in case"                    | Bloats codebase; confuses developers; maintenance burden       |
| **Magic Numbers/Strings**  | Hard-coded values without explanation                 | Reduces readability; makes changes error-prone                 |
| **Circular Dependency**    | Two or more modules depending on each other           | Prevents independent deployment, testing, and understanding    |

---

## 10. Modern & Emerging Patterns (2025-2026)

**Confidence: 80%** — newer patterns with fewer cross-validating sources.

### 10.1 AI/Agentic Patterns [37]

| Pattern                       | Description                                                   |
| ----------------------------- | ------------------------------------------------------------- |
| **Reflection**                | Agent evaluates and improves its own output                   |
| **Tool Use**                  | Agent invokes external tools/APIs to accomplish tasks         |
| **Planning**                  | Agent decomposes goals into steps before executing            |
| **Multi-Agent Collaboration** | Multiple specialized agents coordinate                        |
| **Orchestrator-Worker**       | Central agent delegates to specialized workers                |
| **Evaluator-Optimizer**       | Separate evaluation from generation for iterative improvement |

### 10.2 Evolving Classical Patterns

- GoF patterns remain foundational but are increasingly **absorbed by language features** (lambdas replace Strategy, async/await replaces some Observer)
- **Reactive patterns** (Observable streams, backpressure) are mainstream via RxJS, Reactor, Akka Streams
- **Infrastructure patterns** (sidecar, service mesh) now handled by platforms (Istio, Linkerd) rather than application code
- Safety-critical industries (automotive, aerospace) adapting patterns for **deterministic behavior, bounded execution time, and formal verification** [34]

---

## 11. Sources

| #   | Title                                                       | URL                                                                                                                                                | Tier | Used In |
| --- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------- |
| 1   | The Catalog of Design Patterns — Refactoring.Guru           | https://refactoring.guru/design-patterns/catalog                                                                                                   | 2    | §1-3    |
| 2   | GoF Design Patterns — DigitalOcean                          | https://www.digitalocean.com/community/tutorials/gangs-of-four-gof-design-patterns                                                                 | 2    | §1-3    |
| 3   | GoF Design Patterns — GeeksforGeeks                         | https://www.geeksforgeeks.org/system-design/gang-of-four-gof-design-patterns/                                                                      | 3    | §1-3    |
| 4   | Design Patterns — sourcemaking.com                          | https://sourcemaking.com/design_patterns                                                                                                           | 2    | §1-3    |
| 5   | Classification of Patterns — Refactoring.Guru               | https://refactoring.guru/design-patterns/classification                                                                                            | 2    | §1-3    |
| 12  | CQRS Pattern — Microsoft Learn                              | https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs                                                                                 | 1    | §5      |
| 13  | Applying CQRS and DDD — Microsoft Learn                     | https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/apply-simplified-microservice-cqrs-ddd-patterns | 1    | §5      |
| 14  | Saga Pattern — Microsoft Learn                              | https://learn.microsoft.com/en-us/azure/architecture/patterns/saga                                                                                 | 1    | §5, §8  |
| 15  | Event Sourcing — microservices.io                           | https://microservices.io/patterns/data/event-sourcing.html                                                                                         | 2    | §5, §8  |
| 16  | DDD + Hexagonal + Clean + CQRS — herbertograca.com          | https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/                            | 3    | §4, §5  |
| 17  | Architectural Patterns in Go — norbix.dev                   | https://norbix.dev/posts/architectural-patterns/                                                                                                   | 3    | §4      |
| 18  | Architecture Patterns: MVC, MVP, MVVM — DEV                 | https://dev.to/chiragagg5k/architecture-patterns-for-beginners-mvc-mvp-and-mvvm-2pe7                                                               | 3    | §4      |
| 19  | POSA2 Concurrency Patterns — Vanderbilt                     | https://www.dre.vanderbilt.edu/~schmidt/POSA/POSA2/conc-patterns.html                                                                              | 1    | §6      |
| 20  | Concurrency Principles — Baeldung                           | https://www.baeldung.com/concurrency-principles-patterns                                                                                           | 2    | §6      |
| 21  | Actor Model — Wikipedia                                     | https://en.wikipedia.org/wiki/Actor_model                                                                                                          | 3    | §6      |
| 22  | Producer-Consumer — Cornell CS                              | https://www.cs.cornell.edu/courses/cs3110/2010fa/lectures/lec18.html                                                                               | 1    | §6      |
| 23  | Monad — Wikipedia                                           | https://en.wikipedia.org/wiki/Monad_(functional_programming)                                                                                       | 3    | §7      |
| 24  | Monad Pattern — Software Patterns Lexicon                   | https://softwarepatternslexicon.com/functional-programming/essential-functional-programming-patterns/monad-pattern/                                | 2    | §7      |
| 25  | Higher-Order Functions — Software Patterns Lexicon          | https://softwarepatternslexicon.com/functional/function-composition-and-transformation-patterns/function-composition/higher-order-functions/       | 2    | §7      |
| 26  | Criticism of Patterns — Refactoring.Guru                    | https://refactoring.guru/design-patterns/criticism                                                                                                 | 2    | §9      |
| 27  | OOP Patterns and Anti-Patterns — ByteByteGo                 | https://blog.bytebytego.com/p/oop-design-patterns-and-anti-patterns                                                                                | 2    | §9      |
| 28  | Anti-pattern — Wikipedia                                    | https://en.wikipedia.org/wiki/Anti-pattern                                                                                                         | 3    | §9      |
| 31  | Mastering Microservices Patterns — DEV                      | https://dev.to/geampiere/mastering-microservices-patterns-circuit-breaker-fallback-bulkhead-saga-and-cqrs-4h55                                     | 3    | §8      |
| 34  | Design Patterns Complete Guide 2025 — Technology & Strategy | https://www.technologyandstrategy.com/news/design-patterns-the-complete-guide-2025                                                                 | 2    | §10     |
| 35  | awesome-design-patterns — GitHub                            | https://github.com/DovAmir/awesome-design-patterns                                                                                                 | 3    | §1-8    |
| 37  | Agentic Design Patterns 2026 — SitePoint                    | https://www.sitepoint.com/the-definitive-guide-to-agentic-design-patterns-in-2026/                                                                 | 2    | §10     |
| 38  | Event-Driven Architecture Patterns — IBM                    | https://ibm-cloud-architecture.github.io/refarch-eda/patterns/cqrs/                                                                                | 2    | §5, §8  |
| 40  | Anti-Patterns to Avoid — freeCodeCamp                       | https://www.freecodecamp.org/news/antipatterns-to-avoid-in-code/                                                                                   | 3    | §9      |

---

## Unresolved Questions

1. **Adoption statistics:** No quantitative data found on pattern usage rates across the industry (e.g., "What % of codebases use Repository pattern?")
2. **Game development patterns:** Game Loop, Entity-Component-System (ECS), Component, Game State patterns not covered — would require separate focused research
3. **IoT/Embedded patterns:** Resource-constrained environment patterns not explored
4. **Security patterns:** Authentication, authorization, and secure-by-design patterns warrant dedicated research
5. **Testing patterns:** Arrange-Act-Assert, Test Double, Page Object, Fixture patterns not covered
