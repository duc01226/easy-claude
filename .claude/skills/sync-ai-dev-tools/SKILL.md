---
name: sync-ai-dev-tools
version: 2.1.0
description: '[AI & Tools] USER-INVOKED. Use when you (the USER) need to reconcile AI dev-tool SOURCE guidance (Claude↔Copilot skills/prompts/agents/instructions) and/or regenerate BOTH generated mirror surfaces by delegating to the two mirror skills (/sync-to-copilot FIRST then /sync-codex) with both divergence oracles.'
disable-model-invocation: false
---

## Quick Summary

> **Renamed:** formerly `/ai-dev-tools-sync` — that name no longer resolves as a slash command; use `/sync-ai-dev-tools`.

**Goal:** One USER-authorized entry point for keeping Claude, Codex, and GitHub Copilot working from equivalent guidance — covering BOTH halves of the pipeline:

- **Part A — Source reconciliation** (AI-judgment): research latest tool features, find gaps, and author the SOURCE (`.claude/**` skills/prompts/agents/instructions + root `CLAUDE.md`) so the tools have parity where their surfaces overlap.
- **Part B — Mirror regeneration** (mechanical): regenerate BOTH generated-mirror surfaces by delegating to the two mirror skills as **equal, first-class skill-steps** — `/sync-to-copilot --fast` FIRST, `/sync-codex` SECOND — then run both divergence oracles. The order is **mandatory, not a parallel phase** (see "Why this is ordered, not parallel"). Zero new generation logic — each skill wraps the generator it already owns.

This skill is the **single full-pipeline form**: it authors source parity AND closes the loop by regenerating the mirrors under explicit user authorization — no separate hand-off command.

**Two ways to run it:**

| You need…                                          | Do                                                      |
| -------------------------------------------------- | ------------------------------------------------------- |
| Reconcile source AND ship it to all mirrors        | Part A → Part B (full flow)                             |
| Only regenerate mirrors from already-edited source | Jump straight to **Part B** (skip Part A)               |
| Only edit source, defer the regen                  | Part A only; run Part B (or re-invoke this skill) later |

**Key Rules:**

- **Part B delegates to two equal skills in a MANDATORY order** — `/sync-to-copilot --fast` BEFORE `/sync-codex` (see "Why this is ordered, not parallel"); reversing OR running them concurrently makes `/sync-codex` RED via TC-WFPROTO-006.
- **NOT a parallel phase** — the two skills are equal peers but have a read-after-write data dependency (`/sync-codex` reads the copilot-written `common-protocol.instructions.md`); they MUST be sequential.
- **Fail-fast between Part B steps** — if `/sync-to-copilot --fast` exits non-zero, STOP; do NOT run `/sync-codex` over a half-regenerated copilot surface.
- **NEVER hand-edit a generated mirror** (`.github/copilot-*`, `.github/instructions/*`, `.agents/`, `.codex/`, `AGENTS.md`) — edit SOURCE (`.claude/**`, root `CLAUDE.md`) and re-run the matching skill.
- **Part B adds ZERO generation logic** — it invokes the two skills, which wrap the existing generators; any future change to either underlying script is inherited for free.
- **Both oracles gate completion** — `copilot:verify:divergence` AND `codex:verify:sync-divergence` must exit `0`.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# AI Dev Tools Sync

Reconcile AI dev-tool SOURCE guidance and regenerate the generated mirrors — one user-authorized command for full Claude/Codex/Copilot parity.

## When to Use

> **Scope vs related skills:** This is the **broadest, full-pipeline** sync — bidirectional source authoring (Claude↔Copilot) **plus** the ordered two-mirror regeneration. For Claude→Copilot **knowledge/docs only** → `/sync-to-copilot` (its `--fast` mode covers the `workflows.json` catalog-only sync, no AI pass). For the **codex/agents mirror only** (single generator) → `/sync-codex`. This skill is the only one that does source reconciliation AND closes the loop by running BOTH mirror generators in the forced order under explicit user authorization.

Activate this skill when:

- User asks to update Claude Code or Copilot setup, or wants both tools to work similarly
- User wants to add/modify skills, prompts, agents, or instructions and propagate them everywhere
- After ANY SOURCE change to `.claude/**` or root `CLAUDE.md` that must reach BOTH the Copilot and Codex/Agents mirrors (skill add/remove/edit, workflow change, hook change, SYNC-block propagation)
- As the single hand-off at the end of a `.claude`-framework change set, instead of remembering to run two generators in the right order

**NOT for**: editing mirrors directly (always edit SOURCE + re-run a generator), or AI self-service invocation (blocked by design — wait for the USER to invoke this skill).

## Quick Reference

