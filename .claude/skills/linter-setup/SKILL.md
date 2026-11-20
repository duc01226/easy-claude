---
name: linter-setup
version: 1.1.0
description: '[Quality] Use when a workflow step or the user asks for linters, formatters, type checks and static analysis in pre-commit and CI gates.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `/start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Install a strict, stack-appropriate quality sensor layer—linter, formatter, type checker, static/dependency/architecture analysis, pre-commit, and CI—so every code change is checked locally and in CI with zero divergence before reaching main.

**Summary:**

- **Purpose:** Research the current ecosystem per detected stack, let the user choose tools, then configure strict-by-default checks; NEVER hardcode quality-tool recommendations.
- **Ordered path (no skip/reorder):** (1) detect stack/profile; (2) research seven categories with QUERY TEMPLATES, score top 3, present 2–3 via `ask user question tool`; (3) install/configure strict settings, document rule purpose, update `.gitignore`, ALWAYS emit `.editorconfig`; (4) wire staged-files-only <30s formatter→linter→type-check hook and document `README.md`; (5) mirror format→lint→type→static→dep-scan in CI with coverage diagnostic-only; (6) prove the hook blocks an INTENTIONAL violation; (7) ask whether to continue to `/harness-setup`.
- **Gates:** Track each step/sub-skill with status + evidence; use `ask user question tool` for unknown stack/CI fields, tool choices, or loosening; keep local/CI commands, config, and versions identical; line coverage stays diagnostic-only; architecture fitness is `N/A` without declared dependency directions.
- **Output/context:** Root tool configs, pre-commit config, CI quality gate, `.editorconfig`, and README setup; invoked after `/scaffold`, before `/harness-setup`.
- **Existing projects (brownfield):** inventory what already runs, add only the missing checks, and land each with a frozen baseline that only shrinks, so the existing tree never turns red — read `references/brownfield-ratchet.md`.

**Output:** Config files at project root + pre-commit hook config + CI quality gate step + `.editorconfig`.

