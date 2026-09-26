# Release Notes: d0e5d0cc — Lean Guided Workflow Refactor (A–D)

**Date:** 2026-09-25
**Version:** d0e5d0cc (commit `d0e5d0cca2b1d41d6bf40ee5cf9a514ab613dab7`, range `89d0aaaa..d0e5d0cc`)
**Status:** Draft

---

## Summary

This release makes the framework lighter and quieter for adopting projects without dropping a quality gate. Workflows now state their goal and which steps can never be skipped. Big workflows no longer start on their own. Skill files are about 40% smaller because shared rules are sent once per session; the first skill load in a session is only about 5–14% lighter, and later loads save more. Every "do it automatically" behavior now has a project switch. In total: 6 changed defaults, 11 new capabilities, 5 improvements, and 3 bug fixes across Claude Code, Codex, and OpenCode.

## Breaking Changes

> **Warning**: The following defaults changed. Existing adopters will notice them.

### Large workflows no longer self-start (Workflow routing)

`workflow-big-feature`, `workflow-greenfield-init`, `workflow-idea-to-pbi`, and `workflow-spec-to-pbi` are now `manual`; `workflow-feature` is `confirm` (the assistant asks once). Any workflow still runs when you ask for it.
Migration: to restore the old behavior, set `portability.workflowActivation.overrides` in `docs/project-config.json`, e.g. `{ "workflow-feature": "auto" }`.

### 15 utility skills are command-only on every host (Skills)

`ck-help`, `custom-agent`, `custom-prompt`, `docx-convert`, `git-developer-performance`, `graph-export`, `pdf-convert`, `playwright-cli`, `presentation-builder`, `project-help`, `release-notes`, `remotion`, `scan-codebase-health`, `skill-creator`, `sync-skills-shared-protocols` run only via `/name` (`$name` on Codex). `commit` and `learn` stay selectable.
Migration: run `/sync-codex` and `/sync-opencode` to regenerate host policies and the 22 OpenCode `/name` commands.

### Code graph is opt-in (Code graph)

New `hooks.codeGraph.enabled` = `auto` (default; active only when `.code-graph/graph.db` exists) | `on` | `off`. Sessions no longer install Python tooling or nag about an unbuilt graph.
Migration: run `/graph-build` once or set `"on"`.

### No bundled 500K auto-compaction pin (Settings)

`CLAUDE_CODE_AUTO_COMPACT_WINDOW`, Codex `model_auto_compact_token_limit`, and OpenCode `limit.context` pins were removed; hosts use their own defaults. Syncs retire only the exact framework value.
Migration: to keep 500K, use `/autocompact 500k` or `.claude/settings.local.json`.

### `Fix-Origin` commit trailer is opt-in (Commit)

Off by default. Enable with `"commit": { "fixOriginTrailer": true }`; it applies to new commits only.

### Codex hook approval (Codex)

The commit adds 19 hook entries to `.codex/hooks.json` (six rule-delivery handlers on three events each, plus the token checkpoint). Codex skips a new hook until you approve it in `/hooks`.

## What's New

- **Guided workflows** — every workflow has a goal and required results; each step is tagged `gate`, `core`, or `optional`. Gate steps always run; other steps may be skipped, merged, or reordered, with each deviation logged to `tmp/workflow-runs/<runId>/skips.md` (Workflows)
- **Evidence-gated close** — `workflow-end` refuses to close until every required result has evidence (Workflows)
- **`/workflow-implement-spec`** — an 11-step lean route for behavior already written in a spec (vs 27 steps in `workflow-feature`); all gates kept (Workflows)
- **Spec scope baseline** — `/plan` snapshots a supplied spec; unrequested work becomes "Proposed additions (need approval)" (Planning)
- **Token checkpoint** — an advisory check-in every 500,000 non-cached tokens; `hooks.tokenBudget` (on by default) (Hooks)
- **Session usage report** — `node .claude/scripts/session-usage-report.cjs --transcript <path> [--compare <path>]` (Tooling)
- **Skill profiles** — `skillProfile` presets `full` / `standard` / `minimal` + per-skill lists; `node .claude/scripts/sync-skill-profile.cjs` (Adoption)
- **Framework-off session** — `claude --settings .claude/config/vanilla-settings.json --disable-slash-commands`, plus the adopter quick-settings table in `.claude/config/README.md` (Adoption)
- **HTML session report** — `/watzup` writes a session report under `tmp/reports/` and opens it safely (`CK_NO_AUTO_OPEN=1` disables) (Skills)
- **Read/edit convention triggers** — `contextGroups[].on`: `read` | `edit` | `both` (Conventions)
- **Leaner CLAUDE.md option** — `portability.inlinePathRules: false` (Context)

