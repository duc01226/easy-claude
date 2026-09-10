---
name: release-notes
description: '[Git] Use when creating release notes or a release document from git history at any scope (tag-to-tag, branch-to-branch, time range), producing markdown plus a standalone HTML presentation.'
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->
## Codex Project-Reference Loading (Hook-Independent)

Claude and Codex use static project-reference loading as the authority; hooks may accelerate discovery but never replace the explicit read.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**
- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

## Quick Summary

**Goal:** Generate a professional release document from git history at **any scope** — tag-to-tag, branch-to-branch, or a time range ("last 30 days") — with automated categorization, thematic AI analysis, service detection, and validation, **plus a rich standalone HTML release presentation written FOR REAL USERS** — user-visible features and enhancements only, with faithful mock-ups of the project's REAL screens for any UI change — which auto-opens in the browser. Both outputs are produced by default; the markdown carries the engineering detail, the HTML carries the user story.

> **This is the single release skill.** It absorbed `$release-doc` (2026-09-08), which is now a deprecated alias. Use `$release-notes` for every release-summary need; `$changelog` remains separate for per-feature changelog entries.

**Workflow:**

0. **Resolve Scope** — refs (`base head`), a range (`--range`), or a time window (`--days N` / `--since DATE`); `--focus` deepens one area
0b. **[BLOCKING] Dump Git Artifacts** — write log, file-status, diff-stat, and full diff to disk BEFORE analyzing anything
1. **Parse Commits** — `parse-commits.cjs <base> <head>` extracts structured data from git
2. **Categorize** — `categorize-commits.cjs` for user-facing vs internal sections; add the thematic area map for time-range scopes
3. **Analyze Key Diffs** — read the most significant changes per category via `git show` / `git diff`
4. **Render** — `render-template.cjs --version vX.Y.Z` generates markdown with Summary, What's New, Improvements, Bug Fixes, Breaking Changes, Technical Details
5. **Validate** — `validate-notes.cjs` scores against quality rules (100 points)
6. **[BLOCKING] HTML Presentation (R1–R9, default-on)** — run the canonical procedure in `references/html-release-report.md`: comprehend the whole change set → investigate each highlight end-to-end → correlate spec changes → inventory the real existing UI → **write the temp analysis report** → assemble ONE standalone HTML doc **written for real users**, with real-UI mock-ups → save → accuracy + fidelity + audience gates → **auto-open**

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

# Time range — "what changed in the last 30 days" (absorbed from $release-doc)
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
SINCE_DATE=$(date -d "-30 days" +%Y-%m-%d)   # Linux ( macOS: date -v-30d +%Y-%m-%d )
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
| `docs/project-reference/**`          | Project Reference Docs  |
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
| **R6** | Assemble ONE standalone HTML file — **[BLOCKING] R6.0 audience rule: user-facing narrative only**, 10 required sections, evidence chips, real-UI mock-ups (per the `pbi-mockup` contract) with before→after pairs |
| **R7** | Save beside the markdown notes, same stem with `.html`                                                                |
| **R8** | **[BLOCKING] Accuracy + fidelity + audience gates** — record `Release accuracy: PASS\|FAIL`, `Release fidelity: PASS\|FAIL`, `Release audience: PASS\|FAIL` |
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
- **`$docs-update`** - Update CHANGELOG.md with new release
- **`$release-doc`** - **Deprecated alias of this skill** (superseded 2026-09-08). It resolves here; do not route work to it. Its time-range scope, artifact dumping, thematic analysis, `--focus`, and HTML presentation all live here now.
- **`$changelog`** - Still separate: per-feature changelog entries. This skill is for multi-commit release summaries.
- **`$pbi-mockup`** - **Owns the mock-up protocol this skill's R6.3 defers to** — its Steps 3 (design system), 3b (inventory the real existing UI), 3c (real domain entities) and 7 (fidelity gate) govern HOW a screen is reproduced; R6.3 governs WHAT gets rendered. Borrow the fidelity contract, not the clickable-prototype machinery. And when a shipped feature already has a `team-artifacts/pbis/*-mockup.html`, R6.3 REUSES it via `<iframe srcdoc>` instead of rebuilding the screen.

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

### The release "has no UI", so the HTML has no screens

Usually a mis-verdict. R4.1 classifies a backend change whose effect shows on an existing screen as `BEHIND-UI` — it gets a mock-up of that existing screen with the new field, status, or validation visible. `NO-UI` is only for work with no observable surface at all. Re-classify, then run R4.3–R4.4 and R6.3 for the highlights that flipped.

### Browser did not open

Auto-open is best-effort by design (R9). A sandbox, headless runner, hook refusal, or non-zero exit is reported as `Auto-open: skipped ({reason})` with the absolute path printed — the run still succeeds. On Windows prefer `pwsh -NoProfile -Command "Start-Process '<path>'"`: it contains no slash-prefixed flags, so a path-boundary hook that rejects `cmd /c start` still allows it.

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read, plus one per Step 4 R-stage and one per release highlight found in R1.4. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **FIX GATE — INVESTIGATE FIRST.** Before applying any project-related fix, always invoke `$investigate` or `$debug-investigate` and establish the root cause; the failure site may be only a symptom.
> **FAILED-TEST GATE.** For any failed or flaky test, `$debug-investigate` is mandatory before editing source or tests; never change either side merely to force green.
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, `plans/`, `team-artifacts/`, or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** FIX GATE: before any project-related fix, invoke `$investigate` or `$debug-investigate`; failed/flaky tests require `$debug-investigate` before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

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
**IMPORTANT MUST ATTENTION** Step 6 (HTML presentation) is DEFAULT-ON: record `Release accuracy: PASS|FAIL` + `Release fidelity: PASS|FAIL` + `Release audience: PASS|FAIL` (R8) and auto-open best-effort (R9) before reporting done
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Static Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs` (legacy filename; static protocol composer)

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there immediately before the first target read, grep, edit, test, or analysis. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. After compaction, resume, delegation, or a material context change, re-read the required docs and state `Reference docs read: ... | Not applicable: ...`; a hook reminder or prior conversation is not proof that the files are loaded. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **PARALLELIZE:** Before executing the task list, tag each task `PAR` (independent inputs + write set disjoint from every other `PAR` task) or `SEQ` (name the blocking dependency), group `PAR` tasks into waves, declare the wave plan, and spawn each wave's sub-agents in ONE message — all-return barrier per wave, fan-out one level deep unless a sub-agent's own definition authorizes further fan-out. Sequential-by-default is a defect when tasks are independent; do not parallelize shared write targets, output-consuming tasks, trivial single-file work, ordering a skill or workflow explicitly fixes, or user-approval gates.
7. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)
## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.
## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**
1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.
## Common AI Mistake Prevention (System Lessons)

- **FIX GATE — INVESTIGATE FIRST.** Before applying any project-related fix, always invoke `$investigate` or `$debug-investigate` and establish the root cause; the failure site may be only a symptom.
- **FAILED-TEST GATE.** For any failed or flaky test, `$debug-investigate` is mandatory before editing source or tests; never change either side merely to force green.
- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec (`docs/specs/**` if one exists) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, `plans/`, `team-artifacts/`, or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
