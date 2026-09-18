---
name: sync-codex
description: '[Codex] Use when running the full Codex mirror sync and verify pipeline (migrate, hooks, context, verify).'
disable-model-invocation: true
---

## Quick Summary

**Goal:** Run the full Codex mirror pipeline (sync + verify) from inside the bundle. This runner is the **single and only** entrypoint for the pipeline.

> **PORTABILITY CONTRACT — `.claude/` and `.codex/` are portable, self-running and self-testing.**
> Copy them into ANY repository — a Python repo, a .NET repo, a repo with no `package.json` at all —
> and every sync / verify / check / fix / test entrypoint still works, because each one is a path
> INSIDE the bundle invoked with plain `node`. **Never** drive this framework through a host
> `package.json` script, and never document one: `npm run …` names a command that does not exist in
> most projects the bundle is copied into. The only external requirement is `node` >= 18 — no
> `node_modules`, no npm, no lockfile (`PORT-001` enforces the pipeline imports only `node:`
> built-ins). Catalog regeneration additionally needs `python` (`py -3` on Windows).
>
> Discover the roster instead of memorizing it:
> `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --list-stages`

**Summary:**

- Run the 19-stage orchestrator in order; stage 1 reconciles `CLAUDE.md`, stages 2-4 generate the Codex mirrors, and stages 5-19 run tests and read-only release gates.
- Keep `.claude` canonical and source-owned; never hand-edit `.agents`, `.codex`, or `AGENTS.md`, and expect Claude slash invocations to become Codex dollar invocations only in generated mirrors.
- If a stage fails, rerun that stage with `--only=<stage> --verbose`, then rerun the full pipeline and inspect the generated diff before handoff.

> **Renamed:** formerly `/codex-sync` — that name no longer resolves as a slash command; use `/sync-codex`.

Also bootstraps team-wide Codex completion notifications by copying the portable `.claude/scripts/codex/codex-notify.mjs` helper into `.codex/scripts/codex/` and upserting notification plus TUI status-line keys into `.codex/config.toml`.

**Workflow:**

1. **Preflight** — The runner checks `CLAUDE.md`; it initializes a missing file, updates a marker-managed stale file, honors an explicit universal-guide opt-out, and stops before mutation for a markerless file that needs AI smart-merge.
2. **Run** — `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`
3. **Verify** — Exit code `0` = pass; check stdout summary
4. **Inspect** — On failure, re-run the failing stage manually with `--only=<stage>` and `--verbose`

**Key Rules:**

- MUST evaluate all 19 stages in order — configured stages fail fast on the first non-zero exit;
  optional stages emit an explicit `SKIP (not configured)` when the adopter has not declared their contract
- NEVER edit `.agents/skills/sync-codex/**` (auto-mirror) — edit `.claude/skills/sync-codex/**` source instead
- `.claude` is the source for skills/workflows/hooks; generated acceptance targets are `.agents/skills/**`, `.codex/CODEX_CONTEXT.md`, and `AGENTS.md`
- Stage 1 may mutate `CLAUDE.md`; stages 2-4 mutate `.agents/skills/`, `.codex/`, `AGENTS.md`; stages 5-19 are read-only (tooling tests,
  optional tech-spec freshness and feature-registry validation, 3 hook-suite gates, the other Codex
  verifiers, and the cross-surface divergence oracle)
- Stage 2 upserts `[tui].status_line` to show model+reasoning, current directory, project root, context used, five-hour limit, and weekly limit by default
- Stage 4 generates the bounded `AGENTS.md` projection and full `.codex/CODEX_CONTEXT.md` static mirror, while hook configuration remains a separate optional accelerator; both Claude and Codex must still follow the same canonical protocol when hooks are absent
- Stage 2 must not inline `lessons.md` content — it lives in the project-reference docs root (default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) — into `.agents/skills/**`; generated skill mirrors reference the project-reference loading gate instead
- The `SYNC:ai-sdd-artifact-contract` marker must appear after sync in `.codex/CODEX_CONTEXT.md` and `AGENTS.md`
- No npm dependency — pure `node` + spawned subprocesses
- Idempotent — safe to re-run; second run produces only timestamp diffs
- **opencode handoff:** when the project has a local `.opencode/` directory, the runner hands off to `$sync-opencode` after all 19 stages pass (its `--verify-only` form under `--verify-only`). The handoff is an integration step, NOT a 20th stage — the 19-stage roster stays fixed

