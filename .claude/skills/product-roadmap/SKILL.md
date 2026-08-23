---
name: product-roadmap
version: 1.0.0
description: '[Planning] Use only when the user explicitly requests a product roadmap deliverable, roadmap update, or milestone selection; handles outcome milestones, MVP scope, non-goals, risks, human decisions, and evidence gates.'
argument-hint: '[create|update|select] [product vision or milestone]'
disable-model-invocation: true
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute phases in order; update task tracking before and after each phase.
> **[BLOCKING]** Every completed or skipped phase needs concise evidence or a reason.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** When explicitly requested, turn a product vision into an approved, outcome-based roadmap and one selected milestone—or route a genuinely isolated change through an explicit EXEMPT boundary—without making the roadmap artifact a prerequisite for ordinary idea, PBI, spec, presentation, or mock-up work.

**Summary:**

- Detect create/update/select/exempt only after confirming that the user explicitly requested this standalone skill. Read the shared contract and existing roadmap before writing. A large or ambiguous idea alone is not an invocation; its decomposition belongs in the owning PBI/spec/presentation/mock-up artifacts.
- Define the product outcome, actors, business truth, and 3–8 outcome milestones; each milestone names user outcome, risk retired, non-goals, human decisions, dependencies, and evidence.
- Ask the owner to confirm ambiguous terms and select one milestone; write `docs/product-roadmap.md` and a linked `scope-brief.md` incrementally.
- Hand off only an approved milestone, or an explicitly accepted EXEMPT scope, to `/scenario`; implementation planning remains blocked until the applicable Plan Gate is satisfied.
- **Main steps:** explicit-route confirmation → context/contract load → outcome framing → milestone design → owner decision gate → roadmap/scope-brief write → selected milestone or EXEMPT handoff → scenario/Plan Gate.

**Workflow:** 0) route and context → 1) outcome framing → 2) milestone design → 3) decision gate → 4) write roadmap → 5) select milestone/scope brief → 6) handoff.

**Key Rules:**

- Product roadmap answers outcomes and boundaries; it is not a timeline or implementation plan.
- Do not choose frameworks, database schemas, endpoints, screens, or code in this skill.
- Never silently reinterpret `ready`, `published`, `delivered`, `paid`, `refunded`, or equivalent lifecycle terms.
- A roadmap is canonical at `docs/product-roadmap.md`; update it rather than creating competing roadmap files.

## Mission

<request>$ARGUMENTS</request>

## Required Context

**MUST ATTENTION READ** `.claude/skills/shared/product-roadmap-contract.md` and `references/roadmap-template.md` before authoring. Also read `docs/project-config.json`, `docs/project-reference/docs-index-reference.md`, and `docs/project-reference/lessons.md` when present. If project context is stale or missing, use the project's setup route before proceeding.

## Phase 0: Explicit Invocation Gate and Applicability

First confirm that the caller explicitly requested a product-roadmap deliverable or named this standalone skill. If not, STOP this route and return control to the active idea/PBI/spec workflow; do not infer `create`, do not create a scope brief, and do not write `docs/product-roadmap.md`.

For an explicit invocation, classify `$ARGUMENTS` as `create`, `update`, `select`, or `exempt`:

- `create`: no approved roadmap or a new product boundary;
- `update`: roadmap exists but outcome, milestone, risk, or decision changed;
- `select`: roadmap exists and the task needs one milestone scope brief.
- `exempt`: a genuinely isolated brownfield change or bugfix whose product-level scope is unchanged.

Do not infer roadmap-first planning from greenfield, big/ambiguous, broad, or release-scoped wording. Those signals trigger the shared `large_idea_decomposition` contract in their owning workflow. Only the explicit `create|update|select` route writes or updates a product roadmap. For `exempt`, resolve or create the stable scope brief, write the explicit `Roadmap Applicability: EXEMPT` record from the shared contract, and hand off to the existing narrow flow; do not create/update a product roadmap or select a milestone.

## Phase 1: Frame the Product Outcome

Run Phases 1–5 only for `create`, `update`, or `select`. The `exempt` route uses the shared contract's common scope fields and skips product-outcome/milestone authoring.

Read the request and existing product/spec artifacts without selecting technology. Establish:

1. Primary user/owner and the outcome they need.
2. Product boundary and actors outside it.
3. Key hypothesis and the cheapest evidence that could validate it.
4. Business source of truth, critical states, persistence expectation, and ambiguous terms.
5. Risks that make a screen-only breakdown unsafe (data loss, duplicates, wrong status, access leakage, orphaned records, irreversible side effects).

Separate observed evidence, user-provided decisions, and AI hypotheses. Mark unresolved items instead of filling gaps from “reasonable” defaults.

## Phase 2: Design Outcome-Based Milestones

Create 3–8 milestones, ordered by dependency and learning value, not calendar date. For every milestone answer:

