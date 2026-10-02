# Research Report: AI Agent Skills — Best and Bad Practices

**Date:** 2026-10-02
**Author:** AI research assistant
**Overall Confidence:** 80% — broad practical guidance; effectiveness requires local evaluation
**Status:** Final

## Executive Summary

Effective skills package specific reusable expertise, precise activation conditions, and verifiable outcomes. The reviewed guidance favors concise instructions, selective reference loading, and evaluation against a baseline. [1][2][3][4] Security requires reviewing skill provenance and enforcing permissions through the execution environment. [5][6] This report covers major practice areas, not every published skill or platform.

## Research Questions

1. What makes a skill useful, discoverable, and maintainable?
2. Which authoring and execution patterns undermine results?
3. How should skills be evaluated and secured?

## Methodology

- Eight search queries; eight primary sources selected and read. Secondary reports, forums, and unexamined vulnerability statistics excluded.
- Queries covered specification, Anthropic authoring, OpenAI skills, evaluation, tool design, and OWASP security.
- Sources span 2024-12-19 to 2026-09-11 plus living documentation accessed 2026-10-02.
- Tools: web search and page retrieval. No skill performance experiments performed.
- Confidence percentages are editorial assessments of support, not statistical probabilities. Multiple documents from the same organization are corroboration, not independent experiments.
- No existing reports were available under the intended research directory; used the repository's research-report template.

## Findings

### Finding 1: Build from real expertise

**Confidence:** 95% — corroborating primary guidance, with model/runtime dependence where applicable.

Capture successful tasks, corrections, schemas and specific failure cases. Avoid generic instructions that merely restate familiar advice. [1][3]

### Finding 2: Control discovery and scope

**Confidence:** 95% — corroborating primary guidance, with model/runtime dependence where applicable.

Use a coherent task scope and concise description naming concrete triggers. Avoid broad triggers and overlapping skills. [1][4]

### Finding 3: Spend context selectively

**Confidence:** 95% — corroborating primary guidance, with model/runtime dependence where applicable.

Keep the entry point concise; route to references only when relevant. Avoid loading all supporting material and repeated instructions. [1][4]

### Finding 4: Calibrate procedural control

**Confidence:** 95% — corroborating primary guidance, with model/runtime dependence where applicable.

Use exact sequences for fragile operations and flexible guidance elsewhere. Overly elaborate itineraries can constrain capable models. [1][4]

### Finding 5: Use executable verification

**Confidence:** 95% — corroborating primary guidance, with model/runtime dependence where applicable.

Bundle reusable scripts where useful and verify actual output or environmental state. Avoid trusting a completion statement or a tool-call attempt alone. [2][7]

### Finding 6: Evaluate incremental value

**Confidence:** 95% — corroborating primary guidance, with model/runtime dependence where applicable.

Compare skill versus no skill or previous version in clean contexts. Measure outcomes, inspect traces, repeat trials and track resource costs. [2][8]

### Finding 7: Enforce security outside prose

**Confidence:** 95% — corroborating primary guidance, with model/runtime dependence where applicable.

Review skill sources and bundled code; treat external instructions as untrusted. Restrict permissions and validate actions against user intent. [5][6]

### Finding 8: Maintain model and runtime fit

**Confidence:** 80% — corroborating primary guidance, with model/runtime dependence where applicable.

Retest intended models and revisit obsolete instructions. Do not assume one model's scaffolding or one host's behavior works everywhere. [3][4]

### Finding 9: Bound autonomy and complexity

**Confidence:** 80% — corroborating primary guidance, with model/runtime dependence where applicable.

Use explicit stopping conditions and permission limits. Add orchestration only when it improves outcomes; avoid unbounded loops and unnecessary agents. [5][7]

## Analysis & Synthesis

My synthesis: a useful skill reduces uncertainty at the points where the agent lacks task-specific information. More procedural detail is justified by fragility, not by task length alone. [1][4][7]

The apparent tension between strict workflows and model autonomy is conditional: ordered checks protect fragile operations, while excessive recipes can hinder flexible work. Evaluate that trade-off on the intended models. [1][3][4]

