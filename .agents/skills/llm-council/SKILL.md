---
name: llm-council
description: '[Decision Support] Use when pressure-testing an irreversible, high-stakes decision with adversarial AI advisors.'
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

> **[IMPORTANT]** MUST ATTENTION use council only for multi-option, hard-to-reverse, high-stakes decisions. NEVER council trivial, factual, reversible, or single-option questions.
> **[IMPORTANT]** MUST ATTENTION spawn 5 advisors in parallel, then 5 fresh peer reviewers in parallel, then chairman synthesis.
> **[IMPORTANT]** MUST ATTENTION require evidence for code/architecture claims: `file:line`, graph trace, or explicit "insufficient evidence."

# LLM Council

## Quick Summary

**Goal:** Adversarial decision support for costly wrong choices. Five advisors analyze independently, five fresh reviewers critique anonymously, chairman produces final verdict + report artifacts.

**Workflow:** Gate → Frame → 5 parallel advisors → anonymized 5-reviewer peer review → chairman synthesis → paired HTML/MD reports.

**Key Rules:**

- MUST ATTENTION use cheaper ladder first: `$why-review` → `$plan-validate` → `$llm-council`.
- MUST ATTENTION graph-trace code/architecture questions when `.code-graph/graph.db` exists.
- NEVER let earlier advisor responses bleed into later advisors; parallel spawn required.
- ALWAYS mark verdict degraded if fewer than 5 usable advisor responses return.
- ALWAYS regenerate mirrors with `$sync-codex` after editing this skill — NEVER hand-edit `.agents/` or `.codex/` (they are generated artifacts).

---

## Phase 0: Council Gate

Run before advisors.

| Gate              | Required                                                                 | Route if false                          |
| ----------------- | ------------------------------------------------------------------------ | --------------------------------------- |
| Multi-option      | >=2 viable paths                                                         | Single-option rationale → `$why-review` |
| Hard to reverse   | Architecture, stack, pricing, hiring, irreversible refactor              | Reversible choice → answer directly     |
| Real stakes       | Wrong call costs >=1 week, money, trust, or strategic position           | Low stakes → answer directly            |
| Multi-angle value | Contrarian/first-principles/upside/outside/execution views change answer | Factual/single-domain → answer directly |

If any gate fails, state failed gate + lighter route. NEVER council "should I use markdown."

Good prompts: pricing model, positioning angle, pivot, hiring vs automation, architecture bet, high-risk launch, irreversible refactor.
Bad prompts: factual lookup, simple yes/no, content generation, summarization, bugfix, package upgrade, routine refactor, anything decidable with one grep.

---

## Advisor Dimensions

Each advisor = thinking dimension, not persona costume. One strong angle each.

| Advisor                  | Think                                                           |
| ------------------------ | --------------------------------------------------------------- |
| Contrarian               | What fails? What assumption kills plan?                         |
| First Principles Thinker | What problem are we solving? Which assumptions need rebuild?    |
| Expansionist             | What upside, adjacent opportunity, undervalued path is missing? |
| Outsider                 | What confuses someone with no context? What jargon hides value? |
| Executor                 | What can happen Monday morning? Fastest validated path?         |

Tensions: Contrarian vs Expansionist, First Principles vs Executor, Outsider grounds both.

---

## Step 1: Frame Question

When user says "council this", enrich then frame.

**Context discovery budget:** <=30 seconds; read 2-3 high-signal files.

**Search order:** `CLAUDE.md` / `AGENTS.md`; `docs/project-config.json`; `docs/project-reference/project-structure-reference.md`; matching `docs/project-reference/*{domain-entities,backend-patterns,frontend-patterns,code-review-rules}*`; `docs/specs/`; `memory/`; user-referenced files; `tmp/reports/council-*`; domain data (pricing -> revenue, architecture -> service map, tech stack -> dependencies).

**Code/architecture gate:** If question references existing code, services, files, or blast radius, run before framing:

```bash
python .claude/scripts/code_graph trace <key-file> --direction both --json
```

Skip graph only when `.code-graph/graph.db` missing or question is non-code.

**Framed question includes:** core decision, user context, workspace evidence, stakes, constraints, known unknowns. Keep the framing neutral and opinion-free. Ask exactly one clarifying question only if prompt is too vague.

---

## Step 2: Advisor Round

Spawn all 5 advisors simultaneously. Each gets identity, framed question, evidence rules, output constraints.

```text
You are [Advisor Name] on an LLM Council.
Thinking style: [advisor dimension from table]

Question:
---
[framed question]
---

EVIDENCE RULES:
- Code/architecture claims require `file:line`, graph trace, or "I don't have enough evidence yet."
- If existing code context is needed, run:
  python .claude/scripts/code_graph trace <file> --direction both --json
  python .claude/scripts/code_graph connections <file> --json
- Cite trace output for blast radius, callers, downstream impact.
- Confidence: 95-100% full trace | 80-94% main paths | 60-79% partial | <60% do not recommend.
- Do NOT speculate. Name missing evidence instead.

Respond from assigned angle. Direct, specific, unbalanced by design. Other advisors cover other angles.
Length: 150-300 words plus one-line confidence declaration. No preamble.
```

---

## Step 3: Peer Review Round

Collect responses. Randomize/anonymize as Response A-E. Spawn 5 fresh reviewers in parallel.

```text
You are reviewing an LLM Council.

Question:
---
[framed question]
---

Anonymized responses:
**Response A:** [response]
**Response B:** [response]
**Response C:** [response]
**Response D:** [response]
**Response E:** [response]

Answer:
1. Strongest response? Why?
2. Biggest blind spot? What is missing?
3. What did all five miss?

Reference responses by letter. Be specific. Under 200 words.
```

---

## Step 4: Chairman Synthesis