**When invoked:** After `/scaffold` in the greenfield workflow, before `/harness-setup`. On an existing project (from `/project-init`'s harness offer, an upgrade action, or a direct call), also follow the brownfield ratchet path in `references/brownfield-ratchet.md`; `--mode=brownfield` forces that path and `--mode=greenfield` skips it.

**Design principles:**

- **Generic** — Research the detected stack ecosystem; never hardcode quality-tool names.
- **Research-driven** — Score top 3, present 2–3, let the user choose, then configure.
- **Strict-by-default** — Use strictest reasonable settings; loosen only with explicit approval.
- **Purpose-first** — Explain each category's WHY to prevent cargo-cult configuration.
- **Integration-ready** — Run chosen checks locally and in CI with zero divergence.

---

## Contents

- [Quick Summary](#quick-summary)
- [Stack Detection Protocol](#stack-detection-protocol)
- [Tool Research Protocol](#tool-research-protocol)
- [Installation & Configuration Protocol](#installation--configuration-protocol)
- [Pre-Commit Hook Setup](#pre-commit-hook-setup)
- [CI Quality Gate Configuration](#ci-quality-gate-configuration)
- [Verification Checklist](#verification-checklist)
- [Next Steps](#next-steps)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Stack Detection Protocol

Read in priority order: (1) `plan.md` YAML frontmatter — `tech_stack`, `language`, `framework`; (2) `architecture --mode=design` report — tech stack comparison table; (3) tech-stack-comparison report — chosen stack; (4) repository evidence — manifests, lockfiles, existing tool configs, CI files and the project config. An existing project usually has no plan or architecture report, so (4) is its primary source, and existing source code selects the brownfield path (`references/brownfield-ratchet.md`).

Extract primary language(s), framework(s), CI provider/tooling, test framework, package manager. Write profile to `tmp/linter-setup/stack-profile.md`:

```markdown
# Stack Profile

Language: {language}
Framework: {framework}
Package Manager: {npm/pip/dotnet/go/cargo/etc}
CI Provider/Tooling: {github-actions/gitlab-ci/azure-pipelines/etc}
Test Framework: {framework}
```

If any critical field undetectable → `ask user question tool` to confirm before research.

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
| **Restricted APIs**      | Ban a raw API the project wraps or forbids; the error names the wrapper to use | `"{language} {linter} ban import or function call rule {year}"` |

**Research process per category:**

1. Search with the query template (WebSearch if available; otherwise apply knowledge and state confidence %).
2. Score top 3: community adoption, release recency, CI integration ease, config complexity.
3. Present via `ask user question tool` in the **Asking the user** format below: top 2–3 options, recommended first, each with a plain-language trade-off.

**IMPORTANT:** Confidence in current ecosystem <80% (fast-moving ecosystem, unfamiliar stack) → use WebSearch to verify before presenting options. — why: tool ecosystems churn fast; stale recommendations cargo-cult dead tools.

### Dependency-Boundary Enforcement (Architecture Fitness detail — options, not defaults)

The **Architecture Fitness** category chooses **dependency-direction / module-boundary** enforcement from the `architecture --mode=design` "Arch rules / fitness" scaffold handoff. The following are **example candidates to research and evaluate for stack fit**, never mandatory installs. Research the current ecosystem, present the top 2–3 via `ask user question tool`, and let the user confirm:

| Stack family | Example dependency-boundary tools (evaluate, do NOT hardcode) |
| ------------ | ------------------------------------------------------------ |
| JS / TS | dependency-cruiser, eslint-plugin-boundaries (eslint-boundaries), Nx module-boundary lint |
| .NET | NetArchTest, ArchUnitNET |
| JVM | ArchUnit |
| Python | import-linter |
| Go | go-arch-lint / depguard |

Add a boundary tool only when architecture declares dependency directions — the design report, or `architectureRules.layerBoundaries` in the project config, which `/project-config` fills from evidence; otherwise record `N/A — no cross-module dependency rules declared`. Chosen rules MUST encode those directions and fail CI, matching pre-commit (local↔CI zero divergence). `architecture --mode=scalability` owns init/audit grading; `architecture --mode=review` owns per-change drift. — why: a boundary tool without declared rules is ceremony; enforcement without CI teeth is documentation.

**Generate from `architectureRules`.** When `layerBoundaries` is declared, generate the tool's rules from it (one rule per `cannotImportFrom` entry, `excludePatterns` as the tool's ignore list), baseline today's violations (`references/brownfield-ratchet.md` Step B4), and record `architectureRules.enforcedBy` (`tool`, `config`, optional `command`) through `/project-config` with the user's yes. `layerBoundaries` stays the one place to change a rule: edit it, then regenerate the tool config. Once `enforcedBy` is declared, reviewers read the tool's result instead of grepping imports.

### Restricted APIs (Architecture Fitness detail)

**What it catches, in plain words:** when the project wraps a risky or tricky API (an HTTP client with retries and auth, a database access layer, a logging facade, a date/time helper, a secrets loader) or forbids a dangerous call, a lint rule bans the raw API everywhere except the wrapper, so the right path is the only one that passes.

1. **Candidates come from evidence only:** a module that imports a third-party API and exports a narrower one; a project doc, review rule or lesson that says "use X, not Y"; repeated review findings about the same raw call. Never invent a ban.
2. **The message names the fix:** each rule's message says what to use instead and why, for example `"Use <wrapper> (<path>): it adds <what the raw call skips>."`, so whoever trips it learns the rule from the error.
3. **Wrapper-only exceptions:** exempt only the wrapper's own files with a file-scoped override; a test that must touch the raw API gets its own named override with its reason. Never exempt a whole directory to make the rule pass.
4. **Existing uses go into the baseline** (`references/brownfield-ratchet.md` Step B4); migrating them is separate, consented work.
5. **Ask once per ban** (format below): what it bans, the wrapper to use instead, and how many existing uses get baselined.

Example mechanisms to research and evaluate for stack fit, never mandatory installs:

| Stack family | Example ban mechanisms (evaluate, do NOT hardcode) |
| ------------ | -------------------------------------------------- |
| JS / TS | ESLint `no-restricted-imports`, `no-restricted-syntax`, `no-restricted-properties` |
| Python | Ruff banned-API setting (`flake8-tidy-imports`, TID251) |
| .NET | BannedApiAnalyzers (`BannedSymbols.txt`) |
| JVM / Kotlin | detekt `ForbiddenImport` / `ForbiddenMethodCall`, ArchUnit rules |
| Go | golangci-lint `forbidigo`, `depguard` |

No wrapper and no banned-API rule evidenced → record `N/A — no wrapper or banned-API rule evidenced`. — why: a wrapper that nothing enforces is bypassed by the next change that does not know it exists.

### Asking the user

Every tool or rule question has one shape, so a user who knows no tool names can still choose. Tool choice stays the team's: never auto-select.

1. **One plain sentence on what the category catches**, without jargon, for example: "A type checker finds values used as the wrong kind of thing before the code runs."
2. **Options ordered recommended first.** The first is labelled `(Recommended)`, with a one-line reason from the research score (adoption, fit with what the project already runs, CI ease).
3. **One plain trade-off line per option:** what it costs and what it gives.
4. **A last `Skip for now` option** for a category the profile does not require; a skip is recorded as `declined` with the user's reason in the harness inventory.

One question per category; never fold several categories into one bundled choice. — why: a novice cannot weigh tool names, but can weigh plain consequences.

---

## Installation & Configuration Protocol

After user selects tools:

1. Generate install command for detected package manager
2. Generate config file with STRICTEST reasonable defaults — starting strict is easier to loosen; loosen ONLY with explicit user approval via `ask user question tool`.
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

If not detected → `ask user question tool`: "Which CI provider/tooling does this repository use?"

Generate a CI job/step that:

1. Restores tool cache (install only on cache miss)
2. Runs formatter check (fail on diff — `--check` mode, no auto-fix)
3. Runs linter (fail on any error)
4. Runs type checker (fail on any error)
5. Runs static analyzer (fail on configurable complexity/duplication threshold)
6. Runs dependency vulnerability scanner (fail on HIGH/CRITICAL CVEs). Name who responds when it fails and by when — an alert owner and a deadline per severity, recorded in `docs/project-config.json` → `dependencySecurity` when the project keeps one — and recommend a scheduled full scan of the default branch beside this per-change check, because advisories published after a merge never fail a per-change check. Remediation of its findings is `/package-upgrade --mode=remediate`. For a multi-ecosystem repository, or when CI needs one SARIF file for code scanning, use OSV-Scanner as the cross-ecosystem scanner (runbook: `.claude/skills/package-upgrade/references/ecosystems.md`); treat its exit `128` (no packages found) as a broken scan, not a pass.
7. Reports line coverage as DIAGNOSTIC only — NEVER fail on a coverage %. Low coverage signals untested areas; high coverage does not prove quality. If a test-strength sensor is warranted, choose assertion-intent, contract, property or mutation evidence by profile, risk, tooling and budget under the shared Harness Engineering owner; ask before installing an optional tool. A mutation-score threshold applies only when justified and selected; report line coverage but do not gate on it. Keep behavior/change-coverage meaningful: each behavior-changing file tests the changed outcome.

**MANDATORY:** CI gate must match pre-commit hooks. If a check runs locally, it runs in CI. No divergence.

---

## Verification Checklist

After all config files generated, verify MUST ATTENTION each item:

- Config files exist at project root (linter, formatter, type-checker configs)
- `.editorconfig` created at project root
- Pre-commit verification runs in an isolated temporary fixture repository using the selected hook configuration and tooling, never the working repository. Snapshot the working repository HEAD and index bytes before the probe and verify both unchanged afterward. In the fixture, stage a synthetic lint violation, attempt the fixture commit, and require nonzero status plus the selected linter’s diagnostic for that exact file/rule; an unrelated authority hook rejection is not proof. Also test an absent/broken-hook fixture: a successful fixture commit must be reported as a failed hook-verification result. Include a clean valid fixture that succeeds to discriminate unrelated failures; remove fixture artifacts in finally. Setup authorization grants no real-project commit authority.
- CI step defined and references the correct config files
- Existing project: every new check has its baseline committed, and the fixture proof also shows a baselined violation passing while a new one of the same rule fails (`references/brownfield-ratchet.md` Step B6)
- The dependency scanner has a named responder and deadline (or the user declined to name one, recorded)
- Team setup documented in `README.md` — new devs know to run `{hook install command}` after clone
- `.gitignore` updated with tool cache directories

---

## Next Steps

> **Inside a workflow:** when this skill runs as a step of an active workflow, skip the prompts in this section and return the result — the workflow's next step decides what runs (`/start-workflow` → Step Execution Protocol, Workflow-step mode).

`ask user question tool`:

- **"/harness-setup continues (Recommended)"** — Set up feedforward guides + inferential sensors to complete the outer harness
- **"/feature-implement"** — Skip harness inventory and begin implementation
- **"Skip"** — Continue manually

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. This prevents context loss from long files. Keep task depth proportional to the work.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `engineering-foundation-gate` — Seven engineering-foundation dimensions judged by project profile; creating or reviewing how a project is built, run, tested or checked → .claude/skills/shared/protocols/engineering-foundation-gate.md

<!-- PROTOCOL-GUIDES:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `/start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:engineering-foundation-gate:reminder -->

**IMPORTANT MUST ATTENTION** evidence-backed lifecycle/scale/criticality/repo/runtime profile; unknowns take lower tiers. Judge all 7 outcomes: **F1** reproducible build/run/test · **F2** exercise supported/required modes; dual modes only when warranted · **F3** applicable local/CI/production-shaped test portability · **F4** test-strength proof; no universal mutation tool · **F5** measured performance at warranted scale/risk · **F6** build/test/CI cost grows with the change: measured stage times, affected-only scope, whole-app stages named; the current layout never justifies `N/A` · **F7** stack/profile-fit mechanical checks. Evidence-backed `N/A-by-profile` is valid; prevent over-engineering. Creation blocks warranted omissions; brownfield advises without score changes, with smallest next steps. Catalog: `.claude/docs/engineering-foundation-catalog.md`; update first, re-run `inject_engineering_foundation_gate.py`.

<!-- /SYNC:engineering-foundation-gate:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Install a strict, stack-appropriate quality sensor layer—linter, formatter, type checker, static/dependency/architecture analysis, pre-commit, and CI—so every code change is checked locally and in CI with zero divergence before reaching main.

**IMPORTANT MUST ATTENTION Main steps (in order — no skip/reorder):** (1) detect stack/profile → (2) research seven categories with QUERY TEMPLATES, score top 3, present 2–3 via `ask user question tool` → (3) install/configure strict settings, document rule purpose, update `.gitignore`, ALWAYS emit `.editorconfig` → (4) wire staged-files-only <30s formatter→linter→type-check hook and document `README.md` → (5) mirror format→lint→type→static→dep-scan in CI with coverage diagnostic-only → (6) prove the hook blocks an INTENTIONAL violation → (7) ask whether to continue to `/harness-setup`.

**IMPORTANT MUST ATTENTION Gates:** Track each step/sub-skill with status + evidence; use `ask user question tool` for unknown stack/CI fields, tool choices, or loosening; keep local/CI commands, config, and versions identical; line coverage stays diagnostic-only; architecture fitness is `N/A` without declared dependency directions.

**IMPORTANT MUST ATTENTION** use QUERY TEMPLATES in Tool Research — NEVER hardcode tool names in the research phase; research the detected stack's current ecosystem and present options — why: tool ecosystems churn fast, hardcoded names cargo-cult dead tools.
**IMPORTANT MUST ATTENTION** present top 2-3 options per category via `ask user question tool` — let the user pick; NEVER auto-select — why: tool choice is a team-owned decision, not the skill's.
**IMPORTANT MUST ATTENTION** Test pre-commit only in an isolated temporary fixture: lint-specific rejection, valid success and absent-hook failure classification; preserve the working HEAD/index and clean fixture artifacts — why: an unproven gate is no gate.
**IMPORTANT MUST ATTENTION** CI gate MUST match pre-commit hooks — if a check runs locally it runs in CI, no divergence — why: divergent local/CI checks let violations slip through one path.
**IMPORTANT MUST ATTENTION** on an existing project, inventory first and land every new check with a frozen baseline that only shrinks — never a red tree, never a mass rewrite in the setup commit; unknown monorepo shape → propose, don't apply — why: a check that fails on day one gets switched off.
**IMPORTANT MUST ATTENTION** ask each tool question in plain words with the recommended option first, one question per category — why: the team owns tool choice, and a novice can weigh plain consequences but not tool names.

**MUST ATTENTION** detect the stack FIRST (`plan.md` → architecture report → tech-stack report); if a critical field is undetectable, `ask user question tool` before research — why: every downstream tool choice depends on the stack profile.
**MUST ATTENTION** configure with the STRICTEST reasonable defaults; loosen ONLY with explicit user approval via `ask user question tool` — why: starting strict is easier to loosen than starting loose is to tighten.
**MUST ATTENTION** ALWAYS emit a stack-agnostic `.editorconfig` and add tool cache dirs to `.gitignore` — why: editorconfig is the one truly portable cross-tool baseline; cached artifacts must never be committed.
**MUST ATTENTION** order hooks formatter→linter→type-check, staged-files-only, <30s; defer slow checks (static analysis, full type-check) to CI — why: a slow hook gets bypassed, killing local feedback.
**MUST ATTENTION** report line-coverage as a DIAGNOSTIC only — NEVER fail the build on a coverage %; choose profile-fit intent evidence if a test-strength sensor is warranted — why: high coverage is not evidence of assertion quality.
**MUST ATTENTION** pre-commit hook framework names ARE allowed (ecosystem glue, not research choices) — the quality tools invoked inside them are the research-driven selections — why: keep the generic/research boundary clear.

**MUST ATTENTION** when confidence in the current ecosystem is <80% (fast-moving or unfamiliar stack), use WebSearch to verify before presenting options — cite confidence % for every recommendation; <60% DO NOT recommend — why: stale tool advice fails silently.
**MUST ATTENTION** grep/glob the repo for 3+ existing config/CI patterns before generating new ones — match the project's existing layout, don't impose a foreign convention — why: a config that fights local convention gets reverted.
**MUST ATTENTION** evaluate fit before copying a nearby config — verify the new stack shares the same package manager, CI provider, and conventions as the source — why: closest example ≠ matching preconditions.
**MUST ATTENTION** bootstrap a `TaskCreate` breakdown (one task per category/config file + a final verification task) BEFORE acting; keep exactly one task `in_progress` — why: long research/config work loses context without external tracking.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| "I know the best linter for this stack"          | Ecosystems churn — research current options, present 2-3 via `ask user question tool`. Hardcoding = stale. |
| "Strict defaults are too aggressive, loosen now" | Start strict; loosen ONLY with explicit user approval. Easier to loosen than to tighten later.      |
| "Hook works, no need to test it"                 | Fire an INTENTIONAL violation and confirm it blocks. Unproven gate = no gate.                       |
| "Local checks are enough, skip CI"               | CI gate MUST mirror pre-commit. No divergence — a local-only check is bypassable.                   |
| "Coverage % is high, gate on it"                 | Coverage is diagnostic only. Gate on mutation score; high coverage ≠ strong assertions.            |
| "Simple stack, skip task tracking"               | Still bootstrap `TaskCreate`. Skip depth, never skip tracking.                                      |

**IMPORTANT MUST ATTENTION** use QUERY TEMPLATES — NEVER hardcode tool names; present top 2-3 via `ask user question tool`.
**IMPORTANT MUST ATTENTION** prove the pre-commit hook blocks an intentional violation before declaring complete.
**IMPORTANT MUST ATTENTION** CI gate must match pre-commit hooks — zero divergence between local and CI checks.

**[TASK-PLANNING]** Before acting, analyze task scope and break it into small todo tasks using `TaskCreate`.
