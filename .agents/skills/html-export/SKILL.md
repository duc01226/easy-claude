---
name: html-export
description: '[Document Processing] Use when a workflow step or the user asks for an HTML page, deck, mockup or animation export or render check: PNG screenshots with a page-error and blank-capture check, a vector PDF, or MP4/GIF. Flag: --to={png|pdf|mp4|gif}.'
disable-model-invocation: false
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

**Goal:** Turn a local HTML file into PNG screenshots with a page-error and blank-capture check, a vector PDF, an MP4 or a GIF, through one entry point that reports the result as an exit code.

**Workflow:**

1. **Pick a target** — `--to=png` (render evidence), `--to=pdf` (print or slides), `--to=mp4` / `--to=gif` (deterministic animation recording)
2. **Check setup** — dependencies are opt-in and skill-local; a missing one exits `3` with the setup commands
3. **Export** — `node .claude/skills/html-export/scripts/export.cjs --to=<target> <input...> [options]`
4. **Read the exit code first** — then `report.json` / `frames.json`, then the output; a written file is never proof on its own. A reused `--out` keeps earlier outputs: only the files this run's manifest names belong to it — `report.json` `files[]` (png), `report.json` `output` (pdf), `frames.json` `output` (mp4/gif)

**Key Rules:**

- `--to` is required; there is no default target.
- Nothing is ever installed on the user's behalf. Exit `3` means `NOT VERIFIABLE` plus a setup pointer.
- Render only HTML the project or the user produced; anything fetched or untrusted only with `--offline` (see [Trust](#trust)).
- The HTML stays canonical. Fix the page or pick the right selector; never restructure HTML for the exporter.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# html-export

Agents and users may invoke this skill directly, and other skills may run the script by path. Either way the exporter only renders; it never installs, commits or publishes anything.

## Setup (opt-in only)

Needs Node.js 20 or newer and, in the skill's own `node_modules`, Playwright 1.55.1 or newer (never a parent project's copy). Run these from the project root, only when the user asks; the exporter prints them on exit `3` and never runs them.

```text
# Playwright and pdf-lib go into the skill folder; Chromium goes into Playwright's per-user browser cache
macOS/Linux shell:  (cd .claude/skills/html-export && npm install && npx playwright install chromium)
Linux system libs:  (cd .claude/skills/html-export && npx playwright install --with-deps chromium)
Windows PowerShell: Push-Location .claude/skills/html-export; npm install; npx playwright install chromium; Pop-Location
Windows cmd:        pushd .claude\skills\html-export && npm install && npx playwright install chromium && popd

# ffmpeg, only for mp4/gif (the build must include the libx264 encoder)
Windows:            winget install Gyan.FFmpeg
macOS:              brew install ffmpeg
Linux (Debian/Ubuntu): sudo apt-get install ffmpeg
```

Install from inside the skill folder, never with `npm install --prefix`: run from a project with its own `package.json`, that form makes npm add the host project as a dependency of the skill (it rewrites the skill's `package.json` and links the project root into its `node_modules`).

ffmpeg and ffprobe are looked up only in the absolute directories on `PATH`, never in the current directory.

| Environment variable  | Effect                                                                                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HTML_EXPORT_FFMPEG`  | Pins the ffmpeg build instead of the `PATH` lookup. Must be an **absolute** path; on Windows it must also name a `.exe` or `.com` file (never a `.bat` / `.cmd` wrapper). Otherwise exit `3` |
| `HTML_EXPORT_FFPROBE` | The same for ffprobe, with the same rules                                                                                                                              |
| `HTML_EXPORT_DEBUG=1` | Prints the stack trace of an unexpected error to stderr. Set it when an exit `1` names an unexpected error, and quote the stack                                         |

**Removing the skill.** Deleting the skill folder removes Playwright, pdf-lib and every other npm dependency. Chromium stays in Playwright's per-user browser cache (or under `PLAYWRIGHT_BROWSERS_PATH` when that is set); to remove it too, first run `npx playwright uninstall` from inside the skill folder — it removes only the browsers no other Playwright installation still uses — then delete the folder. Regenerate the mirrors afterwards.

## Trust

Render only HTML that the project or the user produced: its own decks, mockups, reports and drafts. For anything fetched from the web or otherwise untrusted, always pass `--offline`. Chromium runs without its OS sandbox, and a page can embed any local file the user can read (for example through an iframe) into the PNG, PDF or video. `--offline` blocks the page's network traffic; it is not a sandbox, and an embedded local file still lands in the output.

A page the project produced stays trusted when it uses fetched files only as verified images through `<img src>` (an SVG loaded as an image runs no script and loads nothing) and loads no remote script, frame or media; remote web fonts through CSS are fine. Inlining fetched SVG markup, or embedding it through `<object>`, `<iframe>` or `<embed>`, makes the page untrusted: pass `--offline`.

## Usage

```bash
node .claude/skills/html-export/scripts/export.cjs --to=png page.html
node .claude/skills/html-export/scripts/export.cjs --to=pdf deck.html --page=1920x1080
node .claude/skills/html-export/scripts/export.cjs --to=mp4 intro.html --duration=4
node .claude/skills/html-export/scripts/export.cjs --help
```

A value flag takes `=value` or the next argument; `--slides` takes only the attached form, so `--slides <css>` reads the selector as an input file. Quote a selector with brackets or spaces in every shell: single quotes in bash, zsh and PowerShell (`--slides='[data-state]'`; unquoted, zsh treats the brackets as a glob), double quotes in cmd.exe.

The dispatcher checks every flag and input before any dependency or target runs, so a bad command exits `2` even when nothing is installed: an input, or a pdf `--order` entry, that is not an `.html` or `.htm` file (any letter case; a positional pdf input may also be a folder), an unknown flag or one the target rejects, `--timeout` or `--scale` not above 0, `--timeout` above 2147483647 (about 24.8 days), a malformed `WxH`, a size listed twice in `--viewport`, or an empty `--slides=`. Three checks need the page, so they run after rendering starts and stop the run at once: a `--slides` selector the browser cannot parse (png, pdf), a pdf selector that matches nothing, and a video with no duration. The video `--keep-frames` folder check runs after the dependency checks, before rendering.

### Generic options

| Option                   | Meaning                                                                                                                                                                                                                                                                                | Applies to |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `--out=<dir>`            | Output directory. Default: `<project>/tmp/html-export/<YYMMDD-HHmm>-<first input name>/`                                                                                                                                                                                               | all        |
| `--viewport=<WxH[,WxH]>` | Viewport size; a comma list only for png                                                                                                                                                                                                                                               | all        |
| `--slides[=<css>]`       | Navigate slides or screens; bare form uses the default selector `section.slide[data-slide-id], [data-export-slide]`                                                                                                                                                                    | png, pdf   |
| `--page=<WxH>`           | PDF page size in CSS pixels, print mode only                                                                                                                                                                                                                                           | pdf        |
| `--scale=<n>`            | Device scale factor, greater than 0                                                                                                                                                                                                                                                    | all        |
| `--timeout=<ms>`         | Timeout in milliseconds (default 30000, at most 2147483647) for load, fonts and each step, and for every call into the page: the `window.__ready` wait, evidence collection, slide navigation, pdf slide isolation, and the video duration, ready, `__seek` and per-frame calls. A page that hangs one of them becomes a logged page fault. It never bounds the browser's own start or stop (see below) | all        |
| `--offline`              | Take the page offline: besides the input itself, only local `file:` URLs load (empty or `localhost` host). Every other request, including `file://<host>/`, and every WebSocket is refused and listed in `blocked[]`; WebTransport, speculation-rules prefetch and service workers are also blocked, silently. The failure message Chromium logs for a blocked request or WebSocket is not a page error; code that then throws still is one | all        |
| `--allow-errors`         | Accept page errors; never a blank capture or a failed step                                                                                                                                                                                                                             | all        |
| `--self-check`           | Render the known-good fixture first; png only                                                                                                                                                                                                                                          | png        |
| `--help`                 | Print usage and exit `0`                                                                                                                                                                                                                                                               | all        |

**Browser start and stop.** Launching Chromium, creating its context and page, setting up the `--offline` route, and closing the browser each get `max(--timeout, 30000)` ms, the same budget as the dependency check, so a short `--timeout` never fails a slow launch. A start call that runs over fails that input as a tool fault (`pageFault: false`, message `<call> did not finish within N ms; the browser is not responding (a busy or broken machine, not the page)`). A close that runs over prints `Warning: the browser did not close within N ms; ...`, the run continues with its exit code unchanged, and the exporter exits on its own instead of hanging; that browser is stopped when it exits.

### `--to=png` — render evidence

Target flag: `--full-page` (opt-in). Inputs: one or more `.html` / `.htm` files; `--self-check` may run with no input to check only the verifier.

- Default viewports `1440x900,390x844`. Each capture is **viewport-only**; `--full-page` adds `<name>@<WxH>-full.png` with the whole scrollable document and its own blank check. `--full-page` with `--slides` exits `2`.
- Writes `<name>@<WxH>.png`, or with `--slides` one `<name>@<WxH>-s<NN>.png` per item, plus `report.json`.
- Log and continue: a failed open, navigation, capture or timeout on one input, viewport or slide goes to `report.json` `failures[]` (each entry with `pageFault`) and stderr, and the rest of the batch still runs. A page that fails to open still lists the errors it raised before that in `errors[]`.
- Exit `4` on a page-caused failure, a blank capture, or a page error (unless `--allow-errors`), even when nothing was captured; a `--slides` selector that matches nothing counts as blank. Exit `1` only for a tool fault with none of those (browser start, a write error) or when `--self-check` reports `verifier broken`. A `--slides` selector the browser cannot parse exits `2` (`report.json` `usageError`). `--page` is a usage error; use `--viewport`.

### `--to=pdf` — vector PDF

Target flag: `--order=<file>` — one `.html` / `.htm` path per line (blank and `#` lines skipped, relative paths resolved against the file's folder). Inputs: HTML files or directories (natural order), or `--order`, never both.

- **Print mode** (default): the page's print CSS. Page size: `--page=WxH` wins over a CSS `@page { size }` rule; without `--page` the CSS size applies, else Chromium's default.
- **Slides mode** (`--slides[=<css>]`): running animations are finished, then each navigated item prints as one viewport-sized page with screen media. `--page` with `--slides` is a usage error; size pages with one `--viewport=WxH`.
- Several inputs, or slides mode, merge into `<out>/<name>.pdf` with pdf-lib. stdout carries only the PDF path; `report.json` (errors, `failures[]`, navigation, `blocked[]`) is written beside it.
- Log and continue: a failed input or slide is recorded (with `pageFault`) and skipped, and the PDF holds every page that printed. Exit `4` when the page caused a failure or reported errors (unless `--allow-errors`), even if nothing printed (then no PDF is written). Exit `1` when only the tool failed, or nothing printed without a page fault; the pages that printed are still written. A merge or PDF-write failure exits `1` with `report.json` `fatal`. A slides selector that cannot be parsed or matches nothing exits `2` with no PDF (`report.json` `usageError`). `--self-check` is rejected.

### `--to=mp4` / `--to=gif` — deterministic recording

Target flags: `--fps=<1-60>` (default 30 for mp4, 15 for gif), `--duration=<seconds>`, `--audio=<local file>` (mp4 only, AAC, trimmed to the shorter stream), `--gif-width=<px>` (gif only, default 960), `--keep-frames`. Input: exactly one HTML file.

- **Units differ:** `--duration` is in **seconds**; the page hook `window.__duration` is in **milliseconds**. `--duration` wins; with neither, the run exits `2` and writes nothing.
- Default viewport `1920x1080`, one viewport only. `--slides`, `--page` and `--self-check` are usage errors. MP4 is libx264 at `-crf 18`; a build without libx264 exits `3`.
- The recorder sets `window.__recording` before page scripts run and hides elements marked `data-export-hide`. Contract: [`references/animation-recording.md`](references/animation-recording.md).
- Writes the video plus `frames.json` (`status` `ok` / `page-errors` / `failed`, `exitCode`, `failure` with `pageFault`, `pageErrors`, `noMotion`, a sha256 per frame). Page errors, including a timer or animation-frame callback that throws while the recorder advances the clock, are recorded and recording continues: exit `4` with the files written (`0` with `--allow-errors`). A page that never loads or becomes ready, a `__seek` that throws, a page that breaks the recorder's setup or animation pinning, or any in-page call or frame step that exceeds `--timeout` exits `4` with no video. A tool fault (browser start, a write error, ffmpeg) exits `1`, or `4` when the page also reported errors that `--allow-errors` does not accept. Identical frames print a warning and set `noMotion` (exit stays `0`).
- `--keep-frames` also keeps every frame in `<out>/frames/`. An existing `frames/` is reused only when it is a real directory holding nothing but the recorder's own frame files; otherwise the run exits `2` and touches nothing. Frames are captured into a work folder and replace the earlier frame files only after the video encoded, so a failed recording or encode leaves an earlier `frames/` as it was. A failed run never writes the video path, and an earlier video stays in place; `frames.json` is rewritten by every run except a usage error.

## Producer selectors

| Producer             | png                                      | pdf                             |
| -------------------- | ---------------------------------------- | ------------------------------- |
| presentation-builder | `--slides` (default selector)            | `--page=1920x1080` (print mode) |
| feature-presentation | `--slides=section.deck__slide`           | `--slides=section.deck__slide`  |
| pbi-mockup           | `--slides='[data-state]'` (every screen) | —                               |

Any other page can mark its items with `data-export-slide`.

## Exit codes

| Exit | Meaning                                                                                                                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0`  | Export succeeded and the target's checks passed                                                                                                                                       |
| `1`  | Tool fault, and the page did nothing wrong: the browser did not launch or start in time — including a dependency-check launch that timed out (the message says `timed out`: a busy or broken machine, not a missing browser) — a write error, a pdf merge failure, an unexpected exception (set `HTML_EXPORT_DEBUG=1` for its stack), png `verifier broken`, an ffmpeg failure (a failed GIF pass keeps the MP4 when that name is free). A page fault, blank png capture or unaccepted page error in the same run makes it `4` |
| `2`  | Usage error: missing or unknown `--to`, unknown or rejected flag, bad input or value, an input or pdf `--order` entry that is not an `.html` / `.htm` file (a positional pdf input may also be a folder), `--timeout` above 2147483647; a png or pdf `--slides` selector the browser cannot parse; pdf slides selector matching nothing; video with no duration; `--keep-frames` on a foreign `frames/` |
| `3`  | Dependency missing: Node older than 20, Playwright older than 1.55.1 or absent, Chromium not installed or failing to launch for any reason other than a timeout (for example a missing system library), pdf-lib for a merge, ffmpeg with libx264, or an `HTML_EXPORT_FFMPEG` / `HTML_EXPORT_FFPROBE` that is relative or, on Windows, not a `.exe` / `.com` file |
| `4`  | The page is wrong, even when nothing was produced: page errors (unless `--allow-errors`), a blank png capture, or a page-caused failure (`pageFault: true`) — never loads, never ready, fonts time out, navigation error, an in-page hang, a `__seek` that throws or times out, a page that breaks the video recorder's setup or animation pinning |
| other | Interrupted, for example `130` after Ctrl+C: no verdict and possibly no `report.json`. A video run can leave `<out>/.video-work-*` folders; the recorder removes them on a best-effort basis, and any that remain are safe to delete |

## Calling from other skills

Invoke the skill, or run `node .claude/skills/html-export/scripts/export.cjs ...` by path. Every caller follows the same rule:

- **Exit `0`** → evidence, only within the scope below.
- **Exit `4`** → fix the page and re-run (fix loop); `report.json` or `frames.json` names each failure.
- **Exit `3`** → mark the check `NOT VERIFIABLE` with a one-line pointer to `$html-export` setup. Never run install commands on the user's behalf.
- **Exit `1` / `2`** → tool failure: quote stderr, mark `NOT VERIFIABLE`. Never count it as a design defect or a pass.
- **Any other exit** (such as `130` after an interrupt) → handle it like `1` / `2`.
- **Evidence files** → only those the run's manifest names (`report.json` `files[]` for png, `output` for pdf, `frames.json` `output` for video); a reused `--out` still holds earlier outputs.

## What exit 0 proves

Without `--allow-errors`:

- **png:** each input loaded at each requested viewport; no console error or uncaught exception from load through the last capture; no step failed; every capture held visible text, an image, an SVG or a canvas; with `--slides`, every matched item was shown and captured.
- **pdf:** every input and slide printed into the PDF and no page error occurred.
- **mp4/gif:** the video was encoded from frames captured on the recorder's controlled clock, with no page error.

It does **not** prove the page looks right, that interaction works, anything below the first viewport (unless `--full-page`), other browsers, or that remote assets load. Open the output and judge it; interactive checks stay `NOT VERIFIABLE` unless exercised another way.

## Resources

- [`references/verification.md`](references/verification.md) — png evidence, `report.json` fields, failure signatures, offline rule, self-check, known limits
- [`references/deck-export.md`](references/deck-export.md) — pdf print vs slides mode, page size, per-producer commands, ordering, merge, pdf `report.json`
- [`references/animation-recording.md`](references/animation-recording.md) — the recording contract: time rule, `window.__ready` / `__seek` / `__duration` / `__recording`, `data-export-hide`, `frames.json`
- Tests: `node .claude/skills/html-export/tests/run-tests.cjs` (browser cases report `ENVIRONMENT-BLOCKED` when Chromium or ffmpeg is absent)

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

**IMPORTANT MUST ATTENTION Goal:** export HTML to PNG, PDF, MP4 or GIF through `scripts/export.cjs --to={png|pdf|mp4|gif}` and report the result by exit code.

**IMPORTANT MUST ATTENTION** read the exit code before the output — a written file proves nothing; exit `4` still writes files; only the run's manifest (`report.json` / `frames.json`) names this run's outputs
**IMPORTANT MUST ATTENTION** never install dependencies on the user's behalf — exit `3` is `NOT VERIFIABLE` plus a setup pointer
**IMPORTANT MUST ATTENTION** exit `1`/`2` is a tool failure, never a design defect or a pass
**IMPORTANT MUST ATTENTION** `--duration` is seconds, `window.__duration` is milliseconds
**IMPORTANT MUST ATTENTION** the HTML stays canonical — never restructure it for the exporter

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
