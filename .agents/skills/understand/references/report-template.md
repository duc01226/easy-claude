# Understand — Teaching Report Template

> Loaded by `$understand` Step 4. This file is the **canonical shape of the report file**. The skill's in-chat output is a summary of this document; this document is the deliverable the developer keeps, re-reads, and argues with.

**Path:** `plans/reports/understand-{YYMMDD}-{HHmm}-{slug}.md` — a working artifact, not a tracked doc. Resolve the directory per SKILL.md Step 3: `docs/project-config.json` if it names one, else `plans/reports/`; if none of those is git-ignored, the report is **delivered in chat** and the blocker reported — never written to a tracked path.

**Audience:** the developer who did NOT write this code (even when they nominally did — AI wrote it). Assume zero memory of the reasoning, full ability to judge it once shown.

---

## The Nine Sections — ALL mandatory at EVERY coding level

Coding level tunes **vocabulary, analogy density, and per-section length**. It NEVER deletes a section. A level-5 report is nine short sections; a level-1 report is nine long ones. A report missing §2, §5, §8, or §9 is INCOMPLETE — those four are the ones that turn a description into teaching.

| §   | Section              | Answers                                              | Fails when                                                    |
| --- | -------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| 1   | What Was Done        | What is this, in developer terms? before → after      | It restates the commit message                                 |
| 2   | Concepts You Need    | What must I know to follow §3?                        | Jargon is used before it is taught                             |
| 3   | How It Works         | What actually executes, in what order?                | It narrates code instead of explaining flow + invariants       |
| 4   | Why This Solution    | What forces made this the answer?                     | "It's cleaner" / "best practice" with no causal chain          |
| 5   | Options Considered   | What ELSE could have been done, and what would it cost? | Fewer than 2 real alternatives, or pros/cons are generic    |
| 6   | Trade-offs Accepted  | What did we pay for what we bought?                   | Only upside is listed — a trade-off with no cost is a lie      |
| 7   | Impact & Blast Radius | Who/what else moves because of this?                 | It lists changed files instead of affected behavior            |
| 8   | Your Call            | What would I change, and how expensive is changing it? | It has no actionable lever                                    |
| 9   | Challenge This       | Where is this weakest? What should I push back on?    | It is self-congratulatory, or it asks the reader a real question that blocks |

### Code-free targets — the sections still land, in a different form

§5, §7, and §8 read as if the target is a change to code. When the resolved scope is a **concept** (*"explain CQRS"*) or a **bug/error not yet fixed**, there is no chosen option, no blast radius, and no `file:line` lever to point at. **This never licenses dropping a section** — §5, §8, and §9 are mandatory at every level. Use the form below instead:

| §   | Code target                                  | Concept target                                                                                     | Un-fixed bug/error target                                                        |
| --- | -------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 5   | Alternatives to the chosen implementation    | Alternatives **to the concept itself** — what you'd use instead, with the same pros/cons/cost rigor | Candidate root causes, each with evidence for and against                        |
| 7   | Upstream callers, downstream dependents      | What adopting it costs — what it constrains, what it forecloses                                     | What the defect is currently corrupting, and what silently depends on it         |
| 8   | *if you want X → change `file:line`*         | *if your situation has property X → this concept stops paying for itself* — the adoption/abandon levers, no `file:line` | *if the cause is X → the fix lands at layer Y* — the levers on the fix not yet made |

**The rule this preserves:** the anti-hallucination bar at `SKILL.md:107` forbids inventing a deliberation that never happened; the `[BLOCKING]` §2/§5/§8/§9 bar closing SKILL.md Step 4 forbids dropping §5/§8/§9. A code-free target satisfies both by answering the section's *question* in the form its target actually has — never by fabricating a `file:line` and never by writing an "N/A" stub.

---

## Skeleton

````markdown
# Understand — {resolved scope}

**Date:** {YYYY-MM-DD HH:mm} · **Scope:** {what is explained} · **Style level:** {N} ({name})
**Sources read:** {file:line list / plan path / diff range} · **Graph trace:** {ran | not applicable — reason}

