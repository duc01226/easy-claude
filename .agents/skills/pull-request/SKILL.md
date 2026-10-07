---
name: pull-request
description: '[Git] Use when asked to create, open, finish, update or mark ready a pull request. Runs in the main session with risk-based test/review choices and automatic checks for routine CI repairs: branch, commit, open PR, CI to green.'
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Host-native execution: Codex runs a skill by loading its `SKILL.md` instructions and executing the required steps with available tools. No separate `Skill` tool is required; a loaded skill is already activated.
> - Source vs execution: prefer the registered `.agents/skills/<name>/SKILL.md` for Codex execution. `.claude/**` remains the canonical authoring source; reading it for a registry or source inspection does not switch this session to Claude Code.
> - Capability check: interpret Claude tool names through the active host before declaring a blocker. Continue when Codex can perform the required operation; stop and ask only when the actual capability is unavailable, naming the step and evidence. Host-native execution is not a protocol deviation and needs no extra approval.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - Use ask user question tool to ask user.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
## Quick Summary

**Goal:** Drive authorized work to a ready-to-merge PR with whole-branch review, current local test evidence or explicit user skips, and green CI; reuse safe continuity and automatically check routine CI repairs while asking again for substantial or high-risk new scope.

Read [linked work integration](../task-track/references/integration-guide.md) at intake/start, actual saves, verification, handoff and close. Apply [linked work and final candidate](#linked-work-and-final-candidate) before publication and final readiness; tracker checks preserve the existing test/review choices and Git authority. With tracking on, [Step 3.3](#step-33--work-tracking-reminder) asks once whether to update or create tracked work for this PR; Skip is always offered and the reminder never blocks the PR.

**Summary:**

- **Purpose:** one invocation creates a new PR, finishes the current PR, or flips a draft to ready. Invocation IS explicit authority for add/commit/push/PR operations on the selected branch — nothing more.
- **Main session, risk-based decisions:** read `commit` → [Test and review decision policy](../commit/SKILL.md#test-and-review-decision-policy) before both gates. Ask initially/on material escalation with explicit Skip; preserve the last answers and cumulative scope; auto-select/run fresh checks for routine CI repairs.
- **Review before commit:** whole-branch review plus an exact commit-candidate receipt, or explicit current-scope user Skip. New content invalidates evidence, not automatically the preference to run checks.
- **Main steps:** (1) target → (2) fresh branch at the latest target → (3) stage + guard + test decision → (4) whole-branch review decision → (5) verify final evidence → (6) `commit` skill → (7) push + create/ready PR → (8) CI loop until green → (9) mergeable check + report.

**Workflow:**

1. **Target** — base named in request → open PR's base → `pullRequest.targetBranch` (`docs/project-config.json`) → `main`.
2. **Branch** — a PR branch starts at the latest target. Already merged into target → `git switch --no-track -c <type>/<slug> origin/<target>`, no rebase. Otherwise on target or detached HEAD → new branch from HEAD. Behind the latest target and not yet pushed → stash, `git rebase origin/<target>`, pop; conflicts → `$git-conflict-resolve`. Already pushed → never rebased.
3. **Stage + guard** — `git add -A` minus secrets; `doc-stamp-guard.cjs --staged` unstages stamp-only churn. Tracking on → one work-tracking reminder (update / create / skip) before the test decision.
4. **Review decision** — select/run or ask under the shared decision policy; full branch scope and exact-candidate receipts remain mandatory.
5. **Final evidence** — refresh affected checks/receipts after edits; ask again only when the decision policy detects escalation or an explicit constraint.
6. **Commit** — via `commit`, passing recorded answers, decision origin, current evidence and receipt; no duplicate question for a settled gate.
7. **Push + PR** — `git push -u origin <branch>`; create PR (not draft) or update it + `gh pr ready`.
8. **CI loop** — wait; failure → evidence → root cause → fix → review → commit → push → wait again, until all green.
9. **Mergeable** — not draft, no conflicts, `mergeStateStatus` clean (or blocked only by human review); report.

**Key Rules:**

- MUST ATTENTION run inline in the main session; NEVER hand the whole task to a sub-agent — why: `workflow-review-changes` owns its convergence loop only in the main session.
- MUST ATTENTION apply the shared decision policy before asking: first publication and material risk/scope escalation need human choices; safe continuous repairs run fresh tests/review automatically. Never fabricate an answer or select Skip.
- MUST ATTENTION commit only a candidate covered by a review receipt or an explicit user-approved skip receipt. NEVER self-approve a skip; report skipped review truthfully.
- MUST ATTENTION review the WHOLE branch: scope is always `<base-ref>...HEAD` ∪ uncommitted (the total diff that will merge into the target), never the latest commit or the current changes alone — why: a defect introduced in an earlier commit of the branch ships in the PR exactly like one in the last commit.
- NEVER merge the PR, enable auto-merge, push to the target branch, force-push, rebase/amend a pushed commit, or run a destructive git command — rebase only commits no remote ref contains (Step 2's never-pushed test); resolve drift on a pushed branch with `git merge --no-commit` + `$git-conflict-resolve`, then review and commit through the `commit` skill.
- The work-tracking reminder (Step 3.3) is a choice, never a gate: ask once when tracking mode is `observe` or `linked`, always offer Skip, honour it without asking again, and route Update/Create to `$task-track`. NEVER write tracker records from this skill or infer assignment, readiness, proof or acceptance from the diff.
- A user-approved Skip waives only the selected local test or review gate for the named candidate. NEVER weaken/delete tests or checks, bypass required CI, or describe skipped work as passed.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Pull Request Skill

## Authority

Invocation IS the user's explicit request for every Git/GitHub operation below, scoped to the current repository and the PR branch it selects or creates: `add`, `commit`, `push` of that branch, branch creation and `switch`, `stash push | pop`, `rebase` of that branch's own unpushed commits (Step 2), `gh pr create | edit | ready`. NEVER authorizes merging the PR, enabling auto-merge, pushing to the target branch, force-pushing, rewriting pushed history, or `reset --hard` / `clean -f` / `checkout -- <path>` / `restore <path>` / `stash drop`. Record a git-operation lease for `["add","commit","push"]` per `commit` skill Step 0; revoke it in a `finally` path.

## Execution — main session, risk-based test and review decisions

- Run every step in the main session. `$workflow-review-changes --fix-loop`, `commit` and `fix` run inline via the skill invocation; their own reviewer sub-agents still fan out per their skills. — why: `workflow-review-changes` MUST run inline in the main session, never as a sub-agent, because it owns its convergence loop there; this session owns the whole task end to end.
- Read `.claude/skills/commit/SKILL.md` → **Test and review decision policy** before Steps 3.5/4 and each CI repair; it owns continuity, cumulative risk, last-answer state and automatic lanes for both skills. Apply [User Choice Contract](#user-choice-contract) only when a human choice is required. Pass settled decisions to `commit` without duplicate questions.
- Finish with one report: PR URL, state, target + branch, review rounds, local test result, CI result, deferred/blocked items.

## Procedure

Write `tmp/reports/pull-request-<date>-<branch>.md` from the first step; append after each step — why: a cut-off run still leaves evidence.

## Linked work and final candidate

Use producer `pull-request` for standalone PR work; an existing linked workflow retains its actual producer/session/actor/run/occurrence. Nested commit/fix/review calls inherit it. Only the primary saving owner records each actual filesystem save once through the common checkpoint owner. Continue untracked when no link exists; offer exact linking once at a useful checkpoint. A PR URL/API success is publication evidence, not a saved filesystem observation, trusted proof or accepting decision.

1. **Collect the complete permitted candidate.** After resolving the actual base, use Step4's normal `<base-ref>...HEAD` plus pending authored work, including earlier branch commits, staged and unstaged work and publishable untracked paths. The actual read commands are `git diff --name-only --no-renames -z <base-ref>...HEAD`, `git diff --name-only --no-renames -z HEAD` and `git ls-files --others --exclude-standard -z`; parse NUL boundaries, normalize relative paths and retain deleted/renamed old and new paths. Limit pending paths to the authorized candidate and record excluded secrets/private/stamp-only or intentionally unpublished content with reasons. During an uncommitted integration merge, use Step4's net pending `git diff --name-only --no-renames -z <base-ref>` plus authorized untracked paths; incoming receiving-only changes are excluded by that baseline. A missing base, unsupported path or bounded/partial collection leaves scope incomplete; never replace it with the latest commit or an empty successful check.
2. **Inspect exact concerns.** Pass actual public candidate paths plus already exact linked IDs to `concerns --root CHECKOUT` using the common JSON stdin contract. Record candidate base/OIDs, paths/exclusions and diagnostic coverage separately: the tracker fingerprint cannot prove candidate completeness. Read original incoming/outgoing owners, relationships, prerequisites, optOut/retirement and current verification versus historical acceptance. A path match never authorizes updating every returned item.
3. **Perform warranted authorized maintenance.** Call the existing manual/core operations only for exact selected items and actual requested facts. Save source/artifact checkpoints through the primary saving owner once. Keep readiness, test/review proof and acceptance separate; ordinary CLI cannot forge trusted verifier observations. Reread exact owners after saved updates and inspect saved/skipped/pending/refused outcomes. Tracker changes are candidate changes and can invalidate review/test evidence, so return through Steps3.5–5 before committing them.
4. **Recollect and recheck the fresh candidate.** Before Step7 publication and Step9's ready report, collect again and rerun concerns after any review fix, CI repair, merge, source/criteria or tracker update. If candidate identity/scope changed since checking, repeat the affected check; never reuse an earlier check for a later candidate. Preserve the existing human-answer baseline, exact receipts, pending questions, caps and decision policy. Missing/partial/unavailable tracking is disclosed with reasons; it neither becomes passed proof nor hides a required project Ready blocker.
5. **Agent self-check and report.** Answer: “Have exact linked trackers been checked against the final PR scope, and are needed updates saved or pending with reasons?” Record the latest candidate/coverage, exact-owner reread, each needed action/result and unresolved reason in the PR report. This is the agent's self-check, not a routine user-approval question. Required test/review questions stay in the User Choice Contract. Keep a successful push/create/edit/ready outcome unchanged if optional tracking fails; retry only the retained secondary checkpoint/request, never repeat successful publication to repair tracking.

The sequence is candidate → concerns → warranted authorized update → exact-owner reread → fresh candidate check → agent self-check. Follow it at Step3 intake, Step5 final evidence, each Step8 repair and Step9 handoff; ordinary Run/Skip and disabled tracking/selection remain independent. Missing links create no companion tickets — a new item comes only from the user's Create answer in [Step 3.3](#step-33--work-tracking-reminder); unsupported native capability preserves its sources and stays unavailable.

### Step 1 — Resolve target branch

1. Run `git remote` + `gh auth status`. No `gh` → use GitHub MCP tools if present. Neither → branch, commit and push still work, but opening a PR or watching CI does not → stop there, report a Blocker.
2. Find an open PR for the current branch: `gh pr list --head <current-branch> --state open --json number,baseRefName,isDraft,url`.
3. Target = first that applies:
   1. Base branch the user named in the request. Open PR has a different base → retarget: `gh pr edit <n> --base <target>`.
   2. Open PR's `baseRefName` — covers finishing an existing PR.
   3. `pullRequest.targetBranch` in `docs/project-config.json`.
   4. `main`.
4. Run `git fetch --prune origin`. Base ref `R` = `origin/<target>`, falling back to local `<target>` when no remote branch exists. Neither exists → config or request wrong → Blocker. — why: pruning drops the `origin/<branch>` ref of a branch deleted after its merge, which Step 2 reads as "not pushed".

### Step 2 — Choose branch

<!-- REVIEWED FIXES — DO NOT REVERT. Each was reproduced in a throwaway git repo during the "branch PRs fresh" PR review; a framework re-sync had silently re-applied the old text three times.
1. `git switch -c --no-track <name> R` FAILS with "only one reference expected": `-c` consumes the next word as the branch name. Write `git switch --no-track -c <name> R`.
2. Every "merged" test must exclude HEAD == R: a zero-commit branch cut from an up-to-date R satisfies both `--is-ancestor` and the `merge-tree` tree comparison, and would be replaced, dropping the user's branch name.
3. "No `origin/<branch>` ref" does NOT mean never pushed (a branch cut a moment ago, a detached HEAD on a pushed commit, and a branch deleted after its merge all lack one). Test the commits themselves against the remote refs.
4. `--is-ancestor` cannot see squash or rebase merges (they get new SHAs); with no `gh` (Azure DevOps Server remotes) use the `merge-tree` tree comparison.
5. `git rebase --continue` reopens the commit-message editor after a conflict; `git -c core.editor=true …` avoids it in every shell (`GIT_EDITOR=true` is POSIX-only). -->

A PR branch starts at the latest `<target>` (`R` from Step 1.4). Name for a new branch: `<type>/<slug>` — `<type>` = conventional-commit type of the work (`feat`, `fix`, …); `<slug>` = kebab-case, ≤40 chars, from the change's intent; name exists locally or on `origin` → append `-2`, `-3`, ….

1. **Merged already?** Never when `git rev-parse HEAD` equals `git rev-parse R`: that is a branch just cut from `R` (or the target itself, level with `R`), not a merged one → it falls to item 2 and stays — why: `--is-ancestor` is also true for a branch just created at `R`, and replacing it would drop the user's branch name. Otherwise yes when any of these holds:
   - `HEAD` is an ancestor of `R`: `git merge-base --is-ancestor HEAD R` succeeds (also true on a local `<target>` behind `R`, and on a named branch whose commits `R` already contains).
   - Squash or rebase merge, git-only: `git merge-tree --write-tree R HEAD` prints a tree equal to `git rev-parse R^{tree}` (git ≥ 2.38; skip this test when unsupported or when it reports conflicts) — the content is already in `R` under other SHAs, which `--is-ancestor` cannot see.
   - `gh pr list --head <branch> --base <target> --state merged --json number,headRefOid` returns a PR whose `headRefOid` equals HEAD.
   - **Yes** → `git status --short` first: a clean tree means nothing to PR — report and stop, creating no branch. Otherwise `git switch --no-track -c <name> R` (flag order matters: `-c` takes the next word as the branch name). No rebase — nothing on this branch is left to carry over.
   - **Merged PR head is a proper ancestor of HEAD** (work added after the merge; needs `gh` for `headRefOid`) → `git switch -c <name>` from HEAD, then rebase with `--onto R <headRefOid>` only when the replayed commits pass the never-pushed test of item 2; otherwise stay.
2. **Not merged** → on target or HEAD detached: `git switch -c <name>` from HEAD (pending work and local commits ahead of `R` come along; report that local `<target>` still holds them; NEVER reset it). Then judge the branch against `R`:
   - **Up to date** (`git merge-base --is-ancestor R HEAD`) → stay.
   - **Behind `R`, never pushed** → rebase onto `R`. Never pushed = no commit to replay is reachable from a remote ref: `git rev-list --count HEAD ^B --not --remotes` equals `git rev-list --count B..HEAD`, with `B` = `R` (or `headRefOid` on the `--onto` path). — why: a lookup of `origin/<branch>` by name misses a branch cut a moment ago from a pushed commit, and a detached HEAD.
   - **Behind `R`, any commit to replay pushed** → stay, no rebase — it would rewrite pushed commits and need a force-push. Step 7.1 merges `origin/<branch>` and Step 9 merges `R` when GitHub reports the branch behind or conflicting.
3. **Nothing to PR** — decided before any `git switch -c`, and only for a branch that is not merged (item 1 handles a merged one, whose old commits would otherwise count as "ahead"): no commits ahead of `R` + no pending changes → report and stop.

**Moving with pending work.** `git switch` refuses when a local change collides with the destination, and `git rebase` refuses a dirty tree → `git stash push --include-untracked -m "pull-request <branch>"`, switch or rebase, `git stash pop`. A `pop` conflict → `$git-conflict-resolve` (stash-apply); the entry stays in the stash list, so name its ref in the report. NEVER `git stash drop`.

**Rebase.** `git rebase R` (or `--onto` above) on the unpushed branch only. A conflict → `$git-conflict-resolve`, `git add` the resolved paths, `git -c core.editor=true rebase --continue` (keeps the original message without opening an editor in a non-interactive run; works in every shell). A conflict whose intent is unclear → `git rebase --abort`, restore the stash, **Blocker**. Step 4 reviews the rebased branch as a whole, resolved hunks called out — why: replayed commits are new commits made outside the `commit` skill, and only the whole-branch review vouches for them.

### Step 3 — Stage and guard pending changes

1. `git status`, then `git add -A` — the user asked for all staged + unstaged work to be committed. Leave out secret-like files (`.env*`, keys, credential files) via `git restore --staged -- <path>`; list them in the report.
2. `node .claude/hooks/lib/doc-stamp-guard.cjs --staged`. Exit `3` → `git restore --staged -- <paths>` for the stamp-only files; leave them in the working tree. NEVER revert the working tree.
3. **Review candidate target.** Nothing left unstaged → review uses the default `worktree` target (working tree = index). Anything left unstaged → pass `--target=staged` to the fix-loop snapshot; each round `git add`s the paths it fixed before the next snapshot. — why: the receipt binds the exact candidate tree; reviewed content MUST equal committed content.

### Step 3.3 — Work-tracking reminder

One reminder per PR run that keeps tracked work in step with the pull request. It is a reminder with a choice, never a gate: Skip, a missing answer, missing tooling or a tracker refusal never stops or delays Steps 3.5–9.

1. **Decide whether to ask.** Read `mode` from the read-only `node .claude/skills/task-track/scripts/task-track.cjs inspect --root CHECKOUT`; the selected checkout's `.claude/docs/configuration/README.md`, section **Team work tracking**, defines the modes.
   - `off`, which includes a project with no `taskTracking` section → skip this step silently: no question, no report line.
   - The read refuses (malformed declared settings, unavailable profile, package setup failure) → no question; record `Work tracking: unavailable — <reason>` in the PR report and continue.
   - `observe` or `linked` → ask once, even when nothing matches; the question then offers only Create and Skip — why: with tracking on, work that no item records is what this reminder exists to surface.
2. **Find what this PR concerns.** Reuse the candidate paths and `concerns --root CHECKOUT` read of the [linked sequence](#linked-work-and-final-candidate) (items 1–2). Exact item IDs to pass are the IDs already linked to this session plus any token in the branch name, the commit messages of `<base-ref>..HEAD` or the PR title that equals an existing item `id` from `inspect` character for character. NEVER match by title resemblance or search the backlog for look-alikes. For each returned item note id, kind, title, recorded state and why it surfaced (exact ID, path concern or declared relationship). List opted-out, retired and `canceled` items as excluded with that reason, not as update candidates.
3. **Ask one question.** Call the ask-user question tool under the [User Choice Contract](#user-choice-contract): **Update work tracking for this pull request, create a new item, or skip?** Show what was found — each item's id, kind, state and reason — or `No tracked item matches this pull request's changes`. Offer:
   1. **Update matching item(s)** — offered when at least one updatable item was found. The user picks which listed items; a path match never selects every returned item.
   2. **Create a new item for this work** — capture this PR's work as a new tracked item.
   3. **Skip work tracking** — always offered. Record `Work tracking: skipped by user` and continue.

   Recommend one option from the evidence and say why: **Update** when an exact ID or session link matched; **Update**, naming the items for the user to confirm, when only path concerns matched; **Create** when nothing matched and the PR adds or changes behavior (a `feat`/`fix` branch, or changed source or test paths); **Skip** when nothing matched and the change is docs, config or chore only. A recommendation is advice: never answer for the user.
4. **Offer a real recorded state.** "Implemented" is not a tracker state. Read `states` from `catalogue --root CHECKOUT`: `draft`, `backlog`, `ready`, `in_progress`, `blocked`, `verifying`, `done`, `canceled`. The closest to "implemented and in a pull request" is `verifying` — the work is finished, proof and acceptance are still open — so say that mapping in the question and let the user pick: `verifying` (suggested for implemented work), `in_progress` (work continues after this PR), or leave the state unchanged. Ask it as a second question in the same tool call when the tool allows one, otherwise as one follow-up only after Update or Create. NEVER offer `done`: it is reached only through a human acceptance of current proof (`$task-track --mode=accept`), which a PR, green CI or a merge does not supply.
5. **Route the answer to `$task-track`.** This skill adds no tracker writer. Update → `$task-track --mode=maintain` for the changes the user asked for and `$task-track --mode=lifecycle` for the chosen state, on each selected exact item. Create → `$task-track --mode=maintain` (operation `create`; a new item starts as `draft`), then `$task-track --mode=lifecycle` toward the chosen state. Hand over the selected exact IDs, the user's chosen state and the PR's purpose as proposed title/intent text for the user to confirm there.
   - task-track's transition guard decides every move. From `draft` the path to `verifying` runs `backlog` → `ready` → `in_progress` → `verifying`; `ready` needs an actual reviewed readiness decision and `in_progress` needs a responsible member. The user states those facts in `$task-track`. Never infer assignment, readiness, proof or acceptance from the diff, commits, test results, CI or PR state.
   - A refused transition or a fact the user does not supply leaves the item at its last saved state: report the item, its state and the refusal, then continue the PR.
   - Saved tracker records are candidate changes: stage them with Step 3's rules so Steps 3.5–4 cover them, and reread the exact owners (linked sequence item 3).
6. **Honour the answer and keep going.** Skip is a complete answer: no second prompt, no persuasion, and no repeated reminder at Step 5, a Step 8 repair, Step 9 or resume in this run. Automatic upkeep for items already linked to the session keeps its own mode and optOut rules. When the question was posted asynchronously and no answer has arrived, or no question tool exists, continue the PR with no tracker change, record `Work tracking: question pending` with the question and its numbered choices in the PR report and the final message, and handle a later Update/Create answer as a follow-up candidate change through Steps 3.5–7 without repeating a successful publication.

Report one line: `Work tracking:` updated `<ids>` → `<state>` · created `<id>` (`<state>`) · skipped by user · question pending · unavailable — `<reason>`.

### Step 3.5 — Resolve local test decision

Apply the shared decision policy first. For a routine CI repair or safe continuation, automatically run configured affected test/build/lint/contract checks and record current evidence, or justified not-applicable status. Do not ask again. If a human choice is required, Call the ask-user question tool under the [User Choice Contract](#user-choice-contract) BEFORE pausing: **Run local tests before publishing, confirm already verified, or skip?** Offer:

1. **Run local tests (Recommended)** — execute the configured delta-scoped commands using the project phase rules and managed runners.
2. **Already verified** — show any existing evidence; the user confirms it covers this candidate. Do not choose this answer yourself.
3. **Skip local tests** — explicit user decision; record `Local tests: skipped by user`.

When asking for a candidate with no applicable test lane, explain the reason and offer **Confirm no tests required** alongside Run and Skip; Markdown skills and config may still need checks. Wait for an actual answer. Missing commands or a blocked required lane are unavailable, never passed: obtain an explicit current-scope Skip where permitted or stop. Failures require root-cause fixes and refreshed evidence. A skip never disables CI or project Ready gates.

### Step 4 — Resolve review of the whole branch

**Review scope invariant.** A pull-request review covers the TOTAL net change of the branch against the target: `git diff <base-ref>...HEAD` (three-dot, from the merge-base, every branch commit) ∪ uncommitted changes. NEVER only the latest commit (`HEAD~1..HEAD`, `git show`), never only the current working-tree changes, and never just the fix made since the last round — a later CI fix or merge is reviewed as part of the whole branch diff. Reviewing an existing PR (no local edits) uses the same scope from the PR's base (`baseRefName`) after `git fetch origin`. Record the scope proof in the report: base ref, merge-base SHA, `git rev-list --count <base-ref>..HEAD` and the changed-file count of `git diff --stat <base-ref>...HEAD`.

Apply the shared decision policy first. On an automatic/reused lane, select the qualifying fix-loop using `commit` Step 3.6 and run it over the whole scope; reuse existing evidence only when both scope and candidate match. If a human choice is required, Call the ask-user question tool under the [User Choice Contract](#user-choice-contract) BEFORE pausing: **Review the whole branch before publishing, use an existing review, or skip?** Offer all three `--fix-loop` review choices from `commit` Step 3.6, recommending one using its size/risk selection rule (whole-branch signals), plus **Use existing review** when its evidence covers this full scope, and **Skip review** last. Wait for the user's selection; a PR request is not an answer. A commit-only receipt does not prove the whole branch was reviewed.

For a review selection, run the selected `changes-review`, `why-review` or `workflow-review-changes` fix-loop inline via the skill invocation over the whole scope. For the full workflow, run `$workflow-review-changes --fix-loop` inline via the skill invocation, scope `<base-ref>...HEAD ∪ current uncommitted changes` — the three-dot base is the fixed merge-base, so the review covers every branch commit + pending work, a Step 2 rebase included. Follow that workflow's `references/fix-loop.md` as written: each round re-runs the whole default workflow over the recomputed scope (parallel reviewers, validated fixes at the owning layer, `$docs-manager --mode=update`); converges on a zero-fix round; keeps round cap + severity floor; mints the `workflow-review-changes` receipt.

- **User chooses Skip:** record the whole-branch scope proof and `Review: skipped by user`; this is not a successful review. If a commit is needed, follow `commit` Step 3.6 `snapshot` + `issue --kind=skip` using the exact prepared commit descriptor. Never mint a review receipt for skipped work. With no pending commit, record the explicit branch-scope skip in the PR report; no commit receipt is needed.
- A partial review or self-approved skip NEVER satisfies this gate. Reuse an existing full review under the shared decision policy only when the evidence matches this exact candidate and whole-branch scope; a settled automatic/reused lane needs no new confirmation. Reuse an explicit user Skip only for the unchanged candidate and scope it covers; changed content needs fresh review or a new explicit Skip.
- **Integration-merge scope** (uncommitted merge from Step 7.1 or Step 9): review the PR's net change — `git diff <base-ref>` over the working tree, after `git fetch origin <target>` — with conflict-resolved hunks called out. Incoming target-branch commits are NOT review targets: they were reviewed on the target branch. The receipt still binds the whole merge candidate. — why: during an uncommitted merge `HEAD` is the pre-merge commit, so the default `...HEAD ∪ uncommitted` scope would pull every incoming target commit into the review.
- Fix-loop escalates (cap spent with blockers open, blockers not shrinking, blockers increasing, ambiguous intent) → **Blocker**. No commit proceeds without a qualifying receipt or explicit user-approved skip. A failed review is not a skip; ask for any new skip decision instead of inventing one. Then hand back per the Blocker rule in the [User Choice Contract](#user-choice-contract), listing the open findings.

### Step 5 — Verify final evidence and decisions

Check that test evidence/decision and whole-branch review evidence/decision cover the final scope and exact commit candidate. Edits, review fixes and merges invalidate affected evidence: refresh checks and full-scope review automatically while the shared decision policy still permits continuity. Risk/scope escalation asks only for unsettled decisions; preserve pending questions. Prior Skip never transfers to changed content. Required loops keep their caps and blocker rules.

Complete the [linked final-candidate sequence](#linked-work-and-final-candidate), including exact-owner reread after warranted updates and recollection before publication. An optional pending result retains the primary outcome and its reason; required project gates remain blockers.

### Step 6 — Commit via `commit` skill

Invoke `commit` over the staged candidate with recorded last user answers, fixed human-answer baseline, selected actions/origin, current test evidence, whole-branch review proof and matching exact-candidate receipt. A settled automatic/reused decision is not a missing user answer: do not ask again. Escalated or pending choices must be answered first. Every message part applies: `Estimate:` first body line, purpose → what → how, Reviewers and attribution. Never use a raw `git commit` or `--no-verify`.

### Step 7 — Push and open PR

1. `git push -u origin <branch>`. Rejected because the remote branch moved → `git pull --no-rebase --no-commit origin <branch>` so the merge result stays uncommitted, resolve conflicts via `$git-conflict-resolve`, review it (Step 4, integration-merge scope), commit via Step 6, push again. NEVER force-push — why: a merge commit created outside the `commit` skill skips the receipt-bound review.
2. **No open PR** → `gh pr create --base <target> --head <branch> --title "<conventional title>" --body-file <file>`. No `--draft`.
3. **Open PR** → `gh pr edit <n> --body-file <file>`; draft → `gh pr ready <n>`.
4. **PR body** — what the branch does (purpose → what → how); review evidence (rounds, report path, deferred LOW findings) or `Review: skipped by user`; local test evidence or `Local tests: skipped by user`; per-area Reviewers block; `Fix-Origin:` field when `commit.fixOriginTrailer` is `true`; same attribution footer as the `commit` skill.

### Step 8 — CI loop: wait, fix, repeat until green

1. **Wait:** `gh pr checks <n> --watch --interval 30`. Wait would outlast the host tool timeout → run it in the background or re-run it. NEVER sleep in the foreground past the timeout. Then read the final state: `gh pr checks <n> --json name,state,bucket,link,workflow`.
2. **No checks yet:** checks register late after a push → keep polling up to ~5 minutes. Still none + `gh pr view <n> --json statusCheckRollup` empty → the repository runs no CI on this PR; record `CI: none configured`, go to Step 9.
3. **All `pass` / `skipping`** → Step 9.
4. **Any `fail` / `cancel`** → per failed check:
   1. Read the evidence. GitHub Actions → `gh run view <run-id> --log-failed` (run id in the check `link`). Other providers → the check's link or description.
   2. Test the environment hypothesis before blaming code. Log names an infrastructure cause (runner lost, registry/network timeout, quota) → **one** rerun: `gh run rerun <run-id> --failed`. Second infrastructure failure → Blocker. NEVER rerun to fish for green.
   3. Otherwise `$fix --target=ci`: trace the root cause backward from the failing log, fix at the owning layer — a stale test included, only once adjudicated TEST-WRONG. NEVER skip, delete, or weaken a check or test to get green.
   4. **Classify the repair before another question.** Apply `commit` → **Test and review decision policy** to the repair and cumulative authored changes. Routine bounded repair → automatically run affected local checks (Step 3.5), select/run Step 4 over the WHOLE branch (`<base-ref>...HEAD ∪ uncommitted`), refresh the exact-candidate receipt, then Step 5 → `commit` (Step 6) → push. Pass `automatic CI repair` as the action origin so nested `commit` does not ask again. New security/data/contract/deployment risk, substantial accumulated changes or uncertain intent → ask for fresh affected choices before publishing. A previous Skip does not authorize skipping repair checks.
5. Loop to step 1. No attempt cap while each attempt removes a failure or changes its cause. **Blocker** when the same failure signature survives 3 attempts addressing different causes, or the fix needs something outside the repository (secret, permission, runner/service setup, product decision).

### Step 9 — Ready to merge

Repeat the [fresh candidate check and agent self-check](#linked-work-and-final-candidate) after the last CI/merge repair, carrying exact secondary results and known gaps into the final report.

Read `gh pr view <n> --json isDraft,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup`.

| State                                                                                               | Action                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isDraft: true`                                                                                     | Run `gh pr ready <n>`.                                                                                                                                     |
| `mergeable: CONFLICTING`, or `mergeStateStatus: DIRTY` / `BEHIND` (base requires up-to-date branches) | Run `git merge --no-ff --no-commit origin/<target>` (no rebase). Resolve conflicts with `$git-conflict-resolve`, review the uncommitted result (Step 4, integration-merge scope), commit via Step 6, push, then repeat Step 8. |
| `mergeStateStatus: BLOCKED` with no human-review cause | Run `gh pr checks <n> --required`. Required check pending or not yet reported → back to Step 8 and wait; still missing after the Step 8.2 grace period → Blocker naming the check. Other branch rule → Blocker naming it. |
| `mergeStateStatus: UNSTABLE` | A non-required check is failing → Step 8.4 (every check must pass). |
| `mergeable: UNKNOWN`                                                                                | GitHub is still computing it. Read the state again after a short wait.                                                                                     |
| `reviewDecision: REVIEW_REQUIRED` / `CHANGES_REQUESTED`                                             | Only a human can clear this. Report it as outstanding, not as a failure of this run.                                                                       |

**Done** = not draft · `mergeable: MERGEABLE` · `mergeStateStatus` `CLEAN` or `HAS_HOOKS` — or `BLOCKED` solely by a `reviewDecision` of `REVIEW_REQUIRED` / `CHANGES_REQUESTED` — · every check `pass`/`skipping` (or `CI: none configured`) · full-scope review receipt or explicit user-approved review skip · local tests green, justified not applicable under the decision policy, or explicitly skipped by the user for the final candidate. Report skips prominently; they do not mean passed. NEVER merge — stop at ready.

## User Choice Contract

**Deliver the question before waiting.** For every unsettled test/review choice (Steps 3.5/4 when the decision policy requires a question, escalated refreshed candidates, failed-review skip decisions and resume with unsettled choices), invoke the available native ask-user question tool with the actual question and selectable options. A statement such as “waiting for your choice” or “STOP” does not display a question and cannot satisfy this step. Use the tool's exposed schema; do not merely name the tool in prose.

- **Claude Code:** call `ask user question tool`.
- **Codex:** call the available ask-user question tool, such as `functions.request_user_input_async` in Default mode. Use `request_user_input` only when its tool contract and the current mode permit this kind of question; do not switch to Plan mode just to ask for confirmation. Discover the available equivalent rather than assuming a tool name exists.
- **OpenCode:** call its native `question` tool.
- **Option limits:** preserve every applicable choice from Steps 3.5 and 4. If the tool limits option count, split into sequential questions (for example, run a review / use existing evidence / skip, then which review); never drop Skip from a required question. Automatic review selection uses the shared decision policy and is recorded as an agent decision.
- **Asynchronous delivery:** a tool acknowledgement means the question was posted, not answered. Record the question, candidate/scope and status `pending` in the PR report, pause dependent steps, and wait for the human reply. Preselection, silence and elapsed time are not consent. Resume only the answered branch; retain a pending question across compaction/resume without treating it as answered or posting duplicates.
- **Unavailable tool:** if no permitted question tool exists, visibly present the exact question and numbered choices in the response, explain the tool limitation, and wait for an explicit reply. Never end with only a status statement. This fallback applies only after checking the active host's capabilities; when a permitted tool is available, call it.

Both skills use `commit` → **Test and review decision policy**, independently of `portability.skillAutoTrigger` and workflow routing mode. A prior explicit answer for this exact candidate and required scope may be reused when calling `commit`; small continuations reuse preferences with fresh evidence. Routine active PR CI repairs automatically run tests and whole-branch review. First candidates, material escalation and explicit constraints still require human answers. General autonomy does not authorize Skip or additional Git operations.

- **Tests:** Run, applicable user-confirmed Already verified, or user-approved Skip; no applicable lane also offers Confirm no tests required. Automatically selected checks and justified not-applicable status are recorded truthfully.
- **Review:** when asking, offer all three fix-loop reviews from `commit` Step 3.6, valid full-scope existing review and explicit Skip; recommend one, never Skip. Automatic lanes select/run the appropriate qualifying review.
- **Receipt:** an exact-candidate review/skip receipt remains mandatory for changed commits. Only the user can authorize minting a skip receipt; old Skip never extends automatically.
- **Later changes:** refresh evidence/receipts; assess cumulative risk from the last actual human-answer baseline, which automatic commits never reset. Preserve answers, scope, decision origin and pending questions across compaction/resume and delegated briefs.
- **Other questions:** honor called skills' own gates and caps; this policy removes repeated preference questions, not missing-input or native-permission blockers.
- **CI:** local Skip never waives required checks, human approval or project Ready rules.

A **Blocker** ends the run. Pending user choices pause only dependent steps. If blocked, list evidence and options; keep/create a draft PR only when pushed commits and project authority permit it. Otherwise report with pending work uncommitted. Never fabricate a receipt or push unreviewed content without an explicit user-approved skip.

## Related

- `commit` — the only commit path; its Push & PR section routes pull-request requests here.
- `workflow-review-changes` — the `--fix-loop` review run over the whole branch.
- `fix` — `--target=ci` diagnoses and fixes CI failures.
- `git-conflict-resolve` — resolves merge conflicts with the target branch.
- `task-track` — `--mode=maintain` and `--mode=lifecycle` save the update or new item chosen in the Step 3.3 reminder.

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — one per procedure step, plus a final review task.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `environment-fault-hypothesis` — Weigh the environment as a competing cause, with a named discriminator; judging a bug report, failing test, error or unexpected output → .claude/skills/shared/protocols/environment-fault-hypothesis.md
- `root-cause-debugging` — Systematic root-cause debugging, never guess-and-check; debugging a failure → .claude/skills/shared/protocols/root-cause-debugging.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:environment-fault-hypothesis:reminder -->

**MUST ATTENTION** environment-fault gate: a bug, failed test, error, or odd output is NOT proof of a code defect. Sweep environment preconditions (versions, deps/install state, config & env vars, services, ports/network/clock, permissions, leftover state) and resource/transience suspects (RAM, CPU, disk, handles, network, timeouts) as a competing hypothesis, cite the discriminator you ran, and fix an environment cause in the environment — never by editing code or weakening a test. "Flaky" is a symptom, not a verdict.

<!-- /SYNC:environment-fault-hypothesis:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Drive authorized work to a ready-to-merge PR with whole-branch review, current local test evidence or explicit user skips, and green CI; reuse safe continuity and automatically check routine CI repairs while asking again for substantial or high-risk new scope.

- **MUST ATTENTION — MAIN STEPS IN ORDER:** (1) target: request → open PR base → `pullRequest.targetBranch` → `main` · (2) branch: merged → new branch at latest target; unpushed + behind → rebase (stash, `$git-conflict-resolve`); pushed → never rebased · (3) stage + guard · (3.5) test decision · (4) whole-branch review decision · (5) verify final evidence · (6) `commit` skill · (7) push + create/ready PR · (8) CI loop until green · (9) mergeable check + report.
- **MUST ATTENTION — DECIDE BEFORE ASKING:** use `commit` decision policy. Ask initially or on material risk/scope escalation; reuse safe same-branch preferences; auto-run fresh local checks and qualifying whole-branch review for routine CI repairs. Preserve explicit user constraints and pending questions.
- **MUST ATTENTION — REVIEW BEFORE COMMIT:** fresh evidence and exact-candidate receipts remain required after edits. Preferences can persist; old verified evidence and Skip cannot cover new content. Never self-approve Skip.
- **MUST ATTENTION — REVIEW THE TOTAL BRANCH DIFF:** every review round in a PR run covers `<base-ref>...HEAD ∪ uncommitted` (all branch commits against the merge-base), never only the latest commit or the working tree.
- **MUST ATTENTION — WORK-TRACKING REMINDER (Step 3.3):** tracking `off` or not configured → silent skip. `observe`/`linked` → one question (update matching items / create a new item / skip), Skip always offered and never re-asked; route Update/Create to `$task-track`, offer the real state `verifying` for "implemented", never `done`, and never block the PR on it.
- **MUST ATTENTION — CI FIXES:** root cause first, environment hypothesis included; one rerun only for a named infrastructure cause. NEVER weaken, skip or delete a test or check.
- **NEVER** merge, enable auto-merge, push to the target branch, force-push, rewrite pushed history, or run a destructive git command — stop at ready to merge.
- **Blocker** = listed blockers + report (+ draft PR only when pushed commits and PR tooling exist); user test/review questions also pause the run. NEVER commit unreviewed work without an explicit user-approved skip.
- **MUST ATTENTION** create one task per procedure step plus a final review task before starting.

**Anti-Rationalization:**

| Evasion                                                | Rebuttal                                                                                                                          |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| "Hand the whole task to a sub-agent"                   | The procedure runs in the main session. `workflow-review-changes` must run inline there, and a sub-agent cannot own its loop.     |
| "The user will want to confirm the branch name"        | Derive the branch name and report it; test and review decisions follow the shared risk/continuity policy.                                                     |
| "Rebase the pushed branch too, then force-push"        | Rebase rewrites pushed history and needs a force-push, which is never authorized. Merge `origin/<branch>` (Step 7.1) or `R` (Step 9) in instead.       |
| "Only the new changes need review"                     | The first review covers `<target>...HEAD` ∪ uncommitted: the whole branch. CI-fix rounds re-review the whole branch too — the fix is part of it.       |
| "CI is red because of a flaky test, rerun until green" | One rerun, and only for a named infrastructure cause. Anything else is investigated and fixed at its root.                        |
| "Mark the failing test skipped so the PR goes green"   | That forces green. Adjudicate the test, then fix the source or the stale test.                                                    |
| "The diff clearly finishes that item, mark it done"    | A diff proves no assignment, readiness, proof or acceptance. Ask the Step 3.3 question, route the answer to `$task-track`, and offer `verifying`; `done` needs a human acceptance. |
| "Checks passed, merge it"                              | The target is ready to merge, not merged. Never merge.                                                                            |
| "Commit first, review later"                           | The commit gate needs a review receipt or user-approved skip for the exact candidate. Resolve the decision policy and obtain current evidence; commit only that candidate. |
