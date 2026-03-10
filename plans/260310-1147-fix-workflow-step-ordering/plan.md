# Plan: Fix Workflow Step Ordering

**Date:** 2026-03-10
**Type:** Batch Operation — Workflow Configuration
**Based on:** `plans/reports/investigation-260310-1137-workflow-step-ordering-analysis.md`

---

## Scope

4 fixes across 2 primary files + 2 SKILL.md files + 1 mirror copy.

| #   | Fix                                                                                                          | Files                                                           | Risk |
| --- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | ---- |
| 1   | big-feature: Insert `tdd-spec → tdd-spec-review` between `story-review` and PLAN₂                            | workflows.json, workflow-big-feature/SKILL.md                   | Low  |
| 2   | feature-with-integration-test: Move `tdd-spec → tdd-spec-review` before `cook`, remove redundant PLAN₂ cycle | workflows.json, workflow-feature-with-integration-test/SKILL.md | Low  |
| 3   | big-feature + greenfield-init: Enhance preActions with explicit PLAN phase markers                           | workflows.json                                                  | Low  |
| 4   | Sync mirror copy `src/.claude/workflows.json`                                                                | src/.claude/workflows.json                                      | Low  |

---

## Change Details

### Fix 1: big-feature — Add TDD specs

**File:** `.claude/workflows.json` lines 396-427

**Current sequence (relevant section):**

```json
"story",
"story-review",
"plan",          // PLAN₂
"plan-review",
"scaffold",
```

**New sequence:**

```json
"story",
"story-review",
"tdd-spec",        // NEW: Write test specs from stories
"tdd-spec-review", // NEW: Review spec coverage
"plan",            // PLAN₂ — now informed by test specs
"plan-review",
"scaffold",
```

**File:** `.claude/workflows.json` preActions for big-feature

**Add to injectContext** (after SECOND PLANNING ROUND section):

```
TEST SPECIFICATIONS (after story-review, BEFORE second plan):
After stories are reviewed, write TDD specs (/tdd-spec) based on story acceptance criteria.
Review specs (/tdd-spec-review) for coverage and correctness.
The second /plan then incorporates test strategy alongside implementation tasks.
```

**Add to STEP SELECTION GATE** (after User Stories line):

```
- [x] Test Specifications (tdd-spec)
- [x] Test Spec Review (tdd-spec-review)
```

**Add explicit PLAN PHASES** to injectContext (replace SECOND PLANNING ROUND section):

```
PLAN PHASES:
- PLAN₁ (after architecture-design): High-level architecture plan.
  Scope: system design, component boundaries, data flow, tech choices.
  Based on: research findings + domain analysis.
- PLAN₂ (after tdd-spec-review): Sprint-ready implementation plan.
  Scope: concrete tasks, file changes, test infrastructure, phased steps.
  Based on: stories + test specs + dependency tables.
The two plans serve different purposes — PLAN₁ is strategic, PLAN₂ is tactical.
```

**File:** `.claude/skills/workflow-big-feature/SKILL.md`

**Current Steps line:**

```
**Steps:** /idea → /web-research → /deep-research → /business-evaluation → /domain-analysis → /tech-stack-research → /architecture-design → /plan → /plan-review → /refine → /refine-review → /story → /story-review → /plan → /plan-review → /scaffold → /plan-validate → /why-review → /cook → /integration-test → ...
```

**New Steps line:**

```
**Steps:** /idea → /web-research → /deep-research → /business-evaluation → /domain-analysis → /tech-stack-research → /architecture-design → /plan → /plan-review → /refine → /refine-review → /story → /story-review → /tdd-spec → /tdd-spec-review → /plan → /plan-review → /scaffold → /plan-validate → /why-review → /cook → /integration-test → ...
```

---

### Fix 2: feature-with-integration-test — Move TDD specs before cook

**File:** `.claude/workflows.json` lines 360-384

**Current sequence:**

```json
"scout", "investigate", "plan", "plan-review", "plan-validate", "why-review",
"cook",           // Implement first
"tdd-spec",       // Then write specs (TAT)
"tdd-spec-review",
"plan",           // Second plan for tests
"plan-review",
"integration-test", "test", ...
```

**New sequence:**

```json
"scout", "investigate", "plan", "plan-review", "plan-validate", "why-review",
"tdd-spec",        // Write specs FIRST (true TDD)
"tdd-spec-review",
"cook",            // Then implement (guided by specs)
"integration-test", // Generate tests from specs
"test",            // Run tests
...rest unchanged (code-simplifier, review-changes, etc.)
```

Note: Removed redundant second `plan` + `plan-review` cycle — no longer needed since specs come before implementation, not after. The single plan already covers both feature and test strategy.

**File:** `.claude/workflows.json` preActions for feature-with-integration-test

