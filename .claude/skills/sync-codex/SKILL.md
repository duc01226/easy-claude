---
name: sync-codex
description: '[Codex] Use when you need to run the full cross-surface mirror sync + verify pipeline (migrate → hooks → context → copilot → verify) standalone, no npm/package JSON needed.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Run the full cross-surface pipeline standalone — equivalent to `npm run sync:all && npm run verify:all` (codex + copilot, sync + verify) without `package.json` or `npm`. This runner is the **single source of truth** for the pipeline; the `package.json` `sync:all`/`verify:all` scripts delegate to it, so a project that only copied `.claude` (no root `package.json`) runs the identical pipeline.

> **Renamed:** formerly `/codex-sync` — that name no longer resolves as a slash command; use `/sync-codex`.

Also bootstraps team-wide Codex completion notifications by copying the portable `.claude/scripts/codex/codex-notify.mjs` helper into `.codex/scripts/codex/` and upserting notification plus TUI status-line keys into `.codex/config.toml`.

**Workflow:**

1. **Run** — `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`
2. **Verify** — Exit code `0` = pass; check stdout summary
3. **Inspect** — On failure, re-run failing stage manually with `--only=<stage>` and `--verbose`

**Key Rules:**

- MUST run all 12 stages in order — orchestrator fails fast on first non-zero exit
- NEVER edit `.agents/skills/sync-codex/**` (auto-mirror) — edit `.claude/skills/sync-codex/**` source instead
- `.claude` is the source for skills/workflows/hooks; generated acceptance targets are `.agents/skills/**`, `.codex/CODEX_CONTEXT.md`, and `AGENTS.md`
- Stages 1-4 mutate `.agents/skills/`, `.codex/`, `AGENTS.md`, `.github/` (Copilot mirror); stages 5-12 are read-only verifiers (codex + copilot tooling tests, the 4 codex verifiers, and BOTH cross-surface divergence oracles)
- Stage 1 upserts `[tui].status_line` to show model+reasoning, current directory, project root, context used, five-hour limit, and weekly limit by default
- Stage 3 mirrors full `CLAUDE.md` into `AGENTS.md`, then appends the generated Codex hook/context mirror and shared AI-SDD markers so Codex has both source instructions and hookless parity context
- Stage 1 must not inline `docs/project-reference/lessons.md` content into `.agents/skills/**`; generated skill mirrors reference the project-reference loading gate instead
- The `SYNC:ai-sdd-artifact-contract` marker must appear after sync in `.codex/CODEX_CONTEXT.md` and `AGENTS.md`
- No npm dependency — pure `node` + spawned subprocesses
- Idempotent — safe to re-run; second run produces only timestamp diffs

## Bootstrap Gate (when AGENTS.md is missing or incomplete)

This skill is the route the agent-files bootstrap gate offers for a missing — **or incomplete** —
root `AGENTS.md`, the generated Codex mirror of `CLAUDE.md`. Because Codex has no hooks, the universal
session-start guides must be embedded in `AGENTS.md` directly; stage 3 produces that mirror (full
`CLAUDE.md` copy, so the `<!-- CK:UNIVERSAL-GUIDES v1 -->` sentinel propagates) + hookless-parity context.

"Incomplete" means the file exists but lacks the universal guides — same three-state detection as the
CLAUDE.md route (`missing` → init, `incomplete` → update smart-merge preserving project content, `ok`
→ no block), decided by the shared sentinel-then-anchors check.

Detection is shared with
the CLAUDE.md route via `.claude/hooks/lib/agent-files-state.cjs`. Opt out of completeness enforcement
with `portability.requireUniversalGuides: false` in `docs/project-config.json` (default `true`);
`skip init` dismisses both hooks for 24h. Generate `CLAUDE.md` first (via `/claude-md-init`) — stage 3
reads it as the mirror source.

## Stages

12 stages, sequential — the full `npm run sync:all && npm run verify:all` pipeline (the npm scripts delegate here). Stages 1-4 mutate; 5-12 verify (read-only):

