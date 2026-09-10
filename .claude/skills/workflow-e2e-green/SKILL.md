---
name: workflow-e2e-green
version: 1.0.0
description: '[Workflow] Drive configured E2E and human-QC journeys to green with project-config setup, visible browser evidence, bounded adjudication, and fresh re-verification.'
disable-model-invocation: false
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute the declared workflow steps in order. Before each skill call update task tracking; complete it only with evidence or an explicit skip reason.
> **[BLOCKING]** If task tools are unavailable, maintain an equivalent step tracker and keep exactly one task in progress.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Make a user-invoked E2E verification request converge truthfully. The
default is the whole configured E2E scope; a prompt may target a feature,
bugfix, spec, recording, UI journey, or current context. The workflow reads
project-config, starts the real system, uses a visible browser for web human-QC,
captures/read evidence, selects or generates tests, and delegates the bounded
verify/adjudicate/fix/re-run contract to `e2e-test-verify-loop`.

**Canonical sequence:** `/investigate` → `/e2e-test-verify-loop` → optional
report-only `/experience-review` is owned inside the loop → `/docs-update` →
`/workflow-end` → `/watzup`.

**IMPORTANT MANDATORY Steps:** /investigate -> /e2e-test-verify-loop -> /docs-update -> /workflow-end -> /watzup

## Routing and scope

Activate this workflow for requests such as:

- “test this feature/bugfix end to end”;
- “run the E2E suite and fix what fails”;
- “test the whole project like a human”;
- “generate or use the right E2E test from this prompt/current context”; or
- “open the browser and verify the user journey/UI.”

Resolve an explicit `--scope`/feature/bugfix/test-project target; otherwise
`e2e-test-verify-loop` fixes scope to every configured E2E project and linked
observable surface. Never narrow the scope because only one test failed.

## Mandatory workflow contract

1. `/investigate` establishes the user intent, applicable E2E framework, project-config/reference evidence, affected scope, and whether the configured environment can run. It records `N/A` only when no applicable surface/framework exists and `ENVIRONMENT-BLOCKED` when a relevant capability is missing.
2. `/e2e-test-verify-loop` owns the Goal Contract and all convergence rounds. It reads `e2eTesting.execution` and linked `experienceVerification.surfaces[].localRun`, selects or generates tests through `/e2e-test`/`e2e-runner`, runs project commands, uses visible Playwright CLI for supported web human-QC, and invokes `/debug-investigate`, `/fix`, and `/changes-review` inline for failures.
3. `/docs-update` runs only after the loop has a terminal result and updates the E2E reference/config guidance with evidence-backed learnings. It does not fabricate a runnable suite for an N/A or blocked project.
4. `/workflow-end` and `/watzup` summarize exact results, evidence, blockers, acceptance status, and remaining human decisions.

## Non-negotiable gates

- Project-config/reference is read before any E2E command; startup/readiness/auth/data/browser/evidence values are project facts or explicit blockers.
- Web readiness/actionability precedes a deterministic 200–300ms post-action presentation delay. A fixed delay is never readiness.
- Runtime errors, uncaught exceptions, unhandled rejections, journey-critical failed requests, unread evidence, scope shrink, test loss, assertion weakening, log suppression, and baseline auto-acceptance block convergence.
- Auth and storage state use references only. No credential/token/cookie/storage-state contents are pasted into prompts, reports, screenshots, traces, or video.
- Every fix is adjudicated, made at the owning layer, reviewed in the same round, and re-run from a fresh setup. Cap/non-shrinking/rising/blocked/ambiguous outcomes escalate.

## Applicability handoff

Carry this evidence record from `/investigate` to the loop:

| Field | Required |
| --- | --- |
| `scope` | Fixed whole-project or explicitly narrowed project/surface list |
| `applicability` | `APPLICABLE`, `N/A — evidence`, or `ENVIRONMENT-BLOCKED — capability/evidence` |
| `config` | `e2eTesting` and optional `execution` paths plus linked surface IDs |
| `commands` | Copy-ready full/focused commands, zero-match behavior, simple/Windows entry point when applicable |
| `setup` | localRun dependency/start/readiness/log/teardown, auth reference, seed/data mode |
| `browserEvidence` | runner/engine/headed, pacing, viewport/device, capture/redaction/read policy |
| `repeatProof` | exact counts/exit status and configured consecutive-green fresh runs |

If the project has no runnable E2E surface, complete the workflow with an
evidence-backed N/A/blocked report and do not invoke a generic browser command.

## Output

The workflow report links the investigate record, convergence report,
test/spec changes (if any), evidence inventory, exact runner results, and
final state: `CONVERGED`, `N/A`, `ENVIRONMENT-BLOCKED`, `NOT-CONVERGED`, or
`ACCEPTANCE-PENDING`.

**IMPORTANT:** This workflow is the user-facing route. The convergence loop is
the single remediation owner; `experience-review` is report-only when nested,
and the generated/accepted-baseline boundary remains human-owned.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **FIX GATE — INVESTIGATE FIRST.** Before applying any project-related fix, always invoke `$investigate` or `$debug-investigate` and establish the root cause; the failure site may be only a symptom.
> **FAILED-TEST GATE.** For any failed or flaky test, `$debug-investigate` is mandatory before editing source or tests; never change either side merely to force green.
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

**MUST ATTENTION** FIX GATE: before any project-related fix, invoke `$investigate` or `$debug-investigate`; failed/flaky tests require `$debug-investigate` before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

  **MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders
