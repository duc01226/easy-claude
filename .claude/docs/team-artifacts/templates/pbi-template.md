---
id: PBI-{YYMMDD}-{NNN}
title: '{Brief title}'
source_idea: '{IDEA-XXXXXX-NNN or N/A}'
priority: 1-999
effort: XS | S | M | L | XL
status: backlog | ready | in_progress | done | blocked
sprint: '{Sprint name or N/A}'
assigned_to: '{Name or Unassigned}'
created: { YYYY-MM-DD }
updated: { YYYY-MM-DD }
template_version: '2.1'

# Domain Context (for domain features — populate from project-config.json modules)
module: '' # Module name from project-config.json backendServices.serviceMap
related_features: [] # From idea template
primary_feature_doc: '' # Primary related feature documentation

# Traceability
idea_reference: '' # Link to source idea (IDEA-YYYY-NNN)
epic_reference: '' # Link to parent epic (if applicable)
dependencies: [] # Other PBIs this depends on
scope_mode: ORDINARY | DECOMPOSITION-EMBEDDED | EXPLICIT-ROADMAP | EXEMPT | FRAMEWORK-LIBRARY
# Required only when any shared isLargeIdea signal is true; omit for ordinary all-false ideas.
large_idea_decomposition: null
---

# {Title}

## Description

<!-- Clear, concise description of what needs to be built -->

## Business Value

<!-- Why this matters to users/business -->

## Large-Idea Decomposition (Conditional)

<!-- Required when any shared isLargeIdea signal is true. Preserve this block into stories, mock-ups, plans, and the all-PBI presentation. -->

```yaml
large_idea_decomposition:
  outcome_slices: [{stable ID, independently releasable outcome, releasable-when evidence, owning artifact}]
  dependencies_order: [{before, after, reason}]
  non_goals: [{statement, owner}]
  risks_evidence: [{risk, evidence_needed, status, owner}]
  deferred_work_owner: [{item, owner, follow_up_artifact, target_slice}]
```

## Releasable Outcome (Required)

<!-- A PBI is one independently releasable actor-facing outcome, not a technical work package. -->

- **Primary actor:** {Who can achieve the outcome}
- **Outcome:** {What the actor can accomplish after this PBI}
- **Entry → result → exit journey:** {How the actor enters, acts, sees the result, and leaves or continues}
- **Visible/persisted truth:** {What proves the result is accurate after refresh, revisit, or retry}
- **Access and recovery:** {Applicable roles, loading/empty/error/duplicate-submit/refresh/recovery behavior}
- **Technical/enabling work:** {Attached tasks/dependencies | None}; never emit technical/foundation/setup/migration work as a standalone PBI
- **Gate:** `PASS | BLOCKED` — {Evidence that this outcome is independently releasable}

### Full-Flow Surface (Required for UI PBIs)

<!-- Cover the complete demoable outcome. “Many pages” means every required view, not an arbitrary page count. -->

| View/page | Entry from | User action/result | Exit/next view | Components | States |
| --------- | ---------- | ----------------- | -------------- | ---------- | ------ |
| {View/page} | {Navigation entry} | {Observable action/result} | {Next view or exit} | {Common/domain/page components} | {Applicable states} |

**Navigation map:** `{view} → {view} → {business result} → {exit/next step}`

**Mock-app evidence:** {Path to a multi-view mock app, or `N/A — backend-only with explicit reason`}

**Full-flow demo status:** `PASS | BLOCKED` — {The demo covers all required views, navigation, components, states, and the visible/persisted result}

## Related Business Rules

> **Note:** For project domain features, this section references existing business rules from feature docs.

### Existing Business Rules (from feature docs)

<!-- Auto-extracted by `/refine` or BA skill -->

- **BR-{MOD}-XXX**: {Description of existing rule}
    - Source: `docs/specs/{module}/{feature}.md`
    - Impact: {How this PBI relates to this rule}

- **BR-{MOD}-YYY**: {Description of existing rule}
    - Source: (link)
    - Impact: (description)

### New Business Rules (introduced by this PBI)

<!-- Define any new business rules needed -->

- **BR-{MOD}-ZZZ**: {Description of new rule}
    - Rationale: {Why this rule is needed}
    - Scope: {What it affects}

### Clarifications Needed

<!-- Flag any conflicts or ambiguities with existing rules -->

- [ ] Conflict with BR-{MOD}-XXX: (describe conflict)
- [ ] Clarification needed on BR-{MOD}-YYY: (describe question)

## Acceptance Criteria

### Format Guidelines

Use BDD format (GIVEN/WHEN/THEN):

```gherkin
GIVEN {context/precondition}
WHEN {action/trigger}
THEN {expected outcome}
```

### For project Domain Features

Follow test case patterns from related feature docs:

- **Format:** TC-{FEATURE}-{NNN}
- **Evidence:** `[Source: namespace/service/id]` abstract anchor (stack-portable — physical `file:line` lives only in the provenance sidecar, never in the PBI body)
- **Reference:** See existing patterns in feature doc Section 8 (Test Specifications)

### Acceptance Criteria List

#### AC-01: {Criteria title}

**Test Case:** TC-{FEATURE}-001

```gherkin
GIVEN {precondition}
WHEN {action}
THEN {outcome}
```

**Evidence Format:** (abstract anchor added during implementation; physical coordinates → provenance sidecar)

- Backend: `[Source: operation/{service}/{Operation}]` (or `event`/`rule`/`schema` per artifact)
- Frontend: `[Source: component/{service}/{Component}]`

**Related Business Rules:** BR-{MOD}-XXX, BR-{MOD}-YYY

---

#### AC-02: {Criteria title}

**Test Case:** TC-{FEATURE}-002

```gherkin
GIVEN {precondition}
WHEN {action}
THEN {outcome}
```

**Evidence Format:** (abstract anchor added during implementation; physical coordinates → provenance sidecar)

- Backend: `[Source: operation/{service}/{Operation}]` (or `event`/`rule`/`schema` per artifact)
- Frontend: `[Source: component/{service}/{Component}]`

---

#### AC-03: {Error case}

**Test Case:** TC-{FEATURE}-003

```gherkin
GIVEN {precondition}
WHEN {invalid action}
THEN {error handling}
```

## BR/TC Validation Checklist

### Existing Business Rules Referenced

- [ ] BR-{MOD}-XXX: {Rule description} - Verified applicable
- [ ] BR-{MOD}-YYY: {Rule description} - Verified applicable

### New Business Rules Introduced

- [ ] BR-{MOD}-ZZZ: {New rule description} - Review needed

### Test Case Pattern Alignment

- [ ] TC format follows TC-{FEATURE}-{NNN} pattern
- [ ] All ACs use GIVEN/WHEN/THEN format
- [ ] Evidence format specified (`[Source: namespace/service/id]` abstract anchor — never physical `file:line`)

### Conflict Check

- [ ] No conflicts with existing BRs identified
- [ ] Clarifications documented if needed

## Out of Scope

<!-- Explicitly list what is NOT included -->

## Dependencies

| Type       | Item   | Status   |
| ---------- | ------ | -------- |
| Upstream   | {Item} | {Status} |
| Downstream | {Item} | {Status} |

## Reference Documentation

> **Note:** Auto-populated for project domain features.

### Business Feature Docs

- **Primary Feature:** [{Feature Name}]({path_to_feature_doc})
- **Module Overview:** [{Module Name}]({path_to_module_readme})

### Related Entities (from feature docs)

- [{Entity1}]({path_to_feature_doc}#7-domain-model)
- [{Entity2}]({path_to_feature_doc}#7-domain-model)

### Existing Test Cases

See Section 8 (Test Specifications) in primary feature doc for patterns:

- TC-{FEATURE}-{NNN} format
- GIVEN/WHEN/THEN structure
- Evidence format examples

## Technical Notes

<!-- Architecture decisions, API contracts, data model changes -->

## Design Reference

### Figma Designs

> **Auto-Extraction:** Claude Code extracts design context from Figma links during `/plan`.

| Screen/Component | Figma Link          | Node ID     | Notes         |
| ---------------- | ------------------- | ----------- | ------------- |
| {Screen name}    | [Link]({Figma URL}) | `{node-id}` | {Description} |
| {Component name} | [Link]({Figma URL}) | `{node-id}` | {Description} |

<!--
Figma URL format: https://www.figma.com/design/{file_key}/{name}?node-id={node_id}
Node ID: Use URL format (e.g., 1-3), extraction converts to API format (1:3)
-->

### Other Assets

<!-- Wireframes, mockups, screenshots not in Figma -->

- {Asset description}: {link or path}

## Test Strategy

<!-- High-level testing approach -->

---

## Template Instructions

### Frontmatter Fields

- **module**: Auto-populated from idea or detected by `/refine`. Critical for domain PBIs.
- **related_features**: Helps navigate feature documentation during implementation.
- **primary_feature_doc**: Primary reference for business rules and test patterns.

### Related Business Rules Section

- **Existing Rules**: Auto-extracted by BA skill from feature docs. Verify accuracy.
- **New Rules**: Document any new business rules introduced. Use BR-{MOD}-NNN format.
- **Clarifications**: Flag conflicts early to avoid rework.

### Acceptance Criteria

- Use TC-{FEATURE}-{NNN} format for domain features
- Reference existing test case patterns from feature docs
- Include Evidence format reminder (will be populated during implementation)
- Link to related business rules

### Reference Documentation

- Auto-populated with links to feature docs
- Provides quick access during implementation
- Check links are valid before committing PBI

---

_To create user stories, run: `/story {this-file}`_
_To create test spec, run: `/spec [mode=tests] {this-file}`_
