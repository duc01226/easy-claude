# Development Rules

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

## Quick Summary

**Goal:** Enforce code quality, project-appropriate responsibility, and evidence-based development across implementation tasks.

**Workflow:** Understand code → Plan → Implement (follow project style and architecture) → Review → Test → Doc check

**Key Rules:**

- **Understand code first** — READ existing code, search 3+ patterns, run graph trace before ANY modification
- **Code style** — Follow the project formatter, conventions, and any path-scoped rules in config or references.
- **Responsibility** — Place behavior with the owner selected by the project's architecture and evidence; do not assume Entity/Model > Service > Component/Handler.
- **YAGNI / KISS / DRY** — No speculative abstractions, no over-engineering
- **Evidence-based** — Every claim needs `file:line` proof, confidence >80% to act
- **Zero broken builds** — Code must compile with no syntax errors
- **Names express PURPOSE** — "OrXxx/AndYyy" joining roles/types/statuses = content-driven red flag. Test: "if I add/remove one item, must I rename?" → YES = rename
- **Surgical changes (context-aware)** — Bug fix: every changed line traces to the bug (diff test). Review/enhancement: implement improvements AND announce them explicitly. Never silently scope-creep.
- **Surface ambiguity before coding** — List assumptions (scope, format, volume), present interpretations with effort estimates, push back when simpler approach exists. Never pick silently and run.
- **Goal-driven execution** — Each TaskCreate step needs explicit verify criterion: `step → verify: [observable check]`, not "make it work"
- **Goal Contract** — Before planned, workflow, or non-trivial skill work: resolve the active Goal Contract (active plan `goal.md` → `goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root — default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path — → create from request via `.claude/templates/goal-contract-template.md`), execute against its saved success criteria, append iteration evidence, and close only when the Goal Satisfaction matrix passes or a blocker is escalated. See `SYNC:goal-contract-satisfaction-loop` in `.claude/skills/shared/sync-inline-versions.md`. Tiny conversational tasks may skip only with a recorded reason.
- **Tests verify intent** — Tests must name the business rule or invariant they protect, not only assert observed behavior

---

## General

- **File Naming**: Follow the language and project naming convention; if none is documented, match nearby files.
- **File Size**: Follow project guidance. Split when doing so improves cohesion and change cost, not to meet a universal line count.
- Skills/tools: `/web-research` (library docs; Context7 MCP optional), `debug-investigate` (analysis), available image/video analysis tools, `gh` (GitHub)
- **[IMPORTANT]** Follow codebase structure and code standards in `./docs` during implementation
- **[IMPORTANT]** Always implement real code — never simulate or mock implementations
- **[CRITICAL] Responsibility Rule:**
    - Resolve the owner from project configuration, reference docs, accepted decisions, and existing code; do not impose an entity/service/component hierarchy.
    - Keep mapping, constants, derivation, and display behavior with the project-owned data or contract that makes them coherent; do not require DTO, entity, model, or component placement without project evidence.

## Understand Code First (MANDATORY)

> **Understand-Code-First** — Do NOT write code, create plans, or attempt fixes until you READ existing code.
> Search 3+ similar implementations first. Run graph on key files (MANDATORY when graph.db exists).

- **MUST ATTENTION USE graph trace** on key files when `.code-graph/graph.db` exists — after grep finds entry points, **STOP AND DECIDE:** run `python .claude/scripts/code_graph trace <file> --direction both --json` NOW. Use `--node-mode file` for overview (10-30x less noise), `--node-mode function` for detail. Graph reveals callers, importers, bus messages, event chains that grep cannot find. See CLAUDE.md "Graph Intelligence" section.

## Code Quality Guidelines

### Naming — Purpose vs Content

- **Name the PURPOSE, not the member list.** `OrXxx/AndYyy` joining roles/types/statuses → red flag. Test: "If I add/remove one item, must I rename?" → YES = content-driven = rename.
- **"Or" is fine in behavioral idioms** (`FirstOrDefault`, `SuccessOrThrow`) — it expresses WHAT HAPPENS, not WHO IS IN A SET.
- **For public/cross-layer abstractions, name the capability or domain contract, not the current provider, SDK, framework, database, or transport.** Keep those details on concrete adapters (`IStorage`/`Storage` → `AzureBlobStorage`); use a narrower contract when “storage” overpromises and preserve local interface syntax.
- Canonical portable protocol: `.claude/skills/shared/sync-inline-versions.md` (`SYNC:design-patterns-quality`); research synthesis: `tmp/reports/research-abstraction-naming-260820.md`.

### Standards

- **Zero tolerance for broken builds** — code must compile with no syntax errors
- Follow codebase structure and code standards in `./docs`
- Prioritize functionality and readability over strict style enforcement
- Handle edge cases and error scenarios; use try-catch & security standards
- Use `code-reviewer` agent to review code after every implementation
- **DO NOT** create new enhanced files — update existing files directly

<!-- SYNC:shared-protocol-duplication-policy -->

> **Shared Protocol Duplication Policy** — Inline protocol content in skills (wrapped in `<!-- SYNC:tag -->`) is INTENTIONAL duplication. Do NOT extract, deduplicate, or replace with file references. AI compliance drops significantly when protocols are behind file-read indirection. To update: edit `.claude/skills/shared/sync-inline-versions.md` first (canonical source), then grep `SYNC:protocol-name` and update all occurrences.

<!-- /SYNC:shared-protocol-duplication-policy -->

## Formatting and project-scoped code conventions

Use formatters, linters, and style rules selected by project config and reference docs; when none are configured, follow the language's established conventions and nearby code. Whitespace is visual and does not encode dependencies or parallelism by default. Put special code-style rules in project config/context groups or project-reference docs, scoped to the files and situations where they apply.

## Surgical Changes (MANDATORY — applies to every edit)

> **Touch only what you must. Clean up only your own mess.**

**The diff test** — Before submitting any change, ask: "Would this line appear in the diff if I hadn't been asked to do X?" If the answer is no, delete it.

### Rules

- **Don't improve adjacent code** — Don't refactor things that aren't broken. Don't add type hints, docstrings, or comments that weren't requested.
- **Match existing style** — Match existing quote style, spacing, naming conventions even if you'd do it differently. Style drift in a diff is noise that obscures the real change.
- **Orphan cleanup** — When your changes create unused imports/variables/functions, remove them. But do NOT remove pre-existing dead code unless asked. The distinction: YOU made it unused → remove it. It was already dead → mention it, don't touch it.
- **Scope discipline** — Two modes, same transparency rule:
    - **Bug fix context:** "Fix the bug" ≠ "improve the function." If you see a related improvement, announce it — don't silently implement it.
    - **Review / enhancement context:** If you see improvement opportunities, **implement them AND explicitly announce** what was enhanced beyond the main request. Never leave visible quality improvements unfixed when the task gives you license to improve. The rule either way: **never silently scope-creep**. Always declare what you did beyond the stated request.

### Anti-Pattern: Drive-By Refactoring

```diff
# BAD — fixing empty email bug but also adding username validation nobody asked for
-  if not user_data.get('email'):
+  email = user_data.get('email', '').strip()
+  if not email:
      raise ValueError("Email required")
+  if not user_data.get('username'):    # ← not part of the bug fix
+      raise ValueError("Username required")  # ← not asked for

# GOOD — surgical: only the lines that fix the empty email crash
-  if not user_data.get('email'):
+  email = user_data.get('email', '')
+  if not email or not email.strip():
      raise ValueError("Email required")
```

---

## Task Decomposition & Iterative Quality

> **Iterative Phase Quality** — Score complexity before planning. Score >=6 → MUST ATTENTION decompose into phases.
> Each phase: <=5 files, <=3h effort, plan → implement → review → fix → verify. No skipping.

- **Principle:** Break large tasks into small phases. Each phase: plan → implement → review → fix → verify
- **Rule:** No phase >5 files or >3h effort. No monolithic plans for complex tasks.

---

## Surface Ambiguity Before Coding (MANDATORY)

> **Never pick an interpretation silently and run. Surface it first.**

Before implementing any non-trivial request, surface ambiguity using this protocol:

**1. List assumptions explicitly:**

| Dimension       | Question to ask                                                        |
| --------------- | ---------------------------------------------------------------------- |
| **Scope**       | All records or filtered? Privacy implications?                         |
| **Format**      | File download? API response? Background job?                           |
| **Volume**      | How many records? (affects approach: in-memory vs streaming)           |
| **Constraints** | Performance targets? Security boundaries? Existing patterns to follow? |

**2. If multiple interpretations exist, present them with effort estimates:**

```
"[Request]" could mean:
1. [Interpretation A] — [approach] — ~[Nh] effort
2. [Interpretation B] — [approach] — ~[Nh] effort
3. [Interpretation C] — [approach] — ~[Nh] effort

Simplest approach: [X]. Need more context for [Y]. Which matters most?
```

**3. Push back when simpler exists:** State the simpler approach explicitly before implementing. NEVER silently pick the complex path because it was implied.

### Anti-Pattern: Silent Assumption

```
❌ User: "Export user data"
   AI: [immediately builds CSV/JSON exporter with file-writing, all users, all fields]

✅ User: "Export user data"
   AI: Before implementing, I need to clarify:
       1. Scope: Export all users or filtered? (privacy implications if all)
       2. Format: File download in browser, API endpoint, or background job with email?
       3. Fields: Which fields? Some may be sensitive.
       Simplest approach: API endpoint returning paginated JSON.
       Need more info for file-based or email-delivery exports. Which direction?
```

---

## Goal-Driven Execution (MANDATORY)

> **LLMs loop well when given success criteria. Vague tasks produce vague results.**

Transform imperative tasks into verifiable goals **before writing any code**. This is the difference between "I'll look into it" and a self-contained loop that runs to completion.

| Instead of...    | Transform to...                                                                   |
| ---------------- | --------------------------------------------------------------------------------- |
| "Fix the bug"    | "Write a failing test that reproduces it → make it pass"                          |
| "Add validation" | "Write tests for invalid inputs → make them pass"                                 |
| "Refactor X"     | "Ensure tests pass before AND after"                                              |
| "Make it faster" | Define: latency target? throughput? perceived? Then measure baseline → hit target |
| "Review this"    | List specific acceptance criteria — what does PASS look like?                     |

For multi-step tasks, each step in `TaskCreate` must carry an explicit verify criterion:

```
1. [Step] → verify: [specific observable check]
2. [Step] → verify: [specific observable check]
3. [Step] → verify: [specific observable check]
```

**Weak criteria** ("make it work", "improve it") require constant clarification — the loop stalls.
**Strong criteria** let you loop independently to completion — the loop self-terminates when done.

**Test-first application:** For bugs, write the failing test BEFORE fixing. The test is the success criterion made executable.

---

## Tests Verify Intent (MANDATORY)

> **Tests must encode WHY behavior matters, not just WHAT the code currently does.**

A valid test protects a business rule, invariant, user promise, or regression boundary. If a test would still pass after the protected rule is broken, the test is wrong even if it executes code.

For every meaningful test or test case, state the protected intent:

```
Business Intent / Invariant Guarded: [rule this test protects]
Failure Signal: [what change would make this test fail]
```

**Wrong:** Assert only that a method returns the current value or that no exception is thrown.
**Right:** Assert the observable outcome that proves the intended rule still holds.

When implementation and tests disagree, record a provisional verdict from the full
five-way taxonomy BEFORE tracing or editing either side (canonical: `CLAUDE.md`):

- **SOURCE-WRONG** — production violates the intended rule: fix source, keep/add the failing test.
- **TEST-WRONG** — the assertion or setup is stale: update the test/spec to the intended rule.
- **TEST-NOT-OPTIMAL** — the test is valid but fragile or low-signal: strengthen it toward the invariant.
- **ENVIRONMENT-BLOCKED** — external state prevents any verdict: fix the environment, do not judge the code.
- **AMBIGUOUS** — intent or evidence cannot choose safely: stop and ask; never encode accidental behavior.

Then trace the root cause and triangulate against the governing spec in the business
spec root — default `docs/specs`, overridden by `specRoots.business.path` in `docs/project-config.json`
— if one exists, AND the source.

**NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to
force green.** A three-way split without this clause reads as permission to pick
whichever side is cheaper to change, which is exactly how a real regression gets
retitled as a stale test.

---

## Pre-commit/Push Rules

**Consent & safety (BLOCKING — binds Claude and Codex equally; static rule, with hooks as optional accelerators):**

- **Never commit, push, or stage (`git add`) unless the user explicitly asks.** "Implement X" / "fix the bug" is NOT permission to commit — finish the work, report what changed, and wait. Only an explicit "commit"/"push" (or an invoked commit skill / git-manager) authorizes it. This is a static behavioral rule on every host; no hook enforces it.
- **Never `git commit --amend`.** Amending rewrites history and can corrupt commits once HEAD has moved — always create a NEW commit. No bypass.
- **Branch before committing on the default branch.** If asked to commit while on `main`/`master`, create a feature branch first. **Model-behavioral:** nothing catches a commit on `main` but you.
- Read-only git needs no permission: `status`, `diff`, `log`, `show`, `rev-parse`, `describe`, `blame`, `check-ignore`, `ls-files`, `shortlog`, and the _listing_ forms of `branch`, `tag`, `remote`, `config` and `stash`.
- **`fetch`, `restore`, `reset`, `checkout`, `switch`, `stash push`, `clean`, `merge`, `rebase`, `cherry-pick`, `revert`, `rm`, `mv` and config _writes_ are NOT read-only** — they move refs, the index or the working tree. Ask before running one.
- **Publishing through the GitHub CLI — or the GitHub MCP server — is the same act as pushing.** `gh pr create|merge`, `gh release create`, `gh repo delete`, `gh api -X POST|PUT|PATCH|DELETE` and their siblings need the same explicit request a push does. The explicit-request rule binds every `gh` write verb; none is gated by a hook. GitHub MCP write tools reach the same remote without a shell; they are not guarded by a hook, so every MCP write still requires the same explicit user request.
- **Destructive-git mechanical gating was removed by explicit user decision.** The former `git-commit-block.cjs` classifier hook that denied irreversible working-tree/history operations is gone; only the literal `permissions.ask` patterns in `.claude/settings.json` remain (and `ask` still prompts even under `defaultMode: bypassPermissions`). A destructive spelling outside that literal set therefore runs without a prompt — e.g. `git switch -f`/`--discard-changes`, `git checkout -f`, `git checkout <ref> -- <path>`, `git restore <path>`, `git rm -f`, `git branch -M`, `git stash clear`, `git reflog delete|expire`, `git filter-branch`/`filter-repo`, `git update-ref -d`, `git worktree remove -f`, `git read-tree --reset`, `git submodule … -f`. Treat that list as not-read-only and ask before running any of them.

**Hygiene:**

- Run linting before commit
- Run tests before push (DO NOT ignore failed tests just to pass the build)
- Keep commits focused on actual code changes
- **DO NOT** commit confidential information (dotenv files, API keys, credentials) to git
- Clean, professional commit messages — conventional commit format

## Bulk Edit Safety (MANDATORY for multi-file replacements)

When performing bulk find/replace across 3+ files:

1. **Preserve syntax integrity** — Never insert comments that break language syntax (e.g., `ClassName // comment<T>` breaks C# generics). Comments go AFTER complete type expressions.
2. **Grep verification** — After ALL replacements, grep entire repo for old term to catch missed references in docs, configs, catalog tables, tests.
3. **Doc cascade check** — When deleting/renaming components (agents, skills, hooks), map to affected docs:
    - `.claude/agents/**` → `.claude/docs/agents/README.md`, `.claude/docs/agents/agent-patterns.md`
    - `.claude/skills/**` → `.claude/docs/skills/README.md`
    - `.claude/hooks/**` → `.claude/docs/hooks/README.md`

## Doc Review (MANDATORY at session wrap-up)

After completing code changes, check for stale documentation:

1. Run `git diff --name-only` to list changed files
2. Map changed files to relevant docs:
    - Framework hook/skill/workflow files → their owning `.claude/docs/` references and any declared mirrors
    - Product code, tests, and docs → the canonical owners selected by `docs/project-config.json`, module metadata, and applicable project references (for example, the configured spec/test-case carrier or frontend/backend reference when that area is documented)
    - Generated context or mirror files → regenerate through their declared owner command; do not hand-edit generated outputs
    - `CLAUDE.md` structural changes → `.claude/docs/README.md` and the documented context/mirror sync route
3. Flag stale docs in final review task or update immediately
4. Output `No doc updates needed` if no mapping applies

**Use `/watzup` skill** for automatic end-of-session doc check.

---

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** understand existing code FIRST — read, grep 3+ patterns, run graph trace before ANY modification
**MANDATORY IMPORTANT MUST ATTENTION** follow formatters, conventions, and path-scoped style rules selected by project config or references; never assume blank lines encode dependencies
**MANDATORY IMPORTANT MUST ATTENTION** place logic with the owner selected by project config, references, accepted decisions, and existing code; do not assume a fixed layer hierarchy
**MANDATORY IMPORTANT MUST ATTENTION** ensure zero broken builds — code must compile with no syntax errors
**MANDATORY IMPORTANT MUST ATTENTION** follow YAGNI/KISS/DRY — no speculative abstractions
**MANDATORY IMPORTANT MUST ATTENTION** apply surgical changes (context-aware) — bug fix: diff test (every line traces to the bug). Review/enhancement: implement improvements you see AND announce them explicitly. Never silently scope-creep either way.
**MANDATORY IMPORTANT MUST ATTENTION** surface ambiguity before coding — list assumptions (scope/format/volume/constraints), present interpretations with effort estimates, push back when simpler exists. Never pick silently.
**MANDATORY IMPORTANT MUST ATTENTION** define verifiable success criteria per task — step → verify: [observable check], not "make it work"
**MANDATORY IMPORTANT MUST ATTENTION** tests verify intent — each meaningful test names the business rule/invariant it protects and must fail if that rule breaks
**MANDATORY IMPORTANT MUST ATTENTION** run doc review at session wrap-up (map changed files → affected docs)
**MANDATORY IMPORTANT MUST ATTENTION** activate relevant skills from catalog during the process
**MANDATORY IMPORTANT MUST ATTENTION** names express PURPOSE not CONTENT — "OrXxx/AndYyy" joining roles/types/statuses = content-driven = rename. "Or" in behavioral idioms (`FirstOrDefault`, `SuccessOrThrow`) is fine.
**MANDATORY IMPORTANT MUST ATTENTION** public/cross-layer abstractions express capability or domain contract, not provider/framework/transport; keep technical details on concrete adapters and verify the contract against callers and implementations.
