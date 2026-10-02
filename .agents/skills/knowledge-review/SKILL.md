---
name: knowledge-review
description: '[Research] Use when a workflow step or the user asks for a knowledge artifact review: completeness, citations, confidence accuracy, template compliance.'
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Host-native execution: Codex runs a skill by loading its `SKILL.md` instructions and executing the required steps with available tools. No separate `Skill` tool is required; a loaded skill is already activated.
> - Source vs execution: prefer the registered `.agents/skills/<name>/SKILL.md` for Codex execution. `.claude/**` remains the canonical authoring source; reading it for a registry or source inspection does not switch this session to Claude Code.
> - Capability check: interpret Claude tool names through the active host before declaring a blocker. Continue when Codex can perform the required operation; stop and ask only when the actual capability is unavailable, naming the step and evidence. Host-native execution is not a protocol deviation and needs no extra approval.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
## Quick Summary

**Goal:** Ensure knowledge artifacts are evidence-backed, complete, protocol-compliant, and safe to use for decisions — reviewing for quality, completeness, citation accuracy, and template compliance.

**Summary:**

- PURPOSE: READ-ONLY audit of a knowledge artifact (research report / course / strategy) for completeness, citation accuracy, confidence calibration, source quality, and template compliance — output is a verdict, NEVER an edit.
- MAIN STEPS in order: (1) read the artifact → (2) run the 7-checklist audit — template compliance · citation audit · confidence accuracy · source quality · knowledge gaps · cross-validation · actionability, verifying presence AND quality depth (never just that a section exists) → (3) run the adversarial Anti-Bias Gate → (4) emit PASS/WARN/FAIL per-check + verdict (APPROVED/REVISE/BLOCKED) → (5) conditional Round 2 focused re-review.
- Default to SKEPTIC: run the Anti-Bias Gate before any verdict — find a contradicting source per major claim, stress-test every score ≥80%, state the strongest alternative conclusion, check supporting-vs-contradicting source ratio, run a pre-mortem, and argue the opposite verdict in 2+ sentences.
- Calibrate confidence to evidence: a single source ≠ 80%, scores >80% need 2+ independent sources with contradicting evidence addressed, single-source claims marked unverified must be <60%, and findings <60% must be flagged prominently.
- Convergence: a clean Round 1 ENDS the review once the persisted `minRounds` is met; otherwise validate and fix only current-round blocking findings, then full re-review until the severity bar is clear (Round 2 LOW-only findings are deferred and end the loop).

**Workflow:**

1. **Read artifact** — Load the knowledge report/course/strategy
2. **Template compliance** — Verify all enforced sections present
3. **Citation audit** — Check inline citations and source table
4. **Confidence check** — Verify scores match evidence
5. **Output review** — Validate findings with `$why-review --validate-findings <report-path>`, then emit the summary with pass/warn/fail per check

**Key Rules:**

- Every section from template must be present and non-empty
- Every factual claim must have inline citation
- Confidence scores must match evidence basis
- READ-ONLY — do not modify the artifact

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## First Principle — Easy to Change · Easy to Scale · Easy to Maintain

> The full gate is `SYNC:core-engineering-principles` (protocol guide below; a hook delivers its text); its closing digest ends this file.

---

## Adversarial Review Mindset (NON-NEGOTIABLE)

**Default stance: SKEPTIC challenging research quality, NOT confirming research completeness.**

> **Source confirmation bias trap:** AI gravitates toward sources confirming its working hypothesis. Knowledge artifact built iteratively — by completion, framing is locked in. This section forces challenge of both sources AND framing.

### Adversarial Techniques (apply ALL before concluding)

**1. Source Bias Detection**
Top 3 claims: "What sources CONTRADICT this claim?" No contradicting source cited → either reviewer didn't look, or evidence truly one-sided. Ask: "What would skeptic of this conclusion cite?" No counterevidence addressed → confidence score inflated.

**2. Confidence Calibration Challenge**
Each confidence score ≥ 80%: "What would need to be true for this confidence to be wrong?" High confidence warranted ONLY when: (a) multiple independent sources agree, (b) contradicting evidence addressed, (c) methodology sound. Challenge any score resting on single source or undisclosed assumptions.

**3. Alternative Conclusion Check**
Given same evidence, what DIFFERENT conclusion could reasonable expert reach? Artifact not addressing 1+ credible alternative interpretation → analysis incomplete. State strongest alternative conclusion.

**4. Cherry-Picking Detection**
Count sources supporting main conclusion vs. sources challenging it. Ratio > 3:1 favoring supporting sources without explicit explanation of why contradicting sources discounted → flag cherry-picking.

