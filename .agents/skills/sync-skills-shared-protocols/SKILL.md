---
name: sync-skills-shared-protocols
description: '[Skill Management] Use when shared protocol checklists change and need propagating across skills.'
disable-model-invocation: true
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

**Goal:** Two operations — (A) propagate updated content for existing SYNC: blocks across all skills, or (B) add a new SYNC: block to all skill/agent files that don't have it yet.

**Summary:** Use `$sync-skills-shared-protocols` for Operation A (update existing blocks) or Operation B (add a new tiered block); `/sync-protocols` no longer resolves.

**Canonical source:** `.claude/skills/shared/sync-inline-versions.md`

**Key Rules:** Edit the canonical source first; change only SYNC block bodies; sync a `:reminder` block the same mechanical way — by passing the `{tag}:reminder` tag to the script — and only when asked; use the script for bulk insertion; verify balance, parity, and the computed target inventory.

**Workflow:** Choose Operation A or B → follow its canonical-source and target-inventory steps → verify before reporting.

## Workflow

### Operation A: Update Existing Block Content

Use when a SYNC: block already exists in files and push updated content to all of them.

### Step 1: Identify What Changed

If user specifies a tag name (e.g., `sync-skills-shared-protocols understand-code-first`):

- Sync only that tag

If no tag specified:

- Read `sync-inline-versions.md`
- Ask user which tag(s) to sync, or "all"

### Step 2: Read Canonical Content

For each tag to sync:

1. Read `.claude/skills/shared/sync-inline-versions.md`
2. Extract content under `## SYNC:{tag-name}` heading (everything between that heading and the next `---` or `## SYNC:`)

### Step 3: Find All Skills with Tag

```bash
grep -rl "SYNC:{tag-name}" .claude/skills/*/SKILL.md
```

### Step 4: Replace Content in Each Skill

For each file found:

1. Find `<!-- SYNC:{tag-name} -->` open tag
2. Find `<!-- /SYNC:{tag-name} -->` close tag
3. Replace everything between them with the canonical content
4. Do NOT touch `:reminder` blocks while syncing the plain tag — they are a SEPARATE fence pair with their own canonical section, and the script never crosses between them (`sync-update-blocks.py:64-66`). Sync one by passing `{tag}:reminder` as its own tag.

### Step 5: Verify

Run these checks after all replacements:

```python
# 1. SYNC tag balance (all opens have matching closes)
# 2. Content matches canonical source
# 3. No content outside SYNC blocks was modified
```

Report:

- Tags synced
- Files updated (count)
- Any balance issues

### Step 6: Reminder Blocks

`:reminder` blocks (`<!-- SYNC:{tag}:reminder -->`) are 1-line summaries at the bottom of skills for AI recency attention (Primacy-Recency).

**Where a canonical `:reminder` section exists, they ARE mechanically syncable — do NOT hand-edit those.** `sync-update-blocks.py` treats `{tag}:reminder` as an ordinary tag: it reads the `## SYNC:{tag}:reminder` section from the canonical source and replaces the matching fence pair (`sync-update-blocks.py:11-14,25-35`). Hand-writing such a reminder desynchronizes it from the canonical text the very next time the script runs.

> **Coverage is PARTIAL — check before you rely on the script.** The canonical source does NOT yet carry a `:reminder` section for every reminder tag in use: roughly half the live reminder tags have no canonical section, and running the script on one of those fails hard with `ERROR: section not found` (`sync-update-blocks.py:33`) rather than doing nothing. Confirm the section exists first:
>
> ```bash
> grep -n "^## SYNC:{tag}:reminder" .claude/skills/shared/<canonical-source>.md
> ```
>
> **Section present** → sync it with the script; never hand-edit. **Section absent** → the script cannot serve you at all. Add the canonical `## SYNC:{tag}:reminder` section first and then sync, so the reminder becomes managed like the rest. Do not silently hand-edit the fenced body as a workaround: that leaves a fenced block the script believes it owns and will overwrite the moment the section appears.