Chairman receives original question, framed question, de-anonymized advisor responses, peer reviews, anonymization map.

```text
You are Chairman of an LLM Council. Synthesize 5 advisors + peer reviews into final verdict.

Question:
---
[framed question]
---

ADVISOR RESPONSES:
**Contrarian:** [response]
**First Principles Thinker:** [response]
**Expansionist:** [response]
**Outsider:** [response]
**Executor:** [response]

PEER REVIEWS:
[all peer reviews]

Produce exact structure:
## Where the Council Agrees
[Independent convergences; high-confidence signals.]
## Where the Council Clashes
[Genuine disagreements. Present both sides; explain why reasonable advisors disagree.]
## Blind Spots the Council Caught
[Only emerged through peer review.]
## The Recommendation
[Clear direct recommendation. Not "it depends."]
## The One Thing to Do First
[Single concrete next step.]

Be direct. Do not hedge. Give clarity unavailable from one perspective.
```

**Quality loop:** If chairman misses required sections, ignores degraded-quality state, or makes unsupported code claims, repair with fresh chairman prompt. Max 3 repair rounds; then escalate with missing evidence.

---

## Step 5: Report Artifacts

Write both files; create `tmp/reports/` if missing.

```text
tmp/reports/council-{YYMMDD-HHMM}-{kebab-slug}.html
tmp/reports/council-{YYMMDD-HHMM}-{kebab-slug}.md
```

`{YYMMDD-HHMM}` = session datetime. `{kebab-slug}` = 3-6 word question descriptor. Both share prefix. NEVER write artifacts to workspace root or `docs/`.

**HTML:** self-contained inline CSS, question top, prominent chairman verdict, agreement/disagreement visual, collapsed advisor responses, collapsed peer review highlights, footer timestamp/topic, professional briefing style, open after generation.

**Markdown transcript:** original question, framed question, all advisor responses, all peer reviews, anonymization mapping, chairman synthesis.

---

## Output Format

```text
Council complete.

Report: tmp/reports/council-{YYMMDD-HHMM}-{kebab-slug}.html
Transcript: tmp/reports/council-{YYMMDD-HHMM}-{kebab-slug}.md

Verdict: [1-2 sentence chairman recommendation]
First action: [single next step]
```

---

## Workflow Integration

Opt-in escalation hook from host skills. NEVER wire into `workflow-bugfix`, `workflow-refactor`, or `test-*` workflows. Blacklist is enforced at the `why-review` gate (Step A — workflow context check) before the 8-OR frontmatter gate evaluates.

| Host skill                       | Mode                                       | Default                  | Gate                                                             |
| -------------------------------- | ------------------------------------------ | ------------------------ | ---------------------------------------------------------------- |
| `architecture-design`            | Always-offer after `## Next Steps`         | Skip                     | User chooses                                                     |
| `tech-stack-research`            | Always-offer after `## Next Steps`         | Skip                     | User chooses                                                     |
| `domain-analysis`                | Always-offer after `## Next Steps`         | Skip                     | User chooses                                                     |
| `why-review`                     | Conditional on active plan/PBI frontmatter | Escalate when gate fires | Step A workflow blacklist suppression THEN 8-OR frontmatter gate |
| `prioritize`                     | Conditional on ranking output              | Escalate when gate fires | RICE top-2 within 15%, MoSCoW tie, or stakeholder disagreement   |

### `why-review` Gate Schema

Gate fires when ANY field true. Absent fields default no-fire; gate opt-in via frontmatter, never opt-out.

| Field                  | Convention                             | Fires when                                  |
| ---------------------- | -------------------------------------- | ------------------------------------------- |
| `cross_service_impact` | `NONE` / `PARTIAL` / `FULL`            | value != `NONE`                             |
| `breaking_changes`     | bool                                   | true                                        |
| `complexity`           | `low` / `medium` / `high` / `critical` | `high`, `critical`, or `story_points >= 13` |
| `new_framework`        | bool                                   | true                                        |
| `irreversible`         | bool                                   | true                                        |
| `security_critical`    | bool                                   | true                                        |
| `performance_critical` | bool                                   | true                                        |
| `cost_high`            | bool                                   | true                                        |

Host prompt copy MUST cite cheaper rungs: `$why-review`, `$plan-validate`, `$llm-council`.

---

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** use council only for multi-option, hard-to-reverse, high-stakes decisions.

**Protocols in force — MUST ATTENTION (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** apply critical + sequential thinking; traced `file:line` proof, confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** spawn 5 advisors in parallel, then 5 fresh peer reviewers in parallel, then chairman synthesis.
**IMPORTANT MUST ATTENTION** require evidence for code/architecture claims: `file:line`, graph trace, or explicit "insufficient evidence."
**IMPORTANT MUST ATTENTION** mark verdict degraded if fewer than 5 usable advisor responses return.
**IMPORTANT MUST ATTENTION** write paired HTML + Markdown artifacts under `tmp/reports/` and open HTML.
**IMPORTANT MUST ATTENTION** after editing this skill, run `$sync-codex` to regenerate mirrors — NEVER hand-edit `.agents/` or `.codex/` (generated).

**Anti-Rationalization:**

| Evasion                         | Rebuttal                                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| "This decision feels important" | Gate it: multi-option, hard-to-reverse, real stakes, multi-angle value.                                  |
| "One advisor can handle it"     | Council value comes from independent angles + anonymous peer review.                                     |
| "Sequential spawn is simpler"   | Sequential spawn contaminates independence. Parallel spawn required.                                     |
| "Four advisors is close enough" | Missing angle changes verdict quality. Mark degraded.                                                    |
| "Evidence would slow us down"   | Unsupported code/architecture claims are speculation. Use graph/file proof or say insufficient evidence. |
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

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
