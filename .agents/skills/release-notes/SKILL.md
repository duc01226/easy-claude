---
name: release-notes
description: '[Git] Use when creating release notes or a release document from git history at any scope (tag-to-tag, branch-to-branch, time range), producing markdown plus a standalone HTML presentation.'
disable-model-invocation: true
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->
## Codex Project-Reference Loading (Hook-Independent)

Claude and Codex use static project-reference loading as the authority; hooks may accelerate discovery but never replace the explicit read.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**
- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$ai-context-refresh`) before ordinary project-specific work. A full `$sync-codex` run preflights `CLAUDE.md`; a completed `$ai-context-refresh` run may invoke the standalone runner with `--skip=claude-md` after final source edits. Markerless roots need AI smart-merge unless `portability.requireUniversalGuides: false` is explicit.

**Situation-based docs** (pick by the phase you are about to enter — plan/investigate, edit, test, spec/doc, review — and read only docs the project selects in `referenceDocs` that exist):
- Planning, investigation, or design: `project-structure-reference.md`, `domain-entities-reference.md`, plus the docs below for every file type the plan touches
- Editing or writing code: `code-review-rules.md` plus the backend or frontend docs below for the file type
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md` (or the configured styling reference), `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Test-data seeders: `seed-test-data-reference.md`
- Code review/audit work: `code-review-rules.md` plus the docs above for every file type under review
- Per-file conventions (`contextGroups[]`): before editing an unfamiliar path class, run `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`

**Dedup:** a doc counts as loaded only when your own read returned its full content to this context after the last compaction and within roughly the last 200K tokens, and it has not changed since — cite it `(loaded)` instead of re-reading. A hook reminder, a summary, or a prior mention never counts; a delegated sub-agent starts empty, so name the resolved doc paths in its brief.

Never read all docs blindly: route from `docs-index-reference.md` and open only what the task needs.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

## Quick Summary

**Goal:** Generate a professional release document from git history at **any scope** — tag-to-tag, branch-to-branch, or a time range ("last 30 days") — with automated categorization, thematic AI analysis, service detection, and validation, **plus a rich standalone HTML release presentation written FOR REAL USERS** — user-visible features and enhancements only, with faithful mock-ups of the project's REAL screens for any UI change — which auto-opens in the browser. Both outputs are produced by default; the markdown carries the engineering detail, the HTML carries the user story.

> **This is the single release skill.** Use `$release-notes` for every release-summary need.

**Workflow:**

0. **Resolve Scope** — refs (`base head`), a range (`--range`), or a time window (`--days N` / `--since DATE`); `--focus` deepens one area
0b. **[BLOCKING] Dump Git Artifacts** — write log, file-status, diff-stat, and full diff to disk BEFORE analyzing anything
1. **Parse Commits** — `parse-commits.cjs <base> <head>` extracts structured data from git
2. **Categorize** — `categorize-commits.cjs` for user-facing vs internal sections; add the thematic area map for time-range scopes
3. **Analyze Key Diffs** — read the most significant changes per category via `git show` / `git diff`
4. **Render** — `render-template.cjs --version vX.Y.Z` generates markdown with Summary, What's New, Improvements, Bug Fixes, Breaking Changes, Technical Details
5. **Validate** — `validate-notes.cjs` scores against quality rules (100 points)
6. **[BLOCKING] HTML Presentation (R1–R9, default-on)** — run the canonical procedure in `references/html-release-report.md`: comprehend the whole change set → investigate each highlight end-to-end → correlate spec changes → inventory the real existing UI → **write the temp analysis report** → assemble ONE standalone HTML doc **written for real users**, with real-UI mock-ups and one explanatory visual per highlight, **beautiful and easy to read** → save → accuracy + fidelity + audience + visual-clarity gates → **auto-open**

**Key Rules:**

- **Pipeline**: resolve scope → dump → parse → categorize → analyze → render → validate → present
- **Scope is inferred, never asked twice** — refs given → tag/branch comparison; `--days`/`--since` → time range; neither → default to the last tag..HEAD
- **Dump first, read second** — NEVER analyze a diff you haven't saved to a file first; large ranges overflow context
- **Advanced**: Service detection, breaking change analysis, PR metadata, contributor stats, version bumping
- **Human Review**: Generated notes are Draft status, require review/enhance/approve before publish
- **Validation**: `validate-notes.cjs` scores against quality rules (100 points)
- **The HTML presentation is DEFAULT-ON** — Step 6 always runs; `--no-html` is the explicit opt-out. Never ask the user to request it and never treat it as optional polish.
- **The HTML stage is model work, not a script** — the scripted pipeline (steps 1–5) produces the markdown; the HTML presentation requires reading the actual diffs, tracing each feature end-to-end, and reproducing real UI, so it is executed by following `references/html-release-report.md`, NOT by piping another `lib/*.cjs`
- **Breadth before depth** — map the WHOLE change set before opening any single feature (R1); diving into the first interesting commit under-reports the rest
- **[BLOCKING] Temp report before HTML** — the HTML is assembled FROM the temp analysis report, never straight from a diff or from memory (R5)
- **[BLOCKING] The HTML is written for REAL USERS, not engineers (R6.0)** — its reader USES the product and never reads its code. Only `USER-VISIBLE` outcomes go in At a glance / What's New / What Changed / Fixes; refactors, tests, CI, tooling, dependency bumps, type/lint and doc-only changes are `INTERNAL` and live one line each in the collapsed "Under the Hood". Prose carries no class, component, file, endpoint, or framework names and no commit subjects — evidence chips carry traceability, sentences carry meaning. The engineering view is not lost: it is the markdown notes plus the collapsed §7–§9.
- **[BLOCKING] Quality goal: the HTML is beautiful, easy to read and easy to understand (R6.5)** — the first screen shows user-facing counts and, when anything requires action, an "Action required" defaults board (was → now → how to keep the old behaviour); each user-visible What's New / What Changed highlight is carried by one explanatory visual (mock-up, before → after pair, flow diagram, comparison bars of measured numbers, option matrix, or a terminal/chat frame of real text) plus 2–4 plain sentences and a "How to use / turn off" line; highlights are grouped by the reader's goal; the page is verified from wide and narrow rendered screenshots, not from the source — with no renderer, a source-only check recorded as such (R8.4)
- **Never manufacture user value** — an internal change reworded to sound user-facing is a fabrication (R8.1). An honest "no user-facing changes this release" page beats a padded one.
- **UI-bearing highlights lead with their mock-up** — the picture first, the prose explaining it second (R6.2 §4/§5)
- **Mock-ups follow the `pbi-mockup` protocol, not a second invented one (R6.3)** — `pbi-mockup` Steps 3 (design system), 3b (inventory the real existing UI), 3c (real domain entities) and 7 (fidelity gate) govern HOW a screen is reproduced; this skill governs WHAT gets rendered. Real design tokens, real component structure and class names, real route and page shell, real domain field names; never Lorem ipsum, never a generic card layout. Borrow the fidelity contract, not the clickable-prototype machinery.
- **Backend-only ≠ `NO-UI`** — if the change's effect shows on an existing screen it is `BEHIND-UI` and gets a mock-up of that screen (R4.1)
- **`NO-UI` release still gets the full HTML** — state `UI surface: none` and omit only the mock-up sections
- **Auto-open is best-effort** — a failed browser launch is a warning with the printed path, NEVER a failed run; `--no-open` opts out

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Release Notes & Release Document Skill

Generate a professional release document from git history at any scope — tag-to-tag, branch-to-branch, or a time range — with automated categorization plus a rich standalone HTML presentation.

## Invocation

```
$release-notes [base] [head] [--version vX.Y.Z] [--days N] [--since DATE] [--range base..head]
               [--focus "custom prompt"] [--output path] [--no-html] [--no-open]
```

**Examples:**

```bash
# Tag-to-tag — markdown notes + rich standalone HTML presentation, auto-opened
$release-notes v1.0.0 HEAD --version v1.1.0

# Compare branches
$release-notes main feature/new-auth --version v2.0.0-beta

# Time range — "what changed in the last 30 days"
$release-notes --days 30

# Since a specific date
$release-notes --since 2026-03-15

# Explicit range form
$release-notes --range v1.0.0..HEAD

# With a custom focus area, analyzed more deeply and given its own section
$release-notes --days 30 --focus "what changed in hooks and workflow enforcement"

# Output to specific file (the HTML sibling takes the same stem with .html)
$release-notes v1.0.0 HEAD --version v1.1.0 --output docs/release-notes/250111-v1.1.0.md

# HTML but no browser launch (CI, headless, remote shell)
$release-notes v1.0.0 HEAD --version v1.1.0 --no-open

# Markdown only — skip the HTML presentation stage
$release-notes v1.0.0 HEAD --version v1.1.0 --no-html
```

**Flags:**

| Flag        | Default | Effect                                                                                                       |
| ----------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| `--days N`  | —       | Time-range scope: the last N days. Mutually exclusive with positional refs.                                   |
| `--since D` | —       | Time-range scope: everything since ISO date `D`.                                                              |
| `--range`   | —       | Explicit `base..head` form, equivalent to the positional refs.                                                |
| `--focus`   | —       | Analyze the named area more deeply and give it a dedicated top-level section.                                 |
| `--version` | —       | Version label for the notes header; drives `bump-version.cjs` when used.                                      |
| `--no-html` | off     | Skip Step 6. **The HTML presentation is on by default** — never ask the user to opt in.                        |
| `--no-open` | off     | Generate the HTML but do not launch a browser. Auto-implied in CI / headless / sub-agent contexts.             |

## Choosing a Scope (Step 0)

One skill, three scope shapes. Infer the shape from what the user gave; never ask twice.

| User said                                  | Scope shape        | How to resolve                                                        |
| ------------------------------------------ | ------------------ | ----------------------------------------------------------------------- |
| Two refs / `--range` / "since v1.2"        | Tag or branch      | `base..head` directly                                                  |
| "last 30 days" / `--days` / `--since`      | Time range         | Compute `SINCE_DATE`, then `OLDEST = git log --since=... --format=%H \| tail -1`, `HEAD` as head |
| Nothing                                    | Default            | Last tag → `HEAD`; if the repo has no tags, fall back to the last 30 days |

```bash
# Time-based → boundary commits
SINCE_DATE=$(node -e "console.log(new Date(Date.now()-30*864e5).toISOString().slice(0,10))")   # portable (UTC): Windows Git Bash, macOS, Linux
# Native alternatives — Linux: date -d "-30 days" +%Y-%m-%d · macOS: date -v-30d +%Y-%m-%d · Windows PowerShell: (Get-Date).AddDays(-30).ToString("yyyy-MM-dd")
git log --since="$SINCE_DATE" --oneline --format="%H %ad %s" --date=short
OLDEST=$(git log --since="$SINCE_DATE" --format="%H" | tail -1)
```

`{PERIOD}` — the artifact/output naming token — is the version (`v1.1.0`) for ref scopes, or a readable window (`30d`, `2026-03-15-to-2026-04-14`) for time scopes.

## Step 0b: [BLOCKING] Dump Git Artifacts BEFORE Analyzing

> **[BLOCKING] Run ALL dumps before reading ANY diff content.** A multi-week range will not fit in context; the files are external memory for Steps 3 and 6.

```bash
mkdir -p docs/release-notes/tmp

# 1. Full log with bodies
git log {SCOPE} --format="%H %ad %s%n%b" --date=short > docs/release-notes/tmp/git-log-{PERIOD}.txt
# 2. File-level status (A/M/D) — the R1 change-map input
git diff {BASE}..{HEAD} --name-status  > docs/release-notes/tmp/diff-file-status-{PERIOD}.txt
# 3. Stat summary — the source of truth for reported statistics
git diff {BASE}..{HEAD} --stat         > docs/release-notes/tmp/diff-stat-{PERIOD}.txt
# 4. Full consolidated diff (may be large — never read it whole)
git diff {BASE}..{HEAD}                > docs/release-notes/tmp/git-diff-{PERIOD}-full.txt
```

Verify every artifact exists and is non-empty before proceeding.

## Workflow

### Step 1: Parse Commits

Execute the commit parser to extract structured data from git history:

```bash
node .claude/skills/release-notes/lib/parse-commits.cjs <base> <head> [--with-files]
```

**Output:** JSON with commits array containing:

- `hash`, `shortHash` - Commit identifiers
- `type`, `scope`, `description` - Conventional commit parts
- `breaking` - Boolean for breaking changes
- `author`, `date` - Attribution
- `files` - Changed files (with `--with-files` flag)

### Step 2: Categorize Commits

Pipe parsed commits through the categorizer:

```bash
node .claude/skills/release-notes/lib/parse-commits.cjs <base> <head> | \
node .claude/skills/release-notes/lib/categorize-commits.cjs
```

**Categorization Rules:**
| Type | Category | User-Facing |
| --------------------------------------- | ------------ | --------------------- |
| `feat` | features | Yes |
| `fix` | fixes | Yes |
| `perf` | improvements | Yes |
| `docs` | docs | Yes (unless internal) |
| `refactor` | improvements | Technical only |
| `test`, `ci`, `build`, `chore`, `style` | internal | No |

**Excluded Patterns:**

- `chore(deps):` - Dependency updates
- `chore(config):` - Configuration changes
- `[skip changelog]` - Explicit skip
- `[ci skip]` - CI markers

### Step 3: Render Markdown

Generate the final release notes document:

```bash
node .claude/skills/release-notes/lib/parse-commits.cjs <base> <head> | \
node .claude/skills/release-notes/lib/categorize-commits.cjs | \
node .claude/skills/release-notes/lib/render-template.cjs --version v1.1.0 --output docs/release-notes/250111-v1.1.0.md
```

### Step 3b: Thematic Analysis (time-range scopes, and any scope with `--focus`)

Conventional-commit categories answer "what TYPE of change"; a release document also needs "what AREA of the system". For a time range — or any scope where commit messages are non-conventional — group the changed files by area as well.

Read `docs/release-notes/tmp/diff-file-status-{PERIOD}.txt` and map each path to an area. Derive the map from `docs/project-config.json` modules or the discovered source roots. For the portable `.claude` harness itself:

| File path pattern                    | Area                    |
| ------------------------------------ | ----------------------- |
| `.claude/hooks/**`                   | Hook Enhancements       |
| `.claude/hooks/lib/**`               | Hook Library            |
| `.claude/skills/**`                  | Skills                  |
| `.claude/agents/**`                  | Agent Definitions       |
| `.claude/workflows/**`               | Workflow Orchestration  |
| `.claude/docs/**`                    | Framework Documentation |
| `.claude/scripts/**`                 | Tooling & Scripts       |
| the project-reference docs root (default `docs/project-reference/**`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) | Project Reference Docs |
| `CLAUDE.md`                          | Principles & Core Rules |
| `.claude/.ck.json` / `settings.json` | Configuration           |

Then, per area with significant change (>5 files or >200 lines), read representative diffs (`git show {hash} --stat`, `git diff {BASE}..{HEAD} -- {path}`) and answer: what the behavior was BEFORE vs AFTER, and who is affected. **Record `{commit_hash}:{file_path}` as the source of every claim.**

**With `--focus "..."`:** grep the changed files for the focus keywords, read their FULL diffs (not just stat), give the focus area a dedicated top-level section in the output, and cross-reference related changes elsewhere (e.g. a new skill + its hook + its workflow entry).

Category-map and output overrides live in `docs/project-config.json`:

```json
{
    "releaseNotes": {
        "categoryMap": {
            "{api-source-root}/**": "API Layer",
            "{ui-source-root}/**": "Frontend",
            "migrations/**": "Database Schema"
        },
        "outputDir": "docs/release-notes",
        "htmlReport": { "enabled": true, "autoOpen": true, "tempDir": "docs/release-notes/tmp" }
    }
}
```

`htmlReport.enabled: false` makes `--no-html` the default; `htmlReport.autoOpen: false` makes `--no-open` the default. An explicit flag on the invocation always wins over config.

### Step 6: [BLOCKING] Rich HTML Release Presentation (default-on)

> **[BLOCKING] Runs on every invocation unless the user passed `--no-html`.** Do not ask whether to generate it, and do not treat it as optional polish — the markdown notes alone are an incomplete deliverable.

The markdown from Steps 3–5 is a categorized change summary **for the team**. This step adds the **user-facing release presentation**: one standalone, offline, professional HTML file that tells a person who USES the product what's new and what changed, and renders faithful mock-ups of the project's **real** screens for any UI change.

**The two outputs have different audiences and that is the point.** The markdown keeps every commit, every technical detail, every internal change. The HTML keeps only what a user can observe — new features, enhancements they can see and use, fixes whose symptom they felt — with internal work collapsed into "Under the Hood". Do not let the HTML degrade into a prettier copy of the markdown.

**Execute the canonical procedure in `references/html-release-report.md` (R1–R9), in order.** That file is the single source of truth — read it and follow it; do not improvise the sequence, and do not restate it here.

| Stage  | Purpose                                                                                                             |
| ------ | --------------------------------------------------------------------------------------------------------------------- |
| **R1** | Comprehend the WHOLE change set — change map over every changed file, rank into user-meaningful highlights, then give each a `USER-VISIBLE` / `INTERNAL` verdict (R1.4b) |
| **R2** | Investigate each highlight END-TO-END — entry → logic → persistence → observable result; before→after; blast radius; covering tests; confidence % |
| **R3** | Correlate spec changes — verdict `ALIGNED` / `SPEC-AHEAD` / `CODE-AHEAD` / `CONFLICT` per highlight                   |
| **R4** | Detect the UI surface and **[BLOCKING] inventory the real existing UI** — design tokens, real components, real routes, real entity fields |
| **R5** | **[BLOCKING] Write the temp analysis report** — the HTML is assembled FROM it, never from a diff or from memory        |
| **R6** | Assemble ONE standalone HTML file — **[BLOCKING] R6.0 audience rule: user-facing narrative only**, 10 required sections, evidence chips, real-UI mock-ups (per the `pbi-mockup` contract) with before→after pairs · **[BLOCKING] R6.5 visual clarity: beautiful, easy to read, one explanatory visual per highlight** |
| **R7** | Save beside the markdown notes, same stem with `.html`                                                                |
| **R8** | **[BLOCKING] Accuracy + fidelity + audience + visual-clarity gates** — record `Release accuracy: PASS\|FAIL`, `Release fidelity: PASS\|FAIL`, `Release audience: PASS\|FAIL`, `Release visual: PASS\|PASS (source-only)\|FAIL` |
| **R9** | **Auto-open** in the default browser (best-effort; `--no-open` opts out), then report the path                        |

**R0 is already satisfied** — Step 0b dumped the git artifacts and Steps 2–3b categorized the changes. Optionally add the structured commit JSON as extra R1 input:

```bash
node .claude/skills/release-notes/lib/parse-commits.cjs <base> <head> --with-files \
  > docs/release-notes/tmp/commits-{PERIOD}.json
```

Run R1–R9 with the temp report at `docs/release-notes/tmp/{PERIOD}-release-analysis.md`.

**Five rules specific to invoking it from here:**

1. **This stage is model work, not another pipe.** The `lib/*.cjs` scripts categorize commits; they cannot trace a feature end-to-end or reproduce a real screen. Do not attempt to satisfy Step 6 by adding a renderer to the pipeline.
2. **`categorize-commits.cjs` output is an input to R1, not a substitute for it.** Its type-based buckets are a starting point; R1.4 still re-ranks into *user outcomes* (merging N commits that ship one outcome, splitting one commit that ships two) and R1.5 still cross-checks that every added/deleted file and every breaking change is accounted for.
3. **Step 3b's area map feeds R1.3.** When a thematic map was built, reuse it as the change map's `Area` column rather than deriving a second, divergent grouping.
4. **The categorizer's `User-Facing` column is NOT the audience verdict.** It answers "what type of commit is this"; R1.4b answers "would a user notice this". A `docs` commit is marked user-facing by the table above yet is almost always `INTERNAL` for the HTML; a `refactor` that changes a visible label is `USER-VISIBLE`. Decide from the traced behavior (R2), never from the commit type.
5. **Mock-ups defer to `$pbi-mockup`.** R6.3 binds screen reproduction to that skill's fidelity contract (Steps 3/3b/3c/7). Read it rather than inventing a rendering procedure here.

## Complete Pipeline

For generating release notes in a single command:

```bash
# Full pipeline with output to file
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-notes/lib/categorize-commits.cjs | \
node .claude/skills/release-notes/lib/render-template.cjs --version v1.1.0 --output docs/release-notes/250111-v1.1.0.md

# Pipeline to stdout for review
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-notes/lib/categorize-commits.cjs | \
node .claude/skills/release-notes/lib/render-template.cjs --version v1.1.0
```

## Advanced Features

### Service Boundary Detection

Analyze which services are affected by the release:

```bash
# Parse with file changes, then detect services
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD --with-files | \
node .claude/skills/release-notes/lib/detect-services.cjs
```

**Output:** Service impact analysis with severity levels (critical, high, medium, low)

### Breaking Change Analysis

Enhanced breaking change detection with migration info extraction:

```bash
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-notes/lib/categorize-commits.cjs | \
node .claude/skills/release-notes/lib/detect-breaking.cjs
```

**Detects:**

- `BREAKING CHANGE:` in commit body
- `!` suffix on commit type (e.g., `feat!:`)
- Migration instructions

### PR Metadata Extraction

Extract and link pull request information:

```bash
# Extract PR numbers from commit messages
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-notes/lib/extract-pr-metadata.cjs

# With GitHub API enrichment (requires gh CLI)
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-notes/lib/extract-pr-metadata.cjs --fetch-gh
```

**Extracts:** PR numbers, titles, labels, authors from commits

### Contributor Statistics

Generate detailed contributor stats:

```bash
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-notes/lib/contributor-stats.cjs
```

**Output:** Contributor list with commit counts, feature/fix breakdown

### Version Bumping

Automatically determine and bump semantic version based on commit types:

```bash
# Auto-bump based on commits (feat→minor, fix→patch, BREAKING→major)
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-notes/lib/bump-version.cjs

# Bump with prerelease tag
node .claude/skills/release-notes/lib/bump-version.cjs --prerelease beta

# Per-service versioning
node .claude/skills/release-notes/lib/bump-version.cjs --service {service-name}

# Dry run (don't write version file)
node .claude/skills/release-notes/lib/bump-version.cjs --dry-run
```

**Version Files:**

- Root: `.version`
- Per-service: `.versions/<service-name>.version`

### Quality Validation

Validate release notes against quality rules:

```bash
# Validate with default threshold (70)
node .claude/skills/release-notes/lib/validate-notes.cjs docs/release-notes/v1.1.0.md

# Custom threshold
node .claude/skills/release-notes/lib/validate-notes.cjs docs/release-notes/v1.1.0.md --threshold 80

# JSON output for CI
node .claude/skills/release-notes/lib/validate-notes.cjs docs/release-notes/v1.1.0.md --json
```

**Validation Rules (100 points total):**
| Rule | Weight | Description |
| --------------------------- | ------ | ---------------------------- |
| summary_exists | 15 | Has Summary section |
| summary_not_empty | 10 | Summary has content |
| has_version | 10 | Version number present |
| features_documented | 10 | Features properly formatted |
| fixes_documented | 10 | Bug fixes properly formatted |
| no_broken_links | 10 | No empty link references |
| contributors_listed | 10 | Contributors section present |
| has_date | 5 | Date present |
| no_todo_markers | 5 | No TODO/FIXME markers |
| proper_heading_hierarchy | 5 | Proper H1→H2 structure |
| no_placeholder_text | 5 | No placeholder text |
| technical_details_collapsed | 5 | Tech details in <details> |

### LLM-Powered Transforms

Transform release notes for different audiences using Claude API:

```bash
# Requires ANTHROPIC_API_KEY environment variable
export ANTHROPIC_API_KEY="your-api-key"

# Create executive summary
node .claude/skills/release-notes/lib/transform-llm.cjs docs/release-notes/v1.1.0.md --transform executive

# Transform for business stakeholders
node .claude/skills/release-notes/lib/transform-llm.cjs docs/release-notes/v1.1.0.md --transform business --output docs/release-notes/v1.1.0-business.md

# Transform for end users
node .claude/skills/release-notes/lib/transform-llm.cjs docs/release-notes/v1.1.0.md --transform enduser
```

**Transform Types:**
| Type | Description |
| ----------- | ------------------------------ |
| `summarize` | Brief 3-5 bullet point summary |
| `business` | ROI-focused, business language |
| `enduser` | User-friendly, non-technical |
| `executive` | Strategic impact summary |
| `technical` | Enhanced technical details |

### Full Enhanced Pipeline

Combine all features for comprehensive release notes:

```bash
# Enhanced pipeline with service detection
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD --with-files | \
node .claude/skills/release-notes/lib/detect-services.cjs | \
node .claude/skills/release-notes/lib/categorize-commits.cjs | \
node .claude/skills/release-notes/lib/detect-breaking.cjs | \
node .claude/skills/release-notes/lib/contributor-stats.cjs | \
node .claude/skills/release-notes/lib/render-template.cjs --version v1.1.0

# With version bumping and validation
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD --with-files | \
node .claude/skills/release-notes/lib/bump-version.cjs | \
node .claude/skills/release-notes/lib/categorize-commits.cjs | \
node .claude/skills/release-notes/lib/render-template.cjs --output docs/release-notes/v1.1.0.md && \
node .claude/skills/release-notes/lib/validate-notes.cjs docs/release-notes/v1.1.0.md
```

## Configuration

See `config.yaml` for:

- **categories** - Commit type to section mapping
- **services** - Service boundary detection by file patterns
- **exclude** - Patterns to exclude from user-facing notes
- **output** - Directory and filename format settings

## Output Structure

```markdown
# Release Notes: v1.1.0

**Date:** 2025-01-11
**Version:** v1.1.0
**Status:** Draft

---

## Summary

This release includes 3 new features, 2 improvements, 5 bug fixes.

## What's New

- **Add order export endpoint** (API)
- **Implement dark mode toggle** (UI)

## Improvements

- **Optimize database queries** (Persistence)

## Bug Fixes

- **Fix date picker timezone issue** (Frontend)
- **Resolve null pointer in auth flow**

## Documentation

- **Update API documentation** (API)

## Breaking Changes

> **Warning**: The following changes may require migration

### Migrate to OAuth 2.1 (Auth)

Legacy JWT tokens no longer accepted.
Migration guide: docs/migrations/oauth-2.1.md

---

## Technical Details

<details>
<summary>For Developers</summary>

### Commits Included

| Hash    | Type | Description                    |
| ------- | ---- | ------------------------------ |
| abc1234 | feat | Add order export endpoint      |
| def5678 | fix  | Fix date picker timezone issue |

...

</details>

## Contributors

- @john.doe
- @jane.smith

---

_Generated by AI_
```

## Human Review Gate

Generated release notes are **Draft** status by default:

1. **Review** - Check accuracy, add context where needed
2. **Enhance** - Add migration steps, links, screenshots
3. **Approve** - Change status to "Released"
4. **Publish** - Commit and push

## Integration with Other Skills

- **`$commit`** - After generating notes, commit them
- **`/git-manager`** - Create PR for release notes review
- **`$pbi-mockup`** - **Owns the mock-up protocol this skill's R6.3 defers to** — its Steps 3 (design system), 3b (inventory the real existing UI), 3c (real domain entities) and 7 (fidelity gate) govern HOW a screen is reproduced; R6.3 governs WHAT gets rendered. Borrow the fidelity contract, not the clickable-prototype machinery. And when a shipped feature already has a `pbis/*-mockup.html` under the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides), R6.3 REUSES it via `<iframe srcdoc>` instead of rebuilding the screen.

## Troubleshooting

### No commits found

Verify the refs exist and have commits between them:

```bash
git log --oneline <base>..<head>
```

### Non-conventional commits

Commits not following `type(scope): description` format go to "other" category. Consider running commitlint enforcement.

### Missing scope context

Add scope mappings to `config.yaml` → `services` section for better context labels.

### HTML mock-ups look generic, not like the project

The R4.3 UI inventory was skipped or done shallowly. The mock-up must be built from the **actual component/template files the diff touched** plus 2–3 real siblings — copying their markup structure and class names — and from **real design tokens**. Re-run R4.3–R4.4, then R6.3, then the R8.2 fidelity gate.

### The HTML doc is full of commit subjects

R1.4 was skipped: `categorize-commits.cjs` buckets were used verbatim as highlights. A highlight is a *user outcome*, not a commit — merge the commits that ship one outcome and re-rank breaking → new → changed → fixes → perf → internal.

### The HTML reads like an engineering report, not a release announcement

R1.4b and R6.0 were skipped. Symptoms: refactors, test/CI/tooling work or dependency bumps sitting in "What's New"; class, component or file names inside sentences; fixes described by their cause instead of the symptom the user hit. Re-run R1.4b to give every highlight a `USER-VISIBLE` / `INTERNAL` verdict, move every `INTERNAL` one into the collapsed "Under the Hood", rewrite §2–§6 per R6.0, then re-run the R8.3 audience gate.

### The HTML is accurate but hard to read

R6.5 was skipped. Symptoms: long paragraphs with no visual per highlight; "Action required" below the features; highlights ordered by commit type; charts that decorate rather than explain; a layout checked only in the source. Rebuild per R6.5 — defaults board on the first screen, one explanatory visual per user-visible highlight, the R6.5.3 card anatomy, themes by reader goal — then view wide and verified-narrow screenshots and re-run the R8.4 visual gate.

### The release "has no UI", so the HTML has no screens

Usually a mis-verdict. R4.1 classifies a backend change whose effect shows on an existing screen as `BEHIND-UI` — it gets a mock-up of that existing screen with the new field, status, or validation visible. `NO-UI` is only for work with no observable surface at all. Re-classify, then run R4.3–R4.4 and R6.3 for the highlights that flipped.

### Browser did not open

Auto-open is best-effort by design (R9). A sandbox, headless runner, hook refusal, or non-zero exit is reported as `Auto-open: skipped ({reason})` with the absolute path printed — the run still succeeds. On Windows prefer `pwsh -NoProfile -Command "Start-Process '<path>'"`.

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read, plus one per Step 4 R-stage and one per release highlight found in R1.4. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md

<!-- PROTOCOL-GUIDES:END -->

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

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** apply critical + sequential thinking; every claim needs traced proof, confidence >80% to act.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** Step 6 (HTML presentation) is DEFAULT-ON: follow `references/html-release-report.md` R1–R9 verbatim — never restate or improvise that procedure
**IMPORTANT MUST ATTENTION** Step 6 (HTML presentation) is DEFAULT-ON: comprehend the whole change set and trace each highlight end-to-end BEFORE writing; write the temp analysis report (R5) BEFORE the HTML
**IMPORTANT MUST ATTENTION** Step 6 (HTML presentation) is DEFAULT-ON: the HTML is written FOR REAL USERS (R6.0) — only user-visible features, enhancements and fixes in At a glance / What's New / What Changed / Fixes; refactors, tests, CI, tooling, deps and doc-only changes are `INTERNAL` and collapse into "Under the Hood"; no class/component/file/endpoint names or commit subjects in prose; NEVER reword internal work into invented user value
**IMPORTANT MUST ATTENTION** Step 6 (HTML presentation) is DEFAULT-ON: mock-ups follow the `$pbi-mockup` protocol (its Steps 3/3b/3c/7) and reproduce the project's REAL UI (real tokens, real components and class names, real route and page shell, real domain fields) and carry the `⚠ Illustrative mock-up` label — never Lorem ipsum, never a generic layout, never a second self-invented rendering procedure
**IMPORTANT MUST ATTENTION** Step 6 (HTML presentation) is DEFAULT-ON: a backend change whose effect shows on an existing screen is `BEHIND-UI`, not `NO-UI` — it gets a mock-up of that screen; UI-bearing highlights lead with the mock-up, prose second
**IMPORTANT MUST ATTENTION** Step 6 (HTML presentation) is DEFAULT-ON: the HTML is BEAUTIFUL, EASY TO READ and EASY TO UNDERSTAND (R6.5) — "Action required" defaults board on the first screen when anything requires action, one explanatory visual per user-visible What's New / What Changed highlight built from measured or real text only, one repeated card anatomy, grouped by reader goal, verified from wide and verified-narrow screenshots
**IMPORTANT MUST ATTENTION** Step 6 (HTML presentation) is DEFAULT-ON: record `Release accuracy: PASS|FAIL` + `Release fidelity: PASS|FAIL` + `Release audience: PASS|FAIL` + `Release visual: PASS|PASS (source-only)|FAIL` (R8) and auto-open best-effort (R9) before reporting done
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Static Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs` (static quality-protocol composer)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Resolve `specArtifacts` before selecting identity or carrier: use a valid profile, use strict-default TC/test identity only when the profile is absent, and block a malformed or unsupported declaration. Trace every requirement or invariant through decision, task, configured case/test identity and inspected assertion evidence, then carry it through source evidence and canonical docs/spec updates.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Resolve and validate `specArtifacts`: use valid native owner/case/variant identity and assertion-bearing evidence; use strict-default TC/TestSpec only when the profile is absent; block a malformed or unsupported declaration without fallback.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, analyze the task graph (output dependencies, shared write targets) into ordered parallel waves per PARALLELIZE before starting any task, then keep it synchronized as each step starts/completes. Preserve fixed ordering when a skill or workflow explicitly fixes it.
- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.
## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**
1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/a linter catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.
**Judgement integrity:** For theory checks, judgements, evaluations and gap hunts, the prompt's premise is a hypothesis — test it AND its opposite with one evidence bar (web-verify external facts), why-review the draft as an inline self-check (run the `why-review` skill only for a formal review/audit/gap-hunt deliverable or a MEDIUM+/consequential issue the inline pass cannot settle), never invent findings or manufacture disagreement ("no material issues" is a valid verdict); end with a `Bias check:` line (`SYNC:judgement-integrity`).
## Common AI Mistake Prevention (System Lessons)

- **Resolve project applicability before using framework examples.** Read the project config and relevant references, then inspect local evidence; honor explicit N/A and never impose a language, framework, architecture layer, styling method, tool, or runtime surface the project does not use.
- **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
- **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
- **Re-read and re-verify after context compaction or resume.** Compaction wipes read state and memory; summaries describe intent, not environment state. Re-read before editing, audit current state (git status, files) before creating anything new, grep-verify sub-agent output — every "completed" claim is a hypothesis until evidence confirms it.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace every consumer before and after a change.** Map referencing files before deleting; after bulk replacements, renames, or extractions, grep ALL consumer file types (templates, configs, catalogs and generated files fail silently) for every old or removed name; trace the full dependency chain of an edited definition; update docs that embed canonical data alongside their source.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Sub-agents: inherit, cover, persist.** Sub-agents know only their agent .md definition — use custom agent types, not built-in Explore. Reconcile the union of assignments against the full target list — category splits miss boundary items. Make the report write the first deliverable, appended per file/section with bounded scope; a truncated run with no report → spawn a narrower scope, never the same prompt.
- **Ownership before action.** When investigating a failure, ask which part owns the behavior before changing anything. Trace the wrong state to the component responsible for its invariant, then make one authoritative correction there.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec if one exists (the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting any constant/limit/flag/cutoff, read comments, git blame, the CALLER's ordering (the guarantee usually runs immediately BEFORE the cited line), and 2+ sibling call sites. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, state) and verify each against evidence. Ask "what would falsify this?" — if nothing, it is not a hypothesis.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem: "Would this change exist if I were not addressing this request?" — if not, remove or disclose it; never silently expand scope.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort ("(1) [N h], (2) [N h]. Which matters?"), list assumptions, name a simpler path when one exists.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC: steel-man a rejected alternative, invert each reason ("what does it sacrifice?"), stress-test the top 2-3 assumptions, run a pre-mortem. Quality = causal reasoning + mitigations + evidence, not section presence.
- **OOM/memory: check row count before row size.** An unbounded query (no DB filter for the trigger) → push the filter to the DB; then large rows → projection. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** For async work (queues, retries, background jobs, caches, replication) assert the final business/entity state — NEVER delivery bookkeeping (consume/send status, attempt counts, last-error, broker/scheduler/outbox rows) that ANY co-running process can write: green alone, flaky once anything shares that broker + database. Gate: "would this hold no matter WHICH process did the work?" Process-local fault injection is a stress amplifier (arm → bounded window → disarm → assert convergence), never a precondition.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Judge the environment before judging the code — a competing hypothesis, not a fallback.** A bug, failed test, error, or odd output is NOT proof of a code defect. Before any verdict, sweep environment preconditions (toolchain/lockfile state, stale build/cache artifacts, env vars and config, service dependencies, ports/clock, OS path/locale, permissions, leftover processes/test data) AND transient resource pressure (RAM/OOM, CPU, disk/temp, handle and connection-pool limits, network, a timeout that is really slowness). Tell-tale: non-deterministic, fails only in parallel, on one machine or only on CI, or an error naming resources. Cite the discriminator you ran (clean environment? path changed? concurrency 1?) — a verdict without one is a guess. Fix an environment cause in the environment; NEVER edit product code or weaken/skip a test to absorb it; a failure that vanishes on retry stays unexplained until its mechanism is named.
- **Cross-platform execution is a required contract.** Before authoring or changing a tool, script, process launcher, path assertion, or filesystem test, name the supported Windows, macOS, and Linux behaviors. Use platform-neutral APIs and literal argv vectors; never infer shell, temp-path, executable-extension, ACL, or symlink semantics from the current host. A documented command gives its Windows, macOS, and Linux form (Python: `py -3` on Windows, `python3` on macOS/Linux; shell: PowerShell/`.cmd` beside POSIX `sh`) or one platform-neutral runner such as `node <script>`. Canonicalize existing paths before identity, hashing, or equality checks; test native Windows and POSIX seams when behavior differs; keep CI platform matrices authoritative. Preserve fail-closed security boundaries — repair the fixture or platform branch, never weaken the guard just to make one OS green.
- **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer must reference NO consumer-specific domain concept (tenant/customer/product IDs, business entities, feature rules); such a leak compiles, runs, and passes review while coupling the layer to one consumer. Push domain fields/logic down into the consumer via subclass/composition.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