What is true is that a reminder is a SEPARATE tag from its parent, not a shorter view of it: syncing `foo` never touches `foo:reminder`, because the script's fence regexes require whitespace before the closing marker and so cannot cross between the two (`sync-update-blocks.py:64-66`). Update a reminder by running the script on `{tag}:reminder` explicitly, after editing that section in the canonical source — and only when the user asks for reminders too.

```bash
# Windows (dry-run first, then the real run)
py -3 .claude/scripts/sync-update-blocks.py --dry-run {tag}:reminder
py -3 .claude/scripts/sync-update-blocks.py {tag}:reminder
# macOS/Linux (dry-run first, then the real run)
python3 .claude/scripts/sync-update-blocks.py --dry-run {tag}:reminder
python3 .claude/scripts/sync-update-blocks.py {tag}:reminder
```

### Step 7: OVERRIDE Blocks — the sanctioned divergence

Not every carrier can take the canonical body verbatim. A review skill that must route its
sub-agents to a DIFFERENT specialist needs the same protocol substance with a different
`agent_type`. That is what `<!-- OVERRIDE:{tag} -->` … `<!-- /OVERRIDE:{tag} -->` is for.

**The contract:**

- **`sync-update-blocks.py` does NOT touch an OVERRIDE block.** It is an intentional per-skill
  divergence, so the equality property that binds `SYNC:` carriers is deliberately not applied.
- **Divergence is limited to ROUTING, not substance — for `review-protocol-injection`.** The
  `sync-carrier-parity` suite's OVERRIDE-SUBSTANCE GUARD pins each `OVERRIDE:review-protocol-injection`
  copy to the canonical protocol COUNT and to each protocol's header AND body verbatim; only the
  Subagent-Type / Agent-Call / Reference-Docs sections may differ. Silent staleness on substance is
  the failure mode it exists to catch.
- **The carrier set is pinned — for that tag only.** The guard asserts exactly 3
  `OVERRIDE:review-protocol-injection` carriers (`sync-carrier-parity.test.cjs:287-292`), so a new
  one appearing — or an existing one vanishing — fails the suite rather than passing quietly.
- **`OVERRIDE:fresh-context-review` has NO sensor.** It is excluded from the SYNC equality property
  by design, is outside the substance guard above (`sync-carrier-parity.test.cjs:183` scopes the
  whole guard to `review-protocol-injection`), and `verify-sync-divergence.mjs` does not handle
  OVERRIDE at all. Those three copies drift silently — canonical's report-only role-boundary clause
  is already absent from all three. **Hand-merge them deliberately; nothing will tell you.**
- **Both markers are recognized as fences.** `check-subagent-routing.cjs` treats `SYNC` and
  `OVERRIDE` openers/closers identically for balance checking.

**Live carriers (3 skills × 2 tags):** `architecture-review`, `integration-test-review`, and
`ui-review` each override `fresh-context-review` and `review-protocol-injection`.

**Maintaining one:** edit the canonical section, run the script for the `SYNC:` carriers, then
**hand-merge** the same substance change into each OVERRIDE block, preserving its
`agent_type` customization. The guard tells you if you missed a `review-protocol-injection`
carrier — it will NOT tell you if you missed a `fresh-context-review` one.

**Do NOT reach for OVERRIDE to avoid a sync conflict.** It is for a carrier that genuinely must
dispatch elsewhere. Any other divergence belongs in the canonical source, so every carrier gets it.

---

### Operation B: Add a New Tiered Block

Use when a NEW SYNC: block needs tiered propagation. Derive the on-disk target inventory at runtime; never copy a fixed skill or agent count into this contract.

- `SKILL_BLOCK_ORDER` is the base tier for every skill.
- `ORCHESTRATOR_SKILL_BLOCK_ORDER` extends that base only for skills in `ORCHESTRATOR_SKILLS`.
- Agent tiers remain independently governed by the injector's explicit agent sets.

#### Agent quality parity and skill connections

When the new block applies to work performed by a sub-agent, update the canonical agent matrix before injection:

1. Add the applicable quality tag(s) to `AGENT_QUALITY_BLOCKS` in `.claude/scripts/agent_protocol_matrix.py`; keep orchestration-only blocks out of leaf agents.
2. Confirm every agent has a valid `AGENT_SKILL_CONNECTIONS` entry to its canonical task skill(s), and add the carrier owner for any newly propagated review/test protocol.
3. Run `py -3 .claude/scripts/agent_protocol_matrix.py --validate` (macOS/Linux: `python3` instead of `py -3`), then run both `inject_agent_protocol_blocks.py` and `inject_agent_skill_connections.py` (dry-run first, real run second).
4. Verify the generated `AGENT-SKILL-CONNECTIONS` sections and the agent-universal-rules suite before regenerating mirrors.

The connection map is explicit routing metadata. It links the agent prompt to the canonical skill procedure while the matrix injects only applicable quality blocks; do not blanket-copy skill bodies into a leaf agent when that would import caller-owned orchestration.

This is a bulk-insert operation, not a content update. Verify the computed target set before writing so orchestration-only rules never leak into every skill.

**When to use:** A new protocol rule is added to `.claude/skills/shared/sync-inline-versions.md` and should appear in static carriers (`CLAUDE.md`, `AGENTS.md`, Codex, skills, and agents).

#### Step B1: Add block content to canonical source

Edit `.claude/skills/shared/sync-inline-versions.md` and add a new section:

```markdown
## SYNC:{new-block-name}

> **[Rule content here]**

---
```

#### Step B2: Add block to `sync-hooks-to-skills.py`

Edit `.claude/scripts/sync-hooks-to-skills.py`:

1. Add entry to `BLOCKS` dict:

```python
BLOCKS = {
    # ... existing blocks ...
    "new-block-name": """\
<!-- SYNC:new-block-name -->

> **[Full block content here — exactly as it should appear in files]**

<!-- /SYNC:new-block-name -->""",
}
```

2. Add 1-line reminder to `REMINDERS` dict:

```python
REMINDERS = {
# ... existing reminders ...
"new-block-name": """\

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.

<!-- SYNC:new-block-name:reminder -->
**MUST ATTENTION** [one-line summary of the rule].
<!-- /SYNC:new-block-name:reminder -->""",
}
```

3. Add the block name to the relevant tier list(s) (controls which targets receive it + insertion order):

```python
# Skills-3: the two universal blocks + the orchestration block. Do NOT add
# agent-only rules here. `parallel-subagent-dispatch` is deliberately SKILL-ONLY
# — not because an agent cannot spawn, but because an agent receives ONE brief an
# orchestrator has ALREADY partitioned, so re-running the partitioning protocol in
# the leaf re-decides an upstream decision. It is ALSO declared in
# agent_protocol_matrix.py EXCLUDED_ORCHESTRATION and in the TC-UAR-017
# AGENT_ADOPTION_EXEMPT set (see "Skill-only blocks" below).
SKILL_BLOCK_ORDER = ["critical-thinking-mindset", "ai-mistake-prevention",
                     "parallel-subagent-dispatch"]

# Core-6: every agent (skills/SKILL.md is unaffected).
CORE_BLOCK_ORDER = ["critical-thinking-mindset", "ai-mistake-prevention",
                    "sequential-thinking-protocol", "task-tracking-external-report",
                    "project-reference-docs-guide", "agent-bootstrap"]

# Code-10: Core-6 + code-investigation blocks, for agents that read/review AND fix code.
CODE_BLOCK_ORDER = CORE_BLOCK_ORDER + ["understand-code-first", "evidence-based-reasoning",
                                       "cross-service-check", "fix-layer-accountability"]

# Readonly-Code-8: Core-6 + reading-discipline blocks only, for read-only/design
# agents that locate/read/design code but never fix a layer or cross a service
# boundary (excludes the two mutation-oriented blocks).
READONLY_CODE_BLOCK_ORDER = CORE_BLOCK_ORDER + ["understand-code-first", "evidence-based-reasoning"]
```

**Agent tiering:** agents no longer share one block list. `find_target_files()` classifies each `.claude/agents/*.md` by explicit membership in one of three sets:

