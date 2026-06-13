# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Skills & Workflows: Consolidation

**Refactor**: Pruned dead skills/workflows and namespaced every workflow id under a `workflow-` prefix, so a workflow invocation is unambiguous against a same-named step-skill.

#### Removed

- **4 skills deleted** (canonical `.claude/skills/` + generated `.agents/` mirror): `scout-ext` (the `scout-external` agent survives and is unaffected), `design-workflow`, `workflow-documentation`, and `workflow-full-feature-lifecycle` (orchestrator skills for retired workflows). **Breaking:** `/design-workflow`, `/workflow-documentation`, and `/workflow-full-feature-lifecycle` no longer resolve — use the surviving `workflow-*` set instead.
- **4 workflows removed** from `.claude/workflows.json` (21 → 17): `design-workflow`, `documentation`, `full-feature-lifecycle`, `spec-index` (`spec-index` remains available as a standalone skill).

#### Changed

- **Skill `workflow-start` renamed to `start-workflow`** (canonical + mirror) — verb-first, matching the `/start-workflow <id>` invocation.
- **The 16 remaining workflow ids namespaced with a `workflow-` prefix** (`bugfix → workflow-bugfix`, `feature → workflow-feature`, `review-changes → workflow-review-changes`, … ; `workflow-seed-test-data` was already prefixed). Disambiguates a workflow id from a same-named step-skill and aligns `commandMapping` with the `/start-workflow <id>` contract. **Breaking:** any saved `/start-workflow <old-id>` reference must add the `workflow-` prefix.

### Hooks: Consolidate PreToolUse Inject + SubagentStart Hooks into Dispatchers

**Refactor**: 24 single-purpose inject hook files collapsed into 12 cap-bounded dispatchers calling pure builder functions — fewer child-process spawns per tool call, single transcript scan, byte-equivalent output verified against a frozen golden oracle.

#### Changed

- **16 PreToolUse inject modules → 9 `pretooluse-ctx-*.cjs` dispatchers.** `artifact-path-resolver`, `backend-context`, `code-patterns-injector`, `code-review-rules-injector`, `design-system-context`, `dev-rules-injector`, `frontend-context`, `graph-context-injector`, `knowledge-context`, `lessons-injector`, `mindset-compact-injector`, `mindset-injector`, `python-call-guide`, `role-context-injector`, `scss-styling-context`, and `spec-context` were deleted; their logic now lives as pure `build*` functions in `lib/pretooluse-context-builders.cjs`, invoked by the dispatchers (`pretooluse-ctx-canon/-crr/-dev/-edit/-edit-spec/-edit-tail/-graph/-mindset/-readbash`).
- **8 SubagentStart modules → 3 dispatchers.** `subagent-init-{ai-mistakes,code-review-rules,context-guard,dev-rules,identity,lessons,patterns,todos}.cjs` consolidated into `subagent-init.cjs` (builders 1-5), `subagent-init-2.cjs` (builder 6), and `subagent-init-3.cjs` (builders 7-8).
- **Single transcript scan per tool call.** `lib/pretooluse-dispatch.cjs` `runDispatcher()` loads the transcript once and threads `preloadedLines` to every builder, replacing per-hook re-reads. Each builder is wrapped in its own try/catch (fault isolation); a throwing builder cannot abort its siblings and the dispatcher always exits 0.
- Hook inventory reduced to 54 top-level hook files + 33 lib modules. Counts reconciled across `CLAUDE.md`, `AGENTS.md`, `project-structure-reference.md` markers and prose in `docs/README.md`, `docs/hooks/README.md`, `docs/claude-ai-agent-framework-guide.md`, `docs/team-collaboration-guide.md`, `docs/quick-start.md`, `docs/skill-naming-conventions.md`, `docs/code-graph-mechanism.md`, `docs/code-graph-setup.md`.

#### Fixed

