---
name: deep-research
description: '[Research] Use when a workflow step or the user asks for deep research on the top sources surfaced by web-research. Fetches, extracts, cross-validates and builds the evidence base.'
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

> **[BLOCKING MUST ATTENTION]** Execute declared steps in order; NEVER skip, reorder, or merge without explicit user approval.
> **[BLOCKING MUST ATTENTION]** Update task tracking before/after each step or sub-skill: `in_progress` at start, `completed` at end.
> **[BLOCKING MUST ATTENTION]** Completed steps need brief evidence; skipped steps need explicit reason; if Task tools are unavailable, maintain an equivalent synchronized step tracker.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Deep-dive the prior source map into a cross-validated, source-cited evidence base (`.claude/tmp/_evidence-{slug}.md`) where every finding has source trace and confidence, discrepancies stay explicit, and no unverified single-source claim becomes fact.

**Summary:**

- **Purpose/input:** Consume prior `.claude/tmp/_sources-{slug}.md`; prioritize Tier 1-2, high-relevance, gap-covering sources; NEVER start a fresh search.
- **Ordered path:** (1) load/prioritize source map → (2) fetch 5-8 sources with `WebFetch` (hard cap 8) → (3) extract claims, data, quotes, methodology, publication date, author credentials, source type → (4) cross-validate → (5) write evidence base.
- **Confidence gate:** 2+ independent sources agree = high confidence; disagreement = both positions + discrepancy; one source = `single source, unverified`; declare 95/80/60/<60% for every finding.
- **Handoff/routes:** Write `.claude/tmp/_evidence-{slug}.md` with inline citations, `## Unresolved Discrepancies`, and `## Gaps Remaining`; standalone runs use ask the user directly for workflow/direct routing and post-completion choices.

**Workflow:**

1. **Read source map** — Load `.claude/tmp/_sources-{slug}.md`; prioritize Tier 1-2, high relevance, and gap coverage.
2. **Fetch top sources** — Run `WebFetch` for prioritized URLs; maximum 8 calls.
3. **Extract findings** — Capture claims, data points, quotes, methodology, publication date, author credentials, and source type.
4. **Cross-validate** — Compare findings; distinguish agreement, discrepancy, and unique-source claims; assign confidence.
5. **Build evidence base** — Write structured findings, citations, confidence, discrepancies, and gaps to the output path.

**Key Rules:**

- **MUST ATTENTION** Maximum 8 `WebFetch` calls per invocation; prioritize Tier 1-2 sources covering gaps.
- **MUST ATTENTION** Every finding cites a specific source and confidence percentage; factual claims need 2+ independent sources.
- **MUST ATTENTION** Conflicting claims → present both + flag discrepancy; one source → `single source, unverified`.
- **MUST ATTENTION** Output the intermediate evidence base, not final synthesis; preserve discrepancy and gap sections.

**Critical thinking:** Be skeptical; apply critical/sequential thinking; trace every claim and state confidence (>80% to act).

# Deep Research

## Knowledge Work Rules

> **Web Research Protocol** — Factual claims require 2+ independent sources. Rank sources Tier 1 (authoritative `.gov`/`.edu`/official docs) > Tier 2 (industry reports) > Tier 3 (credible blogs, cross-validated); Tier 4 is unverified and NEVER cite it as fact. Declare 95/80/60/<60% confidence; working files → `.claude/tmp/`, final output → `docs/knowledge/`.
>
> **MUST ATTENTION READ** `.claude/skills/web-research/SKILL.md` for canonical research rules.

## Step 1: Load Source Map

Read `.claude/tmp/_sources-{slug}.md` (web-research output). If missing or invalid, report missing input; NEVER start a fresh search.

Prioritize: (1) Tier 1-2; (2) high relevance; (3) identified gap coverage.

## Step 2: Fetch Top Sources

For each prioritized source (5-8 when available; maximum 8 total):

1. Run `WebFetch` with its URL
2. Extract key claims, data points, quotes, and methodology
3. Record publication date, author credentials, and source type

## Step 3: Extract Findings

For each fetched source, extract:

- **Key claims** — factual statements with specific data
- **Data points** — numbers, percentages, dates
- **Quotes** — notable expert statements
- **Methodology** — how data was gathered (for market reports)

## Step 4: Cross-Validate

Compare findings across sources:

- **Agreement** — 2+ independent sources agree → high confidence
- **Discrepancy** — sources disagree → record both positions + flag discrepancy
- **Unique** — one source only → mark `single source, unverified`; do not present as fact

## Step 5: Build Evidence Base

Write findings incrementally to `.claude/tmp/_evidence-{slug}.md`:

```markdown
# Evidence Base: {Topic}

**Date:** {date}
**Sources analyzed:** {count}

## Findings

### Finding 1: {Title}

**Confidence:** {95%|80%|60%|<60%}
**Sources:** [1], [3]
**Content:** {finding with inline citations}
**Cross-validation:** {agreement/discrepancy notes}

## Unresolved Discrepancies

- {claim X from source A vs claim Y from source B}

## Gaps Remaining

- {what couldn't be verified}
```

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If not already in a workflow, use ask the user directly; the user chooses:
>
> 1. **Activate `workflow-research` workflow** (Recommended) — web-research → deep-research → synthesis → review
> 2. **Execute `$deep-research` directly** — run standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** After completion, use ask the user directly to offer:

