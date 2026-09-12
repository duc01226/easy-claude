---
name: business-evaluation
version: 1.0.0
description: '[Content] Use when evaluating business idea viability — Business Model Canvas, financial projections, risk matrix, go-to-market, execution plan.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute declared steps in order. NEVER skip, reorder, or merge without explicit user approval.
> **[BLOCKING]** Before each step/sub-skill call, update task tracking: set `in_progress` at start, `completed` at end.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools unavailable, maintain equivalent step tracker with same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Evaluate business idea viability; deliver evidence-backed viability verdict—score, confidence, Pursue/Pivot/Pause/Pass recommendation—grounded in complete 9-block BMC, 3-year financials + assumptions, 5+ risks with mitigation + residual risk, phased execution + GTM plan, so go/no-go rests on traced evidence, never optimism.

**Summary:**

- **Order:** Seven evaluation steps, preceded by a market-evidence precondition: load market evidence first, then run ALL 7 evaluation steps in order — detect idea/scope/evidence completeness; (1) capture idea (problem/solution/target), (2) 9-block BMC, (3) 3-year financials + assumptions, (4) 5+ risks + mitigation/residual risk, (5) phased execution, (6) GTM, (7) verdict. NEVER skip, reorder, or merge — why: partial evaluation invalidates the decision.
- **Market gate:** In workflow parent, read exact `MARKET_ANALYSIS_PATH` (`{plan-dir}/research/market-analysis.md` only copy fallback); standalone, use supplied path. If absent, state `/market-analysis` did not run, mark TAM/SAM/SOM, share, and segment size N/A, cap verdict confidence at 60%; NEVER re-derive sizing.
- **Evidence gate:** all 9 BMC blocks cite proof; every financial number has assumption + source; each 5+ risk has mitigation + residual risk; unbacked artifact fails.
- **Decision/output:** verdict = 1-10 score + confidence tier (95/80/60/<60%) + basis + Pursue/Pivot/Pause/Pass + key success condition; write to `docs/knowledge/strategy/business/{descriptive-slug}.md` via enforced `.claude/templates/business-evaluation-template.md`, then `AskUserQuestion` for next route (domain-analysis recommended); NEVER auto-decide, favor skepticism.

**Workflow:**

**Before evaluation — detect + reason:** classify supplied idea, scope, and market evidence as present, missing, or ambiguous; for each step run focused `Think: evidence / economics / execution / decision` passes. Derive concerns from idea + evidence; required blocks/categories guide coverage, not checklist recitation.

**Precondition — load market analysis:** In `workflow-research` business-eval mode, read exact parent-provided `MARKET_ANALYSIS_PATH` (`{plan-dir}/research/market-analysis.md` only copy fallback); standalone, use explicitly supplied path.
**Absent → do NOT re-derive:** state `/market-analysis` did not run; mark every market-sizing figure (TAM/SAM/SOM, share, segment size) N/A with that reason; cap verdict confidence at 60%.

1. **Capture idea** — Problem, solution, target customer
2. **Business Model Canvas** — All 9 blocks with evidence
3. **Financial projections** — 3-year revenue, costs, break-even
4. **Risk assessment** — 5+ risks with mitigation
5. **Execution plan** — 3 phases with milestones
6. **Go-to-market** — Launch, channels, pricing rationale
7. **Verdict** — Viability score, confidence, recommendation

**Key Rules:**

- Require all 9 BMC blocks; each cites evidence
- Financial projections require explicit assumptions table
- Require ≥5 risks, each with mitigation AND residual risk
- Verdict requires evidence + confidence declaration
- **Risk profile:** analysis. Fresh-eyes review, specialist routing, inline sub-agent protocols, and recursive quality loops: N/A — not required by this target contract; this skill does not delegate or own fix convergence.

**Be skeptical; apply critical/sequential thinking. Every claim needs traced proof + confidence percentage (Idea should be more than 80%).**

