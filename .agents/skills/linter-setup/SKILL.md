---
name: linter-setup
description: '[Quality] Use when configuring code quality tooling for a tech stack — linters, formatters, static analysis, pre-commit hooks, CI gates.'
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->
## Codex Project-Reference Loading (Hook-Independent)

Claude and Codex use static project-reference loading as the authority; hooks may accelerate discovery but never replace the explicit read.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**
- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Ensure every code change is caught by an automated quality sensor — both locally (fast feedback) AND in CI (enforcement gate) — before it reaches main, with zero divergence between the two, by installing the full computational feedback sensor layer for the tech stack (linters, formatters, type checkers, static analyzers, pre-commit hooks, and CI quality gates).

**Summary:**

- **Purpose** — install the full computational feedback sensor layer for the detected stack so no code change reaches main unguarded: strict-by-default, research-driven (NEVER hardcode tools), local-and-CI with zero divergence, proven to block.
- **Main steps, in order:** (1) **Detect stack** — read `plan.md` → architecture report → tech-stack report, write `stack-profile.md`; ask the user directly if a critical field is undetectable. (2) **Research each tool category** — linter, formatter, type checker, static analyzer, dependency scanner, architecture fitness — via QUERY TEMPLATES; score top 3; present top 2-3 per category by asking the user directly, user picks. (3) **Install & configure** — STRICTEST reasonable defaults (loosen ONLY with explicit user approval), document what each rule catches, add cache dirs to `.gitignore`, ALWAYS emit a stack-agnostic `.editorconfig`. (4) **Wire the pre-commit hook** — formatter→linter→type-check, staged-files-only, <30s; document setup in `README.md`. (5) **Configure the CI quality gate** to MIRROR the hook (format→lint→type→static→dep-scan), coverage diagnostic-only. (6) **Verify** — fire the hook with an INTENTIONAL violation, confirm it blocks before declaring complete. (7) **Next steps** — ask the user directly to continue to `$harness-setup`.
- **Non-negotiables** — research-driven tool choice (NEVER hardcode), strict-by-default, local↔CI zero divergence, prove the gate blocks before done.

**Output:** Config files at project root + pre-commit hook config + CI quality gate step + `.editorconfig`.

**When invoked:** After `$scaffold` in the greenfield workflow, before `$harness-setup`.

**Design principles:**

- **Generic** — No hardcoded tool names in the research protocol. AI researches the stack's ecosystem.
- **Research-driven** — Per-stack research → present top 2-3 options → user picks → configure.
- **Strict-by-default** — Propose strictest reasonable settings; loosen only with explicit user approval.
- **Purpose-first** — Every category has a WHY; understanding purpose prevents cargo-culting.
- **Integration-ready** — Every tool must work both locally (fast feedback) AND in CI (enforcement gate).

---

## Stack Detection Protocol

Read from (in priority order):

1. `plan.md` YAML frontmatter — look for `tech_stack`, `language`, `framework` fields
2. Architecture-design report — look for tech stack comparison table
3. Tech-stack-comparison report — look for chosen stack

Extract: primary language(s), framework(s), CI provider/tooling, test framework, package manager.

Write detected profile to `.ai/workspace/linter-setup/stack-profile.md`:

```markdown
# Stack Profile

Language: {language}
Framework: {framework}
Package Manager: {npm/pip/dotnet/go/cargo/etc}
CI Provider/Tooling: {github-actions/gitlab-ci/azure-pipelines/etc}
Test Framework: {framework}
```

If any critical field undetectable → ask the user directly to confirm before research.

---

## Tool Research Protocol

**MANDATORY IMPORTANT MUST ATTENTION** — This section uses QUERY TEMPLATES, not tool names. DO NOT hardcode specific tool recommendations. Research current ecosystem for the detected stack and present options.

For each tech stack layer detected, research these TOOL CATEGORIES using the query templates below:

