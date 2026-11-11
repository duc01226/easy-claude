# `package-upgrade --mode=remediate` — fix vulnerable dependencies at their owner

> Read in full by `package-upgrade` when invoked with `--mode=remediate`, before step 1. It follows `dependency-fix-at-owner` (read `.claude/skills/shared/protocols/dependency-fix-at-owner.md` when its text is not in context) and takes every ecosystem command from `references/ecosystems.md`.

**Goal:** Turn a red dependency scan, an alert or a vulnerable-package issue into a reviewed change that fixes each advisory at the package that owns it, with every moved version researched, proven by the project's own scanner, and closed only with the user's authority.

**Done when:** a re-scan with the project's scanner reports accepted entries only, the evidence report below is complete, and every external action taken had its own authority.

## Contents

- [Contract](#contract)
- [Steps](#steps)
- [Evidence contract](#evidence-contract)
- [Called from another skill](#called-from-another-skill)
- [Closing Reminders](#closing-reminders)

## Contract

| Part | Rule |
| --- | --- |
| **Inputs** (any one) | a failed scan run (CI job or scheduled workflow) · an issue or alert listing advisories · a scanner output file (JSON or SARIF preferred) · a pasted report |
| **Project inputs** | `dependencySecurity` in `docs/project-config.json` when declared (`scanners[].command`, `scanners[].lockfiles`, `scanners[].configFile`, `acceptedEntries.maxDays`, `deadlinesDays`, `alertOwner`, `scheduledScan`); otherwise derived as `SKILL.md` → Project inputs says |
| **Missing input** | No report and no runnable scanner: find the scanner from CI workflows, package scripts and suppression files; ask the user only for what is still missing. Never invent advisories or scan results. A scanner that cannot run makes the run **blocked**, never done |
| **Output** | the change in the working tree (uncommitted) and the run report `tmp/reports/package-upgrade/<YYYY-MM-DD>-remediation-<slug>.md` |
| **Authority** | edits wait for approval (step 5) unless the user already asked for the fix; each external action waits for its own authority (step 9); Git belongs to `commit` / `pull-request` |

Write the report incrementally: create it at step 1 and append after each step.

## Steps

### 1. Read the report into an advisory table

- Read the run log, alert, issue or file. For a scheduled run, read the job output, not the auto-filed issue's summary alone.
- Prefer machine-readable output: re-run the project's scanner with its JSON or SARIF option (ecosystem table, scanner rows) when the given input is prose.
- One row per advisory: identifier (CVE, GHSA, OSV id), severity, package@version, ecosystem and lock file, fixed version(s) if any, dev-only or runtime.
- Record the scanner command and its configuration file, so step 7 runs the same check.

### 2. Rank

- First, advisories known to be exploited (when the advisory or a known-exploited list says so), then by severity. Severity measures impact, not likelihood.
- Exploitability evidence (call analysis, configuration that disables the vulnerable feature, dev-only scope) **lowers priority only**; record it with `file:line` or config evidence. Static reachability is weak for dynamic languages.
- Note each advisory's deadline from `deadlinesDays` when declared.

### 3. Trace owner chains and pick routes

For each advisory:

1. Run the ecosystem's owner-chain command (ecosystem table) and record the path from a declared package to the vulnerable one.
2. Name the owning parent: the nearest package whose declared range or release decides the vulnerable version. A declared package owns itself.
3. Check routes in order and stop at the first that delivers the fixed version:
   - **Refresh within range** — the owning parent's declared range already allows a fixed version: update the lock only (ecosystem table, "update within range"). If the package manager will not move an indirect package by name, add a temporary force, resolve, then remove the force and confirm the lock keeps the fixed version.
   - **Parent upgrade** — a newer release of the owning parent (patch, minor, or major) brings the fix. A major or behaviour-changing upgrade is called out for the approval gate.
   - **Temporary force** — no parent release brings it yet: force the indirect version (ecosystem table, "force a version"), record why the first two routes failed, and plan its removal. If the lock cannot keep the fixed version without it, it becomes an accepted entry with reason, owner and expiry.
   - **Accepted entry** — no fixed version exists, or the project is not affected (with evidence): add it to the scanner's suppression file with reason, owner and expiry (at most `acceptedEntries.maxDays` days when declared).
4. Check existing forces and accepted entries on the way: a force whose floor is now vulnerable, a force the lock no longer needs, or an expired entry is part of this remediation.

### 4. Research every moved package

1. Produce the candidate lock without committing to it: take a copy of the manifests and locks under `tmp/`, then resolve in the working tree (restore from the copy if the user declines at step 5). Resolving runs the package manager: when the user asked for no installs or no commands yet, predict the moved packages from registry metadata instead, label the list a prediction, and confirm it against the real lock difference after approval.
2. Diff the lock before and after. **Every** package whose resolved version moved is listed, declared or not.
3. For each moved package, read its release notes, changelog or migration guide from the official source for the versions crossed. Record the source link and a verdict: `no impact` (cite why), `code change needed`, or `test needed`.
4. Search the code for every API, option, output shape and default each breaking change touches; cite `file:line`.
5. Moved packages outside the advisory's owner chain are still researched: a refresh pulls in unrelated minor versions too.

### 5. Approval gate

Show the advisory table, routes (with the reason earlier routes failed), moved-package table with verdicts, planned code and test changes, the accepted entries with reason, owner and expiry, and the planned tests. Wait for explicit approval.

Skip this question only when the user already asked for the fix to be made; then state that the request is the approval and continue. Restore the copies taken in step 4 if the user declines.

### 6. Apply

- Apply the routes. Remove every temporary force the lock no longer needs, and confirm the lock still holds the fixed version.
- Fix each breaking change at the code that owns it, and add or update a test that fails without the fix (follow the project's test conventions; write the test with the fix).
- Add accepted entries to the scanner's own suppression file with reason, owner and expiry, in the scanner's native fields (ecosystem table, scanner rows). Where the scanner has no expiry or reason field, write them beside the entry (a comment in the same file, or the project's own record), and where it cannot suppress at all, keep the entry only in that record.
- Do not change unrelated code, and do not edit generated files by hand.

### 7. Re-scan

- Run the project's scanner with the command and configuration recorded in step 1, against every lock it scans.
- Only accepted entries may remain. Any other advisory returns to step 3 for that advisory. A new advisory introduced by the change is fixed the same way.
- When several scanners are declared, each must pass.

### 8. Tests

1. Run the tests that exercise moved packages first: `testing.commands.affected` with the changed files when declared, otherwise the test files that import the moved packages.
2. Then run the project's full test lane once.
3. Record both. Claim "all tests pass" only after the full lane passed; an unavailable full lane is reported as not run.

A failing test follows the project's failure investigation before any fix; never weaken a test to pass.

### 9. Close-out

Each of these needs the user's explicit authority, asked once per action:

- re-running the project's scheduled scan remotely (`dependencySecurity.scheduledScan` when declared) and linking the green run;
- commenting on or closing the alert or issue with the evidence;
- changing a repository setting (for example turning on automated security updates).

Committing, pushing and opening a pull request go through the `commit` and `pull-request` skills, on the user's request.

### 10. Report and remediation path health

Finish the run report with the evidence contract below and a **Remediation path health** section:

- automated security-update setting: on, off, or "could not read" (never assumed);
- the alert owner (`alertOwner` when declared, otherwise who receives the auto-filed issue, or "none");
- every force and accepted entry in the project with reason, owner and expiry, naming expired or reason-less ones;
- the scheduled scan's last result after close-out, when authorized.

## Evidence contract

The report holds:

1. **Advisory table:** id, severity, package@version, owner chain, owning parent and declared range, route, reason earlier routes failed, exploitability evidence.
2. **Scanner:** command and configuration file; summary of findings before and after.
3. **Moved packages:** package, from → to, source link, verdict, `file:line` of affected code.
4. **Forces and accepted entries:** added, kept and removed, each with reason, owner and expiry.
5. **Tests:** targeted set and its result, full lane and its result.
6. **Close-out:** each authorized action and its link; each declined or pending one.
7. **Remediation path health.**

**Identifiers only:** reports and comments name packages, versions and advisory identifiers. Never paste scanner logs, URLs carrying tokens, or credentials.

## Called from another skill

- `fix --target=ci|issue` hands a failing dependency-scan job or vulnerable-package issue here.
- `workflow-bugfix` triage kind "dependency advisory" runs this mode as its fix step. Its RED proof is the scanner: the advisory is reported on the old lock and not on the new one, plus a test that fails without the fix for each breaking change found.
- `security-audit` dimension D3 reports findings; when the user asks for the fix, it hands them here.

The caller keeps its own review and verification steps; this mode still runs steps 1–8 and its evidence contract.

## Closing Reminders

**Goal:** fix each advisory at the package that owns it, research every moved version, prove it with the project's scanner, and act externally only with authority.

**MUST ATTENTION Main steps:** advisory table → rank (reachability lowers priority only) → owner chain and route ladder → moved-package research from the lock difference → approval gate → apply and remove temporary forces → re-scan until only accepted entries remain → targeted tests then the full lane once → close-out, one authority per action → evidence and health report.

- **MUST ATTENTION** take ecosystem commands from `references/ecosystems.md`; never guess one.
- **MUST ATTENTION** an accepted entry carries reason, owner and expiry in the scanner's own file.
- **MUST ATTENTION** no runnable scanner = blocked, never done; targeted tests never stand in for the full lane.
