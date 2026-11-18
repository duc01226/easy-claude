---
module: hooks
service: framework.ContextDelivery
feature_code: PDL
parent_spec: README.ProtocolDelivery.md
entities: [DeliveryMessage, DeliveryRecord, LoadPath]
status: implemented
owner: Framework maintainers
last_updated: '2026-11-18'
scope_mode: FRAMEWORK-LIBRARY
---

# Protocol Delivery — Feature Spec, Part 2

The [parent spec](README.ProtocolDelivery.md) owns the capability and business rules.
This continuation covers the Antigravity workflow.

## 8. Test Specifications (continued)

#### TC-PDL-126: An Antigravity workspace skill read reaches the next model call [P1]

**Objective:** Prove that guidance reaches the assistant when it reads the projected form of a converted skill.

**Business Intent / Invariant Guarded:** A host that cannot inject context directly after a read must deliver it before the next model call, within the original conversation.

**Traces:** AC-PDL-37 / BR-PDL-15

**Preconditions:**

- The workspace hook bridge is enabled.
- A projected skill declares a review protocol and has not yet received it in this conversation.

**Real-World Reachability:** Antigravity reads a projected skill definition while working on a review.

**Demo Flow:** Read the skill and inspect the context delivered at the next model call.

```gherkin
Given an Antigravity workspace with a projected skill declaring review guidance
When the assistant reads that skill
Then the review guidance reaches the next model call
And another conversation cannot receive it
And a later call does not replay the same pending message
```

**Expected Result:**

| Dimension | Expectation |
| --- | --- |
| **UI** | Not applicable — the context goes to the assistant. |
| **System behavior** | Reading a skill queues its declared guidance. |
| **Business data state** | The matching conversation consumes the pending context once. |
| **Data shown on UI** | Not applicable. |

**Acceptance Criteria:**

- ✅ The declared review guidance reaches the originating conversation.
- ❌ A different conversation's call receives the pending guidance.
- ❌ A second model call replays the consumed guidance.

**Test Data:** One projected review skill, one unrelated file and two conversations.

**Edge Cases:** An unrelated read emits no skill guidance; a failed tool uses failure handlers.

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/antigravity-hook-bridge]`
> **Related Behaviors:** `operation/hooks/protocol-delivery` · `test/scripts/antigravity-hooks`
> **CoveredBy:** `.claude/scripts/tests/antigravity-hooks.test.cjs::TC-AGY-005`, `.claude/scripts/tests/antigravity-hooks.test.cjs::TC-AGY-006` · **Status:** Implemented
