# UI State Capture Protocol

Portable shared contract for turning an E2E/browser run into **AI-reviewable visual evidence of every UI state the journey passes through**, then reviewing that evidence case by case and synthesizing it into defect findings.

This protocol supplements `e2e-quality-protocol.md` (which owns E2E correctness) and `SYNC:e2e-visual-design-contract` (which owns design authority and review ownership). It owns one thing those do not: **what gets captured, when, under what name, and how each capture is adjudicated and rolled up.**

## Quick Summary

**Goal:** Make an E2E run prove the UI is *correct to look at*, not only that the happy path passed — by capturing every UI-state-changing transition automatically (the default `uiStateCapture.mode: every-action`; see Configuration), indexing the captures in a machine-readable manifest, judging each capture individually against the project's own design authority, and synthesizing the per-case records into owner-routed defect findings.

**Workflow:** resolve capture capability and authority → instrument capture in the action layer (never the test body) → run the journey and emit captures + manifest → reload the design/UI convention docs → review ONE capture at a time and append its record → reconcile the manifest against the records → synthesize clusters, journey-level findings, and coverage gaps → route findings to their owning layer.

**Key Rules:**

- Capture is **instrumented at the shared action layer**, so a new test inherits it. A test that has to remember to screenshot will forget.
- A capture fires **after** the bounded `waitUntil` postcondition and the 500ms presentation pacing — never mid-transition. A half-rendered frame produces phantom defects that cost more than the missing capture would have.
- Every capture has a **manifest row**. A capture with no row is unreviewable; a row with no per-case record is **incomplete review**, never a clean result.
- The reviewer **reloads the project design/UI convention docs before judging the first image**. A sub-agent inherits nothing from the calling conversation.
- Report **case by case first, synthesis second**. Synthesis without per-case records is a summary of memory, not of evidence.
- Only report what is **in the image**. Never invent a measurement; unmeasurable is `NOT VERIFIABLE`.
- This protocol is **evidence production and adjudication**. It never promotes a baseline, never rewrites an expectation, and never edits a test to make an image look better.

## Applicability and ownership

Binds when an executable browser/UI E2E or human-QC surface exists **and** visual review is enabled (the default, or explicit `--visual-review=true`). For a non-visual E2E/API/CLI scope, record `N/A — no user-facing visual surface` and do not invent a capture plan. A relevant UI surface with no screenshot capability is `ENVIRONMENT-BLOCKED`, never a pass.

| Consumer | Owns |
| --- | --- |
| `e2e-test` / `e2e-runner` | Instruments the capture helper into the base page/component objects, declares the trigger set and bounds, emits the manifest |
| `e2e-test-verify` | Report-only: verifies the manifest exists, is complete against the journey, and that captures were read; never repairs |
| `e2e-test-verify --fix-loop` | Runs the round, reconciles manifest vs records, feeds validated `BLOCKING` visual defects into the round's failure set, fixes the owning layer, reruns the same scope |
| `experience-review` | Opens and judges each capture, owns the per-case records, the taxonomy verdicts, and the synthesis |
| `ui-review` | Receives the static source findings the images point at (tokens, BEM/SCSS, z-index, component ownership, reuse) |
| `workflow-e2e` | Sequences the above and forwards the resolved `--visual-review` mode |

## Configuration

Project settings live at `docs/project-config.json` → `e2eTesting.execution.evidence.uiStateCapture`. Every field is optional to the schema; an absent field takes the default below, so an unconfigured project still gets the full protocol. Set `helper` and `manifestPath` explicitly anyway: a missing `manifestPath` is a validation warning in every mode, because the matrix is always indexed, and a missing `helper` is one while `mode` is not `off` (see **Validation**).

