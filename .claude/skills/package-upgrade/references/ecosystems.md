# Dependency ecosystems — commands and facts

> Read by `package-upgrade` (both modes) and by `security-audit` dimension D3 whenever a step needs an ecosystem's command: find why a package is installed, refresh a lock within declared ranges, force a version, or run and configure a scanner. This file is the one owner of these facts; other guidance points here instead of keeping its own list.

Accessed: 2026-11-20. Each row cites its official source. Tool behaviour moves between versions: re-check a cell against its source before relying on a version-specific detail, and never use a cell marked **UNVERIFIED** without checking it first.

## Contents

- [How to use this table](#how-to-use-this-table)
- [Package managers](#package-managers)
- [Scanners](#scanners)
- [Facts that change a decision](#facts-that-change-a-decision)
- [Unverified cells](#unverified-cells)

## How to use this table

1. Identify the ecosystems from the lock files present (column 2 below). A repository may use several.
2. Owner chain → column 3. Refresh within declared ranges → column 4. A temporary force → column 5.
3. A manager with no in-range refresh (column 4 says N/A) has no first route: start at the parent upgrade, and treat its pin mechanism as the temporary force.
4. Run the project's own scanner first. Use the scanner table for the command, machine output, and where an accepted advisory is written with its expiry.

## Package managers

| Package manager | Lock file(s) | Owner chain (why is it installed) | Refresh an indirect package within declared ranges (no manifest edit) | Force a version (temporary) | Built-in audit | Source |
| --- | --- | --- | --- | --- | --- | --- |
| npm | `package-lock.json` (or `npm-shrinkwrap.json`) | `npm explain <pkg>` (alias `npm why`, `--json`) reads the installed tree; from the lock alone use `npm ls <pkg> --all --package-lock-only` | `npm update <pkg>` re-resolves every copy of `<pkg>` within its parents' ranges; it cannot go past a parent's range | `overrides` in the root `package.json` only (nested and parent-scoped keys) | `npm audit` (needs a lock); `audit fix` stays in range and never writes overrides | https://docs.npmjs.com/cli/v11/commands/npm-update · https://docs.npmjs.com/cli/v11/commands/npm-explain · https://docs.npmjs.com/cli/v11/commands/npm-ls · https://docs.npmjs.com/cli/v11/configuring-npm/package-json#overrides |
| pnpm | `pnpm-lock.yaml` | `pnpm why <pkg>` (`--json`, `-r`, `--depth`) | `pnpm update <pkg>` (default depth: all) matches indirect packages by name; naming a version for an indirect-only package is refused from 11.23 / 12.0 | `overrides` in `pnpm-workspace.yaml` (root); 11.0+ no longer reads the `pnpm` field of `package.json` | `pnpm audit`; `--fix` writes overrides (to `pnpm-workspace.yaml` from 10.8), `--fix=update` (11.0+) changes only the lock | https://pnpm.io/cli/why · https://pnpm.io/cli/update · https://pnpm.io/cli/audit · https://pnpm.io/settings/dependency-resolution |
| Yarn (Berry, v2+) | `yarn.lock` | `yarn why <pkg>` (`-R`, `--json`) | `yarn up -R <pkg>` re-resolves every range of `<pkg>` and leaves manifests alone | `resolutions` in the root manifest | `yarn npm audit` audits only direct dependencies unless `-A -R`; no fix | https://yarnpkg.com/cli/why · https://yarnpkg.com/cli/up · https://yarnpkg.com/cli/npm/audit · https://yarnpkg.com/configuration/manifest#resolutions |
| pip (+ pip-tools) | none native (`pip lock` → `pylock.toml` is experimental, 25.1+); pinned requirements by convention | `pip show <pkg>` (immediate parents); `pipdeptree --reverse --packages <pkg>` for the chain | pip: N/A (no lock); pip-tools `pip-compile -P <pkg>` keeps other pins | constraints file (`-c` / `PIP_CONSTRAINT`) narrows versions but cannot override a parent's requirement | none; use `pip-audit` | https://pip.pypa.io/en/stable/user_guide/#constraints-files · https://github.com/tox-dev/pipdeptree · https://pip-tools.pypa.io/en/latest/ |
| Poetry | `poetry.lock` | `poetry show <pkg> --tree --why` (immediate dependents) | `poetry update <pkg>` stays within constraints, leaves `pyproject.toml` alone, and unlocks named indirect packages | none native | none | https://python-poetry.org/docs/cli/ · https://github.com/python-poetry/poetry/issues/697 |
| uv | `uv.lock` | `uv tree --invert --package <pkg>` | `uv lock --upgrade-package <pkg>[==<v>]` keeps other locked versions, within constraints | `[tool.uv] override-dependencies` (absolute) or `constraint-dependencies`, read from the workspace-root `pyproject.toml` | `uv audit` (preview, OSV-backed; JSON and SARIF) | https://docs.astral.sh/uv/reference/cli/ · https://docs.astral.sh/uv/reference/settings/ · https://docs.astral.sh/uv/concepts/projects/sync/#upgrading-locked-package-versions |
| NuGet (.NET) | `packages.lock.json` (opt-in, `RestorePackagesWithLockFile`) | `dotnet nuget why <proj\|sln> <pkg>` (SDK 8.0.4xx+) | N/A: lowest applicable version wins, so an indirect version moves only when a parent's minimum rises or it is pinned | Central Package Management with `CentralPackageTransitivePinningEnabled` and a `<PackageVersion>` entry, or a top-level `PackageReference` | NuGet audit on restore (SDK 8.0.100+); `dotnet package update --vulnerable` (.NET 10) | https://learn.microsoft.com/nuget/consume-packages/central-package-management · https://learn.microsoft.com/nuget/concepts/auditing-packages · https://learn.microsoft.com/dotnet/core/tools/dotnet-nuget-why |
| Maven | none in core | `mvn dependency:tree -Dincludes=<g:a> -Dverbose` | N/A: nearest definition wins; any change edits the POM | `<dependencyManagement>` (takes precedence over mediation) | none built in | https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html · https://maven.apache.org/plugins/maven-dependency-plugin/tree-mojo.html |
| Gradle | `gradle.lockfile` (opt-in, `dependencyLocking`) | `gradle dependencyInsight --dependency <g:n> --configuration <c>` | with locking, `--update-locks <g:m>` (other modules may move too) | `dependencies { constraints { … } }`; `strictly` pins; `resolutionStrategy.force` as a last resort | none built in | https://docs.gradle.org/current/userguide/dependency_locking.html · https://docs.gradle.org/current/userguide/dependency_constraints.html · https://docs.gradle.org/current/userguide/viewing_debugging_dependencies.html |
| Go modules | none (`go.sum` holds checksums only) | `go mod why -m <mod>`; `go mod graph` | N/A: minimal version selection has no ranges; `go get <mod>@<v>` then `go mod tidy` edits `go.mod` | raise the `require` in the main `go.mod` (`replace` needs a matching `require`) | none; use `govulncheck` | https://go.dev/ref/mod |
| Cargo | `Cargo.lock` | `cargo tree -i <pkg>` | `cargo update <pkg> [--precise <v>]` edits only the lock, within requirements | `[patch.crates-io]` in the root manifest | none; use `cargo-audit` | https://doc.rust-lang.org/cargo/commands/cargo-update.html · https://doc.rust-lang.org/cargo/commands/cargo-tree.html · https://doc.rust-lang.org/cargo/reference/overriding-dependencies.html |

## Scanners

| Scanner | Scan command | Machine output | Accept an advisory (file and fields) | Native expiry | Development dependencies | Reachability | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OSV-Scanner v2 | `osv-scanner scan source -r <dir>`; `osv-scanner scan -L <lockfile>` (repeat `-L`) | `--format json\|sarif\|cyclonedx-1-5`; `--output-file <path>`; JSON on stdout, diagnostics on stderr; exit `0` clean, `1` findings, `127` tool error, `128` no packages found | `osv-scanner.toml` (own directory only; `--config` applies one file to all) `[[IgnoredVulns]]` `id` plus optional `reason` and `effectiveUntil` (`ignoreUntil` deprecated; `reason` is not enforced; ignoring an ID also ignores its aliases; no owner field, so record the owner beside the entry) | yes (`effectiveUntil`) | reported; a project may ignore the dev group with `[[PackageOverrides]] group = "dev"` plus `vulnerability.ignore = true`, but that hides the group rather than accepting one advisory | Go call analysis by default (needs `go` on `PATH`); Rust experimental (`--call-analysis=rust` compiles the project and executes dependency `build.rs`); none for JavaScript | https://google.github.io/osv-scanner/configuration/ · https://google.github.io/osv-scanner/output/ · https://google.github.io/osv-scanner/usage/scan-source · https://google.github.io/osv-scanner/supported-languages-and-lockfiles/ |
| Trivy (fs, repo) | `trivy fs <path>`; `trivy repo <path\|url>` | `--format json\|sarif\|cyclonedx\|…` | `.trivyignore` lines `<ID> exp:YYYY-MM-DD`; `.trivyignore.yaml` (experimental, `--ignorefile`) `id`, `expired_at`, `statement` | yes (`exp:` / `expired_at`) | excluded by default for most lock files; `--include-dev-deps` adds them | none | https://github.com/aquasecurity/trivy/blob/main/docs/guide/configuration/filtering.md · https://github.com/aquasecurity/trivy/tree/main/docs/guide/coverage/language |
| npm audit | `npm audit` | `--json` | none | no | included; `--omit=dev` excludes | none | https://docs.npmjs.com/cli/v12/commands/npm-audit |
| pnpm audit | `pnpm audit` | `--json` | `audit.ignore: [GHSA-…]` in `pnpm-workspace.yaml` (11.16+); `--ignore`, `--ignore-unfixable` | no | included; `--prod` / `--dev` | none | https://pnpm.io/cli/audit |
| pip-audit | `pip-audit -r requirements.txt`; `pip-audit <dir>` | `-f json\|cyclonedx-json\|markdown` | `--ignore-vuln <ID>` (command line only) | no | audits exactly the input given | none | https://github.com/pypa/pip-audit |
| .NET package list | `dotnet package list --vulnerable --include-transitive` (.NET 10; `dotnet list package …` before) | `--format json` | `<NuGetAuditSuppress Include="<advisory URL>"/>` for restore audit | no | N/A | none | https://learn.microsoft.com/dotnet/core/tools/dotnet-package-list · https://learn.microsoft.com/nuget/concepts/auditing-packages |
| govulncheck | `govulncheck ./...` | `-format json\|sarif\|openvex` (exit 0 with these formats) | none (no way to silence a finding) | N/A | test files only with `-test` | symbol-level call graph, Go only | https://go.dev/doc/security/vuln/ · https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck |
| cargo-audit | `cargo audit [--file Cargo.lock]` | `--json`; `--format sarif` (0.22.0+) | `.cargo/audit.toml` `[advisories] ignore = [IDs]` (no reason field); `--ignore` | no | every lock entry audited | none | https://github.com/rustsec/rustsec/tree/main/cargo-audit |
| Dependabot alerts | `gh api "repos/{owner}/{repo}/dependabot/alerts?state=open&per_page=100" --paginate` | JSON (REST) | dismiss with a required `dismissed_reason` and an optional 280-character comment; auto-triage rules | no (auto-dismissed alerts reopen when their scope changes) | filter `scope=development\|runtime` | JavaScript/TypeScript preview (2026-10-28); do not dismiss on a reachability verdict alone. Alerts come from the default branch, so they are an input and never the re-scan of an unmerged change: re-scan the lock with OSV-Scanner or the manager's audit; the alert closes after the fix merges | https://docs.github.com/en/code-security/dependabot/dependabot-alerts/about-dependabot-alerts · https://docs.github.com/en/rest/dependabot/alerts · https://docs.github.com/en/code-security/dependabot/dependabot-auto-triage-rules/about-dependabot-auto-triage-rules |

### OSV-Scanner runbook

Use OSV-Scanner when the project declares it, when no declared or native scanner covers every ecosystem in the repository, when the native audit cannot run (for example the retired npm audit endpoint), or when CI needs one SARIF file for code scanning. It reads the resolved lock files in [Supported artifacts and manifests](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/); prefer a lock file to a manifest, because manifests carry ranges.

1. **Check availability.** `osv-scanner --version`. If it is absent, present the install route for the platform — release binary, `brew install osv-scanner`, `go install github.com/google/osv-scanner/v2/cmd/osv-scanner@latest`, or the `ghcr.io/google/osv-scanner` image — and wait for approval before installing anything.
2. **Scan.** From the repository root, scan every detected lock file (create the output directory first):

   ```bash
   osv-scanner scan source -r . --format json --output-file tmp/reports/osv-scan-<date>.json
   ```

   Use `--format sarif --output-file <path>` for CI, and repeat `--lockfile <path>` instead of `-r` when only named locks are in scope. `-r` respects `.gitignore`, so a lock file ignored there is not scanned.
3. **Read the exit code before the report.** `0` = no findings, `1` = findings, `127` = tool error, `128` = no packages found. `127` and `128` mean the scan did not cover the tree: report blocked, never clean. JSON goes to stdout and diagnostics to stderr, so use `--output-file` when the file must be pure JSON.
4. **Accept advisories where the scanner reads them.** `osv-scanner.toml` applies only to files in its own directory and does not propagate to child directories; `--config <path>` applies one file to the whole scan. `[[IgnoredVulns]]` takes `id` plus `reason` and `effectiveUntil` (`ignoreUntil` is the deprecated spelling), and ignoring an ID also ignores its aliases. The tool treats `reason` and `effectiveUntil` as optional; every entry this framework writes carries both. OSV has no owner field: write the owner beside the entry (a comment in the same file, or the project's own record). A project-wide development-dependency policy uses `[[PackageOverrides]]` with `group = "dev"` and `vulnerability.ignore = true`; record it as a policy decision, never as a per-advisory acceptance without reason, owner and expiry.
5. **Reachability lowers priority only.** Go call analysis is on by default and needs `go` on `PATH`; Rust call analysis is experimental and compiles the project, executing dependency `build.rs` files, so enable it only on vetted code. There is no JavaScript call analysis, so a finding is never closed on reachability evidence.
6. **Do not use `osv-scanner fix` as the remediation.** It is experimental, supports only npm lock files/manifests and Maven POMs, can run package-manager scripts and private registries, ignores `osv-scanner.toml`, and edits manifests and locks. `/package-upgrade --mode=remediate` owns fixes; OSV-Scanner remains the scanner that proves them.
7. **CI.** The upstream reusable workflows are pinned by tag: `google/osv-scanner-action/.github/workflows/osv-scanner-reusable-pr.yml@<version>` reports only new vulnerabilities on a pull request, and `osv-scanner-reusable.yml@<version>` runs a full or scheduled scan; both upload SARIF by default and set `--format` and `--output`, so do not override those two through `scan-args`. Replace `<version>` with the current release tag, keep the pin current, and keep the scheduled full scan beside the per-change scan.

## Facts that change a decision

- **No in-range refresh** for NuGet, Maven and Go: the remediation starts at the parent upgrade, and the "force" route is the ecosystem's pin.
- **Audit fixers differ:**
  - `npm audit fix` never writes overrides;
  - `pnpm audit --fix` writes overrides (use `--fix=update` for a lock-only change);
  - `dotnet package update --vulnerable` picks the lowest non-vulnerable version.

  A fixer that writes an override has created a temporary force: record it and remove it once the lock holds the fixed version without it.
- **Lock-only resolution** (the throwaway copy of remediation step 4, so the research installs nothing):
  - npm: `npm install --package-lock-only` uses only `package-lock.json` and ignores `node_modules`;
  - pnpm: `pnpm install --lockfile-only` updates only `pnpm-lock.yaml` and `package.json`, and writes nothing to `node_modules`;
  - Yarn Berry: `yarn install --mode=update-lockfile` skips the link step and only fetches packages missing from the lock.

  None of these pages says whether lifecycle scripts run, so also pass npm's `--ignore-scripts`. Sources: https://docs.npmjs.com/cli/v11/commands/npm-install · https://pnpm.io/cli/install · https://yarnpkg.com/cli/install
- **pnpm 11 ignores the `pnpm` field of `package.json`.** Overrides and patched dependencies left there stop applying after the upgrade. Check `pnpm-workspace.yaml` before concluding that a force exists.
- **Yarn Berry's audit sees only direct dependencies** unless run with `-A -R`. A clean default run proves nothing about indirect packages.
- **Suppression without expiry:**
  - These have no native expiry: npm audit, pnpm audit, pip-audit, .NET, cargo-audit and Dependabot dismissal. Record the reason, owner and expiry next to the entry (a comment in the same file, or the project's policy) and re-check by date.
  - govulncheck cannot suppress at all: an accepted advisory lives in the project's own record.
- **Retired endpoint:** npm's legacy audit API was retired after 2026-07-15, so `yarn audit` (Classic) and `pnpm audit` up to 10 no longer work. Use OSV-Scanner, or upgrade the manager. Sources: https://github.com/pnpm/pnpm/releases/tag/v11.0.0 · https://github.com/orgs/community/discussions/192768
- **Development dependencies:** Trivy excludes them by default for most lock files, while npm, pnpm and OSV-Scanner include them. Two scanners on the same tree can therefore disagree.

## Unverified cells

Check these against current documentation before relying on them:
- Yarn Classic's command to update an indirect package.
- How `dotnet package update --vulnerable` records a fix for an indirect package.
- Whether `NuGetAuditSuppress` also silences `dotnet package list --vulnerable`.
- Poetry's workaround of declaring the indirect package as a direct constraint.
- Whether Gradle `--update-locks` stays within declared ranges.
- Whether `pip-compile -P` moves indirect packages.
