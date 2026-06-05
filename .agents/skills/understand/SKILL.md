---
name: understand
description: '[Process] Use when the developer wants to genuinely understand something — by default the current working tasks + changes in context, or whatever the prompt names (a plan, a subsystem, a decision, a concept, a bug). AI derives WHAT to explain from the prompt. Mentor-mode teach-back, gap-fill, quizzing, throttled by coding level. Opt-in, never blocks.'
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
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->
## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**
- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing-file hard stop:** If `docs/project-config.json`, the docs index, `lessons.md`, or any task-required reference doc is missing, stop immediately and ask the user to run `$project-config` and `$scan-all`.

**Situation-based docs:**
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec/test-case planning or TC mapping: `feature-docs-reference.md`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Make sure the **developer** — not just Claude — understands the work. **AI derives WHAT to explain from the user's prompt**, then teaches it mentor-style: restate-first, gap-fill, quiz. There are no fixed modes — the scope flexes to whatever the developer needs explained.

**Final Purpose:** Developer carries genuine, traced understanding of whatever matters right now — so AI accelerates the human without eroding their grasp of the codebase. Comprehension must be real, never forced — the moment this feels like a gate, its value collapses.

**Scope is prompt-driven — flexible for all cases:**

- **Default (bare `$understand`, no target named):** explain the **current working context** — the active tasks (the current task list) and the working-tree changes (`git diff`), plus any active plan or `$watzup` summary. "Here's what we're working on and what changed, and why."
- **Targeted (prompt names something):** explain exactly that — a plan, a change set/PR, a subsystem, a single design decision, a concept, a bug, "why X over Y". Read the prompt, derive the target, gather only that material.
- **Ambiguous:** one a direct user question to pick the target, then proceed.

**Key Rules (the productivity contract — read these first):**

- **DERIVE SCOPE FROM THE PROMPT.** What to explain is whatever the developer asked about; if they asked nothing specific, default to the current tasks + changes in context. Never force a fixed agenda.
- **OPT-IN, NEVER BLOCKS.** This skill never prevents implementation, commit, or workflow progress. Every run offers a one-keystroke skip. It is the one skill in this repo that deliberately does NOT hard-gate — comprehension you force is comprehension you fake.
- **THROTTLE BY CODING LEVEL.** Read `codingLevel` from `.claude/.ck.json` (or env `CK_CODING_LEVEL`). Level 4–5/disabled → skip or single one-liner. Level 2–3 → 1–2 surprise-gated questions. Level 0–1 → full incremental mentor. This dial is what keeps it from taxing senior developers.
- **ONLY EXPLAIN/QUIZ THE NON-OBVIOUS.** Focus on the highest-blast-radius, highest-future-change-cost, most-surprising parts of the resolved scope. Skip boilerplate, CRUD, and mechanical edits. Quizzing the obvious is what makes comprehension gates get reflexively skipped.
- **TEACH-BACK FIRST.** Ask the developer to explain in their own words BEFORE you explain. Active recall, then fill the gaps. Do not lecture first.
- **READ-ONLY on code & plans, and writes ONLY to a project-root temp folder.** This skill never edits source or plan files. Its only write target is the understanding ledger at `tmp/understand/{branch}.md` (see Step 3) — never in `.claude/`, the source tree, or any tracked path.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

---

# Understand — Prompt-Driven Comprehension Mentor

You are a wise, effective teacher. Goal: make the human deeply understand whatever they need to understand right now — incrementally, checking mastery of the current point before moving to the next. Cover high level (motivation, why it matters) and low level (business logic, edge cases). Inverse of every other skill here: those verify *Claude* did the work correctly; this verifies the *human* understands it.

## Step 0 — Resolve Scope & Throttle (do this first, cheaply)

1. **Derive the scope from the prompt.** Read what the developer actually asked and pick the target:

   | Prompt signal | Scope to explain |
   | ------------- | ---------------- |
   | Bare `$understand`, no target named | **Default: current working context** — active tasks (the current task list) + working-tree changes (`git diff --name-only` + untracked) + active plan / latest `$watzup` summary if present. |
   | Names a change set / PR / "what I just did" / "these changes" | The diff and its rationale. |
   | Names a plan / "the approach" / "before we build" | The active plan: problem, approach, rejected alternatives, risks, phase order. |
   | Names a subsystem / file / feature / "how does X work" | That code path — read the files, run a graph trace, explain the flow. |
   | Names a single decision / "why X over Y" | That decision and its trade-offs. |
   | Names a concept / bug / error | That concept or root cause. |
   | Ambiguous / multiple plausible targets | One a direct user question to choose, then proceed. |

   State the resolved scope in one line before continuing (e.g. `Explaining: current working changes (3 files) + active task #42`).