| Field | Default | Meaning |
| --- | --- | --- |
| `mode` | `every-action` when visual review is enabled | Which captures this protocol produces — see the mode table below. |
| `helper` | none — discovered from the repository | Project-relative path/symbol of the §1.1 capture helper. Never invented; when it cannot be found, record it as a missing capability. |
| `manifestPath` | `{evidenceRoot}/ui-captures/{runId}/capture-manifest.json`, where `{evidenceRoot}` is `evidence.root` or `tmp/` | Where the Part 2 manifest is written. |
| `maxPerTest` | `60` | Integer 1–1000. The §1.3 per-test cap. |
| `maxPerRun` | `400` | Integer 1–20000 and never below `maxPerTest`. The §1.3 per-run cap. |
| `fullPageWhenScrollable` | `true` | Capture full-page in addition to viewport wherever the surface scrolls (§1.3 item 5). `false` is an explicit opt-out: every scrollable surface captured viewport-only is listed as a coverage gap. |
| `maskSelectors` | `[]` | Volatile regions (clocks, timestamps, GUIDs, avatars) masked per §1.3 item 4. |

**Modes** — each accepted value has exactly one meaning:

| `mode` | Captures produced | Recorded outcome |
| --- | --- | --- |
| `every-action` | §1.2 transition captures **and** the §1.4 state × viewport matrix | The full protocol. |
| `declared-only` | The §1.4 matrix only (`source: matrix`); no transition captures | Part 4 pass 4 lists **every** state-changing action in the journey as an uncaptured transition, and the synthesis states `mode: declared-only`. Transition coverage is a recorded blind spot, never an implicit pass. |
| `off` | The §1.4 matrix only (`source: matrix`), still indexed in the manifest; no transition captures and no §1.1 action-layer helper | The synthesis records transition coverage once as `N/A — uiStateCapture off: {reason}` instead of listing every action as a blind spot. `off` removes transition capture only: the matrix is still required and read case by case, a missing matrix capture stays `ENVIRONMENT-BLOCKED`/`UNVERIFIED` exactly as in the other modes, and the visual review gate owned by `SYNC:e2e-visual-design-contract` is never waived or weakened — that opt-out is `--visual-review=false`. |

**Validation** (`project-config-schema.cjs`): an unsupported `mode`, a cap outside its range or not an integer, and `maxPerTest > maxPerRun` are errors; a missing `manifestPath` in any mode, or a missing `helper` while `mode` is not `off`, is a warning, because an unindexed capture set reads as `UNVERIFIED` and a per-test screenshot call decays invisibly.

---

## Part 1 — Capture instrumentation

### 1.1 Instrument the action layer, not the test

Put exactly one project-owned helper — conceptually `captureUiState(actionDescriptor)` — inside the **base page/component object's action primitives** (the shared `click`, `select`, `toggle`, `navigate`, `submit` wrappers), so every existing and future test emits captures without touching a single test body.

**Why the action layer:** a screenshot call written in a test is a call someone must remember, review, and copy into the next test. It decays within a sprint, and the decay is invisible — the run still passes, it just stops seeing. A capture emitted by the primitive every action already goes through cannot be forgotten, is configured in one place, and is bounded in one place.

Order inside the primitive is fixed:

```text
waitUntil(<readiness / actionability>, options)     # precondition
<perform the action>
waitUntil(<expected positive/negative outcome>, options)   # postcondition
wait 500ms                                          # presentation pacing
captureUiState({...descriptor})                     # capture the settled state
```

A capture taken before the postcondition records a transition, not a state, and every reviewer will report the resulting spinner, skeleton, or half-painted layout as a defect. The 500ms pacing is presentation only; it never substitutes for the postcondition.

### 1.2 Trigger inventory — what counts as a UI-state-changing action

Under `uiStateCapture.mode: every-action`, capture after **any** action that can change what a user sees. Enumerate the journey's actions against this list and record the resulting trigger set in the test plan — `declared-only` still records that set to list its blind spots, and `off` skips it:

| Class | Examples |
| --- | --- |
| Navigation | route change, page load, back/forward, deep link, redirect, tab-to-new-view |
| Activation | button/link click, form submit, row or card activation, context-menu action |
| Selection | dropdown/select open **and** option chosen, autocomplete pick, multi-select add/remove, date pick |
| Binary state | toggle, switch, checkbox, radio, star/favorite, enable/disable |
| Sectioning | tab switch, wizard/stepper advance or retreat, accordion or tree expand/collapse, "show more" |
| Overlay | modal, drawer, popover, dropdown menu, tooltip, confirm dialog — on **open and on close** |
| Data shaping | filter apply/clear, search submit, sort change, pagination, page-size change, grouping |
| Direct manipulation | drag-and-drop or reorder (pre **and** post), resize, inline edit enter and commit/cancel |
| Mode | theme, locale, density, read/edit mode, role or permission switch, responsive viewport change |
| Async boundary | loading → loaded, loading → empty, loading → error, optimistic → confirmed/rolled back |
| Feedback | toast, banner, inline validation, field error appearing or clearing |
| Session | login, logout, session expiry, re-auth prompt |

