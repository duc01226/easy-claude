# E2E Test Reference

<!-- Last scanned: 2026-09-10 -->
<!-- Last verified: 2026-09-12 (docs-update, impact-scoped) -->
<!-- This file is referenced by Claude skills and agents for project-specific context. -->

## Quick Summary

**Goal:** Record the verified absence of a project E2E stack without turning skill-local browser tooling into application test conventions.

**Summary:**

- Confirm `e2eTesting` is **none / N/A**; BDD, Page Objects, browser configuration, credentials, and project E2E commands remain N/A.
- Keep skill-local browser tooling separate; when an adopter profile exists, read its linked surface and execution ownership before choosing a runner.
- Search verified project evidence in order, record `file:line` proof, classify missing prerequisites as `ENVIRONMENT-BLOCKED`, and rerun the E2E scan before documenting future conventions.

## Portable adopter execution contract

Adopter projects may opt into an `e2eTesting.execution` profile in
`docs/project-config.json`. This repository does not enable that profile; the
fields below describe the portable handoff and are not facts about this
framework's own runtime:

| Profile area | Contract |
| --- | --- |
| `surfaceIds` | Links E2E execution to `experienceVerification.surfaces[]`; that surface's `localRun` owns dependencies, startup, readiness, teardown, runtime logs, and reference-only `credentialsRef`. |
| `auth` | Declares `fixture`, `storage-state`, `registration`, `manual`, or `none` plus non-secret references. Never copy credentials, cookies, tokens, headers, or storage contents into a prompt, command, test, or report. |
| `data` | Declares the verified seed command/working directory, `reference-only`/`idempotent`/`additive` mode, and cleanup policy. Use the project recipe; do not mutate a datastore as a UI shortcut. |
| `browser` | Declares the configured runner/engine, headed visibility, action delay, and wait-until policy. For web human QC, use the visible Playwright CLI path when configured; a bounded `waitUntil` condition surrounds each UI-control operation for readiness/actionability, expected positive/negative outcomes, and applicable error-alert states, followed by exactly 500ms of post-action presentation pacing. |
| `evidence` | Declares the project-relative evidence root, capture kinds, and a non-empty redaction policy whenever sensitive captures are enabled. Attach console/page errors/failed requests before interaction when applicable; read screenshots/traces/video before judging them. |
| `convergence` | Bounds attempts, consecutive green runs, and settle timeout. Keep the same scope; classify failures before edits, fix at the owning layer, review each fix, and rerun fresh. |

Candidate E2E evidence and repeatable run output belong under the project-root
`tmp/` or `temp/` directory (prefer `tmp/e2e`), which the root `.gitignore`
ignores by default. Accepted baselines are the explicit versioned exception;
they remain at the project-declared baseline path and are never overwritten by a
passing run.

When the profile is partial or absent, discover only from verified project
evidence in this order: linked surface `localRun`, E2E reference/runner
configuration, package/task/compose/CI/fixture/auth documentation, then a
bounded repository scan. Record the source file/line for each fact. Record
`N/A` only when no applicable E2E surface exists; an applicable but unrunnable
or uninspectable prerequisite is `ENVIRONMENT-BLOCKED`.

The canonical execution surface is `.claude/skills/workflow-e2e/`, which
conditionally uses `.claude/skills/e2e-test/` for authoring and always hands
verification to `.claude/skills/e2e-test-verify-loop/`; `.claude/skills/playwright-cli/`
provides the configured browser path. `experience-review` remains the
report-only observable acceptance gate; it does not silently accept baselines
or replace the project runner. The former `workflow-e2e-green` entry is a
deprecated compatibility skill, not a registered workflow.

## Workflow

1. Read `docs/project-config.json` and confirm the `e2eTesting` status.
2. If an adopter profile exists, read `e2eTesting.execution` and its linked `experienceVerification.surfaces[]` before choosing a runner or lifecycle command.
3. Search the repository root for framework configs, feature files, browser test patterns, auth/fixture evidence, and runnable commands when the profile is partial or absent.
4. Re-run `/scan --target=e2e-tests` before documenting any future E2E convention.

