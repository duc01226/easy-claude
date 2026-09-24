<!-- CK:UNIVERSAL-GUIDES v7 -->

<!-- CK:WORKFLOW-GATE -->

> **[WORKFLOW-GATE] — routing is your FIRST action; only a quick read-only look may precede it.**
>
> Honor an explicit skill/workflow request first. Otherwise assess, auto-select and proceed; never ask the user to choose the execution path — the declared route is the user's override point.
>
> **Mid-session: never auto-activate a workflow.** Auto-activation applies only to the first task of a session (its first user prompt; compaction or resume does not reset it). Once work is under way (follow-up, correction, next step, or a new ask), do it directly or with the best-fit skill or a lean chain of at most 3 skills; required gates (root-cause investigation for a bug, test, review, spec/doc sync, and any other required quality gate) still run and do not count toward that cap, and continuing a workflow already running is not activating one. An explicit workflow request always runs, mid-session included — a `/workflow-*` or `/start-workflow <id>` call, or the user asking in words to use a workflow; follow it.
>
> **Assess (brief, from the prompt plus that quick look):** scope · change type (answer, tweak, behavior, public contract) · risk (irreversible, data, security, cross-module) · ambiguity · artifacts actually needed. Escalate on risk and ambiguity, not file count alone.
>
> | Signals | Route |
> | --- | --- |
> | Question, lookup, or trivial low-risk edit; one skill covers it | direct: plain answer or that one skill |
> | Focused change (one module/policy, clear intent, no public-contract change) | custom-simple: only the canonical steps it needs, in dependency order |
> | Non-trivial bug/regression/stale output, cause unknown or wide reach | `workflow-bugfix` |
> | Non-trivial feature/enhancement changing behavior or a contract across modules | `workflow-feature` (`workflow-big-feature` if large/ambiguous/research-heavy) |
> | Product vision, greenfield or release-scoped idea | owning idea/feature workflow; apply shared `isLargeIdea` and embed decomposition in its artifacts |
> | Explicit roadmap/update/milestone-selection request | `product-roadmap`; the only writer of the product-roadmap artifact (default `docs/product-roadmap.md`; `docsRoots.productRoadmap.path` in `docs/project-config.json` overrides) |
> | Milestone/large-idea scope needing adversarial failure/replay/state/ownership/recovery/evidence analysis | conditional `scenario` before planning; no roadmap artifact |
> | Other matching skill/workflow Use clause | that skill/workflow, verified from its canonical definition |
>
> **Catalog fit:** the table route is the default. Keep a catalog workflow when >80% of its unconditional steps would do real work; otherwise downgrade to custom-simple, trimming only steps that would do no real work. A behavior change keeps its test and review steps; a downgraded route also keeps root-cause investigation for bugs and spec/doc sync when behavior or a public contract changes. Re-declare if evidence changes the complexity.
>
> Declare `Route: {workflow-id | skill | custom-simple [step → step] | direct} — because {key signals}` (e.g. `Route: custom-simple [investigate → fix → test → changes-review] — because known cause, one module`), then ACTIVATE before edits, agents or commands. Workflow: invoke `start-workflow` with its id; map its canonical sequence to tasks 1:1. Skill: read and execute its SKILL.md. Custom/direct: one task per step plus a final review. Missing tools/details: stop and report; never fabricate invocation.
>
> New foundations in `workflow-greenfield-init`/`workflow-big-feature` require an `architecture-review-full` reviewed scaffold, golden-path examples and project references BEFORE feature fan-out. Routing preserves operation authority, user data and all required quality gates.

<!-- /CK:WORKFLOW-GATE -->

<!-- prettier-ignore-start -->

<!-- CK:CRITICAL-THINKING -->

**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.
**Judgement integrity:** For theory checks, judgements, evaluations and gap hunts, the prompt's premise is a hypothesis — test it AND its opposite with one evidence bar (web-verify external facts), why-review the draft as an inline self-check (run the `why-review` skill only for a formal review/audit/gap-hunt deliverable or a MEDIUM+/consequential issue the inline pass cannot settle), never invent findings or manufacture disagreement ("no material issues" is a valid verdict); end with a `Bias check:` line (`SYNC:judgement-integrity`).

<!-- /CK:CRITICAL-THINKING -->

<!-- prettier-ignore-end -->

<!-- prettier-ignore-start -->

<!-- CK:AI-MISTAKE-PREVENTION -->

## Common AI Mistake Prevention (System Lessons)

- **Resolve project applicability before using framework examples.** Read the project config and relevant references, then inspect local evidence; honor explicit N/A and never impose a language, framework, architecture layer, styling method, tool, or runtime surface the project does not use.
- **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
- **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
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
- **Ownership before action.** When investigating a failure, ask which part owns the behavior before changing anything. Trace the wrong state to the component responsible for its invariant, then make one authoritative correction there.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec if one exists (the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, and state). Verify each against evidence, not intuition. Ask "what would falsify this?" — if nothing, it is not a hypothesis. The most expensive failure is going deeper into an assumed area while the real issue sits in an unexamined condition.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem; avoid unrelated cleanup. For review or enhancement work, announce improvements beyond the main request rather than silently expanding scope. Ask: "Would this change exist if I were not addressing this request?" — if not, remove it or disclose it.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Judge the environment before judging the code — a competing hypothesis, not a fallback.** A bug, failed test, error, or odd output is NOT proof of a code defect. Before deep tracing and before any verdict, sweep environment preconditions (toolchain/dependency/lockfile state, stale build or cache artifacts, env vars and config profile, service dependencies up-migrated-seeded, ports/network/clock, OS-path/locale, permissions and locks, leftover processes/containers/test data) AND transient resource pressure (RAM/OOM, CPU saturation under parallel workers, disk/temp exhaustion, handle and connection-pool limits, network flakiness, a timeout that is really slowness). Tell-tale shape: non-deterministic, timing-dependent, passes alone but fails in parallel, fails only on one machine or only on CI, or an error naming resources rather than business rules. Cite the discriminator you ran (clean environment? did code on the failing path change since it last passed? one machine or all? concurrency 1 or a clean rebuild?) — a verdict without one is a guess, for code as much as for the environment. Fix an environment cause in the environment or setup; NEVER edit product code or weaken/skip a test to absorb it, and a failure that vanishes on retry stays unexplained until its mechanism is named. — why: forcing green against an environment fault hides the real defect and permanently rots the test.
- **Cross-platform execution is a required contract.** Before authoring or changing a tool, script, process launcher, path assertion, or filesystem test, name the supported Windows, macOS, and Linux behaviors. Use platform-neutral Node APIs and literal argv vectors; never infer shell, temporary-path, executable-extension, ACL, or symlink semantics from the current host. A documented command, entry point, or wrapper script gives its Windows, macOS, and Linux form (Python: `py -3` on Windows, `python3` on macOS/Linux; shell: PowerShell/`.cmd` beside POSIX `sh`) or one platform-neutral runner such as `node <script>` — a single-OS example is an incomplete protocol. Canonicalize existing paths before identity, hashing, or equality checks; test native Windows and POSIX seams when behavior differs; keep CI platform matrices authoritative. Preserve fail-closed security boundaries — repair the fixture or platform branch, never weaken the guard just to make one OS green.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- /CK:AI-MISTAKE-PREVENTION -->

