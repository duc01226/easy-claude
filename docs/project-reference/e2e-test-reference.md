# E2E Test Reference

<!-- Source joined: 2026-10-06; runtime evidence remains pending. -->

## Quick Summary

This guide applies only to the optional task-track local workspace. It introduces no application framework, hosted account system, database or whole-repository browser standard. `docs/project-config.json` selects the surface `task-track-workspace`, a custom Node launcher using skill-local Playwright 1.63.0 and Chromium, and an isolated public-core fixture.

**Source is authored; runtime evidence is pending.** The launcher, shared support, portable fixture and pinned package/lock are inspected against this profile. Source readback confirms declared commands and ownership; parent all-return review and actual execution remain required. Schema validity does not prove commands run, actor journeys work, screenshots were inspected, or any operating system/CI/browser mode passed. Resolve the current setup report at `tmp/reports/task-pbi-tracking/implementation-run/browser-config-source-join.md` and the launcher's actual source before verification.

Adopter projects keep their own configuration and selected runner; this repository profile does not supply adopter accounts, data or native capability proof.

## Architecture Overview

The actual actor-facing surface is `.claude/skills/task-track/assets/{index.html,app.js,style.css}` plus its generated offline report through the common report owner. `.claude/skills/task-track/lib/workspace-server.cjs:53–62` requires Node 20, resolves the project context and creates ephemeral session authority; `:141–162` listens on `127.0.0.1` port 0 and returns a session URL plus owned `close()`. The app uses the same public operation and progress owners as CLI/agents, so browser assertions must prove resulting canonical records and receipts where required, alongside the visible state.

The declared launcher is `.claude/skills/task-track/tests/workspace-browser.test.cjs`. Root owns its test cases and `.claude/skills/task-track/tests/browser-support.cjs` shared browser support; `.claude/hooks/tests/lib/task-tracking-fixture.cjs#withFixture` owns portable temporary repository/home/environment isolation. The integrated launcher creates valid work through the public core, starts the real workspace, exercises the browser and owned generated offline report, captures evidence, then closes/removes only current-run ephemeral resources in `finally`. Browser routing allows only the selected workspace origin and actual file URLs lexically beneath the owned fixture; other requests are denied. File/report execution remains unverified until browser runs. The profile's `seedCommand` and `localRun.startCommand` describe this one lifecycle; do not seed and launch twice or treat it as a permanent service.

Core runtime dependencies remain separate from optional browser dev tooling. Node 20+ is required for the workspace/test surface; the optional Playwright pin is 1.63.0. Backend/frontend framework references stay N/A. No BDD, page-object hierarchy, root Playwright configuration, application database, team accounts or CI browser job is declared.

## Base Classes

No base class is required. Reuse the existing `withFixture` lifetime and the parent-owned shared browser lifecycle/evidence support at its actual browser-support.cjs owner. Browser startup must capture the explicit installed Chromium executable before fixture environment scrubbing so personal HOME or browser-cache settings cannot change fixture selection. Keep all environment mutations/restoration at the evidenced portable fixture owner.

## Page Object Pattern

No page-object hierarchy is selected. Use source-backed accessible locators and existing shared browser support, with one owner for reused selection/action/readiness/capture behavior. Final actor outcomes belong to test cases; helper execution alone is not proof. Do not create a POM, wrapper or selector registry solely to satisfy generic methodology.

## Wait & Assertion Patterns

Use Playwright native actionability and observable postcondition waits. Loading/Saving tests hold an actual fetched response behind an acknowledged barrier and release it in finally; they do not fabricate a server result or use a blind sleep. Readiness requires the real server listener plus loaded session/snapshot and the expected visible fixture state. Before a dependent action, observe the preceding saved/refused/conflict/replayed outcome and assert the business result this case owns. Session requests, snapshot changes, revisions and canonical receipts are suitable actual signals; fixed sleeps or action delays cannot prove settling. Configured actionDelayMs is 0 and settle budget 20s; failure is diagnostic evidence, not permission to widen retries, weaken expected values or skip cases.

