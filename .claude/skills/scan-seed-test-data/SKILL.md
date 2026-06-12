---
name: scan-seed-test-data
version: 1.0.0
description: '[Documentation] Use when you need to scan seeder patterns and populate/sync docs/project-reference/seed-test-data-reference markdown from real code evidence.'
---

> **[IMPORTANT]** Use `TaskCreate` to break work into small tasks before scanning.

## Quick Summary

**Goal:** Populate or sync `docs/project-reference/seed-test-data-reference.md` with project-specific seeder patterns using `file:line` evidence.

**Workflow:**

1. **Read target doc** — detect placeholder vs populated mode
2. **Scan codebase** — collect seeder base classes, env gate, idempotency loop, DI scope pattern, registration pattern
3. **Update doc surgically** — keep structure, refresh stale sections only
4. **Verify** — grep/trace evidence and ensure examples match real files

## Step 1: Detect Mode

Read:

- `docs/project-reference/seed-test-data-reference.md`
- `docs/project-config.json` (`Data Seeders` context group)

Mode rules:

- **Init mode:** placeholder/sparse content -> fill all sections from scan results
- **Sync mode:** existing content -> update only stale/incorrect sections

## Step 2: Collect Seeder Evidence

Run evidence-first scans and adapt examples to the configured stack:

```bash
# Discover the project's seeder base class/interface and registration pattern — adapt search terms from findings:
rg -n "DataSeeder|SeedData|CanSeedTestingData|SeedingMinimumDummyItemsCount" src
# Discover the project's DI-scoped execution pattern for seeders (e.g. scoped-async helpers):
rg -n "Scoped|CreateScope|ServiceScope|UnitOfWork|Uow" src
# Discover the project's seeder interface and DI registration — replace with actual names found above:
rg -n "ApplicationDataSeeder|AddTransient.*DataSeeder" src
# Discover cross-service wait / idempotency patterns — search for count/condition-poll helpers:
rg -n "WaitUntil\|PollUntil\|CountAsync\b\|AwaitCondition" src
# Discover concrete seeder examples — search for common seeder method name patterns:
rg -n "SeedInitialData\|SeedDemoData\|SeedTestData\|SeedAdmin" src
```

Graph check (when `.code-graph/graph.db` exists):

```bash
python .claude/scripts/code_graph trace <seeder-file> --direction both --json
```

Minimum evidence to capture:

1. Seeder base class/interface
2. Environment gate method/key
3. Idempotency predicate + count loop pattern
4. DI scope pattern (the project's scoped-execution / unit-of-work helper vs anti-patterns)
5. Seeder registration pattern in DI
6. Cross-service wait pattern (if used)

## Step 3: Update Reference Doc

Target file:

- `docs/project-reference/seed-test-data-reference.md`

Rules:

1. Keep the existing section structure where possible
2. Replace generic claims with real project evidence
3. Every rule/example requires `file:line` proof
4. Include anti-pattern warnings only when verified in source
5. Prefer short code snippets with clear source path notes

## Step 4: Verify and Report

Verification checklist:

1. Every example path exists
2. Key method/class names are grep-verified
3. Guidance matches current `docs/project-config.json` seeder rules
4. No stale references to removed symbols/files

Write report:

- `plans/reports/scan-seed-test-data-{YYMMDD}-{HHMM}-report.md`

Report sections:

1. Mode detected (init/sync)
2. Evidence summary (`file:line`)
3. Sections updated
4. Open gaps/TODOs

<!-- SCAN:prompt-enhance-final-step -->

## Final Step: Enhance Scanned Doc (MANDATORY)

**MUST ATTENTION** after the doc is written and verified, create a REQUIRED final todo task and run `/prompt-enhance docs/project-reference/seed-test-data-reference.md` — why: this reference doc is injected into AI context; attention-anchoring (top/bottom Final Purpose, inline READ summaries, token density) directly raises downstream AI output quality. A scan is NOT complete until its doc is prompt-enhanced.

**TaskCreate (required, last task):** `Run /prompt-enhance docs/project-reference/seed-test-data-reference.md on the scanned doc`

<!-- /SCAN:prompt-enhance-final-step -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
**Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
**Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
**Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
**Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
**When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
**Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
**Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
**Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
**Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
**Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.
**Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. The leak compiles and runs, so it passes review silently while coupling the "reusable" layer to one consumer. Push domain fields/logic down into the consumer via subclass or composition.

<!-- /SYNC:ai-mistake-prevention -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Final Step:** run `/prompt-enhance docs/project-reference/seed-test-data-reference.md` as the REQUIRED last todo task — never end the scan without enhancing the doc it just wrote.
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim
**IMPORTANT MUST ATTENTION** use surgical updates in sync mode (do not rewrite entire doc)
**IMPORTANT MUST ATTENTION** verify DI-scope safety guidance (the project's scoped-async execution primitive — discover from codebase grep) against real source usage
**IMPORTANT MUST ATTENTION** run one graph trace when graph DB is available
<!-- SYNC:critical-thinking-mindset:reminder -->
**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->
**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
<!-- /SYNC:ai-mistake-prevention:reminder -->
