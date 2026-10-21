# Brainstorm — optional ideation and triage techniques (Phases 3–4)

> Read the section the selected route names. SCAMPER, Dot Voting, RICE and Kano stay in `SKILL.md` because every route uses them.

### 3.2 — Crazy 8s (Rapid Visual Ideation)

**Time-box: 8 minutes; 8 ideas; no refinement.**

Process:

1. Fold paper into 8 sections (or create 8 boxes mentally).
2. Sketch one rough idea per box.
3. Let the timer force quantity over perfection.
4. Share and build on sketches.

For AI-facilitated sessions:

- AI generates 8 distinct solution directions in 2 minutes.
- User picks the top 3 to explore.
- Each direction = 1 sentence + 1 key differentiator.

### 3.3 — Brainwriting 6-3-5

For multi-stakeholder, async-friendly sessions:

- 6 participants, 3 ideas each, 5 rounds.
- Each round: read previous ideas → add 3 ideas OR build on an existing idea.
- Result: up to 108 ideas in 30 minutes; works asynchronously in a shared doc.

For AI-facilitated sessions:

- AI plays all 6 roles across 3 rounds.
- Generate from PO, BA, End User, Dev, Ops, and Business perspectives.

### 3.4 — Impact Mapping

Gojko Adzic's technique: Goal → Actors → Impacts → Deliverables:

```
GOAL: [business outcome with measurable target]
├── ACTOR: Who can help/hinder?
│   ├── IMPACT: How should behavior change?
│   │   └── DELIVERABLE: What feature produces this impact?
│   └── IMPACT: What negative behavior to prevent?
│       └── DELIVERABLE: What reduces this risk?
└── ACTOR: ...
```

**Key insight:** Work backward from GOAL. If a deliverable does not trace to an actor behavior change, do not build it.

### 3.5 — Analogical Thinking

Ask: "How does [industry X] solve [similar problem Y]?"

| Analogy Source                | Application to HR                      |
| ----------------------------- | -------------------------------------- |
| Spotify Discover Weekly       | Personalized learning recommendations  |
| Uber surge pricing            | Dynamic bonus pool allocation          |
| GitHub PR reviews             | Peer skill endorsement with evidence   |
| Amazon recommendation engine  | Next goal suggestion                   |
| Netflix "because you watched" | "Colleagues like you also achieved..." |

### 4.4 — Effort × Impact 2×2

Use for quick visual triage:

```
HIGH IMPACT
    │  Quick Wins ★    │  Major Projects ⚙️
    │  (do first)      │  (schedule carefully)
────┼──────────────────┼────────────────────
    │  Fill-Ins 📋     │  Money Pits ⚠️
    │  (if time)       │  (avoid or cut)
LOW IMPACT
         LOW EFFORT         HIGH EFFORT
```

Plot each shortlisted idea. Quick Wins = default first picks unless Major Project has strategic necessity.

### 4.5 — MoSCoW for Release Scope

Assign release priority to each shortlisted idea:

| Priority        | Meaning                            | Threshold                              |
| --------------- | ---------------------------------- | -------------------------------------- |
| **Must Have**   | MVP is broken without it           | Include if >80% of value depends on it |
| **Should Have** | Important but MVP works without it | Include if RICE > median               |
| **Could Have**  | Nice to have, low risk to cut      | Include if effort ≤ 3 EP               |
| **Won't Have**  | Explicitly out of scope this cycle | Document for future                    |
