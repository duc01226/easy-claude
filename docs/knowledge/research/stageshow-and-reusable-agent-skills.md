# From StageShow to reusable agent skills

- **Date** 2026-11-07
- **Author** Codex
- **Overall confidence** 80% for the transferable guidance. Case-specific efficacy remains unmeasured here.
- **Status** Final

## Executive Summary

Benji Taylor's StageShow packages a designer's judgment for making believable product illustrations and scripted React demos. It combines a decision sequence, working examples, reusable components, capture tools, and a separate visual review. The transferable lesson is to turn recurring expert corrections into decisions the agent can make earlier, evidence it can collect, and examples it can learn from. Taylor's comparisons are promising qualitative evidence. Professional parity and the size of any improvement remain open questions. [1][2][3][4][5]

## Research Questions

1. What does StageShow actually build, and which parts of the story can be verified?
2. Which decisions and verification practices transfer across domains?
3. How can a team find out whether a skill earns its cost?

## Methodology

- Eight search queries covered the release, repository, independent comparisons, skill authoring, evaluation, and accessibility. Eight primary sources were analyzed.
- Static inspection covered StageShow v1.1.1 at commit `299140fafd08df55a9c234e610c3f64af3f45531`. I compared the workflow and documentation with the relevant capture and reporting code. I did not run the toolkit, install it in an agent, or reproduce the A/B comparison.
- Evidence includes Taylor's October 31, 2026 account, the November 4 repository snapshot, versioned research papers, and living guidance accessed November 7. The story supplied in the request framed the inquiry. I could not verify a stable original from Shann.
- Confidence levels summarize strength of support. The repository and Taylor's article corroborate what the package contains and how its author describes it. They are one source family for efficacy.

## Findings

### 1. A believable demo has a narrower contract than a shipped product

**Confidence** 95% for documented scope. Below 60% for the story's stronger claim of professional parity.

StageShow makes stills and animations for places such as landing-page heroes, feature cards, and docs. The cursor acts out interactions and a script changes scene state. A convincing menu selection in this setting proves the visual story can be staged. A real application would need separate evidence that the interaction works, including keyboard access and focus behavior where applicable. [1][2][8]

The skill's five failure modes form a useful visual diagnostic. **Overcrowded** scenes make viewers read incidental detail. **Under-designed** scenes lose enough structure to become unrecognizable. **Boxed** scenes shrink an entire product into the space intended to show one action. **Flat** scenes give the payoff too little emphasis. **Generic** scenes miss the brief's identity. The useful tension is between richness and focus. A believable inbox can retain its rows and layout while reserving readable copy for the conversation and assignee that matter. This is an illustration technique. In a real workflow, labels and context needed for decisions must remain available. [1][2][8]

### 2. The package gives the agent decisions, examples, and tools

**Confidence** 95% for the inspected mechanisms. 80% for their transfer as a design pattern.

| StageShow step | What the agent decides | Transferable question |
|---|---|---|
| Medium and place | Format, placement, shipping dimensions, and playback mode | Where will the work be used, by whom, and under what constraints? |
| Look | Visual language, density, fidelity, and product tokens | Which current project or domain authorities govern this work? |
| Story | A small sequence of beats with a visible payoff | What input, change, and result must the audience understand? |
| Example | The closest working example for composition or behavior | Which proven pattern shares the relevant constraints? |
| Screen | What must be legible, what can recede, and how the composition reads at its actual size | What is essential evidence, supporting context, or removable detail? |
| Choreograph | Timing, cause and effect, and continuity across states | What triggers each change, and what should persist through it? |
| Rehearse | Capture, evaluate, repair, and repeat at the shipping conditions | What evidence would expose the most consequential failure? |

The package separates worked examples from **teaching pairs** that vary one behavior. One pair shows accumulated files disappearing in a loop and then shows the same reset following a visible Clear action. The first teaches a solution shape. The pair teaches when a particular decision matters. When product code is available, the skill directs the agent to locate and map the product's tokens into the kit. This is an explicit context-gathering step. [1][2][3]

### 3. Verification has three layers

**Confidence** 95% for the source trace. 80% for the generalization.

- **Capture the artifact.** The film script builds a contact sheet from screenshots taken at intervals or around marked states. It records animation-frame geometry separately to surface jumps and drift that sampled screenshots can miss. The layout checker also offers a snapshot check for visible controls and padded containers. [1]
- **Prove coverage and inspect measurable defects.** Check the actual target, states, widths, and process result. In the inspected revision, the script can print a passing rehearsal line when the named defect gate is clear and still exit with code 2 for incomplete capture. Treat the process exit and coverage report as evidence alongside the summary line. [1][6]
- **Review what requires judgment.** StageShow asks for playback review and a fresh reviewer who sees the brief, closest example, and frames. A reviewer can identify a misleading gesture, an unclear focal point, or an awkward reset despite clean geometry checks. The handoff records captured conditions and gaps. [1][3][7]

