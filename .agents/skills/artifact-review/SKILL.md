---
name: artifact-review
description: '[Code Quality] Use when a workflow step or the user asks for an artifact quality review before handoff. Flag: --type={pbi|story|spec-tests|design}.'
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

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Review one artifact (PBI, design spec, story, or test spec) for completeness and quality so it is evidence-backed, handoff-ready, and free of missing assumptions or acceptance gaps. For generated PBIs, prove one independently releasable actor-facing outcome with a complete full-flow surface when UI is involved.

**Summary:**

- **Purpose:** review ONE artifact (PBI · user story set · test spec · design spec) for completeness + quality so it ships evidence-backed and handoff-ready — no missing assumptions, no acceptance gaps. Default stance = SKEPTIC, not presence-checker: sections that exist but hold weak/untestable content are worse than missing ones — they breed false confidence.
- **Main steps (in order):** (1) **Identify** type — dispatch on `--type={pbi|story|spec-tests|design}`, infer if omitted; (2) **Adversarial Mindset** — run ALL 6 techniques (steel-man rejected alternatives · stress-test 3 assumptions · AC-testability · pre-mortem · unseen alternatives · contrarian pass) + clear the Anti-Bias Gate before any verdict; (3) **Type checklist** — score Required + Recommended; (4) **M1-M7 gate** (BLOCKING, ALL types); (5) **Readability checklist**; (6) **Output** per-type template (verdict + Required/Recommended tallies + coverage/AC matrix); (7) **Validated-fix + full re-review loop** — validate findings → fix only current-round blocking findings → restart until the round bar is clear (Round 1: zero findings; Round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred; binary gates always block).
- **Type dispatch + verdict:** each `--type` has its own Required/Recommended checklist and output template — verdict = PASS (all Required + ≥50% Recommended) | WARN (all Required, <50% Recommended) | FAIL (any Required fails).
- **M1-M7 gate (ALL types, BLOCKING):** any **M1-M5 or applicable M7** violation forces NEEDS WORK citing the mandate ID + exact section/line. For spec-test artifacts, resolve the project profile first: the strict TC/Section 8 profile applies only when no native case contract is declared; a native profile declared by config or required references supplies its logical IDs, section roles, evidence carriers, and case identities. Exempt source identifiers only in the selected profile's evidence carriers (the strict default uses `[Source:]`, `**Evidence**`, `CoveredBy`, legacy `IntegrationTest`, frontmatter, and Mermaid); flag leakage in narrative prose. **M7 (business-visibility) is judged on each applicable business case's BODY via the demo test, NOT its prose** — a tech-free-sounding case about a consumer/sync/handler passes M1 and STILL fails M7. — why: carriers preserve auditable code links, M1 governs vocabulary, and M7 governs subject matter.
- **Validated-fix loop:** before fixing, invoke `$why-review --validate-findings <report-path>` on the review report FIRST (validate-before-fix discipline, at parity with `$plan-review`) — NEVER edit the artifact to resolve findings before this gate returns CLEAN. Then fix only validated blocking findings, do not confirm-in-place, restart the FULL review (fresh `general-purpose` sub-agent — artifacts are NOT code), and loop until the current exit bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred).
- **PBI releaseability is a Required check:** every generated PBI MUST be one independently releasable actor-facing outcome with a complete entry-to-result journey. For UI PBIs, the review MUST also verify the page/view inventory, navigation, component inventory, applicable states, and full-flow demo surface; a technical-only PBI or single static screen FAILS.

**Workflow:**

1. **Identify** — What artifact type is being reviewed
2. **Checklist** — Apply type-specific quality criteria
3. **Verdict** — READY or NEEDS WORK with specific items

**Key Rules:**

- Use type-specific checklists
- Every NEEDS WORK item must be actionable
- Focus on completeness — never block on stylistic preferences
- PBI reviews MUST apply `.claude/skills/shared/releasable-pbi-contract.md`: a technical-only PBI, incomplete journey, or UI PBI without the required page/view, navigation, component, state, and demo surface is a Required-check failure.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

When evaluating code, refactor, test, or abstraction, ask:
**does this make next change cheaper or more expensive?**

- Reject "best practices" raising change cost (premature abstraction,
  speculative generality, leaky indirection, ceremony without payoff).
- Name real enemies in findings: **coupling, hidden state, duplicated
  knowledge, unclear intent, irreversible decisions exposed too early**.
- Simpler design easy to change beats sophisticated design that isn't.

Apply this lens **before** invoking any specific rule, pattern, or checklist
below — if downstream rule would raise change cost, this principle wins.

---

## Adversarial Review Mindset (NON-NEGOTIABLE)

**Default stance: SKEPTIC challenging artifact quality and completeness, not confirming presence of sections.**

> **Presence-quality confusion trap:** Artifact with all required sections LOOKS complete. But sections that exist yet contain weak, ambiguous, or untestable content are worse than missing sections — they create false confidence. This section forces quality challenge beyond existence checks.

### Adversarial Techniques (apply ALL before concluding)

**1. Steel-Man the Alternatives**
Before accepting chosen approach in any design artifact: argue FOR strongest rejected alternative as vigorously as possible. Would a senior domain expert seriously consider it? If yes — artifact's dismissal needs stronger justification.

**2. Assumption Stress Test**
List the 3 biggest assumptions embedded in artifact. For each: "What if this is wrong?" An artifact that breaks when 2 of its 3 core assumptions fail is fragile. Flag unaddressed failure modes.

**3. Acceptance Criteria Testability**
For each acceptance criterion: "Can a QA engineer write a specific automated test for this — without asking clarifying questions?" If not — AC is ambiguous. Flag it. Vague ACs ("feature works correctly") are NOT acceptance criteria.

**4. Pre-Mortem**
Assume artifact is implemented exactly as written and feature fails in production within 3 months. Write the most plausible failure scenario. If you can't find one, look harder — every implementation has a failure mode.

**5. Unseen Alternatives**
Identify 1-2 approaches NOT mentioned in artifact. Genuinely not considered, or considered and excluded without documented reasoning? Missing alternatives without exclusion reasoning = incomplete analysis.

**6. Contrarian Pass**
Before writing any verdict, generate at least 2 sentences arguing the OPPOSITE conclusion. Then decide which argument is stronger based on evidence.

### Forbidden Patterns

- **"Required sections present"** → Presence ≠ quality. What's IN them?
- **"Acceptance criteria are defined"** → Are they TESTABLE? Name the automated test for each.
- **"Scope is well-defined"** → What is explicitly OUT of scope? If nothing is out of scope, the scope is undefined.
- **"Alternatives were considered"** → Were they real alternatives, or strawmen set up to lose?
- **"Looks complete"** → What specific failure mode is NOT addressed?

### Anti-Bias Gate (MANDATORY before finalizing verdict)

