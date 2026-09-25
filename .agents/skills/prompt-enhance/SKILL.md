---
name: prompt-enhance
description: '[Skill Management] Use when enhancing, compressing, or expanding prompts, docs, or skills. Flag: --op={compress|expand|enhance} (default enhance).'
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

**Goal:** Two-phase optimization — (1) Caveman Compression strips stop words + grammatical scaffolding while preserving semantic meaning; (2) Prompt Enhancement applies AI attention anchoring so AI reads and follows all instructions — producing a prompt/skill that states its objective and ultimate outcome (one consolidated Goal) in both top summary and bottom reminders so AI optimizes for the right result.

**Summary:**

- Two phases, in order: caveman-compress prose FIRST, then attention-anchor structure — NEVER skip or reorder.
- Enhance derives BOTH a **Goal** (the outcome to optimize for) AND a **Summary** (key things + steps to notice) for the target, and places both in its Quick Summary.
- **Anti-forget rule (task/purpose targets):** when the target performs a task or has a purpose, the Summary AND Closing Reminders MUST carry the goal + purpose + ALL important main steps/tasks (compact enumeration) — why: AI forgets steps buried in the long middle of the prompt; the top Summary and bottom Reminders are the two high-attention anchors that survive context rot.
- Protect content: NEVER compress code/YAML/tables/SYNC tags, NEVER delete rules or `file:line` evidence; post rule-density MUST be ≥ pre.
- Route on `--op` (default `enhance`): `compress` = token-strip only, `expand` = reconstruct compressed text.

**Workflow:**

1. **Detect** — Classify target: skill file, sub-agent file (`.claude/agents/*.md`), protocol file, or general doc
2. **Read** — Read target file completely
3. **Goal + Summary** — Derive the target's one-sentence Goal (what it achieves + the ultimate outcome it must cause) AND its Summary (2-4 bullets of the key important things + the steps AI must notice) from the target's task, constraints, and success criteria
4. **Compress** — Apply caveman compression (Phase 1)
5. **Enhance** — Apply AI attention anchoring transforms (Phase 2)
6. **Verify** — No content loss, rule density ≥ pre-optimization, Goal anchored top and bottom

**Key Rules:**