- `CODE_AGENTS` (17 code/review/fix agents → `CODE_BLOCK_ORDER`, Code-10).
- `READONLY_CODE_AGENTS` (2 read-only/design agents — `researcher`, `ui-ux-designer` → `READONLY_CODE_BLOCK_ORDER`, Core-6 + understand-code-first + evidence-based-reasoning; the mutation-oriented `cross-service-check` + `fix-layer-accountability` are deliberately excluded to save tokens on agents that only locate/read/design code).
- `CORE_ONLY_AGENTS` (4 non-code agents → `CORE_BLOCK_ORDER`, Core-6).

An agent in **none of the three sets (or in more than one)** raises `SystemExit` — no silent default; classify it before the script will run. Skills always use `SKILL_BLOCK_ORDER`. Pass `--agents-only` to scope a run to agents (skip skills).

> **Adding a new agent:** add its basename to exactly one of `CODE_AGENTS` / `READONLY_CODE_AGENTS` / `CORE_ONLY_AGENTS` in `sync-hooks-to-skills.py` **and** in the regression suite `.claude/hooks/tests/suites/agent-universal-rules.test.cjs` (TC-UAR-005 fails until both agree). The two enforce one invariant.
>
> **Note — the inserter is insert-only.** Moving an agent from CODE to READONLY_CODE (or otherwise dropping a block from its tier) does NOT remove the now-excess SYNC block from its `.md` on disk — `process_file` only inserts missing blocks. Strip the excess block(s) from the agent `.md` source by hand (or a scoped one-off) so the regression suite's tier assertions pass.

**Skill-only blocks (orchestration).** A block in `SKILL_BLOCK_ORDER` but in NO agent tier reaches every skill and zero agents. TC-UAR-017 treats that shape as drift by default — a protocol that reached ≥3 skills but no agent is usually an oversight — so declare a genuinely skill-only block in BOTH lists:

- `.claude/hooks/tests/suites/agent-universal-rules.test.cjs` → `AGENT_ADOPTION_EXEMPT` — the ONLY list TC-UAR-017 reads. Omit the block here and the suite fails.
- `.claude/scripts/agent_protocol_matrix.py` → `EXCLUDED_ORCHESTRATION` — read only by that file's own `--validate` check (b) (`agent_protocol_matrix.py:481`), which rejects a per-agent manifest that assigns an excluded block without an `ORCHESTRATION_WHITELIST` entry. Omit it here and no test fails; the manifest is simply free to assign the block to an agent.

> **No cross-check exists.** The two lists are enforced by two SEPARATE mechanisms and nothing verifies they agree — TC-UAR-017 never reads `EXCLUDED_ORCHESTRATION` (it appears in that test file only in a comment and a failure-message string). Keeping them in step is a **convention**, not an enforced invariant: update both by hand in the same change.

The bar for that exemption is caller-side ownership: the block must drive orchestration the leaf either **cannot perform** (it has no access to the parent conversation, workflow state, or the user) or **has no basis to perform** (the decision was already made upstream before its brief was issued). Current members — `nested-task-creation`, `subagent-return-contract`, `sub-agent-selection`, `parallel-phase-advancement`, `parallel-subagent-dispatch`, `goal-contract-satisfaction-loop` — expand workflow steps, choose/brief sub-agents, partition a task list into parallel waves, or drive a user-facing convergence loop. `parallel-subagent-dispatch` is the second kind: an agent CAN spawn (agent files generally carry no `tools:` restriction), but it receives one already-partitioned brief, so re-running PAR/SEQ tagging inside it re-decides upstream's call. An agent that legitimately fans out carries that instruction in its own `.claude/agents/*.md` definition instead.

#### Step B3: Run the script (dry-run first)

```bash
python .claude/scripts/sync-hooks-to-skills.py --dry-run --verbose
# Verify: expected N updated, 0 errors

python .claude/scripts/sync-hooks-to-skills.py --verbose
# Verify: the computed on-disk tier inventory was processed; already-current targets skip
```

#### Step B4: Verify

