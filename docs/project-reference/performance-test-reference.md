# Performance Test Reference

Read before planning, writing, reviewing, running or fixing performance tests. This document owns easy-claude's project-specific preferences; the portable `performance-test` skill owns generic experimental and quality gates.

## Status and Scope

`docs/project-config.json` declares a JavaScript/Python framework and custom CJS functional tests. It declares no performance acceptance command, workload, resource envelope or performance SLO. The optional task-track browser suite is functional evidence, not a load or endurance test. Do not claim measured system capacity from those suites.

Relevant future experiments may target hook latency, large source graphs, large work-record sets or concurrent workspace requests. First initialization must establish which production entry path and input growth matter; do not introduce a database/service or a 1,000-browser workload solely to fit a generic example.

## Commands and Prerequisites

No project performance command is configured. Use `performance-test --mode=init` through the active host to research and implement a reusable harness before claiming one exists. `node .claude/hooks/tests/run-all-tests.cjs` verifies functional framework contracts; it does not verify performance budgets.

Write/init author the setup and tests, then auto static review/fix with a default three-round ceiling. They do not start services, seed data or execute even smoke/foundation tests. Record authored commands as runtime NOT RUN. Only an explicit run/verify/green request authorizes execution; an optional question-tool offer after authoring waits for an affirmative answer.

Use platform-neutral Node entrypoints where they fit the actual harness. Python tooling uses `python3` on macOS/Linux and `py -3` on Windows. Verify any container/VM prerequisite and effective limits separately; no application container topology is declared in the project config.

## Harness and Reuse

Read `.claude/skills/performance-test/references/harness.md` on first setup. Reuse relevant fixture/process-launch helpers from `integration-test-reference.md` in this directory and seed conventions from `seed-test-data-reference.md` when generating large test data. Functional timeout budgets are not performance SLOs.

Persist the selected runner, pinned dependencies, executable config, clients, fixtures, telemetry, evaluator and one-command lifecycle owners here after implementation. Keep unsupported or unexecuted capabilities explicit.

## Workload, Hardware and Budgets

No project-specific numerical SLO, repeat override or hardware acceptance profile is established. First-init proposals must distinguish library/CLI/hook workloads from any real multiuser service; use realistic repository/file/record sizes and bounded owned fixtures. Apply the skill's growable-dataset and concurrent-user policies only to evidenced applicable surfaces, and record each N/A rationale.

Store selected numerical budgets in one executable owner and link it here. Separate accepted requirements from provisional local benchmarks. Record data counts/skew/width, hardware model and effective per-service/total resources, generator headroom and all required measurement/recovery windows before running acceptance.

## Evidence and Maintenance

Store run reports, logs, query plans and profiles under a run-scoped project-root `tmp/reports/` directory, with redaction and bounded retention. Preserve source/config/data/run identities, actual command/exit, per-gate outcomes, query/search plans where applicable and memory/OOM/restart evidence. No finite run establishes an unconditional no-OOM guarantee.

Read `.claude/skills/performance-test/references/verification.md` when interpreting results, driving green mode or forecasting scale. Use `performance-review` for bottleneck analysis. Update this project reference after actual harness/command/policy saves; `scan --target=performance-tests` reconciles evidenced facts while preserving intentional preferences. Keep this document selected in project config and discoverable in the docs index.
