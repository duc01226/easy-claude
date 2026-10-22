---
id: architecture
title: Architecture laws, trade-offs and anti-patterns
description: Use when designing or reviewing structure, boundaries, data, consistency, messaging, scalability or resilience
kind: practice
review: unreviewed
reviewed: 2026-10-21
sources:
  - kind: file
    ref: .claude/docs/architecture-knowledge.md
triggers:
  skills: [domain-analysis, scaffold, tech-stack-research]
  agents: [architect, solution-architect]
body: .claude/docs/architecture-knowledge.md
---

## Digest

- Architecture is the set of decisions expensive to reverse. Every recommendation names its cost ("accepted cost C to buy property P"); a pattern applied without its precondition is an anti-pattern.
- Quantified quality attributes select the structure; functional requirements alone never do.
- One-way doors (data model and keys, tenancy, consistency per read path, sync vs async at a boundary, public contracts, service lines, identity, data residency) need a recorded decision (ADR) and review.
- Judge coupling and cohesion before style; keep the seam, skip the speculative feature; complexity moves rather than vanishes.
- An anti-pattern match is a hypothesis until `file:line` or topology evidence shows the quality attribute it damages.

Read the referred document by section, never whole: laws §3, coupling §4, styles §5, data §8, consistency §9, messaging §10, resilience §11, judgment checklists §20.
