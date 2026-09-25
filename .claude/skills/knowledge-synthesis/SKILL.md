---
name: knowledge-synthesis
version: 1.0.0
description: '[Research] Use when a workflow step or the user asks for a research synthesis. Turns research findings into a structured report.'
---

> **Web Research Protocol** — Factual claims need 2+ independent sources; rank Tier 1 authoritative > Tier 2 industry reports > Tier 3 credible blogs; Tier 4 unverified, NEVER cite as fact; declare confidence (95/80/60/<60%). Working files → `.claude/tmp/`; final output → `docs/knowledge/`.
>
> **MUST ATTENTION READ** `.claude/skills/web-research/SKILL.md` for canonical research rules.

## Quick Summary

**Goal:** Synthesize the existing evidence base into a fully cited, template-compliant research report with honest confidence and explicit gaps, trustworthy for decisions.

**Summary:**

- **Purpose/input/output:** Synthesize `.claude/tmp/_evidence-{slug}.md` + `_sources-{slug}.md` from `deep-research` into `docs/knowledge/research/{slug}.md`; do not gather sources — upstream gathering already happened; no alternate mode or flag.
- **Main path:** (1) create small tasks; (2) load evidence and inventory findings/confidence/discrepancies/gaps; (3) load template; (4) synthesize every section with `[N]` citations, per-finding confidence, and Analysis patterns/contradictions; (5) audit citations; (6) roll up confidence, flag `<60%`, run final review, then clean working files after success.
- **Evidence gate:** Every factual claim MUST have inline `[N]` and 2+ independent sources; every Sources-table row needs a reference; Tier 4 is NEVER cited as fact; preserve gaps and discrepancies.
- **Template/terminal gate:** Every enforced-template section, including Knowledge Gaps, MUST appear; final output is `docs/knowledge/research/{slug}.md`, with `.claude/tmp/` cleanup only after successful synthesis.

**Workflow:**

1. **Bootstrap** — Create small `TaskCreate` tasks; keep one `in_progress`; add a final review task.
2. **Load evidence** — Read both evidence files; inventory total findings/confidence, discrepancies, and gaps.
3. **Load template** — Read `.claude/templates/research-report-template.md`; retain every section.
4. **Synthesize** — Write `docs/knowledge/research/{slug}.md`; map evidence into each section, cite `[N]`, declare confidence, and record patterns/contradictions in Analysis.
5. **Citation audit** — Verify claim citations, Sources-table coverage, and no orphan citations.
6. **Confidence and close** — Average scores, weight by importance, flag `<60%`; after successful synthesis, clean `.claude/tmp/` working files.

**Key Rules:**

- **MUST ATTENTION** use enforced template structure; every section, including Knowledge Gaps, appears.
- **MUST ATTENTION** cite every factual claim inline `[N]`; use 2+ independent sources; reference every Sources-table row; Tier 4 is NEVER fact.
- **MUST ATTENTION** synthesize existing evidence only; NEVER gather sources, fabricate, add, or upgrade findings.
- **MUST ATTENTION** declare confidence, preserve gaps/discrepancies, and flag every `<60%` finding.

**Be skeptical; apply critical/sequential thinking; trace every claim; state confidence (>80% to act).**

# Knowledge Synthesis

## Knowledge Work Rules

Apply the web-research protocol above: use its source tiers, cross-validation, confidence declarations, enforced template, and `.claude/tmp/` / `docs/knowledge/` paths.

## Step 1: Load Evidence

Read `.claude/tmp/_evidence-{slug}.md` and `.claude/tmp/_sources-{slug}.md`.

Inventory total findings with confidence scores, unresolved discrepancies, and remaining gaps.

## Step 2: Load Template

Read enforced template: `.claude/templates/research-report-template.md`

Every template section MUST ATTENTION appear in final report.

## Step 3: Synthesize Report

Write to `docs/knowledge/research/{slug}.md`. For each template section:

1. Map relevant findings from evidence base
2. Write content with inline citations `[N]`
3. Declare confidence per finding
4. Note cross-cutting patterns and contradictions in Analysis section

## Step 4: Citation Audit

Verify:

