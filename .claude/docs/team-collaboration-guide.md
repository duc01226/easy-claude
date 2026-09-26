# Team Collaboration Guide

> How Product Owners, Business Analysts, QA Engineers, QC Specialists, and UX Designers collaborate through Claude Code's workflow system.

**Version:** 2.1 | **Last Updated:** 2026-06-11

---

## Quick Navigation

| Section                                       | Audience  | Purpose                        |
| --------------------------------------------- | --------- | ------------------------------ |
| [How It Works](#how-it-works)                 | All Roles | Understand the workflow system |
| [Quick Start](#quick-start-by-role)           | All Roles | First success in 2 minutes     |
| [Skills Reference](#skills-reference-by-role) | All Roles | Key skills with examples       |
| [Workflows](#workflow-tutorials)              | All Roles | End-to-end process flows       |
| [Role Handoffs](#role-handoff-workflows)      | All Roles | Cross-role collaboration       |
| [Real-World Example](#real-world-example)     | All Roles | Employee Photo Upload feature  |
| [Cheat Sheet](#cheat-sheet)                   | All Roles | Printable quick reference      |
| [Troubleshooting](#troubleshooting)           | All Roles | Common issues and fixes        |

---

## How It Works

Claude Code uses a **three-pillar architecture** to assist every role:

| Pillar                        | What It Does                                                          | Count                                                      |
| ----------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Hooks** (Enforcement)       | Enforce quality gates, block unsafe actions, manage session lifecycle | <!-- COUNT:hooks -->23<!-- /COUNT --> top-level hook files |
| **Skills** (Intelligence)     | Prompt-engineered protocols loaded on demand via `/skill-name`        | <!-- COUNT:skills -->126<!-- /COUNT --> skills             |
| **Workflows** (Orchestration) | Multi-step sequences of skills with progress tracking                 | <!-- COUNT:workflows -->20<!-- /COUNT --> workflows        |

### Workflow Detection

When you describe the first task of a session, Claude automatically:

1. **Detects** the best-matching workflow from the catalog
2. **Auto-selects** the best path and activates it (no confirmation step)
3. **Creates tasks** for every step and tracks progress
4. **Executes** each step in sequence

Mid-session (follow-ups, corrections, new asks), Claude does the work directly, with the best-fit skill, or with a lean chain of at most 3 skills instead of auto-activating a workflow. An explicit workflow request — `/start-workflow <id>`, `/workflow-*`, or asking in words — always runs.

You never need to memorize workflow names — just describe your intent.

### Project Knowledge (Static Embedding)

Project knowledge — backend/frontend patterns, design tokens, code-review rules, learned lessons — lives **statically** in `CLAUDE.md`, the agent definitions, and the skills, plus the reference docs under the project-reference docs root — default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path. Skills and agents read the relevant doc on demand. Because the guidance is embedded rather than requiring runtime injection, every harness — Claude, Codex — sees identical instructions even when hooks are disabled; hooks may accelerate discovery but do not change the contract.

---

## Before You Start

1. **Claude Code installed** — Verify with `claude --version`
2. **Project configured** — `docs/project-config.json` exists
3. **Know where outputs go:**
    - Plans and reports: the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) and `tmp/reports/`
    - Documentation: `docs/`
    - Design specs, test specs: within `docs/` or the plans root

---

## Quick Start by Role

### Product Owner: Capture to Prioritize

**Goal:** Feature idea captured and prioritized in backlog

1. **Capture an idea**

    ```
    /idea "Allow employees to upload profile photos"
    ```

2. **Refine to PBI**

    ```
    /refine {idea-file-path}
    ```

    Creates PBI with GIVEN/WHEN/THEN acceptance criteria

3. **Prioritize backlog**
    ```
    /prioritize rice
    ```
    Scores and orders PBIs using RICE, MoSCoW, or Value-Effort framework

**Workflow trigger:** Say "new feature idea" or "backlog item" → activates **idea-to-pbi** workflow

---

### Business Analyst: Refine to Stories

**Goal:** PBI broken into testable user stories

1. **Refine idea into PBI**

    ```
    /refine {idea-file-path}
    ```

2. **Create user stories**

    ```
    /story {pbi-file-path}
    ```

    Slices PBI into vertical stories meeting INVEST criteria

**Workflow trigger:** Say "refine this idea" → activates **idea-to-pbi** workflow

---

### QA Engineer: PBI to Test Cases

**Goal:** Test specification with executable test cases

1. **Generate test spec from PBI**

    ```
    /spec [mode=tests] {pbi-or-feature-doc}
    ```

    Creates test specs with `TC-{FEATURE}-{NNN}` IDs in unified format

2. **Generate integration tests from specs**

    ```
    /integration-test
    ```

3. **Run quality gate**
    ```
    /artifact-review --type=spec-tests {pbi-or-feature-doc}
    ```

**Workflow trigger:** Say "test cases from PBI" → runs `/spec [mode=tests]` directly (the former pbi-to-tests workflow was merged into the `spec` skill); for full test authoring with generated test code, use the **write-integration-test** workflow

---

### UX Designer: Requirements to Design Spec

**Goal:** Component specification ready for handoff

1. **Create design spec**

    ```
    /design-spec {pbi-or-requirements}
    ```

    Generates a component inventory, interaction states, configured token mappings when available, and an accessibility checklist

2. **Review against design system**
   Map to configured tokens when the project has a design system; otherwise record approved design values and open decisions without inventing a token system

**Workflow trigger:** Say "design spec for" → runs **/design-spec** then **/design --lane=product** (or **/design --lane=marketing**)

---

### QC Specialist: Quality Gates

**Goal:** Verify artifacts meet quality standards before handoffs

1. **Run the gate for the transition you are at**

    ```
    /dor-gate {pbi-path}                             # pre-dev: PBI ready for grooming
    /artifact-review --type=spec-tests {spec-path}   # pre-qa: test specs ready for QA
    /production-readiness-review                     # pre-release: service/API readiness
    ```

2. **Review artifact quality** (includes the PO acceptance checks)
    ```
    /artifact-review {artifact-path}
    ```

**Workflow trigger:** Say "quality check" → run the gate for the current transition: `/dor-gate` (pre-dev), `/artifact-review --type=spec-tests` (pre-qa), `/production-readiness-review` (pre-release)

---

## Skills Reference by Role

### Capture & Requirements

| Skill         | Purpose                                  | Example                    |
| ------------- | ---------------------------------------- | -------------------------- |
| `/idea`       | Capture raw idea                         | `/idea "Dark mode toggle"` |
| `/refine`     | Transform idea into PBI with AC          | `/refine {idea-file}`      |
| `/story`      | Break PBI into user stories (INVEST)     | `/story {pbi-file}`        |
| `/prioritize` | Order backlog (RICE/MoSCoW/Value-Effort) | `/prioritize rice`         |
| `/dor-gate`   | Validate PBI against Definition of Ready | `/dor-gate {pbi-file}`     |

### Testing & Quality

| Skill                | Purpose                                  | Example                              |
| -------------------- | ---------------------------------------- | ------------------------------------ |
| `/spec [mode=tests]` | Generate test specs (TC-{FEATURE}-{NNN}) | `/spec [mode=tests] {feature-doc}`   |
| `/integration-test`  | Generate integration tests from specs    | `/integration-test`                  |
| `/e2e-test`          | Generate E2E tests                       | `/e2e-test`                          |
| `/artifact-review`   | Gate artifact quality before handoff     | `/artifact-review --type=spec-tests` |
| `/test`              | Run and analyze tests                    | `/test`                              |

### Design & Frontend

| Skill                    | Purpose                              | Example                    |
| ------------------------ | ------------------------------------ | -------------------------- |
| `/design-spec`           | Create UI/UX design specification    | `/design-spec {pbi-file}`  |
| `/design`                | Production-grade frontend interfaces | `/design --lane=marketing` |
| `/web-design-guidelines` | WCAG 2.2, responsive, best practices | `/web-design-guidelines`   |

### Process & Collaboration

| Skill         | Purpose                                            | Example       |
| ------------- | -------------------------------------------------- | ------------- |
| `/watzup`     | Review recent changes and wrap up the current work | `/watzup`     |
| `/prioritize` | Re-order remaining backlog when priorities shift   | `/prioritize` |

### Planning & Investigation

| Skill          | Purpose                    | Example                  |
| -------------- | -------------------------- | ------------------------ |
| `/plan`        | Create implementation plan | `/plan {description}`    |
| `/investigate` | Deep code investigation    | `/investigate {feature}` |
| `/code-review` | Review code quality        | `/code-review`           |

---

## Workflow Tutorials

### Workflow 1: Idea to PBI (`idea-to-pbi`)

**Trigger:** "new idea", "feature request", "backlog item"
**Roles:** Product Owner, Business Analyst
**IMPORTANT MANDATORY Steps:** `/idea` → `/refine` → `/story` → `/prioritize`

```
PO:  /idea ──→ [idea captured] ──→ /prioritize ──→ [backlog ordered]
                     │
BA:             /refine ──→ [PBI with AC] ──→ /story ──→ [user stories]
```

---

### Workflow 2: PBI to Tests (`/spec [mode=tests]` + `/artifact-review --type=spec-tests`)

**Trigger:** "test cases from PBI", "qa this"
**Roles:** QA Engineer, QC Specialist
**IMPORTANT MANDATORY Steps:** `/spec [mode=tests]` → `/artifact-review --type=spec-tests` (skill chain — for generated test code, use the **write-integration-test** workflow)

```
QA:  [PBI] ──→ /spec [mode=tests] → [test spec with TC-{FEATURE}-{NNN}]
                                        │
QC:                    /artifact-review --type=spec-tests ──→ [PASS/FAIL report]
```

**Quality gate criteria (pre-QA):**

- All test cases have `TC-{FEATURE}-{NNN}` IDs
- At least 5 categories: positive, negative, edge, authorization, and invariant/property (≥1 universally-quantified property TC + boundary counter-case per [HARD] rule / §5 invariant — see `.claude/skills/shared/tc-format.md`)
- Evidence fields use `[Source: namespace/service/id]` abstract anchors (stack-portable — never `file:line`)

---

### Workflow 3: Design (`/design-spec` → `/design --lane=product` or `/design --lane=marketing`)

**Trigger:** "ui spec", "component spec", "design the", "landing page", "screenshot"
**Roles:** UX Designer, Developer
**IMPORTANT MANDATORY Steps:** `/design-spec` → `/design --lane=product` | `/design --lane=marketing` → `/code-review`

```
UX:   [PBI] ──→ /design-spec ──→ [component spec + states + tokens]
                                        │
                              DESIGN IMPLEMENTATION GATE:
                              Product UIs → /design --lane=product
                              Marketing/Creative → /design --lane=marketing
                                        │
Dev:                             /code-review ──→ Implementation
```

**Design spec checklist:**

- Applicable interaction and async states identified for the target platform
- Configured tokens and shared components mapped when present; otherwise state feature-specific design choices without inventing project-wide systems
- Project styling and class-naming conventions documented; use BEM only when selected
- Accessibility requirements identified (WCAG for web, platform-equivalent guidance where applicable)

---

### Workflow 4: Spec-Driven Feature (`feature`)

**Trigger:** "test-first", "TDD", "spec-driven" (the former tdd-feature workflow was merged into `feature`)
**Roles:** Developer, QA
**IMPORTANT MANDATORY Steps (abridged):** `/investigate` → `/plan` → `/spec [mode=tests]` → `/feature-implement` → `/integration-test` → `/test` → `/docs-update`

Test specs are written **before** implementation, then code is written to satisfy them.

---

## Cross-Role Workflows

Claude provides end-to-end workflows that span multiple roles:

| Workflow              | Roles | Trigger          | Steps                                                                        |
| --------------------- | ----- | ---------------- | ---------------------------------------------------------------------------- |
| `idea-to-pbi` (PO→BA) | PO→BA | "hand off to BA" | `/idea` → `/artifact-review` → `/refine` → `/story` (conditional first step) |

Each workflow tracks progress across roles so the next role has full visibility into upstream artifacts.

---

## Real-World Example

### Employee Photo Upload Feature

**Scenario:** HR wants employees to upload profile photos visible in org charts, directories, and emails.

**Constraints:** Max 5MB, JPG/PNG/WEBP, 200x200px avatar, Azure Blob Storage.

---

#### Day 1: PO Captures the Idea

**Maria (PO):**

```
/idea "Employee profile photo upload for org charts and directories"
```

Claude creates a structured idea document with problem statement, target users, and business value. Maria reviews and marks it ready for BA refinement.

---

#### Day 2: BA Refines and Creates Stories

**Tom (BA):**

```
/refine {idea-file}
```

Claude generates PBI with GIVEN/WHEN/THEN acceptance criteria:

```gherkin
Scenario: Successful photo upload
  Given employee is on profile settings page
  When employee selects a JPG file under 5MB and clicks "Upload"
  Then photo is displayed as 200x200 avatar
  And success message appears

Scenario: Oversized file rejected
  Given employee is on profile settings page
  When employee selects a file over 5MB
  Then error message "File exceeds 5MB limit" appears

Scenario: Invalid format rejected
  When employee selects a GIF file
  Then error message "Only JPG, PNG, WEBP allowed" appears
```

Then Tom creates stories:

```
/story {pbi-file}
```

| Story                              | Points | Slice                       |
| ---------------------------------- | ------ | --------------------------- |
| US-001: Upload photo from settings | 3      | Backend API + Frontend form |
| US-002: Display photo in profile   | 2      | Frontend avatar component   |
| US-003: Show photo in org chart    | 2      | Org chart integration       |
| US-004: Handle upload errors       | 2      | Validation + error UI       |

---

#### Day 3: UX Creates Design Spec

**Sarah (UX):**

```
/design-spec {pbi-file}
```

Claude generates a component spec with the states relevant to the interaction and platform, configured design-token mappings when available, the project's styling convention (BEM only when selected), and accessibility requirements such as visible focus, accessible names, and status announcements where supported.

---

#### Day 4: QA Creates Test Spec

**Alex (QA):**

```
/spec [mode=tests] {pbi-file}
```

Test cases with unified IDs:

| TC ID      | Title                    | Type     |
| ---------- | ------------------------ | -------- |
| TC-TAL-001 | Successful JPG upload    | Positive |
| TC-TAL-002 | Successful PNG upload    | Positive |
| TC-TAL-003 | Reject file > 5MB        | Negative |
| TC-TAL-004 | Reject GIF format        | Negative |
| TC-TAL-005 | Upload with slow network | Edge     |
| TC-TAL-006 | Cancel mid-upload        | Edge     |
| TC-TAL-007 | Replace existing photo   | Positive |

Each case includes an Evidence field using `[Source: namespace/service/id]` abstract anchors (stack-portable — never `file:line`).

---

#### Day 5: QC Runs Quality Gate

**Jordan (QC):**

```
/dor-gate {pbi-file}
```

| Criterion                              | Status |
| -------------------------------------- | ------ |
| Acceptance criteria in GIVEN/WHEN/THEN | PASS   |
| Out of scope defined                   | PASS   |
| Design spec approved                   | PASS   |
| Dependencies identified                | PASS   |
| Test cases have TC IDs                 | PASS   |

**Gate Status: PASS** — Assign to sprint for implementation.

---

## Cheat Sheet

### Skill Tree by Category

```
CAPTURE & REQUIREMENTS
  /idea [title]              Capture new idea
  /refine {source}           Idea -> PBI with AC
  /story {pbi}               PBI -> User stories
  /prioritize [framework]    Order backlog (rice|moscow|value-effort)

TESTING & QUALITY
  /spec [mode=tests] {source}  Generate test specs (TC-{FEATURE}-{NNN})
  /integration-test          Generate integration tests
  /e2e-test                  Generate E2E tests
  /dor-gate {pbi}            Pre-dev gate: PBI vs Definition of Ready
  /artifact-review --type=spec-tests {spec}   Pre-QA gate: test-spec quality
  /production-readiness-review                Pre-release gate: service/API readiness
  /test                      Run and analyze tests

DESIGN
  /design-spec {source}      Create design specification

PROCESS
  /watzup                    Review recent changes and wrap up

PLANNING
  /plan {description}        Create implementation plan
  /investigate {feature}     Deep code investigation
```

### Role Quick Reference

| Role | Primary Skills                                                  | Workflow               |
| ---- | --------------------------------------------------------------- | ---------------------- |
| PO   | `/idea`, `/prioritize`                                          | idea-to-pbi            |
| BA   | `/refine`, `/story`                                             | idea-to-pbi            |
| QA   | `/spec [mode=tests]`, `/integration-test`, `/test`              | write-integration-test |
| QC   | `/dor-gate`, `/artifact-review`, `/production-readiness-review` | —                      |
| UX   | `/design-spec`, `/design`                                       | —                      |

Plan status tracking is not a separate role here: `/plan-execute` updates `plan.md` and phase status inline as it runs.

### Workflow Quick Triggers

| Say This                       | Activates                    | Sequence                                                |
| ------------------------------ | ---------------------------- | ------------------------------------------------------- |
| "new idea" / "feature request" | idea-to-pbi                  | /idea → /refine → /story → /prioritize                  |
| "test this PBI" / "test cases" | `/spec [mode=tests]` (skill) | /spec [mode=tests] → /artifact-review --type=spec-tests |
| "design spec for"              | `/design-spec`               | /design-spec → /design --lane=product                   |
| "TDD" / "test-first"           | feature                      | /plan → /spec [mode=tests] → /feature-implement → /test |

### Common Patterns

**Feature from scratch:**

```
/idea → /refine → /story → /design-spec → /spec [mode=tests] → /plan → /feature-implement → /test
```

**Sprint prep:**

```
/prioritize rice → /dor-gate {pbi-file}
```

**End of day:**

```
/watzup
```

**Before demo:**

```
/production-readiness-review
```

---

## Troubleshooting

### Workflow Not Activating

**Symptom:** Describing your intent doesn't trigger workflow detection.

**Fix:**

1. Use explicit skill command: `/idea "..."` instead of natural language
2. Check `workflows.json`: `cat .claude/workflows.json`
3. On the first task of a session, Claude should auto-detect and activate the matching workflow — if it doesn't, remind it: "Check workflow catalog". Mid-session it deliberately does not auto-activate one; call it (`/start-workflow <id>`, `/workflow-*`) or ask for it in words and it runs

---

### Quality Gate Fails

**Common causes:**

- Missing GIVEN/WHEN/THEN in acceptance criteria
- Test cases without `TC-{FEATURE}-{NNN}` IDs
- No Evidence field in test cases
- Dependencies not documented

**Fix:** Review the gate report and address each failed criterion.

---

### Agent Doesn't Know Project Patterns

**Symptom:** Claude/Codex doesn't seem to know project patterns.

**Fix:**

1. Verify `docs/project-config.json` exists and points at the reference docs
2. Confirm the relevant project-reference root docs are populated — run the matching `/scan-*` if stale or empty
3. Project guidance is read on demand from those docs + `CLAUDE.md`; there is no runtime injection, so a missing or empty doc means the agent won't see it

---

### Handoff Missing Context

**Symptom:** Receiving role doesn't have enough information.

**Fix:**

1. Ensure the sending role's artifacts (idea, PBI, story, design spec, test spec) are complete and saved before the next role picks up
2. Run the gate for that transition to verify artifact completeness — `/dor-gate` (pre-dev), `/artifact-review --type=spec-tests` (pre-QA), `/production-readiness-review` (pre-release)
3. Use `/artifact-review` to validate quality of the upstream artifact (it also carries the PO acceptance checks)

---

## Source Files

| Component       | Location                                            |
| --------------- | --------------------------------------------------- |
| Skills          | `.claude/skills/{skill-name}/SKILL.md`              |
| Workflows       | `.claude/workflows.json`                            |
| Hooks           | `.claude/hooks/`                                    |
| Agents          | `.claude/agents/`                                   |
| Configuration   | `.claude/settings.json`, `docs/project-config.json` |
| Framework Guide | `.claude/docs/claude-ai-agent-framework-guide.md`   |

---

**Need help?** Run `/help` or check [Claude Code documentation](https://claude.com/claude-code).
