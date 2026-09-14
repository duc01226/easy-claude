# E2E Quality Protocol

Portable shared gate for executable E2E, browser, and user-flow artifacts. Consumer skills keep their own mutation and execution boundaries; this file owns the common quality contract.

## Quick Summary

**Goal:** Make every applicable E2E/user-flow check prove the intended business journey with stable, isolated, secure, deterministic, inspectable, cleaned-up, and spec-traceable evidence.

**Workflow:** detect an executable surface → read project contract and intent → record Given/When/Then + invariant → evaluate every applicable gate → capture exact run/evidence → classify PASS, NOT-APPLICABLE, ENVIRONMENT-BLOCKED, or UNVERIFIED → hand findings to the owning skill.

**Key Rules:**

- Apply this protocol only when executable E2E/browser/user-flow evidence exists; prose that merely mentions E2E is not a trigger.
- In each GWT record, assert the business/user outcome owned by the system, not runner bookkeeping, setup side effects, or delivery metadata.
- Read project config/reference docs before selecting a runner; never infer a framework, command, selector, credential, or data path.
- `NOT-APPLICABLE` means no executable surface; a relevant surface with missing capability is `ENVIRONMENT-BLOCKED`, never a pass.

## Applicability and ownership

Trigger evidence includes changed E2E test/spec files, browser configuration, fixtures, page/component objects, browser helpers, recordings, or source changes that alter an exercised user journey. Exclude generic skill/docs prose that only describes E2E.

| Consumer | Owns | Shared gate use |
| --- | --- | --- |
| `e2e-test` | Selects, writes, or updates tests | Apply before authoring; preserve the GWT, invariant, and gate record. |
| `e2e-test-verify` | Report-only inspection and one configured verification invocation | Evaluate every applicable row; never edit source, tests, fixtures, baselines, or user data. |
| `e2e-test-verify-loop` | Full-scope convergence, repair, and fresh reruns | Reapply the gate each round; retain scope, evidence, and cleanup integrity. |
| `experience-review` | Runtime, console, screenshot, and visual acceptance evidence | Apply runtime/visual rows; route static source findings to the code/UI owner. |
| `changes-review` / `workflow-review-changes` | Conditional diff routing and finding integration | Trigger only from executable-surface evidence; preserve the existing review sequence. |

## Scenario contract

Every behavior-bearing E2E case records:

```text
Given <verified actor, fixture/data, permissions, and starting state>
When <real user actions through the configured interface>
Then <owned business outcome plus applicable error, recovery, or permission result>
INVARIANT <Feature Spec/acceptance criterion/source contract protected>
TC <existing traceable test-case identifier or an explicitly proposed one>
```

## Quality gate

Apply one row per scenario and record `PASS`, `NOT-APPLICABLE`, `ENVIRONMENT-BLOCKED`, or `UNVERIFIED` with evidence and owner.

| Gate | Given | When | Then |
| --- | --- | --- | --- |
| Business/user-flow intent | Actor, entry state, intent, and applicable states are known | The real journey is exercised | The observable/persisted result and failure/recovery behavior match the governing intent |
| Stable locators/page objects | Existing Common → Domain-Shared → Page ownership is mapped | A control is located or used | Stable semantic/data/accessible locators and actions stay in the owning object; outcome assertions stay in the test |
| Isolation/fixtures/data | Run identity, fixture scope, and reference/idempotent/additive data policy are known | The case runs alone, repeats, or runs in parallel | Mutable data cannot collide, setup is restart-safe, and no shared state is reset |
| Auth/permissions | Actor identity and project-owned auth path are verified | Authorized and applicable denied paths are exercised | Access matches the contract and no credential/secret value enters code, prompt, or evidence |
| Accessibility/responsive/visual (when relevant) | Applicable states, viewports/devices, and design authority are declared | Each relevant state and viewport is observed | Controls remain usable/readable/responsive; every required artifact is opened/read; static findings route to UI review and runtime findings to experience review |
| Async/wait determinism | Readiness, actionability, postcondition, and error-state signals are named | Each meaningful control action occurs | A bounded reusable wait surrounds the action, real settle signals are used, and applicable browser pacing waits exactly 500ms after the postcondition |
| Failure evidence/artifacts | Log/console/request/screenshot/trace capture is attached before interaction | The run succeeds or fails | Exact command, counts, exit status, run identity, redacted readable artifacts, and failure evidence are persisted |
| Cleanup | Started processes and current-run ephemeral resources are identified | Evidence capture finishes | Only resources started by this run are torn down; accepted, seeded, reference, additive, and shared data remain intact |
| Test-to-spec traceability | A Feature Spec, acceptance criterion, or source contract is identified | The GWT case is linked to the test artifact | The TC names the protected invariant and coverage gaps feed both the intent/spec and test owners |

## Verdict and handoff

- `PASS` requires every applicable row, exact runner output, and readable evidence; a passing command alone is insufficient.
- `NOT-APPLICABLE` requires evidence that no executable E2E/user-flow surface exists. `ENVIRONMENT-BLOCKED` names the relevant missing runner, auth, data, service, browser, or evidence capability. `UNVERIFIED` names incomplete inspection.
- Route test-code/fixture/locator findings to `e2e-test` or `e2e-test-verify`; route convergence and owning-layer repairs to `e2e-test-verify-loop`; route runtime/screenshot findings to `experience-review`; route static UI source findings to `ui-review`.

## Required record

Persist: trigger/scope evidence · GWT + invariant + TC · config/command/auth/data/matrix evidence · one verdict per gate row · exact counts/exit status · artifact paths/read/redaction status · cleanup result · final verdict, owner, and next step.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Make every applicable E2E/user-flow check prove the intended business journey with stable, isolated, secure, deterministic, inspectable, cleaned-up, and spec-traceable evidence.

**IMPORTANT MUST ATTENTION** detect the executable surface first, record Given → When → Then + invariant, apply every applicable quality row, preserve exact evidence and scope, and route findings to the owning consumer.

**IMPORTANT MUST ATTENTION** use `NOT-APPLICABLE` only for an absent executable surface; use `ENVIRONMENT-BLOCKED` or `UNVERIFIED` for missing capability/evidence; never convert an incomplete check into PASS.
