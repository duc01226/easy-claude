# Harness inventory — where it lives, how to detect it, what it holds

Read this when you write, update or read a project's harness inventory: `$harness-setup` Phase F, `$project-init`'s harness inventory step, and `$linter-setup`'s brownfield Step B1. This file owns the inventory's path, detection rules and format; the callers only say when to run it.

**Rules first:**

- **One committed home.** The inventory is `harness-inventory.md` under the project-reference root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path). Later sessions and task-start checks read it there. A legacy `tmp/harness/harness-inventory.md` is merged into it once and then left alone.
- **Detecting writes nothing.** Detection only reads files and runs no tool. `$harness-setup` writes the file as part of the setup the user asked for; any other caller (`$project-init`, `$linter-setup`) asks the user before creating or changing it.
- **Every row cites evidence** (`path:line`, a config key or a command). Unknown is a gap, never a pass.
- **Living document.** Update a row whenever a sensor is added, proven, baselined or declined.
- **The task-start readiness check reads the Summary.** `.claude/scripts/harness-readiness.cjs` takes the first two columns (Sensor, Status) of the Summary table: `proven`, `declined` and `n/a` settle a check, so keep the sensor names and status words exactly as in the Detection table.

## Contents

- [Detection](#detection)
- [Format](#format)

## Detection

| Sensor                  | Where to look                                                                                                                                 | Status values                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Formatter               | `formatting.command`; formatter configs; manifest scripts                                                                                     | `proven` · `configured` · `missing` · `declined` · `n/a` |
| Linter                  | `testing.commands.lint` / `lintFile`; linter configs; manifest scripts                                                                        | same                                                     |
| Type check              | `testing.commands.typecheck`; type-checker configs; compiler settings                                                                         | same                                                     |
| Tests                   | `testing.commands`; test runner configs; test folders                                                                                         | same                                                     |
| Verify command          | `testing.commands.verify` or `affected`                                                                                                       | same                                                     |
| Pre-commit hook         | `.husky/`, `.pre-commit-config.yaml`, `lefthook.yml` or another committed hook config (`.git/hooks` is local to one clone and does not count) | same                                                     |
| CI quality gate         | `.github/workflows/`, `.gitlab-ci.yml`, `azure-pipelines.yml`, `Jenkinsfile`, `bitbucket-pipelines.yml`                                       | same                                                     |
| Architecture boundaries | `architectureRules.layerBoundaries` and `architectureRules.enforcedBy` in the project config                                                  | same                                                     |
| Restricted APIs         | ban rules in the linter config (see `$linter-setup` → Restricted APIs)                                                                        | same                                                     |
| Dependency scan         | scanner config, CI step, `dependencySecurity`                                                                                                 | same                                                     |
| Runtime                 | see below                                                                                                                                     | `configured` · `derivable` · `none` · `not-applicable`   |

Status meanings: `proven` = it ran and passed, or failed only on baselined entries, with the evidence named; `configured` = the config exists but no run is recorded, or it is not wired into the pre-commit hook or CI; `missing` = nothing found; `declined` = the user said no (record the date and their reason, so nobody asks again unprompted); `n/a` = evidence shows the category does not fit this project (for example, no second module for boundaries).

**Runtime row.** It says whether an agent can start and drive the app, for runtime review. It is informational: it never triggers a setup offer by itself.

| Value            | Evidence                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| `configured`     | `experienceVerification.surfaces[].localRun` is declared                                         |
| `derivable`      | a manifest script, compose file or documented command starts the app, but no surface declares it |
| `none`           | the project has a runnable surface (UI, API, CLI, service) and nothing found starts it           |
| `not-applicable` | evidence shows no runnable surface, for example a library with no entry point; cite it           |

## Format

```markdown
# Harness Inventory

Updated: {date}
Stack: {detected stack}

## Summary

| Sensor    | Status                                           | Evidence                  | Command                | Baseline                        | Next step           |
| --------- | ------------------------------------------------ | ------------------------- | ---------------------- | ------------------------------- | ------------------- |
| Formatter | {status}                                         | {path:line or config key} | `{command}`            | {file, `command-level` or none} | {offer, owner or —} |
| Linter    | …                                                | …                         | …                      | …                               | …                   |
| Runtime   | {configured / derivable / none / not-applicable} | {evidence}                | `{start command or —}` | —                               | —                   |

## Testability & Verification Contract

Copy the resolved `test-strategy.md` matrix into this inventory and keep the status current:

**Status:** `PASS | PARTIAL | BLOCKED`

| Tier               | Applicability + evidence          | Owner   | Runner/config/root   | Full        | Focused/partial | Zero-match behavior   | CI / simple Windows/macOS/Linux entry point | Identity/data/isolation/fidelity policy | Repeat proof                      |
| ------------------ | --------------------------------- | ------- | -------------------- | ----------- | --------------- | --------------------- | ------------------------------------------- | --------------------------------------- | --------------------------------- |
| Unit               | `APPLICABLE` / `N/A — {evidence}` | {owner} | {runner/config/root} | `{command}` | `{filter}`      | `{non-zero behavior}` | {gate / command}                            | {policy reference}                      | {result/status}                   |
| Integration/System | `APPLICABLE` / `N/A — {evidence}` | {owner} | {runner/config/root} | `{command}` | `{filter}`      | `{non-zero behavior}` | {gate / command}                            | {policy reference}                      | `{two no-reset runs}`             |
| E2E                | `APPLICABLE` / `N/A — {evidence}` | {owner} | {runner/config/root} | `{command}` | `{filter}`      | `{non-zero behavior}` | {gate / command}                            | {policy reference}                      | `{result or evidence-backed N/A}` |

Missing/placeholder evidence is an open gap, not a PASS. The inventory must preserve the strategy's unique identity, additive-data, isolation, realistic-fidelity, and two-run proof fields; E2E N/A remains evidence-backed.

## Feedforward Guides

| Type          | File/Skill                           | Purpose                         |
| ------------- | ------------------------------------ | ------------------------------- |
| Inferential   | CLAUDE.md §Architecture Patterns     | Shapes AI architectural choices |
| Inferential   | CLAUDE.md §Anti-Patterns             | Prevents known bad patterns     |
| Inferential   | docs/architecture/pattern-catalog.md | DO/DON'T examples per pattern   |
| Computational | .editorconfig                        | Cross-IDE consistency           |

## Feedback Sensors — Computational

| Stage      | Tool/Hook                                                  | What it catches                                |
| ---------- | ---------------------------------------------------------- | ---------------------------------------------- |
| Pre-commit | {linter}                                                   | Style violations, common errors                |
| Pre-commit | {formatter}                                                | Code formatting drift                          |
| CI         | {type-checker}                                             | Type errors                                    |
| CI         | {static-analyzer}                                          | Security, complexity, dead code                |
| CI         | {selected strength sensor, or N/A with alternate evidence} | Protected intent; threshold only if justified  |
| CI         | {coverage-tool}                                            | Untested areas (DIAGNOSTIC only — never gated) |

## Feedback Sensors — Inferential

| Stage                   | Skill/Agent                                             | What it catches                                    |
| ----------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| Pre-implementation      | $why-review                                             | Design rationale gaps                              |
| Pre-commit              | $code-quality-review                                    | Convention drift, logic errors                     |
| Post-implementation     | $domain-analysis --mode=review                          | Domain model quality                               |
| Pre-release             | $production-readiness-review                            | Operational readiness                              |
| Pre-release             | $security-audit                                         | Security vulnerabilities                           |
| Pre-release + Recurring | $integration-test --mode=review (feature-area TC audit) | Orphaned Section-8 TCs, uncovered changed behavior |

## Open Gaps

| Area                     | Reason   | Risk           |
| ------------------------ | -------- | -------------- |
| {area not yet harnessed} | {reason} | {LOW/MED/HIGH} |
```

`$project-init` fills only the Summary; `$harness-setup` fills every section. A section with nothing to record yet stays out rather than holding placeholders.