| Category                 | Purpose (WHY)                                                      | Research Query Template                                      |
| ------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| **Linter**               | Catch bugs, enforce style, prevent common errors at author time    | `"{language} best linter {year} community standard"`         |
| **Formatter**            | Eliminate style debates, enforce consistent code shape             | `"{language} opinionated code formatter {year}"`             |
| **Type Checker**         | Catch type errors without runtime — strongest computational sensor | `"{language} static type checker {year}"`                    |
| **Static Analyzer**      | Deep bug patterns, complexity, dead code, security CWEs            | `"{language} static analysis SAST tool {year}"`              |
| **Dependency Scanner**   | Known CVEs in dependencies — supply chain security                 | `"{language} dependency vulnerability scanner {year}"`       |
| **Architecture Fitness** | Enforce module boundaries, dependency direction                    | `"{language} architecture linting module boundaries {year}"` |

**Research process per category:**

1. Search with query template (WebSearch if available, otherwise apply knowledge with explicit confidence %)
2. Score top 3 candidates: community adoption, last release date, CI integration ease, config complexity
3. Present by asking the user directly: "For {category} in {language}, which tool?" — top 2-3 as options + brief pros/cons

**IMPORTANT:** Confidence in current ecosystem <80% (fast-moving ecosystem, unfamiliar stack) → use WebSearch to verify before presenting options. — why: tool ecosystems churn fast; stale recommendations cargo-cult dead tools.

### Dependency-Boundary Enforcement (Architecture Fitness detail — options, not defaults)

The **Architecture Fitness** category above is where **dependency-direction / module-boundary** enforcement is chosen. It consumes the `architecture-design` "Arch rules / fitness" scaffold handoff. Treat the following only as **example candidates to research and evaluate for stack fit** — never mandatory installs. Research the current ecosystem, then present the top 2-3 by asking the user directly and let the user confirm:

| Stack family | Example dependency-boundary tools (evaluate, do NOT hardcode) |
| ------------ | ------------------------------------------------------------ |
| JS / TS | dependency-cruiser, eslint-plugin-boundaries (eslint-boundaries), Nx module-boundary lint |
| .NET | NetArchTest, ArchUnitNET |
| JVM | ArchUnit |
| Python | import-linter |
| Go | go-arch-lint / depguard |

Only add a boundary tool when the architecture actually declares dependency directions to enforce. If no cross-module rules are declared, record `N/A — no cross-module dependency rules declared` rather than installing a tool speculatively. Chosen rules MUST encode the architecture's dependency directions and fail CI on a violation, mirroring the pre-commit posture (local↔CI zero divergence). Init/audit grading of whether boundaries exist at all is owned by `architecture-scalability-review`; per-change boundary drift is owned by `architecture-review`. — why: a boundary tool with no declared rules is ceremony; enforcement without CI teeth is documentation.

---

## Installation & Configuration Protocol

After user selects tools per category:

1. Generate install command for detected package manager
2. Generate config file with STRICTEST reasonable defaults
    - Rationale: starting strict is easier to loosen than starting loose is to tighten
    - Loosen ONLY with explicit user approval by asking the user directly
3. Document what each enabled rule catches and why (one line per rule group)
4. Generate sample config file: `.{tool}rc`, `{tool}.config.{ext}`, `pyproject.toml` section, etc.
5. Add tool cache directories to `.gitignore`

**`.editorconfig` (ALWAYS generate — stack-agnostic):**

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

Adjust `indent_size` and `end_of_line` for the detected stack's conventions.

---

## Pre-Commit Hook Setup

> **Note on framework names:** Pre-commit hook frameworks are ecosystem infrastructure standards, not research choices. Naming them here is correct — they are the glue layer, not the quality tools invoked through them. The quality tools (linter, formatter) invoked inside hooks are the research-driven selections from the Tool Research Protocol above.

Detect pre-commit framework for the stack:

- Node.js / JavaScript / TypeScript → Husky + lint-staged OR lefthook (research current community preference)
- Python → pre-commit framework (`pre-commit` package)
- Configured backend/runtime stack → restore/install analyzer tools + custom `.git/hooks/pre-commit` shell script
- Go → pre-commit framework or custom Makefile target
- Rust → cargo-husky OR pre-commit framework
- Java / Kotlin → pre-commit framework or Maven/Gradle Git hooks plugin
- Ruby → overcommit OR pre-commit framework