| Source surface    | Managed/peer surface              | Location                                                         |
| ----------------- | --------------------------------- | ---------------------------------------------------------------- |
| SKILL.md          | Codex skill mirror                | `.claude/skills/` -> `.agents/skills/`                           |
| Context/workflows | Codex context mirror              | `.claude/**`, `.claude/workflows.json` -> `.codex/`, `AGENTS.md` |
| SKILL.md          | Copilot skill/prompt              | `.claude/skills/` + `.github/skills/` / `.github/prompts/`       |
| agents/\*.md      | agents/\*.md                      | `.github/agents/` (shared)                                       |
| CLAUDE.md         | Copilot + Codex root instructions | Root `CLAUDE.md`, `AGENTS.md`, `.github/`                        |
| -                 | chatmodes/\*.chatmode.md          | `.github/chatmodes/`                                             |

---

## Part A — Source Reconciliation

> AI-judgment work: research → gap analysis → author SOURCE. Skip to **Part B** if you only need to regenerate mirrors from already-edited source.

### Step 1: Understand Current Setup

Read these files to understand current configuration:

```
.claude/workflows/orchestration-protocol.md
.claude/workflows/primary-workflow.md
.github/copilot-instructions.md
.github/instructions/*.instructions.md
.github/AGENTS.md
CLAUDE.md
```

### Step 2: Research Latest Features

Search web for:

- "GitHub Copilot features setup 2026"
- "GitHub Copilot custom instructions agents skills prompts"
- "GitHub Copilot agent mode workspace context"

See [references/copilot-features.md](references/copilot-features.md) for feature catalog.

### Step 3: Identify Sync Opportunities

Compare capabilities and identify gaps:

- Skills missing in one tool host
- Inconsistent prompt/instruction behavior
- Agent definitions that differ

### Step 4: Implement Source Changes

For each change, edit SOURCE first:

1. **Skills**: Create in both `.claude/skills/` and `.github/skills/`
2. **Prompts**: Create in both `.claude/skills/` and `.github/prompts/`
3. **Instructions**: Update `CLAUDE.md` + `.github/copilot-instructions.md` + `.github/instructions/*.instructions.md`
4. **Agents**: Update `.github/agents/` (shared by both)

When source authoring is done and the codex/agents mirror must reflect it, proceed to **Part B** (this skill regenerates the mirror itself — no separate `/sync-codex` hand-off needed, because the USER already authorized the regen by invoking this skill).

---

## Part B — Mirror Regeneration

Part B delegates to the two mirror skills as **two equal, first-class skill-steps** — but in a **mandatory order**, not a parallel phase (see "Why this is ordered, not parallel"). Invoke them in sequence, fail-fast between them, then gate on both oracles.

### Step 1 — `/sync-to-copilot --fast` (FIRST)

Regenerates the Copilot surface (`.github/copilot-instructions.md` + `.github/instructions/*.instructions.md`) via the script only — **no AI enrichment pass** (enrichment is Part A judgment work, so Part B uses `--fast` to stay purely mechanical).

- If it exits non-zero → **STOP**. Do NOT proceed to `/sync-codex` over a stale/half-written copilot surface.

### Step 2 — `/sync-codex` (SECOND)

Runs the 9-stage codex generator (regenerates `.agents/`, `.codex/`, `AGENTS.md`, and — via its own `copilot` stage — the `.github/` copilot mirror). Its `tests` stage re-derives `common-protocol.instructions.md` from `workflows.json` and asserts equality with the **committed** copilot file; the `copilot` stage regenerates that file immediately before, so `/sync-codex` stays green on its own. Step 1 above still runs first as the canonical copilot-authoring step — its workflows-mirror regen now overlaps `/sync-codex`'s `copilot` stage (redundant-but-harmless reinforcement, not a dependency).

### Step 3 — Both divergence oracles (BOTH must exit `0`)

```bash
npm run copilot:verify:divergence
npm run codex:verify:sync-divergence
```

> **No npm / no root `package.json`** (e.g. a project that only copied `.claude`): both oracles are stages of the standalone orchestrator the npm scripts delegate to — run them with no package.json via
> `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --only=sync-divergence,copilot-divergence`.

**Exit gate:** Step 1, Step 2, and both Step 3 oracles must exit `0`. Any non-zero → stop and fix before treating the mirrors as synced.

> **Underlying commands (for debugging or non-skill contexts):** `/sync-to-copilot --fast` wraps `node .claude/scripts/sync-copilot-workflows.cjs` (preview with `--dry-run`); `/sync-codex` wraps `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs` (debug a stage with `--only=<stage> --verbose`). Part B invokes the **skills**, not the raw scripts — the scripts are listed only so a human can reproduce a single step in isolation.

---

## Why this is ordered, not parallel

The two skills are **equal peers**, but they CANNOT run as a true parallel phase — they have a hard **read-after-write data dependency**. `/sync-codex`'s `tests` stage runs `review-workflow-tooling-regressions.test.mjs` (TC-WFPROTO-006, `.claude/scripts/codex/tests/review-workflow-tooling-regressions.test.mjs:84`), which reads the **committed** `.github/instructions/common-protocol.instructions.md` — the file written by `/sync-to-copilot` — and asserts byte-equality with fresh generator output (`:90-94`). Running the two concurrently races: `/sync-codex` can read a stale or half-written copilot file and go RED intermittently. Running `/sync-to-copilot --fast` FIRST guarantees a fresh committed copilot surface before `/sync-codex` verifies against it. A human running two commands can reverse or overlap them; this skill bakes the order in so it can't be gotten wrong. (Canonical constraint: TC-WFPROTO-006.)

