---
name: domain-analysis
description: '[Architecture] Use when a workflow step or the user asks for DDD domain modeling: contexts, aggregates, entities, ERD and events. --mode=review checks entity and value-object design.'
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Host-native execution: Codex runs a skill by loading its `SKILL.md` instructions and executing the required steps with available tools. No separate `Skill` tool is required; a loaded skill is already activated.
> - Source vs execution: prefer the registered `.agents/skills/<name>/SKILL.md` for Codex execution. `.claude/**` remains the canonical authoring source; reading it for a registry or source inspection does not switch this session to Claude Code.
> - Capability check: interpret Claude tool names through the active host before declaring a blocker. Continue when Codex can perform the required operation; stop and ask only when the actual capability is unavailable, naming the step and evidence. Host-native execution is not a protocol deviation and needs no extra approval.
> - Todo tracking mandate: BEFORE executing any workflow or skill step, create/update todo tracking for all steps and keep it synchronized as progress changes.
> - Use ask user question tool to ask user.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
> **[BLOCKING] Mode routing — detect FIRST.** Explicit `--mode=review` selects the DDD entity/value-object quality review; no mode is the default business domain analysis (the default workflow below). `$domain-analysis --mode=review` is the former `/domain-entities-review`: that slash command no longer exists, and the mode works called directly with no workflow. Read the mode file in full before anything else (see [Mode Dispatch](#mode-dispatch)).

## Quick Summary

> **Review modes:** For review/audit work, standalone defaults to `--review-only` (`--report-only` alias); `--fix-loop` enables review → validate → authorized fix → fresh re-review, default cap 3. `--fix-loop --loop-owner=caller` returns a read-only pass to the caller that owns fixes/re-review. Create triage, review, validation and re-review todo tasks first; apply the carried `review-policy` contract for LOW deferral and user-approved bounded extensions. Non-review modes and terminal findings validation keep their own dispatch.

**Goal:** Produce a user-confirmed DDD model and ERD from business evidence so implementation preserves domain invariants and boundaries.

**Summary:**

- Default route: 0 plan/reference → 1 business context → 2 contexts → 3 entities/aggregates → 4 relationships → 5 events → 6 ERD → 7 user validation → 8 approved reference changes → 9 plan update; then Next Steps and a separate council prompt.
- Derive the model from evidence, confirm boundaries with the user, and persist decisions. `--mode=review [changes | scan [<module>]] [--report-only]` loads the quality-review contract instead.

**Workflow:** Execute Steps 0–9 below for analysis; use Mode Dispatch for review.

**Key Rules:**

- Track every step before work; execute in order without skipping, merging or reordering unless the user approves. Keep one task in progress, complete with evidence, record skip reasons, and resume existing tracking after context loss. Use an equivalent tracker if Task tools are unavailable.
- **MANDATORY IMPORTANT MUST ATTENTION** run user validation interview at end (NEVER skip).
- Validate every bounded context and key relationship with the user. Each entity belongs to exactly one context; cross-context communication uses events, not direct references.
- Derive decisions from business artifacts; cite artifact/`file:line` evidence and confidence (>80% to act, otherwise verify). Compare 3+ existing reference entities before adding one; reuse only when identity, lifecycle and transaction scope fit.
- Include a Mermaid ERD; keep cross-service links ID-only. Apply the DDD reference's classification, aggregate and event rules.
- Persist intermediate findings in `tmp/reports/`; add a final quality-review task. Reference updates require approval.

## Mode Dispatch

Detect the mode from the invocation arguments before any other work; do not load a mode file the invocation did not select.

| Mode | Purpose | Read in full FIRST |
| --- | --- | --- |
| _(none)_ | Default business domain analysis — this file | — |
| `--mode=review [changes \| scan [<module>]] [--report-only]` | DDD design-quality review of domain entities and value objects: checklist A–P, health score, validated-finding fix loop (`--report-only`: read-only leaf, no fix). Formerly `/domain-entities-review` | `references/mode-review.md` |

- **[BLOCKING]** Read `references/mode-review.md` in full FIRST when `--mode=review` is selected, standalone or in a workflow. It replaces default analysis and owns Phases 0–5, `changes` (default), `scan [<module>]` and `--report-only`.


**Review reference:** Classification, aggregate boundaries and anti-patterns use the shared DDD primer. Read `references/ddd-reference.md` sections Entity vs Value Object, Aggregate Design and Anti-Patterns Quick Reference when review Phase 2 A/B/C/F/K needs them.

## DDD Reference (on-demand)

**[MANDATORY]** Read `references/ddd-reference.md` (in this skill's directory) before Step 2, then re-read the section for each step you enter — never model from memory. Sections: Strategic Design (context-boundary signals, context-map patterns) → Steps 2 and 4 · Entity vs Value Object, Entity Design, Aggregate Design, Repository Pattern → Step 3 · Domain Events → Step 5 · ERD Design → Step 6 · Anti-Patterns Quick Reference → Steps 3 and 7.


## Skill Workflow

### Step 0: Locate Active Plan & Domain Reference (MANDATORY)

Resolve roots from `docs/project-config.json`: plans (`docsRoots.plans.path`, default `plans`), team artifacts (`docsRoots.teamArtifacts.path`, default `team-artifacts`), and references (`docsRoots.projectReference.path`, default `docs/project-reference`). Use these roots throughout.

Find the active `*/plan.md` by modification time. Read its scope/goals/decisions, all sibling `research/*.md`, and `domain-entities-reference.md` if present. Set `{plan-dir}` for outputs. If no plan exists, create one using the session naming convention. Step 9 must update it.

### Step 1: Load Business Context

Read the active plan, business evaluation, refined task and discovery notes from the resolved roots. Extract nouns (candidate entities), verbs (events), roles (permissions/views) and processes (business workflows).

### Step 2: Identify Bounded Contexts

Group related entities by DDD principles; apply the context-boundary signals in `references/ddd-reference.md` (Strategic Design).

For each context record **name, purpose, Core/Supporting/Generic classification, primary responsibility, team ownership and ubiquitous language**.

Use the reference's boundary signals; verify that a context can be understood/worked on independently.

Ask the user whether the grouping makes sense. Offer Agree (Recommended), Merge, Split and Add missing context.

### Step 3: Model Entities & Aggregates

Per bounded context: classify each concept using the Entity vs VO matrix in `references/ddd-reference.md`, then apply its aggregate boundary rules.

For each context record its **aggregate roots, identity strategy and justification, lifecycle, child entities, value objects, atomic invariants, factory method and other aggregates with their purposes**.

### Entity Detail Template

| Entity | Classification                         | Identity                | Key Fields | Lifecycle States | Invariants       |
| ------ | -------------------------------------- | ----------------------- | ---------- | ---------------- | ---------------- |
| {Name} | Aggregate Root / Entity / Value Object | ULID / UUID / Composite | {fields}   | {states}         | {business rules} |

Check VO candidates: 3+ primitives traveling together, formatted strings, constrained numbers, or named but implicit business concepts. Aggregates require one transaction, cross-aggregate IDs only, root-only mutations and ≤5 entities; justify or decompose exceptions.

### Step 4: Map Relationships

Record intra-context relationships as **From | To | Type | Cardinality | Identifying/non-identifying | Description**. A child FK in its PK identifies a parent-owned child; a separate FK suggests independent aggregates.

Record integrations as **Upstream | Downstream | Pattern | Integration point | Sync mechanism**. Apply Strategic Design's context-map table: ACL for hostile/external models, Customer-Supplier when downstream negotiates, Open Host Service for many consumers, Conformist without influence.

### Step 5: Domain Events

Identify cross-context events; name them `{AggregateNoun}{PastTenseVerb}`.

| Event            | Source Context | Target Context(s)    | Payload (minimal)            | Trigger        |
| ---------------- | -------------- | -------------------- | ---------------------------- | -------------- |
| `OrderPlaced`    | Sales          | Order, Fulfillment   | cartId, productId, placedDate | Checkout completed |

Verify past-tense aggregate naming; minimal changed data and correlation IDs; AggregateId, OccurredOn (UTC) and Version; schema evolution; and domain/integration classification.

### Step 6: Generate ERD

Produce Mermaid ER diagram. Apply the ERD-to-Aggregate mapping + anti-patterns from `references/ddd-reference.md`.

Use Mermaid comments `%% Context: ...` to group entities, Crow's Foot cardinality (1:1/1:N/M:N), PK/FK and key business fields. Cross-service IDs are string/ULID fields with comments and no relationship arrows. Represent M:N through explicit named association entities.

Before finalizing, consider decomposing tables with >20 columns, remove cross-service FKs and clarify optional relationships rather than making every FK nullable. Apply the reference's ERD-to-aggregate mapping.

### Step 7: User Validation Interview

**MANDATORY** present domain model and ask 5-8 questions via `ask user question tool`:

Cover context boundaries, aggregate roots, entity/VO classification, relationship type/cardinality, missing concepts and event recipients/payloads. For boundaries offer Correct (Recommended), Need changes or Explain more.

Pick 2-3 deep dives according to complexity: separate aggregate versus eventual consistency; VO versus identity/lifecycle; process transitions; edge-case invariants; concurrent writes; or implicit expert concepts. Keep the interview within 5-8 questions by combining related topics.

After confirmation, persist final decisions and set `status: confirmed`.

### Step 8: Domain Entity Change Assessment (MANDATORY)

Compare against `domain-entities-reference.md` in the resolved reference root: new entities, modified fields/relationships/context assignment, and deprecated entities. Present the changes; offer Approve all (Recommended), Review each change or Skip update.

If the reference is missing, ask whether to create it (Yes recommended / No skip). Only after approval, update/create it in its existing format, adding entities under their contexts and revising affected fields/relationships.

### Step 9: Update Main Plan (MANDATORY)

Read `{plan-dir}/plan.md`, append/update `## Domain Model` section:

```markdown
## Domain Model

- **Bounded Contexts:** {N} — {list names with context map patterns between them}
- **Total Entities:** {N} ({N} aggregates, {N} child entities, {N} value objects)
- **Domain Events:** {N} cross-context events
- **Key Aggregates:** {list with invariant summaries}
- **Key Relationships:** {summary of critical relationships}
- **ERD:** See `phase-01-domain-model.md`
- **Full Analysis:** See `research/domain-analysis.md`
```


## Output

```
{plan-dir}/research/domain-analysis.md          # Full domain analysis report
{plan-dir}/phase-01-domain-model.md             # Confirmed domain model with ERD
{plan-dir}/plan.md                              # Updated with domain model summary
docs/project-reference/domain-entities-reference.md  # Updated/created with new/modified entities; docsRoots.projectReference.path in docs/project-config.json overrides this root
```

Report structure:

1. Executive summary (bounded contexts + entity count + key decisions)
2. Context map (bounded contexts with integration patterns)
3. Per-context entity/aggregate detail with identity strategy and invariants
4. Relationship tables (intra + cross-context, identifying vs non-identifying)
5. Value Objects catalog (VO type, attributes, invariants)
6. Domain events catalog (with payload design)
7. Mermaid ERD diagram
8. Anti-pattern warnings (any detected issues in model)
9. Unresolved questions

Report must be **≤250 lines**. Use tables over prose.


## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, use `ask user question tool` to present these options:

- **"$domain-analysis --mode=review (Recommended)"** — Review DDD quality of entities modeled/modified in this analysis (anemic model, VO classification, invariant enforcement, aggregate boundaries)
- **"$tech-stack-research"** — Research tech stack based on domain model
- **"$plan"** — If tech stack already decided and entity quality already reviewed
- **"Skip, continue manually"** — user decides

### Council escalation (always-offer, second prompt)

After the existing `## Next Steps` prompt above resolves, present a **second**, independent `ask user question tool` call (do NOT merge into the first):

- **"Skip council — proceed with model (Recommended)"** — Continue with the bounded contexts / aggregate boundaries as drawn. Recommended default.
- **"Escalate to $llm-council"** — Run 11 sub-agent council (5 advisors + 5 reviewers + chairman). Best applied when bounded-context splits or aggregate boundaries are contested (multiple defensible cuts), the model touches >=3 services, or invariants span aggregates. DDD boundary decisions are hard to reverse once consumers depend on them. Cheaper alternatives: `$why-review`, `$plan --mode=validate` (run these first if you haven't).




<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Produce a user-confirmed DDD model and ERD from business evidence so implementation preserves domain invariants and boundaries.

**MUST ATTENTION** Follow 0 plan/reference → 1 business context → 2 contexts → 3 entities/aggregates → 4 relationships → 5 events → 6 ERD → 7 user validation → 8 approved reference changes → 9 plan update; offer Next Steps, then council in a separate prompt. Review mode follows its own reference.

- Track steps and evidence; derive the model from artifacts rather than guesses.
- Validate boundaries and key relationships; run the 5-8-question interview.
- Keep events `{AggregateNoun}{PastTenseVerb}`, cross-service links ID-only, and aggregates root-mutated, ID-referenced, one-transaction and ≤5 entities (justify/decompose exceptions).
- Preserve approval-dependent updates and both terminal prompts; verify final artifacts.

| Evasion | Required action |
| --- | --- |
| “Boundaries are obvious” | Run user validation. |
| “Already know the model” | Show artifact/reference evidence. |

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md
- `review-policy` — Review-only or a three-round fix loop with explicit extension and fresh post-fix evidence; deciding round eligibility, blocking findings or review state → .claude/skills/shared/protocols/review-policy.md

<!-- PROTOCOL-GUIDES:END -->



<!-- SYNC:review-policy:reminder -->

**MUST ATTENTION** Triage all targets, plan and create review/validation/fix/fresh re-review tasks first. Review-only reports without edits; fix-loop freshly reviews every repair under one fixing owner. Default cap three rounds: disclose deferred LOWs, ask and wait before a bounded extension for MEDIUM+ or failed required checks. Preserve scope, coverage and actual operation authority.

<!-- /SYNC:review-policy:reminder -->
