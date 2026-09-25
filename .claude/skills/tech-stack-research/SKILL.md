---
name: tech-stack-research
version: 1.0.0
description: '[Architecture] Use when a workflow step or the user asks for tech stack options. Researches and compares them as a solution architect.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Deliver a user-confirmed tech stack for every required layer, backed by researched alternatives, weighted evidence, and confidence, so the team chooses fit for scale, budget, skills, and timeline—not familiarity.

**Summary:**

- **Purpose:** act as solution architect—load business/domain/PBI context, derive constraints, research current options, compare fit, and record only user-confirmed decisions.
- **Ordered path:** (1) load context → (2) derive requirements + `AskUserQuestion` confirmation → (3) WebSearch backend, frontend, database, messaging, infra, and auth (3+ options/layer; minimum 5 queries/layer) → (4) compare → (5) score/rank each layer with confidence % → (6) write `{plan-dir}/research/tech-stack-comparison.md` (<=200 lines) → (7) end interview (5-8 questions) and write `status: confirmed` to `{plan-dir}/phase-02-tech-stack.md`.
- **Evidence gates:** cite a URL, benchmark, or case study for every claim/recommendation; score 8 criteria with High=3x/Medium=2x/Low=1x; NEVER choose by familiarity.
- **Follow-up modes:** after Step 7, separate `AskUserQuestion` offers `/architecture-design` (Recommended), `/plan` if architecture is decided, or skip; a second council prompt offers skip (Recommended) or `/llm-council` (11 sub-agents) for close scores or unfamiliar/strategic dependencies.

**Workflow:**

1. **Load Business Context** — Read prior business evaluation, domain/ERD, refined PBI, and discovery notes from the plans and team-artifacts roots (defaults `plans/` and `team-artifacts/`; `docsRoots.plans.path` / `docsRoots.teamArtifacts.path` in `docs/project-config.json` override them).
2. **Derive Technical Requirements** — Map signals to constraints; confirm via `AskUserQuestion`.
3. **Research Per Layer** — WebSearch top 3 options for each layer; run minimum 5 queries per layer.
4. **Deep Compare** — Build pros/cons matrices with benchmarks, community health, and team fit.
5. **Score & Rank** — Apply weighted scoring across 8 criteria; rank with confidence %.
6. **Generate Report** — Write the structured, <=200-line comparison report with recommendation.
7. **User Validation** — Present findings, ask 5-8 questions, record confirmed choices; then run the separate Next Steps and council prompts.

**Key Rules:**

- **MANDATORY IMPORTANT MUST ATTENTION** research minimum 3 options per stack layer
- **MANDATORY IMPORTANT MUST ATTENTION** include confidence % with evidence for every recommendation
- **MANDATORY IMPORTANT MUST ATTENTION** run user validation interview at end (NEVER skip)
- All claims must cite sources (URL, benchmark, case study)
- Recommend on benchmarked evidence (URL, benchmark, case study); NEVER on familiarity alone

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Step 1: Load Business Context

Read artifacts from prior workflow steps — search the plans and team-artifacts roots (defaults `plans/` and `team-artifacts/`; `docsRoots.plans.path` / `docsRoots.teamArtifacts.path` in `docs/project-config.json` override them):

- Business evaluation report (viability, scale, constraints)
- Domain model / ERD (complexity, entity count, relationships)
- Refined PBI (acceptance criteria, scope)
- Discovery interview notes (team skills, budget, timeline)

Extract and summarize:

| Signal                 | Value        | Source              |
| ---------------------- | ------------ | ------------------- |
| Expected users         | ...          | discovery interview |
| Domain complexity      | Low/Med/High | domain model        |
| Team skills            | ...          | discovery interview |
| Budget constraint      | ...          | business evaluation |
| Timeline               | ...          | business evaluation |
| Compliance needs       | ...          | business evaluation |
| Real-time needs        | Yes/No       | refined PBI         |
| Integration complexity | Low/Med/High | domain model        |

## Step 2: Derive Technical Requirements

Map business signals to technical requirements:

| Business Signal    | Technical Requirement                           | Priority |
| ------------------ | ----------------------------------------------- | -------- |
| High user scale    | Horizontal scaling, connection pooling          | Must     |
| Complex domain     | Strong type system, ORM with migrations         | Must     |
| Real-time features | WebSocket/SSE support, event-driven arch        | Must     |
| Small team         | Low learning curve, good DX, batteries-included | Should   |
| Tight budget       | Open-source, low hosting cost                   | Should   |
| Compliance         | Audit trail, encryption, auth framework         | Must     |