## Key Rules

- **NEVER** infer a project E2E framework from examples or rendering utilities inside a skill.
- **NEVER** add BDD, account, or environment-variant sections without matching executable source.
- **MUST** keep file statistics as grep expressions, not hardcoded counts.

## Architecture Overview

easy-claude is a JavaScript/Python Claude Code framework whose configured modules are hooks, libraries, skills, agents, scripts, workflows, and documentation (`docs/project-config.json:4-16`, `docs/project-config.json:23-73`). It has no application UI mapping, browser test project, or configured external infrastructure (`docs/project-config.json:106-119`, `docs/project-config.json:132-161`).

The project-owned test layer is the custom CJS hook harness (`docs/project-config.json:120-130`, `package.json:43-46`). Skill-local Playwright utilities are support assets for target projects and do not create an E2E dependency edge for this repository (`.claude/skills/webapp-testing/examples/element_discovery.py:5-39`, `.claude/skills/excalidraw-diagram/references/render_excalidraw.py:138-147`).

## Base Classes

**N/A.** No E2E test base, browser fixture, driver lifecycle, or page-object base exists in the configured project modules. The explicit negative capability is recorded in `docs/project-config.json` under `e2eTesting`; root dependencies contain tooling only (`package.json:3-18`).

## Page Object Pattern

**N/A.** No project page-object hierarchy, reusable UI wrapper, selector strategy, navigation abstraction, or authentication state exists. Generic selectors and `page.goto` in `.claude/skills/webapp-testing/examples/element_discovery.py:5-33` demonstrate a reusable skill, not a project convention.

## Wait & Assertion Patterns

**N/A.** No project browser wait/retry or E2E assertion helper exists. The skill-local `page.wait_for_load_state('networkidle')` at `.claude/skills/webapp-testing/examples/element_discovery.py:9-12` is not evidence of an application testing standard.

Portable adopter contract: when an E2E suite is introduced, define or reuse
one parameterized `waitUntil(condition, options)` helper. The condition must
support positive and negative boolean/async predicates; options must bound the
timeout and poll interval and identify the condition for timeout diagnostics.
Before each UI-control action, wait for the control to be present, visible,
enabled, actionable, and free of a blocking error alert when success is
expected. After each action, wait for the expected positive or negative state:
loading until the next control appears, click results, dropdown/options before
selection, selected state after selection, and error-alert presence for an
expected failure or absence for an expected success. Keep final assertions in
the test. Only after these waits apply the exact 500ms presentation delay; it
never replaces readiness, postconditions, or real settle signals.

### Default visual screenshot review

Visual screenshot review is enabled by default for applicable E2E execution,
equivalent to `--visual-review=true`; `--visual-review=false` is the explicit
opt-out. When an E2E run generates screenshots, each fresh round captures the
declared state × viewport matrix, preserves the candidate artifacts,
opens/reads every image, and invokes `/experience-review --rounds=0` as the
report-only visual adjudicator. Validated blocking UI-floor findings (for
example clipping, overlap, unreadable content, unreachable controls, broken
required states, accessibility-floor violations, or broken responsive layouts)
enter the E2E failure set; fix them at the owning UI layer, review the fix, and
rerun the same E2E scope and screenshot matrix. Convergence requires zero E2E
failures and zero blocking visual findings across the configured fresh runs.
Missing capture or image inspection for an applicable visual surface is
`ENVIRONMENT-BLOCKED`, not a pass. The explicit false opt-out suppresses this
screenshot review only; it does not skip E2E execution or other evidence gates.
Advisory identity, polish, or non-contract spacing preferences are recorded but
do not create an unbounded loop. `/ask` is an architecture-consultation skill,
not the screenshot reviewer.

### Visual design protocol handoff

