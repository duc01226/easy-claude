# Brownfield ratchet — adding checks to an existing project

Read this when `/linter-setup` runs on a project that already has source code (Stack Detection found it, or the caller passed `--mode=brownfield`). It replaces nothing in the main skill: the per-tool questions, strict defaults, hook proof and local/CI parity still apply. It adds what an existing codebase needs so a new check does not turn the whole project red.

**Rules first:**

- **Never make the existing tree red.** Every new check lands with a frozen baseline of today's violations and fails only on new ones. A check that fails on day one gets switched off, which is worse than no check.
- **The baseline only shrinks (ratchet).** Prune entries that now pass in a deliberate step. Never add an entry to make a change pass; the only growth is the consented commit that adopts a new rule.
- **Keep what the project already runs.** Inventory existing sensors first and research only the missing or unproven categories. Replacing a tool the team already uses needs the user's yes.
- **No mass rewrite in the setup commit.** Auto-fix and reformat of existing files are offered as their own consented commit, so the setup change stays reviewable.
- **Unknown repository shape → propose, don't apply.** When the placement rules below do not decide, show the proposal with its evidence and wait for the user.

## Step B1 — Inventory what is already there

Before any research, list each category's current state with evidence (`path:line` or the command): formatter, linter, type check, static analysis, dependency scan, architecture boundaries, restricted APIs, pre-commit hook, CI gate. Read manifests and their scripts, tool config files, hook folders, CI files, and the project config's `formatting.command` and `testing.commands` (`lint`, `lintFile`, `typecheck`, `build`, `verify`, `affected`). Use the inventory format owned by `/harness-setup` (its `references/harness-inventory.md`), so the result can be saved as the project's harness inventory.

Give each category its inventory status (`proven`, `configured`, `missing`, `declined` or `n/a`, defined there). Research and ask only for `missing` ones and `configured` ones that are not yet proven (not in the hook or CI, or failing without a baseline); a `declined` category is offered again only when the user asks.

## Step B2 — Decide where the config lives

| Repository shape                                                                                              | Evidence                                | Placement                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single package                                                                                                | one manifest at the root                | one tool config and one baseline at the root                                                                                                                                                   |
| npm or Yarn workspaces                                                                                        | `workspaces` in the root `package.json` | one root config, with per-package file globs or overrides only where packages really differ; one root baseline; the tool installed in the root dev dependencies; CI runs it once from the root |
| pnpm workspaces                                                                                               | `pnpm-workspace.yaml`                   | as for npm or Yarn workspaces; install at the workspace root (`pnpm add -D -w`)                                                                                                                |
| A package already has its own config                                                                          | a config file inside the package        | keep it; extending it from a shared root config needs the user's yes                                                                                                                           |
| Unknown or mixed: a build-graph tool, several languages, nested repositories, no workspace file you recognise | —                                       | propose a placement with its evidence; do not apply until the user agrees                                                                                                                      |

Why one root config: one command runs locally and in CI, so the two cannot diverge, and one baseline file is one place to watch shrink. Many tools look up the nearest config from each file, so a package config beside a root one changes behaviour for that package: make that a conscious choice, never an accident.

## Step B3 — Choose the tools

Ask one question per category that Step B1 selected, in the format of the main skill's **Asking the user** section: plain words, recommended option first. A tool the project already runs is the default answer for its own category.

## Step B4 — Freeze today's violations

Run each chosen tool once over the whole tree with its strict config, then record what fails with the tool's native baseline mechanism. The table names known mechanisms (checked against the tools' documentation, 2026-11); research the current version before relying on a row, and add a row when the project's stack is missing.

| Stack                                                   | Tool                 | Native mechanism                    | Record the baseline                                                                                                                                              | Prune (ratchet down)                                                                  | Limits                                                                                           |
| ------------------------------------------------------- | -------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| JS / TS                                                 | ESLint 9.24 or later | bulk suppressions file              | `eslint . --suppress-all` (or `--suppress-rule <rule>` when adopting one rule) writes `eslint-suppressions.json` at the root; `--suppressions-location` moves it | `eslint . --prune-suppressions`                                                       | counts per file and rule, so one more violation of that rule in that file fails; commit the file |
| JS / TS                                                 | TypeScript compiler  | none                                | command-level baseline (below)                                                                                                                                   | —                                                                                     | or tighten per-folder configs one at a time                                                      |
| Python                                                  | Ruff                 | inline suppressions with their code | `ruff check --add-noqa` (with `--select <code>` for one rule)                                                                                                    | `ruff check --extend-select RUF100` reports suppressions that no longer hide anything | each suppression names its rule; never a bare `noqa`                                             |
| Python                                                  | basedpyright         | baseline file                       | `basedpyright --writebaseline` writes `.basedpyright/baseline.json`                                                                                              | rewrite it only from a run that reports no new error                                  | commit the file                                                                                  |
| Python                                                  | mypy                 | none                                | command-level baseline (below)                                                                                                                                   | —                                                                                     | —                                                                                                |
| Kotlin (compiled)                                       | detekt               | baseline XML                        | the `detektBaseline` Gradle task, wired with `baseline` in the `detekt { }` block                                                                                | regenerate from a run with no new finding                                             | one file per Gradle module by default                                                            |
| Go (compiled)                                           | golangci-lint        | diff against a revision, no file    | `issues.new-from-rev` (or `--new-from-rev`) reports only issues added since that revision                                                                        | move the revision forward                                                             | CI needs the full history; a moved file brings its old issues back                               |
| Any other tool (.NET analyzers, Rust clippy and others) | —                    | none known → command-level baseline | —                                                                                                                                                                | —                                                                                     | —                                                                                                |

**Command-level baseline.** When a tool has no native mechanism, record its command in the project config (`testing.commands.lint`, `typecheck` or another key that matches) through `/project-config`, with the user's yes. The project's verify step then records the command's current failures as known and reports only new ones. Never wrap the tool in an ad-hoc script that hides its exit code.

The baseline file is committed. Only setup, an explicit prune and a consented rule adoption change it; a pre-commit hook or a verify run never writes it.

## Step B5 — Wire the hook and CI with the ratchet

- The pre-commit hook checks staged files only and writes nothing: no auto-fix, no baseline update. A hook that rewrites files after review changes what was reviewed.
- CI runs the same command against the same baseline, so a new violation fails both.
- Pruning is its own step: run the tool's prune command (Step B4), review the shrunk baseline, and commit it with the change or on its own.
- Record the commands in the project config with the user's yes: `testing.commands.lint` for the whole repository, `testing.commands.lintFile` with the `{file}` placeholder for one file, `testing.commands.typecheck` for the type check.

## Step B6 — Prove the ratchet

Extend the main skill's isolated fixture proof: in the fixture, a baselined violation still passes, a new violation of the same rule fails with the tool's own diagnostic, and a clean change passes. Never probe in the working repository.

## Step B7 — Report

Per tool: the command, the baseline file (or `command-level`), its entry count per rule, the prune command, and what stays `declined` or `n/a` with the reason. Write the categories into the harness inventory (Step B1 format) when the user agrees to save it.