> **How to read this:** §1–§3 teach what happened. §4–§6 teach why, and what it cost. §7–§9 are yours — they exist so you can disagree with any of it on evidence.

---

## 1. What Was Done

{2–6 sentences. Name the thing, where it lives, and state before → after in BEHAVIOR terms, not file terms.}

| | Before | After |
| --- | --- | --- |
| {behavior//property} | {…} | {…} |

**In one sentence:** {the single sentence a teammate needs}

---

## 2. Concepts You Need

{1–4 concepts MAX — only the ones without which §3 is unreadable. Skip nothing that is load-bearing; add nothing that is decoration. If the change needs no new concept, write "No new concepts — this is plain {X}" and say why.}

### {Concept name}

- **What it is:** {2–5 lines, plain language, first principles before jargon}
- **Why it applies here:** {the specific reason THIS problem summons THIS concept}
- **Where you can see it:** `{file:line}` — {what to look at there}
- **Mental model:** {one analogy — only if the concept is genuinely dense}
- **What breaks without it:** {the concrete failure this concept prevents}

---

## 3. How It Works

{The execution story. Entry point → data flow → decision points → persistence/output. Use a numbered walk or a small diagram. Every concrete claim carries `file:line`.}

**Flow:**

1. `{file:line}` — {what happens, and why here}
2. …

**Invariants held:** {the rules that must never break, and where they are enforced}
**Edge cases handled:** {each one, plus what would happen if it were not}
**Edge cases NOT handled:** {explicit — silence here is how bugs ship}

---

## 4. Why This Solution

{Not "what it does". WHY this shape and not another. Drill to the why-behind-the-why: the constraint, the force, the prior failure, the future cost being avoided.}

- **The forces:** {constraints that narrowed the option space — existing patterns, perf, data model, team convention, deadline, backward compat}
- **The decisive reason:** {the one force that actually picked the winner}
- **Why not the obvious approach:** {the thing a competent engineer would have guessed, and the specific reason it loses}
- **Confidence:** {N}% — {evidence this rationale is real vs reconstructed}

---

## 5. Options Considered

> **[MANDATORY]** At least 2 alternatives beyond the chosen one, OR an explicit, argued statement that the option space is genuinely empty. Generic pros/cons ("faster", "cleaner") are a FAILED section — every pro/con must be specific to THIS codebase and cite evidence where it can.

> **[ANTI-HALLUCINATION]** Label every option's provenance. Never invent a deliberation that did not happen.
> `[deliberated]` = actually weighed while doing the work · `[reconstructed]` = surfaced now, after the fact, for the developer's judgement.

| Option | How it would work | Pros | Cons | Cost to switch later | Verdict |
| --- | --- | --- | --- | --- | --- |
| **A. {chosen} ✅** | {…} | {specific} | {specific — the chosen option HAS cons} | — | Chosen: {one-line reason} |
| **B. {alt}** `[deliberated]` | {…} | {…} | {…} | {S/M/L + why} | Rejected: {the disqualifying reason} |
| **C. {alt}** `[reconstructed]` | {…} | {…} | {…} | {S/M/L + why} | Viable — {what would make it win} |

**The closest call:** {which option was nearest to winning, and the single fact that decided it. If nothing was close, say so and explain why the decision was easy.}

**What would flip the decision:** {concrete condition — "if {X} exceeds {N}", "if we ever need {Y}"}

---

## 6. Trade-offs Accepted

| We gained | We paid | Reversible? |
| --- | --- | --- |
| {…} | {…} | {Cheap / Moderate / Expensive — and WHY} |

**Now expensive to reverse:** {schema, public contract, cross-service message, shared-layer abstraction, persisted data shape — name them explicitly, or state "nothing here is hard to reverse" and justify it}
**Debt knowingly taken:** {what we accepted and the condition under which it must be repaid}

---

## 7. Impact & Blast Radius

- **Directly changed behavior:** {who sees a difference, in what situation}
- **Upstream callers affected:** {`file:line` — from graph trace where available}
- **Downstream dependents affected:** {`file:line`}
- **Silent-break risk:** {things that compile/pass but change meaning — config, generated files, docs, templates}
- **Test coverage of this change:** {which tests protect it; which behavior is protected by NOTHING}
- **Follow-ups left open:** {…}

---

## 8. Your Call — Decision Levers

> This section exists so you can steer, not just approve.

| If you want… | Change this | Effort | Risk |
| --- | --- | --- | --- |
| {a different behavior/trade-off} | `{file:line}` — {the specific edit} | {S/M/L} | {…} |

- **Cheapest thing to change your mind about:** {…}
- **Most expensive thing to change your mind about:** {…} — decide it now, not later
- **Revisit signals:** {the observable conditions that should make you re-open this decision — load, team size, a feature on the roadmap, an error rate}
- **If you disagree with the chosen option:** the smallest change that flips it is {…}

---

## 9. Challenge This

> **[RHETORICAL — do not answer here, and nothing waits on you.]** These are the questions a skeptical reviewer would ask. They are written down so you can pressure-test the work at your own pace, and push back with evidence if you land somewhere else.

**The weakest link, named by the author:** {the single part of this that would fail a hostile review first — be honest, this is the most valuable line in the report}

**Pressure-test these:**

1. {A question that attacks the core assumption — "this assumes {X} stays true; what happens the day it doesn't?"}
2. {A question that attacks the option choice — "if {condition} were 10× larger, would option B win?"}
3. {A question that attacks the mechanics — "what happens if {edge case} arrives concurrently?"}
4. {A question that attacks the scope — "what did this change NOT do that a reader might assume it did?"}

**Pre-mortem:** it is 3 months later and this is being reverted. The most likely reason is {…}, and the earliest signal would be {…}.

**Where the author's confidence is lowest:** {claim} — {N}% — {what evidence would raise it}

---

## Recap

- **Purpose:** {one sentence}
- **Key mechanic:** {one sentence}
- **Highest-leverage trade-off:** {one sentence}
- **The one thing to double-check:** {one sentence}
````

---

## Level tuning — sections stay, size flexes

| Level | §2 Concepts | §3 How | §5 Options | §9 Challenge |
| --- | --- | --- | --- | --- |
| 0 ELI5 | Analogy-led, one idea at a time, zero jargon | Story form, step by step | Plain-language "we could also have…" | Gentle "here's what to wonder about" |
| 1 Junior | Full definition + why it exists as a concept at all | Every step spelled out, terms defined inline | Full table, teach WHY each con matters | Concrete, tied to code they can open |
| 2 Mid | Definition + the pattern family it belongs to | Flow + edge cases in full | Full table + cost-to-switch reasoning | Design-level challenges |
| 3 Senior | Name it, one-line refresher, focus on why-here | Summarized flow, full edge cases/invariants | Full table, terse cells | Trade-off and reversibility challenges |
| 4 Tech Lead | Name only unless non-standard | Compressed; emphasis on contracts + risk | Focus on cost-to-switch and flip conditions | Strategic/architectural challenges |
| 5 God Mode | Only genuinely unusual concepts | Bullet flow, assume mechanics | Terse matrix, lead with the closest call | The weakest link + pre-mortem, nothing else |

**MUST ATTENTION:** at level 5 the report is short — it is never partial. §2, §5, §8, §9 still appear.

---

## Self-check before writing the file

- [ ] Every one of the 9 sections present (§2/§5/§8/§9 are the ones most often silently dropped — verify explicitly)
- [ ] Every concrete claim cites `file:line`, a plan path, or is labelled as inference with confidence
- [ ] §5 has ≥2 alternatives with SPECIFIC pros/cons and provenance labels, or an argued empty option space
- [ ] The chosen option in §5 lists real cons (a chosen option with no cons means the analysis is not done)
- [ ] §6 lists a real cost, not only benefits
- [ ] §9 names a weakest link the author actually believes in
- [ ] No question in the report expects an answer from the reader, and nothing in the flow waits for one
- [ ] Jargon in §3 was defined in §2 first
- [ ] Chat received the executive summary — plus the report path when a file was written, or Step 3's blocker line when it could not resolve one — so the explanation never lives only in the file