## opencode handoff (when `.opencode/` exists)

opencode has no shell-command hooks, so its hook surface is a generated JS bridge at
`.opencode/plugins/easy-claude-hooks.js` produced by `$sync-opencode` from `.claude/settings.json`.
`$sync-opencode` also reconciles the framework's recommended opencode defaults
(`.opencode/opencode.recommended.json`) into the project-root `opencode.json`. Because a project
running opencode expects both surfaces to track the framework, a full `$sync-codex` run
automatically hands off to the opencode pipeline once the 19 Codex stages pass:

```bash
# Runs automatically at the end of a full codex sync when .opencode/ exists:
node .claude/skills/sync-opencode/scripts/run-opencode-sync.mjs
```

- The handoff is skipped silently when the project has no `.opencode/` directory, and skipped with an explicit message when `.opencode/` exists but the opencode runner is absent.
- Under `--verify-only` the handoff inherits the read-only contract (`run-opencode-sync.mjs --verify-only`), so no invocation of the codex runner ever mutates the opencode surface in verify mode.
- A handoff failure fails the codex run with the opencode stage's exit code — a green `$sync-codex` never hides a red opencode surface.
- opencode discovers skills directly from `.claude/skills` and `.agents/skills`, so the handoff syncs **hooks + recommended config only** — no skill mirror is produced.

## Bootstrap Gate (when AGENTS.md is missing or incomplete)

This skill is the route the agent-files bootstrap gate offers for a missing — **or incomplete** —
root `AGENTS.md`, the generated Codex mirror of `CLAUDE.md`. Claude and Codex may both support hooks,
but the universal session-start and workflow guides must remain available statically; stage 4 produces
the bounded root projection (with the `<!-- CK:UNIVERSAL-GUIDES v6 -->` sentinel when present) plus the
full static-parity context. Hooks may accelerate loading, but they never replace the generated files.

"Incomplete" means the file exists but lacks the universal guides — same three-state detection as the
CLAUDE.md route (`missing` → init, `incomplete` → update smart-merge preserving project content, `ok`
→ no block), decided by the shared sentinel-then-anchors check.

Detection is shared with
the CLAUDE.md route via `.claude/hooks/lib/agent-files-state.cjs`. Opt out of completeness enforcement
with `portability.requireUniversalGuides: false` in `docs/project-config.json` (default `true`);
`skip init` dismisses both hooks for 24h. The stage-1 preflight generates or updates `CLAUDE.md` before
the mirror stages. A markerless root remains a manual `/ai-context-refresh --mode update` smart-merge boundary
unless that explicit opt-out is configured. When `/ai-context-refresh` has just completed source editing, it
calls this same runner with `--skip=claude-md` so the root is not processed twice.

## Coordination with ai-context-refresh

`sync-codex` owns generated Codex surfaces; `ai-context-refresh` owns the root AI-context lifecycle. Keep
the user-facing skills separate, but use this runner as their one portable executable coordinator:

- A full `/sync-codex` run performs the `CLAUDE.md` preflight first. Missing roots are initialized;
  marker-managed roots are updated; markerless roots are preserved and reported for AI smart-merge.
- After an explicit `/ai-context-refresh` init/update/refactor, that skill calls
  `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --skip=claude-md` after its final AI edits.
- Do not recursively invoke the other skill or hand-edit mirrors. If `.claude` (and optionally stale
  `.codex`) is copied into another project, run the full runner from the copied bundle; `.claude` is
  authoritative and `.codex`, `.agents`, and `AGENTS.md` are disposable generated outputs.

## Stages

