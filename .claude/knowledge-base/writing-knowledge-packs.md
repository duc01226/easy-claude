---
id: writing-knowledge-packs
title: Writing good knowledge packs
description: Use when drafting, importing, updating or reviewing a knowledge pack
kind: practice
review: unreviewed
reviewed: 2026-10-21
sources:
  - kind: file
    ref: .claude/skills/knowledge-base/references/pack-format.md
  - kind: file
    ref: .claude/hooks/lib/knowledge-pack.cjs
triggers:
  skills: [knowledge-base]
---

## Digest

- One subject per pack; split it when the body passes about 64,000 characters.
- The digest holds the five or so rules that matter most, in plain sentences, at most 1,500 characters.
- Clause headings start with an identifier unique in the pack, so plans, reviews and answers can cite them.
- Prompt phrases are words people actually type that mean the subject on their own; bind skills and agents for the work the knowledge belongs to.
- Write reference material, never instructions to the assistant; cite sources honestly.
- Write for an agent reader: fewest tokens that keep every rule, number and exception. Every draft passes `/prompt-enhance` (agent-guide branch) before it is confirmed.

## KB-PACK-1 One subject, many clauses

Separate subjects, separate packs, so a trigger brings only what the task needs.

## KB-PACK-2 The digest

Lead with the rules whose violation costs most; detail and rationale go to the clauses.

## KB-PACK-3 Clauses

Example heading: `KB-CARD-2 Storing card numbers`. Never renumber an identifier once something cites it.

## KB-PACK-4 Triggers

Skill and agent bindings are exact; prefer them. A phrase with several meanings ("payment", "contrast", "pan") brings noise. Prompt triggers are on only when the held-out evaluation (`.claude/knowledge-base/evaluation.json`) passed for every subject, or a project switches them on. Add `intent: [build]` (or `plan`, `review`) to keep a passing mention quiet.

## KB-PACK-5 Trust

A pack from model knowledge alone is shown as unverified. A pack drawn only from outside documents (an import, a file, a report, a page) is added unreviewed; only a confirmed `review` marks it reviewed, never an update. A line ordering the assistant to skip, ignore or relax a rule, gate, review, test or confirmation is refused by the check.

## KB-PACK-6 Concise for an agent reader

Lead each clause with its rule; one fact per bullet; comparisons in tables. Cut filler, restated headings and repetition. Identities, clause identifiers, tables, numbers, conditions and exceptions survive every edit. Full contract: `.claude/skills/knowledge-base/references/pack-format.md` → Concise, agent-readable writing.