**Update injectContext** steps 5-11 to reflect new order:

```
5. Validate design rationale with /why-review
6. Write test specifications using /tdd-spec (feature doc Section 17) — BEFORE implementation
7. Review test specs with /tdd-spec-review for coverage and correctness
8. Implement with /cook (backend + frontend) — guided by test specs
9. Generate integration tests from specs with /integration-test
10. Run tests to verify all TCs pass
```

Remove: "9. Plan integration tests via /plan (second planning round for tests)" and "10. Review integration test plan via /plan-review"

**Update GUARDRAIL** text:

```
GUARDRAIL: This workflow enforces spec-first integration testing. Write specs → review → implement → generate tests → verify.
```

**File:** `.claude/skills/workflow-feature-with-integration-test/SKILL.md`

**New Steps line:**

```
**Steps:** /scout → /feature-investigation → /plan → /plan-review → /plan-validate → /why-review → /tdd-spec → /tdd-spec-review → /cook → /integration-test → /test → /code-simplifier → /review-changes → /code-review → /sre-review → /security → /performance → /changelog → /test → /docs-update → /watzup → /workflow-end
```

---

### Fix 3: greenfield-init — Enhance PLAN phase markers in preActions

**File:** `.claude/workflows.json` preActions for greenfield-init

**Add to injectContext** (before SECOND PLANNING ROUND section or replace it):

```
PLAN PHASES:
- PLAN₁ (after architecture-design): High-level architecture plan.
  Scope: system design, layer boundaries, component responsibilities, tech choices.
  Followed by /security + /performance review of the architecture.
- PLAN₂ (after tdd-spec-review): Sprint-ready implementation plan.
  Scope: concrete tasks, file changes, scaffolding needs, test infrastructure.
  Based on: stories + test specs from TDD-SPEC₁.
- PLAN₃ (after TDD-SPEC₂ post-implementation): Integration test architecture plan.
  Scope: test file structure, test data setup, CI integration.
  Based on: implementation code + updated test specs.
The three plans serve progressively detailed purposes — architecture → implementation → test infrastructure.
```

No sequence changes needed for greenfield-init (already well-designed).

---

### Fix 4: Sync mirror copy

After all changes to `.claude/workflows.json`, copy to `src/.claude/workflows.json`.

Command: `cp .claude/workflows.json src/.claude/workflows.json`

---

## Implementation Order

1. Edit `.claude/workflows.json` — big-feature sequence (insert 2 steps)
2. Edit `.claude/workflows.json` — big-feature preActions (add TDD + phase markers)
3. Edit `.claude/workflows.json` — feature-with-integration-test sequence (reorder + remove 2 steps)
4. Edit `.claude/workflows.json` — feature-with-integration-test preActions (update step descriptions)
5. Edit `.claude/workflows.json` — greenfield-init preActions (add phase markers)
6. Edit `.claude/skills/workflow-big-feature/SKILL.md` — update Steps line
7. Edit `.claude/skills/workflow-feature-with-integration-test/SKILL.md` — update Steps line
8. Copy `.claude/workflows.json` → `src/.claude/workflows.json`
9. Run hook tests: `node .claude/hooks/tests/test-all-hooks.cjs`
10. Grep verification: search for old step patterns to confirm no stale references

---

## Verification

- [ ] Hook tests pass
- [ ] `buildWorkflowCatalog` generates correct catalog text for modified workflows
- [ ] No stale references to old step ordering in docs or other skills
- [ ] `src/.claude/workflows.json` matches `.claude/workflows.json`

---

## Validation Summary

**Validated:** 2026-03-10
**Questions asked:** 4

### Confirmed Decisions

1. **Re-plan cycle (Fix 2):** KEEP lightweight re-plan after tdd-spec-review. Sequence becomes `...why-review → tdd-spec → tdd-spec-review → plan → plan-review → cook...` (22 steps). The re-plan updates the existing plan after specs are generated.
2. **Description field (Fix 2):** YES, update `description` field to remove "integration test planning" reference.
3. **PLAN PHASES (Fix 3):** ADD alongside existing SECOND PLANNING ROUND section (keep both). PLAN PHASES as quick-reference, narrative stays.
4. **Verification gate:** Run full hook test suite (`node .claude/hooks/tests/test-all-hooks.cjs`) as hard gate.

### Action Items

- [ ] Update Fix 2 sequence to include re-plan cycle: `tdd-spec → tdd-spec-review → plan → plan-review → cook`
- [ ] Update Fix 2 to include `description` field change
- [ ] Fix 3: ADD PLAN PHASES section, don't replace SECOND PLANNING ROUND
- [ ] Run hook tests after all edits

---

## Unresolved Questions

None — all resolved by validation interview.
