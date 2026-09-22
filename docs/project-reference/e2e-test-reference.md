# E2E Test Reference

<!-- Last scanned: 2026-09-10 -->
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

| Profile area  | Contract                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `surfaceIds`  | Links E2E execution to `experienceVerification.surfaces[]`; that surface's `localRun` owns dependencies, startup, readiness, teardown, runtime logs, and reference-only `credentialsRef`.                                                                                                                                                                                                                    |
| `auth`        | Declares `fixture`, `storage-state`, `registration`, `manual`, or `none` plus non-secret references. Never copy credentials, cookies, tokens, headers, or storage contents into a prompt, command, test, or report.                                                                                                                                                                                          |
| `data`        | Declares the verified seed command/working directory, `reference-only`/`idempotent`/`additive` mode, and cleanup policy. Use the project recipe; do not mutate a datastore as a UI shortcut.                                                                                                                                                                                                                 |
| `browser`     | Selects the project-configured runner/engine and supported interaction mode. Use its native readiness/outcome waits or a documented helper with bounded timeouts and useful diagnostics. Action pacing is optional and applies only when configured; no fixed delay is required. |
| `evidence`    | Declares the project-relative evidence root, capture kinds, and a non-empty redaction policy whenever sensitive captures are enabled. Attach console/page errors/failed requests before interaction when applicable; read screenshots/traces/video before judging them.                                                                                                                                      |
| `convergence` | Bounds attempts, consecutive green runs, and settle timeout. Keep the same scope; classify failures before edits, fix at the owning layer, review each fix, and rerun fresh.                                                                                                                                                                                                                                 |

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

The canonical execution surface is `.claude/skills/workflow-e2e/`, which routes authoring and verification according to the selected project runner and profile. `.claude/skills/playwright-cli/` applies only when the project selects Playwright; other runners use their configured commands and reference docs. Use `/experience-review` only when requested or required for the applicable surface. It reports observable findings and never silently accepts baselines or replaces the configured test runner.

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

The project-owned test layer is the custom CJS hook harness (`docs/project-config.json:120-130`, `package.json:43-46`). Skill-local Playwright utilities are support assets for target projects and do not create an E2E dependency edge for this repository (`.claude/skills/playwright-cli/references/playwright-tests.md`, `.claude/skills/excalidraw-diagram/references/render_excalidraw.py:138-147`).

## Base Classes

**N/A.** No E2E test base, browser fixture, driver lifecycle, or page-object base exists in the configured project modules. The explicit negative capability is recorded in `docs/project-config.json` under `e2eTesting`; root dependencies contain tooling only (`package.json:3-18`).

## Page Object Pattern

**N/A.** No project page-object hierarchy, reusable UI wrapper, selector strategy, navigation abstraction, or authentication state exists. Generic selectors and `page.goto` in `.claude/skills/excalidraw-diagram/references/render_excalidraw.py:141` demonstrate a reusable skill asset, not a project convention.

## Wait & Assertion Patterns

**N/A.** No project browser wait/retry or E2E assertion helper exists. Skill-local browser utilities are not evidence of an application testing standard.

Portable adopter guidance: prefer the selected runner's native wait APIs. Compose a shared bounded helper only when project references or demonstrated reuse justify it. Wait for observable readiness before acting and for the expected result afterward; keep final assertions in the test and use the project's timeout and diagnostic conventions. A fixed sleep does not establish readiness or a postcondition. Action pacing is optional and applies only when the project configures it.

### Visual review and evidence

This repository sets `experienceVerification.enabled` to `false` because it has no user-facing application surface. There is no framework-wide screenshot-review default. Apply visual review only when the task requests it or the project's contract requires it for an applicable surface. Resolve capture mode, evidence paths, and redaction from project config/reference docs; if required evidence cannot be captured or inspected, report the gap instead of treating it as a pass.

### UI state transition capture (project-configured)

Full contract: `.claude/skills/shared/ui-state-capture-protocol.md`. The framework default is `uiStateCapture.mode: declared-only`; transition capture is opt-in. Add automatic transition capture only when the project selects `every-action` and has an evidenced, reusable action/capture boundary. Follow the project's existing runner and helper style; do not create a base class, page-object hierarchy, or shared abstraction solely to host capture.

When enabled, capture after the runner observes the action's configured postcondition. Follow the project's manifest, masking, cap, and failure-capture rules. `declared-only` keeps only the declared capture matrix; `off` disables transition capture and does not waive any separate visual gate required by the project.

Configure it under `e2eTesting.execution.evidence.uiStateCapture` when the profile supports it:

```jsonc
"uiStateCapture": {
  "mode": "declared-only",       // every-action | declared-only | off
  "helper": "<path/symbol, required only for every-action>",
  "manifestPath": "tmp/e2e-evidence/ui-captures/{runId}/capture-manifest.json",
  "maxPerTest": 60,
  "maxPerRun": 400,
  "fullPageWhenScrollable": true,
  "maskSelectors": ["<volatile region selectors>"]
}
```

### Case-by-case review and synthesis

When visual review is requested or required, reconcile the declared capture inventory with the evidence actually reviewed. Inspect one capture at a time, record expected and observed state plus runtime evidence, and identify gaps explicitly. Assign findings to the component or contract owner evidenced by the project; do not invent a shared component taxonomy. Fix blocking findings at the owning boundary and rerun the same required scope. Advisory findings are recorded without creating an unbounded loop.

### Visual design protocol handoff

Before judging applicable visual evidence, read `docs/project-config.json` and resolve the design-system references that actually exist (`designSystem.canonicalDoc`, `tokenFiles`, and `appMappings[]`). Use project design decisions and accepted direction first, then the relevant shared UI guidance. If the project has no design-system artifact, rely on verified existing conventions and state that limitation; never invent tokens, breakpoints, typography, CSS methodology, or component boundaries.

Record component ownership using the project's declared taxonomy or observed code boundaries. Apply BEM, SCSS, Page Objects, or any other methodology only when project config, references, or code show that the project uses it. Route running-surface observations to `/experience-review` and source-only implementation findings to `/ui-review`. Never promote a baseline without the project's explicit acceptance record.

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
- Add BDD, account, environment, or surface sections only after their framework and source artifacts are verified.
- When E2E is introduced, record verified config paths, linked surfaces/lifecycle ownership, dependency versions, commands, selector strategy, waits, evidence/redaction, and non-secret credential references with `file:line` evidence.
- Use the project's native test format. State the protected intent and observable expected outcome; use Given/When/Then when selected by the project or when it fits the local style.
- Choose test organization from project config and examples. Page Objects, Screenplay, fixtures, helper modules, and test-local composition are options, not universal requirements.
- Give each shared selector/action/wait one owner when reuse exists. Prefer runner-native readiness/outcome waits; do not use fixed sleeps as readiness evidence. Add pacing only when configured.
- Capture transition evidence only when the project opts into a supported mode. Review required evidence against the project's design authority and report missing coverage explicitly.
- Treat hardcoded real E2E credentials as a **CRITICAL** security finding; none was verified in the current project surface.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Record the verified absence of this repository's E2E stack without turning skill-local browser tooling into application test conventions.

**IMPORTANT MUST ATTENTION** Read the project config/profile, search verified project evidence, record `file:line` proof, distinguish `N/A` from `ENVIRONMENT-BLOCKED`, and rerun the E2E scan before documenting new local conventions.

- **MUST** distinguish project-owned tests from skill-local browser utilities.
- **MUST** follow the selected runner and project references when an applicable E2E surface exists.
- **NEVER** replace this repository's verified **N/A** state with boilerplate for any browser runner or test format.