2. **Read the throttle.** Resolve coding level (first found wins): env `CK_CODING_LEVEL` → `.claude/.ck.json` `codingLevel` → default `3`.

   | Level | Name | `$understand` behavior |
   | ----- | ---- | ---------------------- |
   | 5 / -1 (disabled) | God Mode | **Skip by default.** Emit one line: `"Skipped comprehension check (coding-level 5). Reply $understand to walk through it."` Stop. |
   | 4 | Tech Lead | One question on the single highest-blast-radius decision, or skip if nothing non-obvious. |
   | 3 | Senior | 1–2 surprise-gated questions on trade-offs/blast radius. Mechanics assumed. |
   | 2 | Mid | 2–3 questions incl. one "why this design" + one edge case. |
   | 1 | Junior | Full teach-back → gap-fill → 2–3 quizzes. Explain WHY, not just HOW. |
   | 0 | ELI5 | Incremental, one concept at a time, won't proceed until the current point is mastered. Analogies, no jargon. |

3. **Offer the exit up front.** Unless level 0–1, state: `"Comprehension check on {resolved scope} (level {n}). Reply 'skip' to proceed without it."` If the user skips, record `skipped` in the ledger and end immediately — do not nag.

## Step 1 — Gather the Material

Gather **only** what the resolved scope needs:

- **Current working context (default):** the current task list for active tasks; `git diff --name-only` (+ untracked via `git ls-files --others --exclude-standard`) for the change set; the active plan and latest `$watzup` summary if they exist. Extract: what's being worked on, what changed, why, new behavior.
- **A plan:** read the plan files (`plan.md` + `phase-*.md` from the Plan Context / configured plans dir). Extract: problem, chosen approach, rejected alternatives, design decisions, risks, phase order.
- **A subsystem / feature / "how does X work":** read the relevant files; run `python .claude/scripts/code_graph trace <file> --direction both --json` to map the call/flow chain. Extract: entry points, data flow, key invariants.
- **A single decision / "why X over Y":** the relevant code + its rationale (comments, git blame, the plan's alternatives section).

Keep gathering proportional to scope — don't read the whole repo to explain one decision.

## Step 2 — Surprise-Gate the Topics (this is the productivity lever)

Do NOT quiz everything. Rank candidate topics within the resolved scope and keep only the non-obvious, high-leverage ones:

- **Blast radius:** run `$graph-blast-radius` (or `python .claude/scripts/code_graph trace <file> --direction both --json`) on the key files in scope. High upstream/downstream reach → high priority.
- **Future-change-cost:** decisions expensive to reverse later (schema, public contract, cross-service message, shared/framework layer).
- **Surprise:** anything a competent engineer would NOT guess from the task description — a non-obvious trade-off, a preserved edge case, a "we did X instead of the obvious Y because Z".

Select **N topics** where N is set by the level table in Step 0. Skip pure boilerplate, generated code, and mechanical renames. If nothing non-obvious survives the gate → record `nothing-non-obvious` and end (this is a feature, not a failure).

## Step 3 — Maintain the Understanding Ledger

Append (never overwrite) a running checklist with the Anthropic three groups to a ledger file. Makes the check **resumable** (skip now, finish later); doubles as a learning changelog.

> **[HARD RULE] Write the ledger ONLY to a project-root temp folder — NEVER inside `.claude/`, source tree, or any tracked path.** This skill must not generate any artifact anywhere else in the repo.
>
> Ledger path (relative to the project root, i.e. the folder that contains `.claude/`): `tmp/understand/{branch}.md` — use `temp/understand/{branch}.md` instead if the project already uses a `temp/` folder. Create the `understand/` subdir if absent. `{branch}` = current git branch with `/` replaced by `-`. Ensure the chosen `tmp/` (or `temp/`) folder is git-ignored.
>
> Example: `tmp/understand/{branch}.md`.
>
> **[ANNOUNCE — the chat is the deliverable]** The understanding lives in the **in-chat conversation**, not the file — the ledger is only a resumable log. Whenever you write or append it, state its path inline in chat (e.g. `Understanding ledger updated → tmp/understand/{branch}.md`) so the user is never unaware of a git-ignored artifact. NEVER let understanding exist only inside the temp file.

```markdown
## {YYYY-MM-DD HH:mm} — {resolved scope} — {short task name}

### Problem  (why this exists, prior limitation, the branches)
- [ ] {item}  — status: pending | understood | skipped

### Solution  (design, business logic, edge cases, why this over alternatives)
- [ ] {item}

### Impact  (what/who this changes, blast radius, follow-ups)
- [ ] {item}
```

## Step 4 — Teach-Back First (active recall)

Before explaining anything, ask the developer to restate the selected topics in their own words. One open prompt, e.g.:

> "Before we move on — in your own words: what problem does this change solve, and why this approach over {rejected alternative}?"

They may ask you to `eli5` / `eli14` / `elii` (explain like I'm an intern) instead — answer at that level, then re-ask the teach-back.

## Step 5 — Gap-Fill

Compare their explanation against ground truth (Step 1 material + `file:line` evidence). Then:

- Confirm what they got right (briefly).
- Fill only the gaps and correct misunderstandings — cite `file:line`.
- Offer a simpler example if a point didn't land.
- Drill into **why** (and the why behind the why) — understanding the problem well is imperative.

## Step 6 — Quiz with a direct user question

Ask the level-appropriate number of questions. Mix formats:

- Open-ended ("what breaks if we skip the entity event handler here?")
- Multiple choice (**shuffle the correct-answer position each time; do NOT reveal the answer until the question is submitted**)
- Debugging / code-review scenario ("here's a diff — what's wrong with it?") — show code or have them use the debugger when useful.

After submission, assess each answer: correct → mark the ledger item `understood`; wrong/partial → explain, then re-ask a variant (respecting the loop cap below).

## Step 7 — Loop & Close

- **Loop cap by level:** level 0 → loop until all selected items mastered; level 1 → up to 2 passes; level ≥2 → 1 pass, then mark remaining gaps as `open` and move on (never trap a senior).
- Update the ledger: each item → `understood` / `skipped` / `open`.
- Close with a 2–3 line recap of what's now confirmed understood and any `open` items the developer chose to defer.
- **Never block the next workflow step.** Comprehension state is advisory.

---

## When This Runs

- **In workflows (auto):** `$understand` is auto-inserted as the final comprehension checkpoint, right before `workflow-end` in code-producing workflows. With no target named there, it defaults to explaining the current changes — the natural end-of-workflow moment to confirm the developer understands what was built and why.
- **Manually, any time:** `$understand` (current context) or `$understand <whatever you want explained>` — a plan, a subsystem, a decision, a concept, a bug. Pairs well with voice mode for a natural mentor conversation.

**NOT for:** investigation/docs/design/research workflows where nothing was built or planned to understand; forcing comprehension as a hard gate; reviewing code quality (use `$code-review`, `$review-changes`).

## See Also

- **Skill:** `$coding-level` — sets the throttle (0–5) this skill reads.
- **Skill:** `$graph-blast-radius` — surprise-gating signal for Step 2.
- **Skill:** `$plan-validate` — elicits plan *decisions* (the complement: this elicits plan *understanding*).
- **Skill:** `$watzup` — produces the change summary used as the current-context primer.

---

**IMPORTANT MANDATORY Steps:** resolve-scope-and-throttle -> gather-material -> surprise-gate-topics -> maintain-ledger -> teach-back-first -> gap-fill -> quiz -> loop-and-close

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Final Purpose:** developer carries genuine, traced understanding of whatever matters right now — AI accelerates the human without eroding their grasp of the codebase. Comprehension must be real, never forced.

- **MUST ATTENTION** derive WHAT to explain from the prompt; with no target named, default to the current working tasks + changes in context. Never impose a fixed agenda.
- **MUST ATTENTION** this skill is OPT-IN and NEVER blocks — always offer a skip, never trap a senior, never gate commit/implementation.
- **MUST ATTENTION** throttle depth by `codingLevel` — God Mode skips, Junior gets the full mentor. — why: the dial is what keeps the check from taxing seniors.
- **MUST ATTENTION** explain/quiz only non-obvious, high-blast-radius topics within scope — surprise-gate via `$graph-blast-radius`. — why: quizzing the obvious is what makes gates get reflexively skipped.
- **MUST ATTENTION** teach-back FIRST (active recall), then gap-fill; cite `file:line` for every correction.
- **MUST ATTENTION** persist the problem/solution/impact checklist to the project-root temp folder (`tmp/understand/{branch}.md`) so the check is resumable — NEVER write any artifact inside `.claude/`, the source tree, or any tracked path.
- **MUST ATTENTION** the in-chat conversation is the deliverable — ALWAYS announce the ledger path inline when you write it (`Understanding ledger updated → tmp/understand/{branch}.md`). NEVER let understanding live only in a git-ignored file the user cannot see.

**Anti-Rationalization:**

| Evasion | Rebuttal |
| ------- | -------- |
| "Just explain everything I see" | Derive scope from the prompt first. With no target named, default to current tasks + changes — not a repo-wide lecture. |
| "Senior dev, skip the whole check" | Throttle already near-skips level 4–5. Don't drop the one surprise-gated question that catches the non-obvious trade-off. |
| "They obviously understand it" | Teach-back FIRST — assumed understanding is unverified understanding. Ask before concluding. |
| "Quiz everything to be safe" | Surprise-gate or it dies — quizzing the obvious trains developers to reflexively skip the gate. |
| "Just block until they pass" | This skill NEVER blocks. Forced comprehension is faked comprehension — always offer the skip. |
| "Drop the ledger next to the skill" | NEVER write inside `.claude/`, source, or tracked paths — only `tmp/understand/{branch}.md`. |
| "Write the doc and continue silently" | The chat is the deliverable. Engage the user inline and announce the ledger path — never log-and-move-on into a hidden git-ignored file. |

> **[IMPORTANT]** This skill verifies the human's understanding, not the code's correctness. Keep it light, kind, and skippable — its value collapses the moment it feels like a gate.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. If either file or a required reference doc is missing, stop immediately and ask the user to run the project-config and scan-all skills. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure unless the user explicitly invoked a workflow/skill and the local protocol treats explicit invocation as confirmation:
   - Question: "Which workflow do you want to activate?"
   - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
   - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.
## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**
1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