**Not triggers** (capturing these buys noise, not coverage): assertions and pure reads; hovers with no visual change; per-keystroke typing (capture once, on field commit or blur); polling ticks and animation frames; a re-render with an identical fingerprint.

**Pre-action capture** is required only when the finding needs a before/after pair: drag/reorder, destructive confirmations, inline-edit commit, and any transition whose defect is "nothing changed". Elsewhere the previous capture *is* the before.

### 1.3 Determinism, bounding, and cost control

Capturing every action is worthless if the output is unreadable or unbounded. Apply all five:

1. **Dedupe by fingerprint.** Skip a capture whose post-action visual/DOM fingerprint equals the immediately preceding one, and record it in the manifest as `deduped_from: <seq>`. A skipped capture is still a manifest row — silence is not coverage.
2. **Bound per test and per run.** Default caps: 60 captures per test, 400 per run, configurable per project. Reaching a cap is an **escalation record naming the untaken captures**, never a silent truncation.
3. **Sample repetition.** For a loop over N similar items (rows, cards, pages), capture the first, one middle, and the last, and record the sampling rule applied. Do not capture 200 near-identical rows.
4. **Mask volatile regions.** Clocks, timestamps, GUIDs, avatars, and random seeded names are masked per project config so an unchanged UI produces an unchanged image. Unmasked volatility turns every rerun into a false diff.
5. **Capture full-page as well as viewport** wherever the surface scrolls — a viewport-only capture hides exactly the overflow defects this protocol exists to find.

**Failure captures are exempt from dedupe and from the caps.** When an action's postcondition times out or an assertion fails, capture immediately and unconditionally, and mark the row `phase: failure`. That image is the most valuable one in the run.

### 1.4 Capture is additive to the state × viewport matrix

Transition captures do **not** replace the declared state × viewport matrix (loading, empty, error, permission, post-submit, full-page). The matrix guarantees the *required* states are seen even if the journey never reaches them naturally; transition capture guarantees every state the journey *does* reach is seen. Both are required when `mode` is `every-action` (the Configuration mode table defines `declared-only` and `off`); the manifest holds both, distinguished by `source: matrix | transition`.

---

## Part 2 — The capture manifest

The manifest is what makes case-by-case review reconcilable — without it a reviewer cannot tell a clean run from an unfinished one.

**Paths** (under the configured evidence root, or `tmp/` when none is configured):

```text
{evidenceRoot}/ui-captures/{runId}/capture-manifest.json
{evidenceRoot}/ui-captures/{runId}/{TC}/{NNN}-{action}-{surface}-{viewport}.png
```

**One row per capture — including deduped and capped-out ones:**

| Field | Meaning |
| --- | --- |
| `seq` | Monotonic order within the run — the review order |
| `tc` / `test` | `TC-{MODULE}-E2E-{NNN}` and the test name |
| `gwt_step` | Which `Given`/`When`/`Then` step this capture belongs to |
| `source` | `matrix` or `transition` |
| `phase` | `pre`, `post`, or `failure` |
| `action_type` / `action_label` | Trigger class from §1.2 and a human label ("click Save", "select Status = Closed") |
| `target` | The stable locator acted on |
| `route` / `surface` | URL/route and the surface or screen name |
| `viewport` | Named viewport/device, with `full_page: true|false` |
| `expected_delta` | What the UI was supposed to change to — the reviewer's oracle for `UIX-STATE` |
| `path` | Project-relative image path |
| `masked` | Regions masked |
| `deduped_from` | Present when skipped as identical |
| `console_since_last` | Errors/warnings emitted between the previous capture and this one |
| `read` | Set true only once a reviewer has actually opened it |

