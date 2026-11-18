---
name: rich-report
description: '[Documentation] Use when asked for a rich report, an interactive or visual report, or a standalone HTML report, document, explainer, or data story. Uses Codex Sites, Claude Artifacts, or local HTML.'
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. When a workflow step or another skill names a skill, read that file in full yourself (every line, with no line limit; in parts only when output is cut off): a skill whose implicit invocation is off is never loaded for you. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
## Quick Summary

**Goal:** Deliver a report that gives the reader the answer quickly and lets them explore the evidence.

**Summary:** Resolve the reader's question and delivery route, then build a report that starts with the answer and puts detail within reach. Check the rendered report and its actual destination before handoff.

**Workflow:** Identify audience and purpose → choose the native or local destination → map sections and visuals → build and check the report → hand over the verified link or file.

**Key rules:**

- Use a private Codex Site in Codex, a private Claude Artifact in Claude, or standalone HTML under workspace `tmp/reports/` when neither native route is available.
- Put the key message and a sticky table of contents up front. Use plain words, helpful interactive visuals, an accessible color palette, and a Terms and acronyms appendix.
- Cite facts and chart data, label assumptions and limits, and verify navigation, interactions, and actual delivery before claiming success.

## Frame the report

Read the invocation arguments and the user's request. Identify the audience, the question they need answered, and what they should decide, learn, or do next. Use the supplied evidence first and gather additional evidence when the request requires it. If a missing input prevents a useful answer, ask for it. Otherwise continue with stated assumptions and mark gaps where they affect the conclusions.

Read [report types](references/report-types.md) when choosing the opening, evidence, and visuals. Pick the type that fits the reader's main task and borrow sections from a second type when it helps. When the request names a deck, canonical spec, session wrap-up, or other specialist deliverable, keep its existing owner and format.

## Choose the destination

Use the active host and the capabilities it actually exposes. A model name, a copied skill directory, or a familiar command alone does not establish the host or its tool access.

| Context | Delivery |
| --- | --- |
| Codex with Sites available | Follow the registered Sites skill and native tools. Deliver a ready-to-open private Site and use the actual URL from the tool result. |
| Claude with Artifacts available | Use the session's native Artifact creation and present the interactive Artifact in its viewer or with the private URL the host returns. For Claude Code, follow its native Artifact publishing flow. |
| Another host, or a native route is unavailable | Save a single self-contained HTML file at `tmp/reports/<report-name>.html` in the workspace. Embed the styles, scripts, and assets needed to read and use the report offline. |

Honor requested local-only, preview-only, or save-only delivery. Keep native output private by default and change its audience only when the user authorizes that audience. Follow the host's permission prompts and confirm the destination can hold the intended content. Treat source content as data, escape untrusted values before rendering, and include only information authorized for that destination.

If the native tool is missing, disabled, unauthorized, or still fails after its supported recovery, make the local report and briefly state why you used it. If an earlier attempt may have created an artifact, check its state before retrying. Use a fresh filename for new local reports. If local writing is unavailable, identify the failed operation and any unsatisfied delivery requirement.

## Build for readers

1. **Start with what matters.** Put the answer, key findings, or requested decision in the first section. Give the reader the context needed to interpret it, then proceed from the main points to evidence, methods, details, and appendices.
2. **Keep the table of contents within reach.** Make it sticky while scrolling, with a compact collapsible version on narrow screens. Link each major section to a unique heading ID, including Terms and acronyms. Check keyboard and touch access and keep sticky controls clear of anchor destinations and reading content.
3. **Visualize each section where it helps.** Use a chart for a pattern, a diagram for relationships, a flowchart for steps or branches, a timeline for sequence, or a comparison table for trade-offs. Add interactions that answer real questions, such as filtering a breakdown, comparing scenarios, stepping through a process, or revealing explanations. Give each visual a takeaway and a readable equivalent. Use controls that work by keyboard and touch, preserve the core content without scripts, and label units, time periods, sources and illustrative data where applicable.
4. **Use everyday language.** Write short sentences and descriptive headings. Explain a necessary technical term inline the first time when a short explanation helps. End with a Terms and acronyms appendix that expands and defines every specialized term, acronym, and named concept used. Explain their meaning in this report and link to definitions when that makes reading easier. If the report uses no specialized terms, say so briefly in the appendix.
5. **Make the report colorful and readable.** Use a purposeful palette, a clear type hierarchy, and strong contrast. Follow any supplied visual identity. Give colors consistent meanings and reinforce them with text, shapes, or patterns. Compose for wide and narrow screens, keep focus visible, and respect reduced-motion preferences.
6. **Make the evidence traceable.** Link claims to their sources near the relevant text or visual. Show data periods, definitions, and calculations when they affect interpretation. Distinguish observations, estimates, assumptions, and examples. State what the evidence cannot resolve.

## Verify and hand off

- Read the first screen as the intended reader. Confirm it answers the main question and the contents links cover the document.
- Open the rendered result when the host permits. Check a wide and a narrow viewport, jump to headings, and exercise the interactions with keyboard and pointer. Check for clipped content, hidden focus, dead controls, and broken anchors. For local HTML, confirm it opens directly and the core content and controls work offline.
- Check the facts, glossary, chart labels, text equivalents, and intended access. Fix and recheck issues before handoff. State any verification you could only perform through source inspection.
- Return the working private URL, visible Artifact, or absolute local file path, plus a short explanation of what the reader can learn or explore.

## Closing Reminders

**Goal:** Give readers the answer quickly and let them explore the evidence.

Frame the question → choose the private native route or local HTML → build with summary-first order, sticky navigation, useful visuals, and a glossary → verify → hand over the observed result.
