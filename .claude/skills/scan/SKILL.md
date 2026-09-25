---
name: scan
version: 1.0.0
description: '[Documentation] Use when a workflow step or the user asks for one project-reference doc to be regenerated. Flag: --target=<doc key> (project-structure, code-review-rules, domain-entities, docs-index); generic-reference-doc also requires --filename.'
---

## Quick Summary

**Goal:** Scan one selected built-in or explicitly generic custom reference doc and deliver a surgical, evidence-backed update whose examples, coverage, and generated content are verified against the project without unsupported changes.

**Summary:**

- **Purpose:** Run one selected, applicable manifest target; its entry owns the output doc, capability evidence, detection, agents, sections, exceptions, and enhancement requirements.
- **Ordered path:** Validate required config → resolve key/entry and selected output → check applicability → assess mode/type/config/graph → scan → write/verify → enhance + AI-discovery gate (changed doc only) → report.
- **Modes/gates:** Init/Sync and target-defined Force; `kind: orchestrator` uses its procedure; unknown key STOPs; unsupported capability is a reported skip, not a guessed fallback.
- **Evidence:** Use real `file:line` examples, incremental unique reports, surgical writes, all-path/name checks, target exceptions, and graph checks when the project supports them.

**Workflow:**

1. **Validate** — Confirm the configured project-config file exists and is schema-valid.
2. **Resolve** — Parse `--target=<key>`, load its manifest entry, and confirm the output is selected or separately owned as an always-on input.
3. **Assess** — Check capability evidence before running target-specific Phase 0 detection.
4. **Scan** — Run only applicable declared work and capture `file:line` evidence.
5. **Write** — Surgically update the selected reference doc; verify all generated claims and examples.
6. **Enhance + discovery gate** — For a changed doc: `/prompt-enhance`, then the AI-discovery gate (purpose + critical rules on top, reminders at the bottom when long, trigger-based pointers to existing docs, reachable from the docs index).
7. **Report** — Persist findings and return complete, unchanged, skipped, or blocked status with evidence.

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

**Then run the AI-discovery gate (`SYNC:ai-discovery-doc-quality`) on the enhanced doc:** first screen states purpose, when to read it and its critical rules · a long or rule-bearing doc ends with closing reminders · every pointer to another doc is `read <path> when <situation>` with an existing target · the doc is reachable from the docs index (a missing route is reported for the `docs-index` target, not patched here). Fix a failure inside this doc before reporting; the gate is surgical and never licenses a full rewrite.

<!-- /SCAN:prompt-enhance-final-step -->

---

> **[IMPORTANT]** Use small tracked tasks for multi-phase or delegated scans. Do not ask whether to skip a clear one-target scan.

**Prerequisites:** **MUST ATTENTION READ** before executing:

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-discovery-doc-quality` — Keep AI-read docs discoverable: rules first, routed pointers, closing reminders; writing a doc that an agent reads → .claude/skills/shared/protocols/ai-discovery-doc-quality.md
- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `output-quality-principles` — Token-efficient output without losing quality; writing generated docs or reports → .claude/skills/shared/protocols/output-quality-principles.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `scan-and-update-reference-doc` — Surgical updates to reference docs, never full rewrites; scanning or updating a reference doc → .claude/skills/shared/protocols/scan-and-update-reference-doc.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:scan-and-update-reference-doc:reminder -->

**IMPORTANT MUST ATTENTION** read existing doc first, scan codebase, diff, surgical update only. Never rewrite entire doc.

<!-- /SYNC:scan-and-update-reference-doc:reminder -->

<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** output quality: no counts/trees/TOCs, 1 example per pattern, lead with answer. (Per-target exceptions in the manifest entry override this — e.g. feature-spec trees, docs-index counts.)

<!-- /SYNC:output-quality-principles:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-discovery-doc-quality:reminder -->

**MUST ATTENTION** AI-read docs: purpose + critical rules on top, closing reminders at the bottom when long; route to other docs as `read <path> when <situation>` with existing targets only, no orphan docs, N/A named once as a skip; token-efficient per `/prompt-enhance`; fix generated docs at their source; run the final gate on every changed doc.

<!-- /SYNC:ai-discovery-doc-quality:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Scan one manifest-selected reference-doc target and deliver a surgical, evidence-backed update whose examples, coverage, and generated content are verified against the project without unsupported changes.

**IMPORTANT MUST ATTENTION** verify every emitted path, example, coverage claim, and generated projection against the real repository before reporting success.

**IMPORTANT MUST ATTENTION** resolve `--target` and load its manifest entry FIRST — never scan from memory of "what a backend/frontend/design scan does"

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** traced `file:line` proof per claim; confidence >80% to act.
- **Scan & Update Doc:** read existing doc, diff, surgical update only — never full rewrite.
- **Output Quality:** no counts/trees/TOCs; 1 example per pattern; lead with answer.
- **AI-Discovery Doc Quality:** purpose + critical rules on top, reminders at the bottom when long, trigger-based pointers to existing docs, reachable from the docs index.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION Final Step:** enhance only a doc the scan actually changed, then pass the AI-discovery gate on it; a no-op or evidence-backed skip requires no write or enhancement
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
