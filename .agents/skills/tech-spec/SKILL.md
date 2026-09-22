---
name: tech-spec
description: '[Documentation] Use when (re)generating the DERIVED technical spec view over code and tests, or reporting §8 TC drift. A generator — never authors business content. Modes: generate|audit|sync.'
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->
## Codex Project-Reference Loading (Hook-Independent)

Claude and Codex use static project-reference loading as the authority; hooks may accelerate discovery but never replace the explicit read.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**
- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$ai-context-refresh`) before ordinary project-specific work. A full `$sync-codex` run preflights `CLAUDE.md`; a completed `$ai-context-refresh` run may invoke the standalone runner with `--skip=claude-md` after final source edits. Markerless roots need AI smart-merge unless `portability.requireUniversalGuides: false` is explicit.

**Situation-based docs:**
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `configured styling reference`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

> **Portability:** the technical root is read from `docs/project-config.json` → `specRoots.technical.path` (declared `authorship: "derived"`, `m1Policy: "exempt"`). NEVER hardcode a root. `{TechRoot}/{Service}/{Component}.md` is a **pattern** — `{Service}` and `{Component}` are placeholders resolved from the repo, never literal names.

**[IMPORTANT] task tracking** — Break ALL work into small tasks BEFORE starting (one task per emitted artifact).

**Goal:** For annotation-compatible projects, project code and configured test annotations into a regenerable technical view without creating a second source of truth; route native-case reconciliation to its canonical owner and never report unsupported generation as empty success.

**Summary:**

- **Purpose:** a DERIVED-view annotation generator ONLY — it reads code plus the configured `TestSpec` / `TechnicalSpec` contract and never authors business content. It has no native-case carrier adapter.
- **Profile gate:** resolve `specArtifacts` and `specRoots` first. A valid native profile routes `sync` through `$spec [mode=sync]`; `generate` is `UNSUPPORTED` until a compatible generator exists. If no native profile applies, keep the strict §8/TC default. Missing or invalid required contracts remain `NOT CONFIGURED` / blocked; never fall back or claim empty success.
- **Main steps (run in order):** **Step 0** Resolve config/profile/root and scope/mode; ask only for ambiguous scope or mode. Native generation → report `UNSUPPORTED` and stop before the generator; absent `techSpecScan` → `NOT CONFIGURED`. **Step 1** Derive supported annotation facts — use-case inventory, annotation joins, topology. **Step 2** Instantiate the fixed templates. **Step 3** Stamp & write each artifact immediately. **Step 4** Verify no retired artifacts, banners, business content, canonical claims, or secrets.
- **Modes:** `generate` only when the annotation generator contract applies · `audit` reports freshness only for a configured derived view · `sync` routes native profiles to `$spec [mode=sync]`, or reports canonical §8 TC ↔ test-code drift under the strict default (`references/sync.md`).
- Hard prohibition is the load-bearing rule: never emit the retired A-E engineering tree, `M##` dirs, `00-module-registry.md`, `01-domain-erd.md`, or `06-reimplementation-guide.md` under the technical root — why: an A-E bundle becomes a second source of truth competing with the Feature Spec, and a generator able to recreate it resurrects the retired tree on its next run (this has occurred once already, via rebase).
- Every generated file carries the `> DERIVED — regenerate with the tech-spec skill; do NOT hand-edit` banner + a regenerate date, anchors each fact back to its source, and makes **no canonical claim**.
- **This skill is M1-EXEMPT** (`specRoots.technical.m1Policy: "exempt"`) — its prose MAY name technology. That exemption is the whole reason this tree exists; it is NOT a licence to carry business content (see **Hard Prohibitions**).

> **[SCOPE]** This skill generates a **DERIVED** technical view over code + tests under `specRoots.technical.path`. It MUST NOT emit a per-module A-E engineering bundle (`A-domain-model`, `B-business-rules`, `C-api-contracts`, `D-events`, `E-user-journeys`), `M##` directories, `00-module-registry.md`, `01-domain-erd.md`, or `06-reimplementation-guide.md` — those are not part of the spec model. It MUST NOT author business content: the Feature Spec under `specRoots.business.path` owns §1–§8, and this skill neither writes nor amends it. Authority: [`docs/project-reference/spec-system-reference.md`](../../../docs/project-reference/spec-system-reference.md) — project-reference docs root default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path — and [`.claude/skills/shared/sdd-artifact-contract.md`](../shared/sdd-artifact-contract.md).

