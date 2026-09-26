---
name: pull-request
version: 1.0.0
description: '[Git] Use when asked to create, open, finish, update or mark ready a pull request. Runs in the main session without asking: branch, commit, /workflow-review-changes --fix-loop over the whole branch, open the PR, drive CI to green.'
---

## Quick Summary

**Goal:** Drive current work to a pull request **ready to merge** — not draft, whole branch reviewed by a converged `/workflow-review-changes --fix-loop`, every CI check green — asking the user nothing until done or truly blocked.

**Summary:**

- **Purpose:** one invocation creates a new PR, finishes the current PR, or flips a draft to ready. Invocation IS explicit authority for add/commit/push/PR operations on the selected branch — nothing more.
- **Main session, zero questions:** run every step inline; the [Autonomy Contract](#autonomy-contract) settles each ask point of called skills. Only a **Blocker** hands back: blocker list + report, plus a draft PR only when the branch already has pushed commits and PR tooling works.
- **Review before commit:** the review receipt binds the exact candidate tree → review whole branch + pending changes first, then commit identical content. Every later edit (test fix, CI fix, merge) gets a fresh review before its commit.
- **Main steps:** (1) target → (2) branch → (3) stage + guard → (4) `/workflow-review-changes --fix-loop` over `<target>...HEAD` ∪ uncommitted → (5) local tests → (6) `commit` skill → (7) push + create/ready PR → (8) CI loop until green → (9) mergeable check + report.

**Workflow:**

1. **Target** — base named in request → open PR's base → `pullRequest.targetBranch` (`docs/project-config.json`) → `main`.
2. **Branch** — on target or detached HEAD → `git switch -c <type>/<slug>` (uncommitted work carried along); any other branch → stay.
3. **Stage + guard** — `git add -A` minus secrets; `doc-stamp-guard.cjs --staged` unstages stamp-only churn.
4. **Review loop** — `/workflow-review-changes --fix-loop` over whole branch + pending work; converges on a zero-fix round, mints receipt.
5. **Local tests** — configured test commands; fix at owning layer; re-review.
6. **Commit** — via `commit` skill, reusing Step 4 receipt.
7. **Push + PR** — `git push -u origin <branch>`; create PR (not draft) or update it + `gh pr ready`.
8. **CI loop** — wait; failure → evidence → root cause → fix → review → commit → push → wait again, until all green.
9. **Mergeable** — not draft, no conflicts, `mergeStateStatus` clean (or blocked only by human review); report.

**Key Rules:**

- MUST ATTENTION run inline in the main session; NEVER hand the whole task to a sub-agent — why: `workflow-review-changes` owns its convergence loop only in the main session.
- MUST ATTENTION settle every ask point via the Autonomy Contract and record the decision in the report; NEVER ask the user mid-run — why: the user asked for a finished PR; a question only delays it.
- MUST ATTENTION commit only content a converged review covered; NEVER self-approve a skip receipt — why: the commit gate binds the exact candidate tree.
- NEVER merge the PR, enable auto-merge, push to the target branch, force-push, rebase/amend a pushed commit, or run a destructive git command — resolve drift with `git merge --no-commit` + `/git-conflict-resolve`, then review and commit through the `commit` skill.
- NEVER skip, weaken or delete a test or check — fix the failure at its root cause.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Pull Request Skill

## Authority

Invocation IS the user's explicit request for every Git/GitHub operation below, scoped to the current repository and the PR branch it selects or creates: `add`, `commit`, `push` of that branch, branch creation, `gh pr create | edit | ready`. NEVER authorizes merging the PR, enabling auto-merge, pushing to the target branch, force-pushing, rewriting pushed history, or `reset --hard` / `clean -f` / `checkout -- <path>` / `restore <path>` / `stash drop`. Record a git-operation lease for `["add","commit","push"]` per `commit` skill Step 0; revoke it in a `finally` path.

## Execution — main session, no questions

- Run every step in the main session. `/workflow-review-changes --fix-loop`, `commit` and `fix` run inline via the `Skill` tool; their own reviewer sub-agents still fan out per their skills. — why: `workflow-review-changes` MUST run inline in the main session, never as a sub-agent, because it owns its convergence loop there; this session owns the whole task end to end.
- Ask the user nothing before or during the run. Settle each decision via the [Autonomy Contract](#autonomy-contract); record it in the report. — why: the user asked for a finished PR; a question only delays it.
- Finish with one report: PR URL, state, target + branch, review rounds, local test result, CI result, deferred/blocked items.

## Procedure

Write `tmp/reports/pull-request-<date>-<branch>.md` from the first step; append after each step — why: a cut-off run still leaves evidence.

### Step 1 — Resolve target branch

1. Run `git remote` + `gh auth status`. No `gh` → use GitHub MCP tools if present. Neither → branch, commit and push still work, but opening a PR or watching CI does not → stop there, report a Blocker.
2. Find an open PR for the current branch: `gh pr list --head <current-branch> --state open --json number,baseRefName,isDraft,url`.
3. Target = first that applies:
   1. Base branch the user named in the request. Open PR has a different base → retarget: `gh pr edit <n> --base <target>`.
   2. Open PR's `baseRefName` — covers finishing an existing PR.
   3. `pullRequest.targetBranch` in `docs/project-config.json`.
   4. `main`.
4. Run `git fetch origin <target>`. Base ref = `origin/<target>`, falling back to local `<target>` when no remote branch exists. Neither exists → config or request wrong → Blocker.

### Step 2 — Choose branch

- **Current branch = target, or HEAD detached** → `git switch -c <type>/<slug>` from HEAD. `<type>` = conventional-commit type of the work (`feat`, `fix`, …); `<slug>` = kebab-case, ≤40 chars, from the change's intent; name exists locally or on `origin` → append `-2`, `-3`, …. Uncommitted work comes along; nothing stashed or reset. Local commits ahead of `origin/<target>` come along too — report that local `<target>` still holds them; NEVER reset it.
- **Any other branch** → stay; it already carries the PR's work.
- No commits ahead of base + no pending changes → nothing to PR; report and stop.

### Step 3 — Stage and guard pending changes

1. `git status`, then `git add -A` — the user asked for all staged + unstaged work to be committed. Leave out secret-like files (`.env*`, keys, credential files) via `git restore --staged -- <path>`; list them in the report.
2. `node .claude/hooks/lib/doc-stamp-guard.cjs --staged`. Exit `3` → `git restore --staged -- <paths>` for the stamp-only files; leave them in the working tree. NEVER revert the working tree.
3. **Review candidate target.** Nothing left unstaged → review uses the default `worktree` target (working tree = index). Anything left unstaged → pass `--target=staged` to the fix-loop snapshot; each round `git add`s the paths it fixed before the next snapshot. — why: the receipt binds the exact candidate tree; reviewed content MUST equal committed content.

### Step 4 — Review whole branch: `/workflow-review-changes --fix-loop`

Run `/workflow-review-changes --fix-loop` inline via the `Skill` tool, scope `<base-ref>...HEAD ∪ current uncommitted changes` — the three-dot base is the fixed merge-base, so the review covers every branch commit + pending work. Follow that workflow's `references/fix-loop.md` as written: each round re-runs the whole default workflow over the recomputed scope (parallel reviewers, validated fixes at the owning layer, `/docs-update`); converges on a zero-fix round; keeps round cap + severity floor; mints the `workflow-review-changes` receipt.

- A skipped review, partial scope, or self-approved skip receipt NEVER counts.
- **Integration-merge scope** (uncommitted merge from Step 7.1 or Step 9): review the PR's net change — `git diff <base-ref>` over the working tree, after `git fetch origin <target>` — with conflict-resolved hunks called out. Incoming target-branch commits are NOT review targets: they were reviewed on the target branch. The receipt still binds the whole merge candidate. — why: during an uncommitted merge `HEAD` is the pre-merge commit, so the default `...HEAD ∪ uncommitted` scope would pull every incoming target commit into the review.
- Fix-loop escalates (cap spent with blockers open, blockers not shrinking, blockers increasing, ambiguous intent) → **Blocker**. Nothing unreviewed is committed: the receipt exists only after convergence, so pending work stays uncommitted in the working tree. Then hand back per the Blocker rule in the [Autonomy Contract](#autonomy-contract), listing the open findings.

### Step 5 — Verify locally

Run configured test commands: `testing.commands` or `integrationTestVerify.quickRunCommand` in `docs/project-config.json`, or `/test`. Failure → record a provisional verdict (SOURCE-WRONG / TEST-WRONG / TEST-NOT-OPTIMAL / ENVIRONMENT-BLOCKED / AMBIGUOUS), investigate the root cause, fix at the owning layer, re-run Step 4 over the changed candidate — why: every fix needs a fresh receipt. NEVER weaken an assertion, add a skip, or relax a timeout. No test command configured → record it in the report; CI is then the only verification.

### Step 6 — Commit via `commit` skill

Invoke the `commit` skill over the staged candidate. Every mandatory message part applies: `Estimate:` first body line, purpose → what → how body, Reviewers block, attribution footer. Its interactive gates are settled by the [Autonomy Contract](#autonomy-contract); the Step 4 receipt passes its Review Gate. Candidate changed after the receipt → re-run Step 4. NEVER commit with `--no-verify`; NEVER run a raw `git commit` outside the skill.

### Step 7 — Push and open PR

1. `git push -u origin <branch>`. Rejected because the remote branch moved → `git pull --no-rebase --no-commit origin <branch>` so the merge result stays uncommitted, resolve conflicts via `/git-conflict-resolve`, review it (Step 4, integration-merge scope), commit via Step 6, push again. NEVER force-push — why: a merge commit created outside the `commit` skill skips the receipt-bound review.
2. **No open PR** → `gh pr create --base <target> --head <branch> --title "<conventional title>" --body-file <file>`. No `--draft`.
3. **Open PR** → `gh pr edit <n> --body-file <file>`; draft → `gh pr ready <n>`.
4. **PR body** — what the branch does (purpose → what → how); review evidence (rounds, report path, deferred LOW findings); local test evidence; per-area Reviewers block; `Fix-Origin:` field when `commit.fixOriginTrailer` is `true`; same attribution footer as the `commit` skill.

### Step 8 — CI loop: wait, fix, repeat until green

1. **Wait:** `gh pr checks <n> --watch --interval 30`. Wait would outlast the host tool timeout → run it in the background or re-run it. NEVER sleep in the foreground past the timeout. Then read the final state: `gh pr checks <n> --json name,state,bucket,link,workflow`.
2. **No checks yet:** checks register late after a push → keep polling up to ~5 minutes. Still none + `gh pr view <n> --json statusCheckRollup` empty → the repository runs no CI on this PR; record `CI: none configured`, go to Step 9.
3. **All `pass` / `skipping`** → Step 9.
4. **Any `fail` / `cancel`** → per failed check:
   1. Read the evidence. GitHub Actions → `gh run view <run-id> --log-failed` (run id in the check `link`). Other providers → the check's link or description.
   2. Test the environment hypothesis before blaming code. Log names an infrastructure cause (runner lost, registry/network timeout, quota) → **one** rerun: `gh run rerun <run-id> --failed`. Second infrastructure failure → Blocker. NEVER rerun to fish for green.
   3. Otherwise `/fix --target=ci`: trace the root cause backward from the failing log, fix at the owning layer — a stale test included, only once adjudicated TEST-WRONG. NEVER skip, delete, or weaken a check or test to get green.
   4. Re-run Step 4 over the fix (scope = current uncommitted changes; the branch is already reviewed), then Step 5, Step 6, push.
5. Loop to step 1. No attempt cap while each attempt removes a failure or changes its cause. **Blocker** when the same failure signature survives 3 attempts addressing different causes, or the fix needs something outside the repository (secret, permission, runner/service setup, product decision).

### Step 9 — Ready to merge

Read `gh pr view <n> --json isDraft,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup`.

| State                                                                                               | Action                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isDraft: true`                                                                                     | Run `gh pr ready <n>`.                                                                                                                                     |
| `mergeable: CONFLICTING`, or `mergeStateStatus: DIRTY` / `BEHIND` (base requires up-to-date branches) | Run `git merge --no-ff --no-commit origin/<target>` (no rebase). Resolve conflicts with `/git-conflict-resolve`, review the uncommitted result (Step 4, integration-merge scope), commit via Step 6, push, then repeat Step 8. |
| `mergeStateStatus: BLOCKED` with no human-review cause | Run `gh pr checks <n> --required`. Required check pending or not yet reported → back to Step 8 and wait; still missing after the Step 8.2 grace period → Blocker naming the check. Other branch rule → Blocker naming it. |
| `mergeStateStatus: UNSTABLE` | A non-required check is failing → Step 8.4 (every check must pass). |
| `mergeable: UNKNOWN`                                                                                | GitHub is still computing it. Read the state again after a short wait.                                                                                     |
| `reviewDecision: REVIEW_REQUIRED` / `CHANGES_REQUESTED`                                             | Only a human can clear this. Report it as outstanding, not as a failure of this run.                                                                       |

**Done** = not draft · `mergeable: MERGEABLE` · `mergeStateStatus` `CLEAN` or `HAS_HOOKS` — or `BLOCKED` solely by a `reviewDecision` of `REVIEW_REQUIRED` / `CHANGES_REQUESTED` — · every check `pass`/`skipping` (or `CI: none configured`) · review converged with a receipt · local tests green or recorded as not configured. NEVER merge — stop at ready.

## Autonomy Contract

The user asked not to be asked → every question a called skill would put to the user is settled here, with the decision recorded in the report. A decision unsafe to make alone → **Blocker**, never a guess.

| Ask point                                                                                                                                    | Decision                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `commit` Step 2.6 no-op doc guard                                                                                                            | Already applied in Step 3: unstage the stamp-only files and keep the working tree.                                                |
| `commit` Step 3.5 Test-Verify Gate                                                                                                           | Answer **Yes — already verified** only with Step 5 evidence for this exact candidate. Otherwise run Step 5 first. NEVER **Skip**. |
| `commit` Step 3.6 Review Gate                                                                                                                | Covered by the Step 4 receipt. With no receipt, run Step 4. NEVER mint a skip receipt.                                            |
| `workflow-review-changes` and its child skills' option menus after completion                                                                | Continue with this procedure.                                                                                                     |
| Integration-test sync, translation sync, AMBIGUOUS spec drift, a MATERIAL trade-off, fix-loop escalation, a conflict whose intent is unclear | **Blocker**: record the evidence and the options, stop that path, and report.                                                     |

A **Blocker** ends the run — the only point control returns to the user. Hand back by what exists:

- **Branch already has pushed commits and PR tooling works** → keep or create the PR as draft (`gh pr ready <n> --undo` for an open ready PR) and list every blocker in its body + the final report.
- **Otherwise** (no `gh`/MCP, no target branch, no pushed commits yet) → final report only. Pending work stays uncommitted in the working tree; NEVER commit or push unreviewed work to make a PR possible — why: the commit gate refuses it, and a PR built on unreviewed work breaks the skill's promise.

## Related

- `commit` — the only commit path; its Push & PR section routes pull-request requests here.
- `workflow-review-changes` — the `--fix-loop` review run over the whole branch.
- `fix` — `--target=ci` diagnoses and fixes CI failures.
- `git-conflict-resolve` — resolves merge conflicts with the target branch.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — one per procedure step, plus a final review task.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `environment-fault-hypothesis` — Weigh the environment as a competing cause, with a named discriminator; judging a bug report, failing test, error or unexpected output → .claude/skills/shared/protocols/environment-fault-hypothesis.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `root-cause-debugging` — Systematic root-cause debugging, never guess-and-check; debugging a failure → .claude/skills/shared/protocols/root-cause-debugging.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:environment-fault-hypothesis:reminder -->

**MUST ATTENTION** environment-fault gate: a bug, failed test, error, or odd output is NOT proof of a code defect. Sweep environment preconditions (versions, deps/install state, config & env vars, services, ports/network/clock, permissions, leftover state) and resource/transience suspects (RAM, CPU, disk, handles, network, timeouts) as a competing hypothesis, cite the discriminator you ran, and fix an environment cause in the environment — never by editing code or weakening a test. "Flaky" is a symptom, not a verdict.

<!-- /SYNC:environment-fault-hypothesis:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->
## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Drive current work to a pull request **ready to merge** — not draft, whole branch reviewed by a converged `/workflow-review-changes --fix-loop`, every CI check green — asking the user nothing until done or truly blocked.

- **MUST ATTENTION — MAIN STEPS IN ORDER:** (1) target: request → open PR base → `pullRequest.targetBranch` → `main` · (2) branch: new only when on target or detached · (3) stage + guard · (4) `/workflow-review-changes --fix-loop` over `<target>...HEAD` ∪ uncommitted · (5) local tests · (6) `commit` skill · (7) push + create/ready PR · (8) CI loop until green · (9) mergeable check + report.
- **MUST ATTENTION — INLINE, NO QUESTIONS:** run the whole procedure in the main session; the Autonomy Contract settles every ask point — why: `workflow-review-changes` owns its loop only in the main session, and the user asked not to be asked.
- **MUST ATTENTION — REVIEW BEFORE COMMIT:** the receipt binds the exact candidate. Every later edit, CI fix included, gets a fresh `/workflow-review-changes --fix-loop` before its commit. NEVER self-approve a skip.
- **MUST ATTENTION — CI FIXES:** root cause first, environment hypothesis included; one rerun only for a named infrastructure cause. NEVER weaken, skip or delete a test or check.
- **NEVER** merge, enable auto-merge, push to the target branch, force-push, rewrite pushed history, or run a destructive git command — stop at ready to merge.
- **Blocker** = listed blockers + report (+ draft PR only when pushed commits and PR tooling exist) — the only hand-back before done; NEVER commit unreviewed work to create a PR.
- **MUST ATTENTION** create one task per procedure step plus a final review task before starting.

**Anti-Rationalization:**

| Evasion                                                | Rebuttal                                                                                                                          |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| "Hand the whole task to a sub-agent"                   | The procedure runs in the main session. `workflow-review-changes` must run inline there, and a sub-agent cannot own its loop.     |
| "The user will want to confirm the branch name"        | They asked not to be asked. Derive the name, write it in the report, move on.                                                     |
| "Only the new changes need review"                     | The first review covers `<target>...HEAD` ∪ uncommitted: the whole branch. Only later CI-fix rounds narrow to the new diff.       |
| "CI is red because of a flaky test, rerun until green" | One rerun, and only for a named infrastructure cause. Anything else is investigated and fixed at its root.                        |
| "Mark the failing test skipped so the PR goes green"   | That forces green. Adjudicate the test, then fix the source or the stale test.                                                    |
| "Checks passed, merge it"                              | The target is ready to merge, not merged. Never merge.                                                                            |
| "Commit first, review later"                           | The commit gate needs a receipt for the exact candidate, so review comes first. The reviewed content is then committed unchanged. |
