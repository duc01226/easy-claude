---
name: sync-codex
description: '[Codex] Use when running the full Codex mirror sync and verify pipeline (migrate, hooks, context, verify).'
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

**Goal:** Run the full Codex mirror pipeline (sync + verify) from inside the bundle. This runner is the **single and only** entrypoint for the pipeline.

> **PORTABILITY CONTRACT — `.claude/` and `.codex/` are portable, self-running and self-testing.**
> Copy them into ANY repository — a Python repo, a .NET repo, a repo with no `package.json` at all —
> and every sync / verify / check / fix / test entrypoint still works, because each one is a path
> INSIDE the bundle invoked with plain `node`. **Never** drive this framework through a host
> `package.json` script, and never document one: `npm run …` names a command that does not exist in
> most projects the bundle is copied into. The only external requirement is `node` >= 18 — no
> `node_modules`, no npm, no lockfile (`PORT-001` enforces the pipeline imports only `node:`
> built-ins). Catalog regeneration additionally needs Python 3 (`py -3` on Windows, `python3` on macOS/Linux).
>
> Discover the roster instead of memorizing it:
> `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --list-stages`

**Summary:**

- Run the 19-stage orchestrator in order; stage 1 reconciles `CLAUDE.md`, stages 2-4 generate the Codex mirrors, and stages 5-19 run tests and read-only release gates.
- Keep `.claude` canonical and source-owned; never hand-edit `.agents`, `.codex`, or `AGENTS.md`, and expect Claude slash invocations to become Codex dollar invocations only in generated mirrors.
- Keep `AGENTS.md` discoverable under Codex's read budget: Doc Lookup and Git discipline project first; fix a discovery defect in `CLAUDE.md`, its template, or the projection script, then re-sync.
- If a stage fails, rerun that stage with `--only=<stage> --verbose`, then rerun the full pipeline and inspect the generated diff before handoff.

> **Renamed:** formerly `/codex-sync` — that name no longer resolves as a slash command; use `$sync-codex`.

Also upserts the TUI notification and status-line keys into `.codex/config.toml`. Alerts come from the mirrored `Stop`/`SessionEnd` hooks, which Codex runs for the main thread only. The sync removes the retired legacy `notify = ["node", ".codex/scripts/codex/codex-notify.mjs"]` line and its generated helper: Codex ran that command after every turn of every thread, subagent threads included, which duplicated the hook alerts. A project's own `notify` command is kept. The bundle pins no auto-compaction budget, so Codex applies its own default: the sync never writes `model_auto_compact_token_limit`, and it retires a top-level one only when its value is exactly the formerly bundled `500000` (plus the unchanged bundled comment block above it). Any other value is the user's — kept, with one `kept user-set model_auto_compact_token_limit=<v>` line.

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
- Stage 2 never upserts `model_auto_compact_token_limit`; it retires the top-level key only when its value equals the formerly bundled `500000` and keeps any other value. No host pins a compaction budget — any compaction default change goes here AND in the other two surfaces, never in one alone
- Stage 2 also raises top-level `project_doc_max_bytes` to 98304 (never lowers a larger value): Codex silently stops reading `AGENTS.md` at 32 KiB by default, which cut the generated root mid-file. The projection still emits Doc Lookup and Git discipline first, so they survive a host that ignores the project value; there, set the key in `~/.codex/config.toml` instead. The budget covers every `AGENTS.md` concatenated from the project root to the working directory, not the root alone.
- Stage 4 generates the bounded `AGENTS.md` projection and `.codex/CODEX_CONTEXT.md` quality-protocol mirror. Automatic route selection is deliberately absent; the opt-in `UserPromptSubmit` hook owns runtime routing.
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
- opencode discovers skills directly from `.claude/skills` and `.agents/skills`, so the handoff syncs **hooks + recommended config + the sub-agent mirror** — no skill mirror is produced (sub-agents are not auto-discovered, so `.claude/agents/*.md` is mirrored into `.opencode/agent/*.md`).

## Bootstrap Gate (when AGENTS.md is missing or incomplete)

This skill is the route the agent-files bootstrap gate offers for a missing — **or incomplete** —
root `AGENTS.md`, the generated Codex mirror of `CLAUDE.md`. Claude and Codex may both support hooks,
and the workflow gate plus universal guides must remain available statically; stage 4 produces
the bounded root projection (with the `<!-- CK:UNIVERSAL-GUIDES v7 -->` sentinel when present) plus the
quality-protocol context. The runtime hook may refresh routing context, while tracked carriers retain the default gate.

"Incomplete" means the file exists but lacks the universal guides — same three-state detection as the
CLAUDE.md route (`missing` → init, `incomplete` → update smart-merge preserving project content, `ok`
→ no block), decided by the shared sentinel-then-anchors check.

Detection is shared with
the CLAUDE.md route via `.claude/hooks/lib/agent-files-state.cjs`. Opt out of completeness enforcement
with `portability.requireUniversalGuides: false` in `docs/project-config.json` (default `true`);
`skip init` dismisses both hooks for 24h. The stage-1 preflight generates or updates `CLAUDE.md` before
the mirror stages. A markerless root remains a manual `$ai-context-refresh --mode update` smart-merge boundary
unless that explicit opt-out is configured. When `$ai-context-refresh` has just completed source editing, it
calls this same runner with `--skip=claude-md` so the root is not processed twice.