**Inputs:** supported annotation mode reads the code tree (command/query handlers, event consumers, background jobs, producers, sagas, outbox) and configured test annotations (`TestSpec` / `TechnicalSpec`). **Code is the technical source of truth** — this skill projects a view and never populates a parallel canonical layer. A native profile is not an input to this annotation generator.

**Modes:**

| Mode       | Trigger                                    | Input                                          | Output                                                                       |
| ---------- | ------------------------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `generate` | default — only when the annotation generator contract applies | code + configured test annotations | `{TechRoot}/{Service}/{Component}.md`, all DERIVED (`references/author.md`); native profiles are unsupported |
| `audit`    | explicit request — staleness check          | code/test mtimes or git vs an existing derived view | Stale-list report when configured; otherwise `NOT CONFIGURED`. Never mutates |
| `sync`     | "sync tests" / "reconcile tests" / harvest  | native profile, or §8 TCs under strict default | Native: `$spec [mode=sync]` report. Default: §8/test drift and route-only `CoveredBy:` / orphan report (`references/sync.md`) |

**Tooling:**

These are the ONLY invocations. `.claude/` is portable and self-running — never route this tooling
through a host `package.json` script, which does not exist in a project that copied only the bundle.
Before an interactive generation, resolve the profile and require the supported annotation contract. An absent `techSpecScan` is `NOT CONFIGURED`; do not invoke `--optional` and present its successful skip as coverage.

- `node .claude/skills/tech-spec/scripts/generate-tech-specs.mjs` — regenerate the derived technical
  views from code/test annotations.