When visual review is enabled (the default, or explicit `--visual-review=true`),
or when an E2E/QC task handles screenshots, human-QC of a user-facing UI, or visual expectations, resolve the design
authority before generating or judging evidence. Read `docs/project-config.json`
and resolve `designSystem.canonicalDoc`, `tokenFiles`, and `appMappings[]`; then
read the applicable design-system, frontend-patterns, SCSS, design-knowledge,
and design-review-checklist references. A missing configured UI surface is
`N/A`; a relevant surface with missing runner, design authority, or inspection
capability is `ENVIRONMENT-BLOCKED`. Never invent tokens, breakpoints,
typography, CSS/BEM conventions, components, or runner commands.

Use project design decisions and accepted design direction first, then the
shared `UI-1.1`–`UI-9.4`, `DD-1`–`DD-8`, and `CL-1`–`CL-6` protocols. Before
generation or a UI fix, inventory related screens, flows, and components;
classify components as `Common`, `Domain-Shared`, or `Page`; record the base
abstraction and owner; reuse/compose before creating; and keep one owner for
shared markup, selectors, styling, lifecycle, and lower-tier test contracts.
Runtime screenshot observations belong to `/experience-review`; source-only
token, SCSS/BEM, z-index, component-ownership, reuse, and static design findings
belong to `/ui-review`. Capture and read every declared state × viewport;
`UI-*`/accessibility/layout-floor and `P0`–`P2` checklist findings block the
round, while `DD-*` identity/polish remains advisory unless the governing
contract makes it objectively required. Browser helpers such as
`/playwright-cli` and `/webapp-testing` may collect runtime evidence under this
contract, but they do not replace `/experience-review` or `/ui-review`.
Do not promote a baseline without an explicit human acceptance record.

## Configuration

`docs/project-config.json` declares `framework: none`, `language: none`, no run commands or entry points, no dependencies, and a not-applicable architecture. Its `featureFilesGrepExpr` and `stepDefinitionFilesGrepExpr` fields preserve executable negative checks without stale totals.

No Playwright/Cypress/WebdriverIO root config or browser package is present. No BDD framework, credential system, or multi-environment E2E configuration was verified; conditional sections therefore remain absent. The optional adopter profile must not be inferred from skill-local Playwright files.

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
- When E2E is introduced, record real config paths, linked surfaces/localRun ownership, dependency versions, commands, selectors, waits, evidence/redaction, and non-secret credential references with `file:line` evidence.
- Generate or reuse test cases from the governing spec/current context as Given/When/Then records with a named protected invariant; do not generate a duplicate suite when a suitable case already exists.
- When E2E is introduced, use a reusable object model with an idiomatic abstract base (or language-equivalent protocol/trait), cohesive helpers/utilities, and Common, Domain-Shared, and Page component tiers; reuse or compose existing objects before creating new ones.
- Keep one canonical owner for each selector/action/wait and test reusable lower-tier component behavior once; Page tests cover page-specific composition and outcomes, not copied lower-tier cases.
- Model each interactive journey as observe → act → observe with the shared bounded `waitUntil` helper before and after every control action. Include applicable error-alert present/absent conditions and dropdown/menu visibility; a wait timeout fails with diagnostics and must not be hidden by a weaker assertion or ad-hoc sleep.
- For every browser/UI-control operation, apply the exact 500ms delay only after the `waitUntil` postcondition and keep any real settle signal separate; never use this delay as readiness or a postcondition.
- Treat hardcoded real E2E credentials as a **CRITICAL** security finding; none was verified in the current project surface.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Record the verified absence of a project E2E stack without turning skill-local browser tooling into application test conventions.

**IMPORTANT MUST ATTENTION** Read config/profile → search verified project evidence → record `file:line` proof → classify N/A versus `ENVIRONMENT-BLOCKED` → rerun the E2E scan before documenting new conventions.

- **MUST** distinguish project-owned tests from skill-local browser utilities.
- **MUST** rerun the framework gate before generating Page Objects or browser tests.
- **NEVER** replace the verified **N/A** state with generic Playwright, Cypress, Selenium, or BDD boilerplate.