`console_since_last` is what lets a reviewer attribute a runtime error to the exact transition that caused it, instead of to the run as a whole.

---

## Part 3 — Per-case review

### 3.1 Blocking precondition — reload the authority first

**Before opening the first image**, read and cite the project's own UI authority; a sub-agent inherits nothing from the calling conversation, and judging a design from memory is how a house convention gets reported as a bug:

- `docs/project-config.json` → `designSystem.canonicalDoc`, `tokenFiles`, `appMappings[]`
- the resolved design-system doc, `frontend-patterns-reference.md`, `scss-styling-guide.md`
- `.claude/docs/design-knowledge.md` (`DD-1`–`DD-8`) and `.claude/docs/design-review-checklist.md` (`CL-1`–`CL-6`, `P0`–`P4`)
- the governing brief, spec, or accepted `$design` decision for the surface

Record which authority files resolved and which were absent. **Precedence:** brief/accepted design contract → project design-system, SCSS, frontend docs and ADRs → shared `UI-*`/`DD-*`/`CL-*`. A repo-wide convention is an intentional identity, never a distinctiveness finding. A genuine conflict goes to the user with both sides — never resolved silently.

### 3.2 One capture at a time

Follow `SYNC:incremental-persistence`: open exactly ONE capture, inspect it, append its record to the report file, and only then open the next. Never batch images and never hold findings in memory — a long review is cut off before the final write, and a batched review loses everything.

Per-case record:

```text
CASE {seq} — {tc} · {action_label} · {surface} @ {viewport} · {phase}
IMAGE      {path}   READ: yes
EXPECTED   {expected_delta}
OBSERVED   <what is actually in the image — facts, with locations>
CONSOLE    <errors/warnings attributed to this transition, or none>
FINDINGS   <taxonomy code · severity · location · what IN the image shows it>  |  none
VERDICT    PASS | FAIL | PARTIAL | NOT-VERIFIABLE
```

An explicit `none` is required when a capture is clean. A missing record is an unreviewed capture.

### 3.3 UI defect taxonomy

One code per finding, so per-case records cluster in synthesis:

| Code | Catches | Default severity |
| --- | --- | --- |
| `UIX-BROKEN` | Blank page, error boundary, raw stack/error text, failed render, missing region | BLOCKING |
| `UIX-UNSTYLED` | Stylesheet not applied, raw/unthemed default controls, persisted FOUC, missing component styling | BLOCKING |
| `UIX-OVERFLOW` | Clipped or truncated content without affordance, text escaping its container, unintended horizontal scroll, cut-off controls | BLOCKING |
| `UIX-OVERLAP` | Overlapping or occluded content, z-index defects, sticky/fixed element covering content, modal behind backdrop | BLOCKING |
| `UIX-LAYOUT` | Collapsed or misaligned grid, broken responsive reflow at a matrix viewport, spacing off the system scale, inconsistent alignment | BLOCKING when it impairs use; else ADVISORY |
| `UIX-STATE` | The transition produced no visible change where `expected_delta` required one; missing loading/empty/error/disabled/selected feedback; stale data after a mutating action | BLOCKING |
| `UIX-A11Y` | Measurable floor only: contrast below the floor, missing/invisible focus ring, touch target under the floor, visibly unlabeled control | BLOCKING |
| `UIX-CONVENTION` | Deviates from the project's own tokens, components, or documented pattern — **requires a citation of the authority clause it breaks** | BLOCKING when the authority states it as a rule; else ADVISORY |
| `UIX-FLOW` | UX friction visible across the sequence: dead end, unexplained context loss, redundant step, destructive action without confirmation, no feedback between action and result | BLOCKING when it blocks the journey; else ADVISORY |
| `UIX-POLISH` | Identity and taste (`DD-1`–`DD-8`): distinctiveness, palette/type character, a nicer alternative | ADVISORY |

Map to the existing gate: `BLOCKING` findings enter the E2E round's failure set and must be fixed at the owning layer before a rerun. `ADVISORY` findings are recorded with location and rationale and **never** open a round — taste has no fixed point, and a loop that runs on it edits a surface that was already correct.