| Area | Best practice | Bad practice | Evidence |
|---|---|---|---|
| Expertise | Concrete conventions and gotchas | Generic “follow best practices” prose | [1][3] |
| Scope | One coherent class of work | Catch-all skills or fragmented micro-skills | [1][4] |
| Activation | Specific task triggers | Broad keywords that activate irrelevant procedures | [1][4] |
| Context | Load relevant references on demand | Read every document at startup | [1][4] |
| Control | Exact steps for fragile actions | Rigid itineraries for every task | [1][4] |
| Verification | Inspect actual artifacts and state | Accept “done” as evidence | [2][7][8] |
| Evaluation | Baseline, varied cases, clean runs | One successful demo | [2][8] |
| Security | Review bundles and restrict capabilities | Treat installed instructions as automatically trusted | [5][6] |
| Maintenance | Retest after model changes | Accumulate obsolete scaffolding | [3][4] |
| Orchestration | Add complexity when useful | Automatic agent fan-out for simple work | [4][7] |

## Knowledge Gaps & Uncertainties

- No universal optimal length, number of skills, or degree of orchestration established.
- No measured productivity improvement from this review.
- Cross-platform compatibility needs host-specific checks; portable prose does not establish runtime compatibility.
- Repository skills have not been individually audited.
- General recommendations have substantial support; exact implementation choices retain uncertainty. No weak empirical effect estimates are asserted.

## Recommendations

1. Start with one repeated task where the agent makes recognizable mistakes. Capture the missing knowledge and expected output. [1][3]
2. Keep the root instructions focused. Link references by explicit need; provide a useful default and a recovery path. [1][4]
3. Compare against no skill or the previous version. Grade results, inspect traces, and record duration and token usage. [2][8]
4. Review skill instructions, scripts, dependencies, and external access before enabling them. Enforce permissions independently of the text. [5][6]
5. Revisit rules after model upgrades; remove instructions whose benefits disappear in evaluation. [2][4]

Suggested acceptance tests below are this report's engineering recommendations, derived from the evaluation and security guidance rather than a universal mandated suite. [2][5][8]

| Test | Acceptance question |
|---|---|
| Typical request | Does the expected artifact or result exist and satisfy requirements? |
| Paraphrased request | Does ordinary user wording activate the appropriate skill? |
| Adjacent unrelated request | Does the agent avoid applying irrelevant procedures? |
| Malformed or missing input | Does it diagnose the problem without inventing data? |
| Tool failure | Does it recover or report a concrete blocker? |
| Untrusted embedded instructions | Does it preserve the user's task and permission boundaries? |
| Repeated trials | Is success consistent rather than a lucky run? |
| Baseline comparison | Is the quality gain worth added time and tokens? |
| Model/runtime change | Does the intended deployment still work? |

Suggested skill outline, synthesized from authoring and verification guidance: activation description; required inputs; essential domain facts; procedure with appropriate flexibility; relevant reference routes; output contract; verification; recovery and stopping conditions. Use sections only where they add value. [1][3][4][7]

## Sources

| # | Title | URL | Author/Org | Date | Tier | Used In |
|---|---|---|---|---|---|---|
| 1 | Agent Skills authoring practices | [Source](https://github.com/agentskills/agentskills/blob/main/docs/skill-creation/best-practices.mdx) | Agent Skills maintainers | Living documentation; accessed 2026-10-02 | 1 | 1, 2, 3, 4 |
| 2 | Agent Skills evaluation | [Source](https://github.com/agentskills/agentskills/blob/main/docs/skill-creation/evaluating-skills.mdx) | Agent Skills maintainers | Living documentation; accessed 2026-10-02 | 1 | 5, 6 |
| 3 | Claude skill authoring | [Source](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) | Anthropic | Living documentation; accessed 2026-10-02 | 1 | 1, 8 |
| 4 | Rethinking skills for GPT-6 Astra | [Source](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra) | Eric Provencher / OpenAI | 2026-09-11 | 1 | 2, 3, 4, 8 |
| 5 | OWASP prompt injection prevention | [Source](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) | OWASP | Living documentation; accessed 2026-10-02 | 1 | 7, 9 |
| 6 | Managed Agents skills security | [Source](https://platform.claude.com/docs/en/managed-agents/skills) | Anthropic | Living documentation; accessed 2026-10-02 | 1 | 7 |
| 7 | Building effective agents | [Source](https://www.anthropic.com/engineering/building-effective-agents) | Anthropic | 2024-12-19 | 1 | 5, 9 |
| 8 | Demystifying agent evaluations | [Source](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | Anthropic | 2026-01-09 | 1 | 6 |

## Appendix

Confidence rollup: nine findings scored 95, 95, 95, 95, 95, 95, 95, 80, 80. Equal-weight mean: 91.7%. Giving security and evaluation double weight produces 92.3%. Overall report rating remains conservatively 80% because supporting recommendations do not prove universal performance. No finding below 60% is presented as established.

Research scope excludes an exhaustive registry inventory, model-training skill acquisition, and independent testing of this project's skill library.