- [ ] Steel-manned at least one rejected alternative
- [ ] Identified 3 hidden assumptions and stress-tested them
- [ ] Verified each AC is unambiguously testable (can write automated test without clarification)
- [ ] Ran pre-mortem (one concrete production failure scenario)
- [ ] Identified at least 1 unexamined alternative (not in artifact)
- [ ] Generated at least 2 sentences arguing the opposite verdict

If any box is unchecked → adversarial review incomplete. Go back.

## Type-Specific Checklists (`--type` dispatch)

Select the checklist + output template by artifact type. Pass `--type={pbi|story|spec-tests|design}` to force a type; if omitted, infer from the artifact (Phase 1 "Identify"). Each type scores **Required (all must pass)** + **Recommended (≥50% should pass)** → verdict **PASS** (all Required + ≥50% Recommended) | **WARN** (all Required, <50% Recommended) | **FAIL** (any Required fails).

| `--type`    | Artifact             | Output template                             |
| ----------- | -------------------- | ------------------------------------------- |
| `pbi`       | Product Backlog Item | PBI Review Result                           |
| `story`     | User story set       | Story Review Result (+ AC Coverage Matrix)  |
| `spec-tests` | Test specification   | Test Spec Review Result (+ Coverage Matrix) |
| `design`    | Design spec          | Artifact Review                             |

### PBI Review (`--type=pbi`)