```bash
# Confirm target files now contain the new block. Expected count is TIER-AWARE.
# The skill tier and the agent tiers are INDEPENDENT lists — a block reaches
# agents only if it is ALSO in an agent tier, so union the rows that apply:
#   - block in SKILL_BLOCK_ORDER ONLY     → every discovered skill, 0 agents
#                                           (skill-only ⇒ must be declared in BOTH
#                                            exemption lists — see "Skill-only blocks")
#   - block in SKILL_BLOCK_ORDER + CORE   → every discovered skill + every discovered agent
#   - block in CORE_BLOCK_ORDER           → every discovered agent (skills excluded)
#   - block in READONLY_CODE_BLOCK_ORDER  → 21 agents (17 code + 4 readonly-code)
#   - block in CODE_BLOCK_ORDER           → 17 code agents only
grep -rl "SYNC:new-block-name" .claude/skills/*/SKILL.md .claude/agents/*.md | wc -l

# Then run the agent-coverage regression suite — it asserts tier membership,
# disjointness, and SYNC tag balance across the discovered agent inventory.
node .claude/hooks/tests/run-all-tests.cjs --filter=agent-universal
```

Check a representative file of each affected tier manually to confirm placement and formatting.

---

## Usage Examples

```
$sync-skills-shared-protocols understand-code-first     # Sync one tag (Operation A)
$sync-skills-shared-protocols all                        # Sync all tags (Operation A)
$sync-skills-shared-protocols                            # Interactive — asks which tags
# Adding new block: use Operation B workflow above (script-driven)
```

## Rules

- ALWAYS edit `sync-inline-versions.md` FIRST, then run this skill
- NEVER modify content outside `<!-- SYNC:tag -->` boundaries
- NEVER touch `:reminder` blocks unless explicitly asked — and when asked, sync them WITH THE SCRIPT on the `{tag}:reminder` tag; never hand-write one
- If close tag is missing in a target file, SKIP that file and report it as an error
- Use the `Grep` tool (not shell grep) per project conventions
- Verify tag balance after every sync run
- For bulk-insert (Operation B): use `sync-hooks-to-skills.py` — NEVER do it manually across 288 files

---

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `shared-protocol-duplication-policy` — Protocol copies in carriers are intentional: edit the canonical source, then propagate; editing a shared protocol or its carriers → .claude/skills/shared/protocols/shared-protocol-duplication-policy.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:shared-protocol-duplication-policy:reminder -->

**IMPORTANT MUST ATTENTION** follow the hybrid duplication policy: edit `.claude/skills/shared/sync-inline-versions.md` first, then propagate to skills AND agents and rebuild the projection. Skills keep guide lines (a hook delivers the full text; the file path is the fallback); the five review-family skills, SYNC bodies in `references/*.md`, agents and reviewer prompts keep full bodies inline.

<!-- /SYNC:shared-protocol-duplication-policy:reminder -->

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

**IMPORTANT MUST ATTENTION Goal:** Two operations — (A) propagate updated content for existing SYNC: blocks across all skills, or (B) add a new SYNC: block to all skill/agent files that don't have it yet.

**IMPORTANT MUST ATTENTION Workflow:** Operation A: identify tag(s) → read canonical content → find targets → replace only block bodies → verify balance/parity/outside-block diff → handle reminders as separately requested; Operation B: edit canonical → update inserter tiers → dry-run → run → verify tier coverage and balance → report tags/files/errors.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** apply critical+sequential thinking; trace every claim, confidence >80%.
- **Shared Protocol Duplication:** follow the hybrid duplication policy (`SYNC:shared-protocol-duplication-policy`) — skills keep guide lines, the review-family skills and agents keep full bodies, and only the sync tool converts or propagates them.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** edit `sync-inline-versions.md` FIRST before syncing to skills
**IMPORTANT MUST ATTENTION** verify SYNC tag balance after every sync run
**IMPORTANT MUST ATTENTION** NEVER modify content outside `<!-- SYNC:tag -->` boundaries
**IMPORTANT MUST ATTENTION** skip files with missing close tags and report as errors

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

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
