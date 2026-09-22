---
name: e2e-test
description: '[Testing] Use when selecting, generating, updating, or maintaining E2E tests from a prompt, current context, recordings, specs, or code changes.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **E2E Quality Protocol** — the shared gate covers user-flow intent, configured locator/action ownership, isolated fixtures/data, auth/permissions, applicable accessibility/responsive/visual checks, bounded waits, readable failure evidence, cleanup, and test-to-spec traceability.
> **MUST ATTENTION READ** `.claude/skills/shared/e2e-quality-protocol.md` before writing or updating an executable E2E/browser/user-flow case; keep the detailed gate there and record only its result here.
> **UI State Capture Protocol** — when the case touches a user-facing UI and visual review is enabled, also **MUST ATTENTION READ** `.claude/skills/shared/ui-state-capture-protocol.md`: it owns the action-layer auto-capture instrumentation, the capture manifest, and the case-by-case review the captures feed.

## Quick Summary

**Goal:** Produce or select maintainable, spec-traceable E2E tests from the user prompt/current context, recordings, canonical artifacts, or code changes with the project's configured framework (Playwright, Selenium, Cypress, or another), then exercise the declared scope like a human QC tester and protect business behavior so cosmetic UI changes do not break tests and intended behavior breaks do. Resolve case identity from the configured artifact profile; use TC/§8 only when no native `specArtifacts` profile is declared.

**Summary:**
- **Testability contract:** resolve Unit/Integration/System/E2E applicability from runner/config evidence; record owner/root/data, copy-ready full + focused commands, zero-match behavior, CI/simple-Windows entry, unique run/data identity, and repeat proof; unresolved applicable fields block handoff, while non-applicable tiers require evidence-backed `N/A`.

