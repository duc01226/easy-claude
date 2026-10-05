<!-- Last scanned: 2026-10-03 -->

# Code Review Rules

<!-- This file is referenced by Claude skills and agents for project-specific context. -->
<!-- Read by review skills and agents through the universal project-reference-docs-guide protocol and the Doc Lookup table in CLAUDE.md. -->

<!-- PROMPT-ENHANCE:QUICK-SUMMARY:START -->

## Quick Summary

**Goal:** Review easy-claude changes against the repository's actual CJS hook runtime, canonical-source architecture, skill/agent authoring conventions, and verification gates.

**Summary:**

- Start with the changed artifact's runtime and ownership boundary; use the Decision Trees before applying a checklist.
- Treat `.claude` as authored source and generated mirrors as verification outputs.
- Require repository evidence for findings and observable verification for completion claims.

**Read when:** editing or reviewing framework code, skills, agents, or generated output.

**Review sequence:** classify the changed artifact → trace its dependencies → apply the relevant rules/checklist and fix the settled change → regenerate affected mirrors/docs → verify the final tree. For code-changing work, read `.claude/skills/shared/protocols/verify-last-order.md` when deciding test timing; tests run after implementation and static review, with its mutation, failure and re-review rules.

<!-- PROMPT-ENHANCE:QUICK-SUMMARY:END -->

## Critical Rules

1. **Match runtime boundary** — Hooks and hook libraries are strict CommonJS `.cjs`; ESM tooling stays in `.mjs` (`.claude/hooks/graph-session-init.cjs:1-25`; `.claude/scripts/codex/sync-context-workflows.mjs:1-8`).
2. **Centralize event adaptation** — Use `runHook`/`runHookSync` for standard lifecycle handling; use `runPreToolHookSync`/`runPreToolHook` for stream-safe PreToolUse result and exit control (`.claude/hooks/lib/hook-runner.cjs:292-375`; `.claude/hooks/lib/stdin-parser.cjs:28-97`).
3. **Separate policy rejection from runtime failure** — Exit `2` only for a proved unsafe operation; malformed input, timeouts, and exceptions remain fail-open unless a tested deny-closed model exists (`.claude/hooks/review-commit-gate.cjs:331-336` opts into deny-closed input/error codes; `.claude/hooks/lib/hook-runner.cjs:241-258` defaults them to `0`).
4. **Protect output channels** — stdout carries intentional result/context; diagnostics and rejection reasons use stderr (`.claude/hooks/lib/hook-runner.cjs:176-181,199-200`; `.claude/hooks/lib/debug-log.cjs:34-40,60-66`).
5. **Canonical source before mirrors** — Edit `.claude` owners, then generate `.agents`, `.codex`, and `AGENTS.md`; verify parity and provenance (`.claude/skills/shared/sync-inline-versions.md:3-7`; `package.json:2`).
6. **Entrypoints depend inward** — Hook files orchestrate lifecycle events and delegate reusable behavior to `hooks/lib` or focused hook-local subsystems (`.claude/hooks/session-end.cjs:15-48`; `.claude/hooks/doc-sync-gate.cjs:39-40,238-260`).
7. **Evidence before claims** — Every rule, finding, and recommendation needs `file:line`, grep, graph, or command output; completion requires fresh verification.

---

## Backend Rules

### CJS Executable Layer

### File Structure

- Extension: `.cjs` (mandatory)
- Location: `.claude/hooks/<name>.cjs`
- Shared utilities: `.claude/hooks/lib/<name>.cjs`
- File naming: kebab-case (e.g., `review-commit-gate.cjs`, `session-init.cjs`)
- Cohesion: entrypoints orchestrate one lifecycle event; move reusable or independently testable logic to `hooks/lib` or a focused hook-local subsystem

### Required Patterns

| Pattern                            | How                                                                         | Why                                                  |
| ---------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------- |
| Choose one shared event adapter    | `runHook`/`runHookSync`; `runPreToolHookSync`/`runPreToolHook` for PreToolUse outcomes      | Prevent divergent stdin/default/error semantics      |
| Load config when behavior needs it | Use shared config/schema helpers at the owning boundary                     | Avoid universal imports and duplicate JSON reads     |
| Use debug logging for diagnostics  | `debug`/`debugError` write gated diagnostics to stderr                      | Keep stdout clean; user-facing errors remain visible |
| `'use strict'`                     | Top of every file                                                           | Catch silent errors                                  |
| Make behavior observable           | Export helpers when unit seams help; otherwise cover the process entrypoint | Test behavior without forcing artificial exports     |