### 4. Skill value varies with the task and baseline

**Confidence** 95% for the reported benchmark figures. 80% for the conclusion that task-specific evaluation is needed. Below 60% for a StageShow win rate.

Taylor reports giving fresh agents the same short brief with and without StageShow, recording failures, revising the skill, and restarting the comparison. He publishes examples and reports that most demos still take feedback. The available material supports his account of how he iterated. It provides no independent blind score or representative win rate. [1][2]

Two broader studies support testing both sides of the story. SkillsBench v4 reported average pass rates rising from **33.9% to 50.5%** with curated skills across its matched tasks and model–harness configurations. SWE-Skills-Bench v2 reported average requirement pass ratios of **76.6% without skills and 76.9% with skills**, with 92 of 98 skills showing no statistically significant effect. These studies used different task populations, harnesses, and outcome measures. Their figures describe their own experiments. Neither study measured StageShow. [4][5][6]

## Analysis & Synthesis

### Six principles that transfer

1. **Define the job at the point of use.** State the consumer, the decision or action the output should support, and the environment in which it must work. Choose success criteria before selecting tools or output formats. [1][3][6]
2. **Capture decisions with a reason and an exception.** Replace a request like “make it polished” with a recognizable trigger, a choice, the consequence it prevents, and the cases where it should yield. Separate hard requirements from defaults and style preferences. [1][2][3]
3. **Keep shared rules and local facts separate.** Put stable reasoning in the skill. Resolve changing values from their owners at run time. A design skill reads the project's tokens. A research skill resolves the authoritative source and its date. A support skill looks up the policy that governs the case. [1][3]
4. **Give the agent a reference it can inspect and a contrast it can diagnose.** Choose a working example for its constraints and behavior. Pair a failure with a close correction when a subtle difference matters. Mark which parts to preserve and which to adapt. [1][3][4]
5. **Inspect the work where failures occur.** Check intermediate states, boundaries, and recovery paths when they matter. Use deterministic checks for observable invariants and a separate review for relevance, intent, or taste. Treat missing evidence as inconclusive. [1][6][7]
6. **Turn recurring failures into feedback for the process.** Fix the current deliverable. For prevention, add a decision to the skill, correct the local fact at its source, add a worked example, or write a repeatable assertion, depending on the cause. Rerun the original failure and an unfamiliar case before keeping the change. [2][3][6][7]

### What changes across domains

These examples apply the same pattern to different kinds of work. They are illustrative cases. [1][3][6][7]

| Domain | Expert decision to encode | Evidence that catches a failure |
|---|---|---|
| Product demo | Show the cause of a visible state change. Keep the payoff legible at the shipping width. | Capture the trigger, payoff, and next loop at wide and narrow widths. Have a reviewer identify what happened without the builder's explanation. |
| Software change | When a request can be retried after a timeout, determine whether the prior attempt already applied its side effect. | Replay the request after a simulated timeout and assert one persisted effect. Inspect the final state alongside the return value. |
| Research | When a claim depends on a recent version, capture the source's revision and the date to which the claim applies. | Give the evaluator a newer primary source and a plausible stale summary. Check that the conclusion follows the applicable version and that the citation supports it. |
| Customer support | Apply the policy that governs this case and route genuine exceptions for judgment. | Test a routine case and a near-boundary exception. Check both the customer-facing answer and the proposed action against the applicable policy. |

### Keep the lesson at the right level

“Always use three to five beats,” “use placeholder bars,” and “end where you started” fit particular StageShow scenes. Their general forms are **limit scope to what the audience can follow**, **preserve meaning while reducing incidental detail**, and **make changes traceable across states**. A checklist earns its place when it prevents a recurring, consequential error. A strong model given a clear brief and access to the right sources may already meet the bar. [1][2][3][4][5]

## Knowledge Gaps & Uncertainties

- **Below 60% confidence in general StageShow uplift or human parity.** The public examples establish plausibility. A blinded assessment of representative unseen briefs, with human-designed reference outputs for a parity claim, would test the stronger conclusion. [1][2][6][7]
- **The useful ingredient is unresolved.** The creator's comparison changes the full package at once. A better brief, examples, reusable components, the verification loop, or their combination could explain the observed advantage. [1][2][6]
- **Host compatibility remains author-reported here.** The release names several agents. Installation, skill activation, reference loading, script access, and equivalent behavior in each host would require separate verification. [1][2]
- **Cost and durability are open.** The reviewed StageShow evidence does not quantify the number of review rounds saved, the cost to reach approval, or gains after a model upgrade. [2][3][6]

## Recommendations

### A small process for building a skill

