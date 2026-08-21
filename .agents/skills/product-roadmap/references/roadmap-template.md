# Product Roadmap Template

Use this structure for `docs/product-roadmap.md`. Keep milestones outcome-based and keep implementation details out.

```markdown
---
title: {product or capability}
status: draft | approved | superseded
owner: {person or role}
updated: {YYYY-MM-DD}
selected_milestone: M0
---

# {Product} Roadmap

## Product Outcome
{User/business outcome and the hypothesis this roadmap will validate.}

## Actors and Boundary
{Primary user, owner/operator, other actors, and explicit product boundary.}

## Business Truth
- Source-of-truth state: {state that determines correctness}
- Critical terms: {definitions for ambiguous lifecycle words}
- Persistence expectation: {what must remain correct after refresh/reopen/redeploy}

## Milestones

| ID | Milestone / outcome | Risk retired | Non-goals now | Human decisions | Evidence gate | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| M0 | {user can...} | {uncertainty reduced} | {not included} | {owner decisions} | {observable proof} | — |

## Open Decisions
| ID | Decision | Options | Recommended | Owner | Status |
| --- | --- | --- | --- | --- | --- |

## Selected Milestone
- ID: M0
- Scope brief: plans/{plan-id}/scope-brief.md
- Approval: required | approved
- Approved on/by: {date and role}
```
Do not add dates, sprint commitments, framework names, database tables, endpoint lists, or screen inventories to this artifact.
