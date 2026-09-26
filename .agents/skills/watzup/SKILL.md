---
name: watzup
description: '[Utilities] Use when a workflow step or the user asks for a session wrap-up. Summarizes what was done, key changes, why and how in an HTML report, then flags stale docs and lessons.'
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

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Hand the developer an evidence-backed wrap-up of the session — a **Session summary** first (Done · Key changes · Why · How it works), then the detail, doc/spec staleness flags, root-cause lessons and, for a large code change, a `$understand` review guide — delivered as a self-contained HTML report opened for them, WITHOUT changing any repository file, so they understand the work and decide the next step from full context.

**Summary:**

- **READ-ONLY contract** — review, summarize and FLAG only; NEVER edit, fix, implement, or update the docs or specs you flag. The only write is the git-ignored session report — why: watzup is a handoff, not an edit pass.
- **Scope is the session**, not only recent commits: uncommitted working-tree changes plus the commits made in this session, bounded by the session's task list, plan and prompt ledger when present — why: most session work is still uncommitted at wrap-up.
- **Main steps in order:** (1) **Scope** the session's work; (2) **Session summary** — Done, Key changes, Why, How it works, then the detail; (3) **Doc-staleness gate**; (4) **Spec-driven health check** (business code only); (5) **Root-cause lesson extraction**; (6) **`$understand` handoff** (large code change or on request, otherwise the summary alone); (7) **HTML session report**, auto-opened; (8) **ask the user directly Next Steps**.
- **HTML report:** the four parts plus Flags and Next steps go into `tmp/reports/watzup-{YYMMDD}-{HHmm}-{slug}.html`, built from `references/session-report-template.html` and opened with `node .claude/scripts/open-report.cjs <path>`; chat gets a short summary plus the path — why: the reader should come away understanding what was done, why and how it works, not skimming a chat scroll.
- **Proportion rule:** the session summary and the lesson gate always run. When no code changed (research, diagram or docs-only runs), the doc-staleness and spec-health gates record `skipped — no code changed` with the evidence. The `$understand` handoff is optional: it runs for a **large code change** (defined under [Session Summary](#session-summary-always-runs)) or when the user asks, and otherwise scales down to the session summary — why: a review route needs enough code to route through, and the four-part summary already explains a small change.
- **Cost, declared:** for a large code change (or on request), the `$understand` handoff derives diagrams, resolves real test-case IDs and builds an ordered review route, so it reads more of the repo and writes a longer report — the deliberate price of ending with a route into the work rather than a recap of it. A smaller change does not pay it: the session summary completes the wrap-up.
- Lessons go to `$learn` ONLY after user confirmation; surface-level "always check file X" notes are noise, not lessons.

**Workflow:**

1. **Scope** — Collect the session's work: `git status` and `git diff` / `git diff --staged` for uncommitted changes, plus commits made in this session (`git log` from the session's base commit, taken from the task list, plan or ledger when present). Read the task list, plan and prompt ledger (`tmp/prompt-ledger/<session>/ledger.md`) when present. State the boundary used and whether any code changed.
2. **Session summary** — Write the four labelled parts first (see [Session Summary](#session-summary-always-runs)), then the detail: what was modified, added or removed, and the impact and quality of the change.
3. **Doc Check** — Cross-reference changed paths against docs for staleness, or record `skipped — no code changed` with evidence.
4. **Spec Health** — Run when business code changed; otherwise record `skipped — no code changed` (or `no business code changed`) with evidence.
5. **Lesson Learned** — Analyze AI mistakes/issues during the session and capture lessons.
6. **Understand Handoff** — For a **large code change** (see [Session Summary](#session-summary-always-runs)) or when the user asks for the review guide, invoke `$understand` so the developer gets the full review guide on the session's work, high level first then detail, in four parts: **Orient → Route → Depth → Prove & Push Back**. The section contract lives in `understand/SKILL.md` Step 4 and is never re-listed here — a copy would go stale silently. Written to `tmp/reports/understand-*.md` — or delivered in full in chat when no git-ignored directory is available — and summarized in chat. For a large code change, ask `$understand` for HTML output so its full review route opens beside the session report, or instead of it when the user wants one report. Otherwise the handoff scales down to the session summary: record `Understand handoff: scaled down to the session summary — no code changed` (or `— below the large-change threshold`, with the changed-code count). If `$understand` is unavailable, record `Understand handoff: $understand unavailable — session summary only` in the report's Flags and continue; it never blocks the wrap-up.
7. **Session Report** — Write the HTML report and open it (see [Session Report (HTML)](#session-report-html)); post a short chat summary plus the report path.
8. **Next Steps** — ask the user directly (see [Next Steps](#next-steps)).

**Key Rules:**

- READ-ONLY: only flag findings, never implement or fix anything.
- Scope covers the whole session: uncommitted changes plus this session's commits.
- The Session summary always runs and comes first, with all four parts: Done, Key changes, Why, How it works.
- Doc-staleness and spec-health gates are REQUIRED when code changed; with no code changed each records `skipped — no code changed` with evidence.
- Lesson-learned analysis is REQUIRED on every run.
- Call `$understand` after the summary, gates and lesson analysis and before Next Steps only for a large code change or when the user asks; otherwise the handoff scales down to the session summary. An unavailable `$understand` is noted, never a blocker.
- Write the HTML session report on every run, open it with `open-report.cjs`, and post a short chat summary plus its path.
- The report must be beautiful, easy to read and easy to understand: one-line outcome, text status per request, changes grouped by area, before → after or flow for changed behaviour, plain short sentences — checked before it is opened.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

Review this session's work: the uncommitted working-tree changes plus the commits made in this session.
Write the Session summary first, then the detail of every change: what was modified, added, or removed.
Analyze the overall impact and quality of the changes.

**IMPORTANT**: Review and summarize only, never start implementing.

---

## Session Summary (ALWAYS runs)

Runs on every invocation, code or no code. Output it before any gate, as four labelled parts in this order:

- **Done:** high-level overview of what the session accomplished, mapped to each user request or the session goal (from the prompt ledger when present; otherwise the task list or plan). Name any request left unfinished.
- **Key changes:** grouped by area (e.g. hooks, skills, docs, tests), each with a `file:line` anchor from the diff or the session's commits.
- **Why:** the decision and rationale behind each key change, including trade-offs accepted and alternatives rejected.
- **How it works:** the resulting behaviour or flow after the change, explained briefly.

Then the detail: per-file changes, impact and quality assessment. For a research, diagram or docs-only session, **Key changes** lists the artifacts produced and **How it works** explains the finding or the flow they describe.

**No code changed** means the session's changed paths (working tree plus session commits) are empty or contain only docs, diagrams, reports and other non-executable artifacts — no source, script, test, hook, skill or config file. Cite the path list (or a clean `git status`) as the evidence.

**Large code change** — the trigger for the full `$understand` handoff — means any one of: more than 10 changed code files (the same path list, minus docs, diagrams and reports); a new module, service, skill, hook or script; or a changed public contract (an API, CLI, config schema, hook input/output or exported interface). Cite the count or the path that met the rule. A smaller code change ends with the session summary unless the user asks for the review guide.

---

## Doc Staleness Check (REQUIRED)

After the session summary, list the session's changed paths (`git status --porcelain` for uncommitted changes plus `git diff --name-only <session-base>..HEAD` for this session's commits) and cross-reference them against relevant docs:

| Changed file pattern    | Docs to check for staleness                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| `.claude/hooks/**`      | `.claude/docs/hooks/README.md`, hook count tables in `.claude/docs/hooks/*.md`                |
| `.claude/skills/**`     | `.claude/docs/skills/README.md`, skill count/catalog tables                                   |
| `.claude/workflows/**`  | `CLAUDE.md` workflow catalog table, `.claude/docs/` workflow references                       |
| `{configured-service-source-root}/**` | `docs/specs/` doc for the affected service (path from `docs/project-config.json`) |
| `{configured-frontend-source-root}/**` | `frontend-patterns-reference.md` in the project-reference docs root (default `docs/project-reference/`; path from `docsRoots.projectReference.path` in `docs/project-config.json`), relevant business-feature docs |
| `CLAUDE.md`             | `.claude/docs/README.md` (navigation hub must stay in sync)                                   |

**Output one of:**

- A bulleted list of docs that may need updating, with a brief note on what is likely stale (e.g., "hook count changed from 31 to 32").
- `No doc updates needed` — if no changed file pattern maps to a doc.
- `Doc staleness: skipped — no code changed` — plus the evidence (the changed-path list, or a clean `git status`), when no code changed.

**Do not edit docs during watzup.** Only flag. The user decides whether to fix.

---

## Spec-Driven Development Health Check (REQUIRED when business code changed)

Run this check when `git diff --name-only` includes ANY changes under the backend service source paths or frontend app/domain source paths (resolve the concrete paths from the project's structure reference / `docs/project-config.json`).

### Step 1 — Feature Spec Root Check

```bash
SPEC_ROOT=docs/specs # default only — read specRoots.business.path from docs/project-config.json first
ls "$SPEC_ROOT"/ 2>/dev/null
```

> **Note:** Results are **app-bucket** names. To find a specific Feature Spec, probe `ls "$SPEC_ROOT"/{app-bucket}/` for canonical `README.{Feature}.md` files and derived bucket indexes/ERDs.

| Result                     | Action                                                                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Directory missing or empty | ⚠️ Flag (naming the resolved root — default `docs/specs/`, overridden by `specRoots.business.path` in `docs/project-config.json`): `"No Feature Specs found under the business spec root. Consider running $workflow-code-to-spec (mode: init-full) to bootstrap spec-driven documentation for this codebase."` |
| Feature Specs exist        | Proceed to Step 2                                                                                                                                                     |

### Step 2 — Spec Staleness Check (only if bundle exists)

For each spec file in the business spec root (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides):

```bash
git log --since="30 days ago" --name-only -- "$SPEC_ROOT"/ | head -10
```

| Result                                                               | Action                                                                                                                                                    |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No commits in last 30 days AND business code changed in this session | ⚠️ Flag: `"Engineering spec bundle may be stale (no updates in >30 days). Consider running $workflow-code-to-spec (mode: audit) to verify freshness."` |
| Recent commits found                                                 | ✅ Spec bundle is being maintained                                                                                                                        |

### Step 3 — Feature Docs Freshness Check

`$SPEC_ROOT` remains the business spec root resolved in Step 1 (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides).

```bash
git log --since="30 days ago" --name-only -- "$SPEC_ROOT"/ | head -10
```

| Result                                               | Action                                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| No commits in last 30 days AND business code changed | ⚠️ Flag: `"Business feature docs may be stale. Consider running $docs-update to sync."` |
| Recent commits found                                 | ✅ Feature docs are being maintained                                                    |

**Output only flags that apply.** When no code changed, record `Spec health: skipped — no code changed` with the evidence; when code changed but none of it is business code, record `Spec health: skipped — no business code changed` with the changed-path list.

---

## AI Mistake & Lesson Learned Analysis (REQUIRED)

After doc staleness check, review entire session for AI mistakes and lessons learned.

### Step 1 — Surface all mistakes

List every error made during session. For each, note:

- What happened (observable symptom — build fail, test fail, wrong output)
- Where it happened (file:line if applicable)

Common mistake categories:

- Assumed an API/type/enum value existed without reading the source
- Assumed infrastructure availability without checking requirements
- Conflated "code exists" with "code executes" — missed path tracing
- Used a pattern without verifying the new context has the same preconditions
- Reported "done" without verifying ALL affected outputs across all stacks
- Hallucinated method names, class names, or file paths

### Step 2 — Extract root-cause lessons (NOT symptom fixes)

For each mistake, apply this 3-step extraction:

**2a. Name the failure mode** — NOT the symptom, the reasoning failure:

| Symptom (BAD lesson)                       | Failure mode (GOOD lesson)                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| "Used wrong enum value"                    | "Generated code using an assumed API without verifying it exists in the source"        |
| "Wrong namespace in using"                 | "Assumed project setup without reading project-specific configuration files first"     |
| "Happy-path assertion failed in CI"        | "Wrote assertions without tracing what infrastructure the handler requires at runtime" |
| "Set properties that don't exist on query" | "Assumed all types in a hierarchy share the same interface without reading base class" |

**2b. Find the class** — Where else could this SAME failure mode strike?

If failure mode applies in only one specific file or case → go up one abstraction level until it generalizes. Good lesson applies to ≥3 different contexts.

**2c. Write as a universal rule** — Strip ALL project-specific names:

- No file paths, class names specific to this codebase, or tool names
- Must read as useful advice on a completely different codebase in a different language
- If multiple mistakes share the same failure mode → consolidate into ONE lesson
- Test: "Would this prevent the same class of mistake in a Java, Go, or Python project?" If yes → good. If no → rewrite.

### Step 3 — Ask user to persist

> "Found [N] root-cause lesson(s). Should I use `$learn` to save them for future sessions?"

Wait for user confirmation before invoking `$learn`.

**Output one of:**

- A numbered list: failure mode → universal lesson → proposed `$learn` text
- `No AI mistakes identified in this session` — if genuinely none found

**Be honest and self-critical.** Surface-level symptom fixes ("always check file X") applying only to this codebase are NOT lessons — they are noise. Purpose: root-cause prevention compounding across sessions.

---

## Session Report (HTML)

Runs on every invocation, after the lesson analysis and the `$understand` handoff. It is the detailed, readable form of the session summary.

**Quality goal — beautiful, easy to read, easy to understand.** A developer who reads the title, the one-line outcome and Start here knows what the session achieved and where to look first; each later section is understood by skimming its first column and its visual. A correct report that is hard to scan fails this goal. Within the template's restraint (Start here is the only emphasised element; no hero, stat cards or gradients):

- **One-line outcome** under the title: what the session achieved, in plain words — not a list of tasks.
- **Done:** one row per request with a text status (`✓ Done` · `◐ Partial` · `✗ Not done`, set through the plain-text `{{STATUS}}` and `{{STATUS_KIND}}` placeholders — the template owns the markup), never colour alone, and the outcome in one or two sentences.
- **Key changes:** grouped under area rows, one change per row, the reader-facing effect first and the `file:line` beside it.
- **Why:** the decision in a few words, the reason in one or two sentences, the trade-off named plainly.
- **How it works:** show, not only describe — the before → after pair when behaviour changed, the ordered flow (or an inline SVG with the list as its text alternative) when three or more steps interact. Delete an optional block you did not fill.
- **Plain writing:** short sentences, active voice, one idea per cell, every number with its unit, no unexplained jargon or internal ids.
- **Flags:** most severe first, each naming what to do next.

1. **Resolve the directory** the way `understand/SKILL.md` Step 3 does: the reports directory `docs/project-config.json` names, if it names one, then `tmp/reports/`; take the first that `git check-ignore` confirms is ignored, creating it if absent. If none is ignored, write no file: deliver the report content in chat and name the directory to ignore.
2. **Write** `watzup-{YYMMDD}-{HHmm}-{slug}.html` from `references/session-report-template.html`: fill every placeholder, keep its inline CSS, structure and `Content-Security-Policy` meta, and add no script or external asset. **Encode every value:** HTML-escape each placeholder value — `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;`, `'` → `&#39;` — including text inside `<code>` and `<title>`, because session text routinely carries markup and comment markers that would otherwise hide or rewrite the rest of the report. Every `href` value (e.g. `{{START_FILE_LINK}}`) is a relative path or a `file:` / `vscode:` link — never `javascript:`, `data:` or any other scheme. Order: Start here, Done, Key changes, Why, How it works, Flags (doc staleness, spec health, risks, lessons — a skipped gate with its evidence), Next steps. Every claim carries its `file:line`. When `$understand` also wrote HTML, link it from Next steps.
3. **Check readability** before opening: re-read the filled report against the quality goal above — outcome line present, every Done row has a text status, no placeholder or empty optional block left, no cell longer than two sentences. When a browser or screenshot tool is available, look at the rendered page at a wide and a narrow width; fix any clipped text or overlap in the report file (never in the repository).
4. **Open** it: `node .claude/scripts/open-report.cjs <path>`. The helper opens nothing in CI, with `CK_NO_AUTO_OPEN=1`, or on a Linux session without a display, and always exits 0, so a failed open never blocks the wrap-up. It opens only a report inside the project's `tmp/` or `temp/` directory; a report written to a configured reports directory elsewhere is not opened — the helper prints its path, and the chat summary gives that path to the user.
5. **Post in chat** a short summary — Done in two or three lines, the start-here file, the flag count — plus `Session report → <path>`.

---

## Next Steps

**MANDATORY** before presenting these options, complete the handoff step (Workflow step 6) — a full `$understand` run scoped to the session's change set for a large code change or on request, otherwise the session summary alone — then write and open the session report ([Session Report (HTML)](#session-report-html)). If `$understand` is unavailable, note it in the report's Flags and continue; it is never a blocker. If no code changed, the handoff scales down to the session summary (Workflow step 6) and these options follow.

After the report is written, MUST ATTENTION use ask the user directly to present these options. NEVER skip because task seems "simple" or "obvious" — the user decides:

- **"$workflow-end (Recommended)"** — Complete and close the active workflow
- **"$commit"** — Commit changes if not using workflow
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `tmp/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `$project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Hand the developer an evidence-backed wrap-up of the session — a **Session summary** first (Done · Key changes · Why · How it works), then the detail, doc/spec staleness flags, root-cause lessons and, for a large code change, a `$understand` review guide — delivered as a self-contained HTML report opened for them, WITHOUT changing any repository file, so they understand the work and decide the next step from full context.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Nested Task Creation:** Expand child phases, link parent, one task in_progress.
- **Project Reference Docs Guide:** Read required project-reference docs (always lessons.md) before work.
- **Task Tracking External Report:** Bootstrap task tracking; persist findings to tmp/reports/ incrementally.
- **Critical Thinking:** Critical + sequential thinking; traced proof, no guess-as-fact.
- **Evidence:** Cite file:line for every claim; never speculate.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** stay READ-ONLY — only FLAG findings; NEVER edit, fix, implement, or update the docs or specs you flag — why: watzup is a review/handoff, not an edit pass; flagging-then-fixing silently breaks the read-only contract.
**IMPORTANT MUST ATTENTION** scope the whole session (uncommitted changes plus this session's commits) and write the Session summary first — Done, Key changes, Why, How it works — then run the gates: doc-staleness, spec health (business code only), lesson extraction. Never skip a gate because the change "looks small"; with no code changed, doc-staleness and spec health record `skipped — no code changed` with evidence — why: stale docs and missed lessons compound silently, while a code gate on a no-code session is noise.
**IMPORTANT MUST ATTENTION** complete the handoff step — `$understand` for a large code change or on request, otherwise the session summary alone — then write and open the HTML session report, BEFORE the ask the user directly Next Steps prompt; an unavailable `$understand` is noted in Flags, never a blocker — why: the developer's exit context is the explanation, not the raw diff, and the four-part summary already explains a small change.
**IMPORTANT MUST ATTENTION** make the HTML report beautiful, easy to read and easy to understand — one-line outcome, text status per request, changes grouped by area, a before → after or flow for changed behaviour, plain short sentences, no empty optional block — and check it before opening — why: a correct report nobody can scan hands over no understanding.
**IMPORTANT MUST ATTENTION** HTML-escape every placeholder value in the report and keep every `href` a relative, `file:` or `vscode:` link — why: the report is auto-opened in a browser, and unescaped session text can hide report content or run as markup.

**IMPORTANT MUST ATTENTION** extract lessons by ROOT CAUSE (the reasoning/assumption failure), NOT the symptom; write each as a universal rule that holds on ≥3 codebases; surface-level "always check file X" notes are noise — why: only root-cause prevention compounds across sessions.
**IMPORTANT MUST ATTENTION** send lessons to `$learn` ONLY after explicit user confirmation — NEVER auto-persist or self-edit instruction files — why: lesson capture is a durable instruction change the user must own.
**IMPORTANT MUST ATTENTION** use ask the user directly for the Next Steps decision — NEVER auto-decide the route even when it "seems obvious" — why: the user owns the workflow-end / commit / continue choice.
**IMPORTANT MUST ATTENTION** break work into small todo tasks with task tracking BEFORE starting (one task per file read), keep exactly one `in_progress`, and add a final review todo to verify work quality — why: long files exhaust context; granular tasks survive compaction.
**IMPORTANT MUST ATTENTION** cite `file:line` proof or traced evidence with a confidence % for every claim/finding (>80% to act, <80% verify first) — NEVER present a guess as fact — why: an unverified staleness/lesson flag misleads the developer's next decision.
**IMPORTANT MUST ATTENTION** grep/glob to verify any referenced doc, path, or API actually exists before flagging it — NEVER hallucinate a doc mapping or count — why: AI invents file paths and method names; the change summary must match the real diff.
**IMPORTANT MUST ATTENTION** read `CLAUDE.md` and the project-reference docs gate (`lessons.md` always) before the wrap-up — why: project conventions override generic staleness assumptions.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                      |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| "Doc looks fine, skip the staleness gate"        | Run the path→doc table anyway — staleness is silent; flag or output `No doc updates needed`.   |
| "No real mistakes this session, skip lessons"    | Still run the gate — output `No AI mistakes identified` only after honest self-review.         |
| "It's obvious next they want a commit, just do it" | NEVER auto-decide — present the ask the user directly options; the user owns the route.           |
| "I can just fix this stale doc while I'm here"    | READ-ONLY — flag only. Fixing here breaks the contract; the user decides.                      |
| "Big change, but skip `$understand` to save time" | A large code change (Session Summary definition) runs `$understand`; only a smaller or no-code change scales down to the summary, with the count or path list as evidence. |
| "Nothing was coded, skip the summary"            | The Session summary always runs — research and docs sessions still have Done, Why and How.     |
| "Only recent commits matter"                     | Scope is the session: uncommitted working-tree changes plus this session's commits.            |

**IMPORTANT MUST ATTENTION Goal echo:** Hand the developer an evidence-backed wrap-up of the session — a **Session summary** first (Done · Key changes · Why · How it works), then the detail, doc/spec staleness flags, root-cause lessons and, for a large code change, a `$understand` review guide — delivered as a self-contained HTML report opened for them, WITHOUT changing any repository file, so they understand the work and decide the next step from full context.

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