- Every factual claim has inline `[N]` citations and 2+ independent sources
- Every source in Sources table referenced 1+ time
- No orphan citations (referencing non-existent source)

## Step 5: Confidence Summary

Calculate overall report confidence:

- Average of all finding confidence scores
- Weight by finding importance
- Flag any <60% findings prominently

## Output

Final report: `docs/knowledge/research/{descriptive-slug}.md`

Clean up `.claude/tmp/` working files after successful synthesis.

---

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Synthesize the existing evidence base into a fully cited, template-compliant research report with honest confidence and explicit gaps, trustworthy for decisions.

**IMPORTANT MUST ATTENTION Main path:** (1) create small `TaskCreate` tasks; keep one `in_progress`; add a final review task; (2) load both evidence files and inventory findings/confidence/discrepancies/gaps; (3) load the enforced template and retain every section; (4) synthesize to `docs/knowledge/research/{slug}.md` with `[N]` citations, per-finding confidence, and Analysis patterns/contradictions; (5) audit claim citations, Sources-table coverage, and orphan citations; (6) average scores, weight by importance, flag `<60%`, run final review, then clean `.claude/tmp/` only after success.

**IMPORTANT MUST ATTENTION Mode/boundary:** No alternate mode or flag; consume existing `deep-research` evidence; NEVER gather sources, fabricate, or upgrade findings; clean `.claude/tmp/` only after successful synthesis.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):** MUST ATTENTION honor every block below — each is a signpost to its canonical body above.

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced proof per claim, confidence >80% to act, never guess as fact.

**IMPORTANT MUST ATTENTION** use enforced template structure (`.claude/templates/research-report-template.md`) — every section required, NEVER omit Knowledge Gaps — why: a missing gaps section manufactures false confidence in incomplete research
**IMPORTANT MUST ATTENTION** inline-cite every factual claim with `[N]`; verify zero orphan citations (claim cites missing source) AND zero orphan sources (Sources-table row referenced 0 times) — why: uncited claims are assertions, not findings
**IMPORTANT MUST ATTENTION** synthesize FROM the evidence base only (`.claude/tmp/_evidence-{slug}.md` + `_sources-{slug}.md`) — NEVER fabricate, add, or upgrade findings beyond gathered evidence; this skill consolidates, it does not research — why: invented findings poison the report's trust
**IMPORTANT MUST ATTENTION** respect source tiers — Tier 4 (unverified) NEVER cited as fact; every factual claim backed by 2+ independent sources — why: single-source or unverified claims read as confident but unproven
**IMPORTANT MUST ATTENTION** close with an honest confidence rollup (importance-weighted average of finding scores) that prominently flags every <60% finding — why: an unflagged weak finding inflates apparent report confidence
**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; mark one `in_progress` at a time and complete it on evidence
**IMPORTANT MUST ATTENTION** cite `file:line` evidence (or `[N]` source) for every claim — confidence >80% to act, <60% DO NOT assert; NEVER present a guess as fact
**IMPORTANT MUST ATTENTION** grep/read 3+ similar existing reports under `docs/knowledge/research/` before writing — match the template's section shape, do NOT invent a new layout — why: divergent report structure breaks the knowledge-review gate
**IMPORTANT MUST ATTENTION** output final report to `docs/knowledge/research/{slug}.md`, then clean up `.claude/tmp/` working files after successful synthesis — why: stale working files leak across runs
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality (template complete · citations balanced · gaps present · rollup flagged)

**Anti-Rationalization:**

| Evasion                                       | Rebuttal                                                                          |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| "Evidence is thin, fill the gap with my own" | NEVER fabricate. Record it in Knowledge Gaps with confidence <60% instead.        |
| "This claim is obvious, skip the citation"   | No `[N]` = not a finding. Cite the source or move it to assumptions.              |
| "Gaps section is empty, drop it"             | Empty ≠ omit. State "no unresolved gaps" explicitly — omission fakes completeness. |
| "All findings strong, skip the rollup flag"  | Compute the weighted average; flag any <60%. One weak finding hides in the mean.   |
| "Template section is N/A, delete it"         | Keep it, write "Not applicable — why". Missing sections fail the knowledge-review. |
