---
name: knowledge-synthesis
version: 1.0.0
description: '[Research] Use when synthesizing research findings into a structured report.'
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

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

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
