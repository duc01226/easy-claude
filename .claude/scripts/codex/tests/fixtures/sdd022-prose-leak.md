# Prose Leak

The business flow persists each submission to MongoDB before publishing to RabbitMQ.
Validation runs through Angular before save.

```gherkin
Given a RabbitMQ delivery is pending
And the job reads from MongoDB
```

LEAK_IDENTIFIER: PlatformOrderRepository is exposed in prose.
