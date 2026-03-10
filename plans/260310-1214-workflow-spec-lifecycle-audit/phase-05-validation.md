# Phase 5: Validation

## Context

After modifying 20 files across 4 phases, comprehensive validation ensures no breakage, no stale references, and correct behavior.

## Overview

Run hook tests, validate JSON, grep for stale sequences, and verify mirror consistency.

## Key Insights

- Hook tests: `node .claude/hooks/tests/test-all-hooks.cjs` validates all 34 hooks including workflow-router.cjs
- workflows.json has a JSON schema at `.claude/workflows.schema.json` for structural validation
- The project lesson "Mirror copies create staleness traps" (CLAUDE.md) demands grep verification

## Requirements

1. All hook tests pass
2. workflows.json validates against schema
3. No stale sequence references remain in any file
4. All mirrors are byte-identical to canonical sources

## Alternatives Considered

### Alternative 1: Manual review only

- Pro: Quick
- Con: Human error likely to miss stale references in 18 files
- **Rejected:** Automated grep is more reliable

### Alternative 2: Write a dedicated validation script

- Pro: Reusable for future workflow changes
- Con: Over-engineering for a one-time audit; YAGNI
- **Rejected:** Ad-hoc grep commands are sufficient and more transparent

## Design Rationale

Combine automated tests (hook test runner) with targeted grep searches. The hook test runner already validates workflow routing and step tracking. Grep searches catch stale mirror content.

## Architecture

No code changes. Validation-only phase.

## Implementation Steps

### 1. Validate workflows.json is valid JSON

```bash
node -e "JSON.parse(require('fs').readFileSync('.claude/workflows.json','utf-8')); console.log('Valid JSON')"
```

### 2. Run hook tests

```bash
node .claude/hooks/tests/test-all-hooks.cjs
```

All tests must pass.

### 3. Verify mirror consistency

```bash
diff .claude/workflows.json src/.claude/workflows.json
diff .claude/docs/claude-ai-agent-framework-guide.md src/.claude/docs/claude-ai-agent-framework-guide.md
diff .claude/skills/workflow-bugfix/SKILL.md src/.claude/skills/workflow-bugfix/SKILL.md
diff .claude/skills/workflow-hotfix/SKILL.md src/.claude/skills/workflow-hotfix/SKILL.md
diff .claude/skills/workflow-verification/SKILL.md src/.claude/skills/workflow-verification/SKILL.md
diff .claude/skills/workflow-feature/SKILL.md src/.claude/skills/workflow-feature/SKILL.md
diff .claude/skills/workflow-refactor/SKILL.md src/.claude/skills/workflow-refactor/SKILL.md
diff .claude/skills/workflow-batch-operation/SKILL.md src/.claude/skills/workflow-batch-operation/SKILL.md
diff .claude/skills/workflow-quality-audit/SKILL.md src/.claude/skills/workflow-quality-audit/SKILL.md
diff .claude/skills/workflow-performance/SKILL.md src/.claude/skills/workflow-performance/SKILL.md
```

All diffs should return empty (no differences).

### 4. Grep for stale sequence references

Search for OLD sequences that should no longer exist:

```bash
# bugfix: old pattern was prove-fix immediately followed by code-simplifier
grep -r "prove-fix.*code-simplifier" .claude/skills/workflow-bugfix/ src/.claude/skills/workflow-bugfix/
# Should return 0 results

# hotfix: old pattern was prove-fix immediately followed by test
grep -r "prove-fix.*test" .claude/skills/workflow-hotfix/ src/.claude/skills/workflow-hotfix/
# Should return 0 results (now has tdd-spec between them)

# feature: old pattern was cook immediately followed by code-simplifier
grep -r "cook.*code-simplifier" .claude/skills/workflow-feature/ src/.claude/skills/workflow-feature/
# Should return 0 results
```

### 5. Verify tdd-spec appears in all modified workflows

```bash
grep -c "tdd-spec" .claude/workflows.json
# Expected: count increases by 14 (7 workflows x 2 entries: tdd-spec + tdd-spec-review)
```

### 6. Count workflow steps for sanity check

```bash
node -e "
const wf = JSON.parse(require('fs').readFileSync('.claude/workflows.json','utf-8'));
const targets = ['bugfix','hotfix','verification','feature','refactor','batch-operation','quality-audit','performance'];
targets.forEach(w => console.log(w + ': ' + wf.workflows[w].sequence.length + ' steps'));
"
```

Expected output:

```
bugfix: 20 steps
hotfix: 13 steps
verification: 17 steps
feature: 25 steps
refactor: 19 steps
batch-operation: 15 steps
quality-audit: 11 steps
performance: 13 steps
```

## Todo

- [ ] Validate workflows.json is valid JSON
- [ ] Run hook tests -- all must pass
- [ ] Diff all 10 mirror files against canonical sources -- all must be identical
- [ ] Grep for stale old sequence patterns -- must return 0 results
- [ ] Verify tdd-spec reference count increased correctly
- [ ] Verify step counts match expected values

## Success Criteria

1. `node .claude/hooks/tests/test-all-hooks.cjs` -- all tests pass
2. All 10 diff commands return no differences
3. All stale pattern greps return 0 results
4. Step counts match expected values (bugfix:20, hotfix:13, verification:17, feature:25, refactor:19, batch-operation:15, quality-audit:11, performance:13)

## Risk Assessment

| Risk                                     | Likelihood | Impact | Mitigation                                 |
| ---------------------------------------- | ---------- | ------ | ------------------------------------------ |
| Hook tests fail due to unrelated issue   | LOW        | MEDIUM | Investigate failure, do not mask with skip |
| Stale reference found in unexpected file | LOW        | LOW    | Fix the reference, add to Phase 4 scope    |
| Step count mismatch                      | LOW        | MEDIUM | Recount and fix sequence array             |