Configure hooks to run in this order (fastest first to fail fast):

1. Formatter (check only — do not auto-fix in hook)
2. Linter (fail on any error)
3. Type-check (fail on any error)

**Performance constraint:** Hooks MUST run in <30 seconds total for good DX. If slower:

- Configure to run only on staged files (not full codebase)
- Defer slow checks (static analysis, full type-check) to CI only

Generate:

- Hook config file (`.husky/pre-commit`, `.lefthook.yml`, `.pre-commit-config.yaml`, etc.)
- `README.md` section: "## Code Quality — Pre-commit Hooks" with setup instructions for new team members

---

## CI Quality Gate Configuration

Detect CI provider/tooling from repository files:

- `.github/workflows/` → GitHub Actions
- `.gitlab-ci.yml` → GitLab CI
- `azure-pipelines.yml` → Azure Pipelines
- `Jenkinsfile` → Jenkins
- `bitbucket-pipelines.yml` → Bitbucket Pipelines

If not detected → ask the user directly: "Which CI provider/tooling does this repository use?"

Generate CI job/step that:

1. Restores tool cache (install only on cache miss)
2. Runs formatter check (fail on diff — `--check` mode, no auto-fix)
3. Runs linter (fail on any error)
4. Runs type checker (fail on any error)
5. Runs static analyzer (fail on threshold: configurable complexity and duplication)
6. Runs dependency vulnerability scanner (fail on HIGH/CRITICAL CVEs)
7. Reports line-coverage as a DIAGNOSTIC only — NEVER fail the build on a coverage %. Low coverage is a useful untested-area signal; high coverage is not evidence of quality. If a test-strength gate is wanted, ask the user directly: "Configure a mutation-testing tool (e.g. Stryker / PITest / mutmut, per stack) as the CI test-quality gate?" — gate on mutation score (surviving mutant = missing/weak assertion), with line-coverage reported but ungated. Keep behavior/change-coverage (each behavior-changing file has a test asserting the changed outcome) as the meaningful coverage notion.

**MANDATORY:** CI gate must match pre-commit hooks. If a check runs locally, it runs in CI. No divergence.

---

## Verification Checklist

After all config files generated, verify MUST ATTENTION each item:

- Config files exist at project root (linter, formatter, type-checker configs)
- `.editorconfig` created at project root
- Pre-commit hook fires on `git commit` — test with an intentional violation (e.g., add a lint error, attempt commit, verify hook blocks)
- CI step defined and references the correct config files
- Team setup documented in `README.md` — new devs know to run `{hook install command}` after clone
- `.gitignore` updated with tool cache directories

---

## Next Steps

ask the user directly:

- **"$harness-setup continues (Recommended)"** — Set up feedforward guides + inferential sensors to complete the outer harness
- **"$feature-implement"** — Skip harness inventory and begin implementation
- **"Skip"** — Continue manually

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:engineering-foundation-gate -->

