---
name: package-upgrade
version: 1.1.0
description: '[Code Quality] Use when planning dependency upgrades or researching breaking changes in any package ecosystem. --mode=remediate fixes a red dependency scan, alert or vulnerable-package issue at the owning package.'
---

## Quick Summary

**Goal:** Change dependency versions safely in any package ecosystem: plan upgrades from official evidence, or remediate vulnerable packages at the package that owns them, with every moved version researched and the result proven.

**Summary:**

- **Two modes, one owner of dependency version changes.** Default = plan: analyse and write a phased upgrade report; it edits nothing. `--mode=remediate` = fix a red dependency scan, an alert or a vulnerable-package issue end to end, behind an approval gate.
- **Fix at the owner.** Remediation follows the shared rule `dependency-fix-at-owner` (its route order, temporary forces and expiring accepted entries live there); `references/mode-remediate.md` applies it step by step.
- **Research every moved version.** Both modes derive the moved packages from the lock difference, not from the declared packages alone, and cite a release note for each.
- **Proof.** Plan mode declares its confidence. Remediate mode is done only when the project's own scanner re-scan shows accepted entries only.

**Workflow (plan, default):** inventory manifests, locks and usage → research the latest or named target of each package, plus every package the change moves → assess risk and order → write the report → approval gate → declare confidence.

**Workflow (`--mode=remediate`):** read [references/mode-remediate.md](references/mode-remediate.md) in full first → advisory table → owner chains and routes → moved-package research → approval → apply → re-scan → tests → close-out with authority → evidence and health report.

**Key Rules:**

- Official sources only (registry pages, release notes, changelogs, migration guides); cite each. Confidence below 90% asks the user to verify.
- Per-ecosystem commands (owner chain, refresh within range, forced versions, lock files, scanners) come from [references/ecosystems.md](references/ecosystems.md); never guess a command.
- Plan mode never edits project files; it writes only its own notes and report under `tmp/`. Remediate mode edits dependency declarations, locks and suppression files only after approval or an explicit request to fix, and takes no external action (remote scan re-run, issue close, settings change) without authority for that action. Git stays with the `commit` and `pull-request` skills.

## Contents

