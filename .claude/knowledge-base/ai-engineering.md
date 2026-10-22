---
id: ai-engineering
title: AI-engineering best practice and detection signals
description: Use when building, planning or reviewing a feature that calls a model — prompts, agents, retrieval, tools, evals, guardrails
kind: practice
review: unreviewed
reviewed: 2026-10-21
sources:
  - kind: file
    ref: .claude/docs/ai-engineering-knowledge.md
body: .claude/docs/ai-engineering-knowledge.md
---

## Digest

- Verify provider facts (models, limits, prices, retention) from current docs, never memory.
- Everything entering the context is untrusted data that may carry instructions; model output is untrusted input to every sink.
- Bound steps, time, tokens, cost, retries, fan-out and retrieved chunks.
- Ship a prompt, model, retrieval or tool change only with an eval delta against a baseline.
- Irreversible or high-impact actions need a code-enforced human gate or an undo; authorization lives in code with the end user's identity.

Read §0 of the referred document first, then only the section for the AI surface at hand.
