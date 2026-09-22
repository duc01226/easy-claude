# SYNC Inline Versions — Checklist Format (5-15 lines each)

> This file contains the canonical checklist versions of shared protocols.
> These are what gets copied into `<!-- SYNC:tag -->` blocks across all skills.
> To update: edit here first, then `grep SYNC:tag-name` and update all copies.
>
> **Tier contract.** `## SYNC:<tag>` = the CONDENSED checklist embedded as `<!-- SYNC:tag -->` in skill `SKILL.md` files. `## SYNC:<tag>:full` = the FULL variant and the **single build source** for the always-on static-context bakes (root `CLAUDE.md`, `AGENTS.md`, Codex) — read via `.claude/scripts/lib/extract-sync-block.cjs` and composed by `.claude/scripts/lib/hookless-prompt-protocol.cjs`. A `:full` body is PLAIN markdown so every static carrier can render it consistently. Edit BOTH tiers HERE first, then propagate.

---

## SYNC:understand-code-first

> **Understand Existing Code First** — For code changes, read and trace the target before planning or editing; do not apply a code workflow to work with no code surface.
>
> 1. Search for relevant existing implementations and cite `file:line`; aim for 3+ comparable examples when they exist, and record when the project has fewer or none.
> 2. Read the target area and its configured project references; identify actual structure, owners, and conventions without assuming a framework, layer model, or base class.
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists and the task concerns code relationships.
> 4. Map affected dependencies and callers with available repository tools; do not block on an absent graph or unsupported tool.
> 5. Write investigation to `tmp/analysis/` for non-trivial tasks (3+ files).
> 6. Re-read the analysis before implementing; update it when evidence changes.
> 7. Follow a fitting local pattern, or state why no suitable pattern exists and justify a project-appropriate choice.
>
> **BLOCKED until:** target and relevant existing patterns are inspected, applicable dependencies are traced, and material assumptions have evidence. If an item does not apply or the repository has no comparable implementation, record that fact rather than fabricating a gate result.

---

## SYNC:understand-code-first:reminder

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code/conventions BEFORE any modification or explanation. Run graph trace when graph.db exists.

---

## SYNC:evidence-based-reasoning

> **Evidence-Based Reasoning** — Do not present inference as fact; ground material claims in evidence appropriate to the task.
>
> 1. Cite `file:line` for repository claims, configuration or reference paths for project rules, and URLs or artifact locations for external or observed claims.
> 2. State confidence when a conclusion is uncertain; verify material assumptions before acting and withhold recommendations when evidence is insufficient.
> 3. Trace the consumers, boundaries, or dependencies that exist in the affected path; do not assume services, modules, or architectural styles that the project does not use.
> 4. "I don't have enough evidence" is valid and expected output.
>
> **BLOCKED until:** material claims have traceable evidence, relevant searches are complete, and uncertainties are stated. Search comparable patterns when the task has existing implementations; record when none are available.
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

---

## SYNC:evidence-based-reasoning:reminder

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

---

## SYNC:estimation-framework