| #   | Stage              | Script                                                       | Effect                                                                                                                                                                                                 |
| --- | ------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | migrate            | `.claude/scripts/codex/migrate-claude-to-codex.mjs`          | Migrate Claude agents → `.codex/agents/`; mirror skills → `.agents/skills/`; setup Codex notifications                                                                                                 |
| 2   | hooks              | `.claude/scripts/codex/sync-hooks.mjs`                       | Generate `.codex/hooks.json` + sync report                                                                                                                                                             |
| 3   | context            | `.claude/scripts/codex/sync-context-workflows.mjs`           | Regenerate `.codex/CODEX_CONTEXT.md` + `AGENTS.md` with workflow context and shared AI-SDD markers                                                                                                     |
| 4   | copilot            | `.claude/scripts/sync-copilot-workflows.cjs`                 | Regenerate `.github/copilot-instructions.md` + `.github/instructions/*` from `workflows.json` (MUST precede the test stages — TC-WFPROTO-006 byte-matches the committed mirror against this generator) |
| 5   | tests              | `node --test .claude/scripts/codex/tests/*.test.mjs`         | Run codex tooling unit tests                                                                                                                                                                           |
| 6   | copilot-tests      | `node --test .claude/scripts/tests/*.test.mjs`               | Run copilot tooling unit tests (the `copilot:test:tooling` npm equivalent)                                                                                                                             |
| 7   | wf-cycle           | `.claude/scripts/codex/verify-workflow-cycle-compliance.mjs` | Verify workflow sequence cycle compliance                                                                                                                                                              |
| 8   | sk-proto           | `.claude/scripts/codex/verify-skill-protocol-compliance.mjs` | Verify skill strict-execution-contract                                                                                                                                                                 |
| 9   | residue            | `.claude/scripts/codex/verify-no-project-residue.mjs`        | Verify no project residue in generated and generic source artifacts                                                                                                                                    |
| 10  | sdd                | `.claude/scripts/codex/verify-sdd-semantic-compliance.mjs`   | Verify AI-SDD semantic contract coverage                                                                                                                                                               |
| 11  | sync-divergence    | `.claude/scripts/codex/verify-sync-divergence.mjs`           | Byte-equality oracle: `.agents/skills` mirror === `.claude/skills` (codex mirror)                                                                                                                      |
| 12  | copilot-divergence | `.claude/scripts/verify-copilot-divergence.cjs`              | Byte-equality oracle: `.github/**` Copilot mirror === generator output (copilot mirror)                                                                                                                |

## Usage

```bash
# Full sync (standalone, no npm):
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs

# Stream live child output:
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --verbose

# Full sync while forcing skill copy mode:
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --copy-skills

# Read-only verifiers (no mutation) — the full `npm run verify:all`:
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --only=tests,copilot-tests,wf-cycle,sk-proto,residue,sdd,sync-divergence,copilot-divergence

# Skip stages while debugging:
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --skip=migrate,hooks
```

**Exit codes:** `0` all pass · `1` orchestrator failure · non-zero propagates from failing stage.

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

## Closing Reminders

**Protocols in force** (concise digest of the SYNC/shared blocks this skill carries) — **MUST ATTENTION** each canonical body below still binds:

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced `file:line` proof per claim, confidence >80% to act, never guess.

**MUST ATTENTION** invoke ONLY when user explicitly requests codex sync — never auto-invoke
**MUST ATTENTION** edit source `.claude/skills/sync-codex/**`, NEVER the `.agents/skills/sync-codex/**` mirror
**MUST ATTENTION** keep `.codex/scripts/codex/codex-notify.mjs` generated from `.claude/scripts/codex/codex-notify.mjs`; edit the `.claude` source first
**MUST ATTENTION** keep Codex config upserts surgical; preserve unrelated `.codex/config.toml` keys and tables while updating the managed notification/status-line keys
**MUST ATTENTION** keep `AGENTS.md` sync comprehensive; mirror full `CLAUDE.md` plus generated hook/context blocks, and preserve unmanaged `AGENTS.md` preface text
**MUST ATTENTION** keep learned-lessons content out of `.agents/skills/**`; skills may point to `docs/project-reference/lessons.md` but must not embed its entries
**MUST ATTENTION** orchestrator fails fast — re-run single failing stage with `--only=<id> --verbose` to debug
**MUST ATTENTION** working directory auto-resolves to repo root from script path — do not pass `--cwd`
**MUST ATTENTION** stages 1-4 mutate; stages 5-12 verify only — use `--only=` for non-destructive validation

**Anti-Rationalization:**

| Evasion                                 | Rebuttal                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------ |
| "Just edit the .agents mirror directly" | Next sync overwrites it. Always edit `.claude/skills/sync-codex/` source |
| "Skip a stage to save time"             | Verifiers (4-8) catch drift; skipping = silent regression risk           |
| "Sync looks idempotent, skip verify"    | Timestamp diffs are normal; structural diffs = bug. Always run verifiers |

> **[FAILS FAST]** First non-zero stage exit aborts chain. Re-run failing stage manually to debug.
> **[REPO ROOT]** Orchestrator auto-resolves repo root from its own path. NEVER pass `--cwd`.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->