### Golden-Path Examples

- Standard asynchronous lifecycle: `graph-session-init.cjs` uses `runHook`, returns early when configuration or graph prerequisites are absent, and suppresses result output (`.claude/hooks/graph-session-init.cjs:25-44,69-82`).
- Standard synchronous lifecycle: `session-end.cjs` uses `runHookSync` and delegates cleanup/state operations to shared libraries (`.claude/hooks/session-end.cjs:16-43,60-84`).
- Explicit blocking policy: `review-commit-gate.cjs` runs through `runPreToolHookSync`, returns `undefined` (allow) for any statement it parses as non-commit, and returns `{ code: 2, stderr }` for a commit whose changeset lacks a review or skip receipt — or for unparsable text that places `commit` right after `git`, which fails closed (`.claude/hooks/review-commit-gate.cjs:288-327,331-336`).

### Exit Code Rules

| Code | Meaning                              | Use Case                                                                                                                                       |
| ---- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `0`  | Success / allow / non-critical error | Default for all hooks                                                                                                                          |
| `2`  | Block operation                      | Verified policy violations; `review-commit-gate` (unreviewed agent `git commit`) is the only registered blocking hook                            |

**Rule:** Always exit `0` on errors unless the hook is explicitly a safety blocker. Hooks must be non-blocking by default.

### Error Handling

Runner-managed hooks inherit fail-open exception and timeout handling from `runHook`/`runHookSync` (`.claude/hooks/lib/hook-runner.cjs:309-318,330-334,371-374`). Blockers must catch runtime failures separately from verified policy rejection, as `review-commit-gate.cjs` does: a capture exception is reported via `reportHookInternalError` and blocked with a distinct reason (`.claude/hooks/review-commit-gate.cjs:305-314`).

### Performance

Read `.claude/skills/shared/protocols/measured-capacity-engineering.md` when changing a hot path, cache or capacity/scaling claim; apply workload/SLO evidence, bounded work, safe reuse and overload/recovery proof. Read `.claude/skills/performance-review/references/performance-knowledge.md` §10.1 for capacity experiments and §6.1 for cache placement.

- Keep latency-sensitive gates local and bounded; lifecycle hooks may perform asynchronous work under their configured budget.
- Preserve deliberate network/install adapters: configured notification requests have timeout/circuit-breaker handling (`.claude/hooks/notifications/lib/sender.cjs:99-167`); active graph initialization can install missing dependencies (`.claude/hooks/graph-session-init.cjs:43-53`). Review their configuration, authorization, cancellation and failure behavior rather than imposing a blanket network ban.
- Minimize context injection — publish concise relevant guidance and verified discovery instead of full documentation dumps (`.claude/docs/hooks/architecture.md`, Context Injection).

---

## Frontend Rules

Not applicable to this repository: Phase-0 detection found no frontend application or framework manifest. Skill-local reader/Remotion assets are reviewed within their owning skill boundaries; do not generalize them into application frontend rules (`docs/project-config.json`, `modules` and `styling`; `docs/project-reference/frontend-patterns-reference.md:7-18`).

---

## Architecture Rules

| Rule                      | DO — repository evidence                                                                                                                                                             | DON'T                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Canonical → generated     | Edit `.claude` owners, then run sync + parity/provenance verification (`.claude/skills/shared/sync-inline-versions.md:3-7`; `package.json:2`)                                        | Hand-edit `.agents`, `.codex`, or `AGENTS.md`; those consumers are overwritten                |
| Entrypoints → libraries   | Register lifecycle handlers declaratively and import reusable helpers inward (`.claude/settings.json`, `hooks`; `.claude/hooks/session-end.cjs:16-43`)                                 | Import top-level hooks from libraries or duplicate reusable infrastructure inside entrypoints |
| One protocol owner        | Own shared protocol bodies in `sync-inline-versions.md`; publish them through `build-protocol-projection.cjs` and verify every carrier                                         | Maintain standalone or copy-pasted protocol bodies without a canonical owner/parity check     |
| Narrow security blocking  | Prefilter untrusted input; exit `2` on a verified policy breach, or fail closed where a tested deny-closed model owns the input (`.claude/hooks/review-commit-gate.cjs:288-327`) | Treat advisory/context gates as security violations, or fail closed on input the gate does not own |
| Isolated tests            | Use temp directories and restore environment state (`.claude/hooks/tests/lib/test-utils.cjs:11-20,156-192`)                                                                          | Leak cwd, environment variables, or shared temp state across suites                           |
| Schema-driven config/docs | Keep config shape in the shared schema and doc impact in the shared classifier (`.claude/hooks/lib/project-config-schema.cjs`; `.claude/hooks/lib/doc-sync-classify.cjs:24`) | Hardcode module/spec roots, credentials, or doc-impact rules in individual hooks              |