- **Operation flag** (see [Operation Mode](#operation-mode---op)): `--op=enhance` (default) = compress + anchor + skill-principles; `--op=compress` = token-strip only; `--op=expand` = reconstruct compressed text into fluent form (inverse Phase 1 + structural Transform 4)
- NEVER skip Phase 1 (compress) before Phase 2 (enhance) — compression removes noise, enhancement structures signal
- NEVER remove meaningful rules, constraints, code examples, or `file:line` evidence
- MUST ATTENTION derive the target's Goal and add it to both `## Quick Summary` and `## Closing Reminders`
- MUST ATTENTION derive the target's Summary (key important things + steps AI must notice) and place it in `## Quick Summary` immediately after the Goal — a condensing digest at a different altitude than Workflow/Key Rules, NEVER a verbatim re-listing of them
- MUST ATTENTION when the target performs a task or has a purpose, the Summary AND `## Closing Reminders` MUST enumerate the goal + purpose + ALL important main steps/tasks as a compact list — why: long task descriptions in the middle of the prompt get forgotten; the top Summary and bottom Reminders re-anchor every step so none is skipped (compact enumeration ≠ the verbose Workflow prose, so the altitude stays distinct)
- MUST ATTENTION skill AND sub-agent (`.claude/agents/*.md`) targets require the SAME Goal + Summary + Closing-Reminders structure (see [When Target is a Sub-Agent File](#when-target-is-a-sub-agent-file)) — anchored top and bottom; NEVER alter SYNC blocks when enhancing an agent
- Post-optimization rule density (MUST ATTENTION/NEVER/ALWAYS per 100 lines) MUST be ≥ pre-optimization
- Caveman compression applies to prose only — NEVER compress code blocks, YAML, or structured tables
- Prompt quality > token count, but verbose prompts degrade quality — optimize clarity-per-token

---

## Target File

Compress and enhance this file:
<target>$ARGUMENTS</target>

No file? Ask by asking the user directly. Text passed (not file path)? Apply caveman compression directly and output result.

---

## Operation Mode (`--op=`)

Route on `--op` (default `enhance`). Transforms 1-3 (inline summaries, top summary, closing reminders — the shared SYNC base block below) are identical across all ops; only Phase 1 and Transform 4 differ:

| `--op`                | Phase 1                                        | Transform 4            | Skill-principles + Goal           | Former skill       |
| --------------------- | ---------------------------------------------- | ---------------------- | -------------------------------- | ------------------ |
| `enhance` *(default)* | Caveman Compression                            | Conciseness pass       | Applied (skill files)            | host               |
| `compress`            | Caveman Compression                            | Conciseness pass       | Skipped (pure token strip)       | `/prompt-compress` |
| `expand`              | **Language Expansion** (inverse — branch below) | **Structural Clarity** | Skipped                          | `/prompt-expand`   |

- `enhance` / `compress` → run **Phase 1: Caveman Compression** + **Transform 4: Conciseness** below. `enhance` additionally derives the Goal and (for skill files) applies the Universal Skill-Building Principles; `compress` skips both for a pure token-reduction pass.
- `expand` → run the **Language Expansion branch** below INSTEAD of Caveman Compression, and the **Structural Clarity** Transform 4 instead of conciseness.
- No `--op` provided → `enhance`.

### `--op=expand` — Language Expansion branch

Reconstruct fluent, grammatically correct English from caveman-compressed text while preserving ALL semantic content (inverse of Phase 1). Run INSTEAD of Caveman Compression.

**Restore** (add back): articles (`a/an/the`); connectives matching the logical relationship (`because/however/in order to`); auxiliary verbs (`is/are/was/has`); clarifying prepositions; pronouns referencing prior nouns; subordinate clauses merging choppy sentences.
**Preserve exactly** (never paraphrase/omit): all nouns + main verbs + adjectives, numbers/quantifiers, uncertainty qualifiers, negations (`not/no/never/without`), technical/domain terms, `file:line` paths, names/titles, time/frequency words.

**Connective selection** (match relationship, never arbitrary): cause→effect `because/since/as a result`; contrast `however/although/despite`; addition `additionally/furthermore`; sequence `first/then/finally`; purpose `in order to/so that`; condition `if/when/unless`; clarification `specifically/that is`.

Per sentence: identify core S-V-O (non-negotiable) → restore articles/auxiliaries/connectives/prepositions → merge related shorts → target 10-25 words. Skip code blocks, YAML, tables, SYNC tags, paths.

**Transform 4 (expand) — Structural Clarity pass:** convert prose rule-lists → bullets, enumerated conditions → decision tables, before/after examples → two-column tables. Keep as prose: explanatory context (why a rule exists), workflow narratives, anti-pattern rationale.

Verify (expand): no semantic loss (all facts/numbers/paths present), rule density post ≥ pre, no telegraphic 2-5 word prose sentences remain, code blocks untouched.

---

## Phase 0: Detect Target Type

**Before any other step**, classify target:

| Target type        | Detection                                | Action                                                  |
| ------------------ | ---------------------------------------- | ------------------------------------------------------- |
| Skill file         | Path matches `.claude/skills/**/*.md`    | Apply Universal Skill-Building Principles after Phase 1 |
| Sub-agent file     | Path matches `.claude/agents/*.md`       | Apply Sub-Agent Required Structure after Phase 1        |
| Protocol file      | Path matches `.claude/protocols/**/*.md` | Standard 2-phase optimization only                      |
| General doc/prompt | Any other `.md` file                     | Standard 2-phase optimization only                      |
| Raw text           | No file path provided                    | Apply caveman compression only, output result           |

---

## When Target is a Skill File

Target `.claude/skills/**/*.md` (any `SKILL.md`)? Apply **Universal Skill-Building Principles** AFTER caveman compression, BEFORE writing enhanced output.

**Risk-profile gate (blocking):** Enhancement preserves the target skill's job,
input/output, mutation authority, delegation boundary, and terminal states.
Classify the target as `content`, `analysis`, `conversion`, `implementation`,
`orchestration`, or `security/authority` before applying the checklist. Fresh
agent review, specialist routing, inline sub-agent protocols, and recursive
loops are mandatory only for `implementation`, `orchestration`, or
`security/authority` targets (or when the target already owns an equivalent
gate). For `content`, `analysis`, and `conversion` skills, record those rows as
`N/A — not required by the target contract`; never add review machinery merely
because this enhancer can add it. A change that widens mutation or delegation
authority must be surfaced as a contract change, not silently introduced.

### Skill Enhancement Checklist

After caveman compression, evaluate skill against each principle, add missing structure:

| Principle                    | Check                                    | Action if missing                                      |
| ---------------------------- | ---------------------------------------- | ------------------------------------------------------ |
| Detect Before Act            | Phase 0 / classification step present?   | Add artifact-type detection before Phase 1             |
| Derive, Don't Enumerate      | Thinking framework vs. fixed checklist?  | Replace checklist with "understand → derive → execute" |
| Evidence Gates               | Every claim requires `file:line`?        | Add evidence requirement to all review steps           |
| Fresh Eyes Protocol          | Required by risk profile and target contract? | Add Round 2 fresh sub-agent protocol only when required; otherwise record N/A |
| Specialize by Type           | Required by risk profile and target contract? | Add specialist routing only when required; otherwise record N/A |
| Embed Protocols Verbatim     | A sub-agent prompt is actually emitted? | Inline the needed protocol body at that call site; do not add delegation to a non-delegating target |
| Search-Based Discovery       | Any hardcoded paths/formats/IDs?         | Replace with search instructions                       |
| Dimensions > Checklists      | Named dimensions with `Think:` prompts?  | Convert checklist to dimension framework               |
| Recursive Quality Loop       | Required by risk profile and target contract? | Add the bounded loop only when required; otherwise record N/A and preserve the target's terminal state |
| Anti-Rationalization Anchors | Closing reminders include evasion table? | Add evasion → rebuttal table                           |

### Anti-Forget Anchoring (task/purpose targets)

Any target that **performs a task or has a purpose** (skill, sub-agent, task-prompt) hides its main steps in the long middle — exactly the zone AI attention drops 15-47% (Stanford "lost-in-the-middle"). The fix is to mirror those steps into the two high-attention anchors:

| Anchor                          | Must carry                                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `## Quick Summary` → `**Summary:**` | Goal + purpose + **ALL important main steps/tasks** as a compact ordered enumeration (one short phrase each)   |
| `## Closing Reminders`          | Goal echo + a `MUST ATTENTION` line re-listing the same main steps/tasks in order                              |

- MUST ATTENTION enumerate EVERY important main step/task — completeness beats brevity here; a step omitted from both anchors is a step AI will skip — why: the Summary and Reminders are the only parts guaranteed to be read on a long prompt.
- The compact enumeration is a DIFFERENT altitude than the verbose `## Workflow`/body — short phrases, not full prose — so it complements (never replaces) the detailed steps below.
- Surface conditional routing too (modes, `--flags`, gates) so the AI doesn't forget a whole branch — why: a forgotten mode silently runs the wrong path.

---

## When Target is a Sub-Agent File

Target `.claude/agents/*.md` (a custom sub-agent definition — the shape a creator skill like `custom-agent` emits)? Apply the **Sub-Agent Required Structure** AFTER caveman compression, BEFORE writing enhanced output. Same Goal + Summary + Closing-Reminders contract as a skill file — anchored top and bottom so the isolated, zero-history sub-agent optimizes for the right outcome — mapped onto the agent body (`## Role → ## Workflow → ## Key Rules → ## Output`).

### Sub-Agent Required Structure

| Block                          | Location                                              | Requirement                                                                                                                              |
| ------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `## Quick Summary`             | first section after frontmatter                      | Present — holds Goal + Summary + Workflow + Key Rules                                                                                     |
| `**Goal:**`                    | inside Quick Summary                                 | One consolidated sentence — what the agent achieves AND the ultimate outcome it must cause                                                |
| `**Summary:**`                 | inside Quick Summary, immediately after Goal         | 2-4 bullets — the read-this-if-nothing-else digest (key things + steps to notice); distinct altitude from Workflow/Key Rules, NEVER a verbatim re-listing |
| `**Workflow:**` / `**Key Rules:**` | inside Quick Summary                             | Keep existing                                                                                                                             |
| `## Closing Reminders`         | end of file, after the `:reminder` SYNC blocks       | Present — first line `**IMPORTANT MUST ATTENTION Goal:**` echoes the same Goal                                                            |

- MUST ATTENTION add the missing `**Summary:**` and the Closing-Reminders Goal echo; lightly tighten Role/Workflow prose only — why: the structure must match a skill so creator skills emit one consistent shape.
- NEVER alter `<!-- SYNC:... -->` blocks or their `:reminder` variants — they are canonical-sync content; edit the canonical source (`.claude/skills/shared/sync-inline-versions.md`) instead — why: a divergent SYNC copy fails the `verify-sync-divergence` oracle.
- NEVER delete the agent body sections (`## Role`, `## Workflow`, `## Key Rules`, `## Output`) — preserve them; only restructure the summary/closing anchors.

---

## Phase 1: Caveman Compression

> Applies to `--op=compress|enhance`. For `--op=expand`, run the Language Expansion branch (above) instead.

Aggressively remove stop words + grammatical scaffolding preserving meaning. Use only content words carrying semantic weight.

### What to Remove

| Category                      | Examples                                                               |
| ----------------------------- | ---------------------------------------------------------------------- |
| Articles                      | a, an, the                                                             |
| Auxiliary verbs               | is, are, was, were, am, be, been, being, have, has, had, do, does, did |
| Redundant prepositions        | of, for, to, in, on, at (when meaning stays clear without them)        |
| Pronouns (when context clear) | it, this, that, these, those                                           |
| Pure intensifiers             | very, quite, rather, somewhat, really, extremely                       |

### What to Keep (Always)

| Category                         | Reason                                                 |
| -------------------------------- | ------------------------------------------------------ |
| All nouns                        | Core semantic units                                    |
| All main verbs (not auxiliaries) | Actions carry meaning                                  |
| All meaningful adjectives        | Add semantic signal                                    |
| Numbers and quantifiers          | `at least`, `approximately`, `more than`, `15`, `many` |
| Uncertainty qualifiers           | `appears to be`, `seems`, `might`, `what sounded like` |
| Critical prepositions            | `from`, `with`, `without`, `stuck to` — change meaning |
| Time/frequency words             | `every Tuesday`, `weekly`, `always`, `never`           |
| Names and titles                 | `Dr.`, `Mr.`, `Senator`                                |
| Technical/domain terms           | Never simplify domain language                         |
| Negations                        | `not`, `no`, `never`, `without`                        |

### Preposition Decision Rule

- Keep when defining relationship: `made from wood` (keep `from`), `stuck to wall` (keep `to`)
- Remove when purely grammatical: `system for processing data` → `system processing data`
- Keep `in/on/at` for location/position: `file in /src` (keep) vs `written in prose` (remove)

### Compression Examples

| Original                                                                    | Compressed                                                      | Removed               |
| --------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------- |
| "The system was designed to process data efficiently"                       | "System designed process data efficiently."                     | The, was, to          |
| "It removes predictable grammar while preserving the unpredictable content" | "Removes predictable grammar preserving unpredictable content." | It, the, while        |
| "There were at least 20 people"                                             | "At least 20 people."                                           | There, were           |
| "Made from wood and metal"                                                  | "Made from wood and metal."                                     | nothing — `from` kept |
| "This is a method for compressing LLM contexts"                             | "Method compressing LLM contexts."                              | This, is, a, for      |

### Compression Scope

Apply to:

- Prose paragraphs and explanatory text
- Bullet point descriptions
- Rule statements (keep imperative verbs)
- Section intros and transitions

Do NOT compress:

- Code blocks (any language)
- YAML frontmatter
- Structured tables (column values may be fragmented — keep as-is)
- `file:line` references and paths
- `<!-- SYNC -->` tags and their content
- Frontmatter fields

---

## Phase 2: Prompt Enhancement

### Transform 4: Token Optimization (Conciseness Pass)

> Applies to `--op=compress|enhance`. For `--op=expand`, use the Structural Clarity pass (see expand branch above).

Prompt quality FIRST. Verbose prompts degrade quality — AI attention dilutes across unnecessary tokens. Optimize **clarity-per-token**: maximum signal, minimum noise.

**What to cut:**

- **Filler phrases** — "It is important to note that", "Please make sure to", "You should always" → just state the rule
- **Redundant explanations** — heading says it, body doesn't re-explain. Tables > paragraphs for structured data
- **Duplicate content** — merge sections saying same thing differently (except intentional top/bottom anchoring)
- **Overly verbose examples** — trim to minimum lines demonstrating pattern. Replace paragraph explanations with `// comment` in code
- **Prose paragraphs for rules** — convert to bullet lists or tables (AI parses structured formats faster)

**What to KEEP:**

- Code examples with actual file paths/patterns (AI copies these directly)
- Decision tables and lookup references
- Anti-pattern examples (before/after pairs)
- All `file:line` evidence and concrete paths
- Top/bottom anchoring (intentional duplication)

**Evaluation metrics per doc:**

- **Density score** — useful rules per 100 lines (higher = better)
- **Savings estimate** — % tokens saveable without losing information
- **Risk** — what breaks if cut too aggressively (e.g., AI misses a pattern)

---

## Process

### Step 0: Detect and Classify

1. Identify target type (skill file / protocol / general doc / raw text)
2. Skill file (`.claude/skills/**/*.md`) → apply Universal Skill-Building Principles after Phase 1

### Step 1: Read and Analyze

1. Read target file completely
2. Record: current line count, rule density (MUST ATTENTION/NEVER/ALWAYS count)
3. List all READ references → classify as `.claude/` (needs inline summary) or `docs/` (skip)
4. Derive the one-sentence **Goal** (what it achieves + ultimate outcome it must cause) from target task/outcomes/guardrails; cite source lines or mark inferred with confidence
5. Derive the **Summary** (2-4 bullets of the key important things + the steps AI must notice) — the read-this-if-nothing-else digest at a different altitude than Workflow/Key Rules; cite source lines or mark inferred with confidence — why: the Summary condenses what matters most, it does not re-list every step/rule
   - If the target performs a task or has a purpose, the Summary MUST also enumerate ALL important main steps/tasks (compact ordered list) + any modes/flags/gates — why: steps buried in the long middle get forgotten; the Summary anchor re-surfaces every one
6. Identify: missing Quick Summary, missing Goal, missing Summary, missing main-step enumeration (task targets), missing Closing Reminders, prose-heavy sections

### Step 2: Caveman Compression Pass

1. Identify all prose paragraphs and bullet descriptions
2. Apply Phase 1 compression rules — remove stop words, keep semantic content
3. Skip code blocks, YAML, tables, SYNC tags, file paths
4. Verify meaning preserved after each paragraph

### Step 3: Create Inline Summaries

For each `.claude/` protocol reference:

1. Read the referenced file
2. Extract 2-3 key rules
3. Write blockquote inline summary
4. Keep MUST ATTENTION READ instruction on next line

### Step 4: Add/Fix Top Section

- Missing Quick Summary → create from file content
- Present but weak → strengthen with Goal, Workflow, Key Rules
- Ensure `**Goal:**` states what the skill achieves AND the ultimate outcome it must cause — a single consolidated line (never split the objective and outcome into two separate lines)
- Ensure `**Summary:**` is present in Quick Summary immediately after the Goal — create if missing, strengthen if weak; it condenses the key important things + the steps AI must notice at a different altitude than Workflow/Key Rules (NEVER a verbatim re-listing of them) — why: the Goal gives the outcome, the Summary gives the read-this-if-nothing-else digest
- For task/purpose targets, ensure the Summary enumerates ALL important main steps/tasks (compact ordered list) + modes/flags/gates — why: completeness on steps is the anti-forget guarantee
- Protocol summaries appear before Quick Summary

### Step 5: Add/Fix Bottom Section

- Missing Closing Reminders → add standard section
- Pick rules AI most commonly skips (evidence-based, task creation, pattern search)
- Echo the same Goal near the start of Closing Reminders: `**IMPORTANT MUST ATTENTION Goal:** ...`
- For task/purpose targets, add a `MUST ATTENTION` line re-listing ALL important main steps/tasks in order — why: the bottom anchor re-surfaces every step after the long middle, matching the top Summary
- Remove old "IMPORTANT Task Planning Notes" if superseded by Closing Reminders

### Step 6: Verify

| Check               | Pass Condition                                 |
| ------------------- | ---------------------------------------------- |
| No YAML corruption  | Frontmatter intact                             |
| No content loss     | All rules, code, paths present                 |
| Rule density        | Post ≥ pre (count MUST ATTENTION/NEVER/ALWAYS) |
| Goal                | Present in Quick Summary and Closing Reminders |
| Summary             | Present in Quick Summary (key things + steps digest) |
| Main steps anchored | Task/purpose target → ALL main steps/tasks enumerated in BOTH Summary and Closing Reminders |
| Line count          | Reduced (compression worked)                   |
| Formatting          | Blank lines between sections, headers correct  |
| READ classification | `.claude/` → inline summary, `docs/` → skipped |

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.

<!-- SYNC:universal-skill-building-principles -->

> **Universal Skill-Building Principles** — 10 principles for building AI skills that work across any project type. Source: extracted from changes-review, plan-review, code-review skill rewrites.
>
> **Meta-principle: Teach AI to reason, not to recite.** Skill's job: structure WHEN and HOW AI applies its existing knowledge — not enumerate every possible concern.
>
> 1. **Detect Before Act** — Every skill starts with a classification phase. Detect artifact type (plan type, code category, change nature) before applying any logic. Detection drives: sub-agent selection, which dimensions to emphasize, mandatory vs. optional checks.
>    Anti-pattern: same checklist applied regardless of input type.
> 2. **Derive, Don't Enumerate** — Teach AI HOW to reason about a domain, not WHAT items to tick. Replace "check X, Y, Z" with "understand role → read conventions → derive concerns from first principles → execute with evidence." Fixed checklist = ceiling. Thinking framework = floor.
>    Test: Can this skill run on a Python/Go project without modification? If not → it's enumerating, not teaching.
> 3. **Evidence Gates** — Every claim, finding, recommendation requires `file:line` proof or traced call chain. Confidence thresholds: >80% act freely, 60-80% verify first, <60% DO NOT recommend. "Insufficient evidence" is valid output. Speculation is forbidden output.
> 4. **Fresh Eyes Protocol** — For implementation, orchestration, and security/authority targets, Round 1 is in the main session and Round 2 uses a fresh sub-agent (zero memory of Round 1); the main agent reads the report but NEVER filters or overrides findings. Max 2 rounds, then escalate to the user. For content, analysis, and conversion targets, apply only when the target contract explicitly requires an independent review; otherwise record N/A and preserve the target's simpler terminal state.
>    Why: main agent rationalizes its own mistakes. Zero-memory sub-agent catches what main agent dismissed.
> 5. **Specialize by Type** — When the risk profile requires delegation, route to specialized sub-agents based on detected artifact type:
>
>     | Artifact type                | Sub-agent               |
>     | ---------------------------- | ----------------------- |
>     | Source code / diffs          | `code-reviewer`         |
>     | Security-sensitive changes   | `security-auditor`      |
>     | Performance-critical changes | `performance-optimizer` |
>     | Plans / docs / specs         | `general-purpose`       |
>
> 6. **Embed Protocols Verbatim, Never Reference** — When a target actually emits a sub-agent prompt, shared protocols MUST be copied inline into that prompt — never referenced by file path or tag name. Do not create a sub-agent prompt merely to satisfy this principle. Maintain canonical source; embed the needed body at each real call site.
> 7. **Search-Based Discovery** — Never hardcode project-specific paths, formats, or identifiers. Teach skill to discover them:
>     - "Search for `coding-standards`, `style-guide`, `contributing`" not "read `docs/X/code-review-rules.md`"
>     - "Find the project's test format near changed files" not "look for `TC-{FEATURE}-{NNN}` in the business spec root (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path)"
>       This is what makes a skill work across any project without modification.
> 8. **Dimensions > Checklists** — Structure review/analysis as named thinking dimensions, each with a `Think:` prompt that forces first-principles reasoning: (1) state dimension's role, (2) derive what could go wrong if weak, (3) apply to artifact with evidence. Produces targeted, evidence-backed findings — not generic "add more detail" suggestions.
>    **Serial attention:** When applying a dimension-based framework, NEVER scan all dimensions simultaneously. One focused pass per dimension. AI misses violations when attention is split across concurrent concerns. Pattern: identify applicable dimensions → sequential focused passes → aggregate.
>    **Threshold invariant:** 3+ similar patterns in any dimension pass = MANDATORY extraction. 2+ violations of same kind = structural/architectural finding, not individual instance.
> 9. **Recursive Quality Loop** — For targets whose contract includes review/fix convergence, use Fix → Re-review; each round uses a NEW fresh sub-agent and stops at 2 rounds with escalation. For other targets, do not invent a loop: preserve their declared terminal state and record this principle as N/A.
> 10. **Anti-Rationalization Anchors** — Explicitly name and embed the evasion patterns AI uses to skip steps in the skill's closing reminders:
>
>     | Evasion               | Rebuttal                                                   |
>     | --------------------- | ---------------------------------------------------------- |
>     | "Too simple for this" | Wrong assumptions waste more time. Apply anyway.           |
>     | "Already searched"    | Show `file:line` evidence. No proof = no search.           |
>     | "Just do it"          | Still need task tracking. Skip depth, never skip tracking. |

<!-- /SYNC:universal-skill-building-principles -->

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `context-engineering-principles` — Research-backed principles for prompt and context quality; writing or enhancing prompts, skills or agents → .claude/skills/shared/protocols/context-engineering-principles.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `output-quality-principles` — Token-efficient output without losing quality; writing generated docs or reports → .claude/skills/shared/protocols/output-quality-principles.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `prompt-enhancement-transforms-base` — Base transforms shared by every prompt-enhance operation; running prompt-enhance → .claude/skills/shared/protocols/prompt-enhancement-transforms-base.md
- `shared-protocol-duplication-policy` — Protocol copies in carriers are intentional: edit the canonical source, then propagate; editing a shared protocol or its carriers → .claude/skills/shared/protocols/shared-protocol-duplication-policy.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Two-phase optimization (caveman compression + attention anchoring) that produces a prompt/skill stating its objective and ultimate outcome (one consolidated Goal) anchored top and bottom, so AI optimizes for the right result.

**IMPORTANT MUST ATTENTION Protocols in force (concise digest of the SYNC/shared blocks this skill carries — each is a signpost to its canonical body above):**

- **Output Quality:** MUST ATTENTION no inventories/trees/TOCs; lead with answer; sacrifice grammar for concision.
- **Universal Skill-Building:** MUST ATTENTION detect-before-act, derive-don't-enumerate, evidence gates, fresh-eyes, embed protocols verbatim.
- **Context Engineering:** MUST ATTENTION primacy-recency, high-signal density, compress aggressively, affirmative directives.
- **Prompt Enhancement Transforms:** MUST ATTENTION inline READ summaries, top Quick-Summary, bottom Closing-Reminders (Transforms 1-3 base).
- **Shared Protocol Duplication Policy:** NEVER extract SYNC duplication to references — edit canonical first; inline is intentional.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** MUST ATTENTION traced `file:line` proof per claim; confidence >80% to act; NEVER guess.

**IMPORTANT MUST ATTENTION** select `--op` FIRST (default `enhance`) — `compress`/`enhance` apply caveman compression FIRST (Phase 1) before structural enhancement (never skip); `expand` applies Language Expansion (inverse) instead — why: expand reconstructs, it does not strip
**IMPORTANT MUST ATTENTION** NEVER compress code blocks, YAML frontmatter, structured tables, or SYNC tags
**IMPORTANT MUST ATTENTION** read target file completely before any changes
**IMPORTANT MUST ATTENTION** derive the target's one-sentence Goal (what it achieves + ultimate outcome), then place it in both `## Quick Summary` and `## Closing Reminders` — why: AI must know the ultimate outcome after enhancement
**IMPORTANT MUST ATTENTION** enhance derives BOTH the target's Goal AND its Summary (key important things + steps AI must notice) and places both in `## Quick Summary`, the Summary at a different altitude than Workflow/Key Rules — why: the Goal tells AI the outcome to optimize for; the Summary tells AI the key things/steps to notice up front
**IMPORTANT MUST ATTENTION** for a target that performs a task or has a purpose, the Summary AND Closing Reminders MUST enumerate the goal + purpose + ALL important main steps/tasks (compact ordered list) + modes/flags/gates — why: long task descriptions in the middle of the prompt get forgotten; the top Summary and bottom Reminders are the two anchors that survive context rot, so every step must appear in both
**IMPORTANT MUST ATTENTION** skill AND sub-agent (`.claude/agents/*.md`) targets share ONE required structure — Goal + Summary in `## Quick Summary`, Goal echoed in `## Closing Reminders` — so creator skills (e.g. `custom-agent`) emit a consistent shape; when enhancing an agent NEVER alter `<!-- SYNC:... -->` blocks or delete `## Role`/`## Workflow`/`## Key Rules`/`## Output` — why: SYNC copies are canonical-synced and divergence fails the build
**IMPORTANT MUST ATTENTION** read each referenced protocol file to write accurate inline summaries — NEVER guess content
**IMPORTANT MUST ATTENTION** apply primacy-recency anchoring — 3 critical rules in first 5 AND last 5 lines of every enhanced file
**IMPORTANT MUST ATTENTION** verify rule density: count MUST ATTENTION/NEVER/ALWAYS before and after — post ≥ pre
**IMPORTANT MUST ATTENTION** state the action to take, not only what to avoid — pair every `NEVER` with the right path, and append a terse `— why:` to each non-obvious rule — why: affirmative directives + carried rationale are followed more reliably and survive compression (principles #10/#11)
**IMPORTANT MUST ATTENTION** add inline summaries only for `.claude/` protocol files, not project-specific `docs/` files
**IMPORTANT MUST ATTENTION** keep all meaningful content — only restructure/compress, NEVER delete rules or code examples
**IMPORTANT MUST ATTENTION** verify no YAML frontmatter corruption after changes
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act). NEVER speculate without proof.
**IMPORTANT MUST ATTENTION** READ `CLAUDE.md` before starting

**Anti-Rationalization:**

| Evasion                                 | Rebuttal                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------- |
| "File is short, skip compression"       | Apply both phases anyway — density matters at any length                  |
| "Already read the file"                 | Show recorded line count + rule density as proof                          |
| "Closing reminders already exist"       | Verify they echo top-section rules AND include anti-rationalization table |
| "Skill file, skip Universal Principles" | NEVER skip — Phase 0 detection is BLOCKING                                |
| "Summary already has the goal, enough"  | Task/purpose target needs ALL main steps enumerated in Summary AND Reminders — a goal alone leaves middle-buried steps forgettable |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

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
