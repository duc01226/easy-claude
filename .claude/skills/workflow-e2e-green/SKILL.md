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