---

Focused injection does not authorize truncating required reference-document reads. Parser-only lifecycle handlers require a documented lifecycle need and process-boundary coverage; use the shared parser at that boundary. Read `docs/specs/ContextDelivery/README.ProjectContextIntake.md` when reviewing project-reference loading and `docs/specs/ContextDelivery/README.ProtocolDelivery.md` when reviewing universal delivery. Default-root examples; `specRoots.business.path` in `docs/project-config.json` overrides these locations.

## Skill Definition Conventions

When reviewing `SKILL.md` or any Markdown under `.claude/skills/`, `.agents/skills/`, or `.codex/skills/`, read the host's `skill-creator/SKILL.md` and `skill-creator/references/authoring-quality.md`; apply the relevant quality gate to preserve intent, authority, useful guidance, and discovery. Trace mirror findings to their canonical `.claude` source.

### Directory Structure

```
.claude/skills/<skill-name>/
├── SKILL.md              # Entry point (mandatory)
└── references/           # Optional: progressive disclosure for detailed content
    ├── topic-a.md
    └── topic-b.md
```

### SKILL.md Format

**YAML Frontmatter:**

```yaml
---
name: skill-name # Must match directory name exactly
version: 2.0.0 # Semantic versioning (MAJOR.MINOR.PATCH)
description: '...' # Include trigger keywords for discoverability
---
```

`name` and `description` identify and route the skill; authored `.claude/skills` retain version metadata; generated host projections may remove unsupported fields. Add only metadata supported by the skill's behavior and project conventions, such as `execution-mode`, `context-budget`, or `disable-model-invocation` (`.claude/skills/scan/SKILL.md:1-5`; `.claude/skills/code-quality-review/SKILL.md:1-7`; `.claude/skills/ui-design/SKILL.md:1-6`; `docs/project-config.json`, `skillConventions`).

### Naming Rules

| Rule                          | Example                                         | Anti-Pattern                           |
| ----------------------------- | ----------------------------------------------- | -------------------------------------- |
| lowercase-hyphen-case only    | `changes-review`                                | `CodeReview`, `code_review`            |
| Max 64 characters             | `arch-security-review`                          | `angular-19-nx-component-review-skill` |
| Characters: `a-z`, `0-9`, `-` | `code-simplifier`                               | `code_simplifier`, `Code Simplifier`   |
| `name` field = directory name | `name: <skill-name>` in `<skill-name>/SKILL.md` | Mismatch between name and directory    |
| No redundant suffixes         | `debug`                                         | `debugging-skill`                      |

### Shared Modules (`.claude/skills/shared/`)

- Shared knowledge has one canonical owner; extract an abstraction for a real second consumer or an evidenced change axis, with matched lifecycle and trust constraints. Read `.claude/skills/shared/protocols/core-engineering-principles.md` when deciding reuse versus extraction.
- Keep modules cohesive with explicit dependencies; progressive disclosure carries supporting detail. Word counts and consumer quotas do not establish abstraction quality.
- Shared protocol bodies follow the hybrid projection contract. Read `.claude/skills/shared/protocols/shared-protocol-duplication-policy.md` when changing a protocol or carrier; skill entrypoints use generated guides with full-source fallback; agents and selected mode references retain role bodies.

### Skill Content Rules

- Include `> **[IMPORTANT]** Use TaskCreate to break ALL work into small tasks BEFORE starting` when applicable
- Include evidence gate: every recommendation needs `file:line` proof
- Reference project-specific docs via `**MUST READ**` callouts
- Move substantial supporting detail to `references/` when it is not required for routing or the execution spine

---

## Agent Definition Conventions

### File Format

- Location: `.claude/agents/<agent-name>.md`
- Naming: kebab-case (e.g., `code-reviewer.md`, `fullstack-developer.md`)

### YAML Frontmatter

```yaml
---
name: agent-name
description: >-
    What this agent does and when to use it.
model: inherit
memory: project
# skills: related-skill-name # when the agent delegates to a skill
---
```

`name` and `description` are the routing identity. Current agents also declare `model` and `memory`; connected contracts are declared in the `AGENT-SKILL-CONNECTIONS` block; optional `skills` metadata is meaningful only when a host supports it (`.claude/agents/code-reviewer.md:1-10`; `.claude/agents/frontend-developer.md:1-11`; `.claude/agents/architect.md:1-12`).

### Required Sections

| Section                | Purpose                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| `## Quick Summary`     | Goal, concise operating summary, and the ordered workflow when the role owns one |
| `## Project Context`   | Reference docs to read before project-specific work                              |
| `## Key Rules`         | Role-specific rules with evidence and examples where helpful                     |
| `## Output`            | Expected deliverable format                                                      |
| `## Closing Reminders` | Highest-priority current instructions repeated at the end                        |

Use a dedicated `## Workflow` when the agent owns an ordered process. Current roles retain purpose, context, rules, an output contract (including `Output Format`), and closing reminders; their workflow details remain role-specific (`.claude/agents/code-reviewer.md:12-30`; `.claude/agents/frontend-developer.md:13-30`; `.claude/agents/architect.md:14-30`).

### Agent Design Rules

- Agents follow their connected skill contracts; keep role-specific quality instructions and authority boundaries in the agent definition
- Include the role's evidence gate in its live instructions
- Include external memory directive for complex work (write to `tmp/reports/`)
- Include project-specific reference doc callouts
- Keep focused: one agent = one specialized role

---

## Anti-Patterns

| Anti-Pattern                                                                     | Why It's Bad                                              | Correct Approach                                                                   |
| -------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| ES module syntax in hooks (`import`/`export`)                                    | Breaks Node.js CJS hook loading                           | Use `require()`/`module.exports`                                                   |
| Duplicated hand-rolled `process.stdin` parsing without a documented blocker need | Divergent empty-input, malformed-input, and exit behavior | Use `runHook`/`runHookSync`, or `runPreToolHookSync`/`runPreToolHook` for PreToolUse outcomes |
| Hardcoded service paths in hooks                                                 | Breaks portability across projects                        | Use `docs/project-config.json`                                                     |
| Skipping hook tests after changes                                                | Regressions go undetected                                 | Verify affected hook behavior on the settled final tree after static review                                   |
| Skill without SKILL.md                                                           | Not discoverable by catalog or hooks                      | Always create SKILL.md as entry point                                              |
| Hook exits non-zero on non-critical error                                        | Blocks Claude Code operations unnecessarily               | Exit `0` on error; only safety hooks use exit `2`                                  |
| Injecting entire doc files into context                                          | Bloats context window, wastes tokens                      | Inject focused snippets, truncate to relevant sections                             |
| Creating new files when similar exist                                            | Duplication, inconsistency                                | Extend existing files unless architecture demands separation                       |
| "Should work" / "probably fixed" claims                                          | No verification evidence                                  | Run command, read output, cite evidence                                            |
| Copy-pasting code instead of reusing patterns                                    | DRY violation, maintenance burden                         | Search for existing abstractions first (`Grep`/`Glob`)                             |
| Implementing without reading existing code                                       | Wrong patterns, missed conventions                        | Follow understand-code-first-protocol: read 3+ similar examples                    |
| Shared abstraction without an evidenced consumer/change boundary | Adds maintenance cost without protecting a contract | Reuse or extract only where it lowers future change cost |
| Magic numbers/strings in hook logic                                              | Unclear intent, hard to maintain                          | Extract to named constants                                                         |
| Agent duplicating its connected skill procedure | Logic diverges over time | Follow the connected contract; preserve role quality and authority rules |
| Mutable fixture state outside the test owner | Creates order-dependent or adopter-specific failures | Build isolated fixture projects and clean up owned state in `finally` |
| Claiming completion without fresh verification                                   | May be wrong; "should pass" is not evidence               | Run verification command, read output, cite result                                 |
| 3+ fix attempts on same issue without reassessing                                | Root cause not identified, guessing                       | Stop, report attempts, investigate root cause                                      |

---

## Decision Trees

| Decision                         | Route                                                                                                                                                                       |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| How should a hook read an event? | Standard lifecycle/result serialization → `runHook`/`runHookSync`; PreToolUse result/exit control → `runPreToolHookSync`/`runPreToolHook` plus process-level allow/deny/malformed-input tests  |
| Where should new logic live?     | Reusable/pure behavior → `hooks/lib`; one lifecycle orchestration → top-level hook; isolated complex subsystem → focused hook-local directory                               |
| Which exit code?                 | Proven policy violation → `2`; irrelevant event, malformed input, timeout, dependency/config/runtime failure → `0` unless a documented and tested deny-closed model applies |
| Which file is authoritative?     | `.claude` authored source → edit there, sync mirrors, run parity/provenance verification; generated mirror → never edit directly                                            |

---

## Testing Requirements

### Hook Testing

| What                      | Command                                                                                                                                                                                                                        | When                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| All hook tests            | `node .claude/hooks/tests/test-all-hooks.cjs`                                                                                                                                                                                  | Final reviewed hook batch   |
| Core lib tests            | `node .claude/hooks/tests/test-lib-modules.cjs`                                                                                                                                                                                | Final reviewed lib batch    |
| Extended lib tests        | `node .claude/hooks/tests/test-lib-modules-extended.cjs`                                                                                                                                                                       | Final reviewed lib batch    |
| Swap engine               | `node .claude/hooks/tests/test-swap-engine.cjs`                                                                                                                                                                                | Final reviewed swap batch   |
| Project config validation | `node -e "const {validateConfig,formatResult}=require('./.claude/hooks/lib/project-config-schema.cjs');console.log(formatResult(validateConfig(JSON.parse(require('fs').readFileSync('docs/project-config.json','utf-8')))))"` | Final reviewed schema batch |

### Manual Hook Testing

Use the platform-neutral Node process helper from `.claude/hooks/tests/lib/hook-runner.cjs` when checking an event payload and exit/output behavior; `runHook` sends JSON stdin and captures both channels. Use `runCodexLauncher` when the generated host entrypoint is the contract under test.

PowerShell on Windows:

```powershell
'{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"git status"}}' | node .claude/hooks/review-commit-gate.cjs
$LASTEXITCODE  # Verify exit code
```

### Testing Rules

- Every hook must have observable test coverage in `hooks/tests/`
- Export helpers when a unit seam is useful; process-test entrypoints when exported helpers would be artificial
- Tests must run before push — DO NOT ignore failed tests to pass CI
- Use the repository formatting/tooling contract; no standalone lint command is configured in `package.json`. Preserve syntax checks and required source/mirror verifiers.
- Batch code-changing verification after the settled static review; read `.claude/skills/shared/protocols/verify-last-order.md` when organizing implementation verification
- New hooks: add manual test command in extending-hooks pattern

---

## Checklists

### Hook PR Checklist

- [ ] Uses CommonJS (`require`/`module.exports`)
- [ ] Uses the shared event adapter suited to the lifecycle: runner for standard handling, or PreToolUse runner for explicit result/exit semantics
- [ ] Loads config via `project-config-loader.cjs` (if config needed)
- [ ] Handles missing config gracefully (fail-open)
- [ ] Has `'use strict'` at top
- [ ] Has test coverage in `hooks/tests/`
- [ ] Exit codes follow convention (`0` = allow, `2` = block for safety only)
- [ ] No hardcoded project-specific values
- [ ] Latency-sensitive gates stay local; deliberate external adapters preserve bounded configured behavior
- [ ] Has an observable test seam: exported helper or process-level entrypoint coverage
- [ ] Context injection is concise (no full doc dumps)
- [ ] Entrypoint is cohesive and delegates reusable or independently testable logic
- [ ] Registered in `.claude/settings.json` with correct event and matcher
- [ ] All hook tests pass after changes

### Skill PR Checklist

- [ ] Has `SKILL.md` with routing frontmatter (`name`, `description`) and repository version metadata
- [ ] `name` field matches directory name exactly
- [ ] Uses lowercase-hyphen-case, under 64 characters
- [ ] Has version in semantic format (MAJOR.MINOR.PATCH)
- [ ] Description includes trigger keywords for discoverability
- [ ] Shared protocol carriers follow their canonical hybrid projection contract
- [ ] Supporting detail not required for routing or the execution spine uses progressive-disclosure `references/`
- [ ] Scripts have tests (if applicable)
- [ ] Referenced in workflow if applicable
- [ ] Shared abstractions have an evidenced consumer/change boundary and reduce future edit sites

### Agent PR Checklist

- [ ] Is a markdown file in `.claude/agents/`
- [ ] Has routing frontmatter (`name`, `description`) plus applicable runtime metadata (`model`, `memory`, `skills`)
- [ ] Uses kebab-case filename
- [ ] Has Quick Summary, Project Context, Key Rules, an output contract, and Closing Reminders; includes Workflow when the role owns ordered steps
- [ ] Includes an evidence gate in the live role instructions
- [ ] Includes external memory directive (write to `tmp/reports/`)
- [ ] Includes `**MUST READ**` callouts for project reference docs
- [ ] Follows connected skill contracts; preserves role-specific quality and read/write authority

