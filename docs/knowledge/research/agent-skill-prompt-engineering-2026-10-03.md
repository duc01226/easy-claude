# Research Report: Agent and Skill Prompt Engineering

**Date:** 2026-10-03
**Author:** AI research assistant
**Overall Confidence:** 80% — practical guidance, not measured universal effectiveness
**Status:** Final

## Executive Summary

Specify the outcome, provide relevant context, and verify the result. Use reusable skills for task-specific knowledge; scale procedural detail to fragility. Evaluate against a baseline rather than trusting persuasive instructions. These recommendations synthesize official authoring, prompting, safety, and evaluation guidance. [1][2][4][5][6][7] This review covers major practice categories, not every published skill.

## Research Questions

1. What instructions help an agent perform useful, verifiable work?
2. How should reusable skills be scoped, structured, and evaluated?
3. Which practices fail, and which recommendations depend on the model?

## Methodology

Ten queries covered skills, context, tools, security, reasoning, evaluation, and long-context limitations. Eight primary sources were selected and examined; duplicate URLs and derivative summaries were excluded. Sources span original research from 2023, engineering articles from 2024–2025, and living documentation accessed on the report date. Tools: web search and page retrieval. No local performance experiments were run. Confidence percentages are editorial judgments, not calibrated probabilities; related ecosystem documents are not independent experimental replications.

## Findings

### 1. Define an observable contract

**Confidence: 95%.** State goal, input requirements, constraints, and output format. Replace “be an expert” or “produce excellent work” with a checkable result. [2][6]

### 2. Spend context on decisions

**Confidence: 95%.** Load relevant references on demand, retain essential constraints, and remove filler. Minimal means sufficient, not necessarily shortest. [1][3] Historical experiments found position-sensitive retrieval; they do not prove that every current model needs the same repeated rules. [8]

### 3. Make skill selection precise

**Confidence: 80%.** Describe capability and activation context; test realistic requests and boundaries. Treat selecting the right skill and producing a good result as separate checks. [1][7]

### 4. Match control to the task

**Confidence: 95%.** Use narrow procedures for fragile operations and outcome-oriented guidance for variable work. Avoid imposing an internal reasoning narrative on reasoning models. [1][6]

### 5. Treat examples as a tested choice

**Confidence: 80%.** Google recommends few-shot examples broadly; OpenAI recommends zero-shot first for reasoning models. Use examples that agree with instructions and add them when they resolve observed failures. Neither default is universal. [2][6]

### 6. Engineer tools and trust boundaries

**Confidence: 95%.** Describe tool inputs, boundaries, and expected results; inspect environmental feedback. Keep external content out of privileged instruction channels and constrain downstream data flow. [4][5]

### 7. Bound autonomy

**Confidence: 95%.** Define completion, retry limits, and escalation conditions. Test agents in controlled environments and enforce capabilities through runtime controls. A prompt is not an authorization mechanism. [4][5]

### 8. Measure incremental value

**Confidence: 95%.** Compare with no skill or the previous version using clean contexts. Grade real artifacts, inspect traces, and record cost and duration. [7][5]

### 9. Maintain model fit

**Confidence: 80%.** Retest intended models and avoid turning model-specific guidance into universal policy. [1][6]

## Analysis & Synthesis

The following good/bad pairs are engineering implications of the findings, not claims that each bad pattern was experimentally tested.

| Area | Better practice | Bad practice | Basis |
|---|---|---|---|
| Objective | Name the deliverable and success checks | “Do your best” | [2][6] |
| Inputs | Name required facts and missing-input behavior | Assume invisible context | [2][6] |
| Instructions | Clear sections and consistent terms | Contradictory requirements | [2][6] |
| Domain knowledge | Supply actual policies and schemas | Generic expert persona | [1][2] |
| Discovery | Specific capability and trigger | Catch-all description | [1][7] |
| References | Relevant, reachable paths | Load every manual | [1][3] |
| Attention | Visible priorities and sufficient detail | Filler or over-compression | [1][3] |
| Examples | Representative, instruction-consistent cases | Copy one example regardless of input | [2][6] |
| Procedure | Strict where deviation matters | Rigid itinerary for every task | [1][6] |
| Tools | Clear parameters and result checks | Similar ambiguous tools | [4][5] |
| Security | Isolate untrusted content and capabilities | “Never get hacked” as sole defense | [4][5] |
| Recovery | Bounded retries and concrete blockers | “Never stop until perfect” | [4][5] |
| Orchestration | Add stages when results justify cost | Automatic fan-out for simple work | [4][7] |
| Memory | Preserve decisions and unresolved state | Treat a summary as complete source evidence | [3][8] |
| Evaluation | Baseline, edge cases, actual outputs | One successful demonstration | [7][5] |
| Maintenance | Retest model/runtime assumptions | Keep obsolete scaffolding forever | [1][6] |