Strict default `TC-TPT-NNN` applies because `specArtifacts` is absent; read complete case bodies under `WorkTracking/README.TaskTracking*.md` in the business spec root (default `docs/specs`; `specRoots.business.path` in `docs/project-config.json` overrides it). Each join must name its actual case, executor, observable assertion and run result. Names alone, aggregate success or screenshot existence cannot prove a case. Technical harness contracts may use a descriptive technical name instead of inventing a business case ID.

## Configuration

`e2eTesting.execution.surfaceIds` links to `experienceVerification.surfaces[].id=task-track-workspace`. Its localRun describes the combined fixture runner, not a second local service. `auth.mode=fixture` references only the in-memory `startWorkspace.url` session fragment. Never persist session fragments, headers, cookies, tokens or storage state. There are no shared credentials/accounts.

`data.mode=additive` means each invocation creates fresh owned disposable work through public operations in its isolated repository. Cleanup follows evidence capture and removes only that run's fixture; never delete/reset adopter/user/shared data. Reference-only auth metadata, public-core seeding and explicit stable fixture actor must match actual runner source before a run is applicable.

| Required test lane | Owner / runner | Data and boundary | Commands / empty selection | Execution reach |
|---|---|---|---|---|
| Tracker core/integration | Existing custom CJS harness under `.claude/hooks/tests` | Isolated portable fixtures; public core/CLI/HTTP contracts | Existing configured all-suite command; unchanged here | Existing project contract; no browser claim |
| Optional workspace browser E2E | task-track launcher, Node 20+/Playwright 1.63.0/Chromium | Public-core fresh fixture; actual local server; browser outcomes plus canonical conservation | Full/focused/headed commands below; zero-match must exit 1 before launch | macOS/Linux/Windows argv-compatible source design; actual hosts/headed/headless results pending |
| Visual journey evidence | Same launcher and experience review owner | Desktop 1280×800 and mobile 390×844, locale en-US; declared state inventory | Full headed command; capture manifest reconciliation | Visible QC required; screenshots must be individually read |
| CI browser job | N/A — no verified job | No invented container/service/CI target | None | No CI promise |

### Evidence and visible review

The portable launcher defaults to disposable `tmp/task-track-browser`; this repository selects its run-specific evidence root through `--evidence-root`, preserving portable payload independence. Evidence lives under `tmp/reports/task-pbi-tracking/implementation-run/browser-evidence/{runId}/`. The `capture-manifest.json` owns the ordered case/state/viewport/artifact inventory. Source-selected required states, including any failure captures, are declared by the launcher and reconciled against its manifest; the config's state description is not an invented exhaustive state list.

Capture mode is `declared-only`. Normal emitted screenshots are bounded at 20 captures per test/viewport invocation and 296/run. The full source matrix has 74 normal states per viewport: 148 viewport images across desktop/mobile, at most 296 when every state needs a full-page companion. The largest invocation has five states, at most ten images, so the per-test cap remains 20. These are finite source bounds, not observed image counts or measured runtime capacity; reconcile the bounds when the declared states or viewports change. UI State Capture Protocol §1.3 requires unconditional failure captures exempt from these caps; capped-out declarations remain manifest rows and throw rather than producing a clean run. The implementation conservatively counts all prior manifest rows toward the normal run budget, so failures/declarations may reduce later normal capture capacity. Capped-out rows carry their actual owner/test/state/viewport/sequence and expected-state metadata for reconciliation, with no screenshot path claimed when no image was taken. Manifest row count is not an emitted-normal-image count. Use full-page capture when scrollable. Desktop/mobile screenshots, redacted console/page errors, and redacted request metadata must be attached before interaction. Persist no request/response bodies, session URLs/fragments, auth headers, cookies, tokens or personal data. Synthetic owned fixture content may be visible. Do not enable trace/video or automatic every-action capture unless the profile and supported owner explicitly change. Mask `#root-context` and `.source dt:has-text("Checkout") + dd` in every screenshot, including full-page and failure captures, to hide the host account/temp prefix. Retain exact checkout assertions against the actual DOM before capture; masking does not replace scope verification. The profile and capture manifest record both selectors.

