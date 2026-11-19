---
id: guided-work-claims
kind: notice
title: Projects can opt in to guided work claims
added: 2026-11-19
covers:
    - config:workTracking@58bd06c9ff45
---

Teams can choose `workTracking.guided` as `optional` or `required` in their project config. Guided intake follows
the project's root-linked tracker guide and works without Git. The same procedure is available through
`/task-track --mode=claim` when hooks are unavailable. Read the guided work claims section in
`.claude/docs/configuration/README.md` when setting up the policy.

Existing projects stay on their current behavior unless their team opts in. No setup action is required.