| #   | Check                                                                                                      | Presence                                                  | Quality Depth                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Releasable outcome and full flow are defined** — the PBI is an independently releasable actor-facing outcome, not a technical layer | Is the actor, outcome, complete journey, and gate evidence present? For UI, are pages/views, navigation, components, states, and demo journey present? | Can a stakeholder recognize the value from entry through result and exit? Are persistence, access, failure, recovery, and visible truth covered where applicable? Does the scope hide foundation/setup/migration work as the outcome? A UI PBI represented by one isolated screen FAILS. |
| 2   | **Problem statement is clear** — the problem being solved is described in concrete terms                   | Is a problem statement present? Is it 2+ sentences?       | Is the problem scoped correctly? Could it be framed differently to lead to a different (simpler) solution? Are symptoms confused with root cause?                                              |
| 3   | **Acceptance criteria are testable and measurable** — each AC can be verified by a test                    | Are ACs present? Do they use measurable language?         | Can a QA engineer write an automated test for EACH AC without clarification? Are they specific enough to catch regressions? Vague ACs ("feature works correctly") are not acceptance criteria. |
| 4   | **Scope is well-defined (what's in and out)** — both in-scope and out-of-scope items are explicitly listed | Is an in/out scope list present? Does it have both sides? | Are out-of-scope items specific enough to prevent scope creep? Is anything ambiguously in/out? A scope that says nothing is out of scope is an undefined scope.                                |
| 5   | **Dependencies are identified** — all external dependencies the PBI relies on are listed                   | Is a dependencies section present? Does it list items?    | Are ALL dependencies listed (technical, data, service, team)? Are "can-parallel" items truly safe to parallelize, or do they share a shared resource?                                          |
| 6   | **Business value is articulated** — the why behind the PBI is stated in terms of user or business outcome  | Is business value described?                              | Is the value quantified or just stated? Does it connect to a user outcome, not just a feature delivery? "Users can now do X" is better than "we implemented feature Y".                        |
| 7   | **Priority is assigned** — the PBI has an explicit priority level                                          | Is a priority level assigned?                             | Is priority justified with data (RICE/MoSCoW), or arbitrary? Is it consistent with other PBIs in the same sprint? A PBI that is "high priority" without justification is unranked.             |
| 8   | **Acceptance-criteria set is complete** — the ACs together cover the whole releasable outcome, not only the happy path | Is there an AC for every in-scope behavior, including the negative/failure, empty, permission-denied, and recovery paths the scope implies? | Could the PBI be marked done with every AC passing while a stated in-scope behavior is still missing? An AC set that admits that gap is incomplete — FAIL. Are ACs in GIVEN/WHEN/THEN (or equivalently structured) form so each is independently decidable? |
| 9   | **PO sign-off readiness** — a product owner could render a per-AC PASS/FAIL verdict from this artifact alone | Does each AC name the observable evidence that would settle it (test result, visible state, demo step)? Is the design approved where applicable, and are dependencies resolved or explicitly deferred? | Would two reviewers reach the SAME verdict on every AC? An AC whose verdict depends on the reviewer's taste or on unstated context is not sign-off-ready. Every AC must be decidable PASS or FAIL with named evidence — a criterion that can only be judged "looks fine" FAILS this check. |

### User Story Review (`--type=story`)

| #   | Check                                                                                                                    | Presence                                                       | Quality Depth                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Follows GIVEN/WHEN/THEN format** — the story uses the structured BDD format                                            | Are all three parts (GIVEN, WHEN, THEN) present?               | Are all 3 parts present AND meaningful? Or is GIVEN trivial ("Given a user exists")? A GIVEN that describes no precondition adds no value.                    |
| 2   | **Is independent (not dependent on other stories)** — the story can be implemented without requiring another story first | Is independence stated or inferable?                           | Would descoping other stories prevent this story from being implemented? Implicit dependencies are as blocking as explicit ones.                              |
| 3   | **Is estimable (team can size it)** — the team has enough information to assign story points                             | Is the story sized or estimable based on content?              | Does the team have enough info to estimate? Is "can't estimate" a sign of missing AC? If it can't be sized, it's not ready for sprint.                        |
| 4   | **Is small enough for one sprint** — the story fits within a single sprint's capacity                                    | Is the story sized at ≤8 story points or scoped to one sprint? | Could this be split further? Stories >8SP should always be split. A story that "could fit" in a sprint but requires multiple sub-systems is likely too large. |
| 5   | **Has acceptance criteria** — the story defines measurable conditions for completion                                     | Are acceptance criteria present?                               | Are criteria testable? Would they catch a bug if the feature works in 9/10 cases? ACs that only describe the happy path are incomplete.                       |

### Design Spec Review (`--type=design`)

| #   | Check                                                                                                                                         | Presence                                            | Quality Depth                                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **All component states covered (default, hover, active, disabled, error, loading)** — spec defines visual behavior for all interaction states | Are all 6 states defined?                           | Are edge-case states (error, loading) as fully designed as the default state, or sketched? An undesigned error state will be improvised in implementation.                                      |
| 2   | **Design tokens specified (colors, spacing, typography)** — specific token values are called out, not ad-hoc values                           | Are token references present instead of raw values? | Are tokens from the project's token system, or are new values introduced? New values outside the token system break design consistency silently.                                                |
| 3   | **Responsive behavior defined** — how the component adapts across breakpoints is documented                                                   | Are breakpoint behaviors defined?                   | Are ALL breakpoints covered, or only desktop and mobile? Tablet-specific layouts are the most frequently omitted. Are content truncation / overflow behaviors specified?                        |
| 4   | **Accessibility requirements noted** — WCAG-relevant requirements (color contrast, keyboard nav, ARIA) are documented                         | Are accessibility notes present?                    | Are requirements specific (WCAG level, contrast ratio) or vague ("should be accessible")? Vague accessibility notes produce non-compliant implementations. Is keyboard navigation flow defined? |
| 5   | **Interaction patterns documented** — animations, transitions, and user interaction flows are specified                                       | Are interaction behaviors described?                | Are timing and easing values specified? Is behavior defined for both forward and reverse interactions (e.g., open AND close)? Unspecified interactions are implemented inconsistently.          |
| 6   | **Linked from the Feature Spec** — the design-spec path is recorded in the governing Feature Spec frontmatter `design_spec:` key so the spec stays the navigable hub | Is the design-spec path present in the Feature Spec frontmatter `design_spec:` (or `mockup:`) key? | Does the recorded path resolve to THIS design-spec, and does the design-spec deepen the spec's tech-agnostic §6 interaction surface (same UX-role view names / observable states) rather than diverge from it? An unlinked design-spec is an orphan — FAIL. Contract: `SYNC:ui-intent-layer` (inlined in this skill). |

#### UI/UX Design Principles Pass — `--type=design` ONLY (9 dimensions)

> **Scope gate:** this pass applies to `--type=design` and to NOTHING else. `--type=pbi`, `--type=story`, and `--type=spec-tests` are UNAFFECTED — their checklists, tallies, and verdicts are unchanged. A design artifact for a feature with no user-facing surface skips the whole pass with the reason stated.

The 40 clauses of `SYNC:ui-ux-design-principles` (full body inlined below in this skill) bind the design-spec path in the **REVIEW** role: each clause is a fail-condition against the ARTIFACT — *does the spec SPECIFY the decision this clause demands, at a depth an implementer could not get wrong?* The missing specification is the finding; the reviewer names the gap, never supplies the value.

Run **NINE focused passes over the artifact — one dimension at a time**, never a simultaneous sweep (a simultaneous sweep degenerates into the presence-checking this skill's Adversarial Review Mindset already forbids). Answer each `Think:` prompt from first principles before looking for the gap.

**Every finding:** `UI-<clause>` + `file:line` (artifact section + line) + severity per `SYNC:severity-rubric` already in force (Critical/High/Medium/Low), folded into the EXISTING verdict machinery — a clause gap that leaves a Required check unmet drives that check to fail (**FAIL**); a gap that only weakens depth lands as a Recommended miss or an Action Item under **NEEDS WORK**. No new scale, no new verdict.

| #   | Dimension                 | Clauses            | `Think:`                                                                                                                                                                                                                                              |
| --- | ------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Visual Hierarchy & Layout | `UI-1.1`-`UI-1.5` | Does the spec name ONE focal element per view, or leave first-read priority to the implementer? Is grouping expressed as whitespace or as nested boxes? Are the empty, loading and error states specified as fully as the populated state, or sketched? |
| 2   | Typography                | `UI-2.1`-`UI-2.5` | Does the spec reference a fixed 6-step scale with named families/weights (max 2 families, 3 weights each), or ad-hoc sizes? Are body size (16px web, 17px mobile, never below 14px), measure (45-75 characters), and leading (1.5 body, 1.1-1.2 display) stated or assumed? |
| 3   | Colour & Contrast         | `UI-3.1`-`UI-3.4` | Are contrast ratios written as measured numbers (4.5:1 text, 3:1 UI edges) or as the word "accessible"? Does any state carry meaning by colour alone with no icon/label/position pair? Is dark mode specified as its own surface treatment, or implied as an inversion? |
| 4   | Spacing & Grid            | `UI-4.1`-`UI-4.4` | Is a single base unit (4px or 8px) declared, with every gap a multiple of it? Is spacing assigned to containers rather than children? Are breakpoints justified by where the layout fails, or copied from device names?                              |
| 5   | Interaction & Feedback    | `UI-5.1`-`UI-5.5` | Is a response under 100ms specified for every action? Are all 5 states plus loading enumerated per component? Is undo offered where the spec calls for a confirmation? Are motion duration/easing (150-250ms, ease-out) and reduced-motion behaviour written down? Is the focus ring's appearance specified rather than removed? |
| 6   | Navigation & IA           | `UI-6.1`-`UI-6.4` | Does each specified view answer where-am-I / what's-here / where-next? How many top-level destinations does the IA declare (max 5)? Are labels drawn from user vocabulary or internal naming? Does every state have a URL or a defined back path?    |
| 7   | Forms & Input             | `UI-7.1`-`UI-7.5` | Does the spec justify each field's existence today? Are labels specified as persistently visible rather than placeholders? Are validation timing (on blur), error placement, and remediation wording defined? Are keyboard type/autocomplete/autocapitalise declared per field? Is data preservation across error, navigation and refresh specified? |
| 8   | Mobile & Touch            | `UI-8.1`-`UI-8.4` | Are hit targets specified at >=44x44pt with 8px separation independent of icon size? Where does the spec place primary actions relative to the thumb zone? Is every gesture given a tappable equivalent? Are safe areas and keyboard avoidance addressed? _(No touch surface in the artifact → skip with the reason stated.)_ |
| 9   | Speed & Perceived Speed   | `UI-9.1`-`UI-9.4` | Does the spec choose skeleton vs spinner deliberately per surface? Is optimistic update with a VISIBLE rollback specified? Is reserved space defined for every async or media element so nothing shifts? Are offline, timeout and retry specified as designed states rather than left as edge cases? |

**No double-counting** with Design Spec checks 1-6: check 1 (6 component states) meets `UI-5.2`/`UI-1.5`; check 2 (design tokens) meets `UI-2.5`/`UI-4.1`/`UI-3.2`; check 3 (responsive) meets `UI-4.4`/`UI-8.*`; check 4 (accessibility) meets `UI-3.1`/`UI-3.3`/`UI-5.5`; check 5 (interaction patterns) meets `UI-5.4`/`UI-5.1`. Where they meet, emit ONE finding carrying BOTH citations at the HIGHER severity — never two findings for one gap.

**Precedence:** the project design-system / SCSS / token docs **OUTRANK** these clauses — a spec following the project's own scale, unit, breakpoints, or token pairs SATISFIES the clause. A genuine conflict is surfaced to the user with both sides, NEVER resolved silently.

### Test Spec Review (`--type=spec-tests`)

> **[BLOCKING] MUST ATTENTION resolve the case profile before applying this rubric.** Read `docs/project-config.json`, the required project-reference docs, and `.claude/skills/shared/sdd-artifact-contract.md`. If the config or required references declare a native case contract, use its canonical owner, logical IDs, section/field roles, evidence carriers, and cardinality. Use `shared/tc-format.md` and the TC/Section 8 rules below only when no native case contract is declared. Invalid, incomplete, unreadable, or contradictory profile evidence is `BLOCKED`/`UNKNOWN`; do not fall back to the TC default or claim coverage.
> **[BLOCKING] Read** `spec-principles.md` under the configured reference-docs root for local prose/evidence rules. Under the strict default, also use `shared/tc-format.md` for TC fields, priorities, and coverage. Under a native profile, apply the same semantic checks through its declared case and evidence fields; do not require a duplicate Section 8 registry or default-only field.
> **[BLOCKING] Tech-agnostic check:** flag framework/product/language/design-pattern names in behavioral prose as findings (per the selected profile's prose policy). Source paths, class names, and test identifiers are valid only inside declared evidence carriers; the strict default uses `**Evidence**`, `CoveredBy`, legacy `IntegrationTest`, `[Source:]`, frontmatter, and Mermaid. Never flag a declared carrier as narrative leakage.
> **[BLOCKING] Business-oriented cases and cardinality:** Each business case must state an actor-facing acceptance outcome, not merely mirror a class/method. Flag a case split or narrowed only to match code structure when the user-observable behavior and invariant are the same. Preserve the strict default's one-TC-to-many-tests rule when selected; a native profile may declare another cardinality. In every profile, MUST ATTENTION preserve owner-qualified scenario identity and any variant identity, and MUST ATTENTION trace every claimed result to its actual executor and inspected assertion. Repeated scenario IDs with distinct declared variants are not duplicates; exact duplicate owner/scenario/variant identities are.

#### Required (all must pass)

| #   | Check | Presence | Quality Depth |
| --- | --- | --- | --- |
| 1 | **Logical case identity** — every case follows the selected profile's identifier and owner rule; the strict default uses `TC-{FEATURE}-{NNN}`. | Does each case have a valid identity in the configured owner/carrier? | Are identities unique under the profile's full key, including owner and any declared variant? |
| 2 | **Actor/outcome coverage** — every in-scope user story or actor-facing outcome maps to at least one canonical case. | Is each story/outcome represented in the configured case set? | Does the case exercise the behavior, or merely cite a story ID? |
| 3 | **Requirement coverage** — each acceptance criterion or normative requirement maps to an applicable case. | Is every configured acceptance/requirement ID covered? | Would at least one mapped case fail if the criterion or requirement were violated? |
| 4 | **Healthy path** — each applicable outcome has a realistic success case. | Is a happy path present where the behavior permits success? | Does it assert the full observable outcome rather than a stub? |
| 5 | **Negative/failure path** — relevant errors, denied access, and invalid transitions have explicit cases. | Are negative paths represented where the contract requires them? | Do they assert the exact rejected outcome and preserve healthy behavior? |
| 6 | **No duplicate canonical cases** — identity uniqueness follows the selected profile. | Are exact profile identities unique? | Flag cases with the same intent and identity; under a native profile, distinct declared variants of one scenario are valid and must remain distinct. |
| 7 | **Meaningful expected outcome and assertion** — each case states a precise expected positive or negative outcome. | Is an authored expected value/state present in the configured carrier? | Would the mapped assertion fail if the protected outcome were wrong? An ID, comment, or aggregate result alone is not assertion proof. |
| 8 | **Intent / invariant guarded** — each executable case names the business intent or technical contract it protects. | Is the guarded intent stated in the profile's case/rationale field or an equivalent carrier? | Would the assertion fail if that intent or invariant broke? |
| 9 | **Authorization coverage** — each story or actor outcome with an authorization boundary includes a denied-access case. | Is a negative authorization case present for each applicable story/outcome? | Does it use a realistic unauthorized principal and assert the denied outcome while preserving authorized behavior? |
| 10 | **Profile format and coverage evidence** — the required fields and links match the selected profile. | Under the default, are required TC fields and `CoveredBy:` present? Under a native profile, are its required fields and case-to-test relation used? | For every claimed tested case, can the reviewer follow its owner/case/variant identity to the actual executor and inspected assertion, or an explicitly approved manual-QC carrier? `UNKNOWN`/unresolved is never PASS. |
| 11 | **Preservation cases (bugfix context)** — pre-existing healthy behavior remains protected. | Is the relevant preservation case present when a bug fix could regress existing behavior? | Would its assertion detect recurrence, not merely prove that no exception occurred? |
| 12 | **Invariant/property and boundary coverage** — each universal hard rule has a universally quantified property plus a boundary counter-case. | Does every applicable hard rule/invariant in the configured contract sections (default: `[HARD]` §4 and §5) map to both cases? | Would the property and boundary assertion fail if the invariant broke? A single example is insufficient. |
| 13 | **UI interaction intent (UI-bearing specs)** — required views, navigation, observable states, and user flows are present in the selected profile. | Under the default, are §6.2–§6.5 present or is the backend-only skip reason stated? Under a native profile, are its declared interaction fields covered? | Is UI intent linked to configured logical IDs and M1-clean, with visual fidelity left to its linked design artifact? An absent applicable interaction contract is a finding. |

> **[BLOCKING] Spec-Loop property coverage (`--type=spec-tests`):** Verify every universal hard rule/invariant in the selected contract sections maps to a universally quantified property case **and** a boundary counter-case. For the strict default, these are `[HARD]` §4/§5 invariants and property TCs. For a native profile, resolve the configured contract section and case carrier. Example-only coverage is a blocking finding; a missing/unresolvable property case is `NEEDS WORK` or `BLOCKED`, never a pass.

#### Recommended (≥50% should pass)

| #   | Check                                                                                                                                                       | Presence                                                                 | Quality Depth                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Edge cases** — Boundary values, empty inputs, max limits tested                                                                                           | Are edge cases listed in the selected carrier?                           | Are these the RIGHT edge cases? Do they cover the 3 most likely production failure modes for this feature?                  |
| 2   | **Integration points** — Cross-service scenarios covered                                                                                                    | Are cross-service cases present where applicable?                        | Do integration cases verify actual data flow across services, or just that a downstream call was made?                     |
| 3   | **Performance cases** — Response time or throughput expectations where relevant; production-like data volume cases if >1000 records expected                 | Are performance cases present where data volume or SLA expectations exist?| Do they use production-like data volumes, not toy datasets that trivially pass?                                            |
| 4   | **Security cases** — Auth, authorization, input validation tested                                                                                           | Are security cases present for auth, authz, and input validation?        | Do they attempt realistic attack vectors (SQLi, over-posting, privilege escalation) not just "invalid token → 401"?       |
| 5   | **Seed data cases** — If feature needs reference data, cases verify data exists and seeding produces the intended state                                      | If reference data is needed, is a case present (or N/A)?                 | If present, does the case assert the exact seeded data shape, not just that the seeder ran without error?                   |
| 6   | **Data migration cases** — If schema changes exist, cases verify transforms, rollback behavior, and absence of data loss                                    | If schema changes exist, is a migration case present (or N/A)?           | If present, does it verify rollback behavior and zero data loss, not just forward migration success?                        |
| 7   | **Test data requirements specified** — the data setup needed to run each test is documented                                                                 | Are test data requirements stated per test?                              | Is test data specific enough to create fixtures without guessing? Vague data requirements ("a valid user") will cause test setup divergence across environments. |
| 8   | **GIVEN/WHEN/THEN format used** — tests follow the structured BDD format                                                                                    | Are all tests written in GIVEN/WHEN/THEN?                                | Are the THEN clauses assertions on observable outcomes, or on internal state? Tests asserting on internal state are brittle and break on refactoring.            |

## M1-M7 Compliance Gate (BLOCKING — applies to ALL artifact types)

> **Contract:** See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)". This review enforces M6: any artifact (PBI, story, design spec, test spec) that violates **M1-M5 or M7** MUST receive a NEEDS WORK verdict that names the violated mandate ID and cites the exact section + line. Passing an **M1-M5/M7** violation makes this review itself defective. (M6 binds THIS review, not the artifact — which is why the artifact-facing set reads M1-M5 **and M7**, never "M1-M6".)
>
> Carriers are EXEMPT from M1/M2 — source identifiers belong in the selected profile's declared evidence carriers. The strict default uses `[Source: ...]`, `**Evidence**`, `**CoveredBy**`, legacy `**IntegrationTest**`, YAML frontmatter, and Mermaid. Only flag leakage in narrative prose (descriptions, AC/scenario text, rule statements). Banned prose token list: `spec-principles.md` §3.2 under the configured reference-docs root.

- [ ] **M1 — Tech-agnostic prose.** FAIL if narrative prose, headings, summaries, or AC/scenario text name a framework/product, a language-native type, or a product/design-pattern class name (banned-token list in `spec-principles.md` §3.2). Cite the section + leaked token.
- [ ] **M2 — No source code in prose.** FAIL if prose expresses behavior as a class/method/file-path/namespace used as a noun (e.g. "call the create-async method") instead of the business operation (e.g. "create the record"). Source identifiers belong only in evidence carriers. Cite the section + line.
- [ ] **M3 — Profile-owned traceability.** FAIL if a requirement, rule, acceptance criterion, or canonical case lacks the selected profile's logical identity or required source/evidence link. Under the strict default, require `FR-/BR-/OP-/TC-` IDs and a secondary `[Source: namespace/service/id]` abstract anchor; physical coordinates belong only in the provenance sidecar. Under a native profile, use its declared identifiers and evidence carriers without imposing a second abstract-anchor or TC registry. If the profile does not resolve the required identity/evidence form, report `BLOCKED`/`UNKNOWN`; never infer a pass.
- [ ] **M4 — Unambiguous, observable criteria.** FAIL if AC/expected-result prose uses vague language ("handle appropriately", "process normally", "as needed"), OR two engineers could implement it differently while both claiming conformance, OR no observable completion state / named error condition exists. (Reinforces the AC-testability technique above.)
- [ ] **M5 — Rebuild-from-artifact.** FAIL if a competent team with ZERO codebase knowledge could not re-implement the described behavior on a different stack from the artifact alone (it relies on reading source to be understood). Cite the section + the missing detail.
- [ ] **M7 — Business-visibility (business-tree artifacts only).** Apply **the demo test to each case's BODY**: *"what would a stakeholder SEE change?"* — **no answer → FAIL as TECHNICAL-ONLY.** Every `Given` must be a state a user could arrange, every `When` an action a user could take, every `Then` an outcome a user could see. FAIL a case whose `When` is an invocation (a handler runs, a consumer receives, a job fires, a model is inspected, data syncs) or whose `Then` asserts a schema/type/nullability/column/call-count rather than a business outcome. **Judge the BODY, never the title or ID** — a business-sounding title routinely fronts an invocation-shaped `When`. Cite the case ID + the offending `When`/`Then` clause.

> 🔴 **M1 vs M7 — the distinction this gate exists for.** M1 governs **vocabulary**; M7 governs **subject matter**. **A technical case written in impeccably tech-free prose satisfies M1 while violating M7** — and that gap is the single most common way business specs rot: each bugfix adds one more tech-free-sounding case about a consumer, a sync, or a load path, every M1 check passes, and the business tree fills with cases no one can demo. ⚠️ **Passing a case because its prose is clean is the exact failure this box catches.** ⚠️ Conversely, do NOT fail a case merely for containing a technical-sounding noun: if a user or QC can demo the outcome, it is business — **M7 asks what the case is ABOUT, not which words it uses.**

If ANY box fails → verdict is NEEDS WORK; list each violated mandate ID with its concrete section/line citation in the Action Items.

## Readability Checklist (MUST ATTENTION evaluate)

Before approving, verify code is **easy to read, easy to maintain, easy to understand**:

- **Schema visibility** — If function computes a data structure (object, map, config), a comment should show output shape so readers don't trace the code
- **Non-obvious data flows** — If data transforms through multiple steps (A → B → C), a brief comment should explain the pipeline
- **Self-documenting signatures** — Function params should explain their role; flag unused params
- **Magic values** — Unexplained numbers/strings should be named constants or have inline rationale
- **Naming clarity** — Variables/functions should reveal intent without reading the implementation

## Output Format (per `--type`)

Pick the template matching `--type`. All templates lead with a **Status/Verdict** and `### Required`/`### Recommended` tallies; the `pbi`/`story`/`spec-tests` shapes add their own evidence sections (preserved verbatim from the former `refine-review`, `story-review`, `tdd-spec-review` skills).

### `--type=design` (default shape)

```
## Artifact Review

**Artifact Type:** [PBI | Story | Design | Test Spec]
**Artifact:** [Reference/title]
**Date:** {date}
**Verdict:** READY | NEEDS WORK

### Checklist Results
- [pass] [Item] — [evidence]
- [fail] [Item] — [what's missing/wrong]

### Action Items (if NEEDS WORK)
1. [Specific actionable item]
```

### `--type=pbi`

```markdown
## PBI Review Result

**Status:** PASS | WARN | FAIL
**Artifact:** {pbi-path}

### Required ({X}/{Y})

- ✅/❌ Check description

### Recommended ({X}/{Y})

- ✅/⚠️ Check description

### Issues Found

- ❌ FAIL: {issue}
- ⚠️ WARN: {issue}

### Releasable Outcome Evidence

- **Actor and outcome:** { ... }
- **Full-flow journey:** {entry → action → result → exit}
- **Technical-only work:** {attached enabling tasks | none}
- **UI surface:** {page/view inventory + navigation + components + states + demo journey | N/A — backend-only with reason}
- **Gate:** PASS | BLOCKED

### Verdict

{PROCEED | REVISE_FIRST}
```

### `--type=story`

```markdown
## Story Review Result

**Status:** PASS | WARN | FAIL
**Stories reviewed:** {count}
**Source PBI:** {pbi-path}

### AC Coverage Matrix

| Acceptance Criterion | Covered By Story | Status |
| -------------------- | ---------------- | ------ |

### Required ({X}/{Y})

- ✅/❌ Check description

### Recommended ({X}/{Y})

- ✅/⚠️ Check description

### Missing Stories

- {Any PBI AC not covered}

### Dependency Issues

- {Circular deps, missing ordering}

### Verdict

{PROCEED | REVISE_FIRST}
```

### `--type=spec-tests`

```markdown
## Test Spec Review Result

**Status:** PASS | WARN | FAIL
**Canonical cases reviewed:** {count} (strict default: TCs)
**Coverage:** {X}% of stories, {Y}% of acceptance criteria

### Coverage Matrix

| Story/AC | Case IDs (default: TC IDs) | Happy | Error | Edge |
| -------- | ------ | ----- | ----- | ---- |

### Required ({X}/{Y})

- ✅/❌ Check description

### Recommended ({X}/{Y})

- ✅/⚠️ Check description

### Missing Coverage

- {Stories/AC without mapped canonical cases}

### Verdict

{PROCEED | REVISE_FIRST}
```

## Validated Fix + Full Re-Review (MANDATORY when fixes are applied)

> **Protocol:** `SYNC:double-round-trip-review` + `SYNC:fresh-context-review` + `SYNC:review-protocol-injection` (all inlined above in this file).

Do not spawn a fresh sub-agent just to re-review the same finding set before fixing it. If the artifact needs work, fix actionable findings first, then restart the full artifact review over the current artifact. When that restarted review uses a fresh `general-purpose` sub-agent, use the canonical Agent template from `SYNC:review-protocol-injection` above. Artifact reviews (PBI, story, design spec, test spec) are NOT code — use `agent_type: "general-purpose"`, not `"code-reviewer"`. When constructing the Agent call prompt:

1. Copy the Agent call shape from the `SYNC:review-protocol-injection` template verbatim
2. Set `agent_type: "general-purpose"`
3. Embed the full verbatim body of these SYNC blocks (inlined above in this skill file): `SYNC:evidence-based-reasoning`, `SYNC:rationalization-prevention`, `SYNC:understand-code-first` (omit code-specific protocols like `SYNC:bug-detection`, `SYNC:design-patterns-quality`, `SYNC:fix-layer-accountability` which are not applicable to artifact files)
4. Set the Task as `"Run a full fresh artifact review over the current {artifact-type} after fixes were applied. Focus on: implicit assumptions, missing coverage of edge cases / error scenarios, unverified cross-references, completeness gaps only visible on second reading, whether acceptance criteria are truly testable and measurable, and regressions introduced by fixes."`
5. Set Target Files as the explicit artifact file path(s)
6. Set report path as `tmp/reports/artifact-review-rerun{N}-{date}.md`

After sub-agent returns:

1. **Read** the sub-agent's report
2. **Integrate** findings as `## Re-Review {N} Findings` in the main report — DO NOT filter or override
3. **If NEEDS WORK:** fix actionable artifact findings, then restart the full artifact review from the beginning
4. **Repeated blocker cap:** if the same blocker repeats across 2 full invocations with no progress, escalate by asking the user directly
5. **Final verdict** must incorporate findings from ALL review passes that actually ran

## IMPORTANT Task Planning Notes (MUST ATTENTION FOLLOW)

- Always plan and break work into many small todo tasks using task tracking
- Always add a final review todo task to verify work quality and identify fixes/enhancements

---

## Bulk Multi-Artifact Sweeps

> For bulk multi-artifact review (10+ artifacts at once), use `$changes-review` — its Systematic Review Protocol categorizes the set and fires parallel sub-agents.

---

## AI Agent Integrity Gate (NON-NEGOTIABLE)

> **Completion ≠ Correctness.** Before reporting ANY work done, prove it:
>
> 1. **Grep every removed name.** Extraction/rename/delete touched N files? Grep confirms 0 dangling refs across ALL file types.
> 2. **Ask WHY before changing.** Existing values are intentional until proven otherwise. No "fix" without traced rationale.
> 3. **Verify ALL outputs.** One build passing ≠ all builds passing. Check every affected stack.
> 4. **Evaluate pattern fit.** Copying nearby code? Verify preconditions match — same scope, lifetime, base class, constraints.
> 5. **New artifact = wired artifact.** Created something? Prove it's registered, imported, and reachable by all consumers.

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

**Prerequisites:** **MUST ATTENTION READ** before executing:

> **OOP & DRY Enforcement:** MANDATORY IMPORTANT MUST ATTENTION — flag duplicated patterns that should be extracted to a base class, generic, or helper. Classes in the same group or suffix (ex *Entity, *Dto, \*Service, etc...) MUST ATTENTION inherit a common base (even if empty now — enables future shared logic and child overrides). Verify project has code linting/analyzer configured for the stack.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `design-distinctiveness-gate` — Design identity gate DD-1 to DD-8: subject, design plan, generic test, restraint; designing, implementing or reviewing a visual surface → .claude/skills/shared/protocols/design-distinctiveness-gate.md
- `design-review-checklist` — Executable front-end design review protocol CL-1 to CL-6; reviewing, planning or building front-end work → .claude/skills/shared/protocols/design-review-checklist.md
- `double-round-trip-review` — Validated-finding fix loop: review, validate, fix, then a fresh full re-review, capped at two rounds; running a review that fixes findings and must re-review until the severity bar clears → .claude/skills/shared/protocols/double-round-trip-review.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `fresh-context-review` — Restart the full review in isolated sub-agents after fixes to avoid confirmation bias; re-reviewing after a fix cycle → .claude/skills/shared/protocols/fresh-context-review.md
- `goal-contract-satisfaction-loop` — Save the goal in a file and loop until every saved criterion passes; executing work against a user goal → .claude/skills/shared/protocols/goal-contract-satisfaction-loop.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `review-principle-awareness` — Classify the change context first, then apply the current principles that fit it; starting any review → .claude/skills/shared/protocols/review-principle-awareness.md
- `review-protocol-injection` — Verbatim template and protocol blocks for every fresh sub-agent review prompt; spawning a fresh sub-agent to review → .claude/skills/shared/protocols/review-protocol-injection.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `trade-off-interrogation-gate` — Three trade-off questions before any verdict, score or recommendation; rendering a verdict or recommending an option → .claude/skills/shared/protocols/trade-off-interrogation-gate.md
- `ui-intent-layer` — Tech-agnostic UI intent layer in every UI-bearing spec; writing a spec for a feature with a user interface → .claude/skills/shared/protocols/ui-intent-layer.md
- `ui-ux-design-principles` — Forty usability and accessibility clauses, UI-1.1 to UI-9.4; designing, building or reviewing a user-facing interface → .claude/skills/shared/protocols/ui-ux-design-principles.md
- `understand-code-first` — Read and trace the target and existing patterns before changing code; planning or editing code → .claude/skills/shared/protocols/understand-code-first.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code/conventions BEFORE any modification or explanation. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `$project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->


<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views with information priority now/later/not-here and container role + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:double-round-trip-review:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** run the review loop (aka **Self-Review Convergence Loop**): review → validate findings → fix validated blocking findings → FULL re-review. Any newly produced output/judgment gets ≥1 self-review, and any new judgment ≥1 `$why-review --validate-findings` pass, before it is treated as final.
- **MANDATORY severity floor:** round 1 exits only on zero findings at any severity; from round 2 the bar is zero CRITICAL/HIGH/MEDIUM, so a LOW-only round ENDS the loop once the persisted `minRounds` is met — list every deferred LOW in the report. NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to reach the exit, and NEVER apply the floor to a binary gate (test-green, security must-fix).
- **MANDATORY round cap of 2, extendable ONCE to round 3 — a ceiling, NEVER a target.** A clean pass ends the loop once the persisted `minRounds` is met (default 1; explicit 2 requires an independent pass). Round 2 ending with a validated CRITICAL/HIGH still open (a failed non-test binary gate counts as CRITICAL) grants exactly ONE extra round; round 2 ending with only MEDIUM/`NOT VERIFIABLE` open, or round 3 ending with any review blocker open → **STOP and escalate by asking the user directly**, never a silent PASS. The 2-repeated-no-progress blocker rule escalates earlier if it trips first. A failing TEST gate has NO round cap and buys no extension — keep fixing and re-running until tests pass, never forcing green.

<!-- /SYNC:double-round-trip-review:reminder -->




<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm by asking the user directly BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** ask the user directly reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:ui-ux-design-principles:reminder -->

Apply `UI-1.1`–`UI-9.4` only to applicable user-interface work. Resolve platform and project conventions first. Use WCAG 2.2 AA as the web accessibility baseline plus any stricter applicable legal/project requirement; non-web surfaces use the documented platform standard. Other web/mobile metrics and component tiers are defaults/examples only for matching surfaces. Skip N/A clauses and non-UI work explicitly. Project config, references, and accepted decisions govern; cite applicable findings by `UI-<clause>` + `file:line`.

<!-- /SYNC:ui-ux-design-principles:reminder -->

<!-- SYNC:design-distinctiveness-gate:reminder -->

- **MUST ATTENTION** apply the design distinctiveness gate (`DD-1`–`DD-8`) to any user-facing visual surface: ground it in the named subject/audience/job and confirm when the brief is silent (`DD-1`) · every choice carries a WHY, token names included (`DD-2`) · write a design plan (colour 4–6 named hex · type families+roles+scale · layout prose+ASCII+alignment · principles) then run the BLOCKING generic test and state what you revised BEFORE coding (`DD-3`) · audit every free axis against the T1–T5 tell catalog — cream+serif+`#D97757`, acid-on-black, broadsheet, the SaaS-card kit, template chrome (ALL-CAPS eyebrows, `A · B · C`, spaced-em-dash labels, `#0B0B0B`, mono data labels, trailing `→`) — a match is a missed decision, never a defect (`DD-4`) · 1–2 clearly distinct families, real scale, <80ch, no single-word headline accent / ALL-CAPS labels / redundant eyebrows (`DD-5`) · numbering only on real sequences; hero = the subject's most characteristic thing, not big-number+gradient (`DD-6`) · one orchestrated motion moment, never per-section entrances plus universal card hovers (`DD-7`) · spend boldness once, critique the BUILT page, remove one accessory (`DD-8`). The brief's stated direction OUTRANKS the tell catalog; project design-system docs OUTRANK these clauses — genuine conflicts go to the user, NEVER resolved silently. Cite findings as `DD-<clause>` + `file:line`. Skip ONLY for surfaces with no user-facing visuals, stated explicitly.

<!-- /SYNC:design-distinctiveness-gate:reminder -->

<!-- SYNC:design-review-checklist:reminder -->

- **MUST ATTENTION** when the change/plan/artifact has an applicable user-facing UI surface, READ `.claude/docs/design-review-checklist.md` and run it: `CL-1` establish context first (platform · user · task · metric · constraints · scope · artifacts — state missing context and its confidence impact) · `CL-2` evidence or nothing, cite a location per finding, NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), tag `MEASURED`/`OBSERVED`/`HEURISTIC` · `CL-3` rank `P0`–`P4`, cap at top 10 by severity, NEVER pad, concrete fix on every `P0`/`P1` · `CL-4` sweep §A–§N plus §R over whole surfaces (changed files → affected views, composition reconstructed, render or `ENVIRONMENT-BLOCKED`), including surface load B12–B15, container fit E9–E11, §H by usage, Field Necessity Matrix for input, applying only relevant platform/product sections and the WCAG 2.2 AA web baseline plus any stricter applicable legal/project requirement, or the documented standard for other platforms · `CL-5` short on time → use the §P prompts · `CL-6` report in the §O shape · for source code, assess component ownership, base abstractions, reuse, and duplication using the project's documented taxonomy or observed boundaries. Project design-system docs and ADRs OUTRANK the checklist; report a defect ONCE across `UI-*`/`DD-*`/`CL-*`. For a plan, bind only applicable sections and states to acceptance criteria, and name each UI view's primary task, container, information priority, and creation-vs-deferred inputs; a plan review flags a UI phase that omits them. Skip when the work has no user-facing UI surface, and state why.

<!-- /SYNC:design-review-checklist:reminder -->

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Review one artifact (PBI, design spec, story, or test spec) for completeness and quality so it is evidence-backed, handoff-ready, and free of missing assumptions or acceptance gaps. For generated PBIs, prove one independently releasable actor-facing outcome with a complete full-flow surface when UI is involved.

**Protocols in force — MUST ATTENTION honor every block below (concise digest of the SYNC/shared blocks this skill carries):**

- **Nested Task Creation:** Parent workflow rows never replace child phase tracking.
- **Project Reference Docs Guide:** Read required project docs before target work.
- **Task Tracking External Report:** Bootstrap tasks; persist review findings to `tmp/reports/`.
- **Critical Thinking Mindset:** Traced `file:line` proof; confidence >80% to act.
- **Evidence Based Reasoning:** No claim without cited evidence; state confidence.
- **Understand Code First:** Read code, grep 3+ patterns before any change.
- **Double Round Trip Review:** Validate findings, fix only current-round blocking findings, and restart the full review until the round severity bar is clear (Round 1: zero findings; Round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred; binary gates always block).
- **Releasable PBI Contract:** Apply `.claude/skills/shared/releasable-pbi-contract.md`; technical-only PBIs and UI PBIs represented by one isolated screen are FAIL, not WARN.
- **Fresh Context Review:** Spawn fresh zero-memory sub-agent after each fix cycle.
- **Review Protocol Injection:** Embed all 11 protocol bodies verbatim in sub-agent prompts.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Severity Rubric:** Classify findings Critical/High/Medium/Low by consequence using `SYNC:severity-rubric`; round 1 blocks on every validated finding, round 2 blocks only CRITICAL/HIGH/MEDIUM, and LOW is recorded/deferred. Failed binary gates always block.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** execute the main steps IN ORDER — (1) Identify type → (2) Adversarial Mindset + Anti-Bias Gate → (3) type Required/Recommended checklist → (4) M1-M7 BLOCKING gate → (5) Readability checklist → (6) per-type output template → (7) validated-fix + full re-review loop until the current round bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, with LOWs recorded as deferred); NEVER skip or merge steps without explicit user approval — why: each step catches a distinct defect class the others miss.
**IMPORTANT MUST ATTENTION** be a SKEPTIC, not a presence-checker — run ALL 6 adversarial techniques (steel-man rejected alternatives, stress-test 3 assumptions, AC-testability, pre-mortem, unseen alternatives, contrarian pass) and clear the Anti-Bias Gate BEFORE any verdict — why: sections that exist but hold weak/untestable content create false confidence worse than missing ones.
**IMPORTANT MUST ATTENTION** enforce the BLOCKING M1-M7 gate on ALL types — any **M1-M5 or M7** violation forces NEEDS WORK citing the mandate ID + exact section/line; NEVER pass an M1-M5/M7 violation — why: passing it makes this review itself defective.
**IMPORTANT MUST ATTENTION** M7 (business-visibility) is judged on each case's BODY via the demo test — *"what would a stakeholder SEE change?"*; no answer → NEEDS WORK as TECHNICAL-ONLY. A `When` that is an invocation (handler runs, consumer receives, job fires, data syncs, model inspected) or a `Then` asserting schema/type/nullability/call-count FAILS M7 **even in flawless tech-free prose** — why: M1 governs vocabulary, M7 governs subject matter, and passing a case because its prose is clean is exactly how technical cases accumulate in business specs one bugfix at a time.
**IMPORTANT MUST ATTENTION** exempt source identifiers only inside the selected profile's declared evidence carriers; the strict default uses `[Source:]`, `**Evidence**`, `CoveredBy`, legacy `IntegrationTest`, frontmatter, and Mermaid — flag leakage in narrative/AC/scenario prose — why: carriers preserve auditable code links without making prose implementation-dependent.
**IMPORTANT MUST ATTENTION** dispatch on `--type={pbi|story|spec-tests|design}` (infer if omitted) — apply that type's Required/Recommended checklist; verdict = PASS (all Required + ≥50% Recommended) | WARN (all Required, <50% Recommended) | FAIL (any Required fails).
**IMPORTANT MUST ATTENTION** for `--type=design` ONLY: run the 9-dimension UI/UX Design Principles pass — all 40 clauses (`UI-1.1`-`UI-9.4`), one dimension at a time; every finding cites `UI-<clause>` + `file:line` + `SYNC:severity-rubric` severity and folds into the existing Required/Recommended verdict; `pbi`/`story`/`spec-tests` are unaffected, and project design-system docs OUTRANK the clauses.
**IMPORTANT MUST ATTENTION** for `--type=spec-tests`, resolve the case profile before applying identity, evidence, section, or cardinality rules; an unresolved or conflicting profile blocks the verdict — why: a native case contract must not be rejected for differing syntax or silently copied into a duplicate registry.
**IMPORTANT MUST ATTENTION** property coverage: every universal hard rule/invariant in the selected contract section maps to a universally quantified property case and a boundary counter-case; strict default uses `[HARD]` §4/§5 property TCs, while a native profile uses its declared section and case carrier — why: example-only coverage cannot protect an invariant across its input domain.
**IMPORTANT MUST ATTENTION** run the findings-validation gate BEFORE fixing — invoke `$why-review --validate-findings <report-path>` first; NEVER edit the artifact to resolve findings before this gate returns CLEAN — why: validate-before-fix at parity with `$plan-review` prevents fixing phantom findings.
**IMPORTANT MUST ATTENTION** fix only validated blocking findings, then restart the FULL review with a fresh `general-purpose` sub-agent (artifacts are NOT code) and loop until the current exit bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred) — NEVER spawn a confirmation sub-agent after a bar-clearing round — why: every fix invalidates the prior verdict, but a bar-clearing pass needs no re-confirmation.
**IMPORTANT MUST ATTENTION** cite `file:line`/section+line evidence for every finding (confidence >80% to act, <60% DO NOT recommend); every NEEDS WORK item must be actionable — why: speculation produces non-fixable findings.
**IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting; add a final review todo task to verify work quality.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.