- **"$market-analysis (Recommended)"** — Size the market (TAM/SAM/SOM), competitors, trends, SWOT, segments — the producer `$business-evaluation` consumes
- **"$business-evaluation"** — Evaluate business viability. **Run `$market-analysis` first** — this skill consumes its sized-market output as evidence and MUST NOT re-derive market sizing. Without it, every market figure must be marked N/A.
- **"$knowledge-synthesis"** — If synthesizing research report
- **"Skip, continue manually"** — user decides

> **External Memory:** For complex/lengthy research, analysis, scans, or reviews, write intermediate findings + final results to `tmp/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence plus confidence percentage (>80% to act, <80% verify first).

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

**IMPORTANT MUST ATTENTION Goal:** Deep-dive the prior source map into a cross-validated, source-cited evidence base (`.claude/tmp/_evidence-{slug}.md`) where every finding has source trace and confidence, discrepancies stay explicit, and no unverified single-source claim becomes fact.

**IMPORTANT MUST ATTENTION Main path:** Run all 5 steps in order: (1) load/prioritize source map → (2) fetch 5-8 prioritized sources, maximum 8 `WebFetch` calls → (3) extract claims, data, quotes, methodology, publication date, author credentials, source type → (4) cross-validate → (5) write the evidence base incrementally.
**IMPORTANT MUST ATTENTION Route gates:** Before standalone execution, use ask the user directly to choose `workflow-research` or `$deep-research`; after completion, offer `$market-analysis`, `$business-evaluation` (after `$market-analysis`), `$knowledge-synthesis`, or manual continuation.
**IMPORTANT MUST ATTENTION Evidence gate:** Every finding cites a source number and confidence; 2+ independent sources support factual claims; disagreements show both positions; one source is `single source, unverified`.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced proof per claim, confidence >80% to act, NEVER guess-as-fact.

**IMPORTANT MUST ATTENTION** Cross-validation drives confidence: 2+ independent sources agree → high (95/80%); disagreement → both positions + discrepancy; one source → `single source, unverified`; `<60%` → say `insufficient evidence, verified: … / not verified: …` — NEVER collapse conflicts.
**IMPORTANT MUST ATTENTION** Cap `WebFetch` at 8 calls; spend them on Tier 1-2 authoritative sources covering gaps; NEVER cite Tier 4 as fact.
**IMPORTANT MUST ATTENTION** This deep-dive consumes the prior `.claude/tmp/_sources-{slug}.md` map; NEVER start a fresh search.
**IMPORTANT MUST ATTENTION** Capture publication date, author credentials, source type, and methodology per source; verify facts, quotes, and numbers against fetched sources before recording — NEVER fabricate citations.
**IMPORTANT MUST ATTENTION** Deliverable MUST include `## Unresolved Discrepancies` and `## Gaps Remaining`; NEVER hide unverifiable content.
**IMPORTANT MUST ATTENTION** Break work into task tracking todos BEFORE starting; keep one `in_progress`; add a final review todo checking citation and confidence coverage.
**IMPORTANT MUST ATTENTION** Write findings incrementally to `.claude/tmp/_evidence-{slug}.md`; NEVER hold the full evidence base only in context.
**IMPORTANT MUST ATTENTION** Validate standalone/workflow routing with ask the user directly; never auto-decide the route.

**Anti-Rationalization:**

| Evasion                                      | Rebuttal                                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| "One good source is enough"                  | A lone source is "single source, unverified" — never high confidence. Cross-validate.      |
| "The sources roughly agree, call it settled" | Roughly ≠ exactly. Record the discrepancy with both positions; don't smooth it over.       |
| "I remember this stat from the page"         | Re-open the fetched source and verify the number/quote before citing. Memory hallucinates. |
| "I'll fetch a few more to be thorough"       | 8-call cap is the budget. Prioritize Tier 1-2 gap-coverage, not breadth.                    |
| "I'll write the evidence base at the end"    | Persist findings incrementally to `_evidence-{slug}.md` — a context cutoff loses batched work. |

**IMPORTANT MUST ATTENTION** Every finding cites a source + confidence (95/80/60/<60%); conflicts show both positions, lone source is `unverified`.
**IMPORTANT MUST ATTENTION** Cap `WebFetch` at 8 Tier 1-2 calls and persist the evidence base incrementally to `.claude/tmp/_evidence-{slug}.md`.
**IMPORTANT MUST ATTENTION** Surface `## Unresolved Discrepancies` and `## Gaps Remaining`; never hide unverifiable content.

**IMPORTANT MUST ATTENTION** Follow ordered path: load/prioritize → fetch ≤8 → extract metadata → cross-validate → write required evidence sections; honor standalone route and post-completion user choices.
**IMPORTANT MUST ATTENTION** Cite every finding and confidence-score it; preserve disagreements and gaps; NEVER fabricate or present a lone source as fact.
**IMPORTANT MUST ATTENTION** Use the prior source map, cap `WebFetch` at 8, and persist output incrementally.

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
