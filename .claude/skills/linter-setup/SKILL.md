---
name: linter-setup
version: 1.0.1
description: '[Quality] Use when a workflow step or the user asks for code quality tooling. Configures linters, formatters, static analysis, pre-commit hooks and CI gates for a tech stack.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Install a strict, stack-appropriate quality sensor layer—linter, formatter, type checker, static/dependency/architecture analysis, pre-commit, and CI—so every code change is checked locally and in CI with zero divergence before reaching main.

**Summary:**

- **Purpose:** Research the current ecosystem per detected stack, let the user choose tools, then configure strict-by-default checks; NEVER hardcode quality-tool recommendations.
- **Ordered path (no skip/reorder):** (1) detect stack/profile; (2) research six categories with QUERY TEMPLATES, score top 3, present 2–3 via `AskUserQuestion`; (3) install/configure strict settings, document rule purpose, update `.gitignore`, ALWAYS emit `.editorconfig`; (4) wire staged-files-only <30s formatter→linter→type-check hook and document `README.md`; (5) mirror format→lint→type→static→dep-scan in CI with coverage diagnostic-only; (6) prove the hook blocks an INTENTIONAL violation; (7) ask whether to continue to `/harness-setup`.
- **Gates:** Track each step/sub-skill with status + evidence; use `AskUserQuestion` for unknown stack/CI fields, tool choices, or loosening; keep local/CI commands, config, and versions identical; line coverage stays diagnostic-only; architecture fitness is `N/A` without declared dependency directions.
- **Output/context:** Root tool configs, pre-commit config, CI quality gate, `.editorconfig`, and README setup; invoked after `/scaffold`, before `/harness-setup`.

**Output:** Config files at project root + pre-commit hook config + CI quality gate step + `.editorconfig`.

**When invoked:** After `/scaffold` in the greenfield workflow, before `/harness-setup`.

**Design principles:**

- **Generic** — Research the detected stack ecosystem; never hardcode quality-tool names.
- **Research-driven** — Score top 3, present 2–3, let the user choose, then configure.
- **Strict-by-default** — Use strictest reasonable settings; loosen only with explicit approval.
- **Purpose-first** — Explain each category's WHY to prevent cargo-cult configuration.
- **Integration-ready** — Run chosen checks locally and in CI with zero divergence.

---

## Stack Detection Protocol

Read in priority order: (1) `plan.md` YAML frontmatter — `tech_stack`, `language`, `framework`; (2) architecture-design report — tech stack comparison table; (3) tech-stack-comparison report — chosen stack.

Extract primary language(s), framework(s), CI provider/tooling, test framework, package manager. Write profile to `tmp/linter-setup/stack-profile.md`:

```markdown
# Stack Profile

Language: {language}
Framework: {framework}
Package Manager: {npm/pip/dotnet/go/cargo/etc}
CI Provider/Tooling: {github-actions/gitlab-ci/azure-pipelines/etc}
Test Framework: {framework}
```

If any critical field undetectable → `AskUserQuestion` to confirm before research.

---

## Tool Research Protocol

**MANDATORY IMPORTANT MUST ATTENTION** — Use QUERY TEMPLATES, not tool names. DO NOT hardcode recommendations; research the detected stack's current ecosystem and present options.

For each tech stack layer detected, research these TOOL CATEGORIES using the query templates below:

| Category                 | Purpose (WHY)                                                      | Research Query Template                                      |
| ------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| **Linter**               | Catch bugs, enforce style, prevent common errors at author time    | `"{language} best linter {year} community standard"`         |
| **Formatter**            | Eliminate style debates, enforce consistent code shape             | `"{language} opinionated code formatter {year}"`             |
| **Type Checker**         | Catch type errors without runtime — strongest computational sensor | `"{language} static type checker {year}"`                    |
| **Static Analyzer**      | Deep bug patterns, complexity, dead code, security CWEs            | `"{language} static analysis SAST tool {year}"`              |
| **Dependency Scanner**   | Known CVEs in dependencies — supply chain security                 | `"{language} dependency vulnerability scanner {year}"`       |
| **Architecture Fitness** | Enforce module boundaries, dependency direction                    | `"{language} architecture linting module boundaries {year}"` |

**Research process per category:**