1. **Choose one repeated task.** State when the skill should trigger, the expected artifact, and how a reviewer can tell it succeeded. Collect several real briefs and reserve some for later evaluation. [3][6][7]
2. **Start with actual failures.** For each, record the symptom, the missed decision or missing input, the scope of the rule, and the cheapest reliable check. Collect a working example and one close contrast. [1][2][3]
3. **Package the shortest useful procedure.** Put the trigger, decision sequence, and completion criteria in the entry point. Link supporting cases and rationale on demand. Provide a tool when it can reliably perform a recurring check. [1][3][4]
4. **Run fresh, matched trials.** Compare the ordinary agent, a short checklist with the same key guidance, and the full skill. Hold the model, harness, project snapshot, underlying tool access, and budget constant. Record which bundled resources each arm receives. Repeat on held-out briefs and include cases where the skill should stay idle. [3][6][7]
5. **Grade both quality and effort.** Use hard acceptance checks first. For subjective qualities, use a small rubric with examples and have reviewers score anonymized outputs in randomized order. Track quality, time or tokens, human corrections, and time to approval. If the full package wins, isolate components only when knowing their contribution would change what you maintain. [3][6][7]
6. **Maintain the cases and the rules together.** Add a regression case for a consequential recurring failure. Re-evaluate when the model, environment, or skill changes. Simplify a rule once the baseline consistently meets it on relevant cases. [2][3][6][7]

## Sources

| # | Title | Author or organization | Version or date | Tier | Used in |
|---|---|---|---|---|---|
| 1 | [StageShow source at the inspected commit](https://github.com/benjitaylor/skills/tree/299140fafd08df55a9c234e610c3f64af3f45531/stageshow) | Benji Taylor | v1.1.1, 2026-11-04 | 1, primary artifact | Scope, workflow, verification |
| 2 | [Stageshow](https://benji.org/stageshow) | Benji Taylor | 2026-10-31 | 1, firsthand account | Release, authoring and reported comparison |
| 3 | [Skill Creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) | Anthropic | Living source, accessed 2026-11-07 | 1, official guidance | Packaging, feedback and evaluation |
| 4 | [SkillsBench](https://arxiv.org/abs/2602.12670v4) | Xiangyi Li et al. | v4, 2026-06-14 | 1, primary preprint | Curated skills and matched comparison |
| 5 | [SWE-Skills-Bench](https://arxiv.org/abs/2603.15401v2) | Tingxu Han et al. | v2, 2026-10-27 | 1, primary preprint | Limited average gains on its SWE tasks |
| 6 | [A shared playbook for trustworthy third-party evaluations](https://openai.com/index/trustworthy-third-party-evaluations-foundations/) | OpenAI | 2026, accessed 2026-11-07 | 1, official guidance | Harness, controls, validity and limitations |
| 7 | [Designing effective evaluations](https://developer.apple.com/documentation/Evaluations/designing-effective-evaluations) | Apple | Living guidance, accessed 2026-11-07 | 1, official guidance | Rubrics, reviewer calibration and holdouts |
| 8 | [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | W3C | Recommendation | 1, primary standard | Accessibility boundary |

## Appendix

**Source trace for StageShow.** The scope and seven decisions are in the skill entry point. The token adapter is described in the looks reference. The teaching pairs and review brief show which judgments are delegated to examples or reviewers. The capture code distinguishes screenshot sampling, geometry coverage, and the rehearsal gate. [Skill entry point](https://github.com/benjitaylor/skills/blob/299140fafd08df55a9c234e610c3f64af3f45531/stageshow/SKILL.md#L16-L42), [token mapping](https://github.com/benjitaylor/skills/blob/299140fafd08df55a9c234e610c3f64af3f45531/stageshow/references/looks.md#L46-L54), [teaching pairs](https://github.com/benjitaylor/skills/blob/299140fafd08df55a9c234e610c3f64af3f45531/stageshow/references/teaching.md#L85-L99), [review brief](https://github.com/benjitaylor/skills/blob/299140fafd08df55a9c234e610c3f64af3f45531/stageshow/references/review.md#L3-L24), [film gate and exit handling](https://github.com/benjitaylor/skills/blob/299140fafd08df55a9c234e610c3f64af3f45531/stageshow/scripts/film.mjs#L513-L533), [coverage and result calculation](https://github.com/benjitaylor/skills/blob/299140fafd08df55a9c234e610c3f64af3f45531/stageshow/scripts/verification.mjs#L48-L70).

**Bias check:** The premise is that codified expert judgment improves agent work. The competing explanation is that a clear brief, a capable model, or access to suitable examples and tools accounts for most of the gain. The repository demonstrates the method, and the broader benchmarks show why the gain must be measured locally. A blinded comparison on unseen briefs with a strong checklist baseline and measured review effort could change the assessment.
