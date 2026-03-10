# Phase 4: Mirror Sync and Documentation Cascade

## Context

The easy-claude framework maintains a mirror of `.claude/` at `src/.claude/` (the distributable template). Additionally, workflow activation skills (`workflow-*/SKILL.md`) embed step sequences, and the framework guide (`claude-ai-agent-framework-guide.md`) inlines a workflow catalog. All must be updated.

## Overview

Propagate all Phase 1-3 changes to:

1. `src/.claude/workflows.json` (mirror of canonical workflows.json)
2. 8 workflow SKILL.md files (Steps: line) + their src/ mirrors
3. Framework guide inline workflow catalog

## Key Insights

- Lesson learned (CLAUDE.md): "Mirror copies create staleness traps" -- must trace ALL mirrored files
- SKILL.md files have a single `**Steps:**` line that lists the workflow sequence (e.g., workflow-bugfix/SKILL.md:9)
- Framework guide has an inline catalog at lines 730-755 with abbreviated sequences
- All mirrors in src/.claude/ should be byte-identical to .claude/ counterparts

## Requirements

1. Copy updated `.claude/workflows.json` to `src/.claude/workflows.json`
2. Update 7 SKILL.md files with new Steps: lines reflecting updated sequences
3. Copy updated SKILL.md files to their src/.claude/ mirrors
4. Update framework guide inline catalog with new abbreviated sequences
5. Copy updated framework guide to src/.claude/ mirror

## Alternatives Considered

### Alternative 1: Update mirrors manually (edit each file individually)

- Pro: Fine-grained control over each change
- Con: 18 edits -- high risk of missing one; slow and error-prone
- **Rejected:** Too many manual edits. Use copy for byte-identical mirrors.

### Alternative 2: Script the mirror sync

- Pro: Automated, repeatable
- Con: Over-engineering for a one-time change; the sync script (`sync-copilot-workflows.cjs`) handles copilot-specific content, not general .claude mirroring
- **Rejected:** YAGNI. Simple file copy is sufficient. Grep verification in Phase 5 catches misses.

## Design Rationale

For mirrors that should be byte-identical (workflows.json, SKILL.md), use direct file copy. For the framework guide, the inline catalog uses abbreviated sequences that differ from full sequences, so it must be edited manually.

## Architecture

No code changes. File copy + manual edit of abbreviated sequences.

## Implementation Steps

### 1. Copy workflows.json mirror

```bash
cp .claude/workflows.json src/.claude/workflows.json
```

### 2. Update SKILL.md Steps: lines

Each SKILL.md has a single `**Steps:**` line. Update to match new sequences:

**workflow-bugfix/SKILL.md** (line 9):

```
**Steps:** /scout -> /feature-investigation -> /debug -> /plan -> /plan-review -> /plan-validate -> /why-review -> /fix -> /prove-fix -> /tdd-spec -> /tdd-spec-review -> /test-specs-docs -> /code-simplifier -> /review-changes -> /code-review -> /changelog -> /test -> /docs-update -> /watzup -> /workflow-end
```

**workflow-hotfix/SKILL.md** (line 9):

```
**Steps:** /scout -> /plan -> /plan-review -> /fix -> /prove-fix -> /tdd-spec -> /tdd-spec-review -> /test-specs-docs -> /test -> /review-changes -> /sre-review -> /watzup -> /workflow-end
```

**workflow-verification/SKILL.md** (line 9):

```
**Steps:** /scout -> /feature-investigation -> /test -> /plan -> /plan-review -> /plan-validate -> /fix -> /prove-fix -> /tdd-spec -> /tdd-spec-review -> /test-specs-docs -> /code-simplifier -> /review-changes -> /code-review -> /test -> /watzup -> /workflow-end
```

**workflow-feature/SKILL.md** (line 9):

```
**Steps:** /scout -> /feature-investigation -> /plan -> /plan-review -> /plan-validate -> /why-review -> /tdd-spec -> /tdd-spec-review -> /plan -> /plan-review -> /cook -> /tdd-spec -> /tdd-spec-review -> /test-specs-docs -> /code-simplifier -> /review-changes -> /code-review -> /sre-review -> /security -> /performance -> /changelog -> /test -> /docs-update -> /watzup -> /workflow-end
```

**workflow-refactor/SKILL.md** (line 9):

