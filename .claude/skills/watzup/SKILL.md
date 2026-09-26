---
name: watzup
version: 1.3.0
description: '[Utilities] Use when a workflow step or the user asks for a session wrap-up. Summarizes what was done, key changes, why and how in an HTML report, then flags stale docs and lessons.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Hand the developer an evidence-backed wrap-up of the session — a **Session summary** first (Done · Key changes · Why · How it works), then the detail, doc/spec staleness flags, root-cause lessons and, for a large code change, a `/understand` review guide — delivered as a self-contained HTML report opened for them, WITHOUT changing any repository file, so they understand the work and decide the next step from full context.

**Summary:**

- **READ-ONLY contract** — review, summarize and FLAG only; NEVER edit, fix, implement, or update the docs or specs you flag. The only write is the git-ignored session report — why: watzup is a handoff, not an edit pass.
- **Scope is the session**, not only recent commits: uncommitted working-tree changes plus the commits made in this session, bounded by the session's task list, plan and prompt ledger when present — why: most session work is still uncommitted at wrap-up.
- **Main steps in order:** (1) **Scope** the session's work; (2) **Session summary** — Done, Key changes, Why, How it works, then the detail; (3) **Doc-staleness gate**; (4) **Spec-driven health check** (business code only); (5) **Root-cause lesson extraction**; (6) **`/understand` handoff** (large code change or on request, otherwise the summary alone); (7) **HTML session report**, auto-opened; (8) **`AskUserQuestion` Next Steps**.
- **HTML report:** the four parts plus Flags and Next steps go into `tmp/reports/watzup-{YYMMDD}-{HHmm}-{slug}.html`, built from `references/session-report-template.html` and opened with `node .claude/scripts/open-report.cjs <path>`; chat gets a short summary plus the path — why: the reader should come away understanding what was done, why and how it works, not skimming a chat scroll.
- **Proportion rule:** the session summary and the lesson gate always run. When no code changed (research, diagram or docs-only runs), the doc-staleness and spec-health gates record `skipped — no code changed` with the evidence. The `/understand` handoff is optional: it runs for a **large code change** (defined under [Session Summary](#session-summary-always-runs)) or when the user asks, and otherwise scales down to the session summary — why: a review route needs enough code to route through, and the four-part summary already explains a small change.
- **Cost, declared:** for a large code change (or on request), the `/understand` handoff derives diagrams, resolves real test-case IDs and builds an ordered review route, so it reads more of the repo and writes a longer report — the deliberate price of ending with a route into the work rather than a recap of it. A smaller change does not pay it: the session summary completes the wrap-up.
- Lessons go to `/learn` ONLY after user confirmation; surface-level "always check file X" notes are noise, not lessons.

**Workflow:**

1. **Scope** — Collect the session's work: `git status` and `git diff` / `git diff --staged` for uncommitted changes, plus commits made in this session (`git log` from the session's base commit, taken from the task list, plan or ledger when present). Read the task list, plan and prompt ledger (`tmp/prompt-ledger/<session>/ledger.md`) when present. State the boundary used and whether any code changed.
2. **Session summary** — Write the four labelled parts first (see [Session Summary](#session-summary-always-runs)), then the detail: what was modified, added or removed, and the impact and quality of the change.
3. **Doc Check** — Cross-reference changed paths against docs for staleness, or record `skipped — no code changed` with evidence.
4. **Spec Health** — Run when business code changed; otherwise record `skipped — no code changed` (or `no business code changed`) with evidence.
5. **Lesson Learned** — Analyze AI mistakes/issues during the session and capture lessons.
6. **Understand Handoff** — For a **large code change** (see [Session Summary](#session-summary-always-runs)) or when the user asks for the review guide, invoke `/understand` so the developer gets the full review guide on the session's work, high level first then detail, in four parts: **Orient → Route → Depth → Prove & Push Back**. The section contract lives in `understand/SKILL.md` Step 4 and is never re-listed here — a copy would go stale silently. Written to `tmp/reports/understand-*.md` — or delivered in full in chat when no git-ignored directory is available — and summarized in chat. For a large code change, ask `/understand` for HTML output so its full review route opens beside the session report, or instead of it when the user wants one report. Otherwise the handoff scales down to the session summary: record `Understand handoff: scaled down to the session summary — no code changed` (or `— below the large-change threshold`, with the changed-code count). If `/understand` is unavailable, record `Understand handoff: /understand unavailable — session summary only` in the report's Flags and continue; it never blocks the wrap-up.
7. **Session Report** — Write the HTML report and open it (see [Session Report (HTML)](#session-report-html)); post a short chat summary plus the report path.
8. **Next Steps** — `AskUserQuestion` (see [Next Steps](#next-steps)).

**Key Rules:**

- READ-ONLY: only flag findings, never implement or fix anything.
- Scope covers the whole session: uncommitted changes plus this session's commits.
- The Session summary always runs and comes first, with all four parts: Done, Key changes, Why, How it works.
- Doc-staleness and spec-health gates are REQUIRED when code changed; with no code changed each records `skipped — no code changed` with evidence.
- Lesson-learned analysis is REQUIRED on every run.
- Call `/understand` after the summary, gates and lesson analysis and before Next Steps only for a large code change or when the user asks; otherwise the handoff scales down to the session summary. An unavailable `/understand` is noted, never a blocker.
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

**Large code change** — the trigger for the full `/understand` handoff — means any one of: more than 10 changed code files (the same path list, minus docs, diagrams and reports); a new module, service, skill, hook or script; or a changed public contract (an API, CLI, config schema, hook input/output or exported interface). Cite the count or the path that met the rule. A smaller code change ends with the session summary unless the user asks for the review guide.

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
| Directory missing or empty | ⚠️ Flag (naming the resolved root — default `docs/specs/`, overridden by `specRoots.business.path` in `docs/project-config.json`): `"No Feature Specs found under the business spec root. Consider running /workflow-code-to-spec (mode: init-full) to bootstrap spec-driven documentation for this codebase."` |
| Feature Specs exist        | Proceed to Step 2                                                                                                                                                     |

### Step 2 — Spec Staleness Check (only if bundle exists)

For each spec file in the business spec root (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides):

```bash
git log --since="30 days ago" --name-only -- "$SPEC_ROOT"/ | head -10
```

| Result                                                               | Action                                                                                                                                                    |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No commits in last 30 days AND business code changed in this session | ⚠️ Flag: `"Engineering spec bundle may be stale (no updates in >30 days). Consider running /workflow-code-to-spec (mode: audit) to verify freshness."` |
| Recent commits found                                                 | ✅ Spec bundle is being maintained                                                                                                                        |

### Step 3 — Feature Docs Freshness Check

`$SPEC_ROOT` remains the business spec root resolved in Step 1 (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides).

```bash
git log --since="30 days ago" --name-only -- "$SPEC_ROOT"/ | head -10
```

| Result                                               | Action                                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| No commits in last 30 days AND business code changed | ⚠️ Flag: `"Business feature docs may be stale. Consider running /docs-update to sync."` |
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

> "Found [N] root-cause lesson(s). Should I use `/learn` to save them for future sessions?"

Wait for user confirmation before invoking `/learn`.

**Output one of:**

- A numbered list: failure mode → universal lesson → proposed `/learn` text
- `No AI mistakes identified in this session` — if genuinely none found

**Be honest and self-critical.** Surface-level symptom fixes ("always check file X") applying only to this codebase are NOT lessons — they are noise. Purpose: root-cause prevention compounding across sessions.

---

## Session Report (HTML)

Runs on every invocation, after the lesson analysis and the `/understand` handoff. It is the detailed, readable form of the session summary.

**Quality goal — beautiful, easy to read, easy to understand.** A developer who reads the title, the one-line outcome and Start here knows what the session achieved and where to look first; each later section is understood by skimming its first column and its visual. A correct report that is hard to scan fails this goal. Within the template's restraint (Start here is the only emphasised element; no hero, stat cards or gradients):

- **One-line outcome** under the title: what the session achieved, in plain words — not a list of tasks.
- **Done:** one row per request with a text status (`✓ Done` · `◐ Partial` · `✗ Not done`, set through the plain-text `{{STATUS}}` and `{{STATUS_KIND}}` placeholders — the template owns the markup), never colour alone, and the outcome in one or two sentences.
- **Key changes:** grouped under area rows, one change per row, the reader-facing effect first and the `file:line` beside it.
- **Why:** the decision in a few words, the reason in one or two sentences, the trade-off named plainly.
- **How it works:** show, not only describe — the before → after pair when behaviour changed, the ordered flow (or an inline SVG with the list as its text alternative) when three or more steps interact. Delete an optional block you did not fill.
- **Plain writing:** short sentences, active voice, one idea per cell, every number with its unit, no unexplained jargon or internal ids.
- **Flags:** most severe first, each naming what to do next.

1. **Resolve the directory** the way `understand/SKILL.md` Step 3 does: the reports directory `docs/project-config.json` names, if it names one, then `tmp/reports/`; take the first that `git check-ignore` confirms is ignored, creating it if absent. If none is ignored, write no file: deliver the report content in chat and name the directory to ignore.
2. **Write** `watzup-{YYMMDD}-{HHmm}-{slug}.html` from `references/session-report-template.html`: fill every placeholder, keep its inline CSS, structure and `Content-Security-Policy` meta, and add no script or external asset. **Encode every value:** HTML-escape each placeholder value — `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;`, `'` → `&#39;` — including text inside `<code>` and `<title>`, because session text routinely carries markup and comment markers that would otherwise hide or rewrite the rest of the report. Every `href` value (e.g. `{{START_FILE_LINK}}`) is a relative path or a `file:` / `vscode:` link — never `javascript:`, `data:` or any other scheme. Order: Start here, Done, Key changes, Why, How it works, Flags (doc staleness, spec health, risks, lessons — a skipped gate with its evidence), Next steps. Every claim carries its `file:line`. When `/understand` also wrote HTML, link it from Next steps.
3. **Check readability** before opening: re-read the filled report against the quality goal above — outcome line present, every Done row has a text status, no placeholder or empty optional block left, no cell longer than two sentences. When a browser or screenshot tool is available, look at the rendered page at a wide and a narrow width; fix any clipped text or overlap in the report file (never in the repository).
4. **Open** it: `node .claude/scripts/open-report.cjs <path>`. The helper opens nothing in CI, with `CK_NO_AUTO_OPEN=1`, or on a Linux session without a display, and always exits 0, so a failed open never blocks the wrap-up. It opens only a report inside the project's `tmp/` or `temp/` directory; a report written to a configured reports directory elsewhere is not opened — the helper prints its path, and the chat summary gives that path to the user.
5. **Post in chat** a short summary — Done in two or three lines, the start-here file, the flag count — plus `Session report → <path>`.

---

## Next Steps

**MANDATORY** before presenting these options, complete the handoff step (Workflow step 6) — a full `/understand` run scoped to the session's change set for a large code change or on request, otherwise the session summary alone — then write and open the session report ([Session Report (HTML)](#session-report-html)). If `/understand` is unavailable, note it in the report's Flags and continue; it is never a blocker. If no code changed, the handoff scales down to the session summary (Workflow step 6) and these options follow.

After the report is written, MUST ATTENTION use `AskUserQuestion` to present these options. NEVER skip because task seems "simple" or "obvious" — the user decides:

- **"/workflow-end (Recommended)"** — Complete and close the active workflow
- **"/commit"** — Commit changes if not using workflow
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `/project-init` or the narrow owner route before relying on it.
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

**IMPORTANT MUST ATTENTION Goal:** Hand the developer an evidence-backed wrap-up of the session — a **Session summary** first (Done · Key changes · Why · How it works), then the detail, doc/spec staleness flags, root-cause lessons and, for a large code change, a `/understand` review guide — delivered as a self-contained HTML report opened for them, WITHOUT changing any repository file, so they understand the work and decide the next step from full context.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Nested Task Creation:** Expand child phases, link parent, one task in_progress.
- **Project Reference Docs Guide:** Read required project-reference docs (always lessons.md) before work.
- **Task Tracking External Report:** Bootstrap task tracking; persist findings to tmp/reports/ incrementally.
- **Critical Thinking:** Critical + sequential thinking; traced proof, no guess-as-fact.
- **Evidence:** Cite file:line for every claim; never speculate.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** stay READ-ONLY — only FLAG findings; NEVER edit, fix, implement, or update the docs or specs you flag — why: watzup is a review/handoff, not an edit pass; flagging-then-fixing silently breaks the read-only contract.
**IMPORTANT MUST ATTENTION** scope the whole session (uncommitted changes plus this session's commits) and write the Session summary first — Done, Key changes, Why, How it works — then run the gates: doc-staleness, spec health (business code only), lesson extraction. Never skip a gate because the change "looks small"; with no code changed, doc-staleness and spec health record `skipped — no code changed` with evidence — why: stale docs and missed lessons compound silently, while a code gate on a no-code session is noise.
**IMPORTANT MUST ATTENTION** complete the handoff step — `/understand` for a large code change or on request, otherwise the session summary alone — then write and open the HTML session report, BEFORE the `AskUserQuestion` Next Steps prompt; an unavailable `/understand` is noted in Flags, never a blocker — why: the developer's exit context is the explanation, not the raw diff, and the four-part summary already explains a small change.
**IMPORTANT MUST ATTENTION** make the HTML report beautiful, easy to read and easy to understand — one-line outcome, text status per request, changes grouped by area, a before → after or flow for changed behaviour, plain short sentences, no empty optional block — and check it before opening — why: a correct report nobody can scan hands over no understanding.
**IMPORTANT MUST ATTENTION** HTML-escape every placeholder value in the report and keep every `href` a relative, `file:` or `vscode:` link — why: the report is auto-opened in a browser, and unescaped session text can hide report content or run as markup.

**IMPORTANT MUST ATTENTION** extract lessons by ROOT CAUSE (the reasoning/assumption failure), NOT the symptom; write each as a universal rule that holds on ≥3 codebases; surface-level "always check file X" notes are noise — why: only root-cause prevention compounds across sessions.
**IMPORTANT MUST ATTENTION** send lessons to `/learn` ONLY after explicit user confirmation — NEVER auto-persist or self-edit instruction files — why: lesson capture is a durable instruction change the user must own.
**IMPORTANT MUST ATTENTION** use `AskUserQuestion` for the Next Steps decision — NEVER auto-decide the route even when it "seems obvious" — why: the user owns the workflow-end / commit / continue choice.
**IMPORTANT MUST ATTENTION** break work into small todo tasks with `TaskCreate` BEFORE starting (one task per file read), keep exactly one `in_progress`, and add a final review todo to verify work quality — why: long files exhaust context; granular tasks survive compaction.
**IMPORTANT MUST ATTENTION** cite `file:line` proof or traced evidence with a confidence % for every claim/finding (>80% to act, <80% verify first) — NEVER present a guess as fact — why: an unverified staleness/lesson flag misleads the developer's next decision.
**IMPORTANT MUST ATTENTION** grep/glob to verify any referenced doc, path, or API actually exists before flagging it — NEVER hallucinate a doc mapping or count — why: AI invents file paths and method names; the change summary must match the real diff.
**IMPORTANT MUST ATTENTION** read `CLAUDE.md` and the project-reference docs gate (`lessons.md` always) before the wrap-up — why: project conventions override generic staleness assumptions.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                      |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| "Doc looks fine, skip the staleness gate"        | Run the path→doc table anyway — staleness is silent; flag or output `No doc updates needed`.   |
| "No real mistakes this session, skip lessons"    | Still run the gate — output `No AI mistakes identified` only after honest self-review.         |
| "It's obvious next they want a commit, just do it" | NEVER auto-decide — present the `AskUserQuestion` options; the user owns the route.           |
| "I can just fix this stale doc while I'm here"    | READ-ONLY — flag only. Fixing here breaks the contract; the user decides.                      |
| "Big change, but skip `/understand` to save time" | A large code change (Session Summary definition) runs `/understand`; only a smaller or no-code change scales down to the summary, with the count or path list as evidence. |
| "Nothing was coded, skip the summary"            | The Session summary always runs — research and docs sessions still have Done, Why and How.     |
| "Only recent commits matter"                     | Scope is the session: uncommitted working-tree changes plus this session's commits.            |

**IMPORTANT MUST ATTENTION Goal echo:** Hand the developer an evidence-backed wrap-up of the session — a **Session summary** first (Done · Key changes · Why · How it works), then the detail, doc/spec staleness flags, root-cause lessons and, for a large code change, a `/understand` review guide — delivered as a self-contained HTML report opened for them, WITHOUT changing any repository file, so they understand the work and decide the next step from full context.