### 3.4 Evidence discipline

Cite the image and the location, and say what **in the image** shows the defect. Never infer source architecture, tokens, or component structure from a picture — those go to `$ui-review` as static findings. Never invent a measurement: if the claim needs a number the capture cannot give, record `NOT VERIFIABLE` and name what would settle it. `NOT-VERIFIABLE` is missing capability, not a defect, and is never `BLOCKING`.

---

## Part 4 — Cross-capture synthesis

Per-case records answer "is this screen right". Synthesis answers "is this UI right", and it is where most of the value is. Run all four passes:

1. **Reconcile.** Every manifest row has a record — including deduped and capped rows. Missing records mean the review is `UNVERIFIED`, never clean. Report `reviewed / total`.
2. **Cluster by owner.** The same defect on N captures is **ONE finding with N locations**, attributed to the component that owns it (`Common` → `Domain-Shared` → `Page`). A header that overflows on nine screens is one shared-component fix, not nine page fixes — and reporting it nine times hides that.
3. **Read the sequence.** Some defects exist only between captures: no feedback between an action and its result; layout shifting between consecutive steps; the same component rendered inconsistently across surfaces; a state the journey never reached; convention drift accumulating across a flow; a destructive action with no confirming state.
4. **Report coverage gaps.** List the state-changing actions in the journey that produced **no** capture, plus capped/sampled-out captures — under `uiStateCapture.mode: off`, record transition coverage once as `N/A — uiStateCapture off: {reason}` instead of listing each action, and still list capped/sampled-out matrix captures. A gap is a known blind spot, recorded — not an implicit pass.

**Synthesis output:**

```text
COVERAGE   {reviewed}/{total} captures reviewed · {gaps} uncaptured transitions, or N/A when uiStateCapture.mode is off · caps hit: {y/n}
AUTHORITY  <design/convention docs resolved, and any absent>
BLOCKING   <clustered finding · code · owning component/layer · locations · proposed owning-layer fix>
ADVISORY   <clustered finding · code · locations · rationale>
JOURNEY    <sequence-level findings>
ROUTED     $fix --target=ui <...> · $ui-review <static source findings> · <spec/owner escalations>
VERDICT    PASS | BLOCKING-OPEN | ENVIRONMENT-BLOCKED | UNVERIFIED
```

---

## Verdict and handoff

- `PASS` requires: manifest complete, every row reviewed and read, zero open `BLOCKING` findings, and coverage gaps recorded. A green E2E command alone is **never** a visual pass.
- `ENVIRONMENT-BLOCKED` names the missing capture, masking, viewport, or inspection capability. `UNVERIFIED` names the unreviewed captures.
- Route: owning-layer UI defects → `$fix --target=ui` then a fresh same-scope E2E rerun · static source/token/BEM/ownership findings → `$ui-review` · runtime/log findings → `$experience-review` · spec or intent gaps → the spec owner.
- Never call `--update-snapshots`, replace a visual fixture, or promote a baseline from this protocol's output. Candidate evidence becomes an expectation only through an explicit `HUMAN-ACCEPTED` record.

## Required record

Persist: capture capability and authority resolution · trigger set and bounds applied · manifest path and row count · one per-case record per row with verdict and taxonomy findings · reconciliation count · clustered blocking/advisory findings with owners · journey-level findings · coverage gaps and caps · routing decisions · final verdict and next step.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Make the E2E run prove the UI is correct to look at — capture every UI-state-changing transition automatically (default `uiStateCapture.mode: every-action`), index it, judge each capture individually against the project's own authority, and synthesize owner-routed findings.

**IMPORTANT MUST ATTENTION** while `uiStateCapture.mode` is `every-action`, instrument transition capture in the shared action layer after the `waitUntil` postcondition and the 500ms pacing; in every mode, emit a manifest row for every capture including deduped and capped ones; failure captures are never deduped or capped.

**IMPORTANT MUST ATTENTION** reload the project design/UI convention docs before judging the first image, review ONE capture at a time appending each record before the next, report case by case and only then synthesize, cluster repeated defects to their owning component, never invent a measurement, and never auto-promote a baseline.