Conditional tensions matter: concise instructions can omit necessary constraints; fixed checks can protect fragile tasks; extra agent calls can help divisible work but add cost. Choose by observed outcome. [1][4][7]

## Knowledge Gaps & Uncertainties

- No universal optimal prompt length, example count, repetition count, or number of agents established.
- No measured productivity gain or comprehensive framework comparison from this review.
- Historical long-context results do not establish current-model performance.
- Repository skills have not been individually audited; portable prose does not prove native runtime compatibility.

## Recommendations

Use the following proposed gate when authoring or revising skills. It operationalizes the findings; it is not a vendor-mandated checklist. [1][4][5][7]

1. **Scope:** Does the skill preserve the request and existing authority?
2. **Discovery:** Do intended requests select it, and adjacent requests avoid misrouting?
3. **Contract:** Are inputs, output, and completion checks explicit?
4. **Signal:** Does each instruction change a useful decision?
5. **Procedure:** Is strictness justified by an invariant or concrete risk?
6. **Resources:** Do relevant links, tools, and scripts exist and work?
7. **Safety/recovery:** Are untrusted data, permissions, failures, and stopping handled?
8. **Behavior:** Do normal, missing-input, failure, and boundary cases satisfy the contract?
9. **Value:** Is quality improvement worth added latency and tokens?
10. **Maintenance:** Does the target model/runtime still pass after revision?

Suggested acceptance cases: typical request, paraphrase, adjacent unrelated request, malformed input, missing dependency, tool failure, embedded hostile instruction, repeat run, and baseline comparison. Select relevant cases rather than impose a fixed quota. [7][5]

## Sources

| # | Title / organization | URL | Date | Tier | Used in |
|---|---|---|---|---|---|
| 1 | Skill authoring / Anthropic | [Guide](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) | Living docs | 1 | 2–5, 9 |
| 2 | Prompt design / Google | [Guide](https://ai.google.dev/gemini-api/docs/prompting-strategies) | Living docs | 1 | 1, 5 |
| 3 | Context engineering / Anthropic Applied AI | [Article](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | 2025-09-29 | 1 | 2, analysis |
| 4 | Building effective agents / Erik S., Barry Zhang | [Article](https://www.anthropic.com/engineering/building-effective-agents) | 2024-12-19 | 1 | 6–7 |
| 5 | Agent safety / OpenAI | [Guide](https://developers.openai.com/api/docs/guides/agent-builder-safety) | Living docs | 1 | 6–8 |
| 6 | Reasoning best practices / OpenAI | [Guide](https://developers.openai.com/api/docs/guides/reasoning-best-practices) | Living docs | 1 | 1, 4–5, 9 |
| 7 | Evaluating skills / Agent Skills maintainers | [Guide](https://github.com/agentskills/agentskills/blob/main/docs/skill-creation/evaluating-skills.mdx) | Living docs | 1 | 3, 8 |
| 8 | Lost in the Middle / Liu et al. | [Paper](https://arxiv.org/abs/2307.03172) | 2023 | 1 | 2, limitations |

## Appendix

Reusable prompt outline, synthesized from contract, procedure, and verification guidance: [1][4][6]

```text
Goal: [observable outcome]
Inputs: [required artifacts and sources]
Constraints: [scope, policies, permissions]
Method: [essential checks; flexible decisions]
Tools: [when to use each; expected feedback]
Uncertainty: [missing-input and failure behavior]
Output: [format and required contents]
Verify: [observable acceptance conditions]
Stop: [completion, budget, or escalation condition]
```

Confidence rollup: six findings at 95%, three at 80%; equal-weight mean 90%. Double-weight safety and evaluation: 90.9%. Overall rating remains 80% because literature support does not prove universal performance. No empirical effect sizes are asserted.

Bias check: Tested both “more guidance helps” and “less guidance helps”; retained conditional tradeoffs, vendor differences, and limitations rather than declaring a universal prompting formula.