Read `.claude/skills/shared/ui-state-capture-protocol.md` before evidence handling. Inspect exactly one visual artifact, persist its observations/gaps, then move to the next; reconcile ordered inventory/totals before concluding. An unread capture is unverified. Accepted baselines remain at the preserved `tests/experience-baselines` declaration with manual acceptance required; no baseline directory/assets or acceptance is created by this setup. Passing runs never automatically promote screenshots.

### Source-authored journey matrix

The launcher contains forty-three explicit partial-case/technical variants, each selected for desktop and mobile; this is source inventory, not eighty-six executed results. Captures cover real pending Loading, complete Empty, Invalid input, unavailable native capability, Partial imported coverage, opening/deep links, unavailable/unsupported initial-session recovery, complete read-only inspection, duplicate-ID and owner-qualified link refusal with explicit owner inspection/Overview recovery, capture/refinement, People/assignment/Start, accepted-work reopen, exact link owners, draft/conflict recovery, actual held save response and lost-save receipt replay, progress/filter/print conservation, read-only board grouping by recorded state, generated offline report detail/return/filter/print, complete-empty versus limited inspection, long People labels and native checkbox reflow, shared/current owner and proof comparisons with explicit missing-ref recovery, scripts-disabled native report content, safe draft deletion, canceled work returned to draft by an explicit state change, and the status report read inside the workspace for the selected scope with a refused refresh keeping the last report. The seventy-four declared normal state labels are mirrored into the linked surface's states array; actual emitted viewport/full-page/failure captures are reconciled through the run manifest. Technical link-owner uses its actual source contract identity; business variants retain TC-TPT owner joins without claiming every step of the full canonical case.

The sixteen appended variants preserve the original twenty-four and add selected-scope filter/draft recovery, actual pending-save and saved-receipt context, generic/Feature coexistence, purpose set/change/clear with omitted-fact conservation and stale-preview refusal, invalid purpose/configuration and inert labels, exact eligible/excluded/supporting scope and intent/proof owners, chosen shared paths and removed-edge recovery, generic/ungrouped choices, attached-page draft loss on reload, exact concerns with an outside draft retained, and pinned-source/forged-path recovery. Four independently isolated TC-TPT-241 variants cover workspace keyboard return and retained draft, enhanced fixed-scope report keyboard/print, scripts-disabled native direct-edge/print, and actual report-generation refusal followed by explicit refresh. Each added variant declares one normal capture state. The `TC-TPT-007` variant `live-report-in-app` declares two: the report shown in the workspace, and a refused refresh with the last report kept. The complete source has 72 capture call sites; two of them sit in fixed two-iteration loops, so 74 normal states are executed per viewport when the journeys succeed. Intermediate actions still appear as uncaptured transitions when `uiStateCapture.mode` is `declared-only`; one final capture does not prove every intervening UI state.

`TC-TPT-092` variants `readonly-session` and `duplicate-identity` protect the opening subset of the Part2 canonical case. The first launches the real server with `writable:false` against a complete accepted fixture: actor/scope remain read-only, capture is disabled, selected mutation controls are absent, and inspection/navigation/reread retain exact canonical bytes including history and receipts. The second arranges a valid copied record as a legacy-import/teammate-merge duplicate: ID-only and owner-qualified deep links select nothing, explicit owner-labelled rows remain inspectable without mutation controls, and Overview recovery reports partial coverage while conserving both owner files. This also protects main-owner `INV-TPT-01`; neither variant certifies the case's pending-close/retry contract. Both remain runtime-unverified until the final parent gate.

`TC-TPT-092` variant `session-reattach` protects the reattachment subset of the same case. A reload of the attached page stays attached and leaves no credential in the address. The address opened where no session is kept shows no work, checkout or actor, and offers only to have this workspace opened again; that request reaches the launch-side hook with a single-use link, returns only the launch outcome and leaves the asking page unattached. The link attaches one page once, and a second use is refused. Canonical bytes are unchanged throughout. The harness supplies the launch-side hook for a case that declares `reopenable` and records the links instead of starting a browser; it does not certify a real browser start.