> **Estimation Framework** — Bottom-up first; SP DERIVED; output min-max range when likely ≥3d. Stack-agnostic. Baseline: 3-5yr dev, 6 productive hrs/day. AI estimate assumes Claude Code + project context.
>
> **Method:**
>
> 1. **Blast Radius pass** (below) — drives code AND test cost
> 2. Decompose phases → hours/phase → `bottom_up_hours = Σ phase_hours`
> 3. `likely_days = ceil(bottom_up_hours / 6) × productivity_factor`
> 4. Sum **Risk Margin** (base + add-ons) → `max_days = likely_days × (1 + margin)`
> 5. `min_days = likely_days × 0.9`
> 6. Output as range when `likely_days ≥3`; single point allowed `<3` (still record margin)
> 7. `man_days_ai` = same range × AI speedup
> 8. `story_points` DERIVED from `likely_days` via SP-Days — NEVER driver. Disagreement >50% → trust bottom-up
>
> **Productivity factor:** 0.8 strong scaffolding+codegen+AI hooks · 1.0 mature default · 1.2 weak patterns · 1.5 greenfield
>
> **Cost Driver Heuristic (apply BEFORE work-type row):**
>
> - **UI dominates** in CRUD/business apps — 1.5-3x backend (states, validation, responsive, a11y, polish)
> - **Backend dominates ONLY:** multi-aggregate invariants, cross-service contracts, schema migrations, heavy query/perf, new event flows
>
> **Reuse-vs-Create axis (PRIMARY lever, per layer):**
>
> | UI tier                                      | Cost     |
> | -------------------------------------------- | -------- |
> | Reuse component on existing screen           | 0.1-0.3d |
> | Add control/column to existing screen        | 0.3-0.8d |
> | Compose components into NEW screen           | 1-2d     |
> | NEW screen, custom layout/states/validation  | 2-4d     |
> | NEW shared/common component (themed, tested) | 3-6d+    |
>
> | Backend tier                                         | Cost      |
> | ---------------------------------------------------- | --------- |
> | Reuse query/handler from new place                   | 0.1-0.3d  |
> | Small update existing handler/entity                 | 0.3-0.8d  |
> | NEW query on existing repo/model                     | 0.5-1d    |
> | NEW command/handler on existing aggregate (additive) | 1-2d      |
> | NEW aggregate/entity (repo, validation, events)      | 2-4d      |
> | NEW cross-service contract OR schema migration       | 2-4d each |
> | Multi-aggregate invariant / heavy domain rule        | 3-5d      |
>
> **Rule:** Sum tiers across UI+backend+tests, apply productivity factor. Reuse short-circuits tiers — call out.
>
> **Test-Scope drivers (compute test_count EXPLICITLY — "+tests" hand-wave is #1 failure):**
>
> | Driver                            | Count                                                  |
> | --------------------------------- | ------------------------------------------------------ |
> | Happy-path journeys               | 1 per story / AC main flow                             |
> | State-machine transitions         | reachable transitions × allowed actors                 |
> | Multi-entity state combos         | state(A) × state(B) — REACHABLE only, not Cartesian    |
> | Authorization matrix              | (owner, non-owner, elevated, unauth) × each mutation   |
> | Validation rules                  | 1 per required field / boundary / format / cross-field |
> | UI states (per new screen/dialog) | happy, loading, empty, error, partial — present only   |
> | Negative paths / invariants       | 1 per violatable business rule                         |
>
> | Test tier (Trad, incl. setup+assert+flake) | Cost     |
> | ------------------------------------------ | -------- |
> | 1-5 cases, fixtures reused                 | 0.3-0.5d |
> | 6-12 cases, 1 new fixture                  | 0.5-1d   |
> | 13-25 cases, multi-entity setup            | 1-2d     |
> | 26-50 cases OR new state-machine coverage  | 2-3d     |
> | >50 cases OR full E2E journey              | 3-5d     |
>
> **Test multipliers:** new fixture/seed harness +0.5d · cross-service/bus assertion +0.3d each · UI E2E ×1.5 · each new role +1-2 cases
>
> **Blast Radius (mandatory pre-pass — affects code AND test):**
>
> 1. Files/components directly modified — count
> 2. Of those, "complex" (>500 LOC, multi-handler, central, frequently-modified) — count
> 3. Downstream consumers (callers, event subscribers, cross-service) — list
> 4. Shared/common code touched (multi-app blast) — yes/no
> 5. Regression scope — areas needing re-test
>
> **Rule:** Complex touch → add `risk_factors`. Each downstream consumer → +1-3 regression cases. Blast >5 areas OR >2 complex → re-evaluate SPLIT before estimating.
>
> **Risk Margin (drives max bound):**
>
> | likely_days         | Base margin                     |
> | ------------------- | ------------------------------- |
> | <1d trivial         | +10%                            |
> | 1-2d small additive | +20%                            |
> | 3-4d real feature   | +35%                            |
> | 5-7d large          | +50%                            |
> | 8-10d very large    | +75%                            |
> | >10d                | +100% AND **flag SHOULD SPLIT** |
>
> **Risk-factor add-ons (additive — enumerate in `risk_factors`):**
>
> | Factor                                                                | +margin |
> | --------------------------------------------------------------------- | ------- |
> | `touches-complex-existing-feature` (>500 LOC, multi-handler, central) | +20%    |
> | `cross-service-contract` change                                       | +25%    |
> | `schema-migration-on-populated-data`                                  | +25%    |
> | `new-tech-or-unfamiliar-pattern`                                      | +30%    |
> | `regression-fan-out` (≥3 downstream areas re-test)                    | +20%    |
> | `performance-or-latency-critical`                                     | +20%    |
> | `concurrency-race-event-ordering`                                     | +25%    |
> | `shared-common-code` (multi-consumer/multi-app)                       | +25%    |
> | `unclear-requirements-or-design`                                      | +30%    |
>
> **Collapse rule:** total margin >100% → STOP, split (padding past 2x is dishonesty). Margin <15% on `likely_days ≥5` → under-estimated, widen.
>
> **Work-Type Caps (hard ceilings on `likely_days`):**
> | Work type | Max SP | Max likely |
> | --- | --- | --- |
> | Single field / config flag / style fix | 1 | 0.5d |
> | Add property to existing model + bind to existing UI | 2 | 1d |
> | **Additive endpoint + minor UI control** (button/menu/column), reuses fixtures | **3** | **2-3d** |
> | Additive endpoint + **NEW UI surface** OR additive multi-layer + new domain rule + 2+ test files | 5 | 3-5d |
> | NEW model/aggregate OR migration OR cross-module contract OR heavy test (>1.5d) OR NEW UI + non-trivial backend | 8 | 5-7d |
> | NEW UI surface + (NEW aggregate OR migration OR cross-service contract) | 13 | SHOULD split |
> | Cross-service contract + migration combined | 13 | SHOULD split |
> | Beyond | 21 | MUST split |
>
> **SP→Days (validation only):** 1=0.5d/0.25d · 2=1d/0.35d · 3=2d/0.65d · 5=4d/1.0d · 8=6d/1.5d · 13=10d/2.0d (Trad/AI likely)
> **AI speedup:** SP 1≈2x · 2-3≈3x · 5-8≈4x · 13+≈5x. AI cost = `(code_gen × 1.3) + (test_gen × 1.3)` (30% review overhead).
>
> **MANDATORY frontmatter:**
>
> ```yaml
> story_points: <n>
> complexity: low | medium | high | critical
> man_days_traditional: '<min>-<max>d' # range when likely ≥3d; '<N>d' when <3d
> man_days_ai: '<min>-<max>d'
> risk_margin_pct: <n> # base + add-ons
> risk_factors: [touches-complex-existing-feature, regression-fan-out] # closed-list from add-ons; [] if none
> blast_radius:
>     touched_areas: <n>
>     complex_touched: <n>
>     downstream_consumers: [list or count]
>     shared_common_code: yes | no
> estimate_scope_included: [code, integration-tests, frontend, i18n, docs]
> estimate_scope_excluded: [unit-tests, e2e, perf, deployment, code-review-rounds]
> estimate_reasoning: |
>     5-7 lines covering:
>     (a) UI tier — row applied
>     (b) Backend tier — row applied
>     (c) Test scope — case breakdown by driver, file count, fixtures, tier row
>     (d) Cost driver — dominant tier + why
>     (e) Blast radius — touched, complex, regression scope
>     (f) Risk factors — list driving margin; why not larger/smaller
>     Example: "UI: compose Form/Table/Dialog → NEW screen (~1.5d). Backend: NEW command on existing aggregate,
>     reuses validation+repo (~1d). Tests: 4 transitions × 2 actors + 3 validation + 2 UI states = 13 cases,
>     1 new fixture → tier 13-25 ~1.5d. Driver: UI composition + new states. Blast: 4 areas, 1 complex.
>     Risk: base 35% + touches-complex +20% = 55% → max 3.9d → range 2.5-4d."
> ```
>
> **Sanity self-check:**
>
> - `likely_days ≥3d` and single-point? → reject, must be range
> - Margin <15% on `likely_days ≥5d`? → under-estimated, widen
> - Margin >100%? → STOP, split instead of buffer
> - Complex existing feature touched, no regression budget in `(c)`? → reject
> - Blast `>5` areas OR `>2` complex, no split discussion? → reject
> - Purely additive on existing model AND existing UI? → cap SP 3 unless tests >1.5d
> - NEW UI surface (page/complex form/dashboard)? → SP 5+ even if backend one endpoint
> - Backend cross-service / migration / multi-aggregate? → SP 8+ regardless of UI
> - `bottom_up_hours / 6` vs SP-Days disagreement >50%? → trust bottom-up, downgrade SP
> - Without tests, SP drops ≥1 bucket? → tests dominate; state explicitly
> - Reasoning called out UI vs backend vs blast vs risk factors? → if missing, add

---

## SYNC:ui-system-context

> **UI System Context** — Apply only when the changed artifact is part of a user-interface surface; a `.ts`, `.html`, `.scss`, or `.css` extension alone does not establish that.
>
> 1. Resolve applicable UI paths and conventions from `docs/project-config.json`, its configured project-reference docs, accepted decisions, and existing code. Read only references relevant to this surface (frontend patterns, styling, component system, design system, accessibility, or platform guide).
> 2. Respect an explicit N/A or absent UI surface. Do not require BEM, SCSS, tokens, component tiers, base classes, stores, API wrappers, or teardown helpers unless this project documents or demonstrates them.
> 3. Follow the configured/observed styling and component conventions. Use `componentSystem.layerClassification` when configured; otherwise describe the actual component owners without inventing Common/Domain-Shared/Page tiers.
> 4. Reuse or compose an existing abstraction when its contract and platform fit. When none fits, use the project's idiomatic local pattern; do not add a shared base or wrapper just to satisfy this checklist.
>
> Project config may customize these conventions through `contextGroups[].rules`, `workflowPatterns`, `styling`, `componentSystem`, and the configured reference docs.

---

## SYNC:existing-ui-research

> **[BLOCKING] Understand the existing UI before you design or spec a new/updated screen.** Before producing any wireframe, mockup, screen design, or UI spec:
>
> 1. **Inventory existing related UI** — search the project for screens, pages, and components already serving this feature or its domain (consult configured design-system docs + the real component inventory).
>    Use the project's documented component tiers and base abstractions when present; otherwise record the actual component roles and owners without inventing a tier model.
> 2. **Map connected flows** — identify every feature that links to, embeds, includes, or navigates to/from the new screen; trace its entry and exit flows so the new screen fits them.
> 3. **Reuse before invent** — prefer composing an existing component when its contract fits; justify any new component or variant against the inventory and record the constraint that prevents reuse.
>    Avoid duplicated behavior where a suitable project abstraction exists; do not create a base, tier, selector convention, or shared component solely to match this checklist.
> 4. **Record findings** — note the matched existing screens/components + connected flows in the artifact so downstream design faithfully matches the current UI system.
>
> **Skip ONLY** when the feature is backend-only (no UI) — state that explicitly.

---

## SYNC:ui-ux-design-principles

> **UI/UX Design Principles (Rev 1.0 — 40 clauses, web + mobile examples)** — a reference catalog, not a universal platform contract. Apply it only to an applicable user-facing interface. Resolve the target platform, input modes, accessibility standard, and relevant design conventions from the brief, project config/reference docs, accepted decisions, and existing UI. For web, use WCAG 2.2 AA as the baseline and meet any stricter applicable legal or project requirement; for non-web surfaces, use the documented platform accessibility standard. Record the selected standard and source.
>
> Numeric values and patterns below are examples or heuristics for matching surfaces, not required thresholds. Use a value as a fail-condition only when an applicable law, platform standard, project contract, or accepted design decision establishes it. For desktop, game, embedded, command-line, or other interfaces, use their documented platform conventions and accessibility requirements; do not report a mismatch with a web/mobile example as a defect. Skip clauses whose underlying capability is absent and record N/A when needed. Cite applicable clauses by ID (for example `UI-3.1` or `UI-8.2`).
>
> **Precedence:** accepted product/design decisions → project config and design-system / styling / frontend / platform references → applicable clauses below → general heuristics. A genuine conflict between authoritative project sources is SURFACED with both sides — NEVER resolved silently. An absent project convention is not permission to invent one.
>
> **1.0 Visual Hierarchy & Layout**
>
> - `UI-1.1` One focal point per screen. Two elements competing for first read → demote one.
> - `UI-1.2` Signal order: size → weight → colour → position. Use the cheapest signal that works before adding another.
> - `UI-1.3` Group by proximity, NEVER by border. Whitespace separates cleanly; boxes inside boxes do not.
> - `UI-1.4` Align to a shared edge. Every unexplained indent reads as an accident.
> - `UI-1.5` Design the empty, loading and error state FIRST. The full state is the easy one.
>
> **2.0 Typography**
>
> - `UI-2.1` Keep type families and weights purposeful; follow the project's type system when present. Two families and three weights are one possible web starting point, not a limit.
> - `UI-2.2` Meet the readable-text sizes required by the applicable platform and project. Common web/mobile values such as 16px are examples; do not use them as universal minimums.
> - `UI-2.3` Keep text measures readable for the content and target surface. A 45–75 character line is an editorial heuristic, not a pass threshold.
> - `UI-2.4` Choose line spacing that supports the font, size, script, and reading context; ratios such as 1.5 for body text are starting points.
> - `UI-2.5` Use the project's type scale where defined. Otherwise keep sizes purposeful and consistent without requiring a fixed number of named steps.
>
> **3.0 Colour & Contrast**
>
> - `UI-3.1` Meet the contrast ratios required by the selected accessibility standard; for web, use WCAG 2.2 AA unless a stricter applicable legal or project requirement applies. Measure where possible. Ratios such as 4.5:1 for text and 3:1 for interface parts are standard-specific examples, not universal values.
> - `UI-3.2` One accent, one job. An accent that is everywhere points at nothing.
> - `UI-3.3` Colour NEVER carries meaning alone — pair it with an icon, label or position.
> - `UI-3.4` Dark mode is NOT inverted light mode. Lift surfaces to signal elevation; soften pure-white text.
>
> **4.0 Spacing & Grid**
>
> - `UI-4.1` Follow the project's spacing tokens or grid when defined. A 4px or 8px base is one common option, not a framework requirement.
> - `UI-4.2` Space belongs to the container, not the child. Use `gap`; reserve margins for exceptions.
> - `UI-4.3` Use spacing to make grouping and hierarchy clear; the right relationship depends on the content and layout.
> - `UI-4.4` Breakpoints follow content, not devices. Break where the layout stops working.
>
> **5.0 Interaction & Feedback**
>
> - `UI-5.1` Give immediate, perceivable feedback; use a timing target only when the product contract or applicable platform guidance defines one.
> - `UI-5.2` Specify the interaction states supported by the target platform and input modes (for example default, focus, active, disabled, or loading); hover is not universal.
> - `UI-5.3` Prefer undo over confirmation. Confirm ONLY what cannot be reversed.
> - `UI-5.4` Use motion when it clarifies cause and effect; follow project/platform timing and easing, and honor reduced-motion preferences when supported. Durations around 150–250ms are examples, not a rule.
> - `UI-5.5` Preserve a perceivable focus indicator wherever the interface supports focus navigation; follow the platform and applicable accessibility standard.
>
> **6.0 Navigation & IA**
>
> - `UI-6.1` Every screen answers: where am I, what's here, where next.
> - `UI-6.2` Keep primary navigation understandable for the product's information architecture; do not impose a fixed destination count.
> - `UI-6.3` Label by the user's word, not the internal one. Team vocabulary is not a taxonomy.
> - `UI-6.4` Preserve expected return, history, or deep-link behavior where the platform and product provide those concepts.
>
> **7.0 Forms & Input**
>
> - `UI-7.1` Ask for less. Every field needs a reason it exists today.
> - `UI-7.2` Labels stay visible. Placeholders are hints, NEVER labels.
> - `UI-7.3` Validate at a point that supports timely, useful correction without disrupting entry; follow the project's interaction contract. Explain errors and associate them with the affected input where supported.
> - `UI-7.4` Match the input control and available input aids to the data and target platform; use autocomplete or capitalization hints only where supported and appropriate.
> - `UI-7.5` NEVER lose entered data. Preserve input across errors, navigation and refresh.
>
> **8.0 Mobile & Touch** _(mobile/touch surfaces)_
>
> - `UI-8.1` Meet the target-size and spacing requirements of the applicable platform/accessibility standard. The interactive target may exceed the visible icon.
> - `UI-8.2` Place primary actions where they are reachable for the target device, orientation, handedness, and input mode.
> - `UI-8.3` Provide an alternative to gesture-only actions when required by the target platform or accessibility contract.
> - `UI-8.4` Respect safe areas and the keyboard. Notch, home indicator and on-screen keyboard all steal space.
>
> **9.0 Speed & Perceived Speed**
>
> - `UI-9.1` Give feedback appropriate to the work and what is known; skeletons and spinners are options, not required patterns.
> - `UI-9.2` Use optimistic updates only when the operation can be safely reconciled; otherwise show clear pending, success, and failure states.
> - `UI-9.3` Reserve space for anything that loads. Images, ads and fonts must NEVER shift the layout.
> - `UI-9.4` For network-dependent surfaces, define useful timeout, retry, and offline behavior according to the product's availability needs.
>
> **Apply by role** — the clauses are one set; what you DO with them depends on the task:
>
> | Role                                | Obligation                                                                                                                                                              |
> | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | DESIGN / PLAN a surface             | Select applicable clauses for the target platform; document required states, tokens, input, and constraints from the project contract. |
> | IMPLEMENT a component               | Verify the configured behavior and accessibility requirements; use project tokens and abstractions only when defined. |
> | REVIEW UI code or a design artifact | Treat only applicable, authoritative clauses as fail-conditions; cite `UI-<clause>` + `file:line` + severity. NEVER turn inapplicable defaults into findings. |
> | SCAN / document a UI system         | Record the project's actual platform conventions and deliberate deviations; do not fill gaps with this catalog's examples. |
>
> **Component architecture (code-bearing UI work):** Follow documented tiers and base abstractions when the project has them. Otherwise identify actual reuse boundaries from the code; do not require a three-tier taxonomy, base class, or lower-tier test model. Reuse shared behavior when a demonstrated consumer and suitable project abstraction justify it; test according to the project's test organization.
>
> **Skip ONLY** when the change has no user-facing surface (backend-only, tooling, docs) — state that explicitly so the skip is auditable, not an omission.

---

## SYNC:ui-ux-design-principles:reminder

Apply `UI-1.1`–`UI-9.4` only to applicable user-interface work. Resolve platform and project conventions first. Use WCAG 2.2 AA as the web accessibility baseline plus any stricter applicable legal/project requirement; non-web surfaces use the documented platform standard. Other web/mobile metrics and component tiers are defaults/examples only for matching surfaces. Skip N/A clauses and non-UI work explicitly. Project config, references, and accepted decisions govern; cite applicable findings by `UI-<clause>` + `file:line`.

---

## SYNC:plan-quality

> **Plan Quality** — Every plan phase MUST ATTENTION include test specifications.
>
> 1. Keep a `## Test Specifications` section in every phase; resolve and validate `docs/project-config.json → specArtifacts` before choosing requirement, case, or evidence shape. A malformed or unsupported declaration blocks; it is never treated as absent.
> 2. With a valid native profile, use its configured `sections.intent/contracts/evidence`, canonical owner path, identifier grammar, and test-carrier dialect. Keep owner + case/scenario ID + optional variant identity and the actual executing test; preserve configured many-to-many cardinality.
> 3. Map every functional requirement or invariant to ≥1 native case/executor (or explicit `TBD` with rationale). Cite the assertion that proves the outcome at `file:line`; a case-ID match, grep, or aggregate result without inspecting the assertion path is not proof.
> 4. Only when `specArtifacts` is absent, use the strict default: `TC-{FEATURE}-{NNN}` in the phase Test Specifications section and the legacy business-spec `§3 AC / §4 BR / §5 invariants / §8 TC` shape. TDD-first references existing TCs with `Evidence: TBD`; implement-first keeps `TBD` until the configured spec/test workflow fills it.
> 5. Before any new workflow step: call `TaskList` and re-read the phase file.
> 6. On context compaction: call `TaskList` FIRST — never create duplicate tasks.
> 7. Verify every native case and its assertion, or every strict-default TC, before marking a phase complete; final evidence must be `file:line`, not TBD.
> 8. **Purpose-oriented naming:** For every planned public or cross-layer contract, port, interface, module, or adapter, name the consumer-visible capability or domain purpose; keep provider, framework, and transport names in concrete implementations (`IStorage`/`Storage` → `AzureBlobStorage`). — why: a contract name should survive an implementation swap.
> 9. **Contract-fit gate:** Check the proposed name against its callers and all implementations; use a narrower purpose name when a broad name overpromises (`IObjectStore` or `DocumentStore` instead of `IStorage` when the behavior is narrower). — why: abstraction names must describe the actual contract, not hide a mismatch.
> 10. **No speculative abstraction:** Plan an interface or port only when a real boundary, substitution need, or multiple meaningful implementations justifies it; keep a concrete type when it is the honest contract. — why: an unnecessary abstraction adds indirection and a second name without reducing change cost.
> 11. **Language convention:** Preserve the repository's naming syntax (`I` prefix where the language/project uses it); never force `I` or `Interface` markers across languages. — why: semantic purpose is portable, syntax is not.
> 12. **Foundation obligations — when the plan CREATES or CHANGES how the project is built, run, tested, or checked** (build or CI configuration, test harness, containerization, toolchain/dependency management, module boundaries, quality tooling): run `SYNC:engineering-foundation-gate` — its seven dimensions F1-F7, the four profile axes and the warranting matrix are in `.claude/docs/engineering-foundation-catalog.md`, which the plan reads directly when no carrier of that gate ran upstream — and carry every dimension it marks warranted into the plan as an **explicit phase with acceptance criteria** — never as an assumption that someone handles it later. Record each dimension deliberately skipped, with the reason. — why: a plan that stands up a foundation and silently omits a warranted dimension makes that omission permanent and invisible; foundations cost near nothing at creation and a great deal to retrofit.
>
> **Mode:** TDD-first → reference existing native cases (strict-default TCs only when `specArtifacts` is absent) with `Evidence: TBD`. Implement-first → use TBD until the project's configured spec/test workflow fills it; absent a profile, `/spec [mode=tests]` is the strict-default route. A declared invalid profile blocks instead of selecting this fallback.

---

## SYNC:plan-quality:reminder

**MUST ATTENTION** Resolve `specArtifacts` first: use its identity and carrier only when valid, use strict-default `TC-{FEATURE}-{NNN}` and legacy TestSpec shape only when absent, and block a malformed declaration. Every plan phase maps its cases to an inspected assertion-bearing executor. Before each workflow step and after compaction, call `TaskList` and re-read the phase file; verify `file:line` evidence before completion.

---

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Resolve `specArtifacts` before selecting identity or carrier: use a valid profile, use strict-default TC/test identity only when the profile is absent, and block a malformed or unsupported declaration. Trace every requirement or invariant through decision, task, configured case/test identity and inspected assertion evidence, then carry it through source evidence and canonical docs/spec updates.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Resolve and validate `specArtifacts`: use valid native owner/case/variant identity and assertion-bearing evidence; use strict-default TC/TestSpec only when the profile is absent; block a malformed or unsupported declaration without fallback.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `/project-init` or the narrow setup route automatically.

---

## SYNC:rationalization-prevention

> **Rationalization Prevention** — AI skips steps via these evasions. Recognize and reject:
>
> | Evasion                      | Rebuttal                                                      |
> | ---------------------------- | ------------------------------------------------------------- |
> | "Too simple for a plan"      | Simple + wrong assumptions = wasted time. Plan anyway.        |
> | "I'll test after"            | RED before GREEN. Write/verify test first.                    |
> | "Already searched"           | Show grep evidence with `file:line`. No proof = no search.    |
> | "Just do it"                 | Still need TaskCreate. Skip depth, never skip tracking.       |
> | "Just a small fix"           | Small fix in wrong location cascades. Verify file:line first. |
> | "Code is self-explanatory"   | Future readers need evidence trail. Document anyway.          |
> | "Combine steps to save time" | Combined steps dilute focus. Each step has distinct purpose.  |

---

## SYNC:output-quality-principles

> **Output Quality** — Token efficiency without sacrificing quality.
>
> 1. No inventories/counts — AI can `grep | wc -l`. Counts go stale instantly
> 2. No directory trees — AI can `glob`/`ls`. Use 1-line path conventions
> 3. No TOCs — AI reads linearly. TOC wastes tokens
> 4. No examples that repeat what rules say — one example only if non-obvious
> 5. Lead with answer, not reasoning. Skip filler words and preamble
> 6. Sacrifice grammar for concision in reports
> 7. Unresolved questions at end, if any

---

## SYNC:graph-assisted-investigation

> **Graph-Assisted Investigation** — MANDATORY when `.code-graph/graph.db` exists.
>
> **HARD-GATE:** MUST ATTENTION run at least ONE graph command on key files before concluding any investigation.
>
> **Pattern:** Grep finds files → `trace --direction both` reveals full system flow → Grep verifies details
>
> | Task                | Minimum Graph Action                         |
> | ------------------- | -------------------------------------------- |
> | Investigation | `trace --direction both` on 2-3 entry files  |
> | Fix/Debug           | `callers_of` on buggy function + `tests_for` |
> | Feature/Enhancement | `connections` on files to be modified        |
> | Code Review         | `tests_for` on changed functions             |
> | Blast Radius        | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Use `--node-mode file` first (10-30x less noise), then `--node-mode function` for detail.

---

## SYNC:graph-assisted-investigation:reminder

**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files before concluding when graph.db exists. Pattern: grep → graph trace → grep verify.

---

## SYNC:cross-service-check

> **Cross-Service Check** — Microservices/event-driven: MANDATORY before concluding investigation, plan, spec, or feature doc. Missing downstream consumer = silent regression.
>
> | Boundary            | Grep terms                                                                      |
> | ------------------- | ------------------------------------------------------------------------------- |
> | Event producers     | `Publish`, `Dispatch`, `Send`, `emit`, `EventBus`, `outbox`, `IntegrationEvent` |
> | Event consumers     | `Consumer`, `EventHandler`, `Subscribe`, `@EventListener`, `inbox`              |
> | Sagas/orchestration | `Saga`, `ProcessManager`, `Choreography`, `Workflow`, `Orchestrator`            |
> | Sync service calls  | HTTP/gRPC calls to/from other services                                          |
> | Shared contracts    | OpenAPI spec, proto, shared DTO — flag breaking changes                         |
> | Data ownership      | Other service reads/writes same table/collection → Shared-DB anti-pattern       |
>
> **Per touchpoint:** owner service · message name · consumers · risk (NONE / ADDITIVE / BREAKING).
>
> **BLOCKED until:** Producers scanned · Consumers scanned · Sagas checked · Contracts reviewed · Breaking-change risk flagged

---

## SYNC:cross-service-check:reminder

**IMPORTANT MUST ATTENTION** microservices/event-driven: scan producers, consumers, sagas, contracts in task scope. Per touchpoint: owner · message · consumers · risk (NONE/ADDITIVE/BREAKING). Missing consumer = silent regression.

---

## SYNC:cross-stack-impact-trace

> **Cross-Stack Impact Trace** — FIRST review action: comprehend change holistically, THEN judge files. Every reviewed diff: note change context, trace full pipeline of main affected area end-to-end across client↔server seam, so a change on one tier can never silently break the other. (Distinct from `SYNC:cross-service-check`, which owns service-to-service / event boundary — this owns client↔server tier seam inside one app; pair both for full-pipeline coverage.)
>
> 1. **Comprehend context FIRST** — before file-by-file review, write short **Change Context** note: what changed, intent (why), originating tier (frontend / backend / shared / infra), main affected feature/flow. Do before flagging anything.
> 2. **Identify cross-stack seam(s)** — for main affected area, locate contract seam(s) between client and server: API route/endpoint + verb, request/response DTO or payload shape, shared type/schema, event/message contract, query/route params. Infer tier layout from `docs/project-config.json` and project conventions.
> 3. **Trace full pipeline end-to-end, in change's direction:**
>     - **Backend change → trace FORWARD to every frontend consumer:** handler/controller → response DTO/serializer → API client/service → store/state → component/template rendering or submitting it.
>     - **Frontend change → trace BACKWARD to backend contract:** component/form → API client call → route/endpoint → request DTO/validation → handler/domain.
>     - When `.code-graph/graph.db` exists, use `/graph-connect-api` and `python .claude/scripts/code_graph trace <file> --direction both --json` to map connection; otherwise grep route path, DTO/type name, each field name across BOTH tiers.
> 4. **Verify BOTH sides still agree** — for every changed seam confirm other tier matches: route path & verb, field names & types, nullability/optionality, required vs optional params, enum values, auth/permission, error/status shape. Any mismatch = **BREAKING** finding (backend change breaks a frontend consumer, or frontend now sends what backend rejects).
> 5. **Classify each seam:** NONE (no contract change) / ADDITIVE (backward-compatible) / BREAKING (consumer on other tier must change too). BREAKING seam whose other-tier consumer NOT updated in same diff = HIGH severity minimum (CRITICAL for auth/money/data-integrity paths).
>
> **Skip ONLY** when change has no cross-tier seam — pure docs, pure styling with no data contract, or single-tier tooling. State explicitly: `Single-tier change — no cross-stack seam`. Backend-only or single-tier repo still traces internal consumers (`SYNC:cross-service-check` for service/event boundaries).
>
> **BLOCKED until:** Change Context noted · seam(s) identified or explicit N/A · full pipeline traced in change direction · every changed seam classified NONE / ADDITIVE / BREAKING.

---

## SYNC:cross-stack-impact-trace:reminder

**MUST ATTENTION** FIRST review action — note change context + holistically trace full pipeline of main affected area across client↔server seam (BE→FE forward, FE→BE backward). Verify both tiers still agree on route/DTO/field/type/nullability/auth; any mismatch = BREAKING finding. Skip only for single-tier / docs-only changes (state so).

---

## SYNC:root-cause-debugging

> **Root Cause Debugging** — Systematic approach, never guess-and-check.
>
> 1. **Reproduce** — Confirm the issue exists with evidence (error message, stack trace, screenshot)
> 2. **Rule the environment in or out** — Sweep environment preconditions (versions, dependency/install state, config & env vars, service dependencies, ports/network/clock, permissions, leftover state) AND resource/transience suspects (RAM/OOM, CPU saturation, disk/inode/temp, handle & pool limits, timeouts that are really slowness) BEFORE deep code tracing. The environment is a competing hypothesis, not a fallback — see `SYNC:environment-fault-hypothesis`.
> 3. **Isolate** — Narrow to specific file/function/line using binary search + graph trace
> 4. **Trace** — Follow data flow from input to failure point. Read actual code, don't infer.
> 5. **Hypothesize** — Form theory with confidence %. State what evidence supports/contradicts it. Keep the environment hypothesis in the matrix until evidence rules it out.
> 6. **Verify** — Test hypothesis with targeted grep/read. One variable at a time.
> 7. **Fix** — Address root cause, not symptoms. Verify fix doesn't break callers via graph `connections`. An environment cause is fixed in the environment or setup — never by editing product code or tests to absorb it.
>
> **NEVER:** Guess without evidence. Fix symptoms instead of cause. Skip reproduction step. Assume a failure is a code defect before the environment is ruled out.

---

## SYNC:end-to-start-debugger-trace

> **End-to-Start Debugger Trace** — For non-trivial bugs, failed verification, regression fixes, behavior-changing code, or unclear code flow, start from the observed final state and walk backward before proposing a fix.
>
> 1. **Frame 0: observed end state** — Name the exact user-visible output, failing assertion, log line, persisted value, API response, rendered UI, or aggregate bucket. Record the reader/query/renderer that produced it with `file:line` evidence.
> 2. **Walk backward one hop at a time** — Trace final reader -> projection/cache/storage -> writer -> consumer/handler/job -> producer/caller -> original trigger. At every hop record: input, transformation, output, owner, and evidence.
> 3. **Enumerate all feeder paths** — Find every upstream producer/caller/event/job that can write into the final path, including retry, async, cache, background, and alternate UI/API paths. Mark each path verified, ruled out, or still unknown.
> 4. **Build the hypothesis matrix** — For each plausible cause, list evidence for, evidence against, how to reproduce/verify, blast radius, and status (`primary`, `contributing`, `ruled out`, `latent`). Do not fix until competing causes are explicitly resolved or bounded.
> 5. **Choose the owning fix layer** — Identify the invariant owner and select the authoritative correction and enforcement points from traced contracts and the project's architecture. Keep validation at untrusted boundaries. Choose a shared point only when evidence shows it owns the invariant for those consumers. A fix at the symptom site is rejected unless the symptom site owns the invariant.
> 6. **Prove convergence forward** — After choosing the fix, walk start -> end again and show how the corrected state reaches the observed final output. Map each root cause to a fix part and each fix part to a test/proof.
>
> **BLOCKED until:** final state named · backward trace written · all feeder paths enumerated · hypothesis matrix completed · owning fix layer justified · forward convergence proof mapped to tests.
>
> **NEVER:** Start at the first suspicious code path. Collapse multiple producers into one "flow". Treat duplicate symptoms as duplicate records without proving the read model. Skip ruled-out hypotheses.

---

## SYNC:end-to-start-debugger-trace:reminder

**IMPORTANT MUST ATTENTION** debugger trace gate: for non-trivial bug/fix/investigation/review work, start at the observed final output and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/trigger. Enumerate all feeder paths and hypotheses before fixing; select the authoritative invariant owner from project architecture and retain validation at untrusted boundaries. **BLOCKED until** trace, hypothesis matrix, owning fix layer, and forward convergence proof exist.

---

<!-- Carriers are hand-picked (failure-judgement hosts only) and declared in `.claude/scripts/inject_environment_fault_hypothesis.py`. On any edit here, re-run that injector to re-propagate this block AND its `:reminder`. Companion blocks that reference it: `SYNC:root-cause-debugging` (step 2) and `SYNC:test-failure-fault-adjudication` (ENVIRONMENT-BLOCKED verdict) — keep the three consistent. -->

## SYNC:environment-fault-hypothesis

> **Environment-Fault Hypothesis** — A bug report, failing test, error, crash, or unexpected output is NOT proof of a code defect. The ENVIRONMENT is a first-class competing hypothesis in every debug / investigation / adjudication — weighed from the start, never a fallback reached only after the code looks fine.
>
> 1. **Sweep environment preconditions BEFORE deep tracing** — it is cheap and it reframes everything downstream: toolchain/runtime/SDK version · dependency install state (lockfile drift, partial restore, stale build/cache/generated artifacts) · env vars, secrets, config or profile selection · service dependencies actually up, migrated and seeded (DB, broker, cache, container/compose, external API) · ports, network, proxy, DNS, TLS/cert, system clock · OS/platform, path separators, line endings, locale/timezone · permissions and file locks · leftover state from a prior run (stale processes, containers, volumes, held ports, test data, dirty working tree).
> 2. **Name resource pressure and transience as explicit suspects** — RAM/OOM and swap pressure · CPU saturation or throttling (parallel test workers, noisy neighbour, small CI runner) · disk, inode or temp-dir exhaustion · file-handle and connection-pool limits · network flakiness and rate limits · a timeout that is really slowness. **Tell-tale shape:** non-deterministic · timing-dependent · passes alone but fails in parallel · fails only on one machine or only on CI · the error names resources, not business rules.
> 3. **Discriminate — then cite the discriminator.** Does it reproduce deterministically on a clean environment? Did code on the failing path change since it last passed (`git log` / `git diff` that path)? Does it fail for every machine/actor or exactly one? Does concurrency 1, a clean rebuild, or a fresh container change the result? A verdict without a discriminator you actually ran is a guess — for the environment AND for the code.
> 4. **Report an environment cause AS an environment cause.** Preserve diagnostics (exact command, exit code, full output, resource evidence, timestamps), name the setup/cleanup/provisioning remedy and its owner, and STOP mutating source or tests. NEVER edit product code, weaken an assertion, relax a timeout, or skip a test to absorb an environment fault — that hides the real defect and permanently rots the test.
> 5. **Flaky is a symptom, not a verdict.** A failure that vanishes on retry stays UNEXPLAINED until its mechanism is named. Record it with its evidence; fix the environment or the test seam. Retry-until-green is not a resolution.
>
> **BLOCKED until:** `- [ ]` Precondition sweep done `- [ ]` Resource/transience suspects considered `- [ ]` Discriminator run and cited `- [ ]` Verdict names CODE or ENVIRONMENT with evidence
>
> **NEVER:** Treat "the test failed" as "the code is wrong". Conclude "just flaky" without a mechanism. Absorb an environment fault into source or tests. Chase a code hypothesis while an unchecked environment precondition is still in play.

---

## SYNC:environment-fault-hypothesis:reminder

**MUST ATTENTION** environment-fault gate: a bug, failed test, error, or odd output is NOT proof of a code defect. Sweep environment preconditions (versions, deps/install state, config & env vars, services, ports/network/clock, permissions, leftover state) and resource/transience suspects (RAM, CPU, disk, handles, network, timeouts) as a competing hypothesis, cite the discriminator you ran, and fix an environment cause in the environment — never by editing code or weakening a test. "Flaky" is a symptom, not a verdict.

---

## SYNC:scan-and-update-reference-doc

> **Scan & Update Reference Doc** — Surgical updates only, never full rewrite.
>
> 1. **Read existing doc** first — understand current structure and manual annotations
> 2. **Detect mode:** Placeholder (only headings, no content) → Init mode. Has content → Sync mode.
> 3. **Scan codebase** for current state (grep/glob for patterns, counts, file paths)
> 4. **Diff** findings vs doc content — identify stale sections only
> 5. **Update ONLY** sections where code diverged from doc. Preserve manual annotations.
> 6. **Update metadata** (date, counts, version) in frontmatter or header — but ONLY as part of a write that also changes content
> 7. **NEVER** rewrite entire doc. NEVER remove sections without evidence they're obsolete.
> 8. **NEVER write a no-op.** When the candidate differs from the doc on disk only by a date stamp or whitespace, write NOTHING — not the stamp either. Check with `node .claude/hooks/lib/doc-stamp-guard.cjs --check <doc> --candidate <file>` (exit 3 = no-op) and record the pass with `--record-verified <doc filename>`. — why: a date-only rewrite is an unmergeable line that makes two branches conflict over a value neither of them decided.

---

## SYNC:red-flag-stop-conditions

> **Red Flag Stop Conditions** — STOP and escalate to user via AskUserQuestion when:
>
> 1. Confidence drops below 60% on any critical decision
> 2. Changes would affect >20 files (blast radius too large)
> 3. Cross-service boundary is being crossed
> 4. Security-sensitive code (auth, crypto, PII handling)
> 5. Breaking change detected (interface, API contract, DB schema)
> 6. Test coverage would decrease after changes
> 7. Approach requires technology/pattern not in the project
>
> **NEVER proceed past a red flag without explicit user approval.**

---

## SYNC:double-round-trip-review

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle or an explicitly declared independent-pass minimum, not by a round number alone. Review purpose: `review → validate findings → fix validated findings that block the current round → full re-review` until a complete review pass clears the round's exit bar (see **Severity floor** below). **A clean review ENDS the loop once the persisted `minRounds` is met (default 1); an explicitly declared minimum such as 2 still requires that independent pass.**
>
> _aka **Self-Review Convergence Loop**._ The name is historical — "double-round-trip" means a validated-finding fix cycle forces at least one fresh re-review. It runs until the current round's exit bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred), bounded by the **2-round ceiling — extendable ONCE to round 3 when CRITICAL/HIGH remain** — defined below. A failing **test gate** (a suite that must actually pass) is outside that ceiling: the loop keeps fixing and re-running until the tests pass.
>
> **Round cap — 2 rounds MAX, extendable ONCE to round 3 (a ceiling, NEVER a target).** A clean pass ENDS the loop at ANY round once `round >= minRounds` — round 1 included with the default minimum; the cap never obliges an extra round. What happens when round 2 completes with blocking findings still open (severity floor applied) depends on WHAT is still open:
>
> - **Validated CRITICAL or HIGH still open → ONE extra round is granted (round 3, the review hard cap).** A failed non-test binary gate (security must-fix, required artifact, generated parity, policy compliance) counts as a CRITICAL blocker here. The extension is earned by that evidence alone, is never a default, is granted at most once per run, and never renews. Record the granting findings in the run record and report.
> - **Only MEDIUM (or an unresolved `NOT VERIFIABLE`) still open → NO extension.** → **STOP and escalate via `AskUserQuestion`** with the still-open findings listed.
> - **Round 3 completes with ANY review blocker still open → STOP and escalate via `AskUserQuestion`.** Round 3 is the review hard cap; no review finding or non-test gate opens a round 4.
> - **A failing TEST gate → NO round cap, at any round.** Failing tests never escalate for budget or no-progress and never buy or spend the extension: run the failed-test investigation gate, fix at the owning layer, and re-run until the tests pass — past round 3 if needed. NEVER weaken an assertion, add a skip, or relax a timeout to force green. Review blockers open beside failing tests still follow the bullets above.
>
> NEVER emit a silent "good enough" PASS on cap exhaustion, NEVER let the cap substitute for the clean-review requirement, and NEVER loop past round 3 on review blockers — only failing test gates continue beyond it. The 2-repeated-no-progress blocker rule stays an EARLIER exit — escalate at whichever trips first.
>
> **Severity floor — from round 2, LOW stops blocking.** The exit bar tightens after the first review pass, so the loop converges on consequence instead of spinning on polish:

> Define one predicate everywhere: `blocking_findings(round, findings)` returns all validated findings in round 1 and only validated CRITICAL/HIGH/MEDIUM findings from round 2 onward. A binary gate (test-green, security must-fix, required artifact) is exempt only when its owning invariant explicitly says so; in practice binary gates always remain blocking when they fail.
>
> | Round | Exit bar — loop ENDS when the fresh full review has… | Must be fixed to continue |
> | --- | --- | --- |
> | 1 | zero validated findings at ANY severity | CRITICAL · HIGH · MEDIUM · LOW |
> | 2 | zero validated CRITICAL / HIGH / MEDIUM findings — **LOW-only clears the severity bar** | CRITICAL · HIGH · MEDIUM only |
> | 3 — extension round, reachable ONLY when round 2 left CRITICAL/HIGH open (or failing tests were the only blocker) | zero validated CRITICAL / HIGH / MEDIUM findings — **LOW-only clears the severity bar** | CRITICAL · HIGH · MEDIUM only |
> | 4+ — test-gate continuation, reachable ONLY while failing test gates were the sole blocker | the tests pass and no review blocker is open | failing tests; any review blocker here escalates |
>
> From round 2 onward LOW findings are **NOT required to be fixed**: a round whose validated findings are ALL LOW **ENDS the loop once the persisted minimum is met** — do not open another fix/re-review round for them. Severity tiers are `SYNC:severity-rubric` (CRITICAL block-merge · HIGH must-fix · MEDIUM must clear the current round · LOW record/defer); round 1 remains strict, so a LOW found initially is still validated and fixed when warranted before the floor can apply.
>
> **Severity-floor rules:**
>
> - **Never silently drop a deferred LOW.** Every unfixed LOW is listed in the final report under `## Deferred LOW Findings (severity floor, round ≥2)` with file, line, and description, so the owner can schedule it. Dropping it from the report is a protocol violation, not a clean pass.
> - **Never re-tier a finding to trigger the exit.** Downgrading a real CRITICAL/HIGH/MEDIUM to LOW so the loop can end is a FALSE PASS. Severity is set by consequence per `SYNC:severity-rubric` before the round bar is applied — never after, and never with the exit in view. — why: a floor that can be reached by relabeling is not a floor.
> - **Never re-tier a finding to reach — or to dodge — the extension.** The extension is unlocked by a real CRITICAL/HIGH, so promoting a MEDIUM to HIGH to buy round 3, or demoting a real CRITICAL/HIGH to MEDIUM to force an earlier escalation, are both FALSE classifications. Severity is set by consequence before the round bar and the extension test are applied. — why: an extension that can be reached by relabeling bounds nothing.
> - **The floor bounds the loop, not the standard.** It ends *iteration*; it never authorizes shipping a known CRITICAL/HIGH/MEDIUM, and it never lowers the finding-survival bar that admits a finding in the first place.
> - **The floor never applies to a hard gate.** Test-green gates (a suite must actually pass), security must-fix gates, and any gate whose criterion is binary rather than severity-rated are unaffected — a failing test is a failure, not a LOW finding.
>
> **Universal scope (any new output/judgment):** any newly produced output or judgment gets **≥1 self-review**; any **new judgment** gets **≥1 `/why-review --validate-findings` pass**; anything flagged to re-check is re-checked **≥1 time** — before that output is treated as final. This loop is the default convergence contract for ANY work-producing skill, not review skills only.
>
> **Routing invariant (author-facing):** a skill that validates findings MUST route them through `/why-review --validate-findings` (the terminal validator) — NEVER fork an inline finding-validation. Routing through why-review is what makes the finding-survival bar and this loop apply; the `verify-review-validate-coverage` sensor enforces this exact route mechanically.
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS if `round >= minRounds`; otherwise perform the explicitly required independent pass. Do NOT invent a confirmation pass.
> - **`blocking_findings(round, findings)` is non-empty** → run the active review skill's findings-validation gate first; for review skills the default gate is `/why-review --validate-findings <report-path>`. Fix only validated findings that block the current round, then restart the full review protocol from the beginning with a fresh task breakdown.
>
> **Fresh full re-review after every fix cycle:** Re-run the whole review protocol over the current full target. When sub-agents are part of that protocol, spawn NEW `Agent` calls — never reuse prior agents. Reviewers re-read ALL files from scratch with ZERO memory of prior rounds. See `SYNC:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. Each fresh full review must catch:
>
> - Cross-cutting concerns missed in the prior round
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the prior round rationalized away
> - Regressions introduced by the fixes themselves
>
> **Loop termination:** After each full re-review, repeat the same decision against **that round's exit bar**: bar cleared and persisted minimum met → END; blocking findings remain → validate findings → fix → restart from the first review phase. Round 1 clears only on zero findings at any severity; **from round 2 the bar is zero CRITICAL/HIGH/MEDIUM, so a LOW-only round ENDS the loop once the persisted minimum is met** (deferred LOWs go in the report). Capped at **2 rounds, extendable ONCE to round 3 when round 2 leaves validated CRITICAL/HIGH open**. Escalate via `AskUserQuestion` at whichever comes first: the same validated finding repeats for 2 full invocations with no progress · a fix requires product/owner input · round 2 completes with MEDIUM-only (or `NOT VERIFIABLE`) blocking, which earns no extension · round 3 completes with any review blocker still open. A failing test gate triggers none of these escalations — it loops until green. NEVER loop past round 3 on review blockers, and NEVER convert cap exhaustion into a PASS.
>
> **Rules:**
>
> - A clean Round 1 ENDS the review when `minRounds=1`; an explicitly declared `minRounds=2` requires the independent second pass
> - From round 2 on, a round whose validated findings are ALL LOW ENDS the loop once the persisted minimum is met — never open round N+1 to fix LOW alone; list those LOWs as deferred instead
> - NEVER re-tier a CRITICAL/HIGH/MEDIUM down to LOW to reach the round-2 exit — severity is assigned by consequence before the bar is applied
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - Every surviving finding must additionally clear the **finding-survival bar** defined in why-review's Findings Validation Routine (a deliberately higher bar than the generic act-gate — "keep this finding?" is a stricter question than "act on this evidence?"); a finding below the bar is demoted or dropped, not kept
> - NEVER skip the full re-review after a fix cycle (every fix invalidates the prior verdict)
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns NEW Agent calls
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - The round cap NEVER replaces the clean-review requirement — it bounds runaway looping, it does not authorize shipping an un-clean review; a clean pass ends the loop early once the persisted minimum is met, and cap exhaustion escalates rather than passes
> - Enforce the base cap of 2 rounds, the single conditional extension to round 3 (unlocked ONLY by validated CRITICAL/HIGH open at round 2; a failed non-test binary gate counts as CRITICAL), and the 2 repeated-no-progress blocker rule together; all three are escalation triggers for review blockers, none is a completion criterion
> - The extension is granted at most ONCE per run and never renews — round 3 is the review hard cap regardless of what it finds
> - Failing test gates are outside the round budget: never escalate them for budget or no-progress, never let them buy the extension, and keep fixing and re-running until the tests pass — never forcing green
> - Persist completed rounds, repeated blockers, findings and the explicit minimum in the owning run's `review-policy.cjs` record. Resume that record after interruption; target changes invalidate evidence and acceptance but preserve the bounded round budget. In-flight attempt IDs may be session-local; they do not replace or reset completed-round state
> - Final verdict must incorporate ALL rounds executed
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2 that was executed, plus `## Deferred LOW Findings (severity floor, round ≥2)` whenever the loop ended on the severity floor with LOWs still open. When round 3 ran, the report must name the CRITICAL/HIGH findings that granted the extension; when rounds continued on failing tests, it must name the failing test gates of each such round.**

---

## SYNC:double-round-trip-review:reminder

- **MANDATORY IMPORTANT MUST ATTENTION** run the review loop (aka **Self-Review Convergence Loop**): review → validate findings → fix validated blocking findings → FULL re-review. Any newly produced output/judgment gets ≥1 self-review, and any new judgment ≥1 `/why-review --validate-findings` pass, before it is treated as final.
- **MANDATORY severity floor:** round 1 exits only on zero findings at any severity; from round 2 the bar is zero CRITICAL/HIGH/MEDIUM, so a LOW-only round ENDS the loop once the persisted `minRounds` is met — list every deferred LOW in the report. NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to reach the exit, and NEVER apply the floor to a binary gate (test-green, security must-fix).
- **MANDATORY round cap of 2, extendable ONCE to round 3 — a ceiling, NEVER a target.** A clean pass ends the loop once the persisted `minRounds` is met (default 1; explicit 2 requires an independent pass). Round 2 ending with a validated CRITICAL/HIGH still open (a failed non-test binary gate counts as CRITICAL) grants exactly ONE extra round; round 2 ending with only MEDIUM/`NOT VERIFIABLE` open, or round 3 ending with any review blocker open → **STOP and escalate via `AskUserQuestion`**, never a silent PASS. The 2-repeated-no-progress blocker rule escalates earlier if it trips first. A failing TEST gate has NO round cap and buys no extension — keep fixing and re-running until tests pass, never forcing green.

---

## SYNC:review-policy

> **Executable review policy — one predicate, one durable transition model.** Review skills and their tooling MUST use the canonical helper `.claude/scripts/lib/review-policy.cjs` (policy version 4) for round eligibility. The helper's `blockingFindings(round, findings, hardGates)` predicate returns every validated finding in round 1, and only CRITICAL/HIGH/MEDIUM findings from round 2 onward; `NOT VERIFIABLE` is a separate unresolved-evidence state that remains blocking at every round. Failed binary gates are synthetic CRITICAL blocking findings at every round; record a test-green gate with `kind: 'test'` and every other gate with `kind: 'binary'` (the default). `evaluateRound` retains floor-round LOWs in `deferredLow`, never treats a LOW-only round as blocked after the floor applies, reports `extensionGranted` plus an `ESCALATE` status when the review budget is spent with review blockers open, and reports `failingTestGates` / `testLoopContinues` when failing test gates keep the round open. Severity is assigned before the predicate and never changed to obtain a PASS.
>
> **Round and minimum rules.** `MAX_ROUNDS` (the base budget) is 2 and `HARD_MAX_ROUNDS` is 3; both are ceilings, never targets. Round 3 is an EXTENSION, not part of the default budget: the helper grants it only when the recorded round-2 evaluation still has a validated CRITICAL or HIGH review blocker — a finding, or a failed non-test binary gate carried as synthetic CRITICAL — (`extensionGranted`), grants it at most once per run, and rejects any attempt to reach round 3 without that evidence, except the failing-test continuation below, when round 2's only blockers are failing test gates. **Failing test gates are outside the review budget:** they never earn the extension and never escalate, so while failing `kind: 'test'` gates are the ONLY blockers the helper keeps the run in `CONTINUE` and accepts the next round — past round 3 if needed — until the tests pass. A review blocker past the budget still escalates, and a round with no failing test gate never re-opens the run past its budget. A round-2 evaluation whose blockers are only MEDIUM or `NOT VERIFIABLE` ends the budget and escalates. A clean review ends once `round >= minRounds`; the default minimum is 1 and an explicit `minRounds` may not exceed the base budget of 2 — the extension is earned by evidence, never declared up front. The declaration is persisted and cannot be inferred from a round counter. A failing test-green, security-must-fix, required-artifact, or other binary gate is never waived by the severity floor.
>
> **Durable run record.** A review run MUST identify `runId`, target fingerprint, policy version, target revision, minimum/maximum rounds, completed rounds, full findings/gate evidence, interruption/resume metadata, and acceptance. Use the atomic, lock-serialized transitions in `review-policy.cjs`: `start`, `record`, `accept`, `interrupt`, `resume`, `invalidate`, and `check`. Repeating an identical completed round is idempotent and MUST NOT consume budget twice. A changed target fingerprint invalidates prior evidence and acceptance but MUST preserve the bounded round budget; stale evidence cannot be accepted. A policy-version change (including the round-2 LOW floor and the conditional round-3 extension) invalidates old records; start a new run rather than interpreting old evidence under new semantics. Interrupted/resumed runs retain completed rounds and findings. The record is bookkeeping, not consent, native permission, or proof that a host actually performed the review.
>
> **CLI boundary.** The helper CLI accepts JSON on stdin and uses its own real clock; a supplied `now` is rejected. State directories must be absolute, non-root real directories, records are size-bounded, and malformed/locked state fails closed for the transition. Full reports remain on disk; an inline result envelope is only a transport summary. Any new review policy consumer must add a semantic fixture, boundary counter-cases, a seeded mutant, and a report with the target fingerprint and command exit status.

---

## SYNC:logic-and-intention-review

> **Logic & Intention Review** — Verify WHAT code does matches WHY it was changed.
>
> 1. **Change Intention Check:** Every changed file MUST serve the stated purpose. Flag unrelated changes as scope creep.
> 2. **Happy Path Trace:** Walk through one complete success scenario through changed code
> 3. **Error Path Trace:** Walk through one failure/edge case scenario through changed code
> 4. **Acceptance Mapping:** If plan context available, map every acceptance criterion to a code change
> 5. **Tests Verify Intent:** For test/spec changes, verify tests name the protected business rule or invariant and would fail if that intent breaks.
> 6. **Migration Test Exclusion:** Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.
>
> **NEVER mark review PASS without completing both traces (happy + error path).**

---

## SYNC:behavioral-delta-matrix

> **Behavioral Delta Matrix** — MANDATORY for bugfix reviews. Produce this table BEFORE PASS/FAIL verdict. Narrative descriptions don't substitute.
>
> | Input state | Pre-fix behavior   | Post-fix behavior | Delta                                |
> | ----------- | ------------------ | ----------------- | ------------------------------------ |
> | {condition} | {current behavior} | {fixed behavior}  | Preserved ✓ / Fixed ✓ / REGRESSION ✗ |
>
> **Rules:** ≥3 rows · ≥1 row the bug report did NOT mention · REGRESSION delta → FAIL until a preservation test covers it (`spec-tests-template.md#preservation-tests-mandatory-for-bugfix-specs`)
>
> **BLOCKED until:** ≥3 rows · ≥1 row outside bug report · no unmitigated REGRESSION

---

## SYNC:bug-detection

> **Bug Detection** — MUST ATTENTION check categories 1-4 for EVERY review. Never skip.
>
> 1. **Null Safety:** Can params/returns be null? Are they guarded? Optional chaining gaps? `.find()` returns checked?
> 2. **Boundary Conditions:** Off-by-one (`<` vs `<=`)? Empty collections handled? Zero/negative values? Max limits?
> 3. **Error Handling:** Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
> 4. **Resource Management:** Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
> 5. **Concurrency (if async):** Missing `await`? Race conditions on shared state? Stale closures? Retry storms?
> 6. **Stack-Specific:** Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
>
> **Classify every finding by consequence, not by fix effort; `SYNC:severity-rubric` is authoritative and this is only a quick reminder:**
> - **CRITICAL → block immediately:** an immediate material security/authorization or safety bypass, secret/PII exposure, destructive action, data loss/corruption, or silent failure on a critical path. A failed binary gate is a separate hard blocker (represented as synthetic CRITICAL by the executable policy), not an ordinary tier judgment.
> - **HIGH → must fix before PASS/merge:** wrong behavior on a supported path, violated business/data invariant, meaningful privacy/authority gap, breaking contract/compatibility change, likely material harm, or missing proof for a behavior-changing fix.
> - **MEDIUM → clear before the current round can pass:** a bounded but consequential edge case, resilience/observability/testability/maintainability gap, credible future defect, or local architectural drift with real impact but no immediate material loss. If the fix needs an owner/product decision, stop and escalate with an explicit follow-up and residual-risk record; that record is not a clean-pass waiver.
> - **LOW → record/defer from round 2 onward:** wording/formatting, minor documentation or convention drift, optional defensive cleanup, or cosmetic refinement with no credible present correctness, security, privacy, authority, availability, or data-integrity impact.
> Assign the highest tier supported by evidence. An observation is not a finding until it names the affected asset/user/data/contract, consequence, evidence, and tier. Effort, annoyance, implementation cost, and proximity to the round cap are never severity inputs. `NOT VERIFIABLE` is an evidence state, not a tier; if the unresolved claim could affect a required behavior or binary gate, keep it blocking until proved or explicitly owner-accepted with residual risk. Failed tests, parity, required artifacts, and security-must-fix checks are binary gates and block independently of severity. For the full decision tree, boundary examples, score mappings, and domain-vocabulary normalization, follow `SYNC:severity-rubric`.

---

## SYNC:test-spec-verification

> **Test Spec Verification** — Map changed code to test specifications.
>
> 1. Identify the project's test/spec format from existing docs, test-case files, BDD feature files, or spec folders.
> 2. Every changed code path MUST ATTENTION map to a corresponding test case/spec (or flag as "needs test case")
> 3. New functions/endpoints/handlers → flag for test spec creation
> 4. Migration files are excluded from TC/test creation; schema/data migrations are one-time execution paths, not core application logic.
> 5. If spec evidence fields exist, verify they point to actual code (`file:line`, not stale references)
> 6. Verify each meaningful test case names the business intent/invariant; flag behavior-only cases that only mirror implementation details.
> 7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
> 8. If no specs exist for a changed path → log the gap and recommend the project's test-spec workflow.
>
> **NEVER skip test mapping.** Untested code paths are the #1 source of production bugs.

---

## SYNC:integration-test-sync-check

> **Integration Test Sync Check** — Verify changed business logic files have corresponding tests.
>
> 1. From changed files → identify **business logic files**: handlers, commands, queries, services, controllers, resolvers, event processors. Naming varies by stack — infer from project conventions (e.g., `*Service.*`, `*Handler.*`, `*Controller.*`, `*Command.*`, `*Query.*`, `*Resolver.*`). Exclude migration files: schema/data migrations are one-time execution paths, not core application logic.
> 2. For each identified file → search for a corresponding test file. Infer test naming from existing tests in the project (e.g., `*.test.ts`, `*Tests.java`, `*_test.py`, `*.spec.js`, `*Tests.cs`). Check standard test directories (`tests/`, `spec/`, `__tests__/`, or adjacent test projects/packages).
> 3. If test EXISTS → check if test methods cover changed behavior (new methods/parameters/logic paths)
> 4. If test MISSING → **MANDATORY**: use `AskUserQuestion`: "Business logic file `{file}` has no integration tests — run `/integration-test` before proceeding, or confirm tests already written?" Options: "Run `/integration-test` first" (Recommended) | "Tests already written/updated — proceed"
> 5. Severity: **HIGH** — missing tests for changed business logic MUST be surfaced to the user; do NOT silently flag and continue
>
> **Surface every business-logic change that lacks test coverage for an explicit `AskUserQuestion` decision — never silently skip. — why: a silent skip ships untested business logic to production.**

---

## SYNC:domain-entity-change-gate

> **Domain Entity Change Gate** — ONE DDD-specific protocol binding every skill or agent that PLANS, IMPLEMENTS, or REVIEWS a change to a domain entity, value object, or aggregate in a model that uses DDD tactical patterns or an evidenced equivalent. First inspect the project's domain model and accepted architecture. If neither uses that model, record `DDD-specific gate N/A — project model: <evidence>`; still apply the project's normal ownership, invariant, assertion-backed test, and evidence rules. `/domain-entities-review` is the canonical owner of the full A–P checklist; this gate is the shared trigger plus the decisions that must be answered when applicable. NEVER re-derive a weaker local copy — why: when planning and review disagree on entity rules, the plan ships a design that review then rejects, and the rework is paid twice.
>
> **Trigger — after DDD applicability is established, fires when ANY holds:** a new entity / value object / aggregate root is introduced · an existing one gains or loses a field, invariant, relationship, or state transition · an aggregate boundary, repository, or cross-aggregate reference changes · a domain event is added, renamed, or re-payloaded · a concurrency or reconstitution concern on a root changes. State `No domain-entity surface — gate N/A` when none holds.
>
> **Step 1 — Detect BEFORE deciding.** Both answers change which rules even apply:
>
> - **Paradigm** (per aggregate, from the code — NEVER assumed): OO-mutable · type-driven/immutable · event-sourced. Setter, mutability, and reconstitution rules are written for OO-mutable; applying them to the other two manufactures false findings and false plan tasks.
> - **Subdomain fit:** core (rich model owed) · supporting (Active Record or light model) · generic (buy, do not model) · CRUD (Transaction Script — a rich entity here is ceremony). NEVER plan or flag a rich model where the subdomain has no invariant beyond required-field.
>
> **Step 2 — Answer all 6 decision points.** Each is a decision the change MUST make explicitly:
>
> | # | Decision point | Answered when |
> | - | -------------- | ------------- |
> | 1 | **Classification** — entity vs value object vs aggregate root | The swap test is applied ("would an identical copy be interchangeable?"); a VO is immutable with structural equality and has no repository |
> | 2 | **Invariant ownership** — entity owns "can this state exist?", the boundary owns "is this input acceptable?" | Each rule is placed on one side and named; failure signalling (throw vs `Result`) matches the project convention consistently; a DB constraint is a backstop, NEVER the rule |
> | 3 | **Aggregate boundary + concurrency** | Only true always-consistent invariants share an aggregate; cross-aggregate references are by ID; one aggregate mutates per transaction; the ROOT carries the concurrency token; set-based invariants (uniqueness across instances) name a real enforcing mechanism, never an in-memory check |
> | 4 | **Construction vs reconstitution** | Creation and load are separate paths; the load path raises NO domain events and re-runs NO creation rules; required data sits in the constructor/factory |
> | 5 | **Events** | Raised inside the aggregate; dispatched AFTER commit (outbox when crossing a process); internal domain events kept distinct from published integration contracts; handlers idempotent |
> | 6 | **Test obligation** | Every applicable invariant is named and protected by an executing assertion in the project's native test format, with property and boundary-countercase coverage where applicable; GWT is optional. A valid `specArtifacts` profile supplies case identity/carriers; use property TCs only when the profile is absent. A malformed declared profile blocks; a happy-path example alone is NOT coverage |
>
> **Step 3 — Apply by context.** Same decisions, different obligation:
>
> | Calling context | Obligation |
> | --------------- | ---------- |
> | **Planning** (`/plan`) | The plan MUST name the decision and the owning file for every triggered row. An unanswered row is a plan that is not executable — surface it, do NOT let implementation discover it. |
> | **Plan review** (`/plan-review`) | An unanswered, hand-waved, or deferred-to-implementation row is a FINDING with `file:line` into the plan. Presence of the word "entity" is NEVER an answer. |
> | **Implementation** (`/plan-execute`, `/fix`, and any implementing agent — e.g. `backend-developer`) | The decisions are INPUTS, not questions to reopen: implement each triggered row as the plan/spec decided it, at the owning file it named. A row that arrives UNANSWERED is a blocker — surface it and get it decided; NEVER settle it silently at the keyboard, and NEVER pick an aggregate boundary from a DB table or UI screen because the plan left it open. Paradigm and subdomain fit still gate which rules apply. |
> | **Change review** (`/changes-review`) | Route to the owner — **Mode A (default):** read `/domain-entities-review`'s Phase 2 A–P checklist and apply it as review lenses. **Mode B (escalation):** delegate to `/domain-entities-review` when standalone AND the diff carries 3+ entity files. Findings enter the normal finding set with `file:line` + severity. |
>
> **Duplication guard — SKIP the gate entirely when ANY row holds.** Record the deferral line, then proceed:
>
> | Suppressing context | Deferral line |
> | ------------------- | ------------- |
> | The running skill IS `/domain-entities-review` | `Gate is this skill's own body — A–P checklist owns it.` |
> | Invoked inside `/workflow-review-changes` (its step 4 runs `/domain-entities-review` as a dedicated conditional parallel member) | `Gate deferred to workflow step 4 /domain-entities-review.` |
> | `/why-review` running in `--validate-findings` terminal mode | `Gate N/A — validate-findings is terminal, no sub-skill calls.` |
>
> — why: unguarded, this edge duplicates a review the parent workflow already runs and closes a `changes-review → domain-entities-review → why-review → changes-review` cycle.
>
> **BLOCKED until:** DDD applicability evaluated with project evidence (or the DDD-specific gate is recorded N/A) · if applicable, trigger evaluated (or `gate N/A` recorded), paradigm + subdomain fit stated, all 6 triggered decision points answered or raised as findings, and guard row checked before any delegation.

---

## SYNC:domain-entity-change-gate:reminder

**MUST ATTENTION** when a changed model uses DDD tactical patterns or an evidenced equivalent, apply the **Domain Entity Change Gate** — `/domain-entities-review` owns the full A–P checklist; detect paradigm + subdomain fit FIRST, then answer all 6 applicable decisions (classification · invariant ownership + failure signalling · aggregate boundary + concurrency · construction vs reconstitution · events · assertion-backed native test obligation). Use property TCs only under the absent-profile default; a malformed declared `specArtifacts` profile blocks without fallback. When the project does not use this model, record the DDD-specific gate N/A and still protect actual invariants and outcomes through the configured owner. Planning must NAME each applicable decision; plan review treats an unanswered row as a FINDING; change review routes to the owner (Mode A read / Mode B delegate). SKIP under the 3-row duplication guard and record the deferral line. — why: one protocol shared by planner and reviewer is what stops a plan shipping an entity design that review then rejects.

---

## SYNC:integration-test-execution-discipline

> **Integration Test Execution Discipline** — How the integration-test family (write · review · verify) runs, diagnoses, and clears a suite. Binds `/integration-test`, `/integration-test-review`, and `/integration-test-verify` identically.
>
> 1. **Verify the configured relevant suite, not a convenient sample.** Resolve test projects/suites from project config and the requested scope. A focused run is diagnostic unless the task explicitly asks for that scope; report actual runner output and do not claim broader coverage than it proves.
> 2. **Set up valid state without bypassing the contract under test.** Exercise the production entry path when that path is being tested. For unrelated preconditions, use the project's builders, factories, fixtures, seeders, APIs, or persistence setup when they preserve invariants. Never use a shortcut that skips the behavior the assertion is meant to protect.
> 3. **On ANY failure → `/debug-investigate` the root cause BEFORE any fix.** Do not guess, do not patch the symptom site. Trace the failure end-to-start and classify whose fault it is: test code (wrong assertion/setup), source/production code (real defect), or environment/infrastructure/data. Then route: test-code fault → `/integration-test-review` to fix the test at the root (never weaken assertions or add skips); source-code fault → fix the production defect at the owning layer and report it; environment fault → mark BLOCKED and point at the startup script. NEVER change a test to match broken code.
> 4. **Use project timeouts as budgets, not as fixes.** Investigate a timeout or slow test for deadlock, unbounded work, missing synchronization, or an unavailable dependency. Do not widen an assertion timeout or retry a failing assertion to hide a defect; adjust execution budgets only when evidence shows the configured budget is inappropriate for this environment.
> 5. **Follow the configured repeat policy.** Read `integrationTestVerify.guidance` and report its required fresh runs, state-reset policy, concurrency, and scope. When no policy is declared, use two fresh green runs for suites with persistent/shared state; use the runner's normal clean/isolated setup and never reset data owned by another run. Preserve executed coverage and disclose what each run proves.

---

## SYNC:iterative-phase-quality

> **Iterative Phase Quality** — Score complexity BEFORE planning.
>
> **Complexity signals:** >5 files +2, cross-service +3, new pattern +2, DB migration +2
> **Score >=6 →** MUST ATTENTION decompose into phases. Each phase:
>
> - ≤5 files modified
> - ≤3h effort
> - Follows cycle: plan → implement → review → fix → verify
> - Start Phase N+1 only after Phase N passes VERIFY — why: building on an unverified phase compounds errors downstream
>
> **Phase success = all TCs pass + code-reviewer agent approves + no blocking findings under the current review bar.** Round 1 requires zero validated findings at any severity; from round 2 onward a phase requires zero validated CRITICAL/HIGH/MEDIUM findings, with LOW findings recorded as deferred. Failed binary gates remain blocking at every round.

---

## SYNC:design-patterns-quality

> **Design Quality** — Be opinionated about changeability, and choose techniques by their preconditions. For brownfield work, project config, references, accepted decisions, and current code define the local architecture; do not silently replace a settled pattern. For a new non-trivial system, treat the options below as hypotheses; use the domain, change, and deployment boundaries to select a fit, not a universal target architecture.
>
> 1. **DRY the knowledge, not merely the text.** Keep one owner for a business rule or policy that must change together. Similar-looking code with different reasons to change may stay separate; extract shared functions, modules, types, or components when a real consumer and lower change cost justify them.
> 2. **Give modules explicit responsibilities and dependency direction.** A modular monolith can fit a new application with one release boundary and no evidenced need for independent deployment, scaling, compliance, availability, or runtime; choose another topology when measured ownership or operating boundaries require it. Use Clean/Hexagonal/Ports-and-Adapters ideas to keep policy independent of volatile infrastructure when that boundary buys testability or change isolation. Add layers only when each owns a real contract; split deployment/services only for a demonstrated scaling, ownership, availability, compliance, or release need.
> 3. **Model the domain to its actual complexity.** Use DDD language, aggregates, value objects, and explicit invariants where domain rules and lifecycle matter. Keep straightforward CRUD workflows simple; do not add tactical DDD ceremony without domain complexity.
> 4. **Use events for real decoupling.** Domain/integration events and messaging fit asynchronous reactions or independently owned modules/services. Define idempotency, ordering, retry/recovery, and an outbox/CDC strategy when delivery crosses a durable boundary. Use a direct call inside one consistency boundary when asynchronous delivery adds no value.
> 5. **Use Repository and Unit of Work at meaningful persistence boundaries.** They fit when they protect aggregate/query contracts, isolate a changing persistence technology, or coordinate a real transaction. Do not wrap every ORM call in a generic repository or add a Unit of Work that duplicates the platform's transaction behavior.
> 6. **Apply OOP/SOLID where the language and model use objects.** Prefer cohesive responsibilities, dependency inversion at volatile boundaries, and composition before inheritance; avoid interface-per-class and abstractions with no second implementation or test seam. In functional or data-oriented code, preserve the same cohesion, explicit dependencies, and small contracts without forcing classes.
> 7. **Build UI from cohesive components.** Keep state at the narrowest useful owner; use a store for state genuinely shared across components/routes or for coordinated async data. Add caching only with a freshness/invalidation policy and evidence of a repeated or expensive read. Use the framework's reactive model for composable asynchronous changes and dispose subscriptions/resources by its lifecycle. Apply BEM when the project uses SCSS/BEM; otherwise follow the selected CSS modules, utility, or naming method.
> 8. **Place behavior with its invariant/data owner.** Trace callers and dependencies; use the owner selected by the project's architecture. Do not assume Entity > Service > Controller, or any other fixed layer order.
> 9. **After extraction/move/rename:** grep the full affected scope for dangling references. Preserve project naming/style and verify caller contracts before changing an abstraction.
>
> **Selection gate:** read project config, references, accepted decisions, and comparable implementations. Name the problem/precondition a chosen pattern solves, the simpler alternative, and the trade-off. Configuration may select a stack-specific pattern; it does not make an unjustified abstraction free.
>
> **Review dimensions:** use focused passes over applicable concerns, then group repeated, evidenced violations when they share one cause. A repeated smell is not automatically a defect; name the damaged quality attribute and project-specific consequence.

---

## SYNC:complexity-prevention

> **Complexity Prevention (Ousterhout)** — Use change cost as a review lens, not as a technology checklist. Apply each concern only when its code path and project architecture make it relevant; absence of a pattern is not a defect.
>
> 1. **Change amplification** — estimate edit sites for a plausible change in this area. Several coordinated edits may indicate duplication or a missing owner, but assess cohesion and trade-offs before calling it structural.
> 2. **Cognitive load** — look for unnecessary dependencies, implicit ordering, boolean traps, hidden state, or nesting that makes a local change hard to reason about.
> 3. **Repeated cross-cutting behavior** — where logging, validation, authorization, error handling, or transactions recur, consider an existing shared mechanism that fits the project's runtime; do not prescribe middleware/interceptors/aspects where none exist.
> 4. **Leaked implementation detail** — when an abstraction boundary exists, check whether callers depend on provider/query/storage details unnecessarily. ORM queries, cursors, repositories, and query sets are examples only.
> 5. **Scattered variant logic** — repeated switches or conditionals over the same discriminator may signal a useful owner or dispatch point; retain simple local branches when they fit better.
> 6. **Invariant ownership** — verify that rules are protected by the owner chosen in this architecture. Rich entities, value objects, functional modules, and service-owned rules are all valid when consistent with project evidence.
> 7. **Primitive/domain types** — introduce a richer type only when it reduces repeated validation or protects an evidenced invariant; do not wrap every primitive by default.
> 8. **Cross-cutting policy** — centralize recurring policy when the project has a suitable extension point; one-off behavior may remain local.
> 9. **Module depth** — assess whether an abstraction hides meaningful work or adds more concepts than it removes; class/interface counts are examples, not requirements.
> 10. **Repeated lifecycle behavior** — repeated component, handler, job, or resource lifecycle may justify the project's idiomatic abstraction (function, hook, composable, trait, class, or helper), but only after fit and consumer evidence.
> 11. **Abstraction timing** — repetition triggers evaluation, not automatic extraction. Compare the cost of duplication with the indirection and future variation an abstraction creates.
> 12. **Reusable algorithms** — when a non-trivial stack-generic algorithm repeats, prefer a coherent existing helper or an evidenced shared owner; do not create utility layers for hypothetical reuse.
> 13. **Place computation with its data and invariant owner** — trace callers and use the architecture's documented responsibility model. There is no universal controller/service/entity/model order.
> 14. **Extraction decision** — move or share a rule when doing so gives it one clear owner or serves real consumers. A single use is not sufficient evidence by itself; keep code local when extraction would add ceremony.
>
> **Illustrative shapes only:** entity method, DTO mapper, domain service, application service, pure function, module, middleware, repository, store, or component can be appropriate depending on project evidence. Never use this list as a required target architecture.
>
> **Operating heuristics:** read callers and sibling implementations, count affected edit sites, prefer removing unnecessary code, surface assumptions at boundaries, and ask what changes when the requirement shifts. Measure good code by safe change cost in its actual context, not by a universal layer diagram.

---

## SYNC:plan-granularity

> **Plan Granularity** — Every phase must pass 5-point check before implementation:
>
> 1. Lists exact file paths to modify (not generic "implement X")
> 2. No planning verbs (research, investigate, analyze, determine, figure out)
> 3. Steps ≤30min each, phase total ≤3h
> 4. ≤5 files per phase
> 5. No open decisions or TBDs in approach
>
> **Failing phases →** create sub-plan. Repeat until ALL leaf phases pass (max depth: 3).
> **Self-question:** "Can I start coding RIGHT NOW? If any step needs 'figuring out' → sub-plan it."

---

## SYNC:preservation-inventory

> **Preservation Inventory** — MANDATORY for bugfix plans. Trigger keywords in plan title/frontmatter: `fix`, `bug`, `regression`, `broken`, `defect`. Author MUST produce this table BEFORE writing implementation steps.
>
> **Columns:** `Invariant | file:line | Why (data consequence if broken) | Verification (configured owner + case/scenario + optional variant + assertion file:line; strict-default TC-ID or grep only when specArtifacts is absent)`
>
> **BLOCKED until:** ≥3 rows · every File cell has `file:line` · with a valid `specArtifacts` profile, each verification resolves to the actual case/executor and inspected assertion at `file:line`; when it is absent, each cell has TC-ID or grep (not "manually verify"); a malformed or unsupported declaration blocks without fallback.

---

## SYNC:cross-cutting-quality

> **Cross-Cutting Quality** — Check relevant changed paths using the project's declared architecture and operational requirements:
>
> 1. **Error handling** — follow documented conventions and keep related paths consistent.
> 2. **Diagnostics** — use the project's logging and tracing facilities; add correlation context only where the runtime supports it and the operation needs it.
> 3. **Security** — protect secrets and validate untrusted inputs at applicable boundaries; check authorization where the project has an authorization contract.
> 4. **Performance** — inspect relevant hot paths and resource use; check query behavior, allocations, or asynchronous work only where those mechanisms exist.
> 5. **Operations** — verify health checks, metrics, tracing, or endpoint behavior only for declared runtime surfaces and operational requirements. Do not add infrastructure solely to satisfy a generic checklist.

---

## SYNC:scaffold-production-readiness

> **Scaffold Readiness** — Evaluate these foundation areas against the requested artifact, project config, and deployment model. Include applicable foundations; mark non-applicable areas N/A with a reason instead of adding unrelated stack requirements:
>
> 1. **Quality tooling** — use or propose tooling appropriate to the language, repository, and delivery process; document selected tools in project references/config when available.
> 2. **Error handling** — define behavior at applicable process, API, CLI, library, or user-interface boundaries; use HTTP status handling or user notifications only when those surfaces exist.
> 3. **Asynchronous interaction** — provide progress/loading and cancellation behavior when the artifact exposes long-running work to a user or caller; do not add a universal loading tracker to non-interactive projects.
> 4. **Runtime and deployment** — use the declared hosting and deployment model. Container files and multiple run modes are required only when selected by the project; prove each supported mode with its actual command.
> 5. **External integrations** — document and test applicable outbound boundaries; choose timeout, retry, idempotency, or circuit-breaking behavior to fit the protocol and failure modes.
>
> **Gate:** resolve every applicable foundation before implementation. Ask for a decision only when an unresolved choice materially changes the architecture or user-visible behavior.

## SYNC:scaffold-production-readiness:reminder

Assess quality, error handling, async interaction, runtime/deployment, and integrations against project config and the actual target. Include and verify applicable foundations; mark the rest `N/A` with a reason. Do not require UI, containers, a broker, or a test layer the project does not use.

---

## SYNC:scale-technique-gate

> **Scalability & Production-Readiness Technique Gate** — CONDITIONAL, evidence-gated, scale-tiered. Judge which system-design techniques a system *warrants* at its scale — flag warranted-but-missing gaps AND advise AGAINST unwarranted heavyweight ones. **ADVICE-ONLY: emit the matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.**
>
> 1. **Derive the scale tier FIRST — from evidence, never assumed.** Read users/RPS, SLO/latency targets, data volume, tenancy, topology from config/infra/specs; cite `file:line` + confidence. Tiers: `T0` internal/single-instance · `T1` small SaaS (<10k users) · `T2` high-scale (10k–1M) · `T3` massive/multi-region (millions+). Unknown tier → state assumption, do NOT default to T3.
> 2. **Judge each concern group only at/above its warranting tier** (member techniques → owning review skill for depth):
>    - Traffic & Edge — Rate Limiting, Load Balancing, Reverse Proxy, API Gateway, CDN, Edge Caching, WAF, DDoS (T1+; CDN/WAF T2+) → security-review owns WAF/DDoS
>    - Caching & Data Access — Caching, Cache Invalidation, DB Indexing, Query Optimization, N+1, Connection Pooling (T1+) → performance-review owns depth
>    - Data Scaling & Consistency — Read Replicas, Sharding, Partitioning, Replication, CAP, Eventual Consistency, Locks, Leader Election (T2+; sharding/multi-region T3) → performance-review
>    - Async & Messaging — Message Queues, Pub/Sub, Event-Driven, Saga, DLQ, Distributed Transactions, Backpressure, Webhooks, WebSockets/SSE (T2+)
>    - Resilience — Circuit Breakers, Timeouts, Retries, Backoff, Idempotency, Health Checks, Liveness/Readiness, Failover, Graceful Degradation (T1+) → production-readiness-review
>    - Scaling & Compute — Autoscaling, Horizontal/Vertical Scaling, Serverless Limits, Cold Starts, Cron Jobs, Thread Safety, GC/Memory Leaks (T1+; autoscaling T2+)
>    - Deployment & Release — CI/CD, Docker, Kubernetes, Blue-Green/Canary/Rolling, Rollbacks, Feature Flags, IaC/Terraform/Helm, Build Caching (CI/CD T0+; K8s/canary T2+)
>    - Observability — Monitoring, Logging, Distributed Tracing, Metrics, Alerting, SLOs/SLIs, Error Budgets (T1+; tracing/error-budgets T2+) → production-readiness-review
>    - Security & Compliance — Secrets Management, IAM, OAuth, JWT Rotation, TLS, Encryption at Rest/Transit, CORS, CSRF, SQLi, XSS, SSRF (T0+) → security-review owns
>    - DR & Infra — Backups, Disaster Recovery, Multi-Region, Chaos Engineering, Schema Versioning, DB Migrations, Cost Optimization (backups T1+; DR/multi-region/chaos T3) → production-readiness-review
> 3. **Assign one of 4 verdicts per warranted technique:** `PRESENT` · `MISSING-WARRANTED` (→ **advise only** — guidance, NOT a score/gate lever) · `N/A-by-scale` (below warranting tier) · `OVER-ENGINEERED` (present but unwarranted at this tier → advise AGAINST).
> 4. **Anti-over-engineering guard (first-class):** do NOT recommend K8s, sharding, multi-region, service mesh, event sourcing, or distributed transactions below their warranting tier. A correctly-lean small system is a PASS, never a gap.
> 5. **Output — Technique Applicability Matrix:** `technique | tier-warranted? | present? | verdict | advice | evidence (file:line/config/infra)`. Full grouped catalog + per-tier baseline → `.claude/docs/scale-technique-catalog.md`. Hosting reviews surface this matrix WITHOUT changing any `/20`, `/24`, verdict band, or PASS/FAIL (per user decision 2026-07-06). **Drift-guard: tier thresholds & per-technique warranting tiers are AUTHORITATIVE in `.claude/docs/scale-technique-catalog.md` — the inline tier summary above is a condensed pointer; on any tier/technique change, update the catalog FIRST, then re-run `.claude/scripts/inject_scale_technique_gate.py` to re-propagate this block.**
>
> **BLOCKED until:** `- [ ]` tier derived from evidence (not assumed) `- [ ]` matrix emitted `- [ ]` over-engineering guard applied `- [ ]` advisory-only (no score/verdict mutation) confirmed

---

## SYNC:scale-technique-gate:reminder

**IMPORTANT MUST ATTENTION** scale-technique gate: derive the scale tier from evidence FIRST (T0 internal · T1 <10k · T2 10k–1M · T3 millions+), then judge each warranted technique `PRESENT`/`MISSING-WARRANTED`/`N/A-by-scale`/`OVER-ENGINEERED`. Advise on warranted-but-missing gaps AND advise AGAINST unwarranted heavyweight techniques (anti-over-engineering). **ADVICE-ONLY — emit the Technique Applicability Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scale-technique-catalog.md` (authoritative for tier thresholds & per-technique warranting tiers — on any change update the catalog FIRST, then re-run `inject_scale_technique_gate.py`).

---

## SYNC:scenario-stress-eval

> **Scenario Stress & Resilience Evaluation** — CONDITIONAL, evidence-gated, business-criticality-aware. The top-down companion to `SYNC:scale-technique-gate`: instead of *"is technique X present?"*, put the system UNDER concrete failure/load scenarios and judge whether it SURVIVES, SELF-HEALS, and whether its BUSINESS needs it to. **ADVICE-ONLY: emit the Scenario Stress Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.**
>
> 1. **Reuse the scale tier** derived by `SYNC:scale-technique-gate` (or derive it identically from evidence); **also derive business-criticality `B0`–`B3`** from specs/SLA/product docs + the domain, cite `file:line` + confidence. `B0` best-effort · `B1` important · `B2` business-critical · `B3` mission-critical/regulated. Unknown → state the assumption, do **NOT** default to `B3`/`T3`. **Criticality-signal floor (both-directions safety):** regulated / PII / financial / health data, money movement, auth/identity, or legal-compliance scope raises `B` to **at least `B2` even absent SLA/SLO docs**; anti-over-engineering lowers hardening ONLY when NO such signal is present. `B` (blast if it fails) and `T` (scale of load/data) are independent — a low-traffic payroll run is low-`T`, high-`B`.
> 2. **Select in-scope scenarios** — only those the system's `B`/`T` combination warrants (a `B0` internal PoC skips region-loss/DR entirely; a `B3`/`T0` regulated service still needs backups + DR by BUSINESS, not scale).
> 3. **Walk each in-scope scenario:** simulate the stimulus → trace the break path → name the failure signature → answer the self-heal/recovery question (auto-recover? MTTR? manual runbook?) → name the trade-off it forces. Families: traffic spike · sustained growth · data-volume growth · write/ingest burst · dependency down/slow · instance/node loss · zone/region loss · **data loss/corruption** · poison-message/retry-storm · cascading failure/backpressure · cold-start/deploy-blip · clock-skew/duplicate-delivery.
> 4. **Assign one verdict per scenario:** `WITHSTANDS` · `DEGRADES-GRACEFULLY` · `FAILS-HARD` (→ **advise only**) · `N/A-by-business` (not warranted → skip, not a gap) · `OVER-HARDENED` (resilience beyond business need → **advise AGAINST**, cite carrying cost).
> 5. **Anti-over-engineering guard (first-class):** a lean system whose business does not need HA/DR is a PASS; `OVER-HARDENED` flags resilience the business does not warrant. This guard is symmetric with the criticality-signal floor above — never under-harden a `B2`+ system just because its traffic is low.
> 6. **Output — Scenario Stress Matrix:** `scenario | in-scope (B/T)? | verdict | self-heal | trade-off | evidence (file:line/config/infra)`. Full catalog + Business×Scale in-scope baseline + verdict/tier tables → `.claude/docs/scenario-stress-catalog.md`. **ADVISORY-ONLY: NEVER mutate any `/20`, `/24`, verdict band, or gate pass/fail. Drift-guard: scenarios/verdicts/business-tiers are AUTHORITATIVE in the catalog — update it FIRST, then re-run `.claude/scripts/inject_scenario_stress_gate.py`. Scale tier stays single-sourced in `scale-technique-catalog.md`.**
>
> **BLOCKED until:** `- [ ]` scale tier + business-criticality (with criticality-signal floor) derived from evidence `- [ ]` in-scope scenarios selected `- [ ]` matrix emitted `- [ ]` over-hardening guard applied `- [ ]` advisory-only (no score/verdict mutation) confirmed

---

## SYNC:scenario-stress-eval:reminder

**IMPORTANT MUST ATTENTION** scenario-stress gate: reuse the scale tier `T0`–`T3` AND derive business-criticality `B0`–`B3` from evidence first — apply the **criticality-signal floor** (regulated/PII/financial/health data · money movement · auth/identity · legal-compliance → at least `B2` even absent SLA docs; do NOT default to `B3`). Select only the scenarios the `B`/`T` combination warrants, then walk each (simulate → trace → failure signature → self-heal/MTTR → trade-off) and assign `WITHSTANDS`/`DEGRADES-GRACEFULLY`/`FAILS-HARD`/`N/A-by-business`/`OVER-HARDENED`. Anti-over-engineering is first-class (a lean system that needs no HA/DR is a PASS) AND symmetric (never under-harden a `B2`+ system for low traffic). **ADVICE-ONLY — emit the Scenario Stress Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scenario-stress-catalog.md` (authoritative for scenarios/verdicts/business-tiers — on any change update the catalog FIRST, then re-run `inject_scenario_stress_gate.py`; scale tier stays single-sourced in `scale-technique-catalog.md`).

---

## SYNC:engineering-foundation-gate

> **Engineering Foundation Gate** — CONDITIONAL, evidence-gated, profile-tiered. Judges the PROJECT'S ENGINEERING FOUNDATION: _can this team build, run, test and change the system safely — anywhere, repeatably, as it grows?_ Its companions judge the running system's DESIGN (`scale-technique-gate`: is technique X present? · `scenario-stress-eval`: does it survive scenario Y?) — a system can score perfectly on both while nobody but its author can build it. **State OUTCOMES, never tools:** detect the stack, research the current ecosystem, present 2–3 options, the user decides, record the decision — best practice turns over, the outcome does not.
>
> 1. **Derive the project profile FIRST — from evidence, never assumed.** `Lifecycle` **G** greenfield (foundation being created) / **B** brownfield (foundation exists, under audit) · scale `T0`–`T3` (**reuse** `scale-technique-catalog.md`, never re-derive) · criticality `B0`–`B3` with its criticality-signal floor (**reuse** `scenario-stress-catalog.md`) · repo shape `R0` single module / `R1` few (2–5) / `R2` many modules, multi-team / `R3` monorepo estate · runtime surface. Cite `file:line`/config/CI + confidence. Unknown axis → state the assumption and take the **LOWER** tier; NEVER default to `T3`/`B3`/`R3` — an over-stated profile turns this gate into busywork a small team correctly ignores.
> 2. **Judge all 7 dimensions — always all 7, never a filtered subset** (an omitted row is indistinguishable from an overlooked one). Depth belongs to the named owner; this gate decides only present/absent:
>    - **F1 Reproducible environment** (ALL profiles — the floor) — one documented path takes a clean machine to a running system; toolchain versions pinned; dependencies locked to exact versions; every external prerequisite declared with a way to obtain or fake it; config environment-injected, never machine-implicit; build deterministic. This is what kills _"works on my machine"_ — not carelessness, but a build depending on ambient state nobody declared. → `scaffold` · `architecture-scalability-review`
>    - **F2 Supported execution modes** (judge the modes this project uses or requires; a second mode is not universal) — document and exercise each supported/required developer, test, and deployment path (for example host/container, local/managed, simulator/device). Keep shared configuration/topology in one source where possible. If only one mode fits the runtime, platform, team, and delivery model, verify it and mark the second-mode comparison `N/A-by-profile`; do not invent Docker, Compose, or a host path. The defect is a claimed or required mode that is broken or irreproducible. → `scaffold` · `production-readiness-review`
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

---

## SYNC:engineering-foundation-gate:reminder

**IMPORTANT MUST ATTENTION** engineering-foundation gate — judges whether the team can build, run, test, and change the system repeatably as it grows. Derive lifecycle, scale, criticality, repository shape, and runtime from evidence; take the lower supported tier when unknown. Judge all 7 dimensions, using `N/A-by-profile` with evidence when a concern truly does not apply. **F1** reproducible build/run/test path · **F2** document and exercise each supported or required execution mode; dual host/container or other modes only when the project uses or needs them · **F3** environment portability at applicable local/CI/production-shaped targets · **F4** meaningful test-strength evidence without making one mutation tool universal · **F5** measured performance where scale/risk warrants it · **F6** change/build scalability where the repository has meaningful module boundaries · **F7** mechanical checks selected for the stack/profile. For each, judge outcomes rather than tools, and preserve anti-over-engineering. Foundation creation may block on missing warranted outcomes; brownfield audits advise and name the smallest next step. Catalog → `.claude/docs/engineering-foundation-catalog.md` (update first, then re-run `inject_engineering_foundation_gate.py`).

---

## SYNC:scale-ready-foundation

> **Scale-Ready Foundation & Brownfield Fit** — Use this protocol only in `workflow-greenfield-init` and `workflow-big-feature`; it supplements, never replaces, `SYNC:engineering-foundation-gate`, `SYNC:scale-technique-gate`, `SYNC:design-system-check`, and `shared/sdd-artifact-contract.md`. Optimize for a system that can grow and change safely, not for a fashionable architecture.
>
> 1. **Classify lifecycle and evidence first.** Mark `G` greenfield (foundation being created) or `B` brownfield (existing project); record scale `T0`–`T3`, business criticality `B0`–`B3`, repository/module shape, user-facing surfaces, and current setup with `file:line`/config/CI evidence. Unknowns stay explicit and take the lower warranted tier; never invent a greenfield baseline for an existing project.
> 2. **Choose the smallest architecture that satisfies measured needs.** For a greenfield business application, evaluate a modular monolith when one release boundary fits and there is no evidenced need to split deployment, scaling, compliance, availability, or runtime; select it only when its boundaries fit the domain and operating constraints. Preserve accepted decisions and architecture on brownfield work unless a requirement justifies a reviewed migration. Evaluate Clean/Hexagonal, DDD, and event-driven patterns only where their preconditions fit; add distributed services, event sourcing, sagas, or other costly machinery only for a named need. Record dependency direction, data ownership at service boundaries, and any useful decomposition trigger.
> 3. **Make applicable module boundaries cheap to change.** When the project has modules or bounded capabilities, name their responsibilities and contracts; organize business modules around capabilities where that matches the domain, not merely tables, vendors, or technical layers. Respect the configured in-process and service boundaries; do not bypass another independently owned service's private data contract. Keep shared libraries domain-neutral, and add boundary checks when they are useful and supported by the stack.
> 4. **Design authorization from actors, not a role enum.** For SaaS or multi-tenant scope, enumerate applicable human, organization, platform, service-account, integration, webhook, and background-job actors (for example: visitor, member, tenant administrator, support/operator, platform administrator, service identity); derive the list from the product and threat model rather than assuming it. For every actor record authentication, tenant/resource scope, actions, role assignment/delegation, deny-by-default and least privilege, separation of duties, admin/impersonation/break-glass controls, and audit evidence. Verify allowed, denied, and cross-tenant isolation paths.
> 5. **Keep infrastructure replaceable without leaking vendors.** Put each real external boundary behind a purpose-named port/interface and provider adapter; keep SDK, framework, database, queue, and transport types out of domain/application contracts; compose implementations at the outer boundary; and add abstractions only where a real boundary or substitution need exists. A claimed swap must identify the stable contract, migration seam, and remaining provider-specific cost.
> 6. **Research new or materially changed dependencies and enforce the cost constraint.** Compare current authoritative evidence for fit, maintenance, security, interoperability, upgrade path, license obligations, and total cost. Respect existing approved dependencies unless the change reopens them. When the requirement is free/no paid license, reject paid license or usage-fee choices unless the user explicitly approves an exception; verify upstream license text and machine-readable SPDX metadata. Record material attribution, copyleft/patent/redistribution obligations, and operating costs; do not turn dependency inventory into speculative replacement work.
> 7. **Make the supported execution and operations reproducible.** Identify the project's required developer, test, and deployment modes from its runtime, team, CI, and target platform. Use one source of truth for shared configuration/topology; when both host and container modes are supported or required, exercise both. Use containers/Compose when they fit the project or its dependencies; document and verify the supported native, device, managed, or other mode when containerization does not fit. Plan CI/CD, migrations, rollback, observability, runbooks, and recovery according to project scale, risk, platform, and data durability; mark irrelevant capabilities `NOT-APPLICABLE` with evidence.
> 8. **Treat each user-facing surface as part of its product.** When UI design decisions need references, use current examples appropriate to the target platform, audience, and domain; record the source, access date, observed pattern, fit, and what was rejected. Define visual language, interaction states, accessibility, and responsive behavior only where relevant to the surface. Follow the project's configured design system and component/module ownership; if none exists, document the actual owners and the smallest useful conventions without inventing tiers, wrapper contracts, tokens, or breakpoints. Reuse components when they fit; never copy a reference site's assets or code without permission.
> 9. **Rank by ROI and reversibility.** For each principle, compare 2–3 viable approaches when the decision is hard to reverse; record benefits, sacrifices, change cost, risk if skipped, cost of delay, and measurable revisit trigger. Distinguish `APPLY-NOW`, `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, and `BLOCKED`; a named pattern without an applicability decision is incomplete.
> 10. **Handle brownfield gaps without scope laundering.** If the current project already has setup, inspect what can be adopted safely, what conflicts with accepted decisions, and what cannot be applied without broad refactoring. Keep the requested actor-facing outcome bounded; mark safe parts `ADAPT-IN-SLICE`, and record broad work as a separately owned architecture/refactor opportunity with scope, rationale, dependency order, trigger, smallest independently valuable next step, owner, and cost of delay. Attach only enabling work needed by the releasable outcome; if the outcome cannot be safe without the refactor, mark it `BLOCKED` and escalate instead of silently expanding the ticket.
> 11. **Greenfield handoff is blocking for warranted foundation decisions.** Before the first implementation plan completes, carry the matrix, accepted decisions, applicable actor/permission model, dependency/license choices, module/boundary map, real external ports, supported execution commands, CI/CD and operations plan, and UI decisions when applicable into architecture, scaffold, harness, and plan artifacts. A warranted omission needs evidence and an owner-visible disposition; do not require host/Compose modes, modules, UI, or infrastructure that the project does not use.
>
> **Required output:** `principle | lifecycle (G/B) | applicability evidence | current state | decision/status | selected approach | alternatives/sacrifices | ROI/change cost | owner/next step | acceptance/revisit trigger`.
>
> **BLOCKED until:** lifecycle/profile evidenced · each applicable principle has a decision/status · architecture/module/auth/dependency/infra/ops/UI outputs are present or evidence-backed `NOT-APPLICABLE` · brownfield refactor gaps have an owner and independently valuable next step · greenfield warranted omissions have explicit approval · all claims carry source/config/`file:line` evidence.

---

## SYNC:scale-ready-foundation:reminder

**IMPORTANT MUST ATTENTION** `scale-ready-foundation`: classify lifecycle/scale/criticality from evidence; choose the smallest architecture that fits; preserve brownfield decisions; make only applicable modules, authorization, external boundaries, dependencies, execution modes, CI/operations, and UI contracts explicit. Verify each supported run/test mode; dual host/container or other modes are needed only when the project supports or requires them. Greenfield warranted omissions block handoff; brownfield gaps get an owner/trigger/next step or an evidence-backed `NOT-APPLICABLE`/`BLOCKED` disposition. Do not require Docker, a database, UI, or distributed services where the project has no such capability.

---

## SYNC:ai-agent-as-user-access

> **AI Agent as a First-Class User / Machine-Interaction Contract** — Strong recommendation when creating a greenfield system; optional, evidence-gated advice for a big feature or architecture review. Treat an AI agent as a potential non-human actor with its own identity, authority, tenancy, safety policy, and observable outcomes — not as a trusted administrator or UI automation shortcut. This supplements, never replaces, the shared authorization, API, security, and test contracts.
>
> 1. **Classify the actor and relationship.** From product and threat-model evidence, identify agent personas (user-delegated copilot, tenant automation, platform operator, service agent, integration agent), the human or organization it may act for, tenant/resource scope, trust level, allowed autonomy, data/action budgets, and human approval points. An agent is not automatically the human, tenant administrator, or platform administrator.
> 2. **Make one application capability core.** Express business use cases in a stable application boundary reused by human UI and machine surfaces. API, CLI, MCP, WebMCP, webhook/event, SDK, or batch adapters may translate contracts, but must not duplicate domain rules or bypass validation/authentication/authorization. Name and version contracts by purpose, use machine-readable input/output schemas, stable error codes, idempotency for retries, pagination or asynchronous status where needed, timeouts/cancellation, correlation IDs, quotas/rate limits, and deprecation policy.
> 3. **Choose surfaces by evidence.** Use API/OpenAPI for remote machine integrations (`https://spec.openapis.org/oas/latest.html`); CLI for local/operator/automation; MCP for LLM-host discovery of tools, resources, and prompts; WebMCP for a browser-integrated agent when an applicable browser/runtime supports it; webhooks/events for push integration; SDK only when it lowers consumer cost. Evaluate relevant surface(s) and record `APPLY-NOW`, `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, or `BLOCKED`; never build all surfaces without a user/job and owner.
> 4. **MCP contract.** When MCP is applicable, expose least-privilege, capability-oriented tools/resources/prompts over currently supported transports (stdio for local, Streamable HTTP for remote, or another explicitly justified adapter). Tool names and descriptions are concise and truthful; input/output schemas, structured results/errors, pagination, deterministic discovery, progress/cancellation, long-running task polling, idempotency, and audit/tool-call IDs are explicit. Use the official specification (`https://modelcontextprotocol.io/specification/`) and authorization guidance (`https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization`) as the current protocol references.
> 5. **WebMCP is progressive enhancement.** When a web surface and browser-agent support exist, expose narrow page capabilities through the current WebMCP draft API behind a project-owned adapter; never make the domain or primary API contract depend on a draft/browser-only feature. Register only safe, purpose-named tools, validate at server-side/application boundaries, and test direct tool execution against the UI path. Treat tool metadata, page content, and tool output as untrusted input; defend against prompt/output injection and confused-deputy behavior. The official WebMCP page currently labels the proposal a Draft Community Group Report, not a W3C Standard or Standards Track feature (`https://webmachinelearning.github.io/webmcp/`).
> 6. **Secure every agent path.** Give agents distinct authentication and authorization. Resolve delegated human, organization, service-account, or integration identity; enforce deny-by-default, least privilege, tenant/resource scope, action-specific permissions, expiry/revocation, rate/usage budgets, replay/idempotency protection, and separation of duties at the application boundary. No agent self-granting, client-supplied role/tenant claims, privilege escalation, or inbound-token passthrough to downstream services. High-impact, destructive, financial, or privacy-sensitive actions require explicit consent, preview/dry-run, or step-up policy unless an approved autonomous policy says otherwise.
> 7. **Make consent and audit inspectable.** Record who/what acted (agent identity, delegating principal, tenant, client/host, model/session/run where available), capability/tool/action, redacted inputs, policy/consent decision, result/error, correlation ID, and timestamp. Provide discoverable scopes, tool permissions, revoke/rotate paths, and human-visible confirmation for high-impact actions. Keep agent output/data boundaries and retention explicit.
> 8. **Operate it like a product surface.** Document onboarding/discovery, credentials, environment, schema/version compatibility, examples, rate/timeout/error behavior, partial-failure/retry semantics, long-running jobs, support/deprecation, and safe rollback. Monitor adoption, denied calls, latency, errors, retries, quota/cost, sensitive-data exposure signals, and anomalous behavior; provide runbooks and kill/revoke controls.
> 9. **Test the contract and equivalence.** Every agent-facing contract test names the business intent/technical contract and expresses its preconditions, action, and owned outcome in the project's native test format; Given/When/Then is one option. Verify allowed/denied/cross-tenant paths, schema compatibility, the same outcome as the human/API path, idempotent retries/replay, prompt/output injection, unsafe tool descriptions, authorization expiry/revocation, pagination, timeout/cancellation, rate limits, and audit records. Assert the outcome owned by the application, not only tool-call or transport bookkeeping.
> 10. **Apply lifecycle scope correctly.** Greenfield must produce an agent actor/access matrix, selected surfaces and rationale, capability contracts, threat/consent model, test/observability plan, and explicit owner before the first implementation plan; a warranted omission requires an explicit decision/acceptance. Big-feature and architecture-review use this as optional advice: inspect existing setup and advise only when agent use is evidenced or a future contract is accepted; safely adapt in the slice, or create an owned `DEFER-AS-OPPORTUNITY` with owner, trigger, dependency order, smallest next step, and cost of delay. If safety/correctness requires the work, mark `BLOCKED`; never silently turn a feature into an agent-platform refactor.
>
> **Required output:** `agent/persona | relationship/delegation | identity/authn | tenant/resource scope | capabilities/actions | selected surface(s) | contract/version | consent/safety | observability/audit | status/owner/next step | acceptance/revisit trigger`.
>
> **BLOCKED until (when applicable/selected):** actor and authority are explicit · each exposed capability has an owner, schema, authz, safety policy, and observable outcome · the selected API/CLI/MCP/WebMCP adapter reuses the application capability core · allowed/denied/cross-tenant paths and high-impact controls are tested · version/discovery/rollback/telemetry are planned · greenfield omissions are explicitly accepted; otherwise record evidence-backed `NOT-APPLICABLE` or `DEFER-AS-OPPORTUNITY`.

---

## SYNC:ai-agent-as-user-access:reminder

**IMPORTANT MUST ATTENTION** Greenfield strongly recommends treating AI agents as first-class non-human actors from inception; choose evidence-backed API/CLI/MCP/WebMCP/event/SDK surfaces over one application capability core with authorization, consent, schemas, idempotency, audit, contract tests in the project's native format (GWT is one option), and observability. Big feature and architecture review are optional/advisory: inspect evidence, adapt, defer as an owned opportunity, record `NOT-APPLICABLE`, or block safety gaps; never build every surface or assume agent = administrator.

---

## SYNC:review-principle-awareness

> **Review Applicability / Current-Principles Awareness** — Every review must first classify the change context (greenfield foundation, brownfield feature/refactor, test/docs/config/UI/infra, or actor-facing/machine surface) and take notice of the applicable current principles below. This is an evidence-gated applicability check, not a mandate to flag or build every item.
>
> **Detailed protocol routing — read/apply only when warranted:**
> - `SYNC:scale-ready-foundation` — greenfield foundation is blocking; big-feature brownfield fit/adapt/defer; architecture review is advisory when auditing. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`.
> - `SYNC:test-architecture-execution-contract` — assertion-bearing tests use the project's configured/native format, name the guarded intent/technical contract, and assert an owned outcome; GWT is one valid format. Detailed carriers: `integration-test`, `workflow-greenfield-init`, and the test-architecture review path.
> - `SYNC:ai-agent-as-user-access` — when an AI/machine actor or future contract is evidenced, inspect identity/delegation, capability boundaries, selected API/CLI/MCP/WebMCP/event/SDK surface, safety/consent, audit/observability, and native-format contract tests. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`, `architecture-review`.
> - `SYNC:design-system-check` — when UI changes, inspect the design-system and component-contract obligations; route visual/UX depth to the owning UI review.
>
> **Review behavior:** Check only principles applicable to the reviewed scope; record `APPLY-NOW`, `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, `BLOCKED`, or `UNVERIFIED` with `file:line`/config/CI evidence, status/severity, owner/route, and next step/revisit trigger. Do not invent findings from a generic checklist, flag unrelated pre-existing gaps as regressions, silently expand the requested scope, or mutate a parent gate merely because advice exists.
>
> **Ownership:** `changes-review` coordinates the applicability pass and routes depth to the owning specialist (`architecture-review`, `integration-test-review`, `security-review`, `performance-review`, `ui-review`, `production-readiness-review`, or another matching review). A specialist reports its own lens and does not duplicate or override another review's verdict; existing brownfield gaps stay advisory unless new, safety-relevant, or explicitly in scope.
>
> **Required review note:** `context/scope | principle/protocol checked | evidence | status/verdict | severity | owner/route | next step/revisit trigger`.
>
> **BLOCKED when:** an applicable principle is required for safety/correctness but missing, unowned, or untestable. Otherwise record an evidence-backed `NOT-APPLICABLE`, advisory, `DEFER-AS-OPPORTUNITY`, or `UNVERIFIED` result according to the lifecycle and change context; creating a greenfield foundation remains subject to its own blocking protocol.

---

## SYNC:review-principle-awareness:reminder

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

---

## SYNC:harness-setup

> **Harness Engineering** — An outer agent harness has two jobs: raise first-attempt quality + provide self-correction feedback loops before human review.
>
> **Controls split:**
>
> | Axis        | Type          | Examples                                                                      | Frequency        |
> | ----------- | ------------- | ----------------------------------------------------------------------------- | ---------------- |
> | Feedforward | Computational | `.editorconfig`, strict compiler flags, enforced module boundaries            | Always-on        |
> | Feedforward | Inferential   | `CLAUDE.md` conventions, skill prompts, architecture notes, pattern catalogs  | Always-on        |
> | Feedback    | Computational | Linters, type checks, selected architecture tests, fault/mutation checks where useful, CI gates | Local/commit → CI |
> | Feedback    | Inferential   | `/code-review` skill, `/production-readiness-review`, `/security-review`, LLM-as-judge passes         | Post-commit → CI |
>
> **Test-strength evidence — protect intent, choose signals by risk and fit.** Line coverage is a diagnostic: low coverage can reveal untested areas, while high coverage does not prove assertions protect behavior. Do not make a mutation score, property-test tool, or manual defect-seeding exercise a universal build gate. For important or high-risk invariants, choose useful evidence supported by the project's stack and budget: assertion-intent review, targeted mutation/fault injection, property/metamorphic checks, contract checks, or a focused defect-seeding probe. If a sensor is automated, gate only on a meaningful threshold the team can maintain; record what it proves and its limits. See `SYNC:engineering-foundation-gate` **F4** for the profile-aware foundation check.
>
> **Three harness types:**
>
> 1. **Maintainability** — Complexity, duplication, line-coverage (diagnostic only — never a gate), style. Easiest: rich deterministic tooling.
> 2. **Architecture fitness** — Module boundaries, dependency direction, performance budgets, observability conventions, and **build scalability** (an unchanged module is not rebuilt; the affected-only set is computable because dependencies are declared; cache hit-rate is measured, not assumed). Build scoping belongs here because it is enforced by the same boundary declarations — unenforced boundaries decay until the affected set is "everything".
> 3. **Behaviour** — Functional correctness. Assert important owned outcomes; add mutation, property, contract, or change-coverage sensors when their benefit and tool support justify them. Line coverage stays a diagnostic.
>
> **Keep quality left:** pre-commit sensors fire first (cheap), CI sensors fire second, post-review last (expensive).
>
> **Research-driven:** Never hardcode tool choices. Detect tech stack → research ecosystem → present top 2-3 options → user decides. Enforce strictest defaults; loosen only with explicit approval.
>
> **Harnessability signals:** Strong typing, explicit module boundaries, opinionated frameworks = easier to harness. Treat these as greenfield architectural choices, not just style preferences.

---

## SYNC:two-stage-task-review

> **Two-Stage Task Review** — Both stages MUST ATTENTION complete before marking task done.
>
> **Stage 1: Self-review** — Immediately after implementation:
>
> - Requirements met? No regressions? Code quality acceptable?
>
> **Stage 2: Cross-review** — Via `code-reviewer` subagent:
>
> - Catches blind spots, convention drift, missed edge cases
>
> **NEVER skip Stage 2.** Self-review alone misses 40%+ of issues.

---

## SYNC:web-research

> **Web Research** — Structured web search for evidence gathering.
>
> 1. Form 3-5 specific search queries (not generic questions)
> 2. Use WebSearch for each query, collect top 3-5 sources
> 3. Validate source credibility (official docs > blogs > forums)
> 4. Cross-validate claims across 2+ sources before citing
> 5. Write findings to research report with source URLs
>
> **NEVER cite a single source as authoritative. Always cross-validate.**

---

## SYNC:graph-impact-analysis

> **Graph Impact Analysis** — When `.code-graph/graph.db` exists, run `blast-radius --json` to detect ALL files affected by changes (7 edge types: CALLS, MESSAGE_BUS, API_ENDPOINT, TRIGGERS_EVENT, PRODUCES_EVENT, TRIGGERS_COMMAND_EVENT, INHERITS). Compute gap: impacted_files - changed_files = potentially stale files. Risk: <5 Low, 5-20 Medium, >20 High. Use `trace --direction downstream` for deep chains on high-impact files.

---

## SYNC:ui-wireframe

> **UI Wireframe** — Inspect supplied design inputs with available tools; if they cannot be accessed, state the gap. Choose a representation that fits the task (sketch, text layout, diagram, prototype, or ASCII). Describe component owners using the project's taxonomy or observed boundaries; do not impose tiers. Reuse a component when its behavior and platform fit; explain meaningful deviations. Include only the states, tokens, and supported layouts relevant to the scope. Detail level varies by skill (idea=rough, story=full decomposition).

---

## SYNC:ui-wireframe-protocol

> **UI Wireframe Protocol** — (1) Inspect supplied design inputs using available tooling; record inaccessible sources. (2) Choose a representation that fits the work: sketch, text layout, diagram, prototype, or ASCII. (3) Inventory components using the project's documented ownership taxonomy, or describe actual owners and boundaries when none exists. (4) Capture the user states relevant to the requirements and platform. (5) Apply configured design tokens, layout rules, and supported sizes where present; otherwise record the decisions the work needs. Search for existing components and explain reuse or deviation based on fit. Progressive detail by skill level (idea=sketch, story=full decomposition).

---

## SYNC:knowledge-graph-template

> **Knowledge Graph Template** — For each analyzed file, document: filePath, type (entity, command, query, event handler, controller, consumer, component, store, service, or repository-specific equivalent), architecturalPattern, content summary, symbols, dependencies, businessContext, referenceFiles, relevanceScore (1-10), evidenceLevel (verified/inferred), abstractions, and moduleContext. Investigation fields: entryPoints, outputPoints, dataTransformations, errorScenarios. Messaging fields: messageName, messageProducers, crossBoundaryIntegration. UI fields: componentHierarchy, stateManagementStores, dataBindingPatterns, validationStrategies.

---

## SYNC:module-detection

> **Module Detection** — Detect target module from PBI/idea keywords. Match against the directory names under the business spec root (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) and load `<that root>/{module}/` for domain rules. If ambiguous, ask user. The module list is DERIVED by listing that root at run time — hardcode neither a module name nor the root itself.

---

## SYNC:ba-team-decision-model

> **BA Team Decision Model** — 2/3 majority vote: Dev BA PIC + UX BA + Designer BA per squad. 2 of 3 agree = decision final. 3-way split = escalate to full squad + Tech Leads + Engineering Manager.
>
> **Technical Veto:** Dev BA PIC can unilaterally veto on: architecture feasibility, dependency correctness, cross-service impact, performance, security. CANNOT veto: UI/UX design, visual design, business value, user research.
>
> **Rules:** Disagree-and-commit after vote. Grooming override requires >75% non-BA squad vote. Record decisions in PBI Validation Summary (member, role, vote, notes).
>
> **Escalation:** Tech uncertainty → Engineering Manager. Business value → PO. Design feasibility → UX BA + Designer BA consensus.

---

## SYNC:refinement-dor-checklist

> **Refinement DoR Checklist** — ALL 8 criteria MUST ATTENTION pass before grooming:
>
> 1. **User story template** — "As a {role}, I want {goal}, so that {benefit}" format
> 2. **AC testable & unambiguous** — State the actor/precondition, trigger/action, and expected outcome in the project's accepted format (GWT is one option). No "should/might/TBD/various/appropriate". Min 3 scenarios (happy, edge, error) + 1 auth scenario
> 3. **Releasable outcome defined** — one actor-facing outcome with an entry-to-result journey, visible/persisted truth, applicable access/failure/recovery behavior, scope, and evidence; enabling work is attached rather than emitted as a technical-only PBI
> 4. **Full-flow wireframes/mock app attached** — UI features: `## UI Layout` or mock-app evidence covering every required page/view, navigation edge, common/domain/page component, applicable state, and end-to-end demo flow. Backend-only: explicit "N/A" plus no-UI reason
> 5. **UI design ready** — Visual design + component decomposition tree + design-spec linked (`/design-spec` artifact or inline UI specs in `## UI Layout`) for any PBI with UI work. Backend-only: "N/A"
> 6. **AI pre-review passed** — `/artifact-review --type=pbi` or `/pbi-challenge` returned PASS or WARN (not FAIL)
> 7. **Story points estimated** — Fibonacci 1-21 + complexity (Low/Medium/High). >13 SP → recommend split
> 8. **Dependencies table complete** — Dependency, Type (must-before/can-parallel/blocked-by/independent), Status
>
> **Failure fixes:** Vague AC → specify exact CRUD + roles. Missing auth → add roles × CRUD table. No wireframes → UX BA creates. TBD in AC → replace with decision.

---

## SYNC:graph-intelligence-queries

> **Graph Intelligence Queries** — CLI: `python .claude/scripts/code_graph {cmd} --json`. Use `--node-mode file` first (less noise), then `function` for detail.
>
> | Find                    | Command                                      |
> | ----------------------- | -------------------------------------------- |
> | All callers of function | `query callers_of <fn>`                      |
> | All importers of module | `query importers_of <mod>`                   |
> | Tests covering function | `query tests_for <fn>`                       |
> | Class hierarchy         | `query inheritors_of <class>`                |
> | Full connection network | `connections <file>`                         |
> | Multi-file batch        | `batch-query <f1> <f2>`                      |
> | Full system flow (BFS)  | `trace <file> --direction both --depth 3`    |
> | Find node by keyword    | `search <keyword> --kind Function --limit 5` |
> | Shortest path           | `find-path <source> <target>`                |
>
> **Orchestration:** grep → graph → grep (find files → expand network → verify). Iterative grep↔graph is encouraged.

---

## SYNC:design-system-check

> **Design-System Check** — Before UI work, resolve the applicable design, accessibility, platform, styling, and component references from `docs/project-config.json`, its docs index, and existing code. Read only references that exist and apply to the surface; do not assume a web, mobile, desktop, or component framework.
>
> 1. Follow the configured project design-system docs for visual tokens, components, icons, themes, and interaction patterns where present.
> 2. Read the frontend/UI architecture and styling references that apply to the target surface; BEM, SCSS, stores, API wrappers, and base classes are requirements only when project config or evidence establishes them.
> 3. Use the project's component ownership taxonomy when documented; otherwise record actual owners and boundaries without imposing tiers or base abstractions.
> 4. Reuse or compose components when their behavior and platform fit; record a concrete reason when creating a new abstraction or diverging from an existing pattern.
>
> App-specific paths: check `docs/project-config.json` → `designSystem.appMappings[]` and `contextGroups[]`.

---

## SYNC:project-reference-docs-guide

> **Project Reference Docs Gate (static JIT)** — Run after task-tracking bootstrap and immediately before target/source file reads, grep, edits, tests, or analysis. Project docs override generic framework assumptions; hooks may remind or accelerate this gate, but never prove that it ran.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. **Read the configured project-config file first, if it exists.** Resolve its path through the project-config loader (default `docs/project-config.json`). **The project config is OPTIONAL: a project with no config is a supported, first-class state, not an error.** When it is absent, run on the framework's portable defaults and derive project facts (paths, run commands, conventions, architecture, test and spec layout) from repository evidence — manifests, lockfiles, scripts, CI definitions, directory layout, root instruction files — stating the assumption whenever one is material; do not block, and do not demand a bootstrap route before ordinary work. When it IS present, the minimum valid shape has a non-empty `project.name`; omitted optional capability properties use neutral defaults or skip that capability. A section its author DECLARED but left malformed or incomplete is a configuration error: fail closed on that section and run `/project-init` or `/project-config` before relying on it, because silently substituting defaults would present wrong project facts as authoritative. Use valid config for the adopter's paths, commands, architecture, specs, tests, and workflows, then verify material hints against repository evidence; never assume generic defaults are project facts.
> 3. **Always-on vs task-specific references:** Project initialization owns and ensures the project's `lessons.md` and docs-index inputs at their configured owner paths. Read them under the static project-context contract independently of task-specific `referenceDocs`; do not append them to that selection. For task-specific docs, when the configured `referenceDocs` property is an array, follow it exactly, including subsets and `[]`. When absent, use the runtime capability-aware resolver: its portable baseline plus only configuration- or repository-evidenced capabilities; a minimal project with no capability evidence may resolve to an empty task-specific set. The full scan-target manifest is a registry of metadata/aliases, not a default selection. Resolve configured paths using `docsRoots.projectReference.path` when present (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A custom reference doc declares `filename` and `purpose`, with optional `sections`, `templatePath`, and `scanTarget`. Built-in filenames keep their exact framework-owned target; other custom docs default to manual ownership, while `scanTarget: "generic"` opts one exact selected file into evidence-based scanning. Manual docs are not freshness-tracked or impact-routed. Never infer a target by basename; config and runtime path resolution reject lexical traversal and physical symlink escapes.
> 4. Read selected task-specific docs just in time before target work, then state: `Reference docs read: ... | Not applicable: ...`; an explicit empty selection means no task-specific docs are selected by the catalog. Still honor separately required references named by the active skill or task. An absent project config is not a missing doc: proceed on repository evidence and, at most, OFFER `/project-init` or `/project-config` as an optional one-time recording of those facts. If an always-on input or a selected/otherwise required doc is missing or stale, or a declared config section is malformed, use `/project-init` or the narrow owner route (`/project-config`, `/docs-init`, `/scan --target=<key>`, `/ai-context-refresh`) before relying on that input. If Codex mirrors are stale, use the explicit `/sync-codex` route or its documented `/ai-context-refresh` completion handoff for the active source-authoring task. After compaction, resume, delegation, or material context change, repeat selection and reading; prior conversation and hook output are not proof of current loading.
>
> **Ready when:** scope evaluated, the configured project-config file consulted or its absence recorded and the portable-defaults fallback applied, root always-on inputs are confirmed (completing project initialization if they are missing or stale), the declared task-specific `referenceDocs` selection is applied exactly or, when absent, the runtime capability-aware resolver output is applied (which may be empty), selected docs are read or an explicit empty selection is recorded, and the citation emitted.

---

## SYNC:project-reference-docs-guide:reminder

- **MANDATORY** Before project-specific work, load the OPTIONAL project-config (default `docs/project-config.json`) via its loader. No config is supported — fall back to portable defaults plus repository evidence, state material assumptions, never block. When present: require non-empty `project.name`, use neutral defaults/skips for omitted optional capabilities, and fail closed on a declared malformed section.
- **MANDATORY** Apply an explicit `referenceDocs` array exactly, including `[]`; when absent use only the capability-aware resolver output, which may be empty. Cite `Reference docs read: ...` and note the selected or empty set.
- **MANDATORY** Load detail JUST IN TIME, immediately before the first target read/grep/edit/test — a hook event or a prior turn is NEVER evidence that the current files were read. Re-resolve selection and re-read after compaction, resume, delegation, or a context change.
- **MANDATORY** The project-init-owned `lessons.md` and docs-index inputs are always-on at their configured owner paths, read independently of task-specific `referenceDocs`. A missing/stale root instruction file or required reference doc, or a malformed declared config section → auto-run `/project-init` (or the narrow lower-level route) before relying on that input. An absent config never gates work — offer `/project-init` or `/project-config` once. Project config and conventions override generic framework defaults.

---

## SYNC:project-protocol-overlay

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

---

## SYNC:project-protocol-overlay:reminder

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

---

## SYNC:shared-protocol-duplication-policy

> **Shared Protocol Duplication Policy** — Inline protocol content in skills (wrapped in `<!-- SYNC:tag -->`) is INTENTIONAL duplication. Do NOT extract, deduplicate, or replace with file references. AI compliance drops significantly when protocols are behind file-read indirection. To update: edit `.claude/skills/shared/sync-inline-versions.md` first, then grep `SYNC:protocol-name` and update all occurrences.

---

## SYNC:fresh-context-review

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable. A report-only/read-only reviewer never edits source, generated output, or user data: it validates and records the finding/repair handoff, then returns to the caller, which owns the fix and any re-review.
>
> **Why:** The main agent knows what it (or `/feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** After a validated-finding fix cycle, or to satisfy an explicitly declared independent-pass `minRounds`. A review round that finds zero issues ENDS the loop once that persisted minimum is met — do NOT invent a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `Agent` tool calls — use `code-reviewer` subagent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `tmp/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior full review found zero issues AND the persisted `minRounds` is met (no fixes or required independent pass = nothing new to verify)
> - NEVER skip the full review restart after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `Agent` call
> - Continue until a complete full review pass clears that round's exit bar per `SYNC:double-round-trip-review`: **round 1** → zero findings at any severity; **round 2 (and the conditional round 3)** → zero CRITICAL/HIGH/MEDIUM, so a round whose validated findings are ALL LOW ENDS the loop once the persisted minimum is met (list those LOWs as deferred instead of spawning another round). The budget is 2 rounds plus ONE extension to round 3, granted only when round 2 leaves a validated CRITICAL/HIGH open (a failed non-test binary gate counts as CRITICAL); round 3 is the review hard cap. A failing test gate is not budgeted — keep fixing and re-running until the tests pass. If the same validated blocker repeats across 2 full invocations with no progress, escalate via `AskUserQuestion`. **Read-only/report-only role boundary:** when this block is carried by a security auditor or another report-only role, “fix” means return the validated repair proposal to the parent; do not modify source, generated carriers, or user data and do not restart the review locally.
> - Persist completed rounds, repeated blockers, findings and the explicit minimum in the owning run's `review-policy.cjs` record. Resume that record after interruption; target changes invalidate evidence and acceptance but preserve the bounded round budget. In-flight attempt IDs may be session-local; they do not replace or reset completed-round state

---

## SYNC:review-protocol-injection

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 11 protocol blocks VERBATIM, copied WHOLESALE and unmodified. They are the review-tier renderings of their canonical `SYNC:` tags, not literal copies; when a canonical protocol changes, update the matching body here in the same edit. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 11 protocol bodies pre-embedded.

### Subagent Type Selection

- `code-reviewer` — for code reviews (reviewing source files, git diffs, implementation)
- `general-purpose` — for plan / doc / artifact reviews (reviewing markdown plans, docs, specs)

### Canonical Agent Call Template (Copy Verbatim)

```
Agent({
  description: "Fresh Round {N} review",
  subagent_type: "code-reviewer",
  prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Review plan files under {plan-dir}" | "Review integration tests in {path}"}

## Round
Round {N}. You have ZERO memory of prior rounds. Re-read all target files from scratch via your own tool calls. Do NOT trust anything from the main agent beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Spec ↔ Tests ↔ Code Triangulation
DO THIS FIRST — before any per-protocol check below. The review target is the WHOLE PACKAGE, not the diff alone. Read `docs/project-config.json` and resolve `specArtifacts`: a valid profile selects its configured `intent/contracts/evidence` section roles, identifiers, ownership rule, and test-carrier dialects; only an absent profile selects the strict-default business-spec shape (§3 ACs / §4 BRs / §5 invariants / §8 TCs). A malformed or unsupported declaration is `BLOCKED`; never treat it as absent or fall back. Load the governing artifact, its tests, and the changed code TOGETHER, and reason about their mutual consistency BEFORE judging any one in isolation.
1. Locate all three faces: the canonical owner section(s), the tests that guard them, and the production code that implements them. With a native profile, preserve owner path + case/scenario ID + optional variant and resolve each through its configured carrier to the actual test. A missing face is itself a finding (SPEC-GAP / TEST-GAP / DEAD-SPEC).
2. Triangulate pairwise — every disagreement is a finding; classify which face is wrong:
   - code vs spec: behavior the code does that no configured `intent/contracts` rule (or strict-default §3/§4/§5/§8 rule) describes → CODE-EXTRA or SPEC-STALE; a hard contract/invariant with no enforcing path → CODE-WRONG.
   - tests vs spec: a configured native case with no executing assertion, or a test asserting behavior no native rule/case names → TEST-GAP or SPEC-SILENT. Without `specArtifacts`, check strict-default §8 TCs.
   - tests vs code: a changed code path with no covering test → TEST-GAP; a test that still passes against a deliberately broken invariant → WEAK-TEST (apply the mutation thinking in Bug Detection).
3. Hidden-rule capture: any invariant the code enforces but the spec never states (SPEC-SILENT) MUST be surfaced as a finding, added to the profile's configured `intent` or `contracts` section, and linked from its `evidence` section to a native case whose executing assertion is inspected. Without a profile, use strict-default §3/§4/§5/§8 and TC. This is the enrichment loop, never a silent pass.
4. Only after the three faces agree — or every disagreement is logged as a finding — proceed to the per-protocol checks below; when enrichment adds spec/test content, re-review the package against the enriched spec.
NEVER mark review PASS while any spec/test/code face disagrees without a logged finding. The diff is the entry point; the package is the unit of judgment.

### Evidence-Based Reasoning
Speculation is FORBIDDEN. Every claim needs proof.
1. Cite file:line, grep results, or framework docs for EVERY claim
2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
3. Cross-service validation required for architectural changes
4. "I don't have enough evidence" is valid and expected output
BLOCKED until: Evidence file path (file:line) provided; Grep search performed; 3+ similar patterns found; Confidence level stated.
Forbidden without proof: "obviously", "I think", "should be", "probably", "this is because".
If incomplete → output: "Insufficient evidence. Verified: [...]. Not verified: [...]."

### Bug Detection
MUST check categories 1-4 for EVERY review. Never skip.
1. Null Safety: Can params/returns be null? Are they guarded? Optional chaining gaps? .find() returns checked?
2. Boundary Conditions: Off-by-one (< vs <=)? Empty collections handled? Zero/negative values? Max limits?
3. Error Handling: Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
4. Resource Management: Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
5. Concurrency (if async): Missing await? Race conditions on shared state? Stale closures? Retry storms?
6. Stack-Specific: Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
Classify every finding by consequence (never by effort): CRITICAL = immediate material security/safety/data-loss risk or failed binary gate → block; HIGH = material correctness, contract, privacy, or authority risk → must fix; MEDIUM = bounded consequential edge/resilience/maintainability gap → must clear the current round, or escalate with an explicit residual-risk follow-up that does not create a clean pass; LOW = non-blocking polish with no credible present impact → record/defer from round 2; `NOT VERIFIABLE` is unresolved evidence, not LOW.

### Design Patterns Quality
Priority checks for every code change:
1. Consistency and reuse: follow documented local patterns; extract a shared abstraction only when repetition or a demonstrated consumer need justifies its cost. Similar names alone do not require a shared base class.
2. Responsibility: follow the architecture established by project configuration, references, accepted decisions, and existing code. Place behavior with its actual owner; do not presume an entity/service/controller hierarchy or forbid a layer without project evidence.
3. Apply cohesion, coupling, and dependency-management principles when their assumptions fit the project's paradigm. SOLID is useful for object-oriented boundaries, not a mandatory checklist for every language or codebase.
4. After extraction/move/rename: Grep ENTIRE scope for dangling references. Zero tolerance.
5. YAGNI gate: Treat repeated patterns as evidence to evaluate extraction, not a numeric threshold. Extract when a shared reason to change, real consumers, or an evidenced ownership/substitution boundary lowers total change cost; do not create patterns for hypothetical future use.
6. Purpose-oriented naming: Name public or cross-layer abstractions by the capability, domain purpose, or contract consumers rely on—not the current provider, SDK, framework, database, or transport. `IStorage`/`Storage` → `AzureBlobStorage`; use `IAzureStorage` only when Azure-specific semantics are intentionally part of the contract.
7. Contract-fit check: Read callers and every implementation before judging a name; narrow an over-broad abstraction (`IObjectStore`, `DocumentStore`) instead of rewarding a generic name that lies about behavior.
8. Mechanism/generic-name smell: Treat `Manager`, `Helper`, `Utils`, `Data`, `Thing`, `Service`, `Interface`, type decorations, and unexplained abbreviations as review signals—not automatic defects; flag them only when they hide purpose, scope, or responsibility.
9. Concrete implementation names: Provider, strategy, transport, or test-double names are valid on concrete types when they distinguish real behavior (`AzureBlobStorage`, `InMemoryStorage`, `RetryingStorage`); keep those details out of the caller-facing contract unless the contract promises them.
10. Language convention: Preserve local interface syntax and naming style; `.NET` `I` prefixes and Google TypeScript's unmarked interfaces are both valid local conventions.
Anti-patterns to flag: God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

### Logic & Intention Review
Verify WHAT code does matches WHY it was changed.
1. Change Intention Check: Every changed file MUST serve the stated purpose. Flag unrelated changes as scope creep.
2. Happy Path Trace: Walk through one complete success scenario through changed code.
3. Error Path Trace: Walk through one failure/edge case scenario through changed code.
4. Acceptance Mapping: If plan context available, map every acceptance criterion to a code change.
5. Tests Verify Intent: For test/spec changes, verify tests name the protected business rule or invariant and would fail if that intent breaks.
6. Migration Test Exclusion: Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.
NEVER mark review PASS without completing both traces (happy + error path).

### Test Spec Verification
Map changed code to test specifications.
1. Identify the project's test/spec format from existing docs, test-case files, BDD feature files, or spec folders.
2. Every changed code path MUST map to a corresponding test case/spec (or flag as "needs test case").
3. New functions/endpoints/handlers → flag for test spec creation.
4. Migration files are excluded from test/spec creation; schema/data migrations are one-time execution paths, not core application logic.
5. If spec evidence fields exist, verify they point to actual code (file:line, not stale references).
6. Verify each meaningful test case names the business intent/invariant; flag behavior-only cases that only mirror implementation details.
7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
8. If no specs exist for a changed path → log the gap and recommend the project's test-spec workflow.
NEVER skip test mapping. Untested code paths are the #1 source of production bugs.

### Behavioral Delta Matrix
MANDATORY for any bugfix review. Produce input-state × pre-fix × post-fix × delta table BEFORE writing verdict.
- Minimum 3 rows; include at least one row OUTSIDE the original bug report.
- Any "REGRESSION" delta → review returns FAIL until a preservation test is added.
- Narrative descriptions do NOT substitute for the matrix.
Example rows (external-record sync fix):
| Input                 | Pre-fix | Post-fix                  | Delta      |
| --------------------- | ------- | ------------------------- | ---------- |
| Record exists (valid) | Reused  | Always recreated → orphan | REGRESSION |
| Record missing (404)  | Error   | Recreated                 | Fixed      |

### Fix-Layer Accountability
Do not assume the crash site owns the defect. Trace the actual execution and data flow, then fix the component that owns the violated contract.
MANDATORY before ANY fix:
1. Trace the affected path — map the real origin, transformations, boundaries, and observed failure in the surfaces this project uses. Do not invent absent layers.
2. Identify the contract owner — use project architecture and code evidence to find which component is responsible for the invalid state or behavior.
3. Choose the correction point — fix the authoritative owner and retain any validation required at untrusted boundaries. A multi-file correction can be valid; justify it by the contracts each file owns rather than a file-count threshold.
4. Check bypass paths — inspect relevant constructors, adapters, parsers, caches, persistence, or other entry points that actually exist in the affected flow.
BLOCKED until: The affected path is traced; the owner is supported by file:line evidence; relevant consumers and bypass paths are checked; and the correction point fits the project's architecture.
Anti-patterns (REJECT): assuming the symptom site is the owner; scattering workarounds without tracing the contract; assuming the lowest technical layer is always authoritative; removing validation from a real trust boundary to force a single correction point.

### Rationalization Prevention
AI skips steps via these evasions. Recognize and reject:
- "Too simple for a plan" → Simple + wrong assumptions = wasted time. Plan anyway.
- "I'll test after" → RED before GREEN. Write/verify test first.
- "Already searched" → Show grep evidence with file:line. No proof = no search.
- "Just do it" → Still need TaskCreate. Skip depth, never skip tracking.
- "Just a small fix" → Small fix in wrong location cascades. Verify file:line first.
- "Code is self-explanatory" → Future readers need evidence trail. Document anyway.
- "Combine steps to save time" → Combined steps dilute focus. Each step has distinct purpose.

### Graph-Assisted Investigation
MANDATORY when .code-graph/graph.db exists.
HARD-GATE: MUST run at least ONE graph command on key files before concluding any investigation.
Pattern: Grep finds files → trace --direction both reveals full system flow → Grep verifies details.
- Investigation: trace --direction both on 2-3 entry files
- Fix/Debug: callers_of on buggy function + tests_for
- Feature/Enhancement: connections on files to be modified
- Code Review: tests_for on changed functions
- Blast Radius: trace --direction downstream
CLI: python .claude/scripts/code_graph {command} --json. Use --node-mode file first (10-30x less noise), then --node-mode function for detail.

### Understand Code First
HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
1. Search 3+ similar patterns (grep/glob) — cite file:line evidence.
2. Read existing files in target area — understand structure, base classes, conventions.
3. Run python .claude/scripts/code_graph trace <file> --direction both --json when .code-graph/graph.db exists.
4. Map dependencies via connections or callers_of — know what depends on your target.
5. Write investigation to tmp/analysis/ for non-trivial tasks (3+ files).
6. Re-read analysis file before implementing — never work from memory alone.
7. NEVER invent new patterns when existing ones work — match exactly or document deviation.
BLOCKED until: Read target files; Grep 3+ patterns; Graph trace (if graph.db exists); Assumptions verified with evidence.

## Reference Docs (READ before reviewing)
- `.claude/docs/development-rules.md` — canonical development rules, code-quality guidelines, and pre-commit checklist
- `code-review-rules.md`, inside the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path)
- {skill-specific reference docs — e.g., integration-test-reference.md for integration-test-review; backend-patterns-reference.md for backend reviews; frontend-patterns-reference.md for frontend reviews}

## Target Files
{explicit file list OR "run git diff to see uncommitted changes" OR "read all files under {plan-dir}"}

## Output
Write a structured report to tmp/reports/{review-type}-round{N}-{date}.md with sections:
- Status: PASS | FAIL
- Issue Count: {number}
- Critical Issues (with file:line evidence)
- High Priority Issues (with file:line evidence)
- Medium / Low Issues
- Cross-cutting findings

Return the report path and status to the main agent.
Every finding MUST have file:line evidence. Speculation is forbidden.
`
})
```

### Rules

- DO copy the template wholesale — including all 11 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO choose `code-reviewer` subagent_type for code reviews and `general-purpose` for plan / doc / artifact reviews
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

---

## SYNC:spec-tests-code-triangulation

> **Spec ↔ Tests ↔ Code Triangulation** — The unit of review is the WHOLE PACKAGE (spec + tests + code), not the diff alone. Load all three faces together and reason mutual-consistency FIRST, before any isolated per-file check.
>
> 1. **Locate all three faces** for the changed behavior. Resolve `docs/project-config.json → specArtifacts`: use its configured `sections.intent/contracts/evidence`, business owner path, and test-carrier dialects only when valid; use the strict default Feature Spec sections (§3 ACs / §4 BRs / §5 invariants / §8 TCs) only when the profile is absent. A malformed or unsupported declaration blocks and never falls back. Load the tests and production code with the owner artifact; a missing face is a finding (SPEC-GAP / TEST-GAP / DEAD-SPEC).
> 2. **Triangulate pairwise** — classify which face is wrong on every disagreement:
>     - code vs spec → CODE-EXTRA / SPEC-STALE / CODE-WRONG (a hard rule in the configured `contracts` role, or strict-default §4/§5 invariant, with no enforcing path is CODE-WRONG).
>     - tests vs spec → TEST-GAP / SPEC-SILENT; with a native profile, check owner + case/scenario ID + optional variant against the actual executor and inspected assertion, not an ID match alone.
>     - tests vs code → TEST-GAP / WEAK-TEST (a test that survives a deliberately broken invariant).
> 3. **Capture hidden rules** — an invariant the code enforces but the spec never states (SPEC-SILENT) is surfaced as a finding, added to the configured `intent` or `contracts` section and represented in its `evidence` section with a guarding native case/test; without a profile, use strict-default §3/§4/§8 and TC. This is the enrichment loop, never a silent pass.
> 4. **Re-review after enrichment** — when triangulation adds spec content or a test, re-review the package against the enriched spec; converge only when a full pass surfaces no new disagreement.
>
> NEVER mark PASS while any face disagrees without a logged finding. The diff is the entry point; the package is the unit of judgment.

---

## SYNC:repeatable-test-principle

> **Repeatable Tests** — A test suite should produce the same contract result across normal fresh runs and supported concurrency. Use the project's runner and isolation policy; a fixed no-reset database procedure does not fit every harness.
>
> 1. Isolate mutable test data from other tests and runs. Use generated identities when the configured environment shares a namespace or data store; stable IDs are fine in an isolated disposable database or deterministic fixture.
> 2. Cleanup may remove only resources created and owned by that test/run. Use transactions, ephemeral databases, namespaces, teardown, or additive fixtures according to the project's harness; never reset shared or user-owned state.
> 3. Make shared fixture setup idempotent when the runner may repeat it. Keep schema/migration testing when it is part of the project contract; follow the project's migration harness and never use rollback assumptions that the production system does not support.
> 4. Verify repeatability at the level required by `integrationTestVerify.guidance`. If absent, use two fresh runs when persistent/shared state or asynchronous effects make one run insufficient; stateful verification must not rely on deleting another run's data.

---

## SYNC:test-data-isolation

> **Test Data Isolation** — Tests MUST remain independent across the concurrency modes the project supports. Stateful suites should not depend on test order or mutate data another test/run owns.
>
> 1. **Use the isolation boundary the harness supports:** transactions, per-test databases/schemas, namespaces, fixtures, or unique data as appropriate. Unique IDs are essential when tests share a namespace; stable IDs are fine inside isolated disposable fixtures.
> 2. **Isolate mutable state when tests can observe or alter it concurrently.** Shared mutable state is safe only when the runner/project provides an explicit isolation guarantee; immutable reference data may be shared.
> 3. **Account for cross-cutting consumers when they are relevant:** a bulk rebuild, recompute, or cascade can rewrite descendants of a shared parent; inspect that path if another test/run's work could affect the assertion.
> 4. **On an intermittent contradiction, test contamination as a competing cause.** Trace the path first, then inspect other writers/consumers of shared state before attributing the wrong outcome to product code.
> 5. **Prove the relevant isolation claim with a scoped search.** Inspect other tests and consumers that can touch the shared data in question; do not demand a repository-wide search when the test owns an isolated store/transaction.

---

## SYNC:real-world-fidelity-testing

> **Real-World Fidelity Gate** — MANDATORY when authoring, reviewing, or repairing any integration / E2E / system test.
>
> A test earns trust by reproducing a situation the system can actually meet in production. A scenario that could never occur in real life proves nothing when it passes, and wastes hours when it fails.
>
> 1. **Ask the fidelity question BEFORE writing the setup:** *"Can this sequence, timing, and data actually occur in production?"* If no, the test is mis-specified — fix the SCENARIO, never the assertion.
> 2. **Model only real actor pacing.** Preserve delays present in the real journey; add presentation pacing only when the project contract configures it. Never add a fixed delay to make readiness or settling appear reliable.
> 2a. **Use the runner's synchronization idiom.** Before an action, use the browser/device runner's native wait or an evidenced project helper for applicable readiness and actionability. Bound custom waits and include useful diagnostics; do not require a helper API or object model the project does not use.
> 2b. **Observe → act → observe.** After an action, wait for the expected positive or negative postcondition before the next dependent action, using observable state and the configured runner. Keep the final business assertion in the test. A timeout is a test failure with diagnostics, not permission to weaken the assertion.
> 3. **Wait on a real signal, never a blind sleep.** Find an observable proving the prior step finished — a persisted state change, an audit/version stamp, a queue/worker idle marker, a completion event — and poll until it settles (unchanged across a short stability window). Use a fixed delay ONLY when no observable exists, and say so in a comment. A browser action delay MUST never replace a readiness/actionability wait.
> 4. **Barriers belong in ARRANGE, never in ASSERT.** Waiting for a precondition is fidelity. Widening an assertion's timeout, loosening a comparison, adding a retry around a failing assertion, or skipping the test is masking. NEVER do the latter to force green.
> 5. **Distinguish harness-amplified from real.** Test topologies (shared infra, fan-out consumers, parallel suites, cold starts) can make a rare production race routine locally. Before filing a product defect, state whether the trigger exists in production and at what likelihood.
> 6. **Keep the protected invariant intact.** Improving fidelity must NEVER reduce what the test protects. If a realistic scenario no longer exercises the rule, the rule needs a DIFFERENT realistic scenario — not a weaker assertion.
> 7. **Deliberate impossible-state tests are allowed, but MUST be labelled.** Corruption-repair, migration, and fail-safe tests intentionally construct states production should never reach; comment WHY the state is reachable (upstream bug, partial write, legacy data), so they are never confused with unrealistic setups.
> 8. **Visible browser evidence is part of fidelity.** When the project contract calls for human-QC on a web surface, use its configured visible browser runner or control path when supported; attach runtime/network listeners before interaction and capture/read the configured screenshots, traces, or video. Follow the runner's native waits or an evidenced bounded project helper, and redact sensitive evidence. An unread artifact is not an observation.

---

## SYNC:experience-acceptance-contract

> **Experience Acceptance Contract** — MANDATORY when a change creates or changes a user-facing or externally observable surface. This is a review-and-evidence contract, not a claim that an agent can make a product correct.
>
> 1. **Classify the surface from project evidence:** web, mobile, desktop, terminal, API, library, background service, generated output, or another configured kind. Record `APPLICABLE`, `NOT-APPLICABLE — <reason + evidence>`, or `ENVIRONMENT-BLOCKED — <missing capability + evidence>`. Never infer a browser, device, GUI, service, or interactive runner from this skill or from a screenshot.
> 2. **Read intended purpose first:** use the governing spec, acceptance criteria, API/CLI/library contract, design artifact, or documented operator outcome. State the actor, job, expected result, important states, and unchanged behavior before exercising the implementation.
> 3. **Exercise the running/observable feature when applicable:** bring the surface up as a WHOLE running system first — backing services, then the surface — gated on a POLLED readiness signal (a started process, an open port, or a fixed sleep is not readiness), then drive it through the real interface a user has, never an internal call or a direct state write. Use the project's configured entry point and runner/tool; perform the intended journey and relevant failure, empty, loading, offline, permission, recovery, or boundary states. For non-visual surfaces inspect the actual response, transcript, return value, persisted state, emitted message, or generated artifact. Never weaken the system to get it up — a stubbed dependency or disabled auth makes every later observation evidence about a system nobody ships — and tear down only what you started. Source reading, test-writing, and screenshot generation alone are not exercise evidence.
> 3a. **Resolve E2E execution from one project contract:** when `e2eTesting.execution` exists, resolve `surfaceIds[]` to `experienceVerification.surfaces[]`, then use that surface's `localRun` for dependency/start/readiness/log/teardown. Use the E2E profile only for auth/data/browser/evidence/convergence facts. When a field is absent, derive it from repository evidence and cite the source; if the capability remains missing, record `ENVIRONMENT-BLOCKED` rather than inventing a port, account, seed, selector, or command.
> 3b. **Browser interaction synchronization:** for an applicable web surface, use the project's configured browser runner and waiting strategy. Synchronize each UI-control action with observable readiness and postconditions using the runner's native waits or a configured helper; waits should be bounded and diagnostic. Apply action delays only when the project contract configures them. Attach console/page-error/request capture before the first interaction and redact sensitive evidence before persistence.
> 3c. **Human-like observation loop:** record each relevant precondition, action, expected result or error, synchronization signal, and evidence. A passing final screen does not excuse an unread runtime error or a missing observation required by the project's E2E contract.
> 4. **Inspect evidence, do not merely produce it:** a screenshot, video, DOM/tree dump, terminal transcript, API payload, or artifact must be opened/read and tied to an observation. Record exact command/tool, entry point, identity/fixture, platform/device/viewport/locale/network conditions, actions, settle signals, timestamps, and evidence references. Redact secrets.
> 5. **Separate evidence levels:** `OBSERVED` is directly witnessed; `JUDGED` is an agent assessment against the stated purpose; `HUMAN-ACCEPTED` is an explicit named owner/human decision linked to the evidence and intent; `UNVERIFIED` means required evidence was not collected; `ENVIRONMENT-BLOCKED` means applicable review could not run; `NOT-APPLICABLE` means the surface does not exist. Agent confidence is metadata, never acceptance or proof.
> 6. **First-run rule:** without an accepted expectation, report candidate evidence and `ACCEPTANCE-PENDING`. Never save the current screen/output as an expected baseline merely because it was generated or because an automated test passed. Promotion requires an explicit acceptance record naming the accepting person/role, timestamp, intent reference, evidence references, scope, and residual risk where relevant.
> 7. **Mismatch rule:** preserve the previous accepted expectation. Classify a difference as `POTENTIAL-REGRESSION`, `INTENDED-CHANGE-PENDING-ACCEPTANCE`, `TEST-CONDITION-INVALID`, `ENVIRONMENT-BLOCKED`, `UNVERIFIED`, or `AMBIGUOUS`. Do not update snapshots, fixtures, assertions, or generated expectations to make a failure green. Intended changes require renewed exercise and explicit acceptance; unaffected cases retain their protection.
> 8. **Automation boundary:** ordinary regression tests and application operation remain deterministic and model-free. Development-time agent review may create evidence and a report, but it must not silently approve, rewrite expectations, or claim human acceptance. A missing runner/capability is an honest limitation, not a successful verification.
> 9. **Runtime signals and visual evidence are exercise channels:** capture the configured runtime log stream from BEFORE the first interaction until teardown — browser console messages, uncaught exceptions, unhandled promise rejections, and failed network requests for a web surface; process stdout/stderr and other configured log sources otherwise. Capture visual states and viewports only when the project evidence contract or an explicitly requested visual review requires them; otherwise use evidence appropriate to the observable contract. Read all required captures: an unread artifact is a file, not an observation, and an empty runtime capture proves nothing unless you show the listener was attached. A runtime ERROR, uncaught exception, unhandled rejection, or journey-critical failed request is a DEFECT even when the output looked correct; a WARNING is advisory and never blocks acceptance on its own. Never silence, filter, level-raise, or swallow a log to clear it, and never invent a measurement the capture cannot give — that is fixing the evidence, not the defect.

---

## SYNC:experience-acceptance-contract:reminder

**MUST ATTENTION** classify the configured surface, read intended purpose, bring the whole system up locally and POLL readiness before observing, exercise the actual observable feature through its real interface, synchronize browser/UI actions with the project's configured runner waits and observable pre/postconditions, and apply action delays only when its contract requires them. Capture and READ the runtime log stream and relevant evidence, separate OBSERVED/JUDGED/HUMAN-ACCEPTED/UNVERIFIED/ENVIRONMENT-BLOCKED/NOT-APPLICABLE, preserve old expectations on mismatch, and require explicit acceptance before baseline promotion. A runtime ERROR is a defect even when the output looked right; a WARNING is advisory. Never silence a log, invent a measurement, or infer acceptance from a screenshot, passing test, or agent confidence; ordinary tests remain model-free.

---

## SYNC:e2e-visual-design-contract

> **E2E Visual Design Contract** — Binds when this skill or agent handles visual-review evidence, human-QC of a user-facing visual surface, or visual expectation/baseline updates; for non-visual E2E/API/CLI work state `N/A — no user-facing visual surface` and do not invent a design review.
>
> 1. **Resolve authority first.** Read `docs/project-config.json`, its docs index, and the applicable project references for design, accessibility, platform, styling, and components; consult `.claude/docs/design-knowledge.md` and `.claude/docs/design-review-checklist.md` when they apply. Record `N/A` only for a proven absent surface or `ENVIRONMENT-BLOCKED` for an applicable missing configured capability — never invent tokens, components, breakpoints, type, styling conventions, or runner defaults.
> 2. **Use project decisions.** Apply precedence: brief/accepted design contract → adopter project design-system/SCSS/frontend docs and ADRs → shared `UI-1.1`–`UI-9.4`, `DD-1`–`DD-8`, and `CL-1`–`CL-6`; surface a genuine conflict with both sides, never silently choose. Read and apply the full shared `SYNC:design-system-check`, `SYNC:ui-ux-design-principles`, `SYNC:design-distinctiveness-gate`, and `SYNC:design-review-checklist` bodies for their applicable roles. When UI generation or repair is in scope, consume the accepted `/design` decisions (or the adopter's equivalent professional design/component system); review-only E2E evidence must not invent a new visual language.
> 3. **Map UI ownership when generation or UI fixes are in scope.** Inventory related screens, flows, and components. Use the adopter's documented component/module taxonomy when one exists; otherwise record actual component owners and boundaries from the code. Reuse or compose abstractions that fit, and record why they do not fit when creating new ones. Preserve ownership of markup, selectors, styling, lifecycle, and tests according to the project's architecture.
> 4. **Separate review owners.** Use `/experience-review` for the running surface and opened/read screenshot evidence; route source-only styling, tokens, accessibility, z-index, component ownership, reuse, and static design findings to `/ui-review`. Apply BEM/SCSS checks only when selected by the project. Never infer source architecture or design tokens from an image, and never treat a passing E2E command as visual/design approval.
> 5. **Capture relevant UI states under the project's evidence contract.** Apply `.claude/skills/shared/ui-state-capture-protocol.md` with the configured `uiStateCapture.mode` and runner capabilities. Capture states and transitions required by the project contract, and report coverage gaps. Use a shared action-level capture helper or evidence manifest when the project selects or already provides that mechanism; otherwise follow its established test/evidence pattern. Mask sensitive or volatile data as required by the evidence policy.
> 6. **Gate every visual round case by case, then synthesize.** Reload the design/UI convention authority BEFORE judging the first image. Open/read ONE capture at a time and append its record — image path, expected delta, observed facts with locations, attributed console output, taxonomy findings or an explicit `none`, verdict — before opening the next. Then reconcile records against the configured evidence index, cluster repeated defects under the actual owner established by the project architecture, report sequence-level findings only visible across captures, and list uncaptured transitions as coverage gaps where the contract requires them. `UIX-BROKEN`/`UNSTYLED`/`OVERFLOW`/`OVERLAP`/`STATE`, `UI-*`/accessibility/layout-floor, and `P0`–`P2` `CL-*` findings are `BLOCKING`; `UIX-POLISH`/`DD-*` identity is `ADVISORY` unless the governing brief/project contract makes it objectively required. A `UIX-CONVENTION` finding cites the authority clause it breaks. Unmeasurable values are `NOT VERIFIABLE`; a missing record is incomplete review, never a clean result; never promote a baseline/expectation automatically.
> 7. **Report the contract.** Persist authority paths and resolution status, component ownership/reuse decisions, required state/transition coverage and gaps, `UI`/`DD`/`CL`/`UIX` coverage or skips, evidence-index path when configured, evidence/read status, and remaining human acceptance; preserve the protected business invariant and exact E2E scope.

---

## SYNC:e2e-visual-design-contract:reminder

**MUST ATTENTION** visual E2E/QC resolves the project design authority first, applies project design-system and frontend decisions plus applicable `UI-*`/`DD-*`/`CL-*` roles, records component ownership using the project's taxonomy or observed boundaries, sends static source findings to `/ui-review` and runtime image evidence to `/experience-review`, captures states and transitions required by the configured evidence contract, reloads the convention docs then reads and records each required capture before synthesizing findings with coverage gaps, treats `UIX`/UI/accessibility-floor findings as blocking and `UIX-POLISH`/DD identity as advisory, never invents measurements, and never auto-promotes baselines; non-visual runs state `N/A`.

---

## SYNC:test-architecture-execution-contract

> **Test Architecture & Execution Contract** — Treat testability as a setup/architecture acceptance condition. Identify the test types and execution modes required by the project contract and task risk; examples include unit, integration/system, E2E, and performance/scale. Record `APPLICABLE` only with evidence of a relevant runner/framework/configuration; otherwise record `N/A — <evidence>` and never fabricate coverage or impose a universal tier threshold.
>
> 0. **Make the protected intent explicit in the project's test format.** Every assertion-bearing test states the behavior or technical invariant it protects and makes its relevant inputs, trigger, and owned outcome understandable. Use `Given / When / Then` when the project's spec/config selects it or when it fits the test; otherwise preserve the project's native organization. Property/fuzz tests may describe an input space or generator and the property checked; harness and mutation tests may use their native contract. Do not rewrite a test solely to adopt a framework-wide syntax.
>    Link the case to the configured owner/case/scenario identity and its `intent` or `contracts` role when `specArtifacts` is valid; when absent, record `Business Intent / Invariant Guarded` (or the technical contract). A malformed declared profile blocks without fallback. Keep one behavior per case and split unrelated outcomes. The final assertion must prove the outcome the test owns, not only an internal call, delivery bookkeeping, or setup side effect. Fixture/runner glue is exempt only when it contains no test assertion; every assertion-bearing test entry point is in scope. Convert legacy brownfield cases when touched; a broader migration is a named owned opportunity, while a safety-critical case without clear phases is `BLOCKED`.
>
> 1. **Matrix before implementation:** For each required test type, record applicability, owner, runner/framework, test root, fixture/data strategy, full command, focused/partial command, zero-match behavior, CI gate, a simple/platform-appropriate entry point when useful, each supported execution mode, and the environments the project promises to support.
> 1a. **E2E profile handoff:** For E2E, also record the selected `surfaceIds[]`, the linked `localRun` owner, auth mode/reference, seed/data mode, browser runner/engine/headed setting, action-delay policy, evidence root/capture/redaction policy, and convergence cap. Missing fields remain explicit blockers or N/A; they are never filled from generic browser defaults.
> 2. **Runnable scopes:** Full and focused commands must be copy-ready, fail on invalid or zero-match selections, report exact counts and exit status, and be safe to repeat. E2E uses configured browser/service commands and the project's documented synchronization strategy. Browser UI actions should wait for bounded, observable readiness and outcome conditions using runner-native waits or a configured helper; apply action delays only when the project contract specifies them.
> 2a. **E2E organization gate (when E2E is applicable):** Inspect the configured/discovered local test organization and reuse it — fixtures, shared helpers, scoped locator handles, page objects, or another evidenced structure. Record actual owners and boundaries; describe tiers or base abstractions only when the project uses them. A Page Object Model is one valid pattern, never a universal requirement.
> 2b. **E2E reuse and DRY gate:** Keep shared lifecycle, locator, readiness, auth, data, and evidence behavior at the project's existing reusable owner; keep final outcome assertions in the test. Reuse or compose existing helpers/objects before creating new ones, preserve one canonical owner for each selector/action/wait, and treat duplicated wrappers or setup as a review signal; use occurrence counts only as evidence, and extract when a shared owner reduces change cost without crossing project boundaries.
> 2c. **E2E test layering:** Test reusable shared behavior at its actual owner where the harness supports it; feature tests cover user outcomes and local composition. Do not invent component tiers or require lower-tier contract tests when the project has no such model.
> 2d. **E2E synchronization:** Use bounded runner-native waits or the configured project helper for observable preconditions and postconditions where the runner supports them. Include useful timeout diagnostics; keep the final business assertion in the test and avoid fixed sleeps as readiness evidence.
> 3. **Fresh valid state (when mutable or shared state applies):** Isolate each test/run using the project's supported setup and public paths where applicable. Use unique identities for shared mutable data, realistic valid data for behavior under test, and idempotent/restart-safe setup when fixtures or seeders can persist. Intentional accumulation is additive and integrity-checked; never hide contamination with destructive reset.
>    Run-scoped cleanup, when supported, is opt-in and idempotent: after evidence capture it may remove only ephemeral resources owned by the current run; it must never delete persistent/additive data or another run's data, reset shared state, or replace no-reset proof.
> 4. **Isolation and fidelity:** When tests touch mutable/shared state, isolate their data and parallel workers; share only immutable/reference data. Use realistic input and observable arrange barriers where the behavior depends on them. Do not widen retries or weaken assertions to make a scenario pass.
> 5. **Evidence gate:** Report command, scope, relevant identity/data mode, exact result, and repeat proof. For persistent-state suites, verify repeatability without destructive reset at the level required by the project gate. Treat line coverage as diagnostic only; use meaningful property/invariant, mutation, change, or behavior signals when supported by the project's tooling.
> 6. **Execution modes and environment reach:** Exercise each mode and environment the project declares it supports (for example host/container or local/CI); parameterize supported targets when that fits the existing test architecture instead of maintaining needless forks. Record unexercised declared capabilities as a gap. A production-shaped target is applicable only when the project requires it; tests that can reach production need an enforced safe scope, and must report `ENVIRONMENT-BLOCKED` when it is missing. Pin dependencies and declare external prerequisites where the project's reproducibility contract requires them. Depth → `SYNC:engineering-foundation-gate` **F1/F2/F3**.
>
> **Ownership:** Architecture/harness defines the matrix; scaffold/workflow makes it runnable; test writers implement tier-specific cases; reviewers verify the contract; the runner reports; seed-data owners preserve uniqueness, idempotency, realism, and accumulation integrity. Missing required evidence blocks setup completion.

---

## SYNC:test-architecture-execution-contract:reminder

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

---

## SYNC:fix-layer-accountability

> **Fix-Layer Accountability** — Do not assume the crash site owns the defect. Trace the actual execution and data flow, then fix the component that owns the violated contract.
>
> AI default behavior: see error at Place A → fix Place A without tracing. This can treat a symptom while leaving its cause in place.
>
> **MANDATORY before ANY fix:**
>
> 1. **Trace the affected path** — Map the real origin, transformations, boundaries, and observed failure in the surfaces this project uses. Do not invent absent layers.
> 2. **Identify the contract owner** — Use project architecture and code evidence to find which component is responsible for the invalid state or behavior.
> 3. **Choose the correction point** — Fix the authoritative owner and retain validation required at untrusted boundaries. A multi-file correction can be valid; justify it by the contracts each file owns rather than a file-count threshold.
> 4. **Check bypass paths** — Inspect relevant constructors, adapters, parsers, caches, persistence, or other entry points that actually exist in the affected flow.
>
> **BLOCKED until:** `- [ ]` The affected path is traced `- [ ]` Contract owner supported by `file:line` evidence `- [ ]` Relevant consumers and bypass paths checked `- [ ]` Correction point fits the project's architecture
>
> **Anti-patterns (REJECT these):**
>
> - "Fix it where it crashes" without tracing — the observed failure site may not own the violated contract.
> - "Add defensive checks at every consumer" without evidence — scattered workarounds can hide an uncorrected source defect.
> - "Always fix at the lowest layer" — a lower layer may not own the contract; prove ownership from this project's architecture.

---

## SYNC:context-engineering-principles

> **Context Engineering Principles** — Research-backed principles for prompt quality. Source: Anthropic prompt engineering guide, Stanford "lost-in-the-middle" research, 2025-2026 LLM context optimization studies.
>
> 1. **Primacy-Recency Effect** — LLM performance drops 15-47% for middle-context information (Stanford). AI attention peaks at first/last 10% of text. **Action:** Place the 3 most critical rules in both the first 5 lines AND the last 5 lines of every prompt. Queries at end improve quality by up to 30% (Anthropic).
> 2. **High-Signal Density** — Anthropic: _"Identify the smallest collection of high-signal tokens that maximize the probability of the desired outcome."_ **Action:** Every line should change AI behavior. If removing a line doesn't change output → cut it. Target ≥8 rules (MUST ATTENTION/NEVER/ALWAYS) per 100 lines.
> 3. **Context Rot** — LLM performance degrades as context length grows — even when all content is relevant. Compression (5-20x) maintains or improves accuracy while saving 70-94% tokens. **Action:** Compress aggressively. Shorter, denser prompts outperform longer, diluted ones.
> 4. **Structured > Prose** — Tables, bullets, XML/markdown parse faster than paragraphs. Constrained formats reduce error rates vs free-text. **Action:** Convert narrative to tables/bullets. Use markdown headers for semantic sections.
> 5. **RCCF Framework** — Modern LLMs (2025+) already know how to reason. What they need: **R**ole (personality), **C**ontext (grounding), **C**onstraints (guardrails), **F**ormat (structure). Constraints and format matter more than verbose instructions.
> 6. **Checkbox Avoidance** — `[ ]` syntax triggers mechanical compliance — AI ticks boxes without reasoning. Bullet rules force reading and evaluation. **Action:** Replace `- [ ] Check X` with `- MUST ATTENTION verify X`.
> 7. **Example Economy** — 3-5 examples optimal for few-shot; diminishing returns after. **Action:** 1 best example per pattern. Use BAD→GOOD pairs (2-3 lines each) for anti-patterns.
> 8. **Deferred Tool Loading** — Claude Code delays loading tool definitions when they exceed 10% of context window. **Action:** Keep injected docs well under 10% of context budget. Docs exceeding ~3,000 lines are too large for injection — split or compress.
> 9. **Rule Density Verification** — Post-optimization rule count (MUST ATTENTION/NEVER/ALWAYS) must be ≥ pre-optimization count. Compression should preserve or increase density, never decrease it. **Action:** Count before and after every optimization pass.
> 10. **Affirmative Directives** — Models comply with affirmative directives more reliably than prohibitions; a bare "don't X" leaves the correct action unspecified, so the model substitutes an arbitrary alternative. **Action:** State the action to take, not only the action to avoid. Keep `NEVER`/forbidden guardrails for hard invariants — but pair each with the right path ("Do X" not just "Don't do Y").
> 11. **Rationale-Carrying Instructions** — A rule shipped with its reason generalizes to edge cases the rule never enumerated and survives compression; a bare imperative gets misapplied or silently dropped. **Action:** Append a terse `— why: …` clause to every non-obvious rule. The reason names the failure prevented or outcome wanted — never restates the rule.

---

## SYNC:prompt-enhancement-transforms-base

> **Prompt Enhancement Transforms (Base)** — Transforms 1-3 are identical across all `/prompt-enhance` ops (`--op=compress|expand|enhance`). Transform 4 is per-op (conciseness pass for compress/enhance; structural clarity pass for expand) and stays local to each op branch.
>
> ### Transform 1: Inline Summaries for READ References
>
> **Problem:** AI sees `MUST ATTENTION READ file.md` and skips it.
> **Solution:** Add a 2-3 line summary of key rules BEFORE the read instruction.
>
> **Before:**
>
> ```
> MUST ATTENTION READ .claude/protocols/evidence.md
> ```
>
> **After:**
>
> ```
> > **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim requires `file:line` proof.
> > Confidence: >95% recommend freely, 80-94% with caveats, <80% DO NOT recommend.
>
> MUST ATTENTION READ .claude/protocols/evidence.md for full details.
> ```
>
> **Scope rules:**
>
> - `.claude/` protocol files → always add an inline summary (stable, belongs to framework)
> - Files under the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) → NO inline summary (project-specific). Add: `(Hooks may point to this file, but every host must open it directly using docs-index routing when the context is needed)`
>
> ### Transform 2: Top Summary Section
>
> Required structure (first 20 lines after frontmatter):
>
> ```markdown
> > **[IMPORTANT]** TaskCreate instruction...
>
> > **Protocol Name** — [inline summary]. MUST ATTENTION READ `path` for details.
>
> ## Quick Summary
>
> **Goal:** [One sentence — what this skill achieves AND the ultimate outcome it must cause]
>
> **Summary:** [2-4 bullets/sentences — the key important things + the steps AI must notice; the read-this-if-nothing-else digest, distinct altitude from the enumerated Workflow/Key Rules below]
>
> **Workflow:**
>
> 1. **[Step]** — [description]
>
> **Key Rules:**
>
> - [Most critical constraint]
> ```
>
> ### Transform 3: Bottom Closing Reminders
>
> Add at the very end of the file:
>
> ```markdown
> ---
>
> ## Closing Reminders
>
> **IMPORTANT MUST ATTENTION Goal:** [same goal as Quick Summary]
> **IMPORTANT MUST ATTENTION** [echo rule #1 from the top section]
> **IMPORTANT MUST ATTENTION** [echo rule #2]
> **IMPORTANT MUST ATTENTION** [echo rule #3]
> **IMPORTANT MUST ATTENTION** add a final review task to verify work quality
> ```
>
> Pick 3-5 rules AI most commonly violates. Bottom section re-anchors attention after the long middle.

---

## SYNC:category-review-thinking

> **Category Review Thinking** — A thinking framework for reviewing any category of changed files. NOT a fixed checklist — derive concerns from domain knowledge; the examples are starting points only. Your knowledge of the category exceeds any list here — trust it.
>
> **Step 1 — Understand the category's role.** What is this category responsible for in the overall system? What invariants must it uphold? What are its consumer contracts (who depends on it, what do they expect)?
>
> **Step 2 — Read project conventions for this category.** Search for reference docs, style guides, ADRs, or READMEs specific to this area. Grep 3+ existing similar files — extract naming conventions, structural patterns, shared base classes. If no docs exist, derive conventions empirically from existing code.
>
> **Step 3 — Derive concerns from first principles.** Apply all that are relevant; expand beyond this list based on the actual category:
>
> - **Correctness:** Does the logic match the intent? Trace happy path AND error path.
> - **Boundary contracts:** Are interfaces/APIs/events/protocols honored? No implicit coupling introduced?
> - **Project conventions:** Does new code follow the patterns found in Step 2? Evidence-confirmed, not assumed.
> - **Security:** Auth enforced at every entry point? Input validated at boundaries? No secrets in the diff?
> - **Performance:** Unbounded operations? N+1 patterns? Blocking calls in async context? Unindexed queries?
> - **Maintainability:** DRY? Single responsibility? Complexity within reason? Names reveal intent?
> - **Boundary naming:** When the category exposes public or cross-layer types, APIs, events, or modules, verify that names describe the capability, domain purpose, or contract rather than the current provider/framework/transport; concrete adapters may carry those details. Check callers and implementations before flagging a name, and treat generic names (`Manager`, `Helper`, `Utils`, `Data`) as signals rather than automatic violations.
> - **Test coverage:** Are the changed paths covered by tests? Are existing tests still valid after the change?
> - **Documentation:** Do related docs, specs, or READMEs reflect the changes?
>
> **Step 4 — Create sub-tasks and execute.** For each identified concern: create a `TaskCreate` sub-task, work through it with `file:line` evidence, mark done. No findings without proof.
>
> **Illustrative concern examples by category type** (not exhaustive — trust your knowledge beyond this):
>
> - _Server-side logic:_ handler/service structure conventions, validation layer placement, side-effect isolation, cross-service boundary enforcement, data-access layer separation, error propagation strategy
> - _Client-side logic:_ component lifecycle management, resource cleanup (subscriptions, listeners, timers), state management patterns, API integration layer separation, reactive stream composition
> - _Data/Schema:_ migration reversibility (rollback script), lock impact on table volume, backfill idempotency, index coverage for query patterns, deployment ordering
> - _Configuration:_ present in ALL environments? No secrets in diff? App fails fast if config missing (not silently null)? Documented in setup guide?
> - _Infrastructure:_ dev/prod parity? No hardcoded dev values (localhost, debug flags)? Pinned image/dependency versions? CI/CD secret requirements documented?
> - _Styles/Assets:_ follows project naming conventions? Uses design variables/tokens (no hardcoded magic values)? Correct scope (no global side effects from component styles)?
> - _Documentation:_ accurate? Links valid? Examples still match current code/behavior? Covers new scenarios?
> - _Tests:_ assertions verify specific outcomes (not just "no exception")? Idempotent (repeatable N times)? Covers edge cases, not just happy path?
> - _Security artifacts:_ all code paths reach the gate? Negative tests exist (unauthorized denied)? Both enforcement AND display control updated?
> - _Build/Tooling:_ rule changes apply consistently? No exceptions that silently swallow violations? Impact on CI runtime documented?

---

## SYNC:category-review-thinking:reminder

- **MANDATORY** Derive review categories from file language + directory semantics + change nature; create a sub-task per category.
- **MANDATORY** Derive each category's concerns from first principles with `file:line` evidence — never a fixed checklist.

---

## SYNC:systematic-review-batching

> **Systematic Review Batching (map-reduce)** — When a changeset is large, do NOT review files one-by-one. Partition into size-capped batches, fire one specialized sub-agent per batch in parallel, then reduce. This bounds EVERY context — each batch agent AND the orchestrator — so coverage stays complete as file count grows.
>
> **Trigger ladder (one ordered escalation — not competing thresholds):**
>
> 1. **< 10 changed files** → sequential per-file review (default; no batching).
> 2. **≥ 10 changed files** → switch to systematic parallel mode. Announce: `"Detected {N} changed files. Switching to systematic parallel review protocol."` Then: categorize → size-capped batches → flat consolidation.
> 3. **categories > 6 OR files > 40** → additionally insert the hierarchical synthesis tier (below). Everything from rung 2 still applies.
>
> **Step 1 — Categorize.** Group changed files into logical categories derived from the project's actual structure (not forced). Category is the *concern axis*; orient with these examples, derive what fits the repository:
>
> | Category Type | Example Groupings |
> | --- | --- |
> | Agent/Tooling | AI scripts, hooks, skill definitions, workflow configs, linting rules |
> | Root config/docs | Root README, project config, CI/CD pipeline configs |
> | Reference docs | Architecture docs, patterns references, setup guides |
> | Feature/domain docs | Business feature documentation, spec files, ADRs |
> | Backend logic | Service/handler/controller source (infer from project structure) |
> | Frontend logic | UI component/state/API source (infer from project structure) |
> | Data/Schema | Migrations, schema files, seed data |
> | Tests | Unit, integration, E2E test files |
> | Infrastructure | Docker, k8s, CI/CD, cloud manifests |
>
> **Step 2 — Size-capped batches.** One sub-agent per batch of **≤8 files OR ≤2000 diff-lines**, whichever hits first. Category stays the concern axis, but any category exceeding a cap splits into multiple size-capped batches (30 backend files → 4 batches). Size caps — not category caps — make "many files" safe: a category cap alone lets one giant category blow a single agent's context.
>
> **Step 2a — Sub-agent type per batch** (match the batch's dominant concern):
>
> - Code logic (any stack) → `code-reviewer`
> - Security-sensitive changes → `security-auditor`
> - Performance-critical paths → `performance-optimizer`
> - Docs, plans, specs, configs, infra → `general-purpose`
>
> Each batch sub-agent receives: its full file list; `SYNC:category-review-thinking` as its primary thinking model — derive each category's concerns from first principles, NOT a fixed checklist (if the consuming skill does not carry that block, apply category-first thinking directly); project reference docs relevant to its concern (discover via `*patterns*`, `*conventions*`, `*style-guide*`); cross-reference verification instructions (counts, tables, links). All batch agents run in parallel and write findings to `tmp/reports/` (per `SYNC:task-tracking-external-report`); reducers read from disk, never from memory.
>
> **Step 3 — Reduce.**
>
> - **Flat reduction (rung 2, ≤6 categories AND ≤40 files):** the orchestrator collects each batch report, cross-references counts/tables/contracts ACROSS batches, detects gaps visible only across categories (feature in code but missing from docs; new API endpoint with no client call), and consolidates into one categorized holistic report.
> - **Hierarchical reduction (rung 3, > 6 categories OR > 40 files):** insert a mid-tier — each concern gets ONE synthesizer agent that reads only its own batch reports and emits a single concern-synthesis. The orchestrator reads the **concern-syntheses (~5)**, never the raw batch reports — keeping the reducer's context O(#concerns), not O(#files).
>   - **Cross-concern interaction pass (mandatory at rung 3 — closes the synthesis-tier blind spot):** concern-siloed synthesis can drop an interaction spanning two concerns AND two batches (tainted source in data-layer/batch 7 → sink in api/batch 3). So: (a) each concern-synthesizer MUST emit an explicit **"cross-concern interaction candidates"** list — entities/symbols/contracts it touched that plausibly bind to another concern (shared DTOs, event names, table/collection names, exported symbols); (b) the orchestrator MUST run the Step-3 cross-reference/gap step **over those candidate lists across all concern-syntheses**, not only within a batch, before concluding. Without this pass the tier trades completeness for context-bounding on exactly the large diffs it targets.
>
> **Step 4 — Holistic assessment.** With all findings combined, judge: overall coherence as a unified intent; cross-category sync (docs match code? contracts match callers?); risk areas where categories interact; missing doc/spec updates for changed artifacts.
>
> **No silent truncation.** If any cap forces sampling or a batch is dropped for budget, ANNOUNCE the dropped/sampled scope explicitly — bounded coverage must never read as complete coverage.

---

## SYNC:systematic-review-batching:reminder

- **MANDATORY** Large changeset → batch by size cap (≤8 files OR ≤2000 diff-lines), one parallel sub-agent per batch; never review many files one-by-one.
- **MANDATORY** > 6 categories OR > 40 files → add the hierarchical synthesis tier; each concern-synthesizer emits cross-concern interaction candidates and the orchestrator runs the cross-concern pass before concluding.

---

## SYNC:severity-rubric

> **Severity Rubric** — Classify every finding by consequence, not by effort, reviewer preference, or how annoying the fix is. One scale applies to every review, skill, agent, workflow, and host so a tier has the same meaning everywhere. Choose the highest credible consequence supported by evidence; do not lower a tier to make a round pass.
>
> **Finding vs observation (required):** An observation becomes a finding only when it names the affected user/system/data/contract, the shipped consequence, the evidence location, and the normalized tier. `INFO`, advice, preference, duplicate wording, or an unsubstantiated concern is not a finding and must not reopen a loop. If the concern might affect a required behavior or gate but evidence is incomplete, emit `NOT VERIFIABLE` with the missing evidence and keep it unresolved; never silently convert uncertainty into LOW.
>
> | Severity | Action | Definition and examples |
> | --- | --- | --- |
> | CRITICAL | Block immediately; escalate | Immediate material risk if shipped: authentication/authorization or safety bypass; secrets/PII exposure; irreversible destructive action; data loss/corruption; or a silent failure on a critical path. A failed binary gate that makes the result untrustworthy is represented as a separate synthetic blocker by the executable policy (not as an ordinary severity judgment). |
> | HIGH | Must fix before PASS/merge | Material correctness or contract risk: wrong behavior on a supported path; violated business/data invariant; meaningful privacy or authority gap; breaking API/schema/compatibility change; likely harm to users/downstream systems; or a missing proof for a behavior-changing fix. |
> | MEDIUM | Must clear the current round; escalate if the fix needs an owner decision | Bounded but consequential risk: an edge case, resilience/observability/testability/maintainability gap, credible future defect, or local architectural drift whose impact is real but not immediate material loss. An explicit follow-up records the escalation/residual risk; it does not make an open MEDIUM a clean pass. |
> | LOW | Record and defer; never open another fix/re-review round from round 2 onward, and never counts toward the round-3 extension | Non-blocking polish with no credible present correctness, security, privacy, authority, availability, or data-integrity impact: wording/formatting, minor documentation or convention drift, optional defensive cleanup, or a cosmetic/refinement suggestion. |
>
> **Consequence decision tree (apply in order):** (1) Is a binary gate failed? Keep it as a separate hard blocker (the executable helper represents it as synthetic CRITICAL); do not use the ordinary severity label to hide what failed. Otherwise, would shipping permit immediate material security/safety/authority harm, irreversible destruction, data loss/corruption, or a critical-path silent failure? → **CRITICAL**. (2) Otherwise, does a supported path, invariant, public contract, privacy/authority boundary, compatibility promise, or behavior-changing proof fail with material user/downstream impact? → **HIGH**. (3) Otherwise, is there a bounded but consequential edge, resilience, observability, testability, maintainability, or architectural gap with a credible impact? → **MEDIUM**. (4) Otherwise, is the evidence sufficient to show only non-blocking polish with no credible present material impact? → **LOW**. (5) If the evidence needed to choose between steps 1–4 is missing, → **NOT VERIFIABLE**, not LOW. When multiple tiers fit, select the highest credible consequence; effort, implementation cost, reviewer discomfort, frequency alone, proximity to the round cap, and whether a tier would unlock or forfeit the conditional round-3 extension never decide the tier.
>
> **Boundary examples (normalize before applying the round predicate):** an auth bypass, exposed secret/PII, destructive command without an authority gate, or failed required test/generation/parity gate is **CRITICAL**; a wrong supported response, broken invariant/API/schema, meaningful privacy/authority defect, or unproven behavior-changing fix is **HIGH**; a bounded retry/timeout/alert/testability gap or credible maintainability drift is **MEDIUM**; a typo, formatting inconsistency, optional cleanup, or cosmetic suggestion proven not to affect present behavior is **LOW**. A missing fact about any of those boundaries is **NOT VERIFIABLE** until evidence or an explicitly documented residual-risk decision exists.
>
> **Classification procedure (required for every finding):** (1) state the affected user, system, data, contract, or gate; (2) assess consequence if the issue ships; (3) assess exposure/likelihood and reversibility/detectability; (4) select the highest tier justified by those facts; (5) cite `file:line` or equivalent evidence and a confidence percentage. Effort, implementation cost, reviewer discomfort, and proximity to the round cap are never severity inputs. `NOT VERIFIABLE` is a pending evidence state, not one of the four tiers and never a LOW escape hatch: if the unresolved claim could affect required behavior, security, privacy, authority, availability, data integrity, or a binary gate, it remains an open evidence blocker until resolved or explicitly owner-accepted with documented residual risk. Classify an item LOW only when evidence supports the absence of credible present material impact.
>
> **Hard-gate rule:** Binary gates (tests, required artifacts, security must-fix checks, generated parity, policy compliance) are not ordinary severity-rated findings. The executable helper records a failed gate as a synthetic CRITICAL blocker solely so one predicate can carry it; the report must still name the gate and failure evidence. A failed gate blocks at every round, including when all ordinary findings are LOW; never disguise a failed gate as LOW. A failed non-test gate counts as CRITICAL for the round-3 extension; a failing test gate is outside the round budget and loops until the tests pass.
>
> **Score-based skills** map their numeric scale onto these tiers — do not invent a parallel vocabulary:
>
> - **0-2 criterion scoring** (e.g. production-readiness-review): `0` = CRITICAL/HIGH (criterion unmet, blocks readiness), `1` = MEDIUM (partial, consequential gap), `2` = pass (no finding). If the criterion is only polish, use LOW rather than forcing a `0`.
> - **Two-axis scoring** (e.g. performance-review, impact × likelihood): high impact + high exposure → CRITICAL/HIGH; material impact with bounded exposure → HIGH/MEDIUM; low impact and low exposure → LOW. Record the axes and why the selected tier is the highest credible consequence.
> - **Scorecards / `/20` grades** (e.g. architecture-scalability-review): the aggregate score and verdict band are separate from finding severity. A sub-80 area is evidence to investigate, not an automatic CRITICAL/HIGH/MEDIUM/LOW label; classify each underlying gap by the consequence decision tree and keep advisory score deductions separate from blocking findings.
>
> **Domain-vocabulary normalization (mandatory):** Specialized skills may keep a local reporting vocabulary, but it MUST feed this same four-tier round predicate — never a second severity system:
>
> - `BLOCKED`, `HARD FAIL`, or `FAIL` is a blocking local verdict, not an automatic CRITICAL label. Classify the underlying consequence as CRITICAL when it is an immediate material risk or failed binary gate; otherwise classify it as HIGH or MEDIUM with evidence, while preserving the local block until the owning gate is satisfied.
> - `WARN` is not permission to ignore a finding. Map it to MEDIUM when the gap is consequential, to LOW only when evidence supports no credible present material impact, or upward to HIGH/CRITICAL when the consequence warrants it. `PASS`/compliant is not a finding.
> - UI `P0`/`P1`/`P2`/`P3`/`P4` map to CRITICAL/HIGH/MEDIUM/LOW/LOW respectively as a starting point; override upward only when the evidence shows a higher shipped consequence. A P0/P1 accessibility or task-completion floor remains a blocking gate even when a local UI report calls it a priority rather than a severity.
> - Numeric SRE/readiness or impact/likelihood scores are evidence inputs, not replacement tiers. Emit the score, the consequence, and the normalized CRITICAL/HIGH/MEDIUM/LOW tier together. `INFO`/advisory observations are not findings unless the evidence shows a material consequence.
>
> A finding's tier drives the gate: CRITICAL/HIGH/MEDIUM remain actionable and blocking under the round policy, and only an open CRITICAL/HIGH at round 2 (a failed non-test binary gate counts as CRITICAL) unlocks the single conditional extension round; LOW may be tracked as a follow-up and, from round 2, does not by itself justify another fix/re-review. An owner decision may explain or schedule an open MEDIUM but does not turn it into a clean pass; owner acceptance never makes a failed binary gate pass and must record scope, rationale, and residual risk.

---

## SYNC:severity-rubric:reminder

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

---

## SYNC:trade-off-interrogation-gate

> **Trade-Off Interrogation Gate** — ALWAYS ask these THREE questions before ANY verdict, score, finding, or recommendation — about the thing under review AND about every recommendation YOU make. — why: naming a benefit without its price is an endorsement, not a review; the costliest trade-offs are the ones nobody wrote down.
>
> 1. **Is there any trade-off?** Name what it SACRIFICES. "None" / "pure win" is an unfinished analysis, NOT an answer — to claim none, state which dimensions you checked and why each is unaffected: future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.
> 2. **Is it worth it?** Weigh gain against sacrifice EXPLICITLY — what is gained (with a metric) · what it costs · WHO pays · WHEN it comes due — then emit **WORTH IT / NOT WORTH IT / UNCLEAR**. "Better" with no metric and no cost FAILS this question. NOT WORTH IT → withdraw or replace the recommendation, never keep it as-is.
> 3. **Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. **MATERIAL** when ANY holds: irreversible / one-way door (data migration, public contract, storage format, vendor lock-in) · cost shifted onto someone else (another team, ops/on-call, future maintainer, end user) · one quality attribute traded for another (correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility) · a boundary crossed (client↔server tier, service contract, event contract, shared library) · a high-consequence path (auth, money, data integrity, breaking change, High/Medium residual risk) · the worth-it verdict is UNCLEAR.
>
> **MATERIAL → STOP and confirm via `AskUserQuestion` BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it via `AskUserQuestion` on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

---

## SYNC:trade-off-interrogation-gate:reminder

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `AskUserQuestion` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

---

## SYNC:subagent-return-contract

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY the structured envelope below. Main agent reads the envelope first, then opens the referenced report for synthesis, acceptance, deduplication, or repair planning; a full report is never pasted inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
> Run ID: [stable run identifier]
> Task ID: [parent task or phase identifier]
> Attempt ID: [monotonic attempt/revision identifier]
> Target: [exact files/paths or scope] @ [target fingerprint/commit]
> Changed paths: [none | exact paths]
> Finding totals: Critical=[n] | High=[n] | Medium=[n] | Low=[n]
> Acceptance: PENDING | ACCEPTED | REJECTED — parent records the decision
>
> ### Findings (Critical/High surfaced — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Gaps / Unverified
>
> - [missing host, runtime, coverage, or evidence limitation]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description, or `none`]
>
> Full report: tmp/reports/[skill-name]-[date]-[slug].md
> ```
>
> The ten-bullet limit is a transport limit, not a visibility limit: the full report may contain more than ten Medium/Low findings when no named blocker exists, and the parent MUST read it when synthesizing or deduplicating. The parent MUST reject a stale, duplicate, or superseded `Attempt ID` and MUST accept the current attempt before advancing a dependent step. Read-only leaves write repair proposals/reports only; they do not edit source, generated carriers, or user files.
>
> **Context budget** — the return payload is a SUMMARY, not a transcript: no raw file contents / full diffs / verbatim logs inline, no re-pasted source. Everything beyond the envelope lives in the incrementally-written report. A sub-agent that would exceed the summary shape MUST persist the detail and return only the pointer; bounded transport must never become bounded visibility.

---

## SYNC:incremental-persistence

> **Incremental Result Persistence** — MANDATORY for every visual-artifact review and for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `tmp/reports/{skill}-{date}-{slug}.md` and record Run ID, Task ID, Attempt ID, target scope, and target fingerprint. When visual artifacts are in scope, also record their ordered inventory and total; identify each screenshot, image, photo, or snapshot by path/name plus state and viewport when known.
> 2. **Checkpoint each review unit:** After each file or section, append findings, evidence, changed paths, and gaps immediately. For visual artifacts, open exactly ONE artifact, inspect it, and append its record BEFORE opening the next artifact. Each record includes artifact identity, state/viewport, inspection status, observations, severity-tagged issues with evidence, an explicit `none` when no issue exists, and any gap. NEVER batch multiple visual artifacts into one later write and never hold their findings in memory.
> 2a. **Resume from disk:** Treat the report's artifact records as the progress ledger. After interruption or context loss, read the report, derive processed and remaining artifacts from the ordered inventory, and continue at the first unprocessed artifact without duplicating completed records.
> 3. **Delegated return:** A sub-agent emits only the structured `SYNC:subagent-return-contract` envelope with exact totals, salient Critical/High findings (maximum ten), current attempt, and `Full report:` path. **Inline user-facing output:** Preserve the skill's requested explanation or teaching, with links to the persisted evidence; the delegated transport limit does not replace that deliverable. Do not paste a full review report into an envelope.
> 4. **Parent synthesis from persisted evidence:** The main agent reads the full report for synthesis, acceptance, deduplication, and repair planning — not only when a named blocker exists. For visual review, reconcile the ordered inventory against the artifact records before concluding; a missing record is incomplete review, never a clean result. Preserve all severities beyond the transport cap.
> 5. **Read-only boundary:** A read-only leaf may write its report/repair proposal but MUST NOT edit source, generated output, or user data; the parent/owner performs repairs after acceptance.
> 6. **Advancement gate:** The parent records `ACCEPTED` for the current Attempt ID only after reconciling target, totals, gaps, and changed paths; stale or late attempts cannot advance dependent work.
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings, and a large image set makes a final batch write especially fragile. Each per-unit disk write survives compaction. Partial results are better than no results, while explicit identity prevents a late result or a resumed image from being mistaken for the current run.
>
> **Report naming:** `tmp/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

---

## SYNC:task-tracking-external-report

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `tmp/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: tmp/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

---

## SYNC:task-tracking-external-report:reminder

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

---

## SYNC:workflow-registry-binding

> **Workflow ⇄ Registry Two-Way Binding** — a workflow is defined in TWO places that MUST agree: the machine registry `.claude/workflows.json` → `workflows.<workflow-id>`, and this skill's `SKILL.md`. Neither is complete alone. Read BOTH before executing, in this order.
>
> **1. Registry → skill (what the registry owns).** Before the first step, read `.claude/workflows.json` → `workflows.<workflow-id>` and treat it as CANONICAL for:
>
> | Registry field | Governs | Rule |
> | --- | --- | --- |
> | `sequence` | the ordered step list | Execute 1:1. NEVER improvise, reorder, add, or drop a step. |
> | `sequence[].applicability` | every conditional step | `when` is the ONLY run condition; on skip, record `skipReason` VERBATIM as the step's evidence. |
> | `sequence[].args` | step flags | Pass exactly as declared. |
> | `parallelGroups` | all-return barriers | Spawn all members in ONE message; advance only after EVERY member returns. |
> | `stepMeta` | inline vs sub-agent, context budget | Overrides the skill's own front matter. |
> | `preActions.injectContext` | mandatory pre-read context | Apply before step 1. |
> | `variants` / `defaultMode` | mode selection | A variant is a COMPLETE sequence; it inherits nothing from the base. |
>
> **2. Skill → registry (what this SKILL.md owns).** The registry declares WHICH steps run in WHAT order; this SKILL.md declares HOW each step executes — protocols, gates, loops, evidence bars, escalation. Each `sequence[].skill` resolves to `.claude/skills/<skill>/SKILL.md`; the workflow's `preActions.readFiles` names this file as the reverse pointer. Read a step's own SKILL.md before running it.
>
> **3. Precedence on conflict.** Registry WINS on step identity, order, args, applicability, barriers and execution mode. SKILL.md WINS on how to perform a step and on the quality bar it must clear. A genuine contradiction between the two — a step in one and not the other, a different order, or an applicability note whose meaning differs — is DRIFT: note the mismatch in your evidence, continue under the precedence above, and report it when the run ends. NEVER silently pick a side, and NEVER edit one side to match without saying so.
>
> **4. Keep both sides equal when editing either.** Changing a sequence, an occurrence ID, or an `applicability` note in `workflows.json` REQUIRES the matching update in this SKILL.md, and vice versa. Specifically: the `**IMPORTANT MANDATORY Steps:**` line MUST remain a clean `->` chain equal to the registry `sequence` (it is parsed, not prose — annotations there break the gate), any conditional step's note here MUST carry the registry's `skipReason` verbatim, and the step-task table's `Conditional?` column MUST match the presence of `applicability`. After editing either side, re-mirror with `/sync-codex` (`node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`).
>
> **Blocked until:** the registry entry for this workflow has been read, its `sequence` reproduced 1:1 into the task list, and every `applicability` condition evaluated with its verdict recorded.

---

## SYNC:nested-task-creation

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] /skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.

---

## SYNC:nested-task-creation:reminder

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

---

## SYNC:parallel-phase-advancement

> **Parallel-Phase Advancement (model-driven)** — How to run AND advance a declared parallel batch of workflow steps. Tool-agnostic: identical under Claude and Codex — neither depends on a hook. Mirrors the universal context-file rule ("Workflow Step Advancement & Parallel Phases" in CLAUDE.md / AGENTS.md).
>
> 1. **Declare the group.** Name the members of the parallel phase up-front — which steps run together, and mark any conditional member with its trigger.
> 2. **Spawn ALL members in ONE message.** Dispatch every member together (multiple `Agent`/sub-agent calls in a single response) — never drip them one per turn.
> 3. **Barrier — advance ONLY after EVERY member returns.** A member is "returned" when its work completes inline OR its sub-agent returns; a conditional member whose trigger is absent counts as returned. Do NOT advance, and do NOT start the next step, until the whole group has returned.
> 4. **A sub-agent return advances the step identically to an inline call.** Advancement is YOUR judgment against the task list — never wait for a hook or tool event. Mark each member `completed` (or "Skipped — <reason>") as the batch resolves.
> 5. **Mutating steps wait for the barrier.** Never start a code-mutating step (e.g. `code-simplifier`) until the full batch has returned — it must act on the complete review snapshot, not a partial one.
> 6. **Hooks are accelerators only.** Any step-tracking hook may emit a "next step" hint as an optimization; correctness MUST NOT depend on it. Claude and Codex both advance from this static rule when hooks are absent, disabled, or stale.
>
> **Blocked until:** `- [ ]` all members spawned in one message `- [ ]` every member returned (incl. skipped conditional) `- [ ]` each member marked completed/skipped `- [ ]` mutating step deferred until after the barrier.

---

## SYNC:parallel-subagent-dispatch

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `Agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `tmp/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

---

## SYNC:parallel-subagent-dispatch:reminder

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

---

## SYNC:critical-thinking-mindset

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

---

## SYNC:critical-thinking-mindset:full

**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

---

## SYNC:ai-mistake-prevention

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Project applicability gate.** Before applying a stack, layer, style, tool, or architecture rule, read the project's config and relevant references, then check local implementations. Treat framework examples as examples; honor explicit N/A and do not require a technology or convention the project does not use.
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

---

## SYNC:critical-thinking-mindset:reminder

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

---

## SYNC:ai-mistake-prevention:reminder

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

---

## SYNC:ai-mistake-prevention:full

## Common AI Mistake Prevention (System Lessons)

- **Resolve project applicability before using framework examples.** Read the project config and relevant references, then inspect local evidence; honor explicit N/A and never impose a language, framework, architecture layer, styling method, tool, or runtime surface the project does not use.
- **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
- **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
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
- **Ownership before action.** When investigating a failure, ask which part owns the behavior before changing anything. Trace the wrong state to the component responsible for its invariant, then make one authoritative correction there.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec if one exists (the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, and state). Verify each against evidence, not intuition. Ask "what would falsify this?" — if nothing, it is not a hypothesis. The most expensive failure is going deeper into an assumed area while the real issue sits in an unexamined condition.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem; avoid unrelated cleanup. For review or enhancement work, announce improvements beyond the main request rather than silently expanding scope. Ask: "Would this change exist if I were not addressing this request?" — if not, remove it or disclose it.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Judge the environment before judging the code — a competing hypothesis, not a fallback.** A bug, failed test, error, or odd output is NOT proof of a code defect. Before deep tracing and before any verdict, sweep environment preconditions (toolchain/dependency/lockfile state, stale build or cache artifacts, env vars and config profile, service dependencies up-migrated-seeded, ports/network/clock, OS-path/locale, permissions and locks, leftover processes/containers/test data) AND transient resource pressure (RAM/OOM, CPU saturation under parallel workers, disk/temp exhaustion, handle and connection-pool limits, network flakiness, a timeout that is really slowness). Tell-tale shape: non-deterministic, timing-dependent, passes alone but fails in parallel, fails only on one machine or only on CI, or an error naming resources rather than business rules. Cite the discriminator you ran (clean environment? did code on the failing path change since it last passed? one machine or all? concurrency 1 or a clean rebuild?) — a verdict without one is a guess, for code as much as for the environment. Fix an environment cause in the environment or setup; NEVER edit product code or weaken/skip a test to absorb it, and a failure that vanishes on retry stays unexplained until its mechanism is named. — why: forcing green against an environment fault hides the real defect and permanently rots the test.
- **Cross-platform execution is a required contract.** Before authoring or changing a tool, script, process launcher, path assertion, or filesystem test, name the supported Windows, macOS, and Linux behaviors. Use platform-neutral Node APIs and literal argv vectors; never infer shell, temporary-path, executable-extension, ACL, or symlink semantics from the current host. Canonicalize existing paths before identity, hashing, or equality checks; test native Windows and POSIX seams when behavior differs; keep CI platform matrices authoritative. Preserve fail-closed security boundaries — repair the fixture or platform branch, never weaken the guard just to make one OS green.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

---

## SYNC:agent-bootstrap

> **Plan first, then act.** Break work into small tasks before editing; keep exactly one task in progress; mark each complete immediately after its evidence lands. On context loss, inspect the existing task list before creating new tasks.
>
> **Context guard / progress file (MANDATORY when task > 5 files or > 3 steps).** Context exhaustion = silent loss of ALL findings; no progress file = no recovery.
>
> 1. **On start:** create `tmp/ck-agent-{ts}-{rnd}.progress.md` — `ts` = current timestamp in `YYYYMMDDHHmmssSSS` (17 digits), `rnd` = random 6-char hex. First line records the session id.
> 2. **After each step:** append findings, marking `[done]` / `[partial]` / `[pending]`.
> 3. **Running out of context?** Write `[partial]` to the file FIRST — NEVER summarize before writing.
> 4. **Producing a report?** Persist it incrementally to `tmp/reports/` and start the final message with its path.
>
> **Blocked until:** task breakdown exists · progress file created when the task exceeds the size threshold.

---

## SYNC:agent-code-standards

> **Development rules.** YAGNI / KISS / DRY. Place behavior with the owner established by the project's architecture and evidence; do not assume a fixed layer order or mapping/constant location. Follow local file naming and layout conventions. Search relevant existing patterns before changing code, and check their fit before reusing them. Read `.claude/docs/development-rules.md` for shared coding standards and quality gates (when present).
>
> **Coding patterns.** Before implementing, read the project pattern references named in `docs/project-config.json` / the docs index (e.g. `docs/project-reference/backend-patterns-reference.md`, `frontend-patterns-reference.md`) — local conventions override generic framework defaults.
>
> **Blocked until:** dev-rules + pattern docs read before writing or changing code.

---

## SYNC:source-test-drift-check

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

---

## SYNC:tc-test-join-evidence

> 1. **The resolved artifact is an executing TEST** — prove suite/project membership, the configured test-carrier row, or an executing assertion, and say which you checked. A corpus search can match production source; a comment citing a case is not execution evidence.
> 2. With a valid `specArtifacts` profile, join by the configured ownership tuple: canonical owner path + native case/scenario ID + optional variant. Trace each tuple to its actual executor and inspect the assertion at `file:line`; preserve configured one-to-many or many-to-many cardinality. A result for several scenarios proves each only when the executor reaches an assertion for every row.
> 3. With no `specArtifacts` profile, use the strict-default TC identity; a malformed declared profile blocks without fallback. In either profile, the resolved test must match the scenario's native preconditions/actions and owned outcome (Given/When/Then when selected); an ID match is a string match, not proof.

---

## SYNC:spec-drift-adjudication

> **Spec drift adjudication (code-wrong vs spec-stale).** Whenever behavior diverges from a canonical owner artifact under the configured business root (`specRoots.business.path`, default `docs/specs`), you MUST NOT silently pick a side. Resolve and validate `specArtifacts` from `docs/project-config.json`: when valid, use its `intent/contracts/evidence` section roles and native case carriers; only when absent, use the strict-default Feature Spec sections (§3 AC, §4 BR, §5 invariant, §8 TC). A malformed or unsupported declaration blocks; never fall back. Adjudicate per `shared/sdd-artifact-contract.md` → **Drift Gates**:
>
> 1. **Detect** — compare the change against the owner's documented intent/contracts and linked evidence. No divergence → record `Spec in sync` and move on.
> 2. **Classify** the divergence:
>    - **CODE-WRONG** — the owner artifact correctly states intended behavior and the change violates it → BLOCKING finding; fix the code/test against intended behavior, creating or updating a regression case in the configured native carrier (strict-default TC when no profile exists).
>    - **SPEC-STALE** — the change is the new intended behavior and the owner now documents the old/wrong behavior → update the canonical owner FIRST through the configured spec workflow, then synchronize its evidence/test carriers. Without a profile, use `/spec [mode=update]`, `/spec [mode=tests]`, then `/spec [mode=sync]`.
>    - **AMBIGUOUS** — intended behavior is unclear → ask the user or canonical spec owner before editing either side.
>    - **SPEC-SILENT** — code correctly enforces an invariant/behavior absent from the owner artifact → not drift but an UNWRITTEN rule. Prove it is always-true (≥2 enforcement points or a rejecting guard), express it as a universally-quantified property, add it to the configured `intent` or `contracts` section, and link it from `evidence` to a native case with an inspected assertion. Without a profile, use the invariant-harvest workflow to add the rule to strict-default §4 (or §3/§5) and a guarding §8 TC. A discovered invariant left only in code or tests is INCOMPLETE.
> 3. **Never normalize drift just because code/tests are green** — green can encode the drift itself. Reconcile to canonical intent, never to whichever side currently passes.
>
> A behavior-changing review/implementation that leaves a spec divergence unadjudicated is INCOMPLETE; an unwritten-but-enforced invariant left uncaptured in the configured owner and case evidence (strict-default §4/§8) is equally INCOMPLETE.

---

## SYNC:test-failure-fault-adjudication

> **Test-Failure Fault Adjudication** — When a test fails (or you are debugging or fixing a failure), the job is to determine *who is at fault — the source code or the test code*. Getting that verdict right matters more than turning the suite green. Binds every debug / fix / test skill identically.
>
> 1. **Provisional verdict before touching either side.** Classify the observed evidence as SOURCE-WRONG, TEST-WRONG, TEST-NOT-OPTIMAL, ENVIRONMENT-BLOCKED, or AMBIGUOUS; then `/debug-investigate` and trace end-to-start before editing. A green-again suite is NOT the goal.
> 2. **Triangulate against the owner artifact AND the source.** Use the business root selected by `specRoots.business.path`, following the framework config loader's fallback only when the project leaves it unset. Resolve `specArtifacts`: when valid, read its configured `intent/contracts/evidence` sections and locate native cases through configured carriers; when absent, use the strict-default §3 AC / §4 BR / §5 invariant / §8 TC sections. A malformed or unsupported declaration blocks without fallback. Inspect the assertion tied to owner + case/scenario ID + optional variant. The canonical intent decides expected behavior — compare BOTH production source and failing test against it. With no spec, use documented intent / acceptance criteria / caller contract and name that limit. Decide from evidence whether SOURCE or TEST is wrong.
> 3. **Classify who is at fault, then fix the wrong side at its root:**
>     - **SOURCE-WRONG** — production code violates the spec's intended behavior or a clear invariant → fix the source at the owning layer; keep or strengthen the test that caught it.
>     - **TEST-WRONG** — the test encodes a stale or incorrect assertion, setup, or expectation that contradicts intended behavior → fix the test at its root. NEVER weaken an assertion, add a skip, or relax a timeout to force green.
>     - **TEST-NOT-OPTIMAL** — intended behavior is valid but the test seam, timing, or assertion signal is fragile → improve the test without weakening the invariant.
>     - **ENVIRONMENT-BLOCKED** — infrastructure, setup, or external state — including transient resource pressure (RAM/OOM, CPU saturation, disk or temp exhaustion, handle and connection-pool limits, network flakiness, a timeout that is really slowness) — prevents a source/test verdict → preserve diagnostics (exact command, exit code, full output, resource evidence), name the environment remedy, and STOP mutating source or tests until the environment is healthy. This verdict is a FIRST-CLASS candidate weighed in step 1 alongside SOURCE-WRONG and TEST-WRONG — never a fallback reached only after the code looks fine; run `SYNC:environment-fault-hypothesis` to rule it in or out with a stated discriminator. A failure that vanishes on retry stays UNEXPLAINED until its mechanism is named — "flaky" is a symptom, not a verdict.
>     - **AMBIGUOUS** — evidence or intended behavior does not safely select an owner → ask the user or canonical owner before editing.
>     - NEVER change a test to match broken source, and NEVER change source to satisfy a broken test. (Migration code excluded — schema/data migrations are one-time execution paths, not core application logic.)
> 4. **Ask the user when intended behavior is unclear.** If no owner artifact covers the behavior, the configured sections are silent, or the owner is ambiguous about which side is correct, STOP and ask the user or canonical spec owner before editing either side — never silently pick source or test just to make the suite pass.
>
> Reconcile to intended behavior, never to whichever side currently passes — green can encode the very bug.
>
> **Read-only/report-only role boundary:** when this block is carried by a report-only role (`code-reviewer`, `spec-compliance-reviewer`, `tester`, and any other agent whose definition declares it never edits source), "fix the wrong side" means RETURN the adjudicated verdict and the proposed repair to the parent — do not modify source, tests, generated carriers, or user data. The adjudication is the deliverable; the edit is the caller's. Without this sentence the block's step-3 imperatives read as write authority and directly contradict those agents' own declarations (e.g. `tester.md` "NEVER implement fixes"), which is the sibling `SYNC:double-round-trip-review` boundary applied to the same class of carrier.

---

## SYNC:spec-loop-discipline

<!-- Canonical home of the Spec-Loop Discipline. Tailored instances live in: the 9 `workflow-*` injectContext blocks (`.claude/workflows.json`) and the code-mutating / review skills (e.g. `plan-execute`, `fix`, `spec`, `integration-test`, review skills). Those instances are TAILORED to each consumer's job, not verbatim copies, so they are NOT `<!-- SYNC:spec-loop-discipline -->`-marked. Edit this canonical first, then propagate the tailored wording. -->

> **Spec-Loop Discipline (spec→code→tests→review→re-review).** When changing or reviewing behavior-bearing code, specs, or tests, enforce the loop:
>
> **Profile gate:** Resolve and validate `specArtifacts` first; use a valid profile's configured sections/carriers, use the strict-default sections only when `specArtifacts` is absent, and block a malformed or unsupported declaration without fallback.
>
> 1. **Properties, not just examples** — capture every hard rule in the configured `contracts` role and each entity invariant as a universally-quantified property ("for ALL inputs in {domain}, {invariant} holds") plus a boundary counter-case. Without `specArtifacts`, use strict-default §4 hard rules and §5 invariants.
> 2. **Hard-to-fake tests** — back each property with a property/metamorphic test. Preserve owner + native case/scenario ID + optional variant and inspect the executing assertion; the test-quality bar for changed core logic is the MUTATION-SCORE gate (a surviving mutant on a changed line = a missing invariant → write the killing test), NOT line-coverage %.
> 3. **Dual feedback** — every behavior-changing finding feeds BOTH the canonical owner (`intent/contracts`) AND test evidence (`evidence` + native case/assertion); a blank Spec-feedback OR Test-feedback cell = INCOMPLETE, never a code-only change. Without a profile, feed strict-default §3/§4/§8 and its TC/test.
> 4. **Re-review to zero** — review the whole package (owner + tests + code, not just the diff); when a cycle discovers an unwritten-but-enforced rule (SPEC-SILENT), capture it in configured `intent/contracts`, link `evidence` to its guarding native case, and RE-REVIEW against the enriched owner. Without a profile, use strict-default §3/§4/§8 and TC. Enrichment is a forced loop, not a terminal write. The loop ends only when a full pass adds no new owner content and surfaces no new gap or hidden rule; each cycle enriches the spec.

---

## SYNC:sub-agent-selection

> **Sub-Agent Selection** — Full routing contract: `.claude/skills/shared/sub-agent-selection-guide.md`
> **Rule:** Route specialized domains (architecture, security, performance, DB, E2E, integration-test, git) to the matching specialist agent (see guide above) — NEVER use `code-reviewer` for these. — why: `code-reviewer` lacks each domain's checklist, so specialized issues slip through.

---

## SYNC:sequential-thinking-protocol

> **Sequential Thinking Protocol** — Structured multi-step reasoning for complex/ambiguous work. Use when planning, reviewing, debugging, or refining ideas where one-shot reasoning is unsafe.
>
> **Trigger when:** complex problem decomposition · adaptive plans needing revision · analysis with course correction · unclear/emerging scope · multi-step solutions · hypothesis-driven debugging · cross-cutting trade-off evaluation.
>
> **Format (explicit mode — visible thought trail):**
>
> 1. `Thought N/M: [aspect]` — one aspect per thought, state assumptions/uncertainty
> 2. `Thought N/M [REVISION of Thought K]: ...` — when prior reasoning invalidated; state Original / Why revised / Impact
> 3. `Thought N/M [BRANCH A from Thought K]: ...` — explore alternative; converge with decision rationale
> 4. `Thought N/M [HYPOTHESIS]: ...` then `[VERIFICATION]: ...` — test before acting
> 5. `Thought N/N [FINAL]` — only when verified, all critical aspects addressed, confidence >80%
>
> **Mandatory closers:** Confidence % stated · Assumptions listed · Open questions surfaced · Next action concrete.
>
> **Stop conditions:** confidence <80% on any critical decision → escalate via AskUserQuestion · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).

---

## SYNC:sequential-thinking-protocol:reminder

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer.

---

## SYNC:goal-contract-satisfaction-loop

> **Goal Contract Satisfaction Loop** — Persist the user goal in an external file, execute against it, and loop review/fix until every saved required criterion passes or a blocker escalates. Bounded closed loop — NEVER open-ended autonomous exploration.
>
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md` (plans root default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
> 2. **Required sections:** Original Request, Purpose, Success Criteria (checkboxes; mark required vs optional), Constraints, Evidence Required, Iteration Log, Goal Satisfaction matrix.
> 3. **Before work:** read the active goal and map planned work to saved success criteria — execution serves the saved criteria, never chat memory alone.
> 4. **After execution/verification:** append an Iteration Log entry — result, evidence references (`file:line`, command output, report path), remaining gaps.
> 5. **Review gate:** emit a Goal Satisfaction matrix — `| Success Criterion | Evidence | Status |` with PASS/FAIL/BLOCKED. Overall PASS requires every required criterion PASS.
> 6. **Loop rule (retry):** required criterion FAIL → validate the gap is real → fix → re-review only the affected criteria. Stop cleanly when all required criteria PASS.
> 7. **Escalation rule (stop):** two consecutive iterations with no criterion progressing, or a blocker needing user input → mark the criterion BLOCKED with a user-facing reason and escalate. NEVER loop indefinitely.
> 8. **Skip rule:** tiny conversational tasks may skip the goal file ONLY with a recorded one-line reason. User-accepted gate skips are recorded in the goal file with reason and scope.
> 9. **Security:** NEVER store secrets, tokens, credentials, or private customer data in goal files — store evidence references and redact sensitive values.
>
> **Blocked until:** active goal resolved (or skip reason recorded) · saved success criteria read before edits · iteration evidence appended after execution · Goal Satisfaction matrix emitted before any PASS verdict.

---

## SYNC:goal-contract-satisfaction-loop:reminder

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

---

## SYNC:session-goal-ledger

> **Session Goal Ledger** — Never lose the user's original request or any later prompt, however long the session runs. Hook-independent: binds every host; a prompt-ledger hook is only an accelerator.
>
> 1. **Pin before acting.** Before the first tool call, write `Original goal: <user's request, verbatim or faithfully condensed>` and keep it as the first task-list item. For workflow or plan work, copy it verbatim into the Goal Contract `## Original Request`.
> 2. **Track every prompt.** Keep `User prompts this session: P1…Pn` — one line per user prompt or input, marked `extends` / `narrows` / `changes` / `answers`. A prompt that changes direction updates the goal explicitly — never silently.
> 3. **Re-anchor.** Re-read the original goal and the prompt list at every workflow step, before delegating (the sub-agent brief carries the verbatim goal), and after compaction, resume, or a `[[prompt-ledger@…]]` reminder. When `tmp/prompt-ledger/<session>/ledger.md` exists it is the durable record — read it after compaction.
> 4. **Verify before done.** Map the final result to the original goal and every prompt: `P# → done | deferred (reason) | not applicable`. An unaddressed prompt blocks completion.
> 5. **Security.** NEVER copy secrets, tokens, or credentials into goal lines, task lists, briefs, or reports — redact them.
>
> **Blocked until:** original goal pinned · prompt list current · final result mapped to every prompt.

---

## SYNC:session-goal-ledger:reminder

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

---

## SYNC:ui-intent-layer

> **[BLOCKING] Capture a tech-agnostic UI/UX intent layer in every UI-bearing spec — a reader must be able to visualize how the feature works without naming any technology.** When the feature has a user interface, the spec MUST ATTENTION carry an interaction-surface section so the application — not just its API — can be rebuilt on any stack:
>
> **Native-first resolution.** A native contract may be declared by config or local references. Before authoring, resolve the configured profile's intent/evidence section roles, logical IDs, and carrier from `docs/project-config.json` (`specArtifacts`) and the required local references, and map every item below onto them. An unresolved owner, role, ID, carrier, or companion link stays `UNKNOWN`/`BLOCKED` — never guessed.
>
> 1. **View Inventory** — list each view/screen by its UX ROLE and purpose (e.g. "list of items", "item editor", "confirmation step") and what information it presents. Describe by role, never by an implementation name.
> 2. **Navigation Map** — how a user moves between views: entry points, transitions, and exits. Trace how this surface connects to neighboring features already in the system.
> 3. **Key observable states** — the distinct states a user can observe per view (empty, loading, populated, error, success, permission-denied, etc.) — described as what the user perceives, not how it is rendered.
> 4. **Per-story action flows** — for each user story, the step-by-step click/action path from intent to outcome, cross-referenced to the logical IDs the configured profile owns.
> 5. **Couple to the companion design artifact** — keep deep visual fidelity (layout, tokens, pixel detail) OUT of the spec; it lives in the linked companion design artifact. Record that artifact's path in the spec frontmatter so the spec stays the navigable hub.
>
> **M1-clean (NON-NEGOTIABLE):** the prose names ZERO frameworks, routes/URLs, CSS, or component-class names — only roles, information, states, and action flows. Technology detail belongs in the companion design artifact, never here.
>
> **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** cross-reference each action flow to the default logical IDs `US-`/`OP-`/`BR-`, and record the companion artifact in the default `design_spec:`/`mockup:` frontmatter keys.
>
> **Skip ONLY** when the feature is backend-only (no UI) — state that reason explicitly in the section.

---

## SYNC:ui-intent-layer:full

> **[BLOCKING] The interaction-surface (UI/UX intent) layer — full authoring + maintenance contract.** A behavior-only spec reconstructs an API, not an application. For true spec-driven rebuild ("recreate the app on any stack, or build an MVP demo"), a UI-bearing spec MUST ATTENTION also capture the stack-agnostic information architecture and interaction model. Author and KEEP IN SYNC:
>
> **Native-first resolution.** A native contract may be declared by config or local references. Resolve the configured profile's intent/evidence section roles, logical IDs, and carrier from `docs/project-config.json` (`specArtifacts`) and the required local references before authoring, and map every item below onto them. An unresolved owner, role, ID, carrier, or companion link stays `UNKNOWN`/`BLOCKED` — never guessed.
>
> 1. **View Inventory** — every view/screen named by its UX ROLE and purpose, plus the information each presents and the primary actions it offers. Group related views into the flows they serve. Describe roles and information, never implementation names.
> 2. **Navigation Map** — the directed connections between views: entry points (how a user arrives), in-feature transitions (which action leads where), and exits. Include how this surface attaches to adjacent existing features so the new surface fits the current system rather than floating apart.
> 3. **Key observable UI States** — per view, the distinct states a user can perceive: empty / first-run, loading / pending, populated, partial, error / recovery, success / confirmation, and permission- or role-gated variants. State each as a user-observable condition, not a rendering mechanism.
> 4. **Per-story action flows** — for each user story, the ordered action path from the user's intent to the observable outcome, with branch points for the key states above. Cross-reference every step to the logical IDs the configured profile owns so the UI layer stays traceable to behavior — never a parallel, drifting narrative.
> 5. **Companion design artifact coupling** — deep visual fidelity (layout grids, spacing, color/typography tokens, exact pixel/responsive detail) does NOT belong in the spec; it lives in the linked `design-spec`/mockup. Record the companion artifact's path in the spec frontmatter so a reader reaches it in one hop, and so the spec remains the navigable hub of the feature.
> 6. **Maintenance contract** — when behavior changes (new story, changed operation, altered rule), update the affected View Inventory entries, Navigation Map edges, observable States, and interaction flows in the same change. An audit that finds behavior without a corresponding interaction-surface entry (or vice versa) reports the layer as stale.
>
> **M1-clean (NON-NEGOTIABLE):** every line names ZERO frameworks, libraries, routes/URLs, CSS, selectors, or component-class names. Use only UX roles, the information shown, observable states, and action flows. Any technology-specific detail belongs in the companion design artifact, never in the spec prose. A spec that names a stack here has broken its tech-free rebuild contract.
>
> **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** cross-reference each action flow to the default `US-` user-story, `OP-` operation, and `BR-` business-rule IDs, and record the companion artifact in the default `design_spec:`/`mockup:` frontmatter keys.
>
> **Skip ONLY** when the feature is genuinely backend-only (no user-facing surface) — and then state that reason explicitly in the section so the skip is auditable, not an omission.

---

## SYNC:ui-intent-layer:reminder

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

---

## SYNC:design-distinctiveness-gate

> **[BLOCKING] Design distinctiveness gate (`DD-1`–`DD-8`) — binds on ANY task that designs, plans, mocks up, implements, or reviews a user-facing visual surface.** Deep catalog: `.claude/docs/design-knowledge.md`. Cite findings as `DD-<clause>` + `file:line`.
>
> **Precedence (resolve in this order, never silently):** the **brief's own stated visual direction WINS outright** — including when it asks for one of the `DD-4` tells. Then the **project's design-system / SCSS / frontend-pattern docs and accepted ADRs** — a house style IS an intentional identity, and re-deciding it per feature is the incoherence this gate prevents. Then these clauses. A genuine conflict is SURFACED to the user with both sides, NEVER resolved silently.
>
> **Relationship to `UI-1.1`–`UI-9.4`:** a different question, no overlap — the 40 clauses ask _"is this usable, accessible, consistent?"_ (a measurable floor); this gate asks _"is this THIS product's interface, or the one any generator would emit for any brief?"_. A surface can pass all 40 clauses and still be a template. BOTH bind; where they touch (type scale, colour, motion timing) the clause sets the floor and this gate picks the value.
>
> - `DD-1` **Ground it in the subject matter.** Before designing, name the concrete subject, the audience, and the design's primary job — and CONFIRM with the user when the brief is silent. Distinctive choices come FROM the subject's industry, materials and vernacular; they are never taste applied on top. **Test: if the palette, type and layout would fit a different product unchanged, there is no identity yet.**
> - `DD-2` **Every choice carries a WHY.** "It's common", "it's clean", "users expect it" are not reasons. A decision with no articulable reason is a default that arrived unnoticed. Defaults hide in what feels like infrastructure — typography, navigation, data display, and TOKEN NAMES. **Token-name test: someone reading only your CSS variables should be able to guess what product this is** (`--ink`/`--parchment` evoke a world; `--gray-700`/`--surface-2` evoke a template).
> - `DD-3` **Two passes, and the review pass is mandatory.** (1a) Write a compact **design plan** — Colour (4–6 named hex values) · Type (families + roles + scale) · Layout (one-sentence prose + ASCII wireframes to compare alternatives, including alignment: left/centre/justified) · Principles (what makes THIS page unique). (1b) **BLOCKING generic test — before any code:** work through a similar prompt and see whether you arrive somewhere similar; **any part that reads like the generic default for any comparable page rather than a choice for THIS brief gets REVISED, and you state what you changed and why.** Then (2a) build the REVISED plan, (2b) critique. — why: writing a plan and going straight to code reproduces the default, because the plan came from the same patterns the code will.
> - `DD-4` **Audit every FREE axis against the generated-design tell catalog** (`[model-knowledge]`, calibration not prohibition — each trait is legitimate for SOME brief): **T1** cream `#F4F1EA` + high-contrast serif + terracotta near `#D97757` (Anthropic's own interaction accent — on a user's brief it reads specifically as a tell) · **T2** near-black + one acid-green/vermilion accent · **T3** broadsheet hairline-rule pastiche, zero radius, dense columns · **T4** the SaaS-card kit: identical rounded cards, ONE radius regardless of hierarchy, the same `rgba(0,0,0,.1)` shadow under each, gradient washes as decoration · **T5** template chrome whatever the subject: tracked-out ALL-CAPS eyebrow above every heading, meta strings joined with middle dots (`A · B · C`), `WORD — fragment` labels with a spaced em dash, tinted near-black (`#0B0B0B`/`#111`) standing in for black, monospace for small data labels, `→` appended to link/button text. **A match is a HYPOTHESIS about a missed decision, never a defect** — promote it only by naming the axis, that the brief left it free, and what the subject suggested instead.
> - `DD-5` **Typography carries the personality.** One family, or two CLEARLY distinct ones — you do NOT need separate display and body faces. Choose deliberately, not the default you would reach for on any project. Set a real scale with intentional weights, widths and spacing. When type is a headline it is an ACTIVE part of the design, not a neutral delivery vehicle. Measure under ~80 characters; serifs tolerate slightly longer lines and want slightly more line-height than sans at the same size. Hierarchy needs weight/tracking/opacity, not size alone. **Avoid the three commonest tells: accenting a single word in a headline (italic/bold/colour) · ALL CAPS labels · an eyebrow label that names the section the heading already names.**
> - `DD-6` **Structure is information, not decoration.** Outlines, borders, numbering, eyebrows, dividers and labels must encode something about the content. **Before adding numbered markers (`01 / 02 / 03`), check the content really IS a sequence** — a stepped process, timeline or ranking. For every device ask: what does this tell the reader that whitespace would not? Nothing → cut it. **Hero:** open with the most characteristic thing in the subject's world, in whatever form fits (headline, image, animation, live demo, interactive moment) — big-number-plus-small-label-plus-gradient is the DEFAULT treatment, so use it only when it is genuinely best here. **Composition:** rhythm over monotone (same card size, same gap, same density everywhere is the sound of no one deciding); proportions must say something you can articulate; one dominant focal point.
> - `DD-7` **Motion sparingly and deliberately.** Non-user-triggered motion draws attention ONLY. One orchestrated moment — a single page-load sequence or one reveal — lands better than scattered effects; **fade-and-slide-up entrances on each section and hover transitions on every card are the generic default and read as generated.** Motion that ANSWERS a person's action (opening, expanding, confirming) is welcome when it shows what changed. Honour `prefers-reduced-motion`.
> - `DD-8` **Spend boldness once, then remove one accessory.** Let ONE element be the memorable thing and keep everything around it quiet and disciplined; cut any decoration that does not serve the brief. **Critique the BUILT page, not just the plan** — composition, craft (density is a decision, not a constant), content coherence, and CSS honesty (negative margins undoing a parent's padding, `calc()` values that exist only as workarounds, absolute positioning to escape layout flow are lies; the correct answer is always simpler than the hack). Take screenshots to review where the environment supports it — a picture is worth 1000 tokens. Then ask "if they said this lacks craft, what would they point to?" and fix that. **Build the quality floor in silently** — responsive, visible keyboard focus, reduced-motion respected, measured contrast, tokens never raw hex or magic numbers — and watch CSS selector specificity, where a type-based selector (`.section`) and an element-based one (`.cta`) most often cancel each other's padding/margin.
>
> **Memory:** vary between briefs — light and dark, families, direction. NEVER converge on the same choice across generations (Space Grotesk, for example). Where the project already has a design system, tokens, or an `interface-system.md`, ADOPT and record it rather than re-deciding; write back any pattern used 2+ times with measurements worth remembering.
>
> **Skip ONLY** when the change has NO user-facing visual surface (backend-only, tooling, docs) — state that reason explicitly so the skip is auditable, not an omission.

---

## SYNC:design-distinctiveness-gate:reminder

- **MUST ATTENTION** apply the design distinctiveness gate (`DD-1`–`DD-8`) to any user-facing visual surface: ground it in the named subject/audience/job and confirm when the brief is silent (`DD-1`) · every choice carries a WHY, token names included (`DD-2`) · write a design plan (colour 4–6 named hex · type families+roles+scale · layout prose+ASCII+alignment · principles) then run the BLOCKING generic test and state what you revised BEFORE coding (`DD-3`) · audit every free axis against the T1–T5 tell catalog — cream+serif+`#D97757`, acid-on-black, broadsheet, the SaaS-card kit, template chrome (ALL-CAPS eyebrows, `A · B · C`, spaced-em-dash labels, `#0B0B0B`, mono data labels, trailing `→`) — a match is a missed decision, never a defect (`DD-4`) · 1–2 clearly distinct families, real scale, <80ch, no single-word headline accent / ALL-CAPS labels / redundant eyebrows (`DD-5`) · numbering only on real sequences; hero = the subject's most characteristic thing, not big-number+gradient (`DD-6`) · one orchestrated motion moment, never per-section entrances plus universal card hovers (`DD-7`) · spend boldness once, critique the BUILT page, remove one accessory (`DD-8`). The brief's stated direction OUTRANKS the tell catalog; project design-system docs OUTRANK these clauses — genuine conflicts go to the user, NEVER resolved silently. Cite findings as `DD-<clause>` + `file:line`. Skip ONLY for surfaces with no user-facing visuals, stated explicitly.

---

## SYNC:ui-copywriting

> **Words are design content, not decoration** — binds whenever a task authors, changes, or reviews user-visible strings (labels, CTAs, headings, empty/error/loading text, toasts, placeholder content). Deep detail: `.claude/docs/design-knowledge.md` §8. Copy makes a design feel as templated as the visuals do.
>
> Before writing anything, ask what the design needs to SAY and how it can best be said to help the person navigate the experience. Then:
>
> 1. **Write from the end user's perspective.** Name things by what users will understand in simple language, not by how the system is built — a user manages **notifications**, not **webhook config**. Describe what something is or does in plain terms rather than selling it. Being specific and legible to a new user ALWAYS beats being clever.
> 2. **Active voice by default.** A CTA says exactly what happens when it is used: **"Save changes"**, NEVER "Submit".
> 3. **One name per action, across the whole flow.** The button that says **Publish** produces a toast that says **Published**. The vocabulary of an interface is the signposting for someone navigating the product — cohesion and consistency are how people learn their way around.
> 4. **Failure and emptiness give DIRECTION, not mood.** Explain what went wrong and how to fix it, in the interface's voice rather than a person's. **Errors do NOT apologize, and are NEVER vague about what happened.** An empty screen is an invitation to act.
> 5. **Conversational tone, one job per element.** Plain verbs, sentence case, no filler, tone matched to the brand and the audience; let each written element do exactly one job.
> 6. **Real content, never lorem.** When the brief supplies no copy, write plausible strings for the ACTUAL subject. **Coherence check — read every visible string as a user would, checking for truth, not typos:** could a real person at a real company be looking at exactly this data right now, or does the page title belong to one product, the body to another, and the sidebar metrics to a third? A beautifully designed interface with nonsensical content is a movie set with no script.
>
> **Skip ONLY** when the change surfaces no user-visible text — state that explicitly.

---

## SYNC:ui-copywriting:reminder

- **MUST ATTENTION** treat user-visible words as design content: end-user vocabulary, not system vocabulary (notifications, not webhook config) · active-voice CTAs that say what happens ("Save changes", never "Submit") · ONE name per action across the whole flow (Publish → "Published") · errors explain what happened and how to fix it and NEVER apologize or stay vague, empty screens invite action · sentence case, plain verbs, no filler, one job per element · real subject-specific copy, never lorem — and read every string for TRUTH: one coherent story, not three products' content on one screen. Skip ONLY when no user-visible text changes, stated explicitly.

---

## SYNC:design-review-checklist

> **Front-End Design Review Checklist** — the EXECUTABLE review protocol for any artifact carrying a user-facing front-end surface. Full catalog (`A1`…`Q`, ~130 checks with failure signals and default severities): **`.claude/docs/design-review-checklist.md`**. This gate carries the protocol and the triage pass; the file carries the checks.
>
> **Applies when — and ONLY when — the change, plan, or artifact carries a user-facing front-end surface.** A back-end-only diff, a doc edit, or a config change is `N/A`: state that once and move on. NEVER run a UI review on a non-UI change to manufacture coverage. When it DOES apply, **MUST ATTENTION READ `.claude/docs/design-review-checklist.md` and work its sections** — a review that cites a check ID without opening the catalog is asserting, not checking.
>
> **`CL-1` Context before checks (§0.1).** Establish platform · primary user & expertise · primary task · success metric · constraints · review scope · available artifacts. Fewer than four known → state the gap at the top of the report and mark affected findings **low confidence** — why: a check judged against an unknown task is a guess wearing an ID.
>
> **`CL-2` Evidence or nothing (§0.2).** Every finding cites a specific location (screen · element · `file:line`). NEVER invent a measurement — contrast, tap-target size, and load time that cannot be measured from the given artifact are `NOT VERIFIABLE`, never a guessed number. Tag every finding `MEASURED` · `OBSERVED` · `HEURISTIC`. Status values: `PASS` · `FAIL` · `PARTIAL` · `N/A` · `NOT VERIFIABLE`.
>
> **`CL-3` Severity, then a cap (§0.3).** `P0` blocks task completion / loses data / excludes a protected group (ship blocker) · `P1` significant friction or a legal accessibility floor (fix before release) · `P2` measurable inefficiency (next iteration) · `P3` polish (backlog) · `P4` note. Cap the report at the top 10 by severity unless a full audit was requested. A clean section reports "no issues found" — NEVER pad. Every `P0`/`P1` carries a concrete fix.
>
> **`CL-4` Section sweep, in order.** §A core usability heuristics · §B cognitive load & decision design · §C visual design & hierarchy · §D interaction and relevant product states · §E information architecture · **§F web / §G mobile / §H desktop — conditional on platform** · §I accessibility: use WCAG 2.2 AA as the web baseline and meet any stricter applicable legal or project requirement; for other platforms, use the documented platform standard. Record the selected standard and its source; severity follows the governing release contract · §J content & UX writing · §K trust, ethics & privacy · **§L AI & agentic patterns — conditional on the product having AI features** · §M cross-cutting consistency · §N edge-case probes. Make one focused pass per applicable section and record N/A with evidence for sections the surface does not support.
>
> **`CL-5` Quick Triage Pass (§P)** when a full sweep is not possible — use these prompts for applicable surfaces: (1) can a new user complete the primary task unaided · (2) is feedback timely against the project/platform expectation · (3) do relevant empty/loading/error states offer a forward path · (4) is the primary action obvious and reachable for supported inputs · (5) do contrast and focus meet the selected accessibility standard (WCAG 2.2 AA baseline for web) · (6) can users operate the surface with its supported input modes · (7) do interactive targets meet the platform's size/spacing guidance · (8) are destructive actions recoverable where appropriate · (9) does the surface work at its smallest supported size and required zoom/reflow · (10) are there deceptive or coercive patterns.
>
> **`CL-6` Report shape (§O).** Context (+ known gaps) → Verdict (Ship / Ship with fixes / Do not ship) → What works (2–4 specific strengths, cited) → Findings grouped `P0`→`P3`, each with Location · Evidence + tag · Impact · Principle (checklist ID) · Fix → Open questions → Coverage table. Any `P0` caps the grade at Fail regardless of score; report a score only ALONGSIDE findings, never instead of them.
>
> **Component architecture pass (§M6–§M9) when source code is in scope.** Verify the ownership model documented or demonstrated by the project, reuse/composition decisions, and whether shared behavior is duplicated without a reason. Do not require tiers, a base abstraction, or a particular test hierarchy unless the project uses one. Report applicable checklist IDs with `file:line` evidence; do not infer source architecture from a screenshot alone.
>
> **Precedence and no-double-counting.** The project's design-system / SCSS / frontend-pattern docs and accepted ADRs OUTRANK this checklist; the brief's stated direction outranks aesthetic judgment. A deliberate, documented convention is NEVER a defect — check intent before flagging, and surface a genuine conflict to the user with both sides, NEVER resolve it silently. This checklist is the review PROCEDURE, not a third set of taste rules: `UI-1.1`–`UI-9.4` ask "does it meet the usability floor?", `DD-1`–`DD-8` ask "is this THIS product's interface?", and these checks ask "did the review actually look, with evidence, and rank it?". Where a check restates a `UI-*` or `DD-*` clause, report the defect ONCE under whichever ID the consuming skill already uses.
>
> **For a PLAN or a PLAN REVIEW.** When the plan contains UI work, bind applicable acceptance criteria to the target platform/surface, relevant user states, and the selected accessibility standard. Use WCAG 2.2 AA as the web baseline and meet any stricter applicable legal or project requirement; for other platforms, identify the documented platform standard. Identify conditional sections (§F/§G/§H, §L) that apply. Do not require every catalogued state; record the standard and its source, and keep unsupported checks N/A.

---

## SYNC:design-review-checklist:reminder

- **MUST ATTENTION** when the change/plan/artifact has an applicable user-facing UI surface, READ `.claude/docs/design-review-checklist.md` and run it: `CL-1` establish context first (platform · user · task · metric · constraints · scope · artifacts — state missing context and its confidence impact) · `CL-2` evidence or nothing, cite a location per finding, NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), tag `MEASURED`/`OBSERVED`/`HEURISTIC` · `CL-3` rank `P0`–`P4`, cap at top 10 by severity, NEVER pad, concrete fix on every `P0`/`P1` · `CL-4` sweep §A–§N, applying only relevant platform/product sections and the WCAG 2.2 AA web baseline plus any stricter applicable legal/project requirement, or the documented standard for other platforms · `CL-5` short on time → use the §P prompts · `CL-6` report in the §O shape · for source code, assess component ownership, base abstractions, reuse, and duplication using the project's documented taxonomy or observed boundaries. Project design-system docs and ADRs OUTRANK the checklist; report a defect ONCE across `UI-*`/`DD-*`/`CL-*`. For a plan, bind only applicable sections and states to acceptance criteria. Skip when the work has no user-facing UI surface, and state why.

---
