---
service: Angular
database: MongoDB
---

# Evidence Carriers

[Source: operation/accounts/CreateUser, event/accounts/UserSaved]
**Evidence:** `Angular RabbitMQ MongoDB PlatformOrderRepository`
**IntegrationTest:** `Angular RabbitMQ MongoDB`

```mermaid
graph TD
  A[Angular] --> B[RabbitMQ]
  B --> C[MongoDB]
```