**5. Pre-Mortem**
Assume artifact's recommendation implemented and fails. Write most plausible failure scenario given research limitations. Artifact not acknowledging this failure mode → missing a risk section.

**6. Contrarian Pass**
Before writing any verdict, generate 2+ sentences arguing OPPOSITE conclusion about artifact's quality. Then decide which argument is stronger.

### Forbidden Patterns

- **"Sources are cited"** → Presence of citations ≠ quality. Do they actually support the claim?
- **"Confidence scores look reasonable"** → What would LOWER the confidence score? Name it.
- **"Comprehensive coverage"** → What perspective is MISSING from this research?
- **"Recommendations are actionable"** → On what evidence? What's the confidence of the evidence chain?
- **Approving a knowledge artifact without challenging the evidence quality** → Forbidden.

### Anti-Bias Gate (MANDATORY before finalizing verdict) (MUST ATTENTION)

- found 1+ contradicting source per major claim (or flagged its absence)
- challenged 1+ confidence score ≥ 80% with a stress test
- stated strongest alternative conclusion from same evidence
- checked source balance (supporting vs. contradicting ratio)
- ran pre-mortem on main recommendation
- generated 2+ sentences arguing opposite verdict

Any item unmet → adversarial review incomplete. Go back. — why: skipping the gate ships confirmation-biased verdicts as fact.

# Knowledge Review

## Review Checklist

### 1. Template Compliance

| #   | Check                                                                                                     | Presence                                                                                 | Quality Depth                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **All enforced sections present** — every required section from the template exists in the artifact       | Are ALL required sections present (not just most)? Is any section empty vs. placeholder? | Does each section contain substantive content, or is it a heading with nothing beneath it? A partially-filled section is as dangerous as a missing one.             |
| 2   | **No sections are empty placeholders** — section bodies contain real content, not "TBD" or "to be filled" | Are section bodies substantive or just "TBD / to be filled"?                             | Is the content specific to this artifact, or generic filler? A section that says "risks will be identified later" has negative value — it creates false confidence. |
| 3   | **Section order matches template** — sections appear in prescribed sequence                               | Do sections appear in the prescribed order?                                              | Does reordering break any cross-references between sections? If section 3 references section 2, out-of-order placement creates reading confusion.                   |

### 2. Citation Audit

| #   | Check                                                                                                                            | Presence                                                                                                                  | Quality Depth                                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Every factual claim has inline citation `[N]`** — all assertions are backed by a numbered source reference                     | Are ALL claims cited, or only the obvious ones? Uncited claims are assertions, not findings.                              | Do the cited sources actually say what the text claims? A source cited for a paraphrase is different from a source cited for a direct claim.                        |
| 2   | **Every source in Sources table is referenced in text** — no source appears in the table without a corresponding `[N]` reference | Are all table sources referenced in the text body? Orphan sources = sources added for credibility, not used for evidence. | Are sources cited at the most specific claim they support, or cited vaguely at section level? Section-level citation hides which sub-claims are actually supported. |
| 3   | **No orphan citations** — every `[N]` reference in the text matches a Sources table row                                          | Are there `[N]` references that don't match any Sources table row?                                                        | Are citation numbers consistent throughout (no gaps, no duplicates)? Broken citation numbering signals the artifact was edited without maintaining integrity.       |
| 4   | **Sources table has: Title, URL, Author, Date, Tier** — all five fields present for every source                                 | Are ALL 5 fields filled? Is Tier assigned (not just blank)?                                                               | Are the Tier assignments accurate? A blog post assigned Tier 1 inflates perceived source quality. Is the Date current enough for the topic?                         |

### 3. Confidence Accuracy

| #   | Check                                                                                                                     | Presence                                                                                         | Quality Depth                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Per-finding confidence scores declared** — each finding has its own explicit confidence percentage                      | Does EACH finding have its own score, or is one artifact-level score applied everywhere?         | Are scores at the finding level, not the section level? A single score per section hides that some findings within it may be poorly supported.                                             |
| 2   | **Overall confidence declared** — an aggregate confidence score for the artifact is stated                                | Is the overall score present and explicitly stated?                                              | Is the overall score a reasoned aggregate, or just the highest per-finding score? An average of 85%, 60%, and 40% is NOT 85%.                                                              |
| 3   | **Scores match evidence basis (not inflated)** — confidence percentages are calibrated to actual source count and quality | Is each score justified by the number and quality of independent sources? A single source ≠ 80%. | What would LOWER this confidence score? If no answer exists, the score is likely inflated. Are scores above 80% supported by 2+ independent sources with contradicting evidence addressed? |
| 4   | **Findings <60% flagged prominently** — low-confidence findings are visually distinct from high-confidence ones           | Are low-confidence findings visually distinct (e.g., ⚠️ prefix), not buried in body text?        | Are low-confidence findings positioned to prevent downstream misuse? A low-confidence finding mentioned once in passing will be treated as fact by readers who skim.                       |

