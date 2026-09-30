---
name: plan-review
description: '[Planning] Use when a workflow step or the user asks for a plan review. Performs one evidence-backed review pass and returns a verdict; maximum one review round per invocation.'
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

**Goal:** Decide in one review pass whether a plan gives an executor sound direction, bounded discovery, complete affected-area coverage, and credible final quality gates without pre-writing the implementation.

**Summary:**

- **ONE ROUND MAXIMUM per invocation.** Review once, report once, stop. Never fix the plan, start a re-review, or loop through findings.
- Review the whole plan at decision-and-boundary altitude: intent, important decisions, owners/areas, dependencies, discovery obligations, risks, spec/test/code sync, and final proof.
- Use conditional specialist lenses inside the single pass only when their risk warrants the context cost. An AI-feature plan retains the AI-engineering lens; UI, security, data/domain, integration-test, and architecture lenses remain evidence-triggered.
- Findings are validated and deduplicated before the verdict, but validation is not a second review round.

**Workflow:** Resolve plan and scope → load governing evidence → run one core pass plus warranted lenses → validate/deduplicate findings → emit report and verdict → stop.

**Key Rules:**

- Maximum one review round per invocation; a caller may revise and explicitly invoke the skill again as a new run.
- Read-only on plan/source/spec artifacts. Write only the review report under `tmp/reports/`.
- Do not manufacture work: a clean plan passes; missing evidence is `NOT VERIFIABLE`, not a speculative finding.

## One-Round Contract

`round = 1`, `maxRounds = 1`, `minRounds = 1`.

- The single round includes reading, core review, any parallel specialist lenses, finding validation, deduplication, scoring, and verdict.
- It does **not** include editing `plan.md`, applying fixes, asking another reviewer to re-read fixed content, or starting round 2.
- When findings survive validation, return `CHANGES_REQUESTED` with owner and evidence. The plan author/caller owns revision. Another review requires a new explicit invocation and a new report.
- A missing required artifact, unresolved material user decision, or evidence gap that prevents judgment returns `BLOCKED` or `NOT_VERIFIABLE`; never consume another round trying to manufacture certainty.
- Test execution is outside this skill. Review whether the plan schedules verify-last correctly; do not run suites.

## Scope and Evidence

1. Resolve and read the active Goal Contract per `SYNC:goal-contract-satisfaction-loop`, then resolve the target `plan.md`, any phase files it intentionally uses, its spec owner, and the configured project references.
2. Read current plan artifacts and cited evidence. For code-bearing plans, spot-check the key owners/consumers and representative patterns; use the graph when present.
3. Establish the requested change and non-goals. If a supplied spec baseline exists, review against that baseline and separate proposed additions.
4. Create `tmp/reports/plan-review-{YYMMDD}-{HHmm}-{slug}.md` before recording findings.

## Single Review Pass

### Core review

Judge each dimension `PASS`, `FAIL`, `N/A`, or `NOT VERIFIABLE` with evidence:

| Dimension | Review question |
| --- | --- |
| Intent and scope | Is the outcome governed by a clear owner/spec, with non-goals and no silent expansion? |
| Technical decisions | Are material choices, rationale, alternatives, trade-offs, reversibility, and owners explicit? |
| Areas and consumers | Are modules, contracts, state/data, tests, specs/docs, mirrors, and downstream consumers covered where applicable? |
| Dependency order | Do phases reflect real dependencies or disjoint ownership rather than ceremony? |
| Executor discovery | Are unknowns bounded by source/owner, purpose, and stop condition instead of hidden or pre-solved? |
| Plan altitude | Is the plan actionable without becoming method-by-method implementation replay? |
| Failure and compatibility | Are rollback, migration, security/data/platform, error paths, and compatibility concerns covered where material? |
| Spec/test/code drift | Does the plan preserve intent/cases before build and reconcile actual tests/code/spec evidence before completion? |
| Verify-last | Are tests authored with implementation and executed only after all implementation and static review? |
| Future change cost | Is there one owner per rule, bounded growth, and a named test for each protected invariant without speculative abstraction? |

### Conditional lenses

Use a lens only when evidence triggers it. Run warranted independent lenses in one parallel wave with an all-return barrier; otherwise review inline.

- **AI feature:** invoke or apply `ai-engineering-review --report-only` over the plan's model/tool/retrieval/eval/guardrail/operations decisions. This preserves the existing AI-feature review lane.
- **User-facing UI:** apply journey, design-system, accessibility, state, and container-fit plan checks.
- **Domain/data/security/public contract:** inspect the owning specialist rules and surface material unresolved decisions.
- **Integration/E2E:** verify case ownership, observable outcomes, fidelity, isolation, and final execution evidence; do not prescribe runner mechanics without project evidence.
- **Architecture/performance:** use only for cross-boundary, irreversible, scale, or SLA decisions.

Sub-agents are optional, not a quality signal. Use them only when independent risk lenses clearly outweigh their context load. Every lens is part of round 1, never a new round.

### Finding validation and verdict

