# E2E Test Reference

<!-- Last scanned: 2026-03-15 -->
<!-- This file is referenced by Claude skills and agents for project-specific context. -->

## Status: N/A for this project

**easy-claude is a Claude Code enhancement framework, not a web application.** It has no UI, no browser-based functionality, and therefore no E2E tests. The project's own tests are CJS hook unit/integration tests run via `node .claude/hooks/tests/test-all-hooks.cjs`.

Do not attempt to scan this repo for E2E tests — there are none to find.

## E2E Support Provided to Target Projects

While easy-claude itself has no E2E tests, it ships skills and workflows that help **target projects** (projects that adopt this framework) write, maintain, and run E2E tests:

| Skill / Workflow               | Purpose                                                                                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/e2e-test`                    | Generate and maintain E2E tests (Playwright, Cypress, Selenium, WebdriverIO) using Page Object Model, TC code traceability, and project conventions |
| `/scan-e2e-tests`              | Scan a target project's E2E codebase and populate this reference doc with architecture, page objects, patterns, and configuration                   |
| `/webapp-testing`              | Test local web apps with Python Playwright scripts; includes server lifecycle management via `scripts/with_server.py`                               |
| `/workflow-e2e-from-changes`   | Workflow: update E2E tests after code/spec changes (scout -> e2e-test -> test -> watzup)                                                            |
| `/workflow-e2e-from-recording` | Workflow: generate Playwright tests from Chrome DevTools recordings                                                                                 |
| `/workflow-e2e-update-ui`      | Workflow: update E2E screenshot baselines after UI changes                                                                                          |

### How it works in target projects

When easy-claude is adopted into a project that has a web UI:

1. Run `/scan-e2e-tests` to detect the E2E framework and populate this file with project-specific patterns, base classes, page objects, and conventions.
2. Configure `docs/project-config.json` with an `e2eTesting` section (framework, paths, run commands).
3. Use `/e2e-test` or the E2E workflows to generate and maintain tests that follow the project's patterns.