1. Search with the query template (WebSearch if available; otherwise apply knowledge and state confidence %).
2. Score top 3: community adoption, release recency, CI integration ease, config complexity.
3. Present via `AskUserQuestion`: "For {category} in {language}, which tool?" — top 2–3 options with brief pros/cons.

**IMPORTANT:** Confidence in current ecosystem <80% (fast-moving ecosystem, unfamiliar stack) → use WebSearch to verify before presenting options. — why: tool ecosystems churn fast; stale recommendations cargo-cult dead tools.

### Dependency-Boundary Enforcement (Architecture Fitness detail — options, not defaults)

The **Architecture Fitness** category chooses **dependency-direction / module-boundary** enforcement from the `architecture-design` "Arch rules / fitness" scaffold handoff. The following are **example candidates to research and evaluate for stack fit**, never mandatory installs. Research the current ecosystem, present the top 2–3 via `AskUserQuestion`, and let the user confirm:

| Stack family | Example dependency-boundary tools (evaluate, do NOT hardcode) |
| ------------ | ------------------------------------------------------------ |
| JS / TS | dependency-cruiser, eslint-plugin-boundaries (eslint-boundaries), Nx module-boundary lint |
| .NET | NetArchTest, ArchUnitNET |
| JVM | ArchUnit |
| Python | import-linter |
| Go | go-arch-lint / depguard |

Add a boundary tool only when architecture declares dependency directions; otherwise record `N/A — no cross-module dependency rules declared`. Chosen rules MUST encode those directions and fail CI, matching pre-commit (local↔CI zero divergence). `architecture-scalability-review` owns init/audit grading; `architecture-review` owns per-change drift. — why: a boundary tool without declared rules is ceremony; enforcement without CI teeth is documentation.

---

## Installation & Configuration Protocol

After user selects tools:

1. Generate install command for detected package manager
2. Generate config file with STRICTEST reasonable defaults — starting strict is easier to loosen; loosen ONLY with explicit user approval via `AskUserQuestion`.
3. Document what each enabled rule group catches and why (one line each)
4. Generate sample config file: `.{tool}rc`, `{tool}.config.{ext}`, `pyproject.toml` section, etc.
5. Add tool cache directories to `.gitignore`

**`.editorconfig` (ALWAYS generate — stack-agnostic):**

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

Adjust `indent_size` and `end_of_line` to detected stack conventions.

---

## Pre-Commit Hook Setup

> **Framework names are glue, not quality-tool defaults.** Pre-commit framework selection may follow stack conventions; quality tools invoked inside hooks remain the research-driven selections above.

Detect pre-commit framework for the stack:

- Node.js / JavaScript / TypeScript → Husky + lint-staged OR lefthook (research current community preference)
- Python → pre-commit framework (`pre-commit` package)
- Configured backend/runtime stack → restore/install analyzer tools + custom `.git/hooks/pre-commit` shell script
- Go → pre-commit framework or custom Makefile target
- Rust → cargo-husky OR pre-commit framework
- Java / Kotlin → pre-commit framework or Maven/Gradle Git hooks plugin
- Ruby → overcommit OR pre-commit framework

Configure hooks in this order (fastest first):

1. Formatter (check only — do not auto-fix in hook)
2. Linter (fail on any error)
3. Type-check (fail on any error)

**Performance constraint:** Hooks MUST run in <30 seconds total. If slower:

- Configure to run only on staged files (not full codebase)
- Defer slow checks (static analysis, full type-check) to CI only

Generate:

- Hook config file (`.husky/pre-commit`, `.lefthook.yml`, `.pre-commit-config.yaml`, etc.)
- `README.md` section: "## Code Quality — Pre-commit Hooks" with setup instructions for new team members

---

## CI Quality Gate Configuration

Detect CI provider/tooling from repository files:

- `.github/workflows/` → GitHub Actions
- `.gitlab-ci.yml` → GitLab CI
- `azure-pipelines.yml` → Azure Pipelines
- `Jenkinsfile` → Jenkins
- `bitbucket-pipelines.yml` → Bitbucket Pipelines

If not detected → `AskUserQuestion`: "Which CI provider/tooling does this repository use?"

Generate a CI job/step that:

1. Restores tool cache (install only on cache miss)
2. Runs formatter check (fail on diff — `--check` mode, no auto-fix)
3. Runs linter (fail on any error)
4. Runs type checker (fail on any error)
5. Runs static analyzer (fail on configurable complexity/duplication threshold)
6. Runs dependency vulnerability scanner (fail on HIGH/CRITICAL CVEs)
7. Reports line coverage as DIAGNOSTIC only — NEVER fail on a coverage %. Low coverage signals untested areas; high coverage does not prove quality. If a test-strength gate is wanted, ask `AskUserQuestion`: "Configure a mutation-testing tool (e.g. Stryker / PITest / mutmut, per stack) as the CI test-quality gate?" Gate on mutation score (a surviving mutant = missing/weak assertion); report line coverage but do not gate on it. Keep behavior/change-coverage meaningful: each behavior-changing file tests the changed outcome.

**MANDATORY:** CI gate must match pre-commit hooks. If a check runs locally, it runs in CI. No divergence.

---

## Verification Checklist

After all config files generated, verify MUST ATTENTION each item:

- Config files exist at project root (linter, formatter, type-checker configs)
- `.editorconfig` created at project root
- Pre-commit hook fires on `git commit` — test with an intentional violation (e.g., add a lint error, attempt commit, verify hook blocks)
- CI step defined and references the correct config files
- Team setup documented in `README.md` — new devs know to run `{hook install command}` after clone
- `.gitignore` updated with tool cache directories

---

## Next Steps

`AskUserQuestion`:

- **"/harness-setup continues (Recommended)"** — Set up feedforward guides + inferential sensors to complete the outer harness
- **"/feature-implement"** — Skip harness inventory and begin implementation
- **"Skip"** — Continue manually

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `engineering-foundation-gate` — Seven engineering-foundation dimensions judged by project profile; creating or reviewing how a project is built, run, tested or checked → .claude/skills/shared/protocols/engineering-foundation-gate.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md

<!-- PROTOCOL-GUIDES:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:engineering-foundation-gate:reminder -->

**IMPORTANT MUST ATTENTION** engineering-foundation gate — judges whether the team can build, run, test, and change the system repeatably as it grows. Derive lifecycle, scale, criticality, repository shape, and runtime from evidence; take the lower supported tier when unknown. Judge all 7 dimensions, using `N/A-by-profile` with evidence when a concern truly does not apply. **F1** reproducible build/run/test path · **F2** document and exercise each supported or required execution mode; dual host/container or other modes only when the project uses or needs them · **F3** environment portability at applicable local/CI/production-shaped targets · **F4** meaningful test-strength evidence without making one mutation tool universal · **F5** measured performance where scale/risk warrants it · **F6** change/build scalability where the repository has meaningful module boundaries · **F7** mechanical checks selected for the stack/profile. For each, judge outcomes rather than tools, and preserve anti-over-engineering. Foundation creation may block on missing warranted outcomes; brownfield audits advise and name the smallest next step. Catalog → `.claude/docs/engineering-foundation-catalog.md` (update first, then re-run `inject_engineering_foundation_gate.py`).

