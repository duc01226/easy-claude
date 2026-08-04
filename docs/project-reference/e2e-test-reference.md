# E2E Test Reference

<!-- Last scanned: 2026-08-04 -->
<!-- This file is referenced by Claude skills and agents for project-specific context. -->

> **Goal:** Record the verified absence of a project E2E stack without turning skill-local browser tooling into application test conventions.

## Quick Summary

- Project E2E framework: **none / N/A**.
- BDD, Page Objects, browser configuration, credentials, and E2E run commands: **N/A**.
- Browser-automation files under `.claude/skills/` are reusable tooling for adopter projects, not this repository's E2E suite.

## Workflow

1. Read `docs/project-config.json` and confirm the `e2eTesting` status.
2. Search the repository root for framework configs, feature files, browser test patterns, and runnable commands.
3. Re-run `/scan --target=e2e-tests` before documenting any future E2E convention.

## Key Rules

- **NEVER** infer a project E2E framework from examples or rendering utilities inside a skill.
- **NEVER** add BDD, account, or environment-variant sections without matching executable source.
- **MUST** keep file statistics as grep expressions, not hardcoded counts.

## Architecture Overview

easy-claude is a JavaScript/Python Claude Code framework whose configured modules are hooks, libraries, skills, agents, scripts, workflows, and documentation (`docs/project-config.json:4-16`, `docs/project-config.json:23-73`). It has no application UI mapping, browser test project, or configured external infrastructure (`docs/project-config.json:106-119`, `docs/project-config.json:132-152`).

The project-owned test layer is the custom CJS hook harness (`docs/project-config.json:120-130`, `package.json:43-46`). Skill-local Playwright utilities are support assets for target projects and do not create an E2E dependency edge for this repository (`.claude/skills/webapp-testing/examples/element_discovery.py:5-39`, `.claude/skills/excalidraw-diagram/references/render_excalidraw.py:138-147`).

## Base Classes

**N/A.** No E2E test base, browser fixture, driver lifecycle, or page-object base exists in the configured project modules. The explicit negative capability is recorded in `docs/project-config.json` under `e2eTesting`; root dependencies contain tooling only (`package.json:3-18`).

## Page Object Pattern

**N/A.** No project page-object hierarchy, reusable UI wrapper, selector strategy, navigation abstraction, or authentication state exists. Generic selectors and `page.goto` in `.claude/skills/webapp-testing/examples/element_discovery.py:5-33` demonstrate a reusable skill, not a project convention.

## Wait & Assertion Patterns

**N/A.** No project browser wait/retry or E2E assertion helper exists. The skill-local `page.wait_for_load_state('networkidle')` at `.claude/skills/webapp-testing/examples/element_discovery.py:9-12` is not evidence of an application testing standard.

## Configuration

`docs/project-config.json` declares `framework: none`, `language: none`, no run commands or entry points, no dependencies, and a not-applicable architecture. Its `featureFilesGrepExpr` and `stepDefinitionFilesGrepExpr` fields preserve executable negative checks without stale totals.

No Playwright/Cypress/WebdriverIO root config or browser package is present. No BDD framework, credential system, or multi-environment E2E configuration was verified; conditional sections therefore remain absent.

## Running Tests

There is no project E2E command, filtered browser command, headed mode, or CI browser job. Do not relabel `npm test` as E2E: it runs the custom hook/suite harness (`package.json:43-46`).

Use the configured expressions to recheck the negative state:

```powershell
# Feature files
rg --files --hidden -g "*.feature" -g "!node_modules/**" -g "!.git/**"

# Step-binding markers
rg -l --hidden "Given\(|When\(|Then\(|@given|@when|@then|\[Binding\]" . -g "*.cs" -g "*.java" -g "*.py" -g "*.ts" -g "*.js"
```

## Best Practices

- Keep `e2eTesting.framework` set to `none` until a runnable project suite exists.
- Add a conditional BDD/account/environment section only after its framework and source artifacts are verified.
- When E2E is introduced, record real config paths, entry points, dependency versions, commands, selectors, waits, and credential source with `file:line` evidence.
- Treat hardcoded real E2E credentials as a **CRITICAL** security finding; none was verified in the current project surface.

## Closing Reminders

- **MUST** distinguish project-owned tests from skill-local browser utilities.
- **MUST** rerun the framework gate before generating Page Objects or browser tests.
- **NEVER** replace the verified **N/A** state with generic Playwright, Cypress, Selenium, or BDD boilerplate.

> **Goal:** Record the verified absence of a project E2E stack without turning skill-local browser tooling into application test conventions.