- **Golden Rules silently dropped on Windows (latent pre-existing bug).** `buildMindset` extracted the CLAUDE.md Golden Rules block with a regex terminated by a bare `\n\n`. With `core.autocrlf=true` and no `.gitattributes`, CLAUDE.md is checked out CRLF, so the terminator never matched and the Golden Rules block was omitted from injected context at runtime. Regex is now line-ending-agnostic (`\r?\n` + `split(/\r?\n/)`), and extracted rules are normalized back to LF. The deleted `mindset-injector.cjs` carried the identical bug, so legacy and dispatcher behaved identically (both omitted the block) — the fix restores the intended injection.

#### Test Coverage

- Added `pretooluse-dispatchers.test.cjs` (TC-HOOKS-030..038, 28 tests): differential oracle asserting consolidated dispatcher concat is byte-identical to the frozen legacy golden across 10+ representative tool cases, every emitted block ≤8500 chars (except grandfathered dev/mindset giants), and scout-block exit-2 deny still fires under the consolidated layout. **TC-HOOKS-038** is the CRLF regression guard for the Golden Rules fix below — it feeds `extractGoldenRules` CRLF/LF content, asserts byte-identical extraction, and includes a sentinel proving the pre-fix bare-`\n\n` regex matches LF yet fails on CRLF (so a revert is caught on any platform).
- Froze `fixtures/pretooluse-legacy-goldens.json` as the permanent equivalence oracle (independent of deleted files' on-disk existence).
- Removed 22 orphaned inline tests in `test-all-hooks.cjs` that exec'd deleted hook files; their behavior is now covered by the golden oracle. Canonical runner green at 362 tests, 0 failures.

### Hooks: Eliminate Duplicate Injection in SubagentStart Hooks

**Fix**: Two confirmed token-waste bugs eliminated — each sub-agent invocation now saves ~10KB + 350 tokens.

#### Fixed

- **Context Guard duplicated on every sub-agent call**: `buildContextGuardContext()` was called from both `subagent-init-identity.cjs` (labeled "TOP primacy anchor") and `subagent-init-context-guard.cjs` ("BOTTOM recency anchor"). Since all 14 hooks concat into a single `system-reminder` block, both blocks appeared adjacent — wasting ~350 tokens per invocation and defeating the intended primacy+recency design. Removed the call from identity.cjs; context-guard.cjs is now the sole authoritative injection.

- **CLAUDE.md duplicated on every sub-agent call**: Hooks 9-11 (`subagent-init-claude-md-p1/p2/p3.cjs`) explicitly injected CLAUDE.md (~10KB) while Claude Code's native `claudeMd` mechanism already injects it for all agents. Deleted the three hook files and unregistered them from `settings.json` (14 → 11 SubagentStart hooks).

- **Critical thinking mindset lost on hook deletion**: `claude-md-p1.cjs` also injected `buildCriticalContextSection()` (critical thinking mindset). Moved this call to `subagent-init-identity.cjs` before deletion so the injection continues uninterrupted.

#### Changed

- SubagentStart hook count reduced from 14 to 11 — smaller hook chain, less startup overhead per sub-agent.
- `subagent-init-identity.cjs` now injects critical thinking mindset at the top of its output (previously owned by deleted `claude-md-p1.cjs`).
- Hook inventory comments and JSDoc updated across `subagent-context-builders.cjs`, `subagent-init-context-guard.cjs`, `subagent-init-lessons.cjs`, and `docs/hooks/README.md`.

#### Test Coverage

- Added TC-DEDUP-001..006 to `lifecycle.test.cjs` — verify no Context Guard in identity output, exactly one in context-guard output, critical thinking mindset at identity top, hook count = 11, deleted files absent.
- Removed TC-SUBCTX-047 and TC-SUBCTX-048 (tests for the deleted claude-md-p1/p2 hooks).
- TC-SUBCTX-049 and TC-SUBCTX-050 (`splitContentIntoPart` unit tests) preserved — shared lib function retained as utility.
