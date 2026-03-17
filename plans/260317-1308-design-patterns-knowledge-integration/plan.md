# Plan: Design Patterns Knowledge Integration into Skills & Workflows

**Date:** 2026-03-17
**Type:** Feature — Skill Enhancement
**Scope:** 1 new shared protocol + 5 skill updates
**Effort:** ~2h, markdown-only changes, no compiled code

---

## Problem

Skills that review, simplify, and refactor code (code-review, code-simplifier, refactoring, review-changes, review-post-task) currently check for KISS/DRY/YAGNI and clean code, but do NOT systematically verify whether design patterns are applied correctly or identify opportunities where patterns would improve code quality.

A comprehensive 80+ pattern research report exists at `plans/reports/research-260317-1236-common-design-patterns-in-programming.md` but is not consumable by AI agents during workflow execution.

## Goal

1. Create a concise, actionable **design patterns quality checklist** as a shared protocol
2. Integrate it into the 5 target skills as a MUST-READ prerequisite
3. Prioritize user-specified principles: **DRY + Right Responsibility + OOP Abstraction + Scalability/Tech-Agnostic**

## Deliverables

### Phase 1: Create Knowledge File (1 new file)

**File:** `.claude/skills/shared/design-patterns-quality-checklist.md`

**Content structure:**

1. **Priority Principles** (user-mandated, MUST CHECK):
   - DRY enforcement via OOP (base classes, generics, helpers, shared interfaces)
   - Right Responsibility (logic in lowest/most common layer: Entity > Service > Component)
   - OOP Abstraction (abstract class/interface for extensibility + DRY support)
   - Tech-Agnostic design (abstractions over implementations, dependency inversion)

2. **Design Pattern Opportunity Checklist** (quick-scan during review):
   - Creational: Are objects created directly where Factory/Builder would add flexibility?
   - Structural: Could Adapter/Facade/Decorator simplify a complex interface?
   - Behavioral: Would Strategy/Observer/Command reduce conditional complexity?
   - Architectural: Is the responsibility placement correct (MVC/CQRS/Repository)?
   - Enterprise: Are domain boundaries respected (Bounded Context, Aggregate)?

3. **Anti-Pattern Red Flags** (MUST FLAG):
   - God Object, Golden Hammer, Spaghetti Code, Copy-Paste, Circular Dependency
   - Singleton overuse, Premature Optimization

4. **When NOT to Apply** (prevent over-engineering):
   - Pattern application MUST justify ROI — don't add patterns for single-use cases
   - Prefer simplicity over pattern purity (KISS > pattern completeness)
   - Never recommend a pattern without evidence of repeated need (grep for 3+ occurrences)

### Phase 2: Update Skills (5 files modified)

| Skill              | What to Add                                                                           | Where                                     |
| ------------------ | ------------------------------------------------------------------------------------- | ----------------------------------------- |
| `code-simplifier`  | MUST-READ prerequisite + "Design Pattern Opportunity" section in Workflow step 2      | After OOP & DRY block, new checklist step |
| `code-review`      | MUST-READ prerequisite + "Design Pattern Compliance" check in Phase 2 Holistic Review | After Architecture check in Phase 2       |
| `refactoring`      | MUST-READ prerequisite + pattern-based refactoring catalog extension                  | After existing Refactoring Catalog        |
| `review-changes`   | Lightweight reference to checklist in review criteria                                 | In review criteria section                |
| `review-post-task` | Reference to checklist in post-task review                                            | In review checklist                       |

### Phase 3: Verify Coverage in Key Workflows

Verify these workflows now include design pattern checks via updated skills:

- **feature** — via code-simplifier + code-review steps
- **refactor** — via refactoring + code-review steps
- **quality-audit** — via code-review step
- **bugfix** — via code-review step
- **big-feature** — via code-review + code-simplifier steps
- **greenfield-init** — via code-review + code-simplifier steps
- **review-changes** — via review-changes step

No workflow.json changes needed — the skills themselves are enhanced.

## Constraints

- **No behavior changes** to existing skill logic
- **Additive only** — new prerequisites and checklist sections
- **KISS** — the checklist must be concise enough for AI to read quickly (<150 lines)
- **No new skills** — enhancement of existing skills only
- **No workflow.json changes** — patterns integrated via skill prerequisites

## Risk Assessment

| Risk                                | L   | I   | Mitigation                                         |
| ----------------------------------- | --- | --- | -------------------------------------------------- |
| Checklist too long, AI skips it     | M   | M   | Keep under 150 lines, prioritize top principles    |
| Over-engineering flag fatigue       | L   | M   | Include "When NOT to Apply" section                |
| Inconsistent adoption across skills | L   | L   | Same MUST-READ prerequisite format used everywhere |
