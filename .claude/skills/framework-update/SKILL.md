---
name: framework-update
description: '[Utilities] Use only when the user asks to update or upgrade the .claude/.codex/.agents/.opencode skills framework to the latest easy-claude version. Merges upstream main into the project and keeps its own skills, hooks, agents, settings and edits.'
---

## Quick Summary

**Goal:** Bring all four framework folders, `.claude/`, `.codex/`, `.agents/` and `.opencode/`, up to the upstream version (default: the `main` branch of `https://github.com/duc01226/easy-claude`) by **merging**, never by copying, so every skill, hook, agent, setting and framework edit the project made survives. `.claude/` is merged; the other three are rebuilt from it by the closing sync, so they also carry the project's own skills and hooks.

**Summary:** Preflight → dry run → settle what needs a decision → apply → resolve conflicts → verify and report. One script downloads the upstream and runs the merge engine; you handle only what it cannot decide.

**Workflow:**

1. **Preflight** — clean framework folders, Node 18+, Git, network (or a local upstream checkout).
2. **Dry run** — `--dry-run --json`; read the base, counts, conflicts, mirror-only skills, mirror clashes and project-only files.
3. **Decide** — ask the user only about mirror-only skills, mirror clashes, a doubtful base or a dirty tree.
4. **Apply** — the same command without `--dry-run`, pinned to the upstream commit and base the dry run showed.
5. **Resolve** — read `references/merge-guide.md` and settle every conflict, keeping both sides' intent.
6. **Verify and report** — no markers, JSON parses, the sync passes; report what changed and what stayed.

**Key Rules:**

- MUST ATTENTION run only on the user's explicit request; never start it on your own or as a step of other work.
- MUST ATTENTION never delete, overwrite or "clean up" a project-owned file (a path upstream never shipped). The engine never merges, moves or deletes them, only recomputes their `<!-- COUNT -->` values; you change one only with the user's agreement (for example renaming a skill whose name upstream now also uses).
- MUST ATTENTION never copy upstream files over the project, and never hand-edit `.agents/`, `.codex/`, `.opencode/` or `AGENTS.md`: they are regenerated from `.claude/`.
- MUST ATTENTION the update is finished only when the closing sync has passed: until then `.codex/`, `.agents/` and `.opencode/` still hold the old version.
- Commit or push only when the user asks. The update and `.claude/framework-lock.json` belong in the same commit.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Contents