One further variant beyond those listed below, `TC-TPT-095` `ended-work-delete`, protects entire deletion of ended work and declares three capture states. Open work is not offered the action. A retired record's preview names it, states the history, proof and acceptance decisions that leave with it, and waits for an explicit confirmation before the record file is removed; the other records keep their exact bytes. A canceled record another record depends on is refused at preview with the referencing record named, and both stay unchanged. The draft-only variant `safe-draft-delete` keeps its own wording and guards.

`TC-TPT-079` variant `board-grouping` protects the layout-switch subset of the Part2 canonical case: regrouping the same filtered records by recorded state, opening a record from a group and filtering all leave canonical bytes and the delivery denominator unchanged, with blocked work kept beside In progress and canceled work off the lifecycle. It does not certify the case's sort, reload or export inputs.

## Running Tests

Run from the project root, on macOS, Linux or Windows, using Node 20+. The source-selected optional dev setup is:

```text
npm ci --prefix .claude/skills/task-track --include=dev
```

Package/lock and installed Playwright 1.63.0 are source-joined; installed Chromium availability must be verified before running. `browserRuntime()` resolves the local pinned package and checks its explicit Chromium executable before fixture isolation. Installation/cache remedy belongs to local dev setup; missing prerequisites are `ENVIRONMENT-BLOCKED`, not reasons to change actor assertions. The runner's explicit executable resolution must be read before assuming a browser cache path. Do not fetch packages through an unpinned transient launcher.

```text
node .claude/skills/task-track/tests/workspace-browser.test.cjs --evidence-root=tmp/reports/task-pbi-tracking/implementation-run/browser-evidence
node .claude/skills/task-track/tests/workspace-browser.test.cjs --evidence-root=tmp/reports/task-pbi-tracking/implementation-run/browser-evidence --filter=<case-substring>
node .claude/skills/task-track/tests/workspace-browser.test.cjs --evidence-root=tmp/reports/task-pbi-tracking/implementation-run/browser-evidence --headed
node .claude/skills/task-track/tests/workspace-browser.test.cjs --evidence-root=tmp/reports/task-pbi-tracking/implementation-run/browser-evidence --headed --filter=<case-substring>
```

Replace the filter placeholder with an actual source-selected case substring. Full mode selects the complete declared journey scope; filter mode is diagnostic unless that specific scope was requested. Invalid/zero-match selections must exit nonzero (zero-match exit 1) with counts and must not manufacture coverage. Headed mode supplies visible QC; headless is the ordinary launcher mode. The experience surface's full/focused commands explicitly add `--headed`.

Runtime is deferred until parent17 whole-change static review is complete and parent18 invokes final verification. Parent verification convergence allows at most 3 attempts with 2 consecutive fresh green runs; the launcher executes one fresh run and does not internally retry assertions; classify failures and fix the owning source/test/environment rather than retry-until-green. Record exact command, exit/counts, run identity, selected cases, real artifact observations, canonical outcome and cleanup. Supported-source portability is not executed OS proof; unrun platforms/modes and native adapters remain explicit gaps.

## Best Practices

- Read the actual runner/profile and complete canonical owner cases before authoring or invoking tests. Keep source-authored and runtime-unverified states distinct until evidence lands.
- Exercise the real browser/server/core path with valid isolated owned data and native waits. Preserve raw canonical content, history, revisions, acceptance/current-confidence distinctions and retry identity where the case requires them.
- Use shared portable fixture/lifecycle/evidence owners; retain intent assertions in each case. Do not fabricate internal callbacks or unreachable actor pacing.
- Keep browser tooling optional and pinned locally; no root application/install/database or unrelated scan is implied.
- Record missing browser/source/host/CI/evidence capabilities at their actual owners. Schema validity and an ID match never replace runnable source, observable outcomes or reviewed captures.
- Resolve design authority from actual project config and accepted task-track design. Never invent a component taxonomy, tokens, breakpoints or baselines to fill a guide.

## Closing Reminders

The scope is one optional local task-track surface. Source setup, browser execution, visual inspection, operating-system reach and semantic correctness are separate evidence states. Preserve unrelated reference/config policy and explicit user approval boundaries; no Git operation, hosted service or native write capability is granted by this profile.