**MANDATORY IMPORTANT MUST ATTENTION** validate derived requirements with user via `AskUserQuestion` before proceeding to research.

## Step 3: Research Per Stack Layer

For EACH layer, research top 3 options via WebSearch (minimum 5 queries total):

### Stack Layers to Evaluate

| Layer                  | Example Options                 | Research Focus                        |
| ---------------------- | ------------------------------- | ------------------------------------- |
| **Backend Framework**  | Candidate backend runtimes/frameworks | Performance, type safety, ecosystem   |
| **Frontend Framework** | Candidate frontend frameworks         | DX, ecosystem, hiring, enterprise fit |
| **Database**           | Candidate database engines/stores      | Scale, query complexity, cost         |
| **Messaging/Events**   | Candidate messaging/event systems      | Throughput, reliability, complexity   |
| **Infrastructure**     | Docker+K8s, Serverless, PaaS    | Cost, ops overhead, scaling           |
| **Auth**               | Keycloak, Auth0, custom         | Cost, compliance, flexibility         |

### WebSearch Queries (minimum 5 per layer)

```
"{option_A} vs {option_B} {current_year} comparison"
"{option} enterprise production case studies"
"{option} community size github stars"
"{option} performance benchmarks {use_case}"
"{option} security track record vulnerabilities"
```

## Step 4: Deep Comparison Matrix

For EACH stack layer, produce comparison table:

| Criteria             | Option A          | Option B | Option C | Weight |
| -------------------- | ----------------- | -------- | -------- | ------ |
| **Team Fit**         | score + rationale | ...      | ...      | High   |
| **Scalability**      | score + rationale | ...      | ...      | High   |
| **Time-to-Market**   | score + rationale | ...      | ...      | High   |
| **Ecosystem/Libs**   | score + rationale | ...      | ...      | Medium |
| **Hiring Market**    | score + rationale | ...      | ...      | Medium |
| **Cost (hosting)**   | score + rationale | ...      | ...      | Medium |
| **Learning Curve**   | score + rationale | ...      | ...      | Medium |
| **Community Health** | score + rationale | ...      | ...      | Low    |

Scoring: 1-5 scale. Weight: High=3x, Medium=2x, Low=1x.

### Per-Option Detail Block

For each option, document:

```markdown
### {Layer}: {Option Name}

**Pros:**

- {Pro 1} — {evidence/source}
- {Pro 2} — {evidence/source}
- {Pro 3} — {evidence/source}

**Cons:**

- {Con 1} — {evidence/source}
- {Con 2} — {evidence/source}

**Best suited when:** {conditions}
**Not suitable when:** {conditions}
**Production examples:** {2-3 real companies using this}
```

## Step 5: Weighted Score & Ranking

Calculate weighted total per option per layer. Present ranking:

```markdown
### {Layer} Ranking

1. **{Option A}** — Score: {X}/100 — Confidence: {Y}%
2. **{Option B}** — Score: {X}/100 — Confidence: {Y}%
3. **{Option C}** — Score: {X}/100 — Confidence: {Y}%

**Recommendation:** {Option A}
**Why:** {2-3 sentence rationale linking to team skills, scale, and constraints}
```

## Step 6: Generate Report

Write report to `{plan-dir}/research/tech-stack-comparison.md` with:

1. Executive summary (recommended full stack in 5 lines)
2. Technical requirements table (from Step 2)
3. Per-layer comparison matrices (from Step 4)
4. Per-layer rankings with recommendations (from Step 5)
5. Combined recommended stack diagram
6. Risk assessment for recommended stack
7. Alternative stack (second-best combo) for comparison
8. Unresolved questions

Report must be **<=200 lines**. Use tables over prose.

## Step 7: User Validation Interview

**MANDATORY IMPORTANT MUST ATTENTION** present findings and ask 5-8 questions via `AskUserQuestion`:

### Required Questions

1. **Per-layer recommendation confirmation** — "For {layer}, I recommend {option}. Agree?"
    - Options: Agree (Recommended) | Prefer {option B} | Need more research
2. **Risk tolerance** — "The recommended stack has {risk}. Acceptable?"
3. **Team readiness** — "Team needs to learn {X}. Training plan needed?"
4. **Budget alignment** — "Estimated infra cost: ${X}/month. Within budget?"
5. **Timeline fit** — "This stack enables MVP in {X} months. Acceptable?"

### Optional Deep-Dive Questions (pick 2-3 based on context)

- "Should we consider {emerging tech} for {layer}?"
- "Any compliance requirements I haven't captured?"
- "Preference for managed services vs self-hosted?"
- "Monorepo or polyrepo for this team size?"

After user confirms, update report with final decisions, mark `status: confirmed`.

## Output

```
{plan-dir}/research/tech-stack-comparison.md    # Full comparison report
{plan-dir}/phase-02-tech-stack.md               # Final confirmed tech stack decisions
```

---

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate EVERY recommendation with user via `AskUserQuestion` — NEVER auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** include confidence % and evidence citations for all claims.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because task seems "simple"/"obvious" — the user decides:

- **"/architecture-design (Recommended)"** — Design solution architecture with chosen tech stack
- **"/plan"** — If architecture already decided
- **"Skip, continue manually"** — user decides

### Council escalation (always-offer, second prompt)

After the existing `## Next Steps` prompt above resolves, present a **second**, independent `AskUserQuestion` call:

- **"Skip council — proceed with chosen stack (Recommended)"** — Continue with the selected tech stack as-is.
- **"Escalate to /llm-council"** — Run 11 sub-agent council. Best applied when 2+ stacks score within 15% on the comparison matrix or you have unfamiliar/strategic dependencies. Cheaper alternatives: `/why-review`, `/plan-validate`.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `engineering-foundation-gate` — Seven engineering-foundation dimensions judged by project profile; creating or reviewing how a project is built, run, tested or checked → .claude/skills/shared/protocols/engineering-foundation-gate.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `scale-technique-gate` — Which scale techniques a system warrants, and which it does not; reviewing architecture or production readiness → .claude/skills/shared/protocols/scale-technique-gate.md
- `scenario-stress-eval` — Judge the system under concrete failure and load scenarios; evaluating resilience or production readiness → .claude/skills/shared/protocols/scenario-stress-eval.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:scale-technique-gate:reminder -->

**IMPORTANT MUST ATTENTION** scale-technique gate: derive the scale tier from evidence FIRST (T0 internal · T1 <10k · T2 10k–1M · T3 millions+), then judge each warranted technique `PRESENT`/`MISSING-WARRANTED`/`N/A-by-scale`/`OVER-ENGINEERED`. Advise on warranted-but-missing gaps AND advise AGAINST unwarranted heavyweight techniques (anti-over-engineering). **ADVICE-ONLY — emit the Technique Applicability Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scale-technique-catalog.md` (authoritative for tier thresholds & per-technique warranting tiers — on any change update the catalog FIRST, then re-run `inject_scale_technique_gate.py`).

<!-- /SYNC:scale-technique-gate:reminder -->

<!-- SYNC:scenario-stress-eval:reminder -->

**IMPORTANT MUST ATTENTION** scenario-stress gate: reuse the scale tier `T0`–`T3` AND derive business-criticality `B0`–`B3` from evidence first — apply the **criticality-signal floor** (regulated/PII/financial/health data · money movement · auth/identity · legal-compliance → at least `B2` even absent SLA docs; do NOT default to `B3`). Select only the scenarios the `B`/`T` combination warrants, then walk each (simulate → trace → failure signature → self-heal/MTTR → trade-off) and assign `WITHSTANDS`/`DEGRADES-GRACEFULLY`/`FAILS-HARD`/`N/A-by-business`/`OVER-HARDENED`. Anti-over-engineering is first-class (a lean system that needs no HA/DR is a PASS) AND symmetric (never under-harden a `B2`+ system for low traffic). **ADVICE-ONLY — emit the Scenario Stress Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scenario-stress-catalog.md` (authoritative for scenarios/verdicts/business-tiers — on any change update the catalog FIRST, then re-run `inject_scenario_stress_gate.py`; scale tier stays single-sourced in `scale-technique-catalog.md`).

<!-- /SYNC:scenario-stress-eval:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

- **IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
- **IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
- **IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
- **IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:engineering-foundation-gate:reminder -->

**IMPORTANT MUST ATTENTION** engineering-foundation gate — judges whether the team can build, run, test, and change the system repeatably as it grows. Derive lifecycle, scale, criticality, repository shape, and runtime from evidence; take the lower supported tier when unknown. Judge all 7 dimensions, using `N/A-by-profile` with evidence when a concern truly does not apply. **F1** reproducible build/run/test path · **F2** document and exercise each supported or required execution mode; dual host/container or other modes only when the project uses or needs them · **F3** environment portability at applicable local/CI/production-shaped targets · **F4** meaningful test-strength evidence without making one mutation tool universal · **F5** measured performance where scale/risk warrants it · **F6** change/build scalability where the repository has meaningful module boundaries · **F7** mechanical checks selected for the stack/profile. For each, judge outcomes rather than tools, and preserve anti-over-engineering. Foundation creation may block on missing warranted outcomes; brownfield audits advise and name the smallest next step. Catalog → `.claude/docs/engineering-foundation-catalog.md` (update first, then re-run `inject_engineering_foundation_gate.py`).

