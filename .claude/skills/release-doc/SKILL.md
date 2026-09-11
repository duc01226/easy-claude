---
name: release-doc
version: 2.0.0
description: '[Documentation] DEPRECATED — use /release-notes instead for any release document or release notes, at any scope.'
status: deprecated
deprecated_by: release-notes
deprecated_since: 2026-09-08
removal_after: 2026-12-07
---

## Quick Summary

**This skill is DEPRECATED. Do not execute it.** Its entire capability was merged into **`release-notes`** on 2026-09-08.

**What to do instead — always:** invoke `/release-notes`, passing through whatever scope the user gave.

| The user asked for                        | Old invocation                     | Use this instead                     |
| ----------------------------------------- | ---------------------------------- | ------------------------------------ |
| "what changed in the last 30 days"        | `/release-doc --days 30`           | `/release-notes --days 30`           |
| Changes since a date                      | `/release-doc --since 2026-03-15`  | `/release-notes --since 2026-03-15`  |
| A ref range                               | `/release-doc --range v1.0.0..HEAD`| `/release-notes --range v1.0.0..HEAD`|
| A focused analysis                        | `/release-doc --focus "hooks"`     | `/release-notes --focus "hooks"`     |
| Release notes between two tags            | `/release-notes v1.0.0 HEAD`       | unchanged                            |

Every flag is accepted verbatim by `release-notes` — this is a rename, not a behavior change.

## Why the merge

The two skills covered one job (read a git range → categorize → narrate → publish) and differed only in how the range was expressed. Maintaining both meant two routing decisions for users, two places for the HTML presentation procedure to drift, and a real risk of picking the wrong one. `release-notes` is the surviving name because it is the phrase people actually use and it already owned the `lib/*.cjs` pipeline, `config.yaml`, and `README.md`.

`release-notes` absorbed, unchanged:

- Time-range scope resolution (`--days N`, `--since DATE`, `--range base..head`)
- Mandatory git-artifact dumping before any analysis
- Thematic area categorization for non-conventional-commit histories
- The `--focus "..."` deep-dive with its own output section
- The rich HTML release presentation (`references/html-release-report.md`, now at `.claude/skills/release-notes/references/html-release-report.md`) — **default-on**, with real-UI mock-ups and auto-open

## Lifecycle

Per **ADR-0001** (`docs/adr/0001-skill-lifecycle.md`): `status: deprecated`, superseded by `release-notes`, retained until `removal_after: 2026-12-07` for muscle memory, then eligible for `skill-gc.cjs`. The GC tool refuses to delete while non-self references remain, so removal is fail-safe.

**If you are an agent that routed here:** re-route to `release-notes` and continue. Do not ask the user which skill to use — there is only one.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:critical-thinking-mindset:reminder -->
**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.
<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

  **MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders
