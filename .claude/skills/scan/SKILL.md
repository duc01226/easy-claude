---
name: scan
version: 1.0.0
description: '[Documentation] Use when (re)generating ONE selected project-reference doc. Flag: --target={project-structure|backend-patterns|frontend-patterns|scss-styling|design-system|code-review-rules|domain-entities|feature-spec|docs-index|e2e-tests|integration-tests|seed-test-data|ui-system|generic-reference-doc}; generic-reference-doc also requires --filename=<selected custom doc>.'
---

## Quick Summary

**Goal:** Scan one selected built-in or explicitly generic custom reference doc and deliver a surgical, evidence-backed update whose examples, coverage, and generated content are verified against the project without unsupported changes.

**Summary:**

- **Purpose:** Run one selected, applicable manifest target; its entry owns the output doc, capability evidence, detection, agents, sections, exceptions, and enhancement requirements.
- **Ordered path:** Validate required config → resolve key/entry and selected output → check applicability → assess mode/type/config/graph → scan → write/verify/report.
- **Modes/gates:** Init/Sync and target-defined Force; `kind: orchestrator` uses its procedure; unknown key STOPs; unsupported capability is a reported skip, not a guessed fallback.
- **Evidence:** Use real `file:line` examples, incremental unique reports, surgical writes, all-path/name checks, target exceptions, and graph checks when the project supports them.

**Workflow:**

1. **Validate** — Confirm the configured project-config file exists and is schema-valid.
2. **Resolve** — Parse `--target=<key>`, load its manifest entry, and confirm the output is selected or separately owned as an always-on input.
3. **Assess** — Check capability evidence before running target-specific Phase 0 detection.
4. **Scan** — Run only applicable declared work and capture `file:line` evidence.
5. **Write** — Surgically update the selected reference doc; verify all generated claims and examples.
6. **Report** — Persist findings and return complete, unchanged, skipped, or blocked status with evidence.

**Key Rules:**

**MUST ATTENTION** resolve `--target` FIRST; the manifest entry owns all target-specific behavior, never memory.
**MUST ATTENTION** validate config and target applicability before scanning; a catalog entry is not proof the project uses that capability.
**MUST ATTENTION** detect framework/type only after applicability is established; derive scan terms and scopes from evidence, never hardcode.
**MUST ATTENTION** use actual project examples with `file:line` — NEVER fabricate.
**MUST ATTENTION** use graph evidence only for code relationships when a supported project graph exists; an absent graph is not a scan failure.

- Update surgically — NEVER rewrite the whole doc or remove a section without evidence it is obsolete.
- Honor target-entry Content Rules/exceptions and Special slivers, including target-specific branches.

---

# Scan (parameterized reference-doc scanner)

## Phase 0.0: Resolve Target (BLOCKING — do this before anything else)

1. Parse `--target=<key>` from the invocation (e.g. `/scan --target=backend-patterns`). Built-in keys use their manifest entry. The reserved `generic-reference-doc` mode also requires `--filename="<relative-path>"`. If no target or an unknown key is supplied, STOP and list registered keys; never guess the intended target.
2. **Validate project config.** Resolve the configured config path through `.claude/hooks/lib/project-config-loader.cjs` (default `docs/project-config.json`). Ordinary project work requires a schema-valid file with a non-empty `project.name`; omitted capability sections use neutral defaults or skips, while any declared invalid section is a blocking config error. Route missing or invalid config to `project-init` / `project-config` and do not scan until repaired.
3. **Resolve output selection.** Read the effective `referenceDocs` selection through the project config/runtime resolver. An explicit array, including `[]`, is exact for task-specific docs. A built-in target may write only its manifest `doc` when that exact filename is selected. `generic-reference-doc` may write only the exact selected custom filename whose `scanTarget` is `generic`; a missing/`manual` target or unselected filename blocks the scan. Custom docs never inherit a built-in target by basename. The `lessons.md` and docs-index inputs are ensured by project-init separately from task-specific selection.
4. **Read the target's entry in `references/targets.md`.** That entry supplies:
   - `doc` — the reference doc path this scan owns
   - applicability and skip evidence
   - description, sub-agent roles, Phase 0 detection, Think scopes, sections, content rules, exceptions, special slivers, anti-rationalization, and enhancement requirements