<!-- /SYNC:engineering-foundation-gate:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `/project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Deliver a user-confirmed tech stack for every required layer, backed by researched alternatives, weighted evidence, and confidence, so the team chooses fit for scale, budget, skills, and timeline—not familiarity.

**IMPORTANT MUST ATTENTION** preserve user confirmation, cited evidence, weighted scoring, and fit against scale, budget, skills, and timeline; never replace those gates with familiarity or an unverified default.

**IMPORTANT MUST ATTENTION — run ALL 7 steps in declared order, none skipped:** (1) Load Business Context → (2) Derive Technical Requirements (+ `AskUserQuestion` confirm) → (3) Research Per Layer (WebSearch 3+ options each) → (4) Deep Comparison Matrix → (5) Weighted Score & Ranking (confidence %) → (6) Generate Report (<=200 lines) → (7) User Validation Interview (5-8 questions, write `status: confirmed`) — why: AI keeps collapsing this into "just pick a stack" and dropping requirements-derivation, scoring, and the confirmation gate that make the choice defensible.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** MUST ATTENTION apply critical + sequential thinking; traced proof, confidence >80% to act, NEVER guess as fact.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** research minimum 3 WebSearched options per stack layer (backend, frontend, database, messaging, infra, auth); every recommendation carries confidence % + cited evidence (URL, benchmark, case study) — NEVER recommend on familiarity alone — why: familiarity bias commits the team to the wrong stack that surfaces only at scale.
**IMPORTANT MUST ATTENTION** gate on user via `AskUserQuestion` at EVERY decision point — confirm derived requirements before research (Step 2), confirm each layer recommendation in the end interview (Step 7) — NEVER auto-decide — why: the team owns the stack, not the AI.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; mark one `in_progress`, `completed` immediately after evidence; add a final review todo.

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

**IMPORTANT MUST ATTENTION** requirements come BEFORE research — load prior business/domain/PBI artifacts (Step 1), map business signals to technical requirements (Step 2), user-confirm them, THEN WebSearch (Step 3) — NEVER research before requirements are derived and confirmed — why: researching first picks tech then back-fits the problem, the reverse of architecture.
**IMPORTANT MUST ATTENTION** score every layer with the weighted 8-criteria matrix (High=3x / Medium=2x / Low=1x), rank with confidence %, cap the `{plan-dir}/research/tech-stack-comparison.md` report at <=200 lines using tables over prose — why: an unscored or unbounded report hides the trade-off the decision turns on.
**IMPORTANT MUST ATTENTION** only user-confirmed decisions get written to `phase-02-tech-stack.md` as `status: confirmed` — the end interview (5-8 `AskUserQuestion` questions) is mandatory and NEVER skipped even when the choice seems "obvious" — why: an unconfirmed stack is a guess the team will pay for.
**IMPORTANT MUST ATTENTION** every claim, finding, and recommendation requires `file:line`/URL proof or traced evidence + confidence % (>80% act, 60-80% verify first, <60% DO NOT recommend) — NEVER present a guess as fact — why: a stack chosen on speculation fails silently until production.
**IMPORTANT MUST ATTENTION** evaluate fit before copying a reference stack from another project — verify the new context shares the same scale, budget, team skills, compliance, and timeline constraints — why: the closest example rarely matches preconditions, and a mismatched copy compiles but fails the real requirements.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| "Stack is obvious — skip the research"           | 3+ WebSearched options per layer with cited evidence anyway — familiarity is not evidence. |
| "I already know this is the best framework"      | Show the weighted 8-criteria score + confidence %. No matrix = no recommendation.          |
| "Skip the user interview, the choice is clear"   | The end interview is MANDATORY — only `status: confirmed` decisions get written.            |
| "Just research the stack, requirements are fine" | Derive + user-confirm technical requirements FIRST (Steps 1-2), then research.              |
| "One source is enough for this layer"            | Cite URL + benchmark + case study; a single anecdote is not benchmarked evidence.          |

> **External Memory:** For research/analysis work, write intermediate findings and final results to a report file in `tmp/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, recommendation requires `file:line`/URL proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).