## Coordination with ai-context-refresh

`sync-codex` owns generated Codex surfaces; `ai-context-refresh` owns the root AI-context lifecycle. Keep
the user-facing skills separate, but use this runner as their one portable executable coordinator:

- A full `$sync-codex` run performs the `CLAUDE.md` preflight first. Missing roots are initialized;
  marker-managed roots are updated; markerless roots are preserved and reported for AI smart-merge.
- After an explicit `$ai-context-refresh` init/update/refactor, that skill calls
  `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --skip=claude-md` after its final AI edits.
- Do not recursively invoke the other skill or hand-edit mirrors. If `.claude` (and optionally stale
  `.codex`) is copied into another project, run the full runner from the copied bundle; `.claude` is
  authoritative and `.codex`, `.agents`, and `AGENTS.md` are disposable generated outputs.

## Skill profile on Codex

Stage 2 maps the project config's `skillProfile` onto each skill mirror's `agents/openai.yaml`. The host-independent rules (presets, lists, the called set, refusals) belong to `resolveProfile()` in `.claude/scripts/sync-skill-profile.cjs`; read `.claude/config/README.md` → Skill profile for them. The called set is every workflow step, every agent `skills:` entry, and the curated `calledByOthers` and `entrySkills` lists in `.claude/config/skill-profiles.json`.

| Profile list | Skill nothing starts | Called skill |
| --- | --- | --- |
| `nameOnly` | `policy.allow_implicit_invocation: false` (Codex has no name-only listing) | Keeps implicit invocation, with one `kept implicit invocation for <name> ...` note line — a workflow step does not reach a Codex skill whose implicit invocation is off (`CODEX_STEP_REACHES_HIDDEN_SKILL = false`), so preset `standard` hides nothing on Codex |
| `commandOnly` / `off` | `allow_implicit_invocation: false`; `$name` still runs it | Refused, unless `allowHidingCalledSkills: true`; with the opt-in, `allow_implicit_invocation: false` plus a warning line |

- **No profile, no change.** The resolver loads only when `skillProfile` is declared, so a project without one gets a byte-identical mirror.
- **Refused profile stops everything.** A refusal prints the resolver's message and `skill-profile: nothing was written`, then exits `1` before any mirror, agent or config write — `--no-skills` included. The stage-19 divergence oracle fails the same way.
- **Fail-closed inputs.** A project config that exists but is not valid JSON fails the sync, because it cannot tell whether the config hides skills; a `.claude/workflows.json` without a `workflows` map fails the resolver.
- **A skill that ships its own `agents/openai.yaml`** without the policy is kept as it is: the profile is skipped for it with one `conflict:` line.

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
| 16  | review-validate-coverage | `.claude/scripts/codex/verify-review-validate-coverage.mjs` | Verify every review-family skill carries the `$why-review --validate-findings` route; graders never embed the fix-loop (Self-Review Convergence Loop sensor) |
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

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-discovery-doc-quality` — Keep AI-read docs discoverable: rules first, routed pointers, closing reminders; writing a doc that an agent reads → .claude/skills/shared/protocols/ai-discovery-doc-quality.md
- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**Protocols in force** (concise digest of the SYNC/shared blocks this skill carries) — **MUST ATTENTION** each canonical body below still binds:

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced `file:line` proof per claim, confidence >80% to act, never guess.

**MUST ATTENTION** keep the `$sync-codex` skill user-invoked-only. An explicit `$ai-context-refresh` completion may invoke the standalone runner directly with `--skip=claude-md` after final source verification; `$project-skill-protocol` may likewise run its documented completion handoff. No unrelated skill, agent, or workflow may auto-run the mutating pipeline.
**MUST ATTENTION** edit source `.claude/skills/sync-codex/**`, NEVER the `.agents/skills/sync-codex/**` mirror
**MUST ATTENTION** never reinstall a Codex legacy `notify` command — it runs for every thread, subagents included; alerts belong to the main-thread `Stop`/`SessionEnd` hooks
**MUST ATTENTION** keep Codex config upserts surgical; preserve unrelated `.codex/config.toml` keys and tables while updating the managed notification/status-line keys; retire the old compaction budget only on an exact bundled-value match
**MUST ATTENTION** keep `AGENTS.md` sync comprehensive; mirror full `CLAUDE.md` plus generated hook/context blocks, and preserve unmanaged `AGENTS.md` preface text
**MUST ATTENTION** keep `AGENTS.md` discoverable under Codex's read budget — Doc Lookup and Git discipline project first; a discovery defect in `AGENTS.md` is fixed in `CLAUDE.md`, its template or the projection script, then re-synced
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

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-discovery-doc-quality:reminder -->

**MUST ATTENTION** AI-read docs: purpose + critical rules on top, closing reminders at the bottom when long; route to other docs as `read <path> when <situation>` with existing targets only, no orphan docs, N/A named once as a skip; token-efficient per `$prompt-enhance`; fix generated docs at their source; run the final gate on every changed doc.

<!-- /SYNC:ai-discovery-doc-quality:reminder -->

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