19 stages, sequential — the complete sync + verify pipeline, owned entirely by this runner.
Stage 1 reconciles `CLAUDE.md`; stages 2-4 mutate mirrors; 5-19 verify (read-only) and are exactly what `--verify-only` selects, derived from each stage's own `mutate` marker rather than any transcribed list. Tech-spec freshness and feature-registry are optional
capabilities: if their configuration contract is absent, the runner records an explicit skip and
continues; if declared but malformed, their direct verifier fails closed:

| #   | Stage           | Script                                                       | Effect                                                                                              |
| --- | --------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | claude-md       | `.claude/skills/ai-context-refresh/scripts/generate-claude-md.cjs --check` | Preflight `CLAUDE.md`; init missing, update marker-managed stale, or stop for markerless smart-merge |
| 2   | migrate         | `.claude/scripts/codex/migrate-claude-to-codex.mjs`          | Migrate Claude agents → `.codex/agents/`; mirror skills → `.agents/skills/`; setup Codex notifications |
| 3   | hooks           | `.claude/scripts/codex/sync-hooks.mjs`                       | Generate `.codex/hooks.json` + sync report                                                           |
| 4   | context         | `.claude/scripts/codex/sync-context-workflows.mjs`           | Regenerate `.codex/CODEX_CONTEXT.md` + `AGENTS.md` with workflow context and shared AI-SDD markers   |
| 5   | tests           | Runner discovers `.claude/scripts/codex/tests/*.test.{mjs,cjs}` | Run Codex tooling tests; missing or empty discovery fails |
| 6   | scripts-tests   | Runner discovers `.claude/scripts/tests/*.test.{mjs,cjs}` | Run repo-script tests, including review and experience policies; missing or empty discovery fails |
| 7   | tech-spec-freshness | `.claude/skills/tech-spec/scripts/generate-tech-specs.mjs --check` | Verify configured derived technical views; explicit skip when `techSpecScan` is absent |
| 8   | feature-registry | `.claude/scripts/codex/verify-feature-registry.mjs --configured-roots` | Verify configured canonical TC/BR identity, continuation parts, split limits, links, ranges, summaries, and coverage; explicit skip when `specSystem.featureRegistryRoots` is absent |
| 9   | hooks-count-drift | `.claude/hooks/tests/run-all-tests.cjs --filter=count-drift` | Verify the `<!-- COUNT:… -->` inventory markers have not drifted from the real skill/hook/agent/workflow counts |
| 10  | hooks-parity    | `.claude/hooks/tests/run-all-tests.cjs --filter=parity`       | Verify hook parity across the Claude/Codex/Copilot surfaces                                          |
| 11  | hooks-doc-sync  | `.claude/hooks/tests/run-all-tests.cjs --filter=doc-sync-gate` | Verify hook documentation stays in sync with the wired hook set                                     |
| 12  | wf-cycle        | `.claude/scripts/codex/verify-workflow-cycle-compliance.mjs` | Verify workflow sequence cycle compliance                                                            |
| 13  | sk-proto        | `.claude/scripts/codex/verify-skill-protocol-compliance.mjs` | Verify skill strict-execution-contract                                                               |
| 14  | residue         | `.claude/scripts/codex/verify-no-project-residue.mjs`        | Verify no project residue in generated and generic source artifacts                                  |
| 15  | sdd             | `.claude/scripts/codex/verify-sdd-semantic-compliance.mjs`   | Verify AI-SDD semantic contract coverage                                                             |
| 16  | review-validate-coverage | `.claude/scripts/codex/verify-review-validate-coverage.mjs` | Verify every review-family skill carries the `/why-review --validate-findings` route; graders never embed the fix-loop (Self-Review Convergence Loop sensor) |
| 17  | sync-adoption-parity | `.claude/scripts/codex/verify-sync-adoption-parity.mjs` | Verify SYNC tag ↔ carrier adoption parity: declared carriers carry both main + `:reminder` blocks, no undeclared skill carries a matrix tag, every injected body byte-matches canonical |
| 18  | provenance-markers | `.claude/scripts/codex/verify-provenance-markers.mjs`     | Verify provenance-marker discipline in `architecture-knowledge.md`: declared tags only · `— VERIFY` only on a declared tag · §3/§8/§9/§10 each carry a default-basis banner · no banner enumerates row-level exceptions · a `[model-knowledge]` marker carries `— VERIFY`. Fail-soft when the catalog is absent |
| 19  | sync-divergence | `.claude/scripts/codex/verify-sync-divergence.mjs`           | Byte-equality oracle over FOUR mirrors: `.agents/skills`, `.codex/agents/*.toml`, the context mirror (`AGENTS.md` + `.codex/CODEX_CONTEXT.md`), and `.codex/hooks.json` — each re-materialized by the REAL writer into a temp dir, then diffed |

