---
id: performance
title: Performance calibration constants and domain laws
description: Use when judging latency, throughput, caching, database load, memory or capacity against order-of-magnitude anchors
kind: practice
review: unreviewed
reviewed: 2026-10-21
sources:
  - kind: file
    ref: .claude/skills/performance-review/references/performance-knowledge.md
body: .claude/skills/performance-review/references/performance-knowledge.md
---

## Digest

- The anchors are orders of magnitude and ratios, never a substitute for measuring this system: cite a local measurement plus the anchor it violates.
- An anchor breach is a hypothesis until `file:line` or labelled static-risk evidence supports it.
- Apply the universal laws (Little's Law, queueing under utilization, Amdahl, tail amplification) before blaming one component; never average percentiles.
- Measure with rigor: warm up, measure steady state, compare to a baseline, and report offered versus completed load.

Read the referred document by section.