**Anti-Rationalization:**

| Evasion | Rebuttal |
| ------- | -------- |
| "Required sections present, looks complete" | Presence ≠ quality. Name what's IN them and the specific failure mode NOT addressed. |
| "ACs are defined" | Are they TESTABLE? Name the automated test a QA engineer writes for each — without clarification. |
| "Alternatives were considered" | Real alternatives or strawmen set up to lose? Steel-man the strongest rejected one. |
| "Verdict is clear, skip the contrarian pass" | Generate 2 sentences arguing the OPPOSITE conclusion first, then decide on evidence. |
| "M1-M5/M7 violation is minor, let it pass" | Passing an M1-M5/M7 violation makes THIS review defective. NEEDS WORK + cite mandate ID + section/line. |
| "No tech words in it — M7 passes" | M1 ≠ M7. Apply the demo test to the BODY: what would a stakeholder SEE change? No answer → FAIL, however clean the prose. |
| "This sync/consumer case is business-critical, so it stays" | If it's business-critical it's demoable — rewrite it demoably. A case that CANNOT be rewritten demoably is exactly what M7 moves out. |
| "Source name in prose, flag it" | Check the selected profile's declared carrier first — the strict default uses `[Source:]`/`**Evidence**`/`CoveredBy`/legacy `IntegrationTest`/frontmatter/Mermaid. |
| "Fix the finding, then I'm done" | Validate findings (`$why-review`) BEFORE fixing, then restart the FULL review until the current exit bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred). |
| "Skip evidence for review judgments" | Cite section+line for every finding; confidence >80% to act, <60% DO NOT recommend. |

**IMPORTANT MUST ATTENTION** SKEPTIC stance — clear the Anti-Bias Gate (adversarial techniques) before any verdict.
**IMPORTANT MUST ATTENTION** M6 enforcement — NEEDS WORK on any **M1-M5 or M7** violation, cite mandate ID + section/line; carriers exempt.
**IMPORTANT MUST ATTENTION** M7 — apply the demo test to each case's BODY, not its prose; an invocation-shaped `When` or a schema/type/call-count `Then` is TECHNICAL-ONLY and FAILS even when perfectly tech-free.
**IMPORTANT MUST ATTENTION** validate findings before fixing, then restart the FULL fresh review until the current exit bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred).

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