5. **Check applicability before scanning.** Verify the capability from relevant config plus repository evidence. Config may select or point to search locations, but does not prove that a code pattern exists. If evidence shows the capability is absent, report `SKIPPED` with the config fields and paths checked and write nothing. If evidence conflicts materially, stop and surface the conflict.
6. **Orchestrator branch:** if the entry is `kind: orchestrator`, follow its applicability-aware procedure and include only eligible children. Do not run the shared single-doc engine for the orchestrator.

> Everything below is the SHARED engine (standard single-doc scanner targets). Wherever it says "the target entry," read the loaded manifest entry — do not assume values from another target. **Orchestrator-kind targets do not use this engine** — they run their entry's Orchestration Procedure instead.

## Phase 0: Classify & Assess

After config, output selection, and applicability pass, run only the checks relevant to this target:

1. Read the target's `doc`.
   - Detect mode: **Init** (placeholder — headings only / sentinel present) or **Sync** (populated). Some targets add a **Force** mode (user says "rebuild"/"reset" → treat as Init even if the doc exists) — honor it if the target entry defines it.
   - In Sync mode: list already-documented sections → skip re-scanning those unless staleness suspected.
2. Run the target entry's **Phase 0 detection** table(s) only for the evidenced capability. For a generic custom doc, derive evidence and search scope from its configured purpose and sections, then verify against repository sources without assuming a stack, architecture, or test convention. Derive patterns from source, manifests, test config, or documentation; a framework name in config is a search hint to verify, not permission to invent usage.
3. Load only relevant configured paths and profiles, and validate every declared section the scan consumes. Omitted optional properties mean neutral defaults or a skipped branch; a declared malformed property blocks the scan.
4. For code-oriented targets, trace relevant files with the project graph only when `.code-graph/graph.db` and the graph tool are available.

**Evidence gate:** If applicability or framework detection cannot be established, report what was checked and what remains unknown. Skip absent capabilities; ask only when unresolved evidence materially changes the doc and cannot be settled from config or source. Never substitute a guessed manifest fallback.

## Phase 1: Plan Scan Strategy

From the evidenced framework/type, derive concrete patterns to search (naming, lifecycle, data access, configuration, and test organization). Treat architecture patterns such as repositories, CQRS, events, or domain entities as options to evaluate against observed boundaries, not mandatory structures.

Create work items for applicable phases and declared sub-agents. Do not create or dispatch work for skipped capability branches.

## Phase 2: Execute Scan (Parallel Sub-Agents)

Launch only the general-purpose sub-agents defined for applicable branches in the target entry. Give each sub-agent its **Think scope** + scan-target bullets verbatim from the entry. Each sub-agent MUST:

- Write findings incrementally after each file/section — NEVER batch at end
- Cite `file:line` for every pattern example
- Confidence: >80% document as pattern; 60-80% document as "observed (unverified)"; <60% omit

Each worker writes a **unique shard** under `tmp/reports/scan-{target}-{YYMMDD}-{HHMM}/`; workers never append to the same report. After the barrier, the main agent reads and validates every shard and is the **sole writer** of `tmp/reports/scan-{target}-{YYMMDD}-{HHMM}-report.md`.

> Honor every **conditional / ordered** sub-agent from the entry (for example, cross-service work only when service boundaries exist, or a BDD agent only when BDD artifacts are present). Honor any **CRITICAL security flag** the entry defines. Never create extra architecture or test components to fill a section.

## Phase 3: Analyze & Generate

Read the full report. Apply the fresh-eyes protocol:

**Round 1 (main agent):** Build section drafts from report findings, using the target entry's **Target Sections** + **Content Rules / exceptions**.