### 4. Source Quality

| #   | Check                                                                                                    | Presence                                                               | Quality Depth                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Tier distribution appropriate (not all Tier 4)** — source tiers are spread across quality levels       | Is the Tier distribution recorded? Are Tier 4 sources a minority?      | Does Tier distribution match the claim importance? A Tier 4 source for a core claim is a risk regardless of how many Tier 1 sources exist elsewhere.                            |
| 2   | **At least 50% Tier 1-2 sources for key claims** — high-stakes conclusions rest on authoritative sources | Do key claims cite Tier 1-2 sources? Is the 50% threshold met overall? | Are the Tier 1-2 sources actually authoritative for THIS specific claim domain, or just prestigious in a different domain? Domain mismatch inflates perceived authority.        |
| 3   | **Recency appropriate for topic type** — sources are current relative to how fast the topic evolves      | Are sources dated? Is recency assessed for each source?                | Is "recency" calibrated to the topic's rate of change? A 2019 source on cloud pricing is stale; a 2019 source on database theory may be fine. Are any outdated sources flagged? |

### 5. Knowledge Gaps

| #   | Check                                                                                                     | Presence                                                                                   | Quality Depth                                                                                                                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Gaps section is present and honest** — a dedicated section describes what the research did NOT find     | Is a Gaps section present? Does it list specific gaps, not just "more research needed"?    | Are the gaps specific enough to guide follow-up research? "Unknown pricing" is actionable; "some uncertainty exists" is not. Are gaps ranked by impact on the artifact's conclusions?                                                |
| 2   | **Known limitations declared** — methodological or coverage limitations are explicitly stated             | Are limitations listed (not inferred)? Does the section distinguish limitations from gaps? | Are limitations acknowledged BEFORE they are used to discount findings, or only in a footnote after conclusions are stated? A limitation that invalidates a key finding must appear near that finding, not only in the Gaps section. |
| 3   | **Suggestions for further research included** — the artifact proposes next steps to close identified gaps | Are 1+ follow-up research suggestions present? Are they tied to specific gaps?             | Are suggestions actionable (specific query + source type) or vague ("investigate further")? Do suggestions address the gaps that most affect decision-making?                                                                        |

### 6. Cross-Validation

| #   | Check                                                                                                           | Presence                                                                       | Quality Depth                                                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Key claims verified by 2+ sources** — core conclusions are supported by multiple independent sources          | Are 2+ sources cited for each key claim?                                       | Are the sources truly independent, or do they cite each other (amplification, not validation)? Two sources from the same original study do not constitute cross-validation. |
| 2   | **Discrepancies noted where sources conflict** — when sources contradict each other, the conflict is documented | Are source conflicts recorded in the artifact?                                 | Are conflicts resolved or just noted? If sources conflict, the artifact should explain which source was weighted more and why — not just acknowledge the conflict exists.   |
| 3   | **Single-source claims marked as unverified** — any finding backed by only one source is explicitly labeled     | Are single-source claims identified with an "unverified" marker or equivalent? | Are single-source claims given confidence scores below 60% as required? A single source labeled "unverified" but assigned 75% confidence is self-contradictory.             |

### 7. Actionability

| #   | Check                                                                                                                   | Presence                                                                     | Quality Depth                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Recommendations are concrete (not vague)** — each recommendation specifies who should do what                         | Are recommendations present? Do they name an action (not just "consider X")? | Are recommendations actionable enough to assign to a specific role without further clarification? "Improve monitoring" is not actionable; "add P99 latency alert at 500ms threshold" is.    |
| 2   | **Next steps are evidence-based** — proposed actions are traceable to findings in the artifact                          | Are next steps present and linked to specific findings?                      | Is each next step traceable to a specific finding and confidence score? A next step driven by a 40%-confidence finding should be labeled speculative, not presented as a directive.         |
| 3   | **Executive summary captures key findings** — the summary conveys findings accurately without omitting critical caveats | Is an executive summary present? Does it list key findings?                  | Does the summary preserve confidence caveats and limitations, or does it strip them out for readability? A summary that presents 60%-confidence findings as facts is worse than no summary. |

## Output Format