| Field | Required question |
| --- | --- |
| User outcome | What can the user accomplish after this milestone? |
| Risk retired | Which product, data, access, lifecycle, or operational risk is reduced? |
| Non-goals | What is explicitly not being built or validated yet? |
| Human decisions | Which terms, policies, ownership, or risk tolerances require approval? |
| Evidence gate | What observable journey/state proves the milestone is complete? |
| Dependencies | Which prior outcome or decision must already hold? |

Use “Pre-MVP Gate” for product truth/ownership/state decisions when needed, and “MVP” only for the smallest release that tests the key hypothesis. Keep later refunds, automation, roles, production handoff, or similar work visible as later milestones or non-goals; do not erase them from the roadmap.

## Phase 3: Decision Gate

Before writing an approved roadmap, use `AskUserQuestion` for every material ambiguity. At minimum confirm:

- the product hypothesis and primary owner/customer;
- source-of-truth state and persistence expectation;
- meanings of lifecycle terms that downstream artifacts might interpret differently;
- milestone boundaries, especially what MVP explicitly excludes;
- evidence acceptable for completion and what must be redacted.

Present 2–4 concrete options with a recommendation grounded in the request. Record `confirmed`, `deferred`, or `blocked`; a material `blocked` decision prevents approval.

## Phase 4: Write the Canonical Roadmap

Use `references/roadmap-template.md`. Create or update `docs/product-roadmap.md` immediately after framing; preserve approved history and replace only the section the owner approved. Include the evidence basis for each decision, but do not place secrets or implementation design in the file.

The artifact is `draft` until the owner approves the product outcome and milestones. A new roadmap MUST NOT be marked `approved` because AI confidence is high.

## Phase 5: Select One Milestone and Write Scope Brief

For roadmap-applicable work, ask the owner to select one milestone (or confirm the supplied one). Then write:

`plans/{active-plan-id}/scope-brief.md`

If no active plan exists, create one stable handoff directory named `plans/{YYMMDD-HHmm}-{slug}/`, write the scope brief there, and keep that `plan-id` for every downstream artifact. Do not put a scope brief under `plans/reports/`: that directory is for reports, not the roadmap-to-plan handoff. The scope brief must carry the roadmap path, milestone ID/outcome, actor, in-scope behaviors, non-goals, terminology, source of truth, risks, confirmed decisions, open questions, evidence gate, and redaction rules. Update the roadmap’s `## Selected Milestone` section with the same path and approval status.

Do not select multiple milestones for one implementation plan. If the request spans independent outcomes, return to milestone design and split the scope.

For `exempt`, do not select a milestone. Write `plans/{plan-id}/scope-brief.md` with the shared contract's EXEMPT block, common actor/outcome/boundary/non-goal/terms/source-of-truth/risk/evidence fields, and accepting-owner approval. Keep the stable `plan-id` for `/scenario` and `/plan`.

## Phase 6: Handoff and Stop Conditions

For an explicit roadmap request, handoff only after `docs/product-roadmap.md` and the scope brief are written and owner-approved. For `exempt`, handoff after the EXEMPT scope brief and owner approval are written; no roadmap or milestone is required:

1. `/scenario {scope-brief}` to enumerate adversarial situations.
2. `/brainstorm` for a selected capability’s detailed scope only when ideation is still needed; do not reopen the product roadmap silently.
3. `/spec`, `/refine`, or `/plan` only after the downstream skill confirms the roadmap/milestone references or the EXEMPT branch.

Stop and report `BLOCKED` when applicable roadmap artifacts are missing, no applicable milestone is selected, the EXEMPT reason/owner is missing, a material term has multiple plausible meanings, or the owner has not approved the selection/boundary.

## Output

Report:

- roadmap path and status, or the EXEMPT reason and owner;
- selected milestone ID and user outcome when applicable;
- explicit non-goals;
- risk retired and evidence gate;
- confirmed decisions and open questions;
- scope brief path;
- next skill and any blocker.

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** For an explicit roadmap request, produce an owner-approved outcome roadmap and one selected milestone, or an owner-approved EXEMPT boundary for an isolated change. Ordinary workflows use embedded large-idea decomposition and do not enter this writer route.
**IMPORTANT MUST ATTENTION Main steps:** confirm the explicit route → load context and contract → frame outcomes → design milestones → obtain owner decisions → write the roadmap/scope brief → hand off the selected milestone or EXEMPT branch through scenario and Plan Gate.
**IMPORTANT MUST ATTENTION** run the explicit route → context → outcome/milestone or EXEMPT boundary → decision gate → scope → handoff in order.
**IMPORTANT MUST ATTENTION** define outcome, risk retired, non-goals, human decisions, dependencies, and evidence for every milestone.
**IMPORTANT MUST ATTENTION** use `AskUserQuestion` for material decisions; AI confidence never equals owner approval.
**IMPORTANT MUST ATTENTION** no framework, schema, endpoint, screen, or code decisions in the product roadmap.
