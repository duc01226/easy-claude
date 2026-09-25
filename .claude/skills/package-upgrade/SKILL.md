---
name: package-upgrade
version: 1.0.1
description: '[Code Quality] Use when analyzing package upgrades, outdated dependencies, npm/NuGet update plans, or breaking changes.'
---

## Quick Summary

**Goal:** Analyze npm package dependencies, research latest versions and breaking changes, and generate a phased upgrade plan.

**Workflow:**

1. **Inventory** — Discover all package.json files, catalog dependencies and usage
2. **Web Research** — Batch-research latest versions, breaking changes, migration guides (groups of 10)
3. **Risk Assessment** — Categorize risk (Critical/High/Medium/Low), build dependency upgrade order
4. **Report** — Generate comprehensive upgrade report with phased migration plan
5. **Approval Gate** — Present report for user confirmation before any action

**Key Rules:**

- Must read anti-hallucination protocols before executing
- Research only from official sources (npm, GitHub, official docs)
- Declare confidence level; if < 90%, request user verification

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Frontend Package Upgrade Analysis & Planning

You are to operate as an expert frontend package management specialist, npm ecosystem analyst, and software architecture expert to analyze package.json files, research latest versions, collect breaking changes and migration guides, and generate a comprehensive upgrade plan.

**IMPORTANT**: Always thinks hard, plan step by step to-do list first before execute. Always remember to-do list, never compact or summary it when memory context limit reach. Always preserve and carry your to-do list through every operation.

---

## PHASE 1: PACKAGE INVENTORY & CURRENT STATE ANALYSIS

Build package inventory in `tmp/analysis/frontend-package-upgrade-analysis.md`.

### PHASE 1A: INITIALIZATION AND PACKAGE DISCOVERY

Initialize analysis file with:

- `## Metadata` - Original prompt and task description
- `## Progress` - Track phase, items processed, total items
- `## Package Inventory` - All package.json files and dependencies
- `## Version Research Results` - Latest versions and changelogs
- `## Breaking Changes Analysis` - Breaking changes catalog
- `## Migration Complexity Assessment` - Risk levels and effort estimates
- `## Upgrade Strategy` - Phased migration plan

**Find all package.json files**:

```
<frontend-workspace>/package.json
<frontend-workspace>/apps/*/package.json
<frontend-workspace>/libs/*/package.json
```

For each package.json, document:

- Project Name & Location
- Framework Version
- Dependencies (categorized: Framework, UI, Build Tools, Testing, Utilities)
- DevDependencies

Create **Master Package List** consolidating all unique packages.

### PHASE 1B: PACKAGE USAGE ANALYSIS

For each unique package, analyze codebase usage:

- **Projects Using**: Which projects depend on this
- **Import Count**: Number of files importing
- **Key Usage Areas**: Where primarily used
- **Configuration Files**: Config files for this package
- **Upgrade Risk Level**: Low/Medium/High/Critical based on usage breadth

---

## PHASE 2: WEB RESEARCH & VERSION DISCOVERY

**IMPORTANT: BATCH INTO GROUPS OF 10**

For EACH package in Master Package List:

### Latest Version Discovery

- Search: "[package-name] npm latest version"
- Check: https://www.npmjs.com/package/[package-name]
- Extract: Latest stable version, release date, downloads

### Breaking Changes Research

- Search: "[package-name] migration guide [old-version] to [new-version]"
- Search: "[package-name] v[X] breaking changes"
- Search: "[package-name] changelog"
- GitHub: Check CHANGELOG.md, releases

### Ecosystem Compatibility

- Frontend framework version compatibility
- Check peerDependencies
- Cross-package dependencies

Document:

- Current vs. Latest versions
- Version gap (major/minor/patch versions behind)
- Breaking changes with migration steps
- Deprecation warnings
- Peer dependency changes

---

## PHASE 3: RISK ASSESSMENT & PRIORITIZATION

### Risk Categories

- **Critical Risk**: 5+ major versions behind, framework packages, 50+ breaking changes
- **High Risk**: 3-4 major versions, state management, 20-30 breaking changes
- **Medium Risk**: 1-2 major versions, some breaking changes
- **Low Risk**: Patch/minor updates, backward compatible

### Dependency Graph (Upgrade Order)

1. Foundation packages (Node.js, TypeScript)
2. Framework packages (core packages, CLI/build tooling)
3. Framework extensions (Material, RxJS)
4. Third-party libraries
5. Dev tools last

---

## PHASE 4: COMPREHENSIVE REPORT GENERATION

Generate report at `ai_package_upgrade_reports/[YYYY-MM-DD]-frontend-package-upgrade-report.md`:

### Report Structure

1. **Executive Summary**
2. **Package Inventory by Project**
3. **Version Gap Analysis**
4. **Breaking Changes Catalog**
5. **Migration Complexity Assessment**
6. **Ecosystem Compatibility Analysis**
7. **Recommended Upgrade Strategy** (Phased Migration Plan)
8. **Detailed Migration Guides**
9. **Testing Strategy**
10. **Rollback Plan**
11. **Timeline & Resource Estimation**
12. **Appendices**

---

## PHASE 5: APPROVAL GATE

**CRITICAL**: Present comprehensive package upgrade report for explicit approval. **DO NOT** proceed without it.

---

## PHASE 6: CONFIDENCE DECLARATION

Before marking complete, provide:

### Solution Confidence Assessment

**Overall Confidence**: [High 90-100% / Medium 70-89% / Low <70%]

**Evidence Summary**:

- All package.json files discovered: [count]
- Web research completed: [X/Y packages]
- Breaking changes documented: [count]
- Official sources used: npm, GitHub, official docs

**Assumptions Made**: [List or "None"]

**User Confirmation Needed**:

- IF confidence < 90%: "Please verify [specific packages] before proceeding"
- IF confidence >= 90%: "Analysis is comprehensive, ready for migration"

---

## Package Upgrade Guidelines

- **Comprehensive Discovery**: Find ALL package.json files
- **Web Research Accuracy**: Use official sources only (npm, GitHub, official docs)
- **Breaking Changes Focus**: Prioritize identifying breaking changes requiring code changes
- **Risk Assessment**: Evaluate complexity based on breaking changes, usage breadth, dependencies
- **Practical Planning**: Create actionable phased plan with realistic effort estimates
- **Evidence-Based Decisions**: Base ALL recommendations on actual research with sources cited
- **Confidence Declaration**: Declare confidence level; if < 90%, request user confirmation
- **Batch Processing**: Research packages in batches of 10

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `/project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Source/Test Drift:** on source change, evidence-decide whether tests update or source is a bug.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Evidence:** cite `file:line` for every claim; confidence >80% to act, <60% don't recommend.
- **Critical Thinking:** apply critical + sequential thinking; never present a guess as fact.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