- **Purpose:** turn recordings/specs/code changes into maintainable, spec-traceable E2E tests that break ONLY when intended business behavior breaks — never on cosmetic UI churn.
- **Main steps (in order):** (1) resolve scope from the prompt/current context/artifact/code and default whole-project intent; (2) read the configured E2E reference, `e2eTesting` block, `specRoots.business.path`, and optional `specArtifacts` profile from `docs/project-config.json` FIRST — never assume a stack or invent an ID/annotation marker; (3) resolve the optional `e2eTesting.execution` profile and linked `experienceVerification` surface; (4) load owner-qualified scenario/case IDs and their configured evidence from the canonical root using the profile's identifiers, carriers, and section roles; when no native profile is declared, use the default TC/§8/Test Specifications model; (5) pass the Real-World Fidelity Gate BEFORE writing test code — can this flow, timing, and data actually occur in production?; (6) select a suitable existing test or generate/update one using the configured test organization (spawn the `e2e-runner` sub-agent); (7) bring up the configured whole system, authenticate/seed only through project-owned paths, and run visible web QC/evidence when applicable; (8) run tests with the project's configured command; (9) update the configured E2E reference with learnings.
- Every test uses the case identity and carrier declared by the artifact profile and maps its owner-qualified case/variant plus configured requirement/acceptance references to the actual executing test, assertion, and result, respecting profile cardinality. The strict default profile uses a `TC-{MODULE}-E2E-{NNN}` case traced to §8; if the owner, ID, evidence, or assertion cannot be resolved, keep coverage unresolved as `UNVERIFIED` rather than inventing a registry or claiming a pass. Follow the configured locator/action organization, extracting helpers or objects only when its convention or demonstrated reuse warrants them; keep final behavior assertions visible in the test.
- For applicable browser/UI E2E, use the configured runner's native waits or an evidenced project helper for observable readiness and expected outcomes. Apply action pacing only when project config specifies it; a delay never replaces a wait or settle signal.
- When visual review is requested or required by the project contract for an applicable visual surface, capture the required state × viewport matrix. Add transition captures only when `uiStateCapture.mode` is explicitly `every-action` and a source-verified shared boundary supports them; `declared-only` records transition gaps and `off` records transition coverage as `N/A`. Send configured evidence to `/experience-review` for case-by-case adjudication. An explicit false value cannot waive a project-required gate. Do not update snapshots, baselines, or assertions automatically.
- **Shared quality gate:** Before authoring, apply `.claude/skills/shared/e2e-quality-protocol.md` to the scenario and preserve its Given/When/Then, invariant, gate-row, evidence, and owner records; this skill owns test selection/generation, not the detailed cross-skill checklist.
- For browser E2E, prefer accessible semantics (role plus accessible name, associated label, or the platform's accessibility identifier); use an explicit stable test hook next. Use visible text or another project-configured stable locator only when needed. Styling classes, including BEM or utility classes, are not semantic locators; avoid generated or positional selectors and XPath unless the project documents a reviewed exception.
- Use the project's fixture/data strategy and isolate mutable test state; choose unique run data when concurrency or shared state requires it. NEVER delete or reset persistent, reference, seeded, additive, or shared data. If the project declares opt-in cleanup, remove only current-run ephemeral resources after evidence capture and never use cleanup as repeat-proof. Auto-select the appropriate workflow when not already in one. If the requested prompt/context scope has no suitable test, generate a scenario in the project's declared format; if a suitable test exists, reuse it and report why it covers the scope.

**Workflow:**

1. **Resolve** — classify prompt/current-context/spec/code scope, affected observable surfaces, and whole-project vs focused intent.
2. **Read** — **MUST ATTENTION** load the E2E reference, `e2eTesting` config, optional `execution` profile, linked `experienceVerification` surfaces, `specRoots.business.path`, and optional `specArtifacts` profile before writing; resolve case evidence from the configured root and carrier.
3. **Gate** — pass the Real-World Fidelity Gate for flow, pacing, data, and settle signals; resolve startup/auth/seed/evidence capability as `APPLICABLE`, `N/A`, or `ENVIRONMENT-BLOCKED`.
4. **Select or generate** — reuse a suitable project test when one exists; otherwise follow the project's configured test organization and use the `e2e-runner` sub-agent with traceability and Given/When/Then intent. Do not infer a Page Object Model from a path setting alone.
5. **Exercise and verify** — bring up the real system, use the visible configured browser for web QC, capture/read evidence, run configured tests, confirm exact results, and record learnings.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`), confidence >80% to act.
- MUST ATTENTION apply the Real-World Fidelity Gate before writing setup — a flow, pacing, or data shape production can never reach proves nothing; fix the SCENARIO, never the assertion.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION apply the shared E2E quality protocol before writing and carry every applicable gate verdict into the report.
- NEVER skip mandatory workflow or skill gates.

## ⚠️ MANDATORY: Read Project E2E Reference (FIRST)

**BEFORE ANY E2E WORK, you MUST ATTENTION:**

```bash
# 1. Read project-specific E2E patterns (REQUIRED)
head -100 docs/project-reference/e2e-test-reference.md

# 2. Read project config for the framework, owner root, artifact profile, and commands
grep -A 50 '"e2eTesting"' docs/project-config.json
grep -A 20 '"specRoots"' docs/project-config.json
# Read `specArtifacts` too when declared; use its configured IDs, carriers, and evidence sections.

# 3. Only when no native `specArtifacts` profile is declared, find default-profile TC cases
grep -r "TC-.*-E2E-" <resolved-business-spec-root>
```

**Resolve these project facts from `docs/project-config.json`:**

- `e2eTesting`: framework, language, E2E paths, run commands, and annotation mechanism.
- `specRoots.business.path`: canonical business-artifact owner root from project configuration; use the framework config loader's fallback only when unset.
- Optional `specArtifacts`: configured requirement/acceptance/scenario IDs, owner relation, carriers, and intent/contract/evidence section roles. When absent, use the strict default TC/§8/Test Specifications model. A declared but invalid or incomplete profile blocks traceability; never fall back to TC/§8.

**When investigating/fixing E2E failures, update `e2e-test-reference.md` in the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) with learnings.**

- `domain-entities-reference.md` under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

---

## Framework Detection (SECOND STEP)

Detect the project's E2E stack before generating tests:

```bash
# Use project config, project-reference docs, and existing test config files as the source of truth
rg "playwright|cypress|selenium|webdriver|e2e" docs/project-config.json docs/project-reference/ . 2>/dev/null
rg --files | rg "(playwright|cypress|webdriver|selenium|e2e|test).*config|manifest|project"
```

| Framework                 | Config Source               | Test Naming             | Run Command                    |
| ------------------------- | --------------------------- | ----------------------- | ------------------------------ |
| Configured E2E framework  | project config/reference docs | existing local examples | configured test command        |

## E2E Applicability and Contract Preflight (before generation)

Record E2E as `APPLICABLE` only when the project config/reference docs, an actual framework configuration, and a runnable command all provide evidence. Otherwise record `N/A — <file:line evidence>` and stop E2E generation for that project; never infer a browser project from skill-local examples. If the current repository has no runnable E2E stack, record that project-specific evidence-backed N/A in the report; do not fabricate a browser stack, page object, or E2E command.

When E2E is applicable, add the following fields to the test plan/report before generating code:

| Applicability evidence | Owner / test root | Runner/framework | Full command | Focused/partial command | Zero-match behavior | Run identity / data mode | Parallel isolation | Simple/Windows entry point |
| ---------------------- | ----------------- | ---------------- | ------------ | ------------------------ | ------------------- | ------------------------ | ------------------ | --------------------------- |
| `{file:line}` | `{owner}` / `{path}` | `{configured stack}` | `{copy-ready command}` | `{copy-ready command or N/A + evidence}` | `{documented non-zero behavior}` | `{unique identity; reference/additive mode}` | `{worker/root strategy}` | `{entry point or N/A + evidence}` |

- Use only configured browser/service commands. A focused selection must be copy-ready and invalid or zero-match selections must fail or follow the runner's documented non-green behavior; never report zero matches as a passing scope.
- Generate unique self-sufficient data through supported public paths. Reference data is count-before-create, idempotent, and restart-safe; intentional persistent data is keyed and additive. Preserve realistic actor pacing and arrange barriers, and isolate mutable data across parallel workers.
- If the configured stack has persistent state, capture exact Passed/Failed/Skipped counts and exit status for each applicable focused/full scope and require two consecutive no-reset full runs. If no runnable E2E stack exists, report the evidence-backed N/A instead of substituting generic browser tooling.

## E2E Execution Profile and Human-QC Preflight

When `docs/project-config.json` contains `e2eTesting.execution`, resolve it before choosing a runner:

| Profile area | Resolve | Source of truth / fail-closed result |
| --- | --- | --- |
| `surfaceIds[]` | Match each ID to `experienceVerification.surfaces[]` | Matching surface owns `localRun`; an unknown/missing surface is `ENVIRONMENT-BLOCKED` until discovered and configured |
| `auth` | Fixture, storage state, registration, manual, or none | Use only `credentialsRef`/`storageStateRef` references or a verified registration path; never copy secret values; missing capability blocks |
| `data` | Seed command, project-relative working directory, reference/idempotent/additive mode, cleanup policy | Use supported public setup, unique run data, and current-run-only cleanup after evidence; never reset shared state |
| `browser` | Configured runner/engine, headed visibility, optional action-delay policy | Use the configured runner's native wait strategy or an evidenced bounded helper for applicable readiness and outcomes; apply a delay only when the project contract specifies it |
| `evidence` | Project-relative root, screenshot/console/request/trace/video kinds, redaction reference | Attach listeners before interaction, capture and read artifacts, redact sensitive values; unread or unredacted evidence is not verification |
| `convergence` | Max attempts, consecutive-green requirement, settle timeout | Use a bounded loop; cap, non-shrinking/rising failures, or missing capability escalates rather than retrying forever |

If the profile is absent or partial, discover missing facts in this order: linked
`experienceVerification.surfaces[].localRun`, the E2E reference and runner
configuration, package/task/compose/CI scripts, fixture/seed/auth documentation,
then bounded repository search. Cite every discovered command and path. Do not
invent ports, accounts, selectors, browser dependencies, or test commands.

Before generating a test, write a small scenario record:

```text
GIVEN <verified actor, fixture/data, and starting state>
WHEN <real user actions through the configured interface>
THEN <visible/persisted/business outcome and relevant error/recovery state>
OWNER <configured canonical artifact path, or the authoritative source-contract owner>
CASE <owner-qualified configured scenario/case ID and optional variant>
INTENT <configured requirement/acceptance IDs and protected invariant, or authoritative source rule>
EVIDENCE <configured evidence-section heading and test carrier; default §8/Test Specifications only when no native profile is declared>
EXECUTOR(S) <actual test/case carrier(s)> · ASSERTION(S) <actual assertion(s)> · RESULT(S) <exact run result(s), otherwise UNVERIFIED; honor configured cardinality>
WAITING <runner-native or project-configured bounded condition for meaningful readiness/outcomes>
SETTLE <observable readiness/state signal after each meaningful action>
```

For a browser run, keep it visible when `headed` is true or human-QC is
requested, and record the viewport/device/locale/network conditions that apply.
Use the configured runner's native wait strategy or an evidenced project
helper for bounded readiness and positive/negative outcomes. Apply action delay
only when configured; it never replaces a readiness, postcondition, or settle
signal.

When visual review is enabled, record the state × viewport capture plan and use
the project's configured runner and evidence policy. Capture transitions only
when `uiStateCapture.mode` is explicitly `every-action` and the project has a
verified capture boundary; otherwise follow `declared-only` or `off` as
configured. `/experience-review` opens and reads generated images and judges
them against the applicable project UI authority. Keep candidate captures
under the configured evidence root or `tmp/` and preserve accepted expectations.

## Visual Screenshot Review (when requested or required)

The framework has no universal screenshot-review default. Resolve visual review
from the task request and project contract; non-visual work or a visual surface
with no applicable requirement is `N/A` for this gate. When screenshots are
required, capture the project-declared state × viewport matrix
and add UI-state-changing transitions only when the resolved
`uiStateCapture.mode` is `every-action` and an evidenced capture boundary exists.
Preserve candidate artifacts, open/read each image, and send the image evidence through
`/experience-review --rounds=0` before any expectation or baseline decision.
Missing capture, unread images, an unindexed capture, or missing inspection for
an applicable visual surface is `ENVIRONMENT-BLOCKED`, not a pass. An explicit
`--visual-review=false` may skip optional screenshot review only; it cannot
waive a project-required gate or skip E2E execution, runtime evidence, or the
other acceptance gates.

**E2E may carry separate behavior and visual gates.** The configured run proves
the journey's behavior. When visual review applies, its captures provide
separate evidence about the interface against the project's design authority;
a green behavior suite does not substitute for a visual gate the project
requires. Skip that gate when it is out of scope and record why.

## UI State Capture

Full contract: `.claude/skills/shared/ui-state-capture-protocol.md`. The
project-level default is `uiStateCapture.mode: declared-only`: capture the
configured state × viewport matrix and report uncaptured journey transitions as
coverage gaps. `every-action` is opt-in and requires a source-verified existing
capture boundary; use the runner's native readiness/postcondition waits and
project-configured pacing. `off` skips transition capture only and follows the
shared contract for the declared matrix and visual-review gate. Do not create a
page-object model, base class, helper, or per-test screenshot pattern solely to
satisfy this framework protocol. The manifest uses the configured case identity
and evidence root; when no native artifact profile exists, follow the strict
default TC identity.

---

## Workflow Modes

| Mode             | Input                      | Output                       |
| ---------------- | -------------------------- | ---------------------------- |
| `from-recording` | Recording JSON + feature   | Test spec + artifacts required by the project's configured organization |
| `from-prompt` | User prompt describing a journey or bugfix | Reused or generated GWT scenario + test/evidence report |
| `from-context` | Current diff, runtime context, or selected whole-project scope | Selected/generated tests + fixed-scope verification record |
| `update-ui`      | Git diff of UI changes     | Candidate evidence plus an explicit acceptance decision; accepted baseline changes only after approval |
| `from-changes`   | Changed test specs or code | Updated test implementations |
| `from-spec`      | Configured owner-qualified case/variant IDs and intent references | Tests mapped to accepted intent |
| `verify` | Existing configured suite and current context | Exact run result, evidence, adjudication, and blocker/escalation record |

---

## Visual Expectation Transition Gate

For `update-ui`, screenshot or visual output is candidate evidence until it has
been opened, inspected, compared with the intended purpose, and linked to an
explicit `HUMAN-ACCEPTED` record through `/experience-review`. Do not call
`--update-snapshots`, replace visual fixtures, or rewrite another expected
output merely because the new run passes or the generated evidence looks
plausible. Preserve the previous accepted expectation and classify a mismatch
as a potential regression, intended change pending acceptance, invalid test
condition, environment block, unverified, or ambiguous. Full contract:
`SYNC:experience-acceptance-contract`.

---

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

Evaluating code, refactor, test, abstraction, ask:
**does this make next change cheaper or more expensive?**

- Reject "best practices" raising change cost (premature abstraction, speculative generality, leaky indirection, ceremony without payoff).
- Name real enemies in findings: **coupling, hidden state, duplicated knowledge, unclear intent, irreversible decisions exposed too early**.
- Simpler design easy to change beats sophisticated design that isn't.

Apply this lens **before** invoking any specific rule, pattern, checklist below — if downstream rule would raise change cost, this principle wins.

---

## Core Principles

### 1. Profile-Resolved Case Traceability (MANDATORY)

**For every behavior-bearing E2E case MUST ATTENTION:**

- Resolve the canonical owner under `specRoots.business.path` and requirement/acceptance/scenario/case IDs from optional `specArtifacts.identifiers`, `ownership`, and `carriers`; include its configured variant when applicable.
- Map that owner-qualified identity to the actual executing test/case declaration(s), assertion(s) protecting its accepted intent, and exact run result(s), respecting configured cardinality. Use `specArtifacts.sections.evidence` and the declared carrier; when no native profile is declared, the strict default is a TC case in §8/Test Specifications.
- Record unknown or missing owner, ID, evidence, executor, or assertion as unresolved `UNVERIFIED`; it cannot receive `PASS`. Never infer identity from a test title alone when the declared profile requires an owner/carrier, and never create a parallel case registry.

The following is an example **only for the strict default profile when no native `specArtifacts` profile is declared**. Otherwise use the identifier and carrier selected by project config; never invent a framework-specific marker.

```typescript
// Default-profile example only
test('TC-RT-E2E-001: Submit return request', async () => { ... });
```

> **Spec-Loop Discipline (E2E tier — tailored).** Trace each configured requirement/acceptance and owner-qualified case/variant through its evidence section to the actual executing assertion(s) and result(s), preserving profile cardinality. Use the profile's intent/contract sections to name the protected behavior; only the strict default profile uses the §8 invariant/behavior and TC case. A case with no actual assertion, or a behavior gap in either direction, remains unresolved and feeds the **Dual-Feedback** loop to the canonical owner and test together — never a test-only fix or duplicate case registry. **Scoped N/A:** property/metamorphic generation and the MUTATION-SCORE assertion gate are scoped to unit/integration core-logic; they do NOT apply at the E2E tier — do not force them here.

### 2. Test organization and locator/action ownership

Before creating or changing test abstractions, read the project's configured E2E reference and `e2eTesting` configuration, then inspect comparable tests, helpers, and objects where present. Follow the explicit local organization and record the choice with its evidence in the test plan or handoff. A configured object path identifies where objects live; it does not, by itself, require a Page Object Model. If no organization is declared, keep one-off locators in the test and extract a small helper/object only when demonstrated reuse gives it a clear owner.

- Keep each locator and interaction in the owner established by the project pattern.
- A scenario-local scoped locator is appropriate for a one-off interaction. Use a shared helper or object when the project convention calls for it or repeated behavior has a clear reusable owner.
- Use page/component objects and layered Common, Domain-Shared, or Page organization when configured or supported by concrete reuse. Do not add a base class, tier, wrapper, or empty object solely to satisfy a framework taxonomy.
- Keep the final business outcome assertion and scenario intent visible in the test. Abstractions may provide reusable actions but must not hide the behavior the test protects.
- Keep data, authentication, evidence, and readiness helpers cohesive and purpose-specific; do not create catch-all utility classes. Keep one canonical owner for each selector/action/wait when the configured pattern has shared owners.

### 2.2 Readiness and Postcondition Synchronization

E2E tests should read like a human: observe → act → observe. Use the configured
runner's native wait strategy or an evidenced project helper for applicable
readiness/actionability and positive or negative postconditions. Bound custom
waits and include useful diagnostics. Do not require a helper API, polling
utility, or object organization that the project does not use.

Before an action, establish the applicable ready/actionable state using the
configured runner. After it, wait for the expected result or error before the
next dependent action and keep the final assertion visible in the test. A
timeout is a test failure with diagnostics, not a reason to weaken an
assertion. Apply configured action pacing only after meaningful waits; it never
replaces readiness, postconditions, or settle signals. Capture a transition at
this boundary only when `uiStateCapture.mode` is `every-action` and the
configured project boundary supports it.

### 3. Selector Strategy (Priority Order)

1. **Accessible semantics** — role plus accessible name, associated label, or the platform's native accessibility identifier
2. **Explicit test hooks** — project-owned stable identifiers such as `[data-testid]` or `[data-cy]`
3. **Project-configured stable locators** — visible text or another documented locator when the semantic or test-hook options do not fit

**AVOID:** Styling classes as semantic locators (including BEM or utility classes), generated classes, positional selectors (`:nth-child`), and XPath unless the project documents a reviewed exception.

### 4. Unique Test Data

Tests MUST generate unique data to be repeatable:

- Append GUIDs/timestamps to test data
- Make each test self-sufficient with own generated data; NEVER depend on specific pre-existing database state
- Preserve seeded, reference, additive, and shared data. If the project declares opt-in cleanup, remove only current-run ephemeral resources after evidence capture — why: teardown across shared runs creates side effects for parallel/repeat tests

### 5. Preconditions Documentation

Document what must exist before test runs:

- System: Infrastructure running, APIs healthy
- Data: Seed data exists (users, companies)
- Feature: Configurations complete

---

## Steps

1. **Resolve scope** from prompt/current context/spec/code; default to the whole configured E2E scope unless the user names a narrower feature/bugfix/journey.
2. **Detect framework** from project files and the configured profile; a skill-local browser helper is never project evidence.
3. **Read project E2E docs** and `e2eTesting.execution`/linked surface data for conventions, setup, auth, data, runner, evidence, and convergence.
4. **Load case intent** — resolve `specRoots.business.path` plus the configured `specArtifacts` identifiers, ownership, carriers, evidence sections, and cardinality. Without a native profile, use the strict TC/§8 default when a canonical artifact exists. If none exists, use prompt/source intent, mark the missing owner/case mapping `UNVERIFIED`, and flag canonical-owner feedback; never invent a case ID.
5. **Write Given/When/Then intent** with the invariant, realistic actor pacing, the configured runner's bounded readiness/postcondition strategy, and an observable settle signal for every meaningful action where one exists.
6. **Check real-world fidelity** — BEFORE any test code is written, answer *"Can this flow, timing, and data actually occur in production?"* Any "no" → fix the SCENARIO, never the assertion. Full contract: `SYNC:real-world-fidelity-testing` below.
7. **Select or generate/update tests** following the configured project organization; spawn `e2e-runner` for generation/maintenance.
8. **Bring up and exercise** the configured whole system, authenticate/seed through supported project paths, use a visible web browser when applicable, capture/read evidence, and classify missing capability honestly.
9. **Run tests** using the project's configured commands and report exact counts/exit status and repeat proof.
10. **Update e2e-test-reference.md** with any evidence-backed learnings.

---

## Output

Report:

- Files created/modified
- Owner-qualified case/variant IDs and requirement/acceptance references covered; their configured evidence section and carrier, actual executor/assertion/result, and verdict (`UNVERIFIED` when unresolved; TC/§8 only under the strict default profile)
- Run command to execute tests (configured full command)
- E2E applicability and evidence (`APPLICABLE` or `N/A — <file:line evidence>`)
- Full and focused/partial commands, zero-match behavior, and simple/Windows entry point (or evidence-backed N/A)
- Run identity, reference/additive data mode, parallel-isolation strategy, and exact Passed/Failed/Skipped counts + exit status for each executed scope
- Repeat evidence: two consecutive no-reset full runs when persistent state is applicable
- Prompt/current-context scope, whole-project vs focused decision, and the Given/When/Then + protected invariant record
- Resolved `e2eTesting.execution` profile and linked `experienceVerification` surface, including startup/readiness/auth/seed/browser/evidence/convergence capability outcomes
- Browser visibility/pacing policy, viewport/device conditions, runtime/visual evidence references, redaction status, and any `ENVIRONMENT-BLOCKED` or `ACCEPTANCE-PENDING` decision
- Any preconditions or setup needed

---

## Sub-Agent Type Override

> **MANDATORY:** E2E test generation and accepted baseline updates spawn `e2e-runner` sub-agent (`subagent_type: "e2e-runner"`), NOT the main agent directly. Baseline updates remain forbidden until the experience-acceptance gate is satisfied.
> **Rationale:** `e2e-runner` auto-detects the project's E2E stack, maintains profile-resolved owner/case-to-test/assertion/result traceability, and handles visual baseline updates across Playwright, Selenium, Cypress, and other frameworks.

Spawn `e2e-runner` sub-agent for:

- Generating new E2E tests from recordings or owner-qualified scenario/case IDs from the configured canonical artifacts (TC codes only under the strict default profile)
- Updating visual screenshot baselines after UI changes, but only after an explicit accepted experience record
- Maintaining configured owner-qualified case-to-executor/assertion traceability (the strict default uses `TC-{MODULE}-E2E-{NNN}`)

---

## Workflow Recommendation

> When invoked standalone, auto-select the canonical route from the request and current context; do not ask the user to choose a workflow. Use `workflow-e2e` for every E2E source: it conditionally writes or updates the artifact, then delegates configured verification and bounded fix/retest convergence to `e2e-test-verify --fix-loop`. Honor an explicit workflow or source invocation. Ask the user only when the product intent or owner is genuinely ambiguous, not to choose between equivalent execution routes.

---

# Skill: e2e-test

**Category:** [Testing]
**Trigger:** e2e test, e2e from recording, generate e2e, playwright test, cypress test, selenium test, webdriver, puppeteer

Generate and maintain E2E tests using project's configured testing framework.

- The canonical business-artifact root — resolve `specRoots.business.path` from `docs/project-config.json` (default `docs/specs/` only when unset); read requirement/acceptance/scenario IDs, owner links, cardinality, carriers, and evidence-section roles from optional `specArtifacts`. Match each selected owner-qualified case/variant to its actual E2E executor(s), assertion(s), and result(s). The strict default profile uses TC cases and §8/Test Specifications.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

---

<!-- SYNC:sub-agent-selection -->

> **Sub-Agent Selection** — Full routing contract: `.claude/skills/shared/sub-agent-selection-guide.md`
> **Rule:** Route specialized domains (architecture, security, performance, DB, E2E, integration-test, git) to the matching specialist agent (see guide above) — NEVER use `code-reviewer` for these. — why: `code-reviewer` lacks each domain's checklist, so specialized issues slip through.

<!-- /SYNC:sub-agent-selection -->

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

<!-- SYNC:real-world-fidelity-testing -->

> **Real-World Fidelity Gate** — MANDATORY when authoring, reviewing, or repairing any integration / E2E / system test.
>
> A test earns trust by reproducing a situation the system can actually meet in production. A scenario that could never occur in real life proves nothing when it passes, and wastes hours when it fails.
>
> 1. **Ask the fidelity question BEFORE writing the setup:** *"Can this sequence, timing, and data actually occur in production?"* If no, the test is mis-specified — fix the SCENARIO, never the assertion.
> 2. **Model only real actor pacing.** Preserve delays present in the real journey; add presentation pacing only when the project contract configures it. Never add a fixed delay to make readiness or settling appear reliable.
> 2a. **Use the runner's synchronization idiom.** Before an action, use the browser/device runner's native wait or an evidenced project helper for applicable readiness and actionability. Bound custom waits and include useful diagnostics; do not require a helper API or object model the project does not use.
> 2b. **Observe → act → observe.** After an action, wait for the expected positive or negative postcondition before the next dependent action, using observable state and the configured runner. Keep the final business assertion in the test. A timeout is a test failure with diagnostics, not permission to weaken the assertion.
> 3. **Wait on a real signal, never a blind sleep.** Find an observable proving the prior step finished — a persisted state change, an audit/version stamp, a queue/worker idle marker, a completion event — and poll until it settles (unchanged across a short stability window). Use a fixed delay ONLY when no observable exists, and say so in a comment. A browser action delay MUST never replace a readiness/actionability wait.
> 4. **Barriers belong in ARRANGE, never in ASSERT.** Waiting for a precondition is fidelity. Widening an assertion's timeout, loosening a comparison, adding a retry around a failing assertion, or skipping the test is masking. NEVER do the latter to force green.
> 5. **Distinguish harness-amplified from real.** Test topologies (shared infra, fan-out consumers, parallel suites, cold starts) can make a rare production race routine locally. Before filing a product defect, state whether the trigger exists in production and at what likelihood.
> 6. **Keep the protected invariant intact.** Improving fidelity must NEVER reduce what the test protects. If a realistic scenario no longer exercises the rule, the rule needs a DIFFERENT realistic scenario — not a weaker assertion.
> 7. **Deliberate impossible-state tests are allowed, but MUST be labelled.** Corruption-repair, migration, and fail-safe tests intentionally construct states production should never reach; comment WHY the state is reachable (upstream bug, partial write, legacy data), so they are never confused with unrealistic setups.
> 8. **Visible browser evidence is part of fidelity.** When the project contract calls for human-QC on a web surface, use its configured visible browser runner or control path when supported; attach runtime/network listeners before interaction and capture/read the configured screenshots, traces, or video. Follow the runner's native waits or an evidenced bounded project helper, and redact sensitive evidence. An unread artifact is not an observation.

<!-- /SYNC:real-world-fidelity-testing -->

<!-- SYNC:test-failure-fault-adjudication -->

> **Test-Failure Fault Adjudication** — When a test fails (or you are debugging or fixing a failure), the job is to determine *who is at fault — the source code or the test code*. Getting that verdict right matters more than turning the suite green. Binds every debug / fix / test skill identically.
>
> 1. **Provisional verdict before touching either side.** Classify the observed evidence as SOURCE-WRONG, TEST-WRONG, TEST-NOT-OPTIMAL, ENVIRONMENT-BLOCKED, or AMBIGUOUS; then `/debug-investigate` and trace end-to-start before editing. A green-again suite is NOT the goal.
> 2. **Triangulate against the owner artifact AND the source.** Use the business root selected by `specRoots.business.path`, following the framework config loader's fallback only when the project leaves it unset. Resolve `specArtifacts`: when valid, read its configured `intent/contracts/evidence` sections and locate native cases through configured carriers; when absent, use the strict-default §3 AC / §4 BR / §5 invariant / §8 TC sections. A malformed or unsupported declaration blocks without fallback. Inspect the assertion tied to owner + case/scenario ID + optional variant. The canonical intent decides expected behavior — compare BOTH production source and failing test against it. With no spec, use documented intent / acceptance criteria / caller contract and name that limit. Decide from evidence whether SOURCE or TEST is wrong.
> 3. **Classify who is at fault, then fix the wrong side at its root:**
>     - **SOURCE-WRONG** — production code violates the spec's intended behavior or a clear invariant → fix the source at the owning layer; keep or strengthen the test that caught it.
>     - **TEST-WRONG** — the test encodes a stale or incorrect assertion, setup, or expectation that contradicts intended behavior → fix the test at its root. NEVER weaken an assertion, add a skip, or relax a timeout to force green.
>     - **TEST-NOT-OPTIMAL** — intended behavior is valid but the test seam, timing, or assertion signal is fragile → improve the test without weakening the invariant.
>     - **ENVIRONMENT-BLOCKED** — infrastructure, setup, or external state — including transient resource pressure (RAM/OOM, CPU saturation, disk or temp exhaustion, handle and connection-pool limits, network flakiness, a timeout that is really slowness) — prevents a source/test verdict → preserve diagnostics (exact command, exit code, full output, resource evidence), name the environment remedy, and STOP mutating source or tests until the environment is healthy. This verdict is a FIRST-CLASS candidate weighed in step 1 alongside SOURCE-WRONG and TEST-WRONG — never a fallback reached only after the code looks fine; run `SYNC:environment-fault-hypothesis` to rule it in or out with a stated discriminator. A failure that vanishes on retry stays UNEXPLAINED until its mechanism is named — "flaky" is a symptom, not a verdict.
>     - **AMBIGUOUS** — evidence or intended behavior does not safely select an owner → ask the user or canonical owner before editing.
>     - NEVER change a test to match broken source, and NEVER change source to satisfy a broken test. (Migration code excluded — schema/data migrations are one-time execution paths, not core application logic.)
> 4. **Ask the user when intended behavior is unclear.** If no owner artifact covers the behavior, the configured sections are silent, or the owner is ambiguous about which side is correct, STOP and ask the user or canonical spec owner before editing either side — never silently pick source or test just to make the suite pass.
>
> Reconcile to intended behavior, never to whichever side currently passes — green can encode the very bug.
>
> **Read-only/report-only role boundary:** when this block is carried by a report-only role (`code-reviewer`, `spec-compliance-reviewer`, `tester`, and any other agent whose definition declares it never edits source), "fix the wrong side" means RETURN the adjudicated verdict and the proposed repair to the parent — do not modify source, tests, generated carriers, or user data. The adjudication is the deliverable; the edit is the caller's. Without this sentence the block's step-3 imperatives read as write authority and directly contradict those agents' own declarations (e.g. `tester.md` "NEVER implement fixes"), which is the sibling `SYNC:double-round-trip-review` boundary applied to the same class of carrier.

<!-- /SYNC:test-failure-fault-adjudication -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Project applicability gate.** Before applying a stack, layer, style, tool, or architecture rule, read the project's config and relevant references, then check local implementations. Treat framework examples as examples; honor explicit N/A and do not require a technology or convention the project does not use.
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
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Judge the environment before judging the code.** A bug report, failed test, error, or unexpected output is not proof of a code defect. Before and during adjudication, weigh environment causes as a competing hypothesis — setup, config, version and dependency state, service dependencies, stale artifacts or leftover state, and transient resource pressure (RAM, CPU, disk, handles, network). State the discriminator you ran; fix an environment cause in the environment, never by editing product code or weakening a test to absorb it.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:test-architecture-execution-contract -->

> **Test Architecture & Execution Contract** — Treat testability as a setup/architecture acceptance condition. Identify the test types and execution modes required by the project contract and task risk; examples include unit, integration/system, E2E, and performance/scale. Record `APPLICABLE` only with evidence of a relevant runner/framework/configuration; otherwise record `N/A — <evidence>` and never fabricate coverage or impose a universal tier threshold.
>
> 0. **Make the protected intent explicit in the project's test format.** Every assertion-bearing test states the behavior or technical invariant it protects and makes its relevant inputs, trigger, and owned outcome understandable. Use `Given / When / Then` when the project's spec/config selects it or when it fits the test; otherwise preserve the project's native organization. Property/fuzz tests may describe an input space or generator and the property checked; harness and mutation tests may use their native contract. Do not rewrite a test solely to adopt a framework-wide syntax.
>    Link the case to the configured owner/case/scenario identity and its `intent` or `contracts` role when `specArtifacts` is valid; when absent, record `Business Intent / Invariant Guarded` (or the technical contract). A malformed declared profile blocks without fallback. Keep one behavior per case and split unrelated outcomes. The final assertion must prove the outcome the test owns, not only an internal call, delivery bookkeeping, or setup side effect. Fixture/runner glue is exempt only when it contains no test assertion; every assertion-bearing test entry point is in scope. Convert legacy brownfield cases when touched; a broader migration is a named owned opportunity, while a safety-critical case without clear phases is `BLOCKED`.
>
> 1. **Matrix before implementation:** For each required test type, record applicability, owner, runner/framework, test root, fixture/data strategy, full command, focused/partial command, zero-match behavior, CI gate, a simple/platform-appropriate entry point when useful, each supported execution mode, and the environments the project promises to support.
> 1a. **E2E profile handoff:** For E2E, also record the selected `surfaceIds[]`, the linked `localRun` owner, auth mode/reference, seed/data mode, browser runner/engine/headed setting, action-delay policy, evidence root/capture/redaction policy, and convergence cap. Missing fields remain explicit blockers or N/A; they are never filled from generic browser defaults.
> 2. **Runnable scopes:** Full and focused commands must be copy-ready, fail on invalid or zero-match selections, report exact counts and exit status, and be safe to repeat. E2E uses configured browser/service commands and the project's documented synchronization strategy. Browser UI actions should wait for bounded, observable readiness and outcome conditions using runner-native waits or a configured helper; apply action delays only when the project contract specifies them.
> 2a. **E2E organization gate (when E2E is applicable):** Inspect the configured/discovered local test organization and reuse it — fixtures, shared helpers, scoped locator handles, page objects, or another evidenced structure. Record actual owners and boundaries; describe tiers or base abstractions only when the project uses them. A Page Object Model is one valid pattern, never a universal requirement.
> 2b. **E2E reuse and DRY gate:** Keep shared lifecycle, locator, readiness, auth, data, and evidence behavior at the project's existing reusable owner; keep final outcome assertions in the test. Reuse or compose existing helpers/objects before creating new ones, preserve one canonical owner for each selector/action/wait, and treat duplicated wrappers or setup as a review signal; use occurrence counts only as evidence, and extract when a shared owner reduces change cost without crossing project boundaries.
> 2c. **E2E test layering:** Test reusable shared behavior at its actual owner where the harness supports it; feature tests cover user outcomes and local composition. Do not invent component tiers or require lower-tier contract tests when the project has no such model.
> 2d. **E2E synchronization:** Use bounded runner-native waits or the configured project helper for observable preconditions and postconditions where the runner supports them. Include useful timeout diagnostics; keep the final business assertion in the test and avoid fixed sleeps as readiness evidence.
> 3. **Fresh valid state (when mutable or shared state applies):** Isolate each test/run using the project's supported setup and public paths where applicable. Use unique identities for shared mutable data, realistic valid data for behavior under test, and idempotent/restart-safe setup when fixtures or seeders can persist. Intentional accumulation is additive and integrity-checked; never hide contamination with destructive reset.
>    Run-scoped cleanup, when supported, is opt-in and idempotent: after evidence capture it may remove only ephemeral resources owned by the current run; it must never delete persistent/additive data or another run's data, reset shared state, or replace no-reset proof.
> 4. **Isolation and fidelity:** When tests touch mutable/shared state, isolate their data and parallel workers; share only immutable/reference data. Use realistic input and observable arrange barriers where the behavior depends on them. Do not widen retries or weaken assertions to make a scenario pass.
> 5. **Evidence gate:** Report command, scope, relevant identity/data mode, exact result, and repeat proof. For persistent-state suites, verify repeatability without destructive reset at the level required by the project gate. Treat line coverage as diagnostic only; use meaningful property/invariant, mutation, change, or behavior signals when supported by the project's tooling.
> 6. **Execution modes and environment reach:** Exercise each mode and environment the project declares it supports (for example host/container or local/CI); parameterize supported targets when that fits the existing test architecture instead of maintaining needless forks. Record unexercised declared capabilities as a gap. A production-shaped target is applicable only when the project requires it; tests that can reach production need an enforced safe scope, and must report `ENVIRONMENT-BLOCKED` when it is missing. Pin dependencies and declare external prerequisites where the project's reproducibility contract requires them. Depth → `SYNC:engineering-foundation-gate` **F1/F2/F3**.
>
> **Ownership:** Architecture/harness defines the matrix; scaffold/workflow makes it runnable; test writers implement tier-specific cases; reviewers verify the contract; the runner reports; seed-data owners preserve uniqueness, idempotency, realism, and accumulation integrity. Missing required evidence blocks setup completion.

<!-- /SYNC:test-architecture-execution-contract -->

<!-- SYNC:e2e-visual-design-contract -->

> **E2E Visual Design Contract** — Binds when this skill or agent handles visual-review evidence, human-QC of a user-facing visual surface, or visual expectation/baseline updates; for non-visual E2E/API/CLI work state `N/A — no user-facing visual surface` and do not invent a design review.
>
> 1. **Resolve authority first.** Read `docs/project-config.json`, its docs index, and the applicable project references for design, accessibility, platform, styling, and components; consult `.claude/docs/design-knowledge.md` and `.claude/docs/design-review-checklist.md` when they apply. Record `N/A` only for a proven absent surface or `ENVIRONMENT-BLOCKED` for an applicable missing configured capability — never invent tokens, components, breakpoints, type, styling conventions, or runner defaults.
> 2. **Use project decisions.** Apply precedence: brief/accepted design contract → adopter project design-system/SCSS/frontend docs and ADRs → shared `UI-1.1`–`UI-9.4`, `DD-1`–`DD-8`, and `CL-1`–`CL-6`; surface a genuine conflict with both sides, never silently choose. Read and apply the full shared `SYNC:design-system-check`, `SYNC:ui-ux-design-principles`, `SYNC:design-distinctiveness-gate`, and `SYNC:design-review-checklist` bodies for their applicable roles. When UI generation or repair is in scope, consume the accepted `/design` decisions (or the adopter's equivalent professional design/component system); review-only E2E evidence must not invent a new visual language.
> 3. **Map UI ownership when generation or UI fixes are in scope.** Inventory related screens, flows, and components. Use the adopter's documented component/module taxonomy when one exists; otherwise record actual component owners and boundaries from the code. Reuse or compose abstractions that fit, and record why they do not fit when creating new ones. Preserve ownership of markup, selectors, styling, lifecycle, and tests according to the project's architecture.
> 4. **Separate review owners.** Use `/experience-review` for the running surface and opened/read screenshot evidence; route source-only styling, tokens, accessibility, z-index, component ownership, reuse, and static design findings to `/ui-review`. Apply BEM/SCSS checks only when selected by the project. Never infer source architecture or design tokens from an image, and never treat a passing E2E command as visual/design approval.
> 5. **Capture relevant UI states under the project's evidence contract.** Apply `.claude/skills/shared/ui-state-capture-protocol.md` with the configured `uiStateCapture.mode` and runner capabilities. Capture states and transitions required by the project contract, and report coverage gaps. Use a shared action-level capture helper or evidence manifest when the project selects or already provides that mechanism; otherwise follow its established test/evidence pattern. Mask sensitive or volatile data as required by the evidence policy.
> 6. **Gate every visual round case by case, then synthesize.** Reload the design/UI convention authority BEFORE judging the first image. Open/read ONE capture at a time and append its record — image path, expected delta, observed facts with locations, attributed console output, taxonomy findings or an explicit `none`, verdict — before opening the next. Then reconcile records against the configured evidence index, cluster repeated defects under the actual owner established by the project architecture, report sequence-level findings only visible across captures, and list uncaptured transitions as coverage gaps where the contract requires them. `UIX-BROKEN`/`UNSTYLED`/`OVERFLOW`/`OVERLAP`/`STATE`, `UI-*`/accessibility/layout-floor, and `P0`–`P2` `CL-*` findings are `BLOCKING`; `UIX-POLISH`/`DD-*` identity is `ADVISORY` unless the governing brief/project contract makes it objectively required. A `UIX-CONVENTION` finding cites the authority clause it breaks. Unmeasurable values are `NOT VERIFIABLE`; a missing record is incomplete review, never a clean result; never promote a baseline/expectation automatically.
> 7. **Report the contract.** Persist authority paths and resolution status, component ownership/reuse decisions, required state/transition coverage and gaps, `UI`/`DD`/`CL`/`UIX` coverage or skips, evidence-index path when configured, evidence/read status, and remaining human acceptance; preserve the protected business invariant and exact E2E scope.

<!-- /SYNC:e2e-visual-design-contract -->




<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `Agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `tmp/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

<!-- /SYNC:parallel-subagent-dispatch -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.
<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

<!-- SYNC:e2e-visual-design-contract:reminder -->

**MUST ATTENTION** visual E2E/QC resolves the project design authority first, applies project design-system and frontend decisions plus applicable `UI-*`/`DD-*`/`CL-*` roles, records component ownership using the project's taxonomy or observed boundaries, sends static source findings to `/ui-review` and runtime image evidence to `/experience-review`, captures states and transitions required by the configured evidence contract, reloads the convention docs then reads and records each required capture before synthesizing findings with coverage gaps, treats `UIX`/UI/accessibility-floor findings as blocking and `UIX-POLISH`/DD identity as advisory, never invents measurements, and never auto-promotes baselines; non-visual runs state `N/A`.

<!-- /SYNC:e2e-visual-design-contract:reminder -->


## Closing Reminders

**IMPORTANT MUST ATTENTION** Testability contract: resolve evidence-backed Unit/Integration/System/E2E rows, copy-ready full/focused commands, zero-match failures, owner/root/data, CI/simple-Windows entry, unique run identity, and repeat proof before claiming setup, review, or test completion.
**IMPORTANT MUST ATTENTION Goal:** Produce or select maintainable, spec-traceable E2E tests from the user prompt/current context, recordings, canonical artifacts, or code changes with the project's configured framework (Playwright, Selenium, Cypress, or another). Resolve owner-qualified case identity from the configured profile, map it to the real test assertion and result, and use TC/§8 only when no native `specArtifacts` profile is declared. Then exercise the declared scope like a human QC tester and protect business behavior so cosmetic UI changes do not break tests and intended behavior breaks do.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Sub-Agent Selection:** Route specialized domains to the matching specialist agent, NEVER `code-reviewer`.
- **Source/Test Drift Check:** On source change, decide from evidence whether tests or source is wrong.
- **Real-World Fidelity Gate:** only test flows, pacing, and data production can actually reach; use the configured runner's native waits or project helper for control readiness and postconditions; action delays apply only when configured; wait on a real settle signal in ARRANGE — never a widened assertion.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** Traced `file:line` proof per claim, confidence >80% to act, NEVER guess as fact.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION — Main steps (execute in order, track each):** (1) detect E2E framework from project files; (2) read `e2e-test-reference.md` and project config FIRST; (3) resolve `specRoots.business.path` and optional `specArtifacts`, then load owner-qualified case IDs, evidence sections, and carriers from that root; use TC/§8/Test Specifications only when no native profile is declared; (4) pass the Real-World Fidelity Gate BEFORE writing test code; (5) generate/update tests using the configured project organization through the `e2e-runner` sub-agent; (6) run tests with the configured command; (7) update `e2e-test-reference.md` with learnings — why: AI keeps dropping the skill's own step sequence under long context.
**IMPORTANT MUST ATTENTION** apply `.claude/skills/shared/e2e-quality-protocol.md` before authoring; record its GWT + invariant, gate-row verdicts, exact evidence, cleanup, and test-to-spec traceability without duplicating the detailed checklist.
**IMPORTANT MUST ATTENTION** read `docs/project-reference/e2e-test-reference.md` + `docs/project-config.json` FIRST, then detect the framework and resolve `specRoots.business.path` plus optional `specArtifacts` — NEVER assume a stack, case ID, root, carrier, or evidence section — why: the configured framework, paths, identifiers, owner model, and evidence headings are project-specific.
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act, <60% DO NOT recommend) — NEVER speculate without proof.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; mark one `in_progress`, set `completed` immediately after each finishes; add a final review todo.
**MANDATORY IMPORTANT MUST ATTENTION** inspect 3+ comparable E2E tests and helpers, plus page/component objects when present, before creating new code; follow the configured local pattern over generic framework defaults — why: projects carry local locator, fixture, and organization conventions.
**IMPORTANT MUST ATTENTION** evaluate fit before copying a nearby test — verify the new scenario shares the relevant organization, fixtures, and preconditions — why: closest example ≠ matching preconditions.
**MANDATORY IMPORTANT MUST ATTENTION** every E2E case resolves its owner-qualified identity and configured requirement/acceptance refs, evidence section, actual executor(s), assertion(s), and run result(s), preserving profile cardinality — missing/unknown owner or ID remains unresolved and never PASS; only when no native profile is declared use TC IDs traced to §8/Test Specifications — so it fails on intended-behavior breaks, not cosmetic UI churn.
**MANDATORY IMPORTANT MUST ATTENTION** every interactive browser/UI step follows the configured runner's readiness and postcondition strategy; use bounded project helpers where they exist, and apply action delays only when configured — why: human-like observe → act → observe sequencing exposes loading, validation, and runtime-error failures without imposing a runner-specific API.
**MANDATORY IMPORTANT MUST ATTENTION** apply the Real-World Fidelity Gate BEFORE writing setup — ask "can this flow, timing, and data actually occur in production?", model real pacing between distinct user actions instead of firing them in the same millisecond, and wait on an observable settle signal in ARRANGE; NEVER widen an assertion timeout, loosen a comparison, or retry around a failing assertion to compensate — why: a scenario production can never reach proves nothing when it passes and manufactures phantom "product defects" when it fails.
**IMPORTANT MUST ATTENTION** use the repository's configured test-case annotation mechanism — NEVER invent a framework-specific marker.
**MANDATORY IMPORTANT MUST ATTENTION** for browser E2E, prefer accessible role/name, label, or native accessibility identifiers, then explicit stable test hooks, then project-configured stable locators or meaningful text as needed; NEVER treat BEM, utility, or other styling classes as semantic locators, or use generated/positional selectors or XPath without a project-documented exception — why: locators should describe the user-facing control and survive unrelated styling and markup changes.
**MANDATORY IMPORTANT MUST ATTENTION** keep locators/actions in the project-configured owner; use a page object only where that organization is configured or its reuse is established, and keep final behavior assertions in the test — why: coherent ownership simplifies change without imposing unused wrappers.
**MANDATORY IMPORTANT MUST ATTENTION** generate unique self-sufficient data (GUID/timestamp); NEVER delete or reset persistent, reference, seeded, additive, or shared data. If configured, opt-in cleanup may remove only current-run ephemeral resources after evidence capture — never another run's data and never as repeat-proof — why: shared teardown/reset creates side effects.
**IMPORTANT MUST ATTENTION** spawn the `e2e-runner` sub-agent (`subagent_type: "e2e-runner"`) for E2E generation and accepted visual baseline updates — NEVER drive them from the main agent — why: `e2e-runner` carries the stack auto-detection and profile-resolved case-traceability knowledge; `experience-review` must inspect and obtain explicit acceptance before the update.
**IMPORTANT MUST ATTENTION** any uncovered configured owner/case or scenario with no accepted intent feeds BOTH the canonical owner and tests — NEVER a test-only fix or duplicate registry; only the strict default profile uses §8 behavior/TC cases. Property/metamorphic generation and MUTATION-SCORE gates are scoped to unit/integration, N/A at the E2E tier.
**IMPORTANT MUST ATTENTION** update `e2e-test-reference.md` in the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) with learnings when investigating/fixing E2E failures.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.

**Anti-Rationalization:**

| Evasion                                       | Rebuttal                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| "I know the framework, skip the reference"    | Read `e2eTesting` config + reference FIRST — stack, paths, and case profile are project-specific. |
| "data-testid is everywhere, just use it"      | Prefer accessible role/name or label, then an explicit test hook; explain any project-specific fallback. |
| "This selector is faster via `:nth-child`"    | Positional/generated selectors break on unrelated churn. Use a semantic/data anchor.               |
| "I'll clean up the data after the run"        | Never delete/reset persistent, seeded, additive, or shared data. Only configured current-run ephemeral cleanup after evidence capture is allowed. |
| "Test passes, traceability is bookkeeping"    | No configured owner-qualified case mapped to the real assertion/result = unresolved, not PASS. TC→§8 is the strict-default example. |
| "Just generate the test inline, it's quick"   | Spawn `e2e-runner` — it owns stack detection, profile-resolved case traceability, and baseline updates. |

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.

---

**IMPORTANT MUST ATTENTION** read `e2eTesting` config + `e2e-test-reference.md` FIRST, resolve the configured owner root and optional case profile, and detect the framework — NEVER assume a stack or ID.
**IMPORTANT MUST ATTENTION** every configured requirement/acceptance and owner-qualified case/variant maps, under profile cardinality, to its actual assertion(s) and run result(s); when no native profile exists, use TC→§8; for browser E2E prefer accessible semantics, then explicit stable test hooks, then documented stable fallbacks — NEVER use styling classes as semantic locators or generated/positional selectors without a documented exception.
**IMPORTANT MUST ATTENTION** use the project's fixture/data strategy and isolate mutable state; never delete/reset persistent, seeded, additive, or shared data; use only configured current-run ephemeral cleanup after evidence capture; spawn `e2e-runner` for generation and only explicitly accepted baseline updates.
**IMPORTANT MUST ATTENTION** when the task requests or project contract requires visual review, follow the configured `uiStateCapture.mode` and runner: capture the project-declared state × viewport matrix, and capture transitions only under explicit `every-action` mode with a verified boundary. Use the configured evidence index, preserve candidate screenshots, let `/experience-review` read and adjudicate each required image before synthesis, and never promote a baseline automatically. A false value cannot waive a project-required gate; validated blocking UI findings require an owner-layer fix and a same-scope E2E rerun.