<!-- /SYNC:engineering-foundation-gate:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `/project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Install a strict, stack-appropriate quality sensor layer—linter, formatter, type checker, static/dependency/architecture analysis, pre-commit, and CI—so every code change is checked locally and in CI with zero divergence before reaching main.

**IMPORTANT MUST ATTENTION Main steps (in order — no skip/reorder):** (1) detect stack/profile → (2) research six categories with QUERY TEMPLATES, score top 3, present 2–3 via `AskUserQuestion` → (3) install/configure strict settings, document rule purpose, update `.gitignore`, ALWAYS emit `.editorconfig` → (4) wire staged-files-only <30s formatter→linter→type-check hook and document `README.md` → (5) mirror format→lint→type→static→dep-scan in CI with coverage diagnostic-only → (6) prove the hook blocks an INTENTIONAL violation → (7) ask whether to continue to `/harness-setup`.

**IMPORTANT MUST ATTENTION Gates:** Track each step/sub-skill with status + evidence; use `AskUserQuestion` for unknown stack/CI fields, tool choices, or loosening; keep local/CI commands, config, and versions identical; line coverage stays diagnostic-only; architecture fitness is `N/A` without declared dependency directions.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** MUST ATTENTION apply critical/sequential thinking; cite proof, NEVER present guess as fact.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** use QUERY TEMPLATES in Tool Research — NEVER hardcode tool names in the research phase; research the detected stack's current ecosystem and present options — why: tool ecosystems churn fast, hardcoded names cargo-cult dead tools.
**IMPORTANT MUST ATTENTION** present top 2-3 options per category via `AskUserQuestion` — let the user pick; NEVER auto-select — why: tool choice is a team-owned decision, not the skill's.
**IMPORTANT MUST ATTENTION** verify the pre-commit hook fires with an INTENTIONAL violation (add a lint error, attempt commit, confirm it blocks) before marking complete — why: an unproven gate is no gate.
**IMPORTANT MUST ATTENTION** CI gate MUST match pre-commit hooks — if a check runs locally it runs in CI, no divergence — why: divergent local/CI checks let violations slip through one path.

**MUST ATTENTION** detect the stack FIRST (`plan.md` → architecture report → tech-stack report); if a critical field is undetectable, `AskUserQuestion` before research — why: every downstream tool choice depends on the stack profile.
**MUST ATTENTION** configure with the STRICTEST reasonable defaults; loosen ONLY with explicit user approval via `AskUserQuestion` — why: starting strict is easier to loosen than starting loose is to tighten.
**MUST ATTENTION** ALWAYS emit a stack-agnostic `.editorconfig` and add tool cache dirs to `.gitignore` — why: editorconfig is the one truly portable cross-tool baseline; cached artifacts must never be committed.
**MUST ATTENTION** order hooks formatter→linter→type-check, staged-files-only, <30s; defer slow checks (static analysis, full type-check) to CI — why: a slow hook gets bypassed, killing local feedback.
**MUST ATTENTION** report line-coverage as a DIAGNOSTIC only — NEVER fail the build on a coverage %; gate on mutation score if a test-strength gate is wanted — why: high coverage is not evidence of assertion quality.
**MUST ATTENTION** pre-commit hook framework names ARE allowed (ecosystem glue, not research choices) — the quality tools invoked inside them are the research-driven selections — why: keep the generic/research boundary clear.

**MUST ATTENTION** when confidence in the current ecosystem is <80% (fast-moving or unfamiliar stack), use WebSearch to verify before presenting options — cite confidence % for every recommendation; <60% DO NOT recommend — why: stale tool advice fails silently.
**MUST ATTENTION** grep/glob the repo for 3+ existing config/CI patterns before generating new ones — match the project's existing layout, don't impose a foreign convention — why: a config that fights local convention gets reverted.
**MUST ATTENTION** evaluate fit before copying a nearby config — verify the new stack shares the same package manager, CI provider, and conventions as the source — why: closest example ≠ matching preconditions.
**MUST ATTENTION** bootstrap a `TaskCreate` breakdown (one task per category/config file + a final verification task) BEFORE acting; keep exactly one task `in_progress` — why: long research/config work loses context without external tracking.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| "I know the best linter for this stack"          | Ecosystems churn — research current options, present 2-3 via `AskUserQuestion`. Hardcoding = stale. |
| "Strict defaults are too aggressive, loosen now" | Start strict; loosen ONLY with explicit user approval. Easier to loosen than to tighten later.      |
| "Hook works, no need to test it"                 | Fire an INTENTIONAL violation and confirm it blocks. Unproven gate = no gate.                       |
| "Local checks are enough, skip CI"               | CI gate MUST mirror pre-commit. No divergence — a local-only check is bypassable.                   |
| "Coverage % is high, gate on it"                 | Coverage is diagnostic only. Gate on mutation score; high coverage ≠ strong assertions.            |
| "Simple stack, skip task tracking"               | Still bootstrap `TaskCreate`. Skip depth, never skip tracking.                                      |

**IMPORTANT MUST ATTENTION** use QUERY TEMPLATES — NEVER hardcode tool names; present top 2-3 via `AskUserQuestion`.
**IMPORTANT MUST ATTENTION** prove the pre-commit hook blocks an intentional violation before declaring complete.
**IMPORTANT MUST ATTENTION** CI gate must match pre-commit hooks — zero divergence between local and CI checks.

**[TASK-PLANNING]** Before acting, analyze task scope and break it into small todo tasks using `TaskCreate`.