## Improvements

- **Skill files about 40% smaller** — the 119 converted skills went from 7.19 MB to 4.34 MB (−39.6%); shared rules are hook-delivered once per session; review skills keep full inline text (Protocol delivery)
- **Commit block recommends a review sized to the change** — lightest first, with a "use when" hint (Commit gate)
- **Routing reminder capped at 9,500 characters**; turning routing off now sends an explicit OFF notice (Workflow routing)
- **Step skills self-trigger less** on loose natural-language matches (Skills)
- **Code-graph tooling shared per machine** under the user cache, with an install lock (Code graph)

## Bug Fixes

- **One turn-complete alert per finished job**, not one per background agent (Notifications)
- **Codex duplicate alerts removed** — the legacy `notify` command is retired (Codex)
- **OpenCode prompts no longer rejected** by injected context; rules are re-sent after compaction (OpenCode)

## Known Trade-offs

- On Codex, each shell command runs six quick-exit hooks: about 1.5 s median (ADR-0004, not re-measured).
- The token checkpoint and usage report read Claude transcripts only.
- Rule-following quality after the delivery change is not yet measured by automation (a manual before/after review is deferred).

---

## Technical Details

<details>
<summary>For Developers</summary>

### Commits Included

| Hash     | Type | Description                                  |
| -------- | ---- | -------------------------------------------- |
| d0e5d0cc | feat | framework: lean guided workflow refactor A-D |

### Change Map

| Area                  | Files   | + / −                 |
| --------------------- | ------- | --------------------- |
| Skills                | 141     | +4,151 / −22,480      |
| Shared protocol texts | 100     | +3,265 / −0           |
| Hooks                 | 24      | +2,884 / −121         |
| Scripts               | 48      | +4,704 / −502         |
| Tests                 | 62      | +15,533 / −286        |
| Specs                 | 10      | +16,051 / −72         |
| Other docs            | 9       | +372 / −130           |
| Framework docs        | 17      | +372 / −178           |
| Agents                | 23      | +962 / −997           |
| Config / root         | 10      | +1,629 / −355         |
| Generated mirrors     | 343     | +12,842 / −27,703     |
| **Total**             | **787** | **+62,765 / −52,824** |

### Under the Hood

- Protocol texts single-sourced and generated into 100 files (97 tags) with a `--check` staleness guard (`.claude/scripts/build-protocol-projection.cjs`)
- Fix-loop and why-review full-mode moved to on-demand reference files
- 23 agent definitions recompressed
- `line_endings.py` preserves LF/CRLF in 16 Python injectors
- Framework-repo test guard; count-drift markers in README + 6 docs
- New specs: GuidedWorkflow, ProtocolDelivery, WorkflowRouting, AdoptionSwitches; ADR-0004
- Test suite: 981 passed, 4 skipped (commit message)

### Needs Confirmation

- Adoption spec says TC-ADS-016…053 are "Planned" (`README.AdoptionSwitches.md:540`), while Part 2 marks them Implemented
- `.claude/skills/graph-build/SKILL.md:68` still describes a project-local install
- TC-GWF-021 has no test
- Lean-route token saving not yet measured

</details>

## Contributors

- @duc01226 (ORIENTSOFTWARE\duc.dangphuoc)

---

_Generated by AI_ — analysis: `tmp/release-notes/d0e5d0cc-release-analysis.md`