**Round 2 (fresh sub-agent, zero memory of Round 1):** Sub-agent re-reads report + draft doc independently and checks (apply the target entry's Round-2 verification specifics):

- Does every code example match an actual existing file (Glob verify)?
- Do class/token/variable names in examples match actual declarations (Grep verify)?
- Are required sections (Anti-Patterns / Coverage Report / Gap Analysis / M1-M2 Compliance / etc. as the target mandates) populated?
- Coverage gaps: which Target Sections have no examples?

**Round 3 only if Round 2 finds issues.** Max 3 rounds → escalate to user if unresolved. (Clean Round 1 ends the scan; fresh-eyes is mandatory only after issues are found and fixed.)

> **Authoring branch (init mode):** if the target entry defines one (e.g. `design-system` authors the canonical doc + token `.scss`), follow it exactly — including any **sentinel removal** (e.g. "First: REMOVE `PLACEHOLDER_MARKER_SCSS`") and regen-marker prepend.

## Phase 4: Write & Verify

1. **[BLOCKING] No-op scans write NOTHING — not even the stamp.** Build the full candidate doc (including `<!-- Last scanned: YYYY-MM-DD -->` at top), then compare it against the doc on disk with the shared guard, which ignores volatile stamps and whitespace:

   ```bash
   node .claude/hooks/lib/doc-stamp-guard.cjs --check <target doc> --candidate <candidate file>
   ```

   - **Exit 0 (CHANGED)** → write the candidate, stamp and all.
   - **Exit 3 (NO-OP)** → do **NOT** write the file, do **NOT** touch the stamp. Record the verification in the untracked local ledger instead, so the 60-day freshness gate still sees a recent scan without dirtying a tracked file:

     ```bash
     node .claude/hooks/lib/doc-stamp-guard.cjs --record-verified <doc filename>
     ```

     Then report `unchanged (no write)`. — why: a date-only rewrite is an unmergeable line at the top of a file many branches touch, so two branches that each merely RE-RAN this scan conflict over a date neither of them decided. The churn carries no information and costs a manual merge.

2. Surgical update only — preserve sections with no staleness, update only diverged sections; preserve manual annotations.
3. Verify (Glob check): **ALL** code example file paths exist — not just a sample of 5.
4. Verify (Grep check): class/token/variable names in examples match actual declarations.
5. Verify any target-mandated section is real, not hypothetical (Anti-Patterns / Coverage gaps / M1-M2 leaks / ports-from-config / etc.).
6. For code-oriented claims, validate call-chain or dependency claims with the available project graph; when no supported graph exists, trace relevant source callers directly.
7. **Convention classes (main agent only, never a worker):** when the valid project config declares convention classes, follow their configured additive merge procedure. Omitted optional convention configuration is a skip; do not create classes from guessed stack facts. Workers keep writing only their unique shard; the main agent stays the sole writer.
8. Report: sections updated / unchanged / coverage gaps / violations found / convention classes added-refreshed-kept.

> **Output-rule overrides:** apply the target entry's "Content Rules / exceptions" — e.g. `feature-spec` intentionally INCLUDES a directory tree (overriding the shared no-trees rule); `docs-index` intentionally OUTPUTS glob-verified counts (its counts are the deliverable); `e2e-tests`/`integration-tests` forbid hardcoded counts and use grep-expression statistics.

<!-- SCAN:prompt-enhance-final-step -->

## Final Step: Enhance Scanned Doc (MANDATORY)

**MUST ATTENTION** after a selected doc changes, run `/prompt-enhance <the target entry's doc>` when required by the target manifest; preserve project facts, evidence, and owner sections during enhancement. A skipped or unchanged target is not rewritten or enhanced.

**TaskCreate (last task when a doc changed):** `Run /prompt-enhance <target doc> on the scanned doc`

<!-- /SCAN:prompt-enhance-final-step -->

---

> **[IMPORTANT]** Use small tracked tasks for multi-phase or delegated scans. Do not ask whether to skip a clear one-target scan.

**Prerequisites:** **MUST ATTENTION READ** before executing:

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:scan-and-update-reference-doc -->

> **Scan & Update Reference Doc** — Surgical updates only, never full rewrite.
>
> 1. **Read existing doc** first — understand current structure and manual annotations
> 2. **Detect mode:** Placeholder (only headings, no content) → Init mode. Has content → Sync mode.
> 3. **Scan codebase** for current state (grep/glob for patterns, counts, file paths)
> 4. **Diff** findings vs doc content — identify stale sections only
> 5. **Update ONLY** sections where code diverged from doc. Preserve manual annotations.
> 6. **Update metadata** (date, counts, version) in frontmatter or header — but ONLY as part of a write that also changes content
> 7. **NEVER** rewrite entire doc. NEVER remove sections without evidence they're obsolete.
> 8. **NEVER write a no-op.** When the candidate differs from the doc on disk only by a date stamp or whitespace, write NOTHING — not the stamp either. Check with `node .claude/hooks/lib/doc-stamp-guard.cjs --check <doc> --candidate <file>` (exit 3 = no-op) and record the pass with `--record-verified <doc filename>`. — why: a date-only rewrite is an unmergeable line that makes two branches conflict over a value neither of them decided.

<!-- /SYNC:scan-and-update-reference-doc -->

<!-- SYNC:output-quality-principles -->

> **Output Quality** — Token efficiency without sacrificing quality.
>
> 1. No inventories/counts — AI can `grep | wc -l`. Counts go stale instantly
> 2. No directory trees — AI can `glob`/`ls`. Use 1-line path conventions
> 3. No TOCs — AI reads linearly. TOC wastes tokens
> 4. No examples that repeat what rules say — one example only if non-obvious
> 5. Lead with answer, not reasoning. Skip filler words and preamble
> 6. Sacrifice grammar for concision in reports
> 7. Unresolved questions at end, if any

<!-- /SYNC:output-quality-principles -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Project applicability gate.** Before applying a stack, layer, style, tool, or architecture rule, read the project's config and relevant references, then check local implementations. Treat framework examples as examples; honor explicit N/A and do not require a technology or convention the project does not use.
> **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
> **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Judge the environment before judging the code.** A bug report, failed test, error, or unexpected output is not proof of a code defect. Before and during adjudication, weigh environment causes as a competing hypothesis — setup, config, version and dependency state, service dependencies, stale artifacts or leftover state, and transient resource pressure (RAM, CPU, disk, handles, network). State the discriminator you ran; fix an environment cause in the environment, never by editing product code or weakening a test to absorb it.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:scan-and-update-reference-doc:reminder -->

**IMPORTANT MUST ATTENTION** read existing doc first, scan codebase, diff, surgical update only. Never rewrite entire doc.

<!-- /SYNC:scan-and-update-reference-doc:reminder -->

<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** output quality: no counts/trees/TOCs, 1 example per pattern, lead with answer. (Per-target exceptions in the manifest entry override this — e.g. feature-spec trees, docs-index counts.)

<!-- /SYNC:output-quality-principles:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `Agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `tmp/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

<!-- /SYNC:parallel-subagent-dispatch -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.
<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Scan one manifest-selected reference-doc target and deliver a surgical, evidence-backed update whose examples, coverage, and generated content are verified against the project without unsupported changes.

**IMPORTANT MUST ATTENTION** verify every emitted path, example, coverage claim, and generated projection against the real repository before reporting success.

**IMPORTANT MUST ATTENTION** resolve `--target` and load its manifest entry FIRST — never scan from memory of "what a backend/frontend/design scan does"

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** traced `file:line` proof per claim; confidence >80% to act.
- **Scan & Update Doc:** read existing doc, diff, surgical update only — never full rewrite.
- **Output Quality:** no counts/trees/TOCs; 1 example per pattern; lead with answer.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION Final Step:** enhance only a doc the scan actually changed; a no-op or evidence-backed skip requires no write or enhancement
**IMPORTANT MUST ATTENTION** break work into small `TaskCreate` tasks BEFORE starting — one task per sub-agent, one per phase
**IMPORTANT MUST ATTENTION** verify applicability before framework/type detection — all grep terms derive from evidence, never hardcoded
**IMPORTANT MUST ATTENTION** cite `file:line` for every pattern (confidence >80% to document; <60% omit)
**IMPORTANT MUST ATTENTION** use a project graph for code relationships when supported; otherwise trace source callers and state the unavailable graph as a limitation
**IMPORTANT MUST ATTENTION** sub-agents write findings incrementally after each file — NEVER batch at end (context loss)
**IMPORTANT MUST ATTENTION** read existing doc FIRST, diff findings, surgical update only — NEVER rewrite entire doc
**IMPORTANT MUST ATTENTION** multi-round fresh-eyes review — main agent rationalizes its own mistakes; Round 2 sub-agent catches what main agent dismissed
**IMPORTANT MUST ATTENTION** honor the target entry's Content-Rule exceptions, Special slivers, and Anti-Rationalization rows — they encode why this target differs from the others

**Anti-Rationalization (shared — the target entry adds its own rows):**

| Evasion                                           | Rebuttal                                                                            |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| "I know what a `<target>` scan does, skip the manifest entry" | The entry holds the BLOCKING gates, sub-agent count, and exceptions — scanning from memory drops them |
| "Framework/type already known, skip Phase 0 detection" | Phase 0 is BLOCKING — derive grep terms from evidence, not assumption               |
| "Doc has content, skip re-read"                   | Show section list extracted from doc as proof of re-read                            |
| "Examples look right"                             | Glob-verify ALL file paths + Grep-verify ALL names — looking right ≠ verified       |
| "Round 2 review not needed for small scan"        | Main agent rationalizes own mistakes. Fresh sub-agent is non-negotiable.            |

**[TASK-PLANNING]** Before acting, analyze task scope and break into small todo tasks and sub-tasks using TaskCreate.
