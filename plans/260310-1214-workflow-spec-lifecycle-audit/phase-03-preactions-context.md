# Phase 3: Update preActions Context Injection

## Context

After modifying workflow sequences in Phases 1-2, the `preActions.injectContext` strings must be updated to document the new spec steps. These strings serve as the workflow's "instruction manual" injected at workflow start.

## Overview

Add spec management instructions to the `injectContext` string of each modified workflow. Keep additions minimal (2-3 lines) to avoid token budget pressure.

## Key Insights

- preActions.injectContext is injected by `workflow-router.cjs` at workflow activation
- Existing injectContext strings range from 400-1500 characters
- The test-spec-update workflow's injectContext (workflows.json:1091) provides the wording template
- Numbered protocol steps in each injectContext must be renumbered when steps are inserted

## Requirements

For each of the 8 workflows, add a numbered step in the protocol section describing the spec update behavior. The wording must indicate UPDATE mode and regression TC generation (for fix workflows).

## Alternatives Considered

### Alternative 1: Add a separate SPEC MANAGEMENT section after the protocol

- Pro: Clearly separated, easy to find
- Con: Adds more text; the protocol section is what agents actually follow step-by-step
- **Rejected:** The numbered protocol IS the execution guide. A separate section would be ignored.

### Alternative 2: Add spec steps to protocol but with detailed UPDATE mode explanation

- Pro: Maximally informative
- Con: injectContext is already long; adding 5+ lines per workflow risks token budget
- **Rejected:** KISS. One line per spec step is sufficient. The tdd-spec skill itself has full mode documentation.

## Design Rationale

Insert 1-2 lines into the numbered protocol at the correct position. Use consistent wording:

- Fix workflows: "Update test specs (regression TCs for bugfix) with /tdd-spec update mode"
- Feature workflows: "Update test specs to match implementation with /tdd-spec update mode"
- Keep it to one line where possible.

## Architecture

No code changes -- only JSON string modifications in workflows.json.

## Implementation Steps

### 1. bugfix injectContext (workflows.json:254)

Add after step 8 (PROVE FIX), renumber subsequent steps:

```
9. Update test specs — /tdd-spec UPDATE mode generates regression TCs for the bug fixed. Review with /tdd-spec-review. Sync dashboard with /test-specs-docs.
```

Renumber existing steps 9-13 to 10-14.

### 2. hotfix injectContext (workflows.json:904)

Add after step 5 (PROVE FIX):

```
6. Update test specs — /tdd-spec UPDATE mode generates regression TC for the fix. Review with /tdd-spec-review. Sync dashboard with /test-specs-docs.
```

Renumber existing steps 6-9 to 7-10.

### 3. verification injectContext (workflows.json:662)

Add after step 8 (If user approves fix -> Plan fix...):

```
After fix is proven, update test specs via /tdd-spec UPDATE mode (regression TCs). Review with /tdd-spec-review. Sync dashboard with /test-specs-docs.
```

(Insert within the fix branch of the protocol, after step 8 but before step 9.)

### 4. feature injectContext (workflows.json:328)

Add BEFORE cook step and AFTER cook step (dual-mode):

```
6. Write test specifications with /tdd-spec CREATE mode (before implementation). Review with /tdd-spec-review.
7. Update plan with test strategy via /plan (re-plan cycle). Review with /plan-review.
8. Implement with /cook (backend + frontend) — guided by test specs
9. Update test specs to catch implementation gaps with /tdd-spec UPDATE mode. Review with /tdd-spec-review. Sync dashboard.
```

Renumber remaining steps accordingly.

### 5. refactor injectContext (workflows.json:450)

Add after step 6 (Implement incrementally):

```
7. Verify test specs still match after refactoring with /tdd-spec update mode. Review with /tdd-spec-review. Sync dashboard with /test-specs-docs.
```

Renumber existing steps 7-12 to 8-13.

### 6. batch-operation injectContext (workflows.json:547)

Add after step 4 (Implement):

```
5. Update test specs for bulk changes with /tdd-spec update mode. Review with /tdd-spec-review. Sync dashboard.
```

Renumber existing steps 5-9 to 6-10.

### 7. quality-audit injectContext (workflows.json:688)

Add after step 4 (Code: Implement approved fixes):

```
5. Update test specs if fixes changed behavior with /tdd-spec update mode. Review with /tdd-spec-review.
```

Renumber existing steps 5-7 to 6-8.

### 8. performance injectContext (workflows.json:755)

Add after step 4 (Implement: Apply optimizations):

```
5. Update test specs for performance-impacted behavior with /tdd-spec update mode. Review with /tdd-spec-review. Sync dashboard with /test-specs-docs.
```

Renumber existing steps 5-7 to 6-8.

## Todo

- [ ] Update bugfix injectContext -- add spec step after prove-fix, renumber
- [ ] Update hotfix injectContext -- add spec step after prove-fix, renumber (include test-specs-docs)
- [ ] Update verification injectContext -- add spec step in fix branch
- [ ] Update feature injectContext -- dual-mode: CREATE before cook + UPDATE after cook, renumber
- [ ] Update refactor injectContext -- add spec step after implement (include test-specs-docs), renumber
- [ ] Update batch-operation injectContext -- add spec step after implement, renumber
- [ ] Update quality-audit injectContext -- add spec step after code, renumber
- [ ] Update performance injectContext -- add spec step after implement, renumber
- [ ] Validate JSON after all edits

## Success Criteria

1. All 8 injectContext strings mention tdd-spec update mode at the correct protocol position
2. Feature injectContext documents dual-mode (CREATE + UPDATE) with re-plan cycle
3. Fix workflow contexts mention regression TCs explicitly
4. Step numbering is sequential with no gaps or duplicates
5. workflows.json remains valid JSON

## Risk Assessment

| Risk                                             | Likelihood | Impact | Mitigation                                  |
| ------------------------------------------------ | ---------- | ------ | ------------------------------------------- |
| injectContext too long, truncated by token limit | LOW        | MEDIUM | Each addition is 1-2 lines (~100-150 chars) |
| Step renumbering error                           | MEDIUM     | LOW    | Visual review of numbered sequence          |
| JSON escape character issues in string           | LOW        | HIGH   | Validate JSON after each edit               |
