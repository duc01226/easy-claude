---
name: course-builder
version: 1.0.0
description: '[Content] Use when building course material — Bloom objectives, modules, lessons, exercises, assessments.'
---

## Quick Summary

**Goal:** Build a learner-ready course with Bloom-aligned objectives, progressive modules, lessons, practice, and assessments so learners achieve and demonstrate intended outcomes.

**Summary:**

- **Purpose:** Turn user/research scope into a template-compliant course with aligned outcomes, practice, and assessments.
- **Main flow:** Phase 0 detect course context; (1) define audience, prerequisites, duration, outcomes; (2) map objectives to Bloom; (3) structure modules → lessons → exercises → assessments.
- **Continue:** (4) develop each lesson's duration, concept, explanation, examples, exercise, assessment; (5) create module knowledge checks + comprehensive final; (6) review alignment, evidence, progression, prerequisites.
- **Gates/output:** Create `TaskCreate` tasks before work; map every objective to Bloom; use the enforced template; write `docs/knowledge/courses/{descriptive-slug}.md`; no modes/flags specified.

**Workflow:**

1. **Define scope** — Target audience, prerequisites, duration, objectives
2. **Map objectives** — Align to Bloom's taxonomy
3. **Structure curriculum** — Modules → Lessons → Exercises → Assessments
4. **Develop content** — Per lesson: concept, explanation, examples, exercise
5. **Create assessments** — Knowledge checks + final assessment
6. **Review pedagogy** — Alignment, progressive difficulty, prerequisite chains

**Key Rules:**

- Every objective maps to a Bloom's taxonomy level; include at least one Apply-level objective.
- Build progressive complexity; each module builds on previous prerequisites.
- Derive lesson depth, examples, exercises, and assessment format from learner context and objectives; do not fill templates mechanically.
- Use enforced template `.claude/templates/course-outline-template.md`.

**Critical thinking:** Be skeptical; reason sequentially; trace evidence for every claim; state confidence percentages; ideas >80%.

# Course Builder

## Phase 0: Detect Course Context

Classify course type, learner level, delivery mode, and constraints before choosing depth, examples, exercises, or assessment formats; ask for missing inputs or state assumptions.

## Bloom's Taxonomy Reference

| Level          | Verb Examples                             | Assessment Type                     |
| -------------- | ----------------------------------------- | ----------------------------------- |
| **Remember**   | Define, list, recall, identify            | Multiple choice, fill-in-blank      |
| **Understand** | Explain, describe, summarize, interpret   | Short answer, paraphrase            |
| **Apply**      | Use, implement, solve, demonstrate        | Problem sets, exercises             |
| **Analyze**    | Compare, contrast, examine, differentiate | Case studies, analysis papers       |
| **Evaluate**   | Judge, critique, assess, justify          | Debates, reviews, peer assessment   |
| **Create**     | Design, construct, produce, develop       | Projects, portfolios, presentations |

## Step 1: Define Learning Scope

Gather from user or research: **Target audience** — who + background; **Prerequisites** — prior knowledge; **Duration** — total hours/weeks; **Desired outcomes** — learner capabilities after course.

## Step 2: Map Objectives to Bloom's

Assign a Bloom's level to each desired outcome:
- Start lower: Remember → Understand; progress higher: Apply → Analyze → Evaluate → Create; ensure at least one objective at Apply level or above.

## Step 3: Structure Curriculum

Organize 3-8 modules per course:
- 2-5 lessons/module; module-specific learning objectives; modules build through a prerequisite chain.

## Step 4: Develop Lesson Content

For each lesson, provide: (1) **Duration** — estimated time; (2) **Concept** — core idea in 1-2 sentences; (3) **Explanation** — theory, context, why it matters; (4) **Examples** — 2-3 real-world illustrations; (5) **Exercise** — hands-on practice activity; (6) **Assessment** — how to verify learning.

## Step 5: Create Assessments

Per module: **Knowledge check** — 3-5 questions covering key concepts; questions align with module's Bloom's level.
Final: **Comprehensive assessment** — covers all modules; **Mix of Bloom's levels** — at least 1 question per level taught.

## Step 6: Review Pedagogy

Verify objective/activity/assessment alignment, evidence for content claims, labelled assumptions, progressive difficulty, and prerequisite chain; state confidence.

## Output

Write to `docs/knowledge/courses/{descriptive-slug}.md` using enforced template from `.claude/templates/course-outline-template.md`.

---

> **[IMPORTANT]** Create small tasks with `TaskCreate` before work, including a final review task.

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
> **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, `plans/`, `team-artifacts/`, or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Build a learner-ready course with Bloom-aligned objectives, progressive modules, lessons, practice, and assessments so learners achieve and demonstrate intended outcomes.
**IMPORTANT MUST ATTENTION** Course flow: Phase 0 detect context; (1) define scope; (2) map every objective to Bloom; (3) structure 3-8 modules with 2-5 lessons and prerequisite links; (4) develop each lesson's duration, concept, explanation, examples, exercise, and assessment; (5) create 3-5-question module checks plus a comprehensive final with every taught Bloom level; (6) review alignment, evidence, assumptions, progression, and prerequisites.

**IMPORTANT MUST ATTENTION** Gate/output: create `TaskCreate` tasks before work and a final review task; search 3+ similar patterns before creating code; cite `file:line` evidence with confidence >80%; use enforced `.claude/templates/course-outline-template.md`; write `docs/knowledge/courses/{descriptive-slug}.md`; no modes/flags specified.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** MUST ATTENTION critical + sequential thinking, traced proof, confidence >80% to act, never guess as fact.

**IMPORTANT MUST ATTENTION** use user/research evidence, label assumptions, and state confidence; NEVER fabricate course facts.

**Anti-Rationalization:**

| Evasion | Rebuttal |
| --- | --- |
| "Course is simple" | Wrong assumptions waste time; apply the full flow. |
| "Already searched" | Show `file:line` evidence; no proof means no search. |
| "Just do it" | Create task tracking first; skip depth only when justified, never skip tracking. |

**[TASK-PLANNING]** **MUST ATTENTION** Before acting, analyze scope; create small `TaskCreate` tasks, search 3+ similar patterns before creating code, cite `file:line` evidence, and complete a final quality review.
