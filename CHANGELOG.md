# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

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