### General PR Checklist

- [ ] File naming follows kebab-case convention
- [ ] Files are cohesive; reusable or independently testable logic is delegated to the lowest appropriate module
- [ ] No confidential data committed (.env, API keys, credentials)
- [ ] Commit message uses conventional format (feat, fix, docs, refactor, etc.)
- [ ] No "should work" / "probably" / "I think" language in code comments
- [ ] Changed files checked against related docs for staleness (hook changes -> hooks README, skill changes -> skills README)
- [ ] Grep verification performed after bulk replacements (old term returns 0 results)

---

## Lessons-Informed Rules

These rules derive from project lessons learned (`lessons.md` in the project-reference docs root — default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path):

1. **Mirror copies create staleness traps** — After editing a canonical source, grep for ALL mirrored copies (configs, skill definitions, docs, catalogs) and update them. Verify with `grep` after edits.
2. **Docs embedding derived data go stale silently** — Documentation that inlines data from a canonical source (workflow sequences, schemas, config tables) must be updated alongside the source. Map all docs that embed canonical data before modifying the source.
3. **Trace full dependency chain after edits** — Changing a definition misses downstream variables and consumers. Always trace the full chain.
4. **Grep for old terms after bulk replacements** — AI over-trusts its own find/replace completeness. Always grep the full repo after bulk edits.
5. **Check downstream references before deleting** — Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
6. **Re-read files after context compaction** — Edit tools require prior Read in the same context. After compaction, all read state is lost — always re-read before editing.

---

## Red Flags That Should Block a Review

Treat these as review signals and trace the reachable consequence before assigning severity. Required binary gate failures remain blockers; read `.claude/skills/shared/protocols/severity-rubric.md` when grading findings.

| Red Flag                                                  | Action                                     |
| --------------------------------------------------------- | ------------------------------------------ |
| ES module syntax in a `.cjs` hook                         | Block — will break hook loading            |
| Hook exits non-zero on non-critical error                 | Block — will break Claude Code operations  |
| Hardcoded file paths that should come from config         | Block — breaks portability                 |
| Shipped test uses the host repo or unscrubbed inherited env/home-dir config, or a shipped test/script assumes one OS's tools — no temp fixture, env scrub or guard | Block — passes here, fails in adopter projects or on another OS; read `integration-test-reference.md` § Portable Test Contract when fixing it |
| Missing SKILL.md in a skill directory                     | Block — skill is undiscoverable            |
| Agent `name` field doesn't match filename                 | Block — agent routing will fail            |
| Sensitive data in committed files (.env, keys)            | Block — security violation                 |
| Tests skipped or ignored to pass CI                       | Block — masks regressions                  |
| Completion claims without verification evidence           | Block — unverified claims are unreliable   |
| 3+ fix attempts on same issue without root cause analysis | Stop — reassess approach before continuing |
| Unbounded or unconfigured external request in a hook | Trace the adapter owner, authorization, time budget and error path; intentional bounded notifications/install paths are permitted |

---

## Cross-Reference

- **Read by:** review skills and agents through the universal `project-reference-docs-guide` protocol and the Doc Lookup table in `CLAUDE.md`
- **Consumed by:** `code-quality-review`, `changes-review`, and the `code-reviewer` agent
- **Canonical shared protocol source:** `.claude/skills/shared/sync-inline-versions.md`
- **Protocol projection builder:** `.claude/scripts/build-protocol-projection.cjs`
- Read `.claude/docs/hooks/README.md` when locating lifecycle registrations; read `.claude/docs/hooks/extending-hooks.md` when adding a hook; read `.claude/docs/hooks/architecture.md` when reviewing runtime boundaries
- Read `.claude/docs/skill-naming-conventions.md` when naming or authoring a skill
- Read `.claude/docs/agents/agent-patterns.md` when authoring an agent role

---

<!-- PROMPT-ENHANCE:CLOSING-REMINDERS:START -->

## Closing Reminders

1. **Prove the runtime boundary first** — `.cjs` hooks, `.mjs` tooling, and event-specific adapters have different contracts.
2. **Edit canonical source first** — change `.claude`, regenerate mirrors, and verify parity/provenance before approval.
3. **No claim without evidence** — complete the reviewed batch, run its final observable checks, and cite evidence for findings and completion.

<!-- PROMPT-ENHANCE:CLOSING-REMINDERS:END -->