# Business Evaluation

## Step 1: Capture the Idea

Extract from user input:

- **One-liner** — Elevator pitch in 1 sentence
- **Problem** — What pain point does it solve?
- **Solution** — How does it solve it?
- **Target customer** — Who specifically benefits?

## Step 2: Business Model Canvas

Require all 9 blocks:

| Block                      | Key Question                      | Evidence Required    |
| -------------------------- | --------------------------------- | -------------------- |
| **Customer Segments**      | Who are we serving?               | Market research      |
| **Value Propositions**     | What value do we deliver?         | Customer pain points |
| **Channels**               | How do we reach customers?        | Channel analysis     |
| **Customer Relationships** | How do we maintain relationships? | Retention strategy   |
| **Revenue Streams**        | How do we make money?             | Pricing research     |
| **Key Resources**          | What do we need?                  | Resource assessment  |
| **Key Activities**         | What must we do?                  | Operational analysis |
| **Key Partnerships**       | Who helps us?                     | Partner landscape    |
| **Cost Structure**         | What does it cost?                | Cost analysis        |

## Step 3: Financial Projections (3 Years)

### Revenue Model

| Year | Users/Customers | ARPU | Revenue | Growth |
| ---- | --------------- | ---- | ------- | ------ |

### Cost Structure

| Category | Y1  | Y2  | Y3  |
| -------- | --- | --- | --- |

### Break-Even

- **Monthly burn:** ${X}
- **Break-even point:** Month/Year
- **Funding needed:** ${X}

### Assumptions Table

Every number lists its assumption + source.

## Step 4: Risk Assessment

Require ≥5 risks:

| Risk | Likelihood | Impact | Mitigation | Residual Risk |
| ---- | ---------- | ------ | ---------- | ------------- |

Consider market, execution, financial, competitive, regulatory, technical.

## Step 5: Execution Plan

| Phase          | Timeline    | Focus                     | Key Milestones             |
| -------------- | ----------- | ------------------------- | -------------------------- |
| **Validation** | 0-3 months  | Customer discovery, MVP   | N interviews, prototype    |
| **Build**      | 3-6 months  | Core product, early users | Beta launch, first revenue |
| **Growth**     | 6-12 months | Scale, optimize           | Revenue target, team size  |

## Step 6: Go-to-Market

- **Launch strategy** — How to enter market
- **Initial channels** — Top 3 acquisition channels
- **Pricing strategy** — Model + rationale + competitive comparison

## Step 7: Verdict

- **Viability score:** 1-10 with rationale
- **Confidence:** 95%/80%/60%/<60% with evidence basis
- **Recommendation:** Pursue | Pivot | Pause | Pass
- **Key condition:** What must be true for this to succeed?

## Output

Write to `docs/knowledge/strategy/business/{descriptive-slug}.md` using enforced template from `.claude/templates/business-evaluation-template.md`.

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** After completion, use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious"—the user decides:

- **"/domain-analysis (Recommended)"** — Analyze domain model from business evaluation
- **"/plan"** — If ready to plan implementation
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use `TaskCreate` to split ALL work into small tasks BEFORE starting.

> **External Memory:** For complex/lengthy research, analysis, scans, or reviews, write intermediate findings + final results to `tmp/reports/`—preserves context and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION—every claim, finding, and recommendation requires `file:line` proof or traced evidence + confidence percentage (>80% act; <80% verify first).

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
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
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, `plans/`, `team-artifacts/`, or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

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

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Evaluate business idea viability; deliver evidence-backed viability verdict—score, confidence, Pursue/Pivot/Pause/Pass recommendation—grounded in complete 9-block BMC, 3-year financials + assumptions, 5+ risks with mitigation + residual risk, phased execution + GTM plan, so go/no-go rests on traced evidence, never optimism.

**MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced `file:line` proof, confidence >80% to act, NEVER guess as fact.