```markdown
## Knowledge Review Result

**Status:** PASS | WARN | FAIL
**Artifact:** {path}

### Checks (N/7 passed)

- [x] Template compliance
- [x] Citation audit
- [ ] Confidence accuracy — {issue}
- [ ] Source quality — {issue}
      ...

### Issues

- {specific issues found}

### Verdict

{APPROVED | REVISE | BLOCKED}
```

## Round 2: Focused Re-Review (conditional — triggered by findings)

Convergence follows the single contract in `SYNC:review-policy` below: **a clean Round 1 ENDS the review once the persisted `minRounds` is met (default 1); an explicitly required independent pass is still mandatory.** Re-review is triggered by a validated-finding fix cycle (`review → validate findings → fix → full re-review`) or an explicitly declared independent-pass minimum, not by a round number alone.

When Round 1 surfaces findings, run this focused re-review as part of that full re-review (do NOT rely on Round 1 memory):

1. **Re-read** the Round 1 verdict and checklist results
2. **Re-evaluate** ALL checklist items from scratch
3. **Challenge** Round 1 PASS items: "Is this really PASS? Did I verify citations and confidence?"
4. **Focus on** what Round 1 typically misses:
    - Citation accuracy (do sources actually say what's claimed?)
    - Confidence calibration (are percentages realistic?)
    - Knowledge gaps that weren't flagged
    - Template compliance shortcuts
5. **Update verdict** to incorporate the new findings; then re-enter the loop until a complete review pass finds zero issues.

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.

**Prerequisites:** **MUST ATTENTION READ** before executing:

> **Review scope:** Review the knowledge artifact’s completeness, citations, confidence, and stated claims. Research-only artifacts have no application-inheritance or linter prerequisite. When an artifact makes code-linked claims, inspect only the referenced code and applicable project rules to verify those claims; route a requested code-design review to its code-review owner. Do not prescribe empty base classes or unrelated tooling.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `core-engineering-principles` — Core quality gate: easy to change, easy to scale, easy to maintain, judged by future change cost; planning, implementing or reviewing any change → .claude/skills/shared/protocols/core-engineering-principles.md
- `goal-contract-satisfaction-loop` — Save the goal in a file and loop until every saved criterion passes; executing work against a user goal → .claude/skills/shared/protocols/goal-contract-satisfaction-loop.md
- `review-principle-awareness` — Classify the change context first, then apply the current principles that fit it; starting any review → .claude/skills/shared/protocols/review-principle-awareness.md
- `review-protocol-injection` — Verbatim template and protocol blocks for every fresh sub-agent review prompt; spawning a fresh sub-agent to review → .claude/skills/shared/protocols/review-protocol-injection.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `trade-off-interrogation-gate` — Three trade-off questions before any verdict, score or recommendation; rendering a verdict or recommending an option → .claude/skills/shared/protocols/trade-off-interrogation-gate.md
- `web-research` — Structured web search for evidence gathering; gathering external evidence from the web → .claude/skills/shared/protocols/web-research.md

<!-- PROTOCOL-GUIDES:END -->


<!-- SYNC:web-research:reminder -->

**IMPORTANT MUST ATTENTION** cite 2+ independent sources per claim. NEVER fabricate — "No evidence found" is valid output.

<!-- /SYNC:web-research:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->


<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** A finding names a reachable trigger path (caller, input, state or event that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (an observation otherwise) — never a speculative LOW.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->


<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm by asking the user directly BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** ask the user directly reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->


<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Ensure knowledge artifacts are evidence-backed, complete, protocol-compliant, and safe to use for decisions — reviewing for quality, completeness, citation accuracy, and template compliance.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Double Round-Trip Review:** review → validate → fix only current-round blocking findings → full re-review; Round 1 requires zero open findings (Round-1 LOW closure), while Round 2 requires zero CRITICAL/HIGH/MEDIUM with LOW deferred.
- **Fresh Context Review:** after a fix, re-review with zero-memory fresh sub-agents.
- **Review Protocol Injection:** MUST ATTENTION embed all 11 protocol bodies VERBATIM into each fresh sub-agent prompt.
- **Nested Task Creation:** expand child phase tasks and link the parent when nested.
- **Task Tracking & External Report:** bootstrap tasks; persist plan/review findings to `tmp/reports/` incrementally.
- **Web Research:** cite 2+ independent sources per claim; NEVER fabricate.
- **Severity Rubric:** classify findings Critical/High/Medium/Low by consequence using `SYNC:severity-rubric`; round 1 blocks on every open validated finding (Round-1 LOW closure), round 2 blocks only CRITICAL/HIGH/MEDIUM, and LOW is recorded/deferred. Failed binary gates always block.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** default SKEPTIC, not VALIDATOR — run the full Anti-Bias Gate before ANY verdict: 1+ contradicting source per major claim, stress-test every score ≥80%, state the strongest alternative conclusion, check supporting-vs-contradicting source ratio, run a pre-mortem, argue the opposite verdict in 2+ sentences — why: AI gravitates to confirming sources, so an ungated review ships confirmation-biased verdicts as fact.
**IMPORTANT MUST ATTENTION** calibrate confidence to evidence — a single source ≠ 80%; scores >80% need 2+ independent sources with contradicting evidence addressed; single-source claims marked unverified MUST be <60%; findings <60% flagged prominently — why: an inflated confidence score is read downstream as a fact and drives bad decisions.
**IMPORTANT MUST ATTENTION** main steps in order — read artifact → 7-checklist audit (presence AND quality depth) → adversarial Anti-Bias Gate → emit PASS/WARN/FAIL per-check + verdict (APPROVED/REVISE/BLOCKED) → conditional Round 2 re-review — why: AI forgets the skill's own pipeline and skips the audit or the gate.
**IMPORTANT MUST ATTENTION** verify presence AND quality depth across all 7 checklists (template compliance, citation audit, confidence accuracy, source quality, knowledge gaps, cross-validation, actionability) — a section that exists but is filler/placeholder has negative value — why: "section present" ≠ "section sound"; false confidence is worse than an honest gap.
**IMPORTANT MUST ATTENTION** READ-ONLY — review and report, NEVER modify the audited artifact; emit fixes as findings for the author — why: a reviewer that edits the artifact destroys the independent second opinion the review exists to provide.
- break work into small todo tasks using task tracking BEFORE starting; add a final review todo to verify work quality
- cite evidence for every claim — for a knowledge artifact that is the supporting source citation `[N]` / source-table row (use `file:line` only for the rare code-linked claim); confidence >80% to act, <60% DO NOT recommend
- read required project-reference docs (always `lessons.md`) before the target review; classify findings Critical/High/Medium/Low by consequence (severity rubric) — round 1 blocks on every open validated finding (Round-1 LOW closure); round 2 blocks only CRITICAL/HIGH/MEDIUM, while LOW is recorded/deferred and failed binary gates always block
- verify every factual claim has an inline citation, every source in the table is referenced, no orphan citations, all 5 source fields present with accurate Tier — why: citation presence ≠ citation correctness; the cited source must actually support the specific claim
- execute the review loop: review → validate findings → fix validated findings that block the current round → full re-review; round 1 requires zero open findings, while from round 2 onward zero CRITICAL/HIGH/MEDIUM ends the loop and LOW-only findings are recorded/deferred — NEVER fix unvalidated findings, NEVER skip the full re-review after a blocking fix cycle — why: every fix invalidates the prior verdict, but round-2 LOW polish must not create another loop

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

**Anti-Rationalization:**

| Evasion                              | Rebuttal                                                                                                            |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| "Sources are cited"                  | Presence ≠ quality — verify each source actually supports the SPECIFIC claim, not just sits in the table.          |
| "Confidence scores look reasonable"  | Name what would LOWER each score ≥80%. No answer = inflated. A single source is not 80%.                           |
| "Comprehensive coverage"             | State the strongest alternative conclusion and the perspective MISSING — absence of counterevidence ≠ consensus.   |
| "Recommendations are actionable"     | On what evidence, at what confidence? A directive from a 40%-confidence finding must be labeled speculative.       |
| "Clean enough, skip the Anti-Bias Gate" | The gate is MANDATORY before any verdict — skipping it ships confirmation-biased approval as fact.              |
| "I'll just fix the artifact while here" | READ-ONLY — emit findings; editing the artifact collapses the independent review into the authoring it audits.  |

**IMPORTANT MUST ATTENTION Goal (recency anchor):** ship only evidence-backed, complete, protocol-compliant knowledge artifacts — verdict via the Anti-Bias Gate (SKEPTIC default), confidence calibrated to source count/quality, READ-ONLY, severity-tiered findings, and re-review until the current severity bar is clear (Round 1: zero open findings; Round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred).

<!-- SYNC:core-engineering-principles:reminder -->

**MUST ATTENTION** Core Engineering Principles — every plan, implementation and review must be **Easy to change** (reuse first, one owner per rule, interfaces/adapters at volatile boundaries, no speculative abstraction) · **Easy to scale** (extend by addition, bounded growth, explicit boundaries, sized to the project's real profile) · **Easy to maintain** (intent-named tests that fail when the rule breaks across happy/error/edge paths; harness green locally and in CI). Before done: next change → how many edit sites? 10× → what breaks? which test goes red?

<!-- /SYNC:core-engineering-principles:reminder -->
