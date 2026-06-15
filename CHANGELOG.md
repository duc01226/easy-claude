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

### Hooks: De-hooking — Remove Runtime Context-Injection Layer for Hookless Parity

**Refactor**: The entire runtime context-injection hook family — every PreToolUse `pretooluse-ctx-*` dispatcher, all `SubagentStart` hooks, the `prompt-context-assembler*` set, and the standalone `ba-refinement-context` / `design-system-canonical-guide` / `figma-context-extractor` / `graph-grep-suggester` injectors — is removed. The guidance those hooks injected at runtime is relocated into static `CLAUDE.md`, `agents/*.md`, and `SKILL.md` content, so a hookless harness (Codex, Copilot) reads identical instructions to Claude Code. This collapses the dispatcher/subagent-init layer added earlier in this same unreleased cycle: it was an intermediate consolidation that the de-hooking pass supersedes entirely.

#### Removed

- **All PreToolUse context-injection hooks** — the 9 `pretooluse-ctx-*.cjs` dispatchers (`-canon/-crr/-dev/-edit/-edit-spec/-edit-tail/-graph/-mindset/-readbash`) and the builder/base libs they depended on (`lib/pretooluse-context-builders.cjs`, `lib/pretooluse-dispatch.cjs`, `lib/context-injector-base.cjs`, `lib/transcript-utils.cjs`). The backend/frontend/SCSS/graph/spec/lessons/mindset/role guidance these injected is now authored statically in `CLAUDE.md`, the per-area `docs/project-reference/*` references, and the relevant skills.
- **All `SubagentStart` hooks and the subagent-init layer** — `subagent-init.cjs`, `subagent-init-2.cjs`, `subagent-init-3.cjs`, and `lib/subagent-context-builders.cjs`. **There are now zero `SubagentStart` events registered** in `settings.json`; sub-agent identity, dev rules, AI-mistake-prevention, code-review rules, lessons, patterns, and context-guard guidance live statically in each `.claude/agents/*.md` (and the `.agents/` mirror), so sub-agents get identical context with no hook.
- **The `prompt-context-assembler*` family** — `prompt-context-assembler.cjs` plus its `-claude/-closers/-docs/-project-config` part-files. The compact-marker mechanism it secondarily emitted is unaffected; the live consumer is `post-compact-recovery.cjs` (SessionStart `resume|compact`).
- **Standalone runtime injectors** — `ba-refinement-context.cjs`, `design-system-canonical-guide.cjs`, `figma-context-extractor.cjs`, `graph-grep-suggester.cjs`, and the `workflow-router-p2/p3.cjs` part-hooks. Their content moved into target skills (figma → `figma-design` SKILL.md; design-system-canonical guidance → the design/UI skills; graph-grep "grep finds files, trace reveals flow" → the `graph-*` skills; BA-refinement guidance → the refinement skills).

#### Changed

- **Hook inventory reduced to 29 top-level `.cjs` hooks (+ 1 `notify-waiting.js`) and 28 lib modules.** Remaining hook events: `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PreCompact`, `Stop`, `Notification` (8 event types; no `SubagentStart`). Counts reconciled across `README.md`, `CLAUDE.md`, `AGENTS.md`, `docs/project-reference/project-structure-reference.md`, `.claude/docs/README.md`, and `.claude/docs/hooks/README.md`.
- **Hookless-parity is now structural, not runtime.** Because no hook injects context, the static `CLAUDE.md`/`agents/*.md`/`SKILL.md` text is the single source of guidance for all three harnesses (Claude Code, Codex, Copilot) rather than Claude-only injected text plus a baked-in mirror.

#### Fixed

- **Golden Rules silently dropped on Windows (latent pre-existing bug, now moot).** The deleted mindset injector extracted the CLAUDE.md Golden Rules block with a regex terminated by a bare `\n\n`; under `core.autocrlf=true` with no `.gitattributes`, CLAUDE.md checks out CRLF so the terminator never matched and the block was omitted from injected context at runtime. With the injection hook removed, the Golden Rules are read directly from static `CLAUDE.md` by every harness, eliminating the line-ending hazard entirely.

#### Test Coverage

- Added `content-presence.test.cjs` — a static-parity safety net asserting the relocated guidance is present in `CLAUDE.md` (TC-CP-001), the agent files (TC-CP-002/003), and the four per-context skill migrations: design-system-canonical→`design` (TC-CP-004), figma→`figma-design` (TC-CP-005), ba-refinement→`refine` (TC-CP-006), graph-grep→`scout` (TC-CP-007). Each TC keys on a verbatim load-bearing phrase from the deleted hook, so a future skill edit that drops a relocated block fails loudly.
- Removed the orphaned dispatcher/inject test suites that exec'd now-deleted hook files (`pretooluse-dispatchers.test.cjs`, `ba-refinement-context.test.cjs`, `code-patterns-injector.test.cjs`, `dev-rules-injector.test.cjs`, `context.test.cjs`, `subagent-concurrency.test.cjs`) and the frozen `fixtures/pretooluse-legacy-goldens.json` oracle. Primary runner (`test-all-hooks.cjs`) green at 303 tests with the count guard agreeing; aggregate (`run-all-tests.cjs`) green at 410 (incl. content-presence TC-CP-001..007).