**IMPORTANT MUST ATTENTION** every claim, financial number, BMC block, and verdict carries evidence + confidence % (95/80/60/<60) — NEVER present a guess as fact — why: an unbacked number turns the go/no-go into optimism dressed as analysis.
**IMPORTANT MUST ATTENTION** bias toward skepticism on the verdict — NEVER round optimism up; surface the single key condition that must hold and the residual risk if it fails — why: a falsely-rosy Pursue burns capital that an honest Pause would save.
**IMPORTANT MUST ATTENTION** validate the next route with user via `AskUserQuestion` — NEVER auto-decide domain-analysis/plan — why: this skill judges viability, the human owns the go/no-go.

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; keep one `in_progress`, mark `completed` with evidence; add a final review todo — why: untracked multi-step work loses state on compaction.
**MANDATORY IMPORTANT MUST ATTENTION** consume market data FROM market-analysis as evidence — NEVER re-derive market sizing here; if that producer did not run, mark the market figures N/A with the reason and cap verdict confidence at 60% rather than inventing them — why: this skill judges viability, it does not research the market; duplicated sizing diverges from the source.
**MANDATORY IMPORTANT MUST ATTENTION** all 9 BMC blocks present, each citing proof; every financial number lists its assumption + source in the assumptions table — why: a missing block or bare number is a silent gap the verdict then rests on.
**MANDATORY IMPORTANT MUST ATTENTION** minimum 5 risks, each with mitigation AND a residual-risk entry across market/execution/financial/competitive/regulatory/technical — why: a risk without residual pretends mitigation is total.
**MANDATORY IMPORTANT MUST ATTENTION** detect idea/scope/evidence completeness; load exact market-analysis evidence first (parent `MARKET_ANALYSIS_PATH`; `{plan-dir}/research/market-analysis.md` copy fallback; supplied standalone path; absent → market figures N/A + confidence cap 60%); then run ALL 7 steps in order: idea → 9-block BMC → 3-year financials → 5+ risks → 3-phase execution → GTM → verdict; output via template; `AskUserQuestion` for next route. NEVER re-derive sizing, skip/reorder/merge steps, drop financials/execution/GTM, or auto-decide — why: verdict quality follows the weakest step/evidence.
**MANDATORY IMPORTANT MUST ATTENTION** before writing any figure or claim, search market-analysis output + prior evaluations for 3+ comparable patterns and cite them — why: a number with no comparable anchor is a fabrication.
**MANDATORY IMPORTANT MUST ATTENTION** write the result to `docs/knowledge/strategy/business/{descriptive-slug}.md` via the enforced `.claude/templates/business-evaluation-template.md` — NEVER hand-roll the structure — why: the template is the contract downstream skills (domain-analysis/plan) read.
**MANDATORY IMPORTANT MUST ATTENTION** persist intermediate findings to `tmp/reports/` for lengthy evaluations — why: external memory survives context loss and serves as the deliverable.

**Anti-Rationalization:**

| Evasion                                  | Rebuttal                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| "Idea is obviously viable, skip rigor"   | Optimism is not evidence. Run all 9 blocks + financials + risks anyway.               |
| "Skip a BMC block — not relevant"        | Every block cites proof or states why N/A explicitly; silent omission fails the gate. |
| "Estimate the number, source it later"   | No assumption + source = no number. Fill the assumptions table before the verdict.    |
| "5 risks is a lot, 2 covers it"          | Minimum 5, each with residual risk. Thin risk lists hide the real downside.           |
| "Recommendation is clear, skip the ask"  | Still `AskUserQuestion` for the next route — the human owns go/no-go.                  |

**IMPORTANT MUST ATTENTION** evidence + confidence % on every number — NEVER present a guess as fact. **IMPORTANT MUST ATTENTION** bias toward skepticism — NEVER round optimism up. **IMPORTANT MUST ATTENTION** `AskUserQuestion` for the next route — NEVER auto-decide.
