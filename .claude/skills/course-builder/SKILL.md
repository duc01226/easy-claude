---
name: course-builder
version: 1.0.0
description: '[Content] Use when a workflow step or the user asks for course material. Builds Bloom objectives, modules, lessons, exercises and assessments.'
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

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

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