- [Quick Summary](#quick-summary)
- [Mode Dispatch](#mode-dispatch)
- [Project inputs](#project-inputs)
- [Plan mode](#plan-mode)
- [Guidelines](#guidelines)
- [Closing Reminders](#closing-reminders)

## Mode Dispatch

| Mode | Use when | Read first |
| --- | --- | --- |
| _(none)_ — plan | Planning upgrades, checking outdated dependencies, researching breaking changes before a version change | this file |
| `--mode=remediate` | A dependency vulnerability scan failed, an alert fired, or an issue or report lists vulnerable packages to fix | [references/mode-remediate.md](references/mode-remediate.md) — in full, before any step |

- Both modes resolve the same project inputs (below) and the same ecosystem table.
- A project protocol overlay that targets `package-upgrade` applies in both modes; an overlay meant for one mode says so in its own text.
- Entry points that hand remediation here: `fix --target=ci|issue` when the failing job or issue is a dependency scan, the `workflow-bugfix` "dependency advisory" triage kind, and `security-audit` dimension D3 when a fix is asked.

## Project inputs

Resolve once, before Phase 1 or remediation step 1:

1. `docs/project-config.json` → optional `dependencySecurity` section (scanners with command, lock files and config file; accepted-entry policy; deadlines per severity; alert owner; scheduled-scan identity). Read it with `node .claude/scripts/project-context.cjs --section dependencySecurity`. An `Undeclared config section` error means the section is absent, which is valid: derive instead. Any other error means the config is malformed: repair it before relying on it.
2. Without that section, derive from the repository: manifests and lock files present (match their names against [references/ecosystems.md](references/ecosystems.md)), scanner commands in CI workflows and package scripts, and existing suppression files.
3. `testing.commands.affected` in the same config, when declared, selects the tests a changed-file list reaches.
4. Ask the user only for what neither source answers, such as which scanner decides "done". Never invent a scan result.

## Plan mode

Write working notes to `tmp/analysis/package-upgrade-analysis.md` with sections: Metadata (the request), Progress, Package Inventory, Version Research, Moved Packages, Breaking Changes, Risk Assessment, Upgrade Strategy.

### Phase 1: Inventory and usage

- Find every manifest and lock file of every ecosystem the repository uses, including nested workspaces, tool folders and lock files outside the main workspace.
- For each manifest record: project name and location, runtime or framework version, dependencies by category (runtime, framework, UI, build, test, utilities), development dependencies.
- Build one **Master Package List** of unique packages.
- For each package record usage: projects using it, number of importing files, main usage areas, configuration files, and an upgrade risk level (Low, Medium, High, Critical) by usage breadth.

### Phase 2: Research

Research in batches of 10 packages.

- **Target version:** the latest stable release from the ecosystem's official registry page, or the version the user named. Record release date.
- **Breaking changes:** migration guides, changelogs and release notes from the official source (registry page, repository releases, `CHANGELOG`). Record each breaking change with its migration step, deprecations and peer or compatibility changes.
- **Moved packages:** when the planned change touches a lock, resolve it in a throwaway copy of the manifests and lock, list every package whose resolved version moves, declared or not, and research each one the same way. When the user has not allowed running the package manager, predict the moved list from registry metadata and label it a prediction. Plan mode leaves the project's own files unchanged. Version numbers are a promise, not proof: a minor or patch move still gets its release notes read, and the repository is searched for its old exact version (`dependency-fix-at-owner` step 5).
- Document current vs target version, the gap (major, minor, patch), breaking changes, deprecations and peer changes.

### Phase 3: Risk and order

**Risk categories:**

- **Critical:** 5+ major versions behind, a runtime or framework package, or 50+ breaking changes.
- **High:** 3–4 major versions behind, state-management or data-access packages, or 20–30 breaking changes.
- **Medium:** 1–2 major versions behind, some breaking changes.
- **Low:** patch or minor updates with no breaking change found in the release notes.

**Upgrade order:** runtime and language toolchain → frameworks and their tooling → framework extensions → third-party libraries → development tools last.

### Phase 4: Report

Write `tmp/reports/package-upgrade/<YYYY-MM-DD>-package-upgrade-report.md` with: Executive Summary · Package Inventory by Project · Version Gap Analysis · Moved Packages (from the lock difference) · Breaking Changes Catalog · Migration Complexity · Compatibility Analysis · Recommended Upgrade Strategy (phases) · Detailed Migration Guides · Testing Strategy · Rollback Plan · Timeline and Effort · Appendices (sources).

### Phase 5: Approval gate

Present the report and wait for explicit approval. Plan mode edits nothing; implementing the plan is a separate request.

### Phase 6: Confidence declaration

State overall confidence (High 90–100%, Medium 70–89%, Low below 70%) with evidence: manifests and locks found, packages researched (X of Y), moved packages researched, breaking changes documented, sources used. List assumptions. Below 90%: name the packages the user should verify before proceeding.

## Guidelines

- **Complete discovery:** every manifest and lock of every ecosystem in the repository.
- **Official sources only,** cited per claim; no community summaries as primary evidence.
- **Breaking changes first:** prioritise changes that need code edits.
- **Evidence-based risk:** judge complexity from breaking changes, usage breadth and dependency order.
- **Practical plan:** phases with realistic effort, each independently testable.
- **Batch research** in groups of 10.

> **[IMPORTANT]** Use `TaskCreate` to break all work into small tasks before starting; keep task depth proportional to the work.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `dependency-fix-at-owner` — Fix a vulnerable dependency at the package that decides its version, research every moved version and prove it with a re-scan; fixing, upgrading or accepting a vulnerable or outdated dependency → .claude/skills/shared/protocols/dependency-fix-at-owner.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:dependency-fix-at-owner:reminder -->

**IMPORTANT MUST ATTENTION** fix at the owning parent (refresh within range → parent upgrade → temporary force → accepted entry with reason, owner and expiry), research every package the lock difference moves and search the repository for its old exact version, and call it done only when the project's scanner re-scan shows accepted entries only.

<!-- /SYNC:dependency-fix-at-owner:reminder -->

## Closing Reminders

**Goal:** Change dependency versions safely in any ecosystem — plan from official evidence, or remediate at the owning package — with every moved version researched and the result proven.

**MUST ATTENTION Main steps:**

- **Plan (default):** inventory manifests, locks and usage → research the latest or named target plus every moved package → risk and order → report under `tmp/reports/` → approval gate → confidence. Plan mode edits nothing.
- **Remediate (`--mode=remediate`):** read `references/mode-remediate.md` in full → advisory table → owner chain and route ladder → moved-package research → approval → apply and remove temporary forces → re-scan until only accepted entries remain → targeted tests then the full lane once → close-out with per-action authority → evidence and health report.

- **MUST ATTENTION** take ecosystem commands from `references/ecosystems.md`; never guess one.
- **MUST ATTENTION** research every package the lock difference moves, not only declared packages; cite a source for each.
- **MUST ATTENTION** an accepted entry needs a reason, an owner and an expiry; reachability lowers priority only.
- **MUST ATTENTION** Git operations stay with `commit` / `pull-request`; external actions need explicit authority each.