> **Engineering Foundation Gate** — CONDITIONAL, evidence-gated, profile-tiered. Judges the PROJECT'S ENGINEERING FOUNDATION: _can this team build, run, test and change the system safely — anywhere, repeatably, as it grows?_ Its companions judge the running system's DESIGN (`scale-technique-gate`: is technique X present? · `scenario-stress-eval`: does it survive scenario Y?) — a system can score perfectly on both while nobody but its author can build it. **State OUTCOMES, never tools:** detect the stack, research the current ecosystem, present 2–3 options, the user decides, record the decision — best practice turns over, the outcome does not.
>
> 1. **Derive the project profile FIRST — from evidence, never assumed.** `Lifecycle` **G** greenfield (foundation being created) / **B** brownfield (foundation exists, under audit) · scale `T0`–`T3` (**reuse** `scale-technique-catalog.md`, never re-derive) · criticality `B0`–`B3` with its criticality-signal floor (**reuse** `scenario-stress-catalog.md`) · repo shape `R0` single module / `R1` few (2–5) / `R2` many modules, multi-team / `R3` monorepo estate · runtime surface. Cite `file:line`/config/CI + confidence. Unknown axis → state the assumption and take the **LOWER** tier; NEVER default to `T3`/`B3`/`R3` — an over-stated profile turns this gate into busywork a small team correctly ignores.
> 2. **Judge all 7 dimensions — always all 7, never a filtered subset** (an omitted row is indistinguishable from an overlooked one). Depth belongs to the named owner; this gate decides only present/absent:
>    - **F1 Reproducible environment** (ALL profiles — the floor) — one documented path takes a clean machine to a running system; toolchain versions pinned; dependencies locked to exact versions; every external prerequisite declared with a way to obtain or fake it; config environment-injected, never machine-implicit; build deterministic. This is what kills _"works on my machine"_ — not carelessness, but a build depending on ambient state nobody declared. → `scaffold` · `architecture-scalability-review`
>    - **F2 Dual execution modes** (`T1+`, multi-contributor, or containerized target; `B2+` regardless of scale) — the system runs on the **bare host** AND **fully containerized** from ONE source of truth for config and topology, and the suites run in BOTH directions (host-run against a containerized system, and wholly inside a container). Both modes **exercised**, so neither rots. Host mode buys a fast inner loop and a debugger; container mode buys CI/production parity and a trustworthy day one — a project with only one teaches people to work around it undocumented. A mode honestly dropped with a stated reason is `N/A`; the defect is the **claimed-but-rotten** mode. → `scaffold` · `devops` · `production-readiness-review`
>    - **F3 Environment-portable tests** (local+CI all profiles; production-shaped `T1+`/`B2+`) — the SAME suites run against local, CI and production-like targets, **parameterized by configuration, never by forked test code** (only one fork ever stays maintained, so forking guarantees divergence). Missing capability reports `ENVIRONMENT-BLOCKED` rather than silently passing; unsafe-in-production tests are excluded by an **enforced** mechanism whose absence fails loudly, not by a convention someone must remember. _"Runs in prod"_ means a safe, declared, **NON-MUTATING** subset. → `test-architecture-execution-contract` · `integration-test-review`
>    - **F4 Test-strength proof** (wherever tests exist) — evidence the suite **actually fails when the code is wrong**; a passing suite means nothing until it is known to be capable of failing for the right reason. Strongest available first: (a) **automated fault injection** scoped to CHANGED code — a surviving defect is a missing or vacuous assertion; gate on it where the ecosystem offers a workable tool. (b) **Deliberate defect-seeding drill — the universal fallback, needing no tooling and available in every ecosystem:** break the production code behind a top invariant, run the suite, record **WHICH NAMED TEST went red**, restore. Nothing went red ⇒ that behavior has no protection — write the killing test. (c) **Assertion-intent audit:** flag assertions that would still hold under an inverted implementation, that assert only non-nullness or a type, that re-assert the input, or that assert infrastructure bookkeeping instead of the outcome the system owns. **Line coverage is a DIAGNOSTIC, never a gate** — low coverage is a useful negative signal; high coverage is not evidence of quality, and gating on the percentage reliably produces tests written to touch lines rather than protect behavior. **Scope boundary — do NOT re-litigate a solved question:** this gate asks only whether the PROJECT HAS a test-strength mechanism wired into its harness at all; PER-CHANGE enforcement is already owned by `integration-test-review` Gate 1's Mutation Probe Ledger (tool path + manual fallback, ledger required either way). Report the setup gap here, the assertion gap there, never both. → `harness-setup` (sensor design) · `integration-test-review` (per-change enforcement)
>    - **F5 Performance & scale-under-data** (`T1+`/`B2+` for a real tier; `T0`/`B0` = one documented largest-expected-volume check) — performance **MEASURED by something that RUNS and CAN FAIL**, not reasoned about. The companion gates can be fully satisfied by a system that has never once been run against a large dataset; this is the executable counterpart. Requires: a runnable perf tier with a documented command (it belongs in the tier matrix); on-demand **realistic volume AND realistic shape** — distribution, cardinality, skew, not a million identical rows; **named latency/throughput/memory budgets the run ASSERTS** (a perf test that only reports numbers is a dashboard, and eventually nobody reads it); growth compared across **≥2 volumes ~10× apart**, because one data point cannot distinguish O(n) from O(n²); and resource exhaustion as a **tested, bounded** outcome — backpressure, paging or a clean error rather than an OOM kill, with unbounded result-sets, unbounded in-memory accumulation and unbounded concurrency provably absent or bounded on the paths that matter. State whether a number is a regression signal or a capacity statement. → `performance-review` · `seed-test-data`
>    - **F6 Build & change scalability** (`R1+` declared style + boundaries; `R2+` computable affected set, enforced checks, measured incrementality) — build/test cost and blast radius **do NOT grow with the codebase**. Every project is fast on day one; the foundation question is whether the tenth module costs what the second did. Requires: the affected module/sub-domain set is **COMPUTABLE** because inter-module dependencies are explicit and declared; incrementality and caching are real and **measured** (claimed caching that never hits is an invisible failure); boundaries enforced **MECHANICALLY**, since unenforced boundaries decay silently until the affected set is "everything"; a **declared** architecture style (modular monolith / clean / hexagonal / layered — which one matters far less than that one is declared, written down and enforced, because an undeclared style is indistinguishable from none after two years); implementation hidden behind abstraction so a technology swaps without touching business code (depth → `complexity-prevention`); and a fast scoped inner-loop check — if the only available check is the slow exhaustive one, that is the finding. **Scope boundary:** `architecture-scalability-review` **G2 Build & CI Scalability** already SCORES incremental/affected-only/caching/monorepo posture and **G4** scores boundary enforcement — where that review has run, cite its verdict rather than re-scoring; this gate only confirms the dimension was examined and is not silently absent. → `architecture-scalability-review` (G2/G4 depth) · `architecture-review` (diff-level boundary drift) · `complexity-prevention` (cost of change in the code itself)
>    - **F7 Mechanical quality harness** (format + lint + type/static analysis + build/test at ALL profiles; architecture-fitness `R1+`; dependency health + secret scanning wherever real data ships, unconditional at `B2+`; complexity/duplication + drift `R1+`/`T1+`) — no human reviewer spends attention on a defect class a machine could have caught; reviewer attention is the scarcest resource in the project. **Account for EVERY class or record it `N/A` with a reason** — an unlisted class is an unexamined one: formatting · lint/correctness · type & static analysis · complexity & duplication · **executable architecture-fitness** · dependency vulnerability & license · secret scanning · build/test gates plus the **F4** signal · documentation/config drift. Local and CI must run the **SAME** command, configuration and version (divergence means CI failures nobody can reproduce); checks must **ENFORCE**, not warn (an unread warning stream is not a harness); strictest reasonable defaults, loosened only with a recorded reason, since a large silent suppression list is itself a finding; cheap checks first, expensive last. Brownfield adoption uses a **ratchet** — fail on NEW violations, tolerate the existing baseline — which counts as `PRESENT`, not partial, because it stops regression from day one. → `linter-setup` · `harness-setup` · `security-review`
> 3. **Assign one verdict per dimension:** `PRESENT` (achieved and proven by cited evidence) · `MISSING-WARRANTED` · `PARTIAL-WITH-PATH` (gap named + concrete incremental step) · `N/A-by-profile` (below the warranting profile — **a correctly-lean project is a PASS here, never a gap; never report it as a deficiency**) · `OVER-ENGINEERED` (present but unwarranted → advise AGAINST, name the carrying cost) · `UNVERIFIED` (could not be checked — say so honestly; **NEVER score an unverified dimension `PRESENT`**).
> 4. **Authority is context-split — the one place this gate differs from its two companions.** **CREATING** a foundation (greenfield init, scaffold, a plan standing up build/test/CI) → a `MISSING-WARRANTED` dimension is **BLOCKING**: you are choosing the foundation right now, so omitting a warranted one must be an explicit decision, not a silent default. **AUDITING** an existing foundation (brownfield review, architecture audit, changes review) → **ADVISORY ONLY**: emit the matrix plus a prioritized adoption path and **NEVER mutate any score, `/20`, `/24`, verdict band, or gate PASS/FAIL**. — why the split: the cost of adding a foundation is near zero at creation and high afterwards, so strictness should track that cost; blocking a review of a ten-year-old codebase on foundations it never had produces a useless report, not a better project.
> 5. **Anti-over-engineering guard (first-class, and symmetric).** Do NOT demand a container mode of a single-author local utility, a distributed load-generation platform for a small internal service, affected-set computation or boundary enforcement for a single module, or four overlapping analyzers reporting one defect class (the carrying cost is noise and slow builds, and people learn to ignore the output). Splitting a small system into many modules to _look_ modular buys a distributed monolith — the coupling survives the split while the build cost doubles; the trigger is real module and team count, never aesthetics. Symmetric with the criticality floor: never UNDER-harden a `B2+` system merely because its traffic is low.
> 6. **Every brownfield finding names the smallest next step that is valuable on its own.** Seven `MISSING-WARRANTED` verdicts with no first step is a demoralizing document nobody acts on. Default ladder, each rung independently valuable and making the next cheaper: pin the toolchain & commit the lockfile → make one local command that CI also runs → ratchet the harness on (fail-on-new) → run the defect-seeding drill on the top invariants → repair the missing execution mode → seed a realistic volume and assert ONE budget → declare the style, then enforce dependency direction. Deviate on evidence, and say why; what is not acceptable is a gap list with no first step.
> 7. **Output — Foundation Readiness Matrix:** `dimension | warranted at this profile? | present? | verdict | evidence (file:line/config/CI) | smallest next step`, preceded by the derived profile with per-axis evidence and confidence, followed by the ordered adoption path (brownfield) or the blocking list (greenfield). Full catalog — per-dimension proof lists, warranting matrix, adoption ladder → `.claude/docs/engineering-foundation-catalog.md`. **Drift-guard: profile axes, dimensions, verdicts and warranting tiers are AUTHORITATIVE in that catalog — update it FIRST, then re-run `.claude/scripts/inject_engineering_foundation_gate.py` to re-propagate. Scale tier stays single-sourced in `scale-technique-catalog.md`; business criticality in `scenario-stress-catalog.md`.**
>
> **BLOCKED until:** `- [ ]` profile derived from evidence (lifecycle + `T` + `B` + `R`, lower tier when unknown) `- [ ]` all 7 dimensions judged, none omitted `- [ ]` matrix emitted with `file:line`/config/CI evidence `- [ ]` anti-over-engineering guard applied `- [ ]` authority confirmed — creating ⇒ blocking, auditing ⇒ advisory-only with no score mutation `- [ ]` every brownfield gap carries a smallest-next-step

