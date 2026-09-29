> **Systematic Review Batching (map-reduce)** — When a changeset is large, do NOT review files one-by-one. Partition into size-capped batches, fire one specialized sub-agent per batch in parallel, then reduce. This bounds EVERY context — each batch agent AND the orchestrator — so coverage stays complete as file count grows.
>
> **Trigger ladder (one ordered escalation — not competing thresholds):**
>
> 1. **< 10 changed files** → sequential per-file review (default; no batching).
> 2. **≥ 10 changed files** → switch to systematic parallel mode. Announce: `"Detected {N} changed files. Switching to systematic parallel review protocol."` Then: categorize → size-capped batches → flat consolidation.
> 3. **categories > 6 OR files > 40** → additionally insert the hierarchical synthesis tier (below). Everything from rung 2 still applies.
>
> **Step 1 — Categorize.** Group changed files into logical categories derived from the project's actual structure (not forced). Category is the *concern axis*; orient with these examples, derive what fits the repository:
>
> | Category Type | Example Groupings |
> | --- | --- |
> | Agent/Tooling | AI scripts, hooks, skill definitions, workflow configs, linting rules |
> | Root config/docs | Root README, project config, CI/CD pipeline configs |
> | Reference docs | Architecture docs, patterns references, setup guides |
> | Feature/domain docs | Business feature documentation, spec files, ADRs |
> | Backend logic | Service/handler/controller source (infer from project structure) |
> | Frontend logic | UI component/state/API source (infer from project structure) |
> | Data/Schema | Migrations, schema files, seed data |
> | Tests | Unit, integration, E2E test files |
> | Infrastructure | Docker, k8s, CI/CD, cloud manifests |
>
> **Step 2 — Risk-weighted batches.** Size caps bound each agent's context; the risk tier decides how tight the cap is. Classify each category's tier FIRST — a file whose tier is unclear takes the high-risk tier:
>
> | Risk tier | Examples | Batch cap (whichever hits first) |
> | --- | --- | --- |
> | **High** | domain/business logic, commands/handlers/jobs, schema/migrations/data access, auth/permissions/secrets/money/PII, concurrency, public contracts, UI with state or requests | ≤8 files OR ≤2000 diff-lines — one category per batch |
> | **Low** | UI styling/markup with no logic, tests, docs and specs, configuration text | ≤20 files OR ≤4000 diff-lines — low-risk categories may share a batch |
> | **Mechanical churn** | generated files, lockfiles, pure renames/moves, bulk formatting | no batch agent — the orchestrator verifies by pattern (rule check plus a sample) and records it in the coverage ledger |
>
> Any category exceeding its cap splits into more batches (30 high-risk backend files → 4 batches). Size caps — not category caps — make "many files" safe: a category cap alone lets one giant category blow a single agent's context. Risk weighting spends line-by-line depth where a defect costs most; the whole-target reviewer and specialist escalation still cover low-risk files.
>
> **Step 2a — Sub-agent type per batch** (match the batch's dominant concern):
>
> - Code logic (any stack) → `code-reviewer`
> - Security-sensitive changes → `security-auditor`
> - Performance-critical paths → `performance-optimizer`
> - Docs, plans, specs, configs, infra → `general-purpose`
>
> Each batch sub-agent receives: its full file list; the Step 2b instruction to validate its own findings; `SYNC:category-review-thinking` as its primary thinking model — derive each category's concerns from first principles, NOT a fixed checklist (if the consuming skill does not carry that block, apply category-first thinking directly); project reference docs relevant to its concern (discover via `*patterns*`, `*conventions*`, `*style-guide*`); cross-reference verification instructions (counts, tables, links). All batch agents run in parallel and write findings to `tmp/reports/` (per `SYNC:task-tracking-external-report`); reducers read from disk, never from memory.
>
> **Step 2b — Each batch validates its own findings before returning.** The batch agent runs `$why-review --validate-findings <its batch report>` — a real terminal skill call in its own session, where the batch's code and protocols are already loaded — keeps the findings that survive, marks each `validated: in-batch`, lists every finding it rejected or re-tiered with its original severity, and never fixes. This matches report-only specialists and avoids re-loading the same context in a separate validator.
>
> **Step 3 — Reduce.**
>
> - **Deduplicate FIRST — before any validation or fix.** Merge findings that share one root cause (same owning `file:line` range and same violated rule or invariant) into one entry that lists every source batch/reviewer, keeps the highest justified severity plus each source's own severity, and records the merge — a severity disagreement between sources is a reviewer conflict. A cross-batch duplicate is never validated or fixed twice.
> - **Independent check set (after dedup).** In-batch validation trades independence for cost, so the orchestrator re-validates with `$why-review --validate-findings` in the main session: every finding raised or kept at CRITICAL/HIGH, including one its batch rejected or demoted; every finding two reviewers disagree on (severity, owner or fix); every finding its batch did not mark `validated: in-batch`; and at least one in three of each batch's MEDIUM findings (minimum one), picked by position in the batch report, never by content. When a batch's sample shows unreliable validation — more than one in four sampled findings rejected or re-tiered — validate all of that batch's MEDIUM findings. The remaining LOW and unsampled MEDIUM findings ride on their in-batch validation. Keep each validation pass small enough that every finding in it gets full attention.
> - **Flat reduction (rung 2, ≤6 categories AND ≤40 files):** the orchestrator collects each batch report, cross-references counts/tables/contracts ACROSS batches, detects gaps visible only across categories (feature in code but missing from docs; new API endpoint with no client call), and consolidates into one categorized holistic report.
> - **Hierarchical reduction (rung 3, > 6 categories OR > 40 files):** insert a mid-tier — each concern with two or more batches gets ONE synthesizer agent that reads only its own batch reports and emits a single concern-synthesis (a single-batch concern needs no synthesizer: its batch report is its synthesis). The orchestrator reads the **concern-syntheses (~5)**, never the raw batch reports — keeping the reducer's context O(#concerns), not O(#files).
>   - **Cross-concern interaction pass (mandatory at rung 3 — closes the synthesis-tier blind spot):** concern-siloed synthesis can drop an interaction spanning two concerns AND two batches (tainted source in data-layer/batch 7 → sink in api/batch 3). So: (a) each concern-synthesizer MUST emit an explicit **"cross-concern interaction candidates"** list — entities/symbols/contracts it touched that plausibly bind to another concern (shared DTOs, event names, table/collection names, exported symbols); (b) the orchestrator MUST run the Step-3 cross-reference/gap step **over those candidate lists across all concern-syntheses**, not only within a batch, before concluding. Without this pass the tier trades completeness for context-bounding on exactly the large diffs it targets.
>
> **Step 4 — Holistic assessment.** With all findings combined, judge: overall coherence as a unified intent; cross-category sync (docs match code? contracts match callers?); risk areas where categories interact; missing doc/spec updates for changed artifacts.
>
> **No silent truncation.** If any cap forces sampling or a batch is dropped for budget, ANNOUNCE the dropped/sampled scope explicitly — bounded coverage must never read as complete coverage.