---

## How It Works

- **Part A owns:** source-authoring judgment (research → gap analysis → edit `.claude/**` + `CLAUDE.md`).
- **Part B owns ONLY:** the skill-step ordering + the fail-fast seam between the two skills + the two-oracle gate. It adds NO generation logic.
- **Part B delegates to (unchanged):** `/sync-to-copilot --fast` (which wraps `.claude/scripts/sync-copilot-workflows.cjs`, the copilot generator) and `/sync-codex` (which wraps `.claude/skills/sync-codex/scripts/run-codex-sync.mjs`, the codex generator's 12 fail-fast stages).
- **No `workflows.json` entry** — this is a standalone utility skill (like `/sync-codex`), not part of any workflow sequence.
- **Delegated dependency:** the `/sync-codex` and `/sync-to-copilot` skills are load-bearing-retained (`/sync-codex` is DO-NOT-REMOVE infra; `/sync-to-copilot --fast` is the sole script-only copilot regen path — the former `/sync-copilot-workflows` skill was absorbed into `/sync-to-copilot --fast`, the underlying script keeps its name). Any future plan that removes or renames either skill MUST repoint or retire this skill's Part B first.

## Compatibility Notes

- Copilot reads `.claude/skills/` automatically (backward compatibility)
- Both read `.github/prompts/*.prompt.md`
- Both read `.github/agents/*.md`
- Both read `AGENTS.md` in root or `.github/`
- Both support path-based instruction files via `applyTo` in frontmatter

## References

- [Copilot Features Catalog](references/copilot-features.md)
- [Sync Patterns](references/sync-patterns.md)

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

## Closing Reminders

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** Apply critical + sequential thinking; traced proof, confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** in Part B, invoke `/sync-to-copilot --fast` BEFORE `/sync-codex` — reversing OR running them concurrently makes `/sync-codex` RED (read-after-write on the committed copilot file, TC-WFPROTO-006)
- **MANDATORY IMPORTANT MUST ATTENTION** treat the two skills as equal peers in a MANDATORY sequence — NEVER as a parallel phase
- **MANDATORY IMPORTANT MUST ATTENTION** fail fast — if `/sync-to-copilot --fast` exits non-zero, STOP before invoking `/sync-codex`
- **MANDATORY IMPORTANT MUST ATTENTION** edit SOURCE (`.claude/**`, root `CLAUDE.md`) then re-run the matching skill; NEVER hand-edit `.github/copilot-*`, `.github/instructions/*`, `.agents/`, `.codex/`, or `AGENTS.md`
- **MANDATORY IMPORTANT MUST ATTENTION** gate completion on BOTH oracles (`copilot:verify:divergence` AND `codex:verify:sync-divergence`) exiting `0`
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act); add a final review todo task to verify work quality

**Anti-Rationalization:**

| Evasion                                            | Rebuttal                                                                                                                                                                      |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "They're equal peers, so run them in parallel"     | No. `/sync-codex` reads the copilot-written `common-protocol.instructions.md` (TC-WFPROTO-006); concurrent = read-after-write race → flaky RED. Equal peers, MANDATORY order. |
| "Run codex first, copilot second — same thing"     | No. `/sync-codex` verifies against the committed copilot file; stale copilot → RED. `/sync-to-copilot --fast` FIRST.                                                          |
| "Copilot step printed a warning, run codex anyway" | Fail-fast seam exists for this. Non-zero `/sync-to-copilot` exit → STOP; fix before `/sync-codex`.                                                                            |
| "Use full `/sync-to-copilot` in Part B"            | Part B is mechanical — use `--fast` (script only). The AI enrichment pass is Part A judgment work.                                                                            |
| "Just hand-edit the mirror to match"               | Next sync overwrites it. Edit SOURCE, re-run the matching skill.                                                                                                              |
| "Skip the oracles, the skills succeeded"           | Skills mutating ≠ surfaces in parity. Both divergence oracles must exit 0.                                                                                                    |

> **[FAILS FAST]** In Part B, a non-zero `/sync-to-copilot --fast` exit aborts before `/sync-codex`. `/sync-codex` is itself fail-fast across its 12 stages.
> **[ORDERED, NOT PARALLEL]** Part B invokes `/sync-to-copilot --fast` FIRST, `/sync-codex` SECOND — two equal skills in a MANDATORY sequence. They are NOT a parallel phase: BOTH write `.github/**` (Step 1 directly; `/sync-codex` via its `copilot` stage, which TC-WFPROTO-006 then byte-checks), so concurrent execution would race on those files. Sequential order avoids the write race — note `/sync-codex` no longer _depends_ on Step 1's output (it regenerates the copilot mirror itself), so the order is now race-avoidance, not a correctness dependency.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->