```
**Steps:** /scout -> /feature-investigation -> /plan -> /plan-review -> /plan-validate -> /why-review -> /code -> /tdd-spec -> /tdd-spec-review -> /test-specs-docs -> /code-simplifier -> /review-changes -> /code-review -> /sre-review -> /changelog -> /test -> /docs-update -> /watzup -> /workflow-end
```

**workflow-batch-operation/SKILL.md** (line 9):

```
**Steps:** /plan -> /plan-review -> /plan-validate -> /why-review -> /code -> /tdd-spec -> /tdd-spec-review -> /test-specs-docs -> /code-simplifier -> /review-changes -> /sre-review -> /test -> /docs-update -> /watzup -> /workflow-end
```

**workflow-quality-audit/SKILL.md** (line 9):

```
**Steps:** /code-review -> /plan -> /plan-review -> /plan-validate -> /code -> /tdd-spec -> /tdd-spec-review -> /review-changes -> /test -> /watzup -> /workflow-end
```

### 3. Copy SKILL.md mirrors

```bash
cp .claude/skills/workflow-bugfix/SKILL.md src/.claude/skills/workflow-bugfix/SKILL.md
cp .claude/skills/workflow-hotfix/SKILL.md src/.claude/skills/workflow-hotfix/SKILL.md
cp .claude/skills/workflow-verification/SKILL.md src/.claude/skills/workflow-verification/SKILL.md
cp .claude/skills/workflow-feature/SKILL.md src/.claude/skills/workflow-feature/SKILL.md
cp .claude/skills/workflow-refactor/SKILL.md src/.claude/skills/workflow-refactor/SKILL.md
cp .claude/skills/workflow-batch-operation/SKILL.md src/.claude/skills/workflow-batch-operation/SKILL.md
cp .claude/skills/workflow-quality-audit/SKILL.md src/.claude/skills/workflow-quality-audit/SKILL.md
cp .claude/skills/workflow-performance/SKILL.md src/.claude/skills/workflow-performance/SKILL.md
```

**workflow-performance/SKILL.md** (line 9):

```
**Steps:** /scout -> /feature-investigation -> /plan -> /plan-review -> /plan-validate -> /code -> /tdd-spec -> /tdd-spec-review -> /test-specs-docs -> /test -> /sre-review -> /watzup -> /workflow-end
```

### 4. Update framework guide inline catalog

Edit `.claude/docs/claude-ai-agent-framework-guide.md` lines 730-755. Update abbreviated sequences:

```
Line 730: feature -> add "tdd-spec" after cook
Line 734: bugfix -> add "tdd-spec" after prove-fix
Line 735: hotfix -> add "tdd-spec" after prove-fix
Line 736: refactor -> add "tdd-spec" after code
Line 737: batch-operation -> add "tdd-spec" after code
Line 748: quality-audit -> add "tdd-spec" after code
Line 755: verification -> add "tdd-spec" after prove-fix
```

### 5. Copy framework guide mirror

```bash
cp .claude/docs/claude-ai-agent-framework-guide.md src/.claude/docs/claude-ai-agent-framework-guide.md
```

## Todo

- [ ] Copy workflows.json to src/.claude/workflows.json
- [ ] Update 8 SKILL.md Steps: lines to match new sequences
- [ ] Copy 8 SKILL.md files to src/.claude/ mirrors
- [ ] Update framework guide inline catalog (8 abbreviated sequences)
- [ ] Copy framework guide to src/.claude/ mirror
- [ ] Spot-check: diff .claude/workflows.json src/.claude/workflows.json (should be identical)

## Success Criteria

1. `diff .claude/workflows.json src/.claude/workflows.json` returns no differences
2. All 8 SKILL.md Steps: lines match their workflow sequence in workflows.json
3. All 8 src/.claude/skills/workflow-\*/SKILL.md are identical to .claude/ counterparts
4. Framework guide catalog accurately reflects new abbreviated sequences
5. `diff .claude/docs/claude-ai-agent-framework-guide.md src/.claude/docs/claude-ai-agent-framework-guide.md` returns no differences

## Risk Assessment

| Risk                                          | Likelihood | Impact | Mitigation                                         |
| --------------------------------------------- | ---------- | ------ | -------------------------------------------------- |
| Missed mirror file                            | MEDIUM     | HIGH   | Phase 5 grep verification catches this             |
| SKILL.md Steps: line doesn't match sequence   | MEDIUM     | LOW    | Visual cross-reference against workflows.json      |
| Framework guide abbreviated sequence is wrong | LOW        | LOW    | Abbreviated sequences are for human reference only |