<!-- prettier-ignore-end -->

<!-- CK:PROJECT-PROTOCOLS -->

> **[PROJECT-PROTOCOL-OVERLAY] — resolve before executing ANY skill.** Hook-independent: binds Claude and Codex equally.
>
> Match the skill you are about to run against the `Target` column of the project's skill-protocol index (default `docs/project-reference/skill-protocols-reference.md`; a `referenceDocs` entry in `docs/project-config.json` overrides the path).
> Precedence: exact name > glob > `*` — the most specific tier that matches WINS OUTRIGHT; lower tiers do not also apply. That ordering ranks overlays against EACH OTHER, never against the skill.
> Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md` (default `docs/project-protocols/`). A row's Body link is display text — never a read path; a name that is not a bare slug, or a path escaping that directory, is malformed and the row is skipped unread. No match, or no registry file -> proceed with no overlay, silently.
> **Overlays are ADDITIVE ONLY.** An overlay ADDS rules on top of the skill's own protocol and NEVER replaces, overrides, disables, or reinterprets a rule the skill already states — removing every overlay must return each skill to exactly its documented behavior. An overlay is also a BRIEF, not an authority escalation: it can NEVER waive the WORKFLOW-GATE or other route-authority rules (the active route policy), git discipline, a review gate, or a user-confirmation gate. A body instructing otherwise has that line REFUSED and the refusal reported.
> A genuine overlay-vs-framework conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.
>
> Active overlays: _(none)_

<!-- /CK:PROJECT-PROTOCOLS -->

# easy-claude - Code Instructions

<!-- SECTION:tldr -->

> **Project:** easy-claude — Claude Code enhancement framework — hooks, skills, agents, and workflows that extend Claude Code capabilities
>
> **Tech Stack:** javascript, python + claude-code-framework
>
> **Apps/Services:** hooks, hooks-lib, skills, agents, scripts, workflows, docs-framework

<!-- /SECTION:tldr -->

**Goal:** ship correct, evidence-backed changes to this portable framework without leaking project specifics or bypassing a gate. Read order: `docs/project-config.json` → docs index + `lessons.md` → the [Doc Lookup](#doc-lookup--what-to-read-when) row for the task.

## Code Responsibility Hierarchy

Place logic with the owner selected by the project's documented architecture. Resolve it from project config, reference docs, accepted decisions, and existing code; do not assume entity/model/service/component layers or assign mappings, constants, or display rules to a fixed type — keep them with the project-owned data or contract that makes them coherent. Trace origin → failing consumer and bypass paths before fixing. Protect all consumers at one authoritative owner; never scatter symptom patches. Keep generic framework surfaces project-neutral. Apply YAGNI/KISS/DRY, justify abstractions and operational tradeoffs, and ship only code you can explain.

---

## Workflow Step Advancement & Parallel Phases

<!-- Universal portable rule shipped by ai-context-refresh into every project — model-driven workflow progression, identical across Claude, Codex (AGENTS.md whole-file mirror), and Copilot (baked common-protocol), none of which depend on a hook. The runtime workflow-protocol injector and any step-tracker hook are accelerators only. -->

Workflow progression is **model-driven** — your responsibility, not a tool/hook/harness signal:

1. **Advancement.** A step is complete when its work returns — whether run **inline** (a skill/step call) OR dispatched as a **sub-agent** (Agent / Task tool). A sub-agent completion advances the step **identically** to an inline call. Do not wait for any hook or tool event to advance; advance by judgment and your task list.
2. **Parallel phase = all-return barrier.** When steps are declared a parallel-phase group, spawn **ALL** members together (one message), then advance **only after EVERY member returns**. Never start the next step — and never start any code-mutating step (e.g. `code-simplifier`) — until the whole group has returned. A conditional member whose trigger is absent counts as "returned."
3. **Workflow-in-workflow → sub-agent (one exception).** A step that itself activates a multi-step workflow MUST run as a sub-agent; it returns only a summary and writes full findings to `tmp/reports/`. This preserves context containment. **EXCEPTION — `workflow-review-changes`:** when it appears as a step inside ANY parent workflow (`workflow-feature`, `workflow-bugfix`, `workflow-refactor`, etc.) it MUST run INLINE in the main current session agent, NEVER as a sub-agent — its Step 0 `/goal` gate binds the session Stop hook and its step-15 re-review is inline by design; a sub-agent cannot own the Stop hook, so delegating it silently breaks the unabandonable review→fix→re-review loop. Its own step 2 and steps 4–10 reviewers stay sub-agents, so context stays bounded.
4. **Hooks/trackers are accelerators only.** Any step-tracking hook is an optimization that may emit "next step" hints; correctness MUST NOT depend on it. Claude, Codex, and Copilot all run without a step-tracking hook and advance entirely by this rule.
5. **Parallel sub-agent dispatch — plan it the moment a task list exists, before executing it.** Sequential-by-default is a **defect** when tasks are genuinely independent. Tag every task `PAR` (its inputs do not include another pending task's output AND its write set is disjoint from every other `PAR` task) or `SEQ` (name the specific dependency that forces it); group `PAR` tasks into **waves with disjoint write sets** (two writers of the same file never share a wave); declare it — `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`; spawn each wave's sub-agents in **ONE message** (never dripped one per turn), routed to their specialists; then honour the **all-return barrier** per wave — merge, mark each task completed/skipped, and only then dispatch the next wave. **Fan-out stays one level deep** — a dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it. Applies to workflow steps, batch/bulk updates, investigation, research, scans, reviews, and doc sync. **Plan execution is metadata-gated, not default-parallel** — its phases fan out ONLY on what the plan explicitly declares (`PAR`/`SEQ` tags plus a declared per-phase write set); an untagged plan runs sequentially. **Do NOT parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · an order a workflow explicitly fixes · gates awaiting user approval.

---

## TL;DR — What You Must Know Before Writing Any Code

<!-- SECTION:golden-rules -->

**Path-scoped project rules:**

Apply a group's rules only when the file matches at least one include matcher, matches one configured extension when an extension filter is present, and matches none of that group's exclusions.

- **hooks-context** — include any of: path regex `[\\/]\.claude[\\/]hooks[\\/].*\.cjs$`; extensions: `.cjs`
  1. Hooks use CommonJS (require/module.exports)
  2. Hook files read stdin JSON and write to stdout/stderr
  3. Shared utilities go in .claude/hooks/lib/
  4. Test hooks via node .claude/hooks/tests/test-all-hooks.cjs
  5. Every AI-agent folder (.claude/, .codex/, .agents/, .opencode/) ships to other projects: keep it portable and configurable — no project names, absolute paths, or consumer-specific terms; project specifics belong in docs/project-config.json or project-reference docs

- **skills-context** — include any of: path regex `[\\/]\.claude[\\/]skills[\\/].*SKILL\.md$`; extensions: `.md`
  1. Each skill is a directory with SKILL.md as entry point
  2. Skills may have scripts/, references/, and tests/ subdirectories
  3. Follow naming conventions in .claude/docs/skill-naming-conventions.md
  4. Every AI-agent folder (.claude/, .codex/, .agents/, .opencode/) ships to other projects: keep it portable and configurable — no project names, absolute paths, or consumer-specific terms; project specifics belong in docs/project-config.json or project-reference docs

- **agents-context** — include any of: path regex `[\\/]\.claude[\\/]agents[\\/].*\.md$`; extensions: `.md`
  1. Agent definitions are markdown files in .claude/agents/
  2. Follow patterns in .claude/docs/agents/agent-patterns.md
  3. Every AI-agent folder (.claude/, .codex/, .agents/, .opencode/) ships to other projects: keep it portable and configurable — no project names, absolute paths, or consumer-specific terms; project specifics belong in docs/project-config.json or project-reference docs

- **scripts-context** — include any of: path regex `[\/].claude[\/]scripts[\/].*.(cjs|mjs|js|py)$`; extensions: `.cjs`, `.mjs`, `.js`, `.py`
  1. Every AI-agent folder (.claude/, .codex/, .agents/, .opencode/) ships to other projects: keep it portable and configurable — no project names, absolute paths, or consumer-specific terms; project specifics belong in docs/project-config.json or project-reference docs
  2. Verifiers and generators under .claude/scripts/ are portable framework surfaces — gate them with the residue and root-literal checks before commit
  3. Resolve every root from project config with the framework default as fallback; never hardcode a spec, docs, or package path

- **agent-mirrors-context** — include any of: path regex `^[\/]?.(codex|agents|opencode)[\/]`; extensions: `.md`, `.toml`, `.json`, `.mjs`, `.cjs`
  1. Every AI-agent folder (.claude/, .codex/, .agents/, .opencode/) ships to other projects: keep it portable and configurable — no project names, absolute paths, or consumer-specific terms; project specifics belong in docs/project-config.json or project-reference docs
  2. These folders are GENERATED mirrors of .claude/ — never hand-edit them; fix the .claude/** source and regenerate, or the next sync reverts the edit
  3. A project-specific leak found in a mirror means the leak is in the .claude/** source — fix it there

- **ui-ux-gate** — include any of: path regex `/res/layout[^/]*/[^/]+\.xml$`, filename regex `\.(?:html?|xhtml|razor|cshtml|hbs|handlebars|ejs|pug|twig|liquid|njk|css|scss|sass|less|styl|pcss|jsx|tsx|vue|svelte|astro|xaml|axml|storyboard|xib)$`, filename regex `\.component\.ts$`; exclude path globs: `**/node_modules/**`, `**/dist/**`, `**/build/**`, `**/vendor/**`, `tmp/**`, `temp/**`, `.agents/**`, `.codex/**`, `.opencode/**`
  1. UI/UX gate: have UI-*, DD-* and CL-* in context BEFORE editing this surface; read the docs above unless already loaded
  2. UI-1.1–UI-9.4 usability/a11y floor (pass/fail): SYNC:ui-ux-design-principles in .claude/skills/shared/sync-inline-versions.md
  3. DD-1–DD-8 identity (design-knowledge.md): name subject/audience/job, write the Design Plan, pass the generic test
  4. CL-1–CL-6 (checklist): §0.5 surface scope, B12–B15 load, E9–E11 container fit, §R forms, I15 dialog focus, K10 dead controls
  5. Calibrate severity with design-review-calibration.md; brief > project design system/ADRs > these rules; no visual change = say skip

<!-- /SECTION:golden-rules -->

**First Principles:** (1) **Understanding > Output** — never ship code you can't explain. (2) **Design before mechanics** — write WHY before WHAT. (3) **Own your abstractions** — every dependency and platform choice is yours. (4) **Operational awareness** — code that can't be debugged, monitored, or rolled back is debt. (5) **Depth over breadth** — one understood solution beats ten generated variants.

## Search Existing Code First

MUST grep/glob 3+ similar examples before writing; follow the local pattern over framework docs; cite `file:line` in the plan — why: local conventions differ from framework defaults. Enforced by the investigate steps of Feature/Bugfix/Refactor workflows.

### Discovery order — read BEFORE investigating, planning, coding, or answering

1. `docs/project-config.json` — single source of truth for THIS repo: modules/paths, run-commands, design system, architecture and workflow rules. `CLAUDE.md` is generated from it; never assume framework defaults. Missing → run on portable defaults and offer `/project-init` once; skeleton or malformed → run `/project-init` or the narrow setup route first.
2. `docs/project-reference/docs-index-reference.md` (keyword → doc routing) + `lessons.md` (learned guardrails) — before any non-trivial task.
3. The matching [Doc Lookup](#doc-lookup--what-to-read-when) row for a question or task; the Path → Reference Doc row below before editing a path. Answer project questions from the doc you read and cite it; `/project-help` for how the framework works. NEVER answer project-specific questions from memory or framework defaults — why: generic answers silently contradict local config.

**Writing a doc an agent reads** (this file, its template, reference docs, docs index, `lessons.md`): keep it discoverable — purpose and critical rules first, closing reminders last when long, every pointer to another doc as `read <path> when <situation>` to a file that exists, routed from Doc Lookup or the docs index. The doc-writing skills end with this gate (`SYNC:ai-discovery-doc-quality`).

### Path → Reference Doc (read BEFORE editing the matched path)

Unprefixed filenames resolve under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` overrides); specs under the business spec root (default `docs/specs`; `specRoots.business.path` overrides), both in `docs/project-config.json`.

| Edited path                                                                     | Read first                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hooks `.claude/hooks/**/*.cjs`, shared libs `.claude/hooks/lib/`                | `.claude/docs/hooks/README.md` — lifecycle events, hook inventory and roles                                                                                                                                     |
| Skills `.claude/skills/**/SKILL.md`                                             | `.claude/docs/skills/README.md` + `.claude/docs/skill-naming-conventions.md`                                                                                                                                    |
| Agents `.claude/agents/*.md`                                                    | `.claude/docs/agents/agent-patterns.md`                                                                                                                                                                         |
| Scripts, generators, verifiers `.claude/scripts/**`                             | `.claude/docs/framework-portability.md` — config-resolved roots, no project residue                                                                                                                             |
| Workflows `.claude/workflows.json`, `.claude/settings.json`, `.claude/.ck.json` | `.claude/docs/README.md` (framework doc map) + `.claude/docs/configuration/README.md`                                                                                                                           |
| Root context `CLAUDE.md`, its template, `AGENTS.md`                             | `.claude/skills/ai-context-refresh/SKILL.md` — `SECTION:*` blocks are generated from `docs/project-config.json`; `AGENTS.md` is a generated projection, never hand-edited                                       |
| Tests `*.test.cjs`, `*.test.mjs`                                                | `integration-test-reference.md` — real hook/process boundaries, Given/When/Then, isolated temp state, full run twice                                                                                            |
| Feature specs (business spec root)                                              | `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`                                                                                                                                 |
| Any user-facing UI surface (new or reshaped)                                    | `.claude/docs/design-knowledge.md` — `DD-1`–`DD-8`: subject grounding, design plan + generic test, the generated-design tell catalog, typography/structure/motion, restraint & critique                         |
| Reviewing / planning / building front-end work                                  | `.claude/docs/design-review-checklist.md` — `CL-1`–`CL-6` + the `A1`…`Q` catalog: context gate, evidence rules, `P0`–`P4` severity, §A–§N sweep (§F/§G/§H, §L conditional), §O report shape, §P 10-check triage |

**By task phase** (read before the phase's first target read; only docs selected in `referenceDocs` that exist, skipping any Doc Lookup marks N/A): plan / investigate / design → `project-structure-reference.md`, `domain-entities-reference.md` + the edit-row docs above for every file type the plan touches · edit code → `code-review-rules.md` + the matching row above · tests or test data → `integration-test-reference.md` / `e2e-test-reference.md` / `seed-test-data-reference.md` · specs or docs → the spec row above (+ `workflow-spec-test-code-cycle-reference.md` for spec-test-code sync) · review → `code-review-rules.md` + the rows for every file type under review. **Dedup:** a doc whose full content your own read returned to this context after the last compaction and within ~200K tokens, and that has not changed since, counts as loaded — cite `(loaded)`, don't re-read; hook reminders, summaries and prior mentions never count. A delegated sub-agent starts empty: name the resolved doc paths in its brief. Canonical gate: `SYNC:project-reference-docs-guide`.

> **[ROOT-CAUSE-FIX]** Fix at the owner of the violated invariant ([Code Responsibility Hierarchy](#code-responsibility-hierarchy)) — never patch symptoms.

---

## Doc Lookup — What to Read When

<!-- SECTION:doc-lookup -->

Match the question or task to a row and read that doc before answering, planning, or editing; every row names a file or folder that exists in this repo.

| If user prompt mentions... | Read first |
|---|---|
| Any project question or task — start here: paths, commands, modules, conventions | `docs/project-config.json` |
| Where a topic is documented — keyword-to-doc routing | `docs/project-reference/docs-index-reference.md` |
| Any non-trivial task — learned project guardrails | `docs/project-reference/lessons.md` |
| Feature specs, capability behavior, business rules, test cases | `docs/specs/` + `docs/project-reference/feature-spec-reference.md` |
| Spec paths, TC format, canonical vs derived spec artifacts | `docs/project-reference/spec-system-reference.md` |
| Spec quality, AI-implementability, tech-agnostic prose | `docs/project-reference/spec-principles.md` |
| Behavior or public contract changes, spec-test-code sync | `docs/project-reference/workflow-spec-test-code-cycle-reference.md` |
| Where code lives, modules, stack, setup — before planning or investigating. Holds: Project directory structure and module overview | `docs/project-reference/project-structure-reference.md` |
| Seeding or reviewing development/test data. Holds: Seed test data patterns: idempotent seeder architecture, DI scope safety, command dispatch, and config-driven counts | `docs/project-reference/seed-test-data-reference.md` |
| Writing, fixing, or reviewing integration tests. Holds: Integration test patterns and conventions | `docs/project-reference/integration-test-reference.md` |
| Before editing or reviewing code — rules, anti-patterns, checklists. Holds: Code review checklist and rules | `docs/project-reference/code-review-rules.md` |
| A saved project prompt, playbook, or runbook may apply (`/custom-prompt`). Holds: Index of project-specific custom prompts (name, description, triggers) — managed by the /custom-prompt skill | `docs/project-reference/custom-prompts-reference.md` |
| Before running any skill — project overlays layered on it. Holds: Index of project protocol overlays layered onto framework skills (target, scope, description) — written and managed via the /project-skill-protocol skill | `docs/project-reference/skill-protocols-reference.md` |
| UI design — tokens, components, app-to-doc map. Holds: Design system index: app-to-doc mapping, design tokens overview, component inventory | `docs/project-reference/design-system/README.md` |
| Domain concepts, entities, relationships, data ownership — before planning or design. Holds: Framework conceptual domain — Hook, Skill, Agent, Workflow, Context Group, Module | `docs/project-reference/domain-entities-reference.md` |
| Why the architecture or a convention is the way it is — accepted decisions and trade-offs | `docs/adr/` |
| How the AI framework works — hooks, skills, agents, workflows, config (or run `/project-help`) | `.claude/docs/README.md` |
| Framework rules, or why a hook blocked or warned | `.claude/docs/development-rules.md` + `.claude/docs/troubleshooting.md` |

Declared not applicable in `referenceDocs` (skip unless the project adds that stack): `backend-patterns-reference.md`, `frontend-patterns-reference.md`, `scss-styling-guide.md`, `e2e-test-reference.md`.

<!-- /SECTION:doc-lookup -->

## First Action Decision (before any tool call)

**Modification beats research.** When a prompt mixes research and modification intent, treat it as modification (investigation is a substep of `/plan`).

## Task Planning Rules

1. Before editing files, MUST create a `TaskCreate` item per change.
2. Break work into small todos; add a final review todo.
3. **Analyze the task graph BEFORE executing** (every host, hooks or not). Once the list exists, before any task starts: (a) split work into delegable tasks; (b) map dependencies — output consumers, shared write targets; (c) order waves — what runs first, what runs in parallel per wave, what stays `SEQ` and why; (d) declare the plan in the `Parallel plan:` format of [Workflow Step Advancement](#workflow-step-advancement--parallel-phases) rule 5; (e) dispatch each parallel-safe wave as sub-agents in ONE message within that rule's limits. Re-run this analysis when tasks are added. Serial execution of independent tasks is a defect; parallelism never overrides those limits. — why: an unanalyzed list defaults to serial and hides ordering conflicts.
4. Mark todos `completed` immediately after each one finishes. Keep exactly one `in_progress`.
5. On context loss or compaction, call `TaskList` first — resume existing tasks, don't duplicate.
6. Recommendations need traced evidence (`file:line`, grep, graph). No speculation.
7. Recommendations that could break behavior require validation before proposing.
8. **Pin the goal, track every prompt** (`SYNC:session-goal-ledger`): write `Original goal:` as task 1, keep `User prompts this session: P1…Pn`, re-read both each step, before delegation and after compaction (`tmp/prompt-ledger/<session>/ledger.md` when present), and map the result to every prompt before done. Never store secrets.

---

## Generated Artifact Storage

Store disposable generated output in the project workspace. Treat it as disposable unless its owning contract explicitly declares it a source-of-truth or an intentionally versioned projection. Write temporary state, integration/E2E test results, reports, logs, screenshots, traces, videos, coverage, dumps, candidate evidence, and any other reproducible non-source output under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. The project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Do not place disposable output in source, docs, the plans root, the team artifacts root, or generated mirror directories; committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned mirrors remain at their declared owner paths.

---

## Naming Conventions

| Type           | Convention       | Example                                       |
| -------------- | ---------------- | --------------------------------------------- |
| Files          | kebab-case       | `context-injector.cjs`, `session-manager.cjs` |
| Hook files     | `<name>.cjs`     | `.claude/hooks/review-commit-gate.cjs`        |
| Hook libraries | `<name>.cjs`     | `.claude/hooks/lib/project-config-schema.cjs` |
| Skill dirs     | `<skill-name>/`  | `.claude/skills/code-review/SKILL.md`         |
| Agent files    | `<name>.md`      | `.claude/agents/code-reviewer.md`             |
| Constants      | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`                             |
| Booleans       | Prefix with verb | `isActive`, `hasPermission`, `canEdit`        |
| Collections    | Plural           | `users`, `items`, `employees`                 |

---

<!-- SECTION:key-locations -->

```
/\.claude/hooks/                         # Runtime hooks for session initialization, safety gates, graph maintenance, and code formatting
/\.claude/hooks/lib/                     # Shared utility modules consumed by hooks
/\.claude/skills/                        # Skill definitions for task automation (SKILL.md + scripts)
/\.claude/agents/                        # Agent definitions for specialized subagent roles
/\.claude/scripts/                       # Utility scripts for catalog generation, skill/agent management, shared-protocol sync, and code-graph tooling
/\.claude/workflows/                     # Workflow definitions for orchestrating multi-step task sequences
/\.claude/docs/                          # Framework documentation — agents, skills, hooks, configuration guides
```

<!-- /SECTION:key-locations -->

<!-- SECTION:dev-commands -->

```bash
node .claude/hooks/tests/test-all-hooks.cjs   # hook tests
node .claude/hooks/tests/run-all-tests.cjs    # all suites
```

**Platform (Windows):** invoke Python via `py -3` or `py` — NEVER `python3` (MS Store alias exits 49). Scripts resolve `python` then `py -3` (see `count-drift.test.cjs:29-32`). macOS/Linux: use `python3`.

<!-- /SECTION:dev-commands -->

<!-- SECTION:e2e-testing -->

No E2E guide applies: `e2e-test-reference.md` is declared not applicable in `referenceDocs` (skip unless the project adds that stack).

<!-- /SECTION:e2e-testing -->

<!-- SECTION:integration-testing -->

See [integration-test-reference.md](docs/project-reference/integration-test-reference.md) for integration test patterns and setup.

<!-- /SECTION:integration-testing -->

---

## Evidence-Based Reasoning & Investigation

Back every claim about behavior and every recommended change with evidence — never speculate.

### Core Rules

1. **Evidence before conclusion** — cite `file:line`, grep results, or framework docs. Don't use "obviously…", "I think…" without proof.
2. **State your confidence** — every recommendation lists its confidence level and the evidence it rests on.
3. **Inference alone isn't enough** — upgrade to code evidence when possible. When unsure, say _"I don't have enough evidence yet."_
4. **Cross-service validation** — check all services before recommending architectural changes.
5. **Graph trace before conclusion** — when investigating code flow, run a graph trace on key files.

### Confidence Levels

| Level       | Meaning                                         | Action                 |
| ----------- | ----------------------------------------------- | ---------------------- |
| **95-100%** | Full trace, all items verified                  | Recommend freely       |
| **80-94%**  | Main paths verified, some edge cases unverified | Recommend with caveats |
| **60-79%**  | Implementation found, usage partially traced    | Recommend cautiously   |
| **<60%**    | Insufficient evidence                           | **DO NOT RECOMMEND**   |

---

## Continuous Improvement — Lesson Extraction Gate

> **[BLOCKING] Self-improvement loop — runs at the end of every non-trivial task.** This is the static, hook-independent home of the `/learn` gate: it binds Claude, Codex, and Copilot equally, with or without any hook firing.

Add a final task — "Analyze AI mistakes & lessons learned" — to every non-trivial task list (see [Task Planning Rules](#task-planning-rules)). At task end, extract lessons by **ROOT CAUSE, not symptom**:

1. Name the **failure mode** (the reasoning/assumption failure), not the symptom — "assumed an API existed without reading the source", not "used the wrong enum value".
2. **Generality test:** does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write it as a **universal rule** — strip project-specific names/paths/classes so it is useful on any codebase.
4. **Consolidate:** multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in a future session WITHOUT this reminder?" — No → skip `/learn`.
6. **Auto-fix gate:** "Could `/code-review` / `/simplify` / `/security-review` / a linter catch this mechanically?" — Yes → improve that review skill instead of writing a lesson.
7. **Both gates pass → ask the user to run `/learn`** to capture the lesson durably. Never silently self-edit instruction files.

---

## Git & Version-Control Discipline

> **[BLOCKING] Hook-independent guardrail — binds Claude, Codex, and Copilot equally.** Claude and Codex run `review-commit-gate.cjs`; on a host without hooks (Copilot) or an un-wired project this section is the ONLY guardrail — obey it without any block.
>
> **Only ONE rule here is hook-enforced.** `review-commit-gate.cjs` blocks an agent `git commit` whose changeset has neither a review fix-loop receipt nor a user-approved skip (rules 2 and 7), and fails closed on any statement it cannot parse that places `commit` right after `git` — even a read-only one (rephrase such text or write it with a file tool); it ignores every other git statement. Destructive-git mechanical gating was removed by explicit user decision (`.claude/docs/development-rules.md`): no hook blocks `reset --hard`, `clean -f`, `checkout -- <path>`, a force push, or a `gh`/GitHub-MCP write. Only the literal `permissions.ask` patterns in `.claude/settings.json` still prompt (`ask` prompts even under `bypassPermissions`), and a destructive spelling outside that literal set runs without one. Every other rule is **model-behavioral** — obeying it is your responsibility on every host. A command being allowed is NEVER evidence you were asked to run it.

1. **Never commit, push, or stage (`git add`) unless the user explicitly asks for it.** "Implement X" / "fix the bug" is NOT permission to commit — finish the work, report what changed, and wait. Only an explicit "commit"/"push" (or an invoked commit skill / git-manager) authorizes it. _(**Model-behavioral** — the hook deliberately does NOT block these, and the default settings allow-list `git push`: only the literal `git push --force`/`-f` prefixes still hit a `permissions.ask` prompt, so a trailing `--force`, a `+<ref>`, `--delete` or `--mirror` push runs unprompted. They are recoverable, and gating them made the correct workflow harder to reach than the destructive one. Nothing catches this but you.)_
2. **Amend is a commit — gated like one.** `git commit --amend` and `git reset --soft HEAD~1` + `git commit` produce the same commit, so both follow the same rules: only on an explicit amend request (a plain commit request makes a new commit), and never on a commit that is already pushed or that this task did not create (either path rewrites it). `review-commit-gate.cjs` gates an amend by a review receipt over the amended commit's candidate measured against HEAD's parent; the `commit` skill passes `"amend":true` in the commit descriptor. Amending a merge commit fails closed. _(Authority is model-behavioral; the review is hook-enforced. The replaced commit stays in the reflog, so neither path is irreversible.)_
3. **Branch before committing on the default branch.** If asked to commit while on `main`/`master`, create a feature branch first. _(**Model-behavioral** — the hook has no branch awareness and will not stop a commit on `main`. Nothing catches this but you.)_
4. **Read-only git needs no permission** — `status`, `diff`, `log`, `show`, `rev-parse`, `describe`, `blame`, `check-ignore`, `ls-files`, `shortlog`, and the _listing_ forms of `branch`, `tag`, `remote`, `config` and `stash`. _(Model-behavioral permission note.)_
5. **Never run a command that can destroy uncommitted work.** Unstaged edits and untracked files exist in exactly one place — the working tree. `git checkout -- <path>`, `git restore <path>`, `git reset --hard`, `git clean -f`, `git switch --discard-changes` and `git stash drop` erase the only copy that ever existed. _(**Model-behavioral** — no hook blocks these; only some literal spellings hit a `permissions.ask` prompt. Ask before running one; there is nothing to undo it with.)_
6. **Publishing through the GitHub CLI — or the GitHub MCP server — is the same act as pushing.** `gh pr create|merge`, `gh release create`, `gh repo delete`, `gh api -X POST|PUT|PATCH|DELETE` and their siblings need the same explicit request rule 1 demands. The MCP tools (`mcp__github__merge_pull_request`, `create_*`, `update_*`, `push_files`, …) reach the same remote without a shell and need it too; only `get_*`/`list_*`/`search_*` are reads. _(**Model-behavioral** — no hook gates any `gh` or GitHub-MCP write.)_
7. **Commit through the `commit` skill — NEVER a raw ad-hoc `git commit` from the agent.** The skill stages, derives the estimate, runs the test-verify gate, runs the review-before-commit gate, and mints the review receipt. `review-commit-gate.cjs` blocks an agent `git commit` whose changeset has no review fix-loop receipt — `changes-review --fix-loop`, `why-review --fix-loop`, or `workflow-review-changes --fix-loop` — and no user-approved `skip`; a raw commit therefore both skips the review and is refused. Each fix-loop mints a receipt over the exact changeset it converged on, and any content edit after the review invalidates it. The user may always run git themselves or approve a skip; the agent's path is the skill. When a prompt asks to commit, `commit-skill-route.cjs` (UserPromptSubmit, mirrored to Codex and OpenCode) injects a reminder to run the skill — `$commit` on Codex. _(Hook-enforced by `review-commit-gate.cjs`; the receipt is bounded bookkeeping, not consent.)_

**Why:** auto-committing/pushing unprompted publishes unreviewed work and can rewrite shared history, so it stays gated on explicit human intent on every host. That gate is **behavioral, not mechanical** — a deliberate trade: the only mechanical check left is the review receipt on a commit (rule 7). Read every rule as binding on YOU, not on a hook.

**What the lease is and is not.** The `commit` skill and `git-manager` record a session lease (`.claude/hooks/lib/git-operation-lease.cjs`) for the operations the user asked for, and `session-end.cjs` revokes it. No hook consumes it any more, so a lease grants nothing and blocks nothing: it is **bookkeeping, not consent**, and holding one NEVER substitutes for rule 1's explicit human request.

---

## Graph Intelligence (when .code-graph/graph.db exists)

<HARD-GATE>
You MUST run at least one graph command on key files before concluding any investigation, plan, or fix verification. Skip only when `.code-graph/graph.db` is absent.
</HARD-GATE>

### Quick CLI Reference

```bash
python .claude/scripts/code_graph trace <file> --direction both --json                    # Full system flow
python .claude/scripts/code_graph trace <file> --direction both --node-mode file --json   # File-level overview
python .claude/scripts/code_graph connections <file> --json                               # Structural relationships
python .claude/scripts/code_graph query callers_of <function> --json                      # All callers
python .claude/scripts/code_graph query tests_for <function> --json                       # Test coverage
python .claude/scripts/code_graph batch-query <f1> <f2> <f3> --json                       # Multiple files at once
python .claude/scripts/code_graph search <keyword> --kind Function --json                 # Find by keyword
```

**Pattern:** Grep finds files > trace reveals system flow > grep verifies details.

**Routing:** When grep surfaces an important file, or before editing across modules, run a graph trace (see the `graph-*` skills) to map callers/dependents first.

---

## Automatic Skill Activation

<!-- SECTION:skill-activation -->

When editing files matching these path patterns, pre-read the listed context first: (no hook: `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`)

| Path Pattern | Skill / Auto-Context | Pre-Read Files |
|---|---|---|
| `docs/specs/**/*.md` | `spec` | `docs/project-reference/feature-spec-reference.md`, `docs/project-reference/spec-system-reference.md`, `docs/project-reference/spec-principles.md`, `[[convention:feature-spec@e0967a10]]` |
| `**/*.test.cjs` | `integration-test` | `docs/project-reference/integration-test-reference.md`, `[[convention:integration-test@f3af9787]]` |
| `/res/layout[^/]*/[^/]+\.xml$**`, `name:\.(?:html?\|xhtml\|razor\|cshtml\|hbs\|handlebars\|ejs\|pug\|twig\|liquid\|njk\|css\|scss\|sass\|less\|styl\|pcss\|jsx\|tsx\|vue\|svelte\|astro\|xaml\|axml\|storyboard\|xib)$`, `name:\.component\.ts$` · not `**/node_modules/**`, `**/dist/**`, `**/build/**`, `**/vendor/**`, `tmp/**`, `temp/**`, `.agents/**`, `.codex/**`, `.opencode/**` | _(auto-context)_ | `.claude/docs/design-review-checklist.md`, `.claude/docs/design-knowledge.md`, `.claude/docs/design-review-calibration.md`, `[[convention:ui-ux-gate@4a189e29]]` |
| `/\.claude/hooks/.*\.cjs$**` ext `.cjs` | _(auto-context)_ | `.claude/docs/hooks/README.md`, `[[convention:hooks-context@98585d7f]]` |
| `/\.claude/skills/.*SKILL\.md$**` ext `.md` | _(auto-context)_ | `.claude/docs/skills/README.md`, `[[convention:skills-context@73cff91e]]` |
| `/\.claude/agents/.*\.md$**` ext `.md` | _(auto-context)_ | `.claude/docs/agents/README.md`, `[[convention:agents-context@27d7a6ce]]` |
| `[\/].claude[\/]scripts[\/].*.(cjs\|mjs\|js\|py)$**` ext `.cjs`, `.mjs`, `.js`, `.py` | _(auto-context)_ | `.claude/docs/framework-portability.md`, `[[convention:scripts-context@dee3627a]]` |
| `^[\/]?.(codex\|agents\|opencode)[\/]**` ext `.md`, `.toml`, `.json`, `.mjs`, `.cjs` | _(auto-context)_ | `.claude/docs/framework-portability.md`, `[[convention:agent-mirrors-context@1bdb68d5]]` |
| `**/*` ext `.js`, `.cjs`, `.mjs`, `.jsx`, `.py` · not `**/node_modules/**`, `**/dist/**`, `**/build/**`, `**/vendor/**`, `tmp/**`, `temp/**` | _(auto-context)_ | `docs/project-reference/code-review-rules.md`, `[[convention:general-code@487c3358]]` |

<!-- /SECTION:skill-activation -->

**Design routing:** SCSS / style files → ui-review / design skill (BEM conventions live there). UI / HTML / CSS files → design skill (canonical design-system doc: tokens, components, BEM).

> **[DESIGN-GATE] — binds Claude, Codex and Copilot equally, with or without hooks.** Any task that CREATES or RESHAPES a user-facing visual surface — a plan phase, a mockup, a design spec, a scaffolded frontend example, an implemented component, a UI review — is governed by **two independent rule sets, and both bind**:
>
> 1. **`UI-1.1`–`UI-9.4`** (`SYNC:ui-ux-design-principles`) — the usability/accessibility FLOOR: measurable, pass/fail.
> 2. **`DD-1`–`DD-8`** (`SYNC:design-distinctiveness-gate`; catalog: `.claude/docs/design-knowledge.md`) — visual IDENTITY: is this THIS product's interface, or the one any generator emits for any brief? A surface can pass all 40 clauses and still be a template.
>
> **Before any UI code:** name the subject/audience/job (`DD-1`) → write the four-part **Design Plan** (colour 4–6 named hex · type families+roles+scale · layout concept+ASCII+alignment · principles), each part with a WHY traced to the subject → run the **BLOCKING generic test** (`DD-3`): work through a similar prompt, and revise every part that reads like the default for any comparable page, stating what changed. Only then build the REVISED plan, then critique the BUILT page and remove one accessory (`DD-8`).
>
> **Precedence:** the brief's stated visual direction WINS outright → then the project's design-system / SCSS / frontend-pattern docs and ADRs (an established house style IS an intentional identity — a repo-wide convention is never a distinctiveness finding) → then these clauses. Genuine conflicts go to the user with both sides, NEVER resolved silently. **Skip ONLY** for changes with no user-facing visual surface, stated explicitly.
>
> **Reviewing, planning, or building front-end work also runs the CHECKLIST** (`CL-1`–`CL-6`; catalog: `.claude/docs/design-review-checklist.md`) — the review PROCEDURE, not a third set of taste rules: establish context first, cite a location for every finding and NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), rank `P0`–`P4`, sweep §A–§N with §F/§G/§H and §L applied only when the platform/product matches, and report in the §O shape. Short on time → the 10-check §P triage. In a PLAN it binds the UI phases' acceptance criteria (platform, conditional sections, the eight screen states, the a11y floor). Report a defect ONCE across `UI-*` / `DD-*` / `CL-*`.
>
> **Sub-agents inherit nothing from this conversation** — any UI-bearing sub-agent brief carries the Design Plan verbatim plus the design-system doc paths, or the leaf supplies its own defaults.

---

## Inventory

<!-- Auto-injected by `python .claude/scripts/generate_catalogs.py --inject-counts CLAUDE.md`. See `0002-canonical-count-metrics.md` in the ADR root (default `docs/adr`; a `docsRoots.adr.path` entry in `docs/project-config.json` overrides the path). -->

| Kind        | Count                                       |
| ----------- | ------------------------------------------- |
| Skills      | <!-- COUNT:skills -->124<!-- /COUNT -->     |
| Hooks       | <!-- COUNT:hooks -->16<!-- /COUNT -->       |
| Agents      | <!-- COUNT:agents -->23<!-- /COUNT -->      |
| Workflows   | <!-- COUNT:workflows -->19<!-- /COUNT -->   |
| Shared      | <!-- COUNT:shared -->10<!-- /COUNT -->      |
| Lib modules | <!-- COUNT:lib-modules -->44<!-- /COUNT --> |

---

<!-- SECTION:doc-index -->

```
docs/adr/  (3 files)
docs/project-reference/  (18 files)
docs/release/  (1 files)
docs/specs/  (5 files)
docs/templates/  (1 files)
```

<!-- /SECTION:doc-index -->

---

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** ship correct, evidence-backed changes to this portable framework without leaking project specifics or bypassing a gate.

- **MUST ATTENTION** route first (workflow gate at the top of this file), then read before acting: `docs/project-config.json` → docs index + `lessons.md` → the [Doc Lookup](#doc-lookup--what-to-read-when) / Path → Reference Doc row. NEVER answer or edit from memory — why: local config overrides framework defaults.
- **MUST ATTENTION** cite `file:line` for every claim; >80% confidence to act; investigate root cause before any fix and adjudicate a failed test before editing either side.
- **MUST ATTENTION** edit `.claude/**` and `CLAUDE.md` sources, never generated mirrors (`AGENTS.md`, `.agents/`, `.codex/`, `.opencode/`); regenerate and verify every affected output.
- **NEVER** commit, push, stage, or run a destructive git command without an explicit user request — commit only through the `commit` skill.