- [Quick Summary](#quick-summary)
- [The command](#the-command)
- [What is whose](#what-is-whose)
- [Procedure](#procedure)
- [A project without this skill yet](#a-project-without-this-skill-yet)
- [Troubleshooting](#troubleshooting)
- [Closing Reminders](#closing-reminders)

## The command

Run from the project root on Windows, macOS or Linux (plain `node`; no npm, no `package.json`):

```text
node .claude/skills/framework-update/scripts/update-from-upstream.mjs --dry-run --json
node .claude/skills/framework-update/scripts/update-from-upstream.mjs --base=<commit from the dry run>
```

| Option | Use it when |
| --- | --- |
| `--ref=<branch\|tag\|commit>` | the user names a version other than `main` |
| `--upstream=<git-url\|folder>` | the user names another repository or a fork, or the network is blocked and a local easy-claude checkout exists; default is the URL in the lock, else the GitHub repository |
| `--base=<commit>` / `--base=auto` | no lock yet: the dry run detects the base by content (`auto`); pin that commit when applying |
| `--no-sync` | the user wants to run the mirror sync later |
| `--record-only` | the project was just synced by hand: record the version without changing files |
| `--project=<folder>` | updating another project from an easy-claude checkout |
| `--engine=local` | the upstream version's engine cannot run (the default `upstream` runs the newest merge rules) |

The script keeps a blobless clone in `tmp/framework-update/upstream.git` (commits and folder listings only; file contents download in batches), so later runs only fetch what is new. Exit code: `0` done · `1` fatal · `2` something left to resolve (a conflict or a mirror clash).

## What is whose

| Path | Owner | What the update does |
| --- | --- | --- |
| A `.claude/` file upstream ships, has shipped since the base, or the lock lists | framework | Unchanged in the project → takes upstream (or deletes it when upstream deleted it). Changed only in the project → kept. Changed on both sides → three-way merge; overlaps get conflict markers. |
| Any other `.claude/` file: project skills, hooks, agents, scripts, protocols, ledgers | project | Never merged, moved or deleted; only its `<!-- COUNT -->` values are recomputed. Listed as `projectOnly`. |
| `settings.local.json`, `.ck.local.json` | each person | Never taken from upstream. |
| `SKILLS.yaml`, `skills_data.yaml`, `<!-- COUNT -->` values | generated | Regenerated from the project's own skill set, never merged. |
| `.agents/`, `.codex/`, `.opencode/`, `AGENTS.md`, `opencode.json` skill permissions | generated mirrors | Rebuilt from the merged `.claude/` by the closing sync (`/sync-codex`, which hands off to the OpenCode sync when `.opencode/` exists): upstream's new mirror files arrive, retired ones go, and the project's own skills, agents and hooks are mirrored too. |
| `.agents/skills/<name>` with no `.claude/skills/<name>` source | project | The sync keeps it and prints one `kept` line, but it reaches no other host; the engine lists it as `mirrorOnly` and still runs the sync. When a framework skill new in this update takes its name, the new skill's mirror would replace it: the engine lists it as a mirror clash (`mirrorClashes`) and skips the sync. The mirror of a framework skill the project no longer has (upstream retired it) is the framework's: the engine removes it. |
| `docs/`, `CLAUDE.md`, `docs/project-config.json`, everything outside the four folders | project | Never touched. |

## Procedure

### 1. Preflight

- `git status --porcelain -- .claude .agents .codex .opencode AGENTS.md opencode.json` must print nothing. Otherwise ask the user to commit or stash those changes first (the engine refuses, so the update stays one reviewable, undoable diff). Mention that a separate branch keeps the update easy to review.
- `node --version` (18+) and `git --version` must work. Git 2.29 or newer downloads the upstream files in batches; older Git still works, file by file and much slower (the engine prints a `WARNING`). The script reports a network failure; offer `--upstream=<local easy-claude checkout>` as the fallback.
- When the project uses Codex or OpenCode mirrors, check them for hand edits before they are rebuilt: `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --only=sync-divergence`. A reported file differs from what `.claude/` generates; inspect it, and port a deliberate edit into its `.claude/` source first (a merely stale mirror needs nothing).

### 2. Dry run

Run `--dry-run --json` (plus any `--ref` / `--upstream` the user gave) and read:

- `upstream.commit` against the lock's `source.commit`: equal means the project is already current. Say so and stop.
- `upstream.url`: when it is not `https://github.com/duc01226/easy-claude.git` (a fork or mirror the lock remembers from an earlier `--upstream`), name it to the user; its code is what will be merged.
- `baseDetection` (projects without a lock): `matched` of `projectFiles` files match `commit`. Show its date and subject with `git -C tmp/framework-update/upstream.git log -1 --format="%h %cs %s" <commit>`. Below about 80% matched, the project was likely copied from a fork or another project, or heavily edited: ask the user to confirm the commit or name the version they copied.
- `taken`, `deleted`, `merged`, `kept`, `conflicts`, `mirrorOnly`, `mirrorClashes`, `projectOnly`.

### 3. Decide

Ask once, in one question, only about what needs the user:

- **Mirror-only skills** (`mirrorOnly`): recommend moving each into `.claude/skills/<name>/`, where it becomes canonical and is mirrored to every host; check the name is free and its `SKILL.md` frontmatter has `name` and `description`. The alternative is keeping it Codex-only in `.agents/skills/` (right for a skill another tool installed there): the sync leaves it in place. Carry out the answer after step 4: the engine refuses to run on uncommitted changes.
- **Mirror clashes** (`mirrorClashes`): a Codex-only skill whose name a framework skill new in this update also uses. Recommend renaming the project's skill (its folder and the `name` in its `SKILL.md`, then every reference: `git grep -n <old-name>`), so both stay. The alternative is letting upstream's skill take the name: remove the project's skill, then run the sync. Carry out the answer after step 4, before the sync.
- **A doubtful base** (step 2).

Proceed without asking when nothing needs a decision: the tree is clean and everything is undoable through Git.

### 4. Apply

Run the command without `--dry-run`, pinned to what the dry run showed: `--ref=<upstream.commit>`, and on a first update `--base=<baseDetection.commit>`. A newer `main` pushed in between is then not taken unseen. The engine writes the merge, the lock and regenerated catalogs and counts, then runs the mirror sync unless a conflict or a mirror clash stops it. Then carry out step 3's answers: move each mirror-only skill the user chose to move (`git mv .agents/skills/<name> .claude/skills/<name>`), and rename or remove each clashing one.

### 5. Resolve conflicts

Read `references/merge-guide.md` before touching a conflict. It covers marker conflicts, settings and other JSON files, a skill name upstream now also ships, files one side deleted, and code both sides fixed. Each `conflict-side` file has upstream's copy under `tmp/framework-update/<path>`.

### 6. Verify and report

- No markers left: `git grep -n -E "^(<<<<<<< project|=======$|>>>>>>> upstream)" -- .claude` prints nothing (a reported `=======` line can be a Markdown heading underline; check it).
- Every changed JSON file parses: `node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" <file>`.
- Every hook command in `.claude/settings.json` names a file that exists.
- After moving or renaming any skill (mirror-only skills, a name clash), rebuild the catalogs and counts: `node .claude/scripts/framework-update.mjs --regenerate`.
- Run the sync if the engine skipped it, and again after moving or renaming a skill: `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`. It rebuilds `.agents/`, `.codex/` and `.opencode/`, and its `verify-sync-divergence` and `verify-opencode-*` stages prove they match the merged `.claude/`. A mirror-only skill the user kept in `.agents/skills/` stays as it is, with one `kept .agents/skills/<name>` line. A sync failure is a finding: compare it with a run on the commit before the update before calling it new.
- A stale root `CLAUDE.md` reported by the sync → offer `/ai-context-refresh`. New framework switches → `node .claude/scripts/framework-features.cjs` lists them with their defaults.
- Report: from and to versions, counts, how many project-only files stayed untouched, each conflict and how it was settled, what still needs the user, and verification results. Show `git status --short` totals, not the full list.

## A project without this skill yet

Update it once from any easy-claude checkout; the update brings this skill along:

```text
git clone --filter=blob:none https://github.com/duc01226/easy-claude.git <scratch-folder>/easy-claude
node <scratch-folder>/easy-claude/.claude/skills/framework-update/scripts/update-from-upstream.mjs --project=<project> --dry-run
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `uncommitted changes in .claude, …` | commit or stash them; `--allow-dirty-project` only when the user accepts mixing them into the update diff |
| `No upstream commit shares a file with this project` | ask the user which version they copied and pass `--base=<commit>` |
| `… is not a branch, tag or commit of the upstream` | check `--ref`; a commit from a pull request needs its full hash |
| clone or fetch fails | proxy or offline: clone easy-claude elsewhere and pass `--upstream=<that folder>`; its local `main` branch is taken, so pull it first |
| the user wants to undo before committing | `git restore --staged --worktree --` followed by only those of `.claude .agents .codex .opencode AGENTS.md opencode.json` that exist (a missing path makes Git refuse the whole command); then preview new files with `git clean -n -- <same paths>` and remove them only after the user confirms |

## Closing Reminders

**MUST ATTENTION** run only on the user's explicit request. **MUST ATTENTION** never delete or overwrite a project-owned file, never copy upstream over the project, and never hand-edit a generated mirror. **MUST ATTENTION** the update covers `.codex/`, `.agents/` and `.opencode/` only once the closing sync passes. **MUST ATTENTION** read `references/merge-guide.md` before resolving any conflict and keep both sides' intent; ask the user when the intents clash. Commit or push only on request, with the lock in the same commit.
