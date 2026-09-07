# Experience verification configuration

`experienceVerification` is an optional project-config contract for reviewing
what users or downstream consumers actually experience. It is deliberately
not a web-test setting and does not replace a project’s existing test, lint,
accessibility, device, API, CLI, or generator tooling.

## Minimal shape

```json
{
  "experienceVerification": {
    "enabled": true,
    "evidenceRoot": "plans/reports/experience",
    "baselineRoot": "tests/experience-baselines",
    "acceptancePolicy": "manual-acceptance-required",
    "reviewOn": ["new-surface", "changed-surface", "bugfix", "baseline-mismatch"],
    "surfaces": [
      {
        "id": "primary-output",
        "kind": "api|library|terminal|web|mobile|desktop|background|generated",
        "runner": "project-configured-runner-or-manual-tool",
        "entryPoints": ["project-specific entry point"],
        "changeTriggers": ["paths or impact labels"],
        "fullCommand": "optional project command",
        "focusedCommand": "optional project command",
        "states": ["default", "error", "recovery"]
      }
    ]
  }
}
```

The `kind`, runner, entry points, commands, and states are project facts, not
framework defaults. Use the project’s existing commands and tools. A surface
is `APPLICABLE` only after the agent verifies that the configured entry point,
runner, fixture/data, and inspection capability work in the current
environment. Configuration alone cannot prove applicability.

## Lifecycle

1. Read the intended purpose and configure only observable surfaces that matter
   to actors, operators, downstream callers, or generated-artifact consumers.
2. Store candidate observations and reports below `evidenceRoot`. Record the
   exact command/tool, entry point, fixture/identity, platform/device/viewport/
   locale/network conditions, actions, settle signals, and evidence references.
3. Keep accepted expectations below `baselineRoot` only after an explicit
   human/owner decision. `experience-review` records the decision but does not
   silently rewrite tests, snapshots, fixtures, or baselines.
4. On mismatch, retain the prior accepted evidence and classify the result as a
   possible regression, intended change pending acceptance, invalid condition,
   blocked environment, unverified, or ambiguous. Unaffected cases retain
   their existing protection.

## Honest non-applicability

Set `enabled` to `false`, keep `surfaces` empty, and supply a nonempty
`experienceVerification.notApplicableReason` in the JSON when no applicable
surface is present yet. For example, merge this block into the project config,
replacing the reason with verified project facts:

```json
{
  "experienceVerification": {
    "enabled": false,
    "evidenceRoot": "plans/reports/experience",
    "baselineRoot": "tests/experience-baselines",
    "acceptancePolicy": "manual-acceptance-required",
    "surfaces": [],
    "notApplicableReason": "No observable application surface is configured in this repository."
  }
}
```

The project-init report must also state why this is
`NOT-APPLICABLE` or what capability is pending; it must not claim a live review.
If a relevant surface exists but cannot run or be inspected, record
`ENVIRONMENT-BLOCKED`, not `NOT-APPLICABLE` and not PASS.

## Acceptance record

An accepted record names `acceptedBy`, `acceptedAt`, `intentRef`,
`evidenceRefs`, accepted scope, and residual risk when relevant. Agent
confidence, a passing automated test, a generated screenshot, or a current
implementation is never a substitute for that record. Ordinary regression
tests remain model-free and reproducible without an AI service.
