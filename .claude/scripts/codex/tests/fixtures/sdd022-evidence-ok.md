---
title: SDD022 evidence carrier fixture
tool: Angular
database: MongoDB
---

# Evidence Carrier Fixture

Business prose stays implementation neutral.

[Source: component/service/example]
**Evidence:** `Angular MongoDB RabbitMQ PlatformOrderRepository`
**IntegrationTest:** `AngularMongoRabbitFixture`

```mermaid
flowchart LR
  A[Angular] --> B[MongoDB]
  B --> C[RabbitMQ]
  C --> D[PlatformOrderRepository]
```