1. Deduplicate by root cause and owning location.
2. For every potential finding, confirm reachable consequence, evidence, confidence, and normalized severity. Validate findings with `$why-review --validate-findings <report-path>`; this terminal adjudication belongs to the same pass and never edits the plan or opens another review round.
3. Ask the three trade-off questions for plan decisions and for each recommendation. Hand material unconfirmed trade-offs to the caller/user as blocking questions.
4. Verdict:
   - `PASS` — no validated blocking finding, unresolved required evidence, or failed required Goal Contract criterion.
   - `PASS_WITH_NOTES` — only evidence-backed LOW observations that do not require plan changes.
   - `CHANGES_REQUESTED` — one or more validated findings require revision.
   - `BLOCKED` — required intent/evidence/user decision is unavailable.
5. Stop. Do not apply fixes or re-review.

## Report Shape

```markdown
# Plan Review — {plan}

## Verdict
PASS | PASS_WITH_NOTES | CHANGES_REQUESTED | BLOCKED
Review rounds: 1/1

## Scope and Evidence
- Plan artifacts reviewed
- Governing spec/decision/reference sources
- Code/graph evidence spot-checked

## Dimension Results
| dimension | status | evidence | note |

## Findings
### [SEVERITY] Short title
- Location/evidence:
- Reachable consequence:
- Why it matters to execution:
- Recommended plan-level correction:
- Confidence:

## Trade-Off Assessment
| decision | sacrifice | gain | who pays/when | worth it | material | confirmed |

## Coverage and Limits
- Conditional lenses run or N/A with evidence
- Unverified evidence and owner

## Goal Satisfaction
| Success Criterion | Evidence | Status |
| --- | --- | --- |

## Handoff
- Plan author/caller owns revisions.
- This invocation is complete; no automatic second round.
```

Inside a workflow, return the report path and verdict to the parent without a next-step prompt. Standalone, report the same result; the user decides whether to revise or invoke another review.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-engineering-gate` — Thirty-eight AI-engineering clauses, AE-1.1 to AE-9.4: prompt contract, security, agents, retrieval, reliability, evals, operations, governance, UX; planning, building or reviewing a feature that calls a model → .claude/skills/shared/protocols/ai-engineering-gate.md
- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `category-review-thinking` — Derive review concerns per category of changed files from domain knowledge; reviewing a changeset that spans several file categories → .claude/skills/shared/protocols/category-review-thinking.md
- `core-engineering-principles` — Core quality gate: easy to change, easy to scale, easy to maintain, judged by future change cost; planning, implementing or reviewing any change → .claude/skills/shared/protocols/core-engineering-principles.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `graph-assisted-investigation` — Run a code-graph command on the key files before concluding; investigating code while the code graph exists → .claude/skills/shared/protocols/graph-assisted-investigation.md
- `goal-contract-satisfaction-loop` — Save the goal in a file and loop until every saved criterion passes; executing work against a user goal → .claude/skills/shared/protocols/goal-contract-satisfaction-loop.md
- `plan-granularity` — Outcome phases name decisions, boundaries and bounded discovery without replaying implementation; breaking a plan into phases → .claude/skills/shared/protocols/plan-granularity.md
- `plan-quality` — Plans decide direction, affected owners, risks and final proof without pre-writing implementation; writing or reviewing a plan → .claude/skills/shared/protocols/plan-quality.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `trade-off-interrogation-gate` — Three trade-off questions before any verdict, score or recommendation; rendering a verdict or recommending an option → .claude/skills/shared/protocols/trade-off-interrogation-gate.md
- `verify-last-order` — Build all phases and write tests, review statically, then verify once with a mutation check; planning or running any code-changing task → .claude/skills/shared/protocols/verify-last-order.md

<!-- PROTOCOL-GUIDES:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Complete one evidence-backed plan review pass that improves execution confidence without becoming another implementation or review loop.

- **MUST ATTENTION** maximum one review round per invocation: review → validate/deduplicate → verdict → stop.
- **MUST ATTENTION** resolve the active Goal Contract and emit its Goal Satisfaction matrix before a PASS verdict.
- **MUST ATTENTION** never edit the plan, fix findings, or start a fresh re-review inside this skill.
- **MUST ATTENTION** judge intent, decisions, areas/consumers, bounded discovery, risks, drift control, and verify-last order at plan altitude.
- **MUST ATTENTION** keep the AI-engineering lens when AI-feature evidence triggers it; all other specialist lenses remain evidence-triggered and part of the same single pass.
- **MUST ATTENTION** inside workflows return the verdict/report path without a next-step prompt.

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
2. Generality test: does it apply to ≥3 contexts (codebases for a universal lesson, everyday tasks here for a project convention)? If not, abstract one level up.
3. Write as a durable rule — a universal lesson strips project-specific names/paths/classes; a project convention states the convention itself, never this session's incident.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Value gate:** is it a project convention or a universal best-practice protocol worth reading on everyday work? Rare AI-agent quirks, one-off incidents and details of the current task → No → skip `$learn`.
6. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
7. **Auto-fix gate:** "Could `$code-quality-review`/`$code-simplifier`/`$security-audit`/a linter catch this?" — Yes → improve review skill instead.
8. ALL three gates pass → ask user to run `$learn`.
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.
**Core engineering principles:** Every plan, implementation and review must lower future change cost. **Easy to change** — reuse before writing, one owner per rule, purpose-named interfaces/adapters at volatile boundaries. **Easy to scale** — extend by addition with bounded growth, sized to the project's real profile. **Easy to maintain** — intent-named tests that fail when a behavior breaks, mechanical harness green. Before done, answer: next change → how many edit sites? 10× → what breaks? which test goes red? (`SYNC:core-engineering-principles`).
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