## Usage

```bash
# Discover the stage roster (MUTATE vs verify) — no need to read this file or any package.json:
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --list-stages

# Full sync (standalone, no npm):
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs

# Stream live child output:
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --verbose

# Full sync while forcing skill copy mode:
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --copy-skills

# Every read-only gate (no mutation) — derived from the mutate markers, never a transcribed id list:
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --verify-only

# Self-test the framework (both suites ship inside the bundle):
node .claude/hooks/tests/test-all-hooks.cjs
node .claude/hooks/tests/run-all-tests.cjs

# Configured feature-registry adoption roots (continuation parts discovered automatically):
node .claude/scripts/codex/verify-feature-registry.mjs --configured-roots

# Explicit paths or the whole tree remain available for audits (omit paths for whole-tree mode).
# {spec-root} = specRoots.business.path from docs/project-config.json, default docs/specs:
node .claude/scripts/codex/verify-feature-registry.mjs {spec-root}/Area/README.Feature.md

# Skip stages while debugging:
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --skip=migrate,hooks
```

**Exit codes:** `0` all pass · `1` orchestrator failure · non-zero propagates from failing stage.

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
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

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (default `docs/project-reference/skill-protocols-reference.md`; a `referenceDocs` entry in `docs/project-config.json` overrides the path, and a `docsRoots.projectReference.path` entry relocates its containing directory), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**Protocols in force** (concise digest of the SYNC/shared blocks this skill carries) — **MUST ATTENTION** each canonical body below still binds:

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced `file:line` proof per claim, confidence >80% to act, never guess.

**MUST ATTENTION** keep the `/sync-codex` skill user-invoked-only. An explicit `/ai-context-refresh` completion may invoke the standalone runner directly with `--skip=claude-md` after final source verification; `/project-skill-protocol` may likewise run its documented completion handoff. No unrelated skill, agent, or workflow may auto-run the mutating pipeline.
**MUST ATTENTION** edit source `.claude/skills/sync-codex/**`, NEVER the `.agents/skills/sync-codex/**` mirror
**MUST ATTENTION** keep `.codex/scripts/codex/codex-notify.mjs` generated from `.claude/scripts/codex/codex-notify.mjs`; edit the `.claude` source first
**MUST ATTENTION** keep Codex config upserts surgical; preserve unrelated `.codex/config.toml` keys and tables while updating the managed notification/status-line keys
**MUST ATTENTION** keep `AGENTS.md` sync comprehensive; mirror full `CLAUDE.md` plus generated hook/context blocks, and preserve unmanaged `AGENTS.md` preface text
**MUST ATTENTION** keep learned-lessons content out of `.agents/skills/**`; skills may point to `lessons.md` in the project-reference docs root (default `docs/project-reference/`; path from `docsRoots.projectReference.path` in `docs/project-config.json`) but must not embed its entries
**MUST ATTENTION** orchestrator fails fast — re-run single failing stage with `--only=<id> --verbose` to debug
**MUST ATTENTION** working directory auto-resolves to repo root from script path — do not pass `--cwd`
**MUST ATTENTION** stage 1 may reconcile `CLAUDE.md`, stages 2-4 mutate mirrors; stages 5-19 verify only — use `--only=` for non-destructive validation

**Anti-Rationalization:**

| Evasion                                 | Rebuttal                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------ |
| "Just edit the .agents mirror directly" | Next sync overwrites it. Always edit `.claude/skills/sync-codex/` source |
| "Skip a stage to save time"             | Read-only gates (5-19) catch drift; skipping = silent regression risk    |
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

**MUST ATTENTION** ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->