<!-- /SYNC:engineering-foundation-gate -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:engineering-foundation-gate:reminder -->

**IMPORTANT MUST ATTENTION** engineering-foundation gate — judges whether the team can **build, run, test and change** the system safely, anywhere, as it grows (its companions judge the running system's design; a system can pass both while nobody but its author can build it). Derive the profile from evidence FIRST: lifecycle **G**reenfield/**B**rownfield · scale `T0`–`T3` (reuse `scale-technique-catalog.md`) · criticality `B0`–`B3` with its signal floor (reuse `scenario-stress-catalog.md`) · repo shape `R0`–`R3` — take the **LOWER** tier when unknown, NEVER default to `T3`/`B3`/`R3`. Judge **ALL 7** dimensions, never a subset: **F1** reproducible environment (pinned toolchain, locked deps, declared prerequisites, deterministic build — kills _"works on my machine"_) · **F2** dual execution modes (bare host AND fully containerized from one source of truth, suites runnable BOTH directions, both exercised so neither rots — the defect is the claimed-but-rotten mode) · **F3** environment-portable tests (same suites local/CI/production-shaped, parameterized by CONFIG not forked code; missing capability ⇒ `ENVIRONMENT-BLOCKED` not silent pass; _"runs in prod"_ = a safe NON-MUTATING subset) · **F4** test-strength proof (automated fault injection on changed code where a tool exists, else the universal **defect-seeding drill** — break the code behind a top invariant, record WHICH NAMED TEST went red, restore; nothing red ⇒ no protection. **Line coverage is a DIAGNOSTIC, never a gate**) · **F5** performance measured by something that **RUNS and CAN FAIL** (realistic volume AND shape, **asserted** budgets not a dashboard, ≥2 volumes ~10× apart to expose super-linear growth, resource exhaustion bounded rather than an OOM kill) · **F6** build & change scalability (computable affected set, measured incrementality, **mechanically** enforced boundaries, a **declared** architecture style, implementation hidden behind abstraction) · **F7** mechanical harness completeness (every machine-catchable class accounted for or `N/A`; local and CI run the SAME command; checks **ENFORCE**, not warn; brownfield uses a fail-on-new **ratchet**). Verdicts: `PRESENT`/`MISSING-WARRANTED`/`PARTIAL-WITH-PATH`/`N/A-by-profile`/`OVER-ENGINEERED`/`UNVERIFIED`. **Authority splits — CREATING a foundation ⇒ `MISSING-WARRANTED` is BLOCKING; AUDITING one ⇒ ADVISORY ONLY, never mutating any score, verdict band or PASS/FAIL.** Anti-over-engineering is first-class and symmetric (a correctly-lean project is a PASS; never under-harden a `B2+` system for low traffic). Every brownfield gap names the smallest next step. **State OUTCOMES, never tools.** Full catalog → `.claude/docs/engineering-foundation-catalog.md` (authoritative — update it FIRST, then re-run `inject_engineering_foundation_gate.py`).

<!-- /SYNC:engineering-foundation-gate:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Every code change is caught by an automated quality sensor — both locally (fast feedback) AND in CI (enforcement gate) — before it reaches main, with ZERO divergence between the two, by installing the full sensor layer (linter, formatter, type checker, static analyzer, dependency scanner, architecture fitness, pre-commit hook, CI gate) for the detected stack.

**IMPORTANT MUST ATTENTION Main steps (in order — do not skip):** (1) detect stack → (2) research tool categories, present 2-3 per category by asking the user directly → (3) install & configure strict + `.editorconfig` + `.gitignore` → (4) wire pre-commit hook (format→lint→type, staged-only, <30s) → (5) mirror it in a CI quality gate → (6) verify the hook blocks an INTENTIONAL violation → (7) offer `$harness-setup` next.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** MUST ATTENTION apply critical/sequential thinking; cite proof, NEVER present guess as fact.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** use QUERY TEMPLATES in Tool Research — NEVER hardcode tool names in the research phase; research the detected stack's current ecosystem and present options — why: tool ecosystems churn fast, hardcoded names cargo-cult dead tools.
**IMPORTANT MUST ATTENTION** present top 2-3 options per category by asking the user directly — let the user pick; NEVER auto-select — why: tool choice is a team-owned decision, not the skill's.
**IMPORTANT MUST ATTENTION** verify the pre-commit hook fires with an INTENTIONAL violation (add a lint error, attempt commit, confirm it blocks) before marking complete — why: an unproven gate is no gate.
**IMPORTANT MUST ATTENTION** CI gate MUST match pre-commit hooks — if a check runs locally it runs in CI, no divergence — why: divergent local/CI checks let violations slip through one path.

**MUST ATTENTION** detect the stack FIRST (`plan.md` → architecture report → tech-stack report); if a critical field is undetectable, ask the user directly before research — why: every downstream tool choice depends on the stack profile.
**MUST ATTENTION** configure with the STRICTEST reasonable defaults; loosen ONLY with explicit user approval by asking the user directly — why: starting strict is easier to loosen than starting loose is to tighten.
**MUST ATTENTION** ALWAYS emit a stack-agnostic `.editorconfig` and add tool cache dirs to `.gitignore` — why: editorconfig is the one truly portable cross-tool baseline; cached artifacts must never be committed.
**MUST ATTENTION** order hooks formatter→linter→type-check, staged-files-only, <30s; defer slow checks (static analysis, full type-check) to CI — why: a slow hook gets bypassed, killing local feedback.
**MUST ATTENTION** report line-coverage as a DIAGNOSTIC only — NEVER fail the build on a coverage %; gate on mutation score if a test-strength gate is wanted — why: high coverage is not evidence of assertion quality.
**MUST ATTENTION** pre-commit hook framework names ARE allowed (ecosystem glue, not research choices) — the quality tools invoked inside them are the research-driven selections — why: keep the generic/research boundary clear.

**MUST ATTENTION** when confidence in the current ecosystem is <80% (fast-moving or unfamiliar stack), use WebSearch to verify before presenting options — cite confidence % for every recommendation; <60% DO NOT recommend — why: stale tool advice fails silently.
**MUST ATTENTION** grep/glob the repo for 3+ existing config/CI patterns before generating new ones — match the project's existing layout, don't impose a foreign convention — why: a config that fights local convention gets reverted.
**MUST ATTENTION** evaluate fit before copying a nearby config — verify the new stack shares the same package manager, CI provider, and conventions as the source — why: closest example ≠ matching preconditions.
**MUST ATTENTION** bootstrap a task tracking breakdown (one task per category/config file + a final verification task) BEFORE acting; keep exactly one task `in_progress` — why: long research/config work loses context without external tracking.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| "I know the best linter for this stack"          | Ecosystems churn — research current options, present 2-3 by asking the user directly. Hardcoding = stale. |
| "Strict defaults are too aggressive, loosen now" | Start strict; loosen ONLY with explicit user approval. Easier to loosen than to tighten later.      |
| "Hook works, no need to test it"                 | Fire an INTENTIONAL violation and confirm it blocks. Unproven gate = no gate.                       |
| "Local checks are enough, skip CI"               | CI gate MUST mirror pre-commit. No divergence — a local-only check is bypassable.                   |
| "Coverage % is high, gate on it"                 | Coverage is diagnostic only. Gate on mutation score; high coverage ≠ strong assertions.            |
| "Simple stack, skip task tracking"               | Still bootstrap task tracking. Skip depth, never skip tracking.                                      |

**IMPORTANT MUST ATTENTION** use QUERY TEMPLATES — NEVER hardcode tool names; present top 2-3 by asking the user directly.
**IMPORTANT MUST ATTENTION** prove the pre-commit hook blocks an intentional violation before declaring complete.
**IMPORTANT MUST ATTENTION** CI gate must match pre-commit hooks — zero divergence between local and CI checks.

**[TASK-PLANNING]** Before acting, analyze task scope and break it into small todo tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Static Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs` (legacy filename; static protocol composer)

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there immediately before the first target read, grep, edit, test, or analysis. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. After compaction, resume, delegation, or a material context change, re-read the required docs and state `Reference docs read: ... | Not applicable: ...`; a hook reminder or prior conversation is not proof that the files are loaded. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **PARALLELIZE:** Before executing the task list, tag each task `PAR` (independent inputs + write set disjoint from every other `PAR` task) or `SEQ` (name the blocking dependency), group `PAR` tasks into waves, declare the wave plan, and spawn each wave's sub-agents in ONE message — all-return barrier per wave, fan-out one level deep unless a sub-agent's own definition authorizes further fan-out. Sequential-by-default is a defect when tasks are independent; do not parallelize shared write targets, output-consuming tasks, trivial single-file work, ordering a skill or workflow explicitly fixes, or user-approval gates.
7. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)
## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.
## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**
1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.
## Common AI Mistake Prevention (System Lessons)

- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec (`docs/specs/**` if one exists) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