- `node .claude/skills/tech-spec/scripts/generate-tech-specs.mjs --check` — read-only freshness and
  annotation-occurrence completeness gate. It is fail-closed when a project contract is absent or
  malformed; add `--optional` only for an orchestration entry point that should record an absent
  `techSpecScan` contract as a skip (the sync runner's `tech-spec-freshness` stage does exactly this).

**Mode resolution (do this before any work):**

1. Read `docs/project-config.json`; resolve `specArtifacts`, `specRoots.technical.path`, and `techSpecScan` before selecting a procedure. A malformed declared profile blocks; it never falls back to TC.
2. Parse the mode from the invocation: explicit `[mode=<x>]` wins; otherwise infer from the request.
3. A native profile routes `sync` to `$spec [mode=sync]`; its `generate` view is `UNSUPPORTED` and must stop before the annotation generator. Without a native profile, strict §8/TC sync remains the default; generation still requires the configured annotation contract.
4. If scope/mode remains ambiguous, ask by asking the user directly before mutation.
5. **Read the matching `references/` body** — it owns that mode's procedure and output contract. Do not run a mode from memory.

**Workflow:** `$investigate` (locate the component) → `$tech-spec` (project the view) → `$changes-review` → `$watzup`

**Key Rules:**

- **MUST ATTENTION** resolve `specArtifacts`, `techSpecScan`, `specRoots.technical.path`, and mode before generation; never hardcode roots or component names.
- **MUST ATTENTION** route native-profile reconciliation through `$spec [mode=sync]`; keep strict §8/TC behavior only when no native profile applies.
- **MUST ATTENTION** require `$spec [mode=sync]` to return its configured native reconciliation report; **NEVER** treat a missing report as a successful sync.
- **MUST ATTENTION** map each selected owner/case/variant through the actual executor, assertion, and run evidence; **NEVER** infer coverage from title or identity alone.
- **MUST ATTENTION** report native generation as `UNSUPPORTED` and absent annotation configuration as `NOT CONFIGURED` before invoking the generator; never emit or accept an empty success.
- **NEVER** author business content or emit retired A-E artifacts; code/tests remain the source of truth.
- **MUST ATTENTION** derive facts mechanically, anchor them to sources, write each artifact immediately, and verify regeneration is idempotent.
- **NEVER** let the harvest detector gate generation; it reports candidates while C1/C2/C6/C7 remain hard errors.

---

## The Generator Contract (NON-NEGOTIABLE)

This skill is a **generator**, not an author. Every clause below is structural — none is a preference a future maintainer may relax for convenience.

| # | Clause | Why |
| --- | --- | --- |
| **C1** | **[BLOCKING]** Output is **DERIVED and regenerable** — every generated file carries a `> DERIVED — regenerate with the tech-spec skill; do NOT hand-edit` banner + a regenerate date. It is **NEVER a second source of truth**. | A derived view makes no truth claim, so it cannot compete for canonical status. A hand-editable tree makes one — and then "which is right, the doc or the code?" becomes askable. |
| **C2** | **[BLOCKING]** **Never authors business content.** No user story, no acceptance criterion, no business rule, no §1–§7 prose, no §8 TC is written by this skill — in any mode. The Feature Spec stays the source of truth for all of it. | Carrying the Feature Spec's own artifact types is exactly how a rival tree competes on the Feature Spec's turf. |
| **C3** | **[BLOCKING]** **Never claims to be a source of truth.** The generated files never assert canonical authority. When the view disagrees with code, **code is right by construction and the view is stale — regenerate it.** | A derived aid that asserts canonical authority corrupts the single-writer contract. |
| **C4** | **[BLOCKING]** **Write each artifact immediately** after instantiating it; do NOT accumulate large outputs in context. | A `{Service}/{Component}` fan-out is exactly the case that exhausts context mid-run and loses every unwritten artifact. |
| **C5** | **[BLOCKING]** **Single writer.** This skill is the **sole writer** under `specRoots.technical.path`. Nothing else writes there; it writes nowhere else. | Two writers is how a view becomes a sibling. |
| **C6** | **[BLOCKING]** **Regeneration is idempotent** — regenerating over unchanged source produces an **empty diff**. | This is the tree's flagship oracle: it proves the artifact can be thrown away and rebuilt from its source. If it cannot, the tree holds content of its own — it claims truth, and it is a rival. |
| **C7** | **[BLOCKING]** **A-E filenames are never emitted.** See **Hard Prohibitions**. | An A-E bundle becomes a second source of truth competing with the Feature Spec. |

### C8 — Mechanical detect + route · never judge · never write business content

> **A generator MUST NEVER apply RIT — or any judgment test — at generation time.** Judgment produces data; generators consume data.
> Canonical formulation: [`.claude/skills/shared/sdd-artifact-contract.md`](../shared/sdd-artifact-contract.md) (beside RIT). **Cited, not restated.**

| | Who | When | Output |
| --- | --- | --- | --- |
| **Judgment** (RIT, business-invariant verdicts, visibility classification) | a human, or an AI **outside** this generator | **once**, at authoring/classification time | a **persisted verdict — data** |
| **Generation** | `$tech-spec` | every run | output **mechanically re-derived** from that data |

**Idempotency holds because nothing is re-judged.** The generator reads a verdict it did not make and cannot revise. Same source + same verdicts ⇒ same output, every run. **A generator that judges is not idempotent — it fails C6 against its own tree, permanently, and the failure reports as `hand-edited`, which is the wrong cause and undiagnosable.**

**Two resolutions that are FORBIDDEN, because both look like fixes:**

| Rejected | Why it fails |
| --- | --- |
| **Scope idempotency to only the mechanical sections** | Reintroduces a **per-section carve-out** — an exemption at a new address. A carve-out is this framework's characteristic failure; do not re-mint one inside the oracle. |
| **Cache judgments inside the generator** | The generator then owns a **staleness problem**: a cached verdict that outlives the code it judged, invisible to review and to `git`. **Persisted verdicts belong in the artifact, not in generator state.** |

### C9 — The harvest detector REPORTS; it never gates

> **A structural proxy for a semantic property REPORTS; it never blocks.**
> Canonical formulation: [`.claude/skills/shared/sdd-artifact-contract.md`](../shared/sdd-artifact-contract.md) (beside RIT). **Cited, not restated.**

Harvest **detection** is a structural signal — *an invariant enforced at ≥2 points with no business rule citing it* (the countable property `references/sync.md` step 2 already asks for). It is **mechanical**, so this skill may perform it. Its output is a **candidate list** for human or `$spec [mode=update]` adjudication.

- **NEVER an `error`. NEVER a build gate. NEVER a precondition on regeneration. NEVER a fixture that fails CI.**
- The detector is a **structural proxy**: it infers a semantic property from a correlate, and the rule-citation link it reads is **prose, not a key**. It has false positives (a covered invariant can present as uncovered) **and** false negatives (an invariant enforced at one chokepoint is invisible to a ≥2-point counter).
- **Why it may not gate:** a false positive that blocks a build gets suppressed — **and a suppressed detector is a dead detector.** A `report` cannot be suppressed, because it never blocked anything worth suppressing it for.
- **A detection changes the report, never the tree** — so it cannot break C6.

**The boundary — C9 does NOT license softening anything else:**

| Rule | Operationally defined? | Severity | Why |
| --- | --- | --- | --- |
| **C1** — DERIVED banner | **Yes** — a literal string test | **`error`** | The banner check **is** the rule |
| **C6** — regeneration-idempotency | **Yes** — regenerate, diff empty | **`error`** | **An ORACLE, not a proxy — it re-runs the transform and compares. It does not infer.** |
| **C7** — no A-E resurrection | **Yes** — a **closed** filename set | **`error`** | The filename list **is** the rule |
| **C2** — no `US-`/`AC-`/`BR-` in the technical tree | **Yes** — a static prefix denylist | **`error`** | The prefix list **is** the rule |
| **M1 / tech-token bans on the business tree** | **Yes** — a token denylist | **`error`** | Operationally defined; the spine stands |
| **Harvest detector** | **No** — measures a correlate and **infers** | **REPORT — never gates** | The proxy rule |

> **Do not misread C6 as a proxy.** C6's rule is *"regeneration over unchanged source produces an empty diff"* — **and the empty diff IS the rule.** It executes the property rather than reasoning toward it. Demoting C6 would destroy the only real oracle here. **C6 gates at `error`, and nothing stands behind it to be a proxy for.**

---

## Step 0 — Scope Gate (MANDATORY FIRST)

Before deriving facts or invoking a generator, read the project config and resolve the profile and technical root. Use ask the user directly only if scope or mode remains ambiguous. A native-profile generation request returns `UNSUPPORTED` here; do not continue to the annotation generator.

| Dimension       | Question                                                                                          | Auto-Default          |
| --------------- | ------------------------------------------------------------------------------------------------- | --------------------- |
| **Scope** ★     | Which `{Service}` / `{Component}` — one component, one service, or the whole technical root?      | — must confirm        |
| **Mode** ★      | `generate` (supported annotation view only) OR `audit` OR `sync` (native `$spec` report, or strict-default §8 ↔ tests)? | `generate` |
| **Sections**    | Full view, or a subset (use-case inventory / TC↔test map / topology)?                             | Full view             |

> **[BLOCKING]** Resolve `specArtifacts`, `techSpecScan`, and `specRoots.technical.path` from `docs/project-config.json` FIRST. If the technical root is absent, STOP. A native profile does not authorize annotation generation; absent/unsupported generator configuration is `NOT CONFIGURED` / `UNSUPPORTED`, never an empty successful view.
> **[BLOCKING]** If the target `{Service}`/`{Component}` has **no** derivable source (no handlers, consumers, jobs, or annotated tests), STOP — there is nothing to derive from. **NEVER fabricate a component to document.**

---

## Step 1 — Derive the Facts (grep, never recall)

Read `references/author.md` and execute its derivation greps. Extract ONLY mechanically-derivable facts:

1. **Use Case Inventory** — write ops (N), read ops (M), event-driven (K), background jobs (J), and actor roles, per `references/author.md`.
2. **TC↔test map (strict default only)** — join existing configured `TestSpec` annotations for business TC coverage and `TechnicalSpec` for technical-only coverage. Do not apply this map when a native profile is selected; native reconciliation belongs to `$spec [mode=sync]`. **NEVER hand-move annotation data.**
3. **Cross-service topology** — producers, consumers, sagas, shared contracts, data ownership (the `SYNC:cross-service-check` scan below is the procedure).
4. **Anchors** — every fact carries an abstract `[Source: {namespace}/{service}/{id}]` anchor.

> **Scale note:** for a service with many components, you MAY spawn parallel reader sub-agents (one per component) that each return the extracted fields above. This is an optimization, not a gate.
> **[BLOCKING]** Do NOT interpret, rank, assess business relevance, or judge any derived fact (**C8**). Count it, anchor it, emit it.

---

## Step 2 — Instantiate the Templates

Per `references/author.md`: fixed sections, **declared order**, **pinned table sort keys**, templated prose over grepped values.

> **[BLOCKING]** **A fact that cannot be templated is emitted in a table, never narrated.** Free composition is where non-determinism lives, and it breaks **C6**.

---

## Step 3 — Stamp & Write

- Every generated file opens with the `> DERIVED — regenerate with the tech-spec skill; do NOT hand-edit` banner + a regenerate date.
- Write each file immediately after instantiating it; do NOT accumulate large outputs in context (**C4**).

---

## Step 4 — Verify (self-check before completing)

- [ ] **No retired artifacts emitted** — grep your own output paths: zero `M[0-9]` dirs, zero `A-domain-model`/`B-business-rules`/`C-api-contracts`/`D-events`/`E-user-journeys`, zero `00-module-registry`/`01-domain-erd`/`06-reimplementation-guide`.
- [ ] **DERIVED banner + regenerate date present** on each generated file.
- [ ] **No business artifact types** — zero `US-`, `AC-`, `BR-` identifiers anywhere under the technical root (**C2**).
- [ ] **No canonical claims** — the derived files never assert they are the source of truth (**C3**).
- [ ] **Every anchor resolves** — grep the source path; mark `[UNVERIFIED]` rather than guessing.
- [ ] **No secrets** — zero connection strings, credentials, tokens, internal hostnames, or customer data encountered while reading config/seeders/fixtures.
- [ ] **Idempotency** — re-running over unchanged source produces an empty diff (**C6**).

---

## Hard Prohibitions (NON-NEGOTIABLE)

This skill produces only the DERIVED technical view. Emitting an A-E engineering tree would create a second source of truth competing with the Feature Spec — and a generator still able to recreate A-E would **resurrect the retired tree on its next run**, which is an active hazard rather than a theoretical one: the tree has come back once already through a rebase and had to be re-deleted. Therefore this skill MUST NEVER create:

| Forbidden output                                                                                          | Why                                                                |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `M##` directories (e.g., `M01/`, `M02/`)                                                                  | Retired per-module partition                                       |
| `A-domain-model.md` / `B-business-rules.md` / `C-api-contracts.md` / `D-events.md` / `E-user-journeys.md` | Retired A-E engineering bundle — content lives in the Feature Spec |
| `00-module-registry.md`                                                                                   | Retired registry                                                   |
| `01-domain-erd.md`                                                                                        | Retired per-system ERD name                                        |
| `06-reimplementation-guide.md`                                                                            | Retired per-system name                                            |
| Any `US-` / `AC-` / `BR-` identifier                                                                      | Business artifact types — the Feature Spec owns them (**C2**)      |
| Any file under `specRoots.business.path`                                                                  | This skill never writes the business tree (**C5**)                 |
| A hand-edit invitation, a "maintained by" line, or any canonical claim                                    | The view is regenerable output (**C1**, **C3**)                    |

**Scope:** this prohibition governs the **emit set** under `specRoots.technical.path` — the filenames this skill may create. It does not ban writing those names in prose elsewhere (an ADR recording the retirement must be able to name them as history).

If a user explicitly asks for an A-E bundle, explain it is retired and offer the derived view instead. If a user asks this skill to write a business rule or user story, **route to `$spec`** — this skill has no authoring path.

---

## Related Skills

| Skill                | Relationship                                                                                                    | When to Call                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `$spec`              | **Business owner** — authors the canonical tech-free 8-section Feature Spec. `$tech-spec` never writes it        | When a harvested candidate needs a rule authored (`mode=update`) |
| `$spec [mode=tests]` | **Owner of strict-default §8 TCs** joined by the annotation view                                                   | When the no-native-profile default needs a canonical TC       |
| `$spec [mode=sync]`  | **Owner of native-profile reconciliation** — consumes the configured owner/case/variant and evidence contract     | When a native profile applies                                 |
| `$spec-index`        | **Sibling derived-aid generator** over the business tree — same contract shape, different source                | For business-tree navigation aids                             |
| `$integration-test`  | **Consumer** — generates the tests whose annotations this skill joins                                           | When `sync` flags a TC with no covering integration test      |
| `$docs-update`       | **Orchestrator** — may call `$tech-spec` to refresh the derived view after code changes                         | After code changes need a full doc sync                       |

## What Is `$tech-spec`?

A **derived-view generator** over code + configured annotations, not a native-case adapter. For supported annotation projects it assembles a regenerable projection without creating a second source of truth. Native profile reconciliation belongs to `$spec [mode=sync]`; native technical-view generation stays explicitly unsupported until a compatible generator contract is declared. When no native profile applies, this skill retains the strict §8/TC default.

---

<!-- SYNC:cross-service-check -->

> **Cross-Service Check** — Microservices/event-driven: MANDATORY before concluding investigation, plan, spec, or feature doc. Missing downstream consumer = silent regression.
>
> | Boundary            | Grep terms                                                                      |
> | ------------------- | ------------------------------------------------------------------------------- |
> | Event producers     | `Publish`, `Dispatch`, `Send`, `emit`, `EventBus`, `outbox`, `IntegrationEvent` |
> | Event consumers     | `Consumer`, `EventHandler`, `Subscribe`, `@EventListener`, `inbox`              |
> | Sagas/orchestration | `Saga`, `ProcessManager`, `Choreography`, `Workflow`, `Orchestrator`            |
> | Sync service calls  | HTTP/gRPC calls to/from other services                                          |
> | Shared contracts    | OpenAPI spec, proto, shared DTO — flag breaking changes                         |
> | Data ownership      | Other service reads/writes same table/collection → Shared-DB anti-pattern       |
>
> **Per touchpoint:** owner service · message name · consumers · risk (NONE / ADDITIVE / BREAKING).
>
> **BLOCKED until:** Producers scanned · Consumers scanned · Sagas checked · Contracts reviewed · Breaking-change risk flagged

<!-- /SYNC:cross-service-check -->

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

<!-- SYNC:cross-service-check:reminder -->

**IMPORTANT MUST ATTENTION** microservices/event-driven: scan producers, consumers, sagas, contracts in task scope. Per touchpoint: owner · message · consumers · risk (NONE/ADDITIVE/BREAKING). Missing consumer = silent regression.

<!-- /SYNC:cross-service-check:reminder -->

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
> 4. **Spawn each wave in ONE message** — every `spawn_agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
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

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.
<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

- **IMPORTANT MUST ATTENTION Goal:** For compatible annotation projects, produce a regenerable technical view without a second source of truth; route native reconciliation to `$spec [mode=sync]` and never treat unsupported generation as empty success.
- **IMPORTANT MUST ATTENTION Main steps (in order):** resolve `specArtifacts`, `techSpecScan`, and roots → native `sync` to `$spec [mode=sync]` or strict-default §8/TC sync; native generation `UNSUPPORTED`, absent generator config `NOT CONFIGURED` → for supported annotation generation derive facts → instantiate fixed templates → stamp/write immediately → verify outputs. Ask only for unresolved scope/mode; do not fall back or skip the explicit unsupported result.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries — MUST ATTENTION each canonical body above):**

- **Cross-Service Check:** scan producers/consumers/sagas/contracts; flag breaking-change risk.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** NEVER present a guess as fact; traced proof, confidence >80% to act.

- **IMPORTANT MUST ATTENTION [BLOCKING]** This skill GENERATES; it NEVER authors. No user story, acceptance criterion, business rule, or §8 TC is ever written here — route to `$spec` — why: carrying the Feature Spec's own artifact types is how a rival tree competes on its turf
- **IMPORTANT MUST ATTENTION [BLOCKING]** Output is DERIVED + regenerable — never a second source of truth; when the view disagrees with code, **code is right and the view is stale — regenerate it**
- **IMPORTANT MUST ATTENTION [BLOCKING]** Never emit `M##`/A-E/`00-module-registry`/`01-domain-erd`/`06-reimplementation-guide` under the technical root — why: an A-E bundle becomes a second source of truth, and a generator able to recreate it resurrects the retired tree on its next run
- **IMPORTANT MUST ATTENTION [BLOCKING]** Stamp the DERIVED banner + regenerate date on every generated file; write after each artifact, never accumulate large outputs in context
- **IMPORTANT MUST ATTENTION [BLOCKING]** **Never judge at generation time** (**C8**) — mechanical detect + route only; judgment is not stable across runs, so a judging generator stops being idempotent and fails **C6** against its own tree while reporting the cause as `hand-edited`
- **IMPORTANT MUST ATTENTION [BLOCKING]** The harvest detector **REPORTS, never gates** (**C9**) — never `error`, never a build gate, never a precondition on regeneration — why: a false positive that blocks a build gets suppressed, and a suppressed detector is a dead detector. **This does NOT soften C1/C2/C6/C7 or M1 — all stay at `error`; C6 is an oracle, not a proxy**
- **IMPORTANT MUST ATTENTION [BLOCKING]** Resolve config/profile before work; ask only for ambiguity. Native generation → `UNSUPPORTED`, absent `techSpecScan` → `NOT CONFIGURED`, invalid profile → blocked; never claim empty success
- **IMPORTANT MUST ATTENTION [REQUIRED]** Read `specArtifacts`, `techSpecScan`, and `specRoots.technical.path`; `{TechRoot}/{Service}/{Component}.md` is a PATTERN — never hardcode a root, project, service, native case, or TC ID
- **IMPORTANT MUST ATTENTION [REQUIRED]** Templated prose over grepped facts ONLY — a fact that cannot be templated goes in a table, never a sentence — why: free composition is where non-determinism lives, and it breaks the idempotency oracle **and** is how a secret gets incidentally pasted
- **IMPORTANT MUST ATTENTION** Cite `[Source:]` anchor evidence for every derived fact (confidence >80% to act, <60% mark `[UNVERIFIED]`) — NEVER fabricate a handler, consumer, job, native case, or TC ID; grep to confirm
- **IMPORTANT MUST ATTENTION** Break task scope into small task tracking todos (one per emitted artifact) before acting; mark each `completed` immediately after its file is written; keep exactly one `in_progress`
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**Anti-Rationalization:**

| Evasion                                                       | Rebuttal                                                                                                          |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| "I found real insight the grep missed — I'll just add a note" | That is authoring. The view holds nothing of its own. Un-greppable nuance belongs in a code comment or an ADR next to the code. |
| "This component needs a business rule written down"           | Route to `$spec [mode=update]`. This skill detects and reports; it has no authoring path.                          |
| "The regenerate diff is noisy — I'll scope idempotency to the mechanical sections" | That is a per-section carve-out — the exemption disease at a new address. **Shrink the prose surface; NEVER relax the oracle.** |
| "The harvest detector found a real gap — make it fail the build" | NEVER. It is a proxy; a proxy that blocks gets suppressed, and a suppressed detector is dead. Report it.          |
| "The tech tree is M1-exempt, so business content is fine too" | Two orthogonal properties. `m1Policy` governs tech-agnostic strictness; it says nothing about business content. `US-`/`AC-`/`BR-` stay banned. |
| "Hand-editing this one file is faster than regenerating"      | A hand-edited derived file is a build failure. Fix the generator or the source, then regenerate.                   |
| "I'll cache the judgment so the next run is consistent"       | Generator-owned state is a staleness problem invisible to review and to `git`. Verdicts live in the artifact.      |
| "A-E would express this better for engineers"                 | A-E is retired and has resurrected once already. Emit the derived view.                                            |

**[TASK-PLANNING]** MUST ATTENTION analyze task scope and break into small todo tasks/sub-tasks via task tracking before acting.

> **[IMPORTANT]** Break into many small todo tasks systematically before starting — this is critical.

**IMPORTANT MUST ATTENTION** GENERATE, never author — output is DERIVED + regenerable; code + tests are the source of truth.
**IMPORTANT MUST ATTENTION** Never judge at generation time; the harvest detector reports and never gates — but C1/C2/C6/C7 stay at `error`.
**IMPORTANT MUST ATTENTION** Resolve profile and root first; native `sync` goes to `$spec [mode=sync]`, strict TC remains only the absent-profile default, and native generation is explicitly unsupported until a compatible generator exists. Never emit A-E/`M##`/retired filenames or business content.

---

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Static Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs` (static quality-protocol composer)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Resolve `specArtifacts` before selecting identity or carrier: use a valid profile, use strict-default TC/test identity only when the profile is absent, and block a malformed or unsupported declaration. Trace every requirement or invariant through decision, task, configured case/test identity and inspected assertion evidence, then carry it through source evidence and canonical docs/spec updates.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Resolve and validate `specArtifacts`: use valid native owner/case/variant identity and assertion-bearing evidence; use strict-default TC/TestSpec only when the profile is absent; block a malformed or unsupported declaration without fallback.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, analyze the task graph (output dependencies, shared write targets) into ordered parallel waves per PARALLELIZE before starting any task, then keep it synchronized as each step starts/completes. Preserve fixed ordering when a skill or workflow explicitly fixes it.
- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.
## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**
1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/a linter catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.
## Common AI Mistake Prevention (System Lessons)

- **Resolve project applicability before using framework examples.** Read the project config and relevant references, then inspect local evidence; honor explicit N/A and never impose a language, framework, architecture layer, styling method, tool, or runtime surface the project does not use.
- **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
- **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **Ownership before action.** When investigating a failure, ask which part owns the behavior before changing anything. Trace the wrong state to the component responsible for its invariant, then make one authoritative correction there.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec if one exists (the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, and state). Verify each against evidence, not intuition. Ask "what would falsify this?" — if nothing, it is not a hypothesis. The most expensive failure is going deeper into an assumed area while the real issue sits in an unexamined condition.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem; avoid unrelated cleanup. For review or enhancement work, announce improvements beyond the main request rather than silently expanding scope. Ask: "Would this change exist if I were not addressing this request?" — if not, remove it or disclose it.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Judge the environment before judging the code — a competing hypothesis, not a fallback.** A bug, failed test, error, or odd output is NOT proof of a code defect. Before deep tracing and before any verdict, sweep environment preconditions (toolchain/dependency/lockfile state, stale build or cache artifacts, env vars and config profile, service dependencies up-migrated-seeded, ports/network/clock, OS-path/locale, permissions and locks, leftover processes/containers/test data) AND transient resource pressure (RAM/OOM, CPU saturation under parallel workers, disk/temp exhaustion, handle and connection-pool limits, network flakiness, a timeout that is really slowness). Tell-tale shape: non-deterministic, timing-dependent, passes alone but fails in parallel, fails only on one machine or only on CI, or an error naming resources rather than business rules. Cite the discriminator you ran (clean environment? did code on the failing path change since it last passed? one machine or all? concurrency 1 or a clean rebuild?) — a verdict without one is a guess, for code as much as for the environment. Fix an environment cause in the environment or setup; NEVER edit product code or weaken/skip a test to absorb it, and a failure that vanishes on retry stays unexplained until its mechanism is named. — why: forcing green against an environment fault hides the real defect and permanently rots the test.
- **Cross-platform execution is a required contract.** Before authoring or changing a tool, script, process launcher, path assertion, or filesystem test, name the supported Windows, macOS, and Linux behaviors. Use platform-neutral Node APIs and literal argv vectors; never infer shell, temporary-path, executable-extension, ACL, or symlink semantics from the current host. Canonicalize existing paths before identity, hashing, or equality checks; test native Windows and POSIX seams when behavior differs; keep CI platform matrices authoritative. Preserve fail-closed security boundaries — repair the fixture or platform branch, never weaken the guard just to make one OS green.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
