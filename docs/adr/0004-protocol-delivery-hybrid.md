# ADR-0004: Hybrid Protocol Delivery and Narrowed Agent-Start Injection

- **Status:** Accepted
- **Date:** 2026-09-25
- **Plan:** `plans/260924-1548-framework-lean-guided-refactor/phase-21-spec-protocol-delivery.md` (owner decision D-1 in `goal.md`, refined in plan-review round 2 as R2-01; delivery confirmation run in `phase-20-protocol-spike.md`)
- **Spec:** `docs/specs/ContextDelivery/README.ProtocolDelivery.md` (feature code PDL)
- **Supersedes:** None. This ADR reverses two earlier decisions that were never recorded as ADRs: the no-reference duplication policy (`SYNC:shared-protocol-duplication-policy`, `.claude/skills/shared/sync-inline-versions.md:1336`) and the removal of agent-start context injection (`.claude/hooks/tests/test-all-hooks.cjs:649-654`).

**Current decision:** the decisions and earlier amendments below record their historical state. The [2026-10-04 amendment](#amendment-2026-10-04-review-family-entrypoints-use-guides-with-full-source-fallback) supersedes the four review-family skill exceptions in Decision 3; agents, mode references and fresh reviewer prompts retain their full applicable bodies.

## Context

### What the duplication policy bought

Every skill and agent carried each shared protocol it follows as a full inline copy between `SYNC:<tag>` fences. The policy forbade replacing a copy with a file reference: a model told to "read X" often does not, so a rule behind a file read is followed less reliably than a rule already in context. A skill was self-contained. Whatever path loaded it, the model had every rule in front of it.

### What it cost

The copies became the largest part of what the model reads. Shared protocol text is about 51% of all skill bytes, and a skill load pays for every protocol again even when the same session loaded the same protocol a minute earlier through another skill. Adopters measured this as a top token cost, and a second owner concern followed from it: a skill that is half repeated text dilutes the rules specific to that skill. The policy made the protocols reliable to deliver and expensive to carry, and the expense scaled with every new skill.

### Why the original reason no longer binds, and where it still does

The policy's reason was "a file read is skipped; inline text is not". Hook delivery puts the full text in context without asking the model to read anything, so the model gets the same text the inline copy gave it. The file path now exists only as the **fallback** for a missed delivery. Where a delivery can reach a skill only as paths, the original reason still applies in full. That is why the hybrid keeps inline text in exactly those places (the four review-family skills, reference files and agents), and why each converted group is held until a before/after review shows no compliance loss.

### Agent-start injection, removed and now re-added

Agent-start (`SubagentStart`) context injection was removed deliberately. The dispatchers were deleted for Claude/Codex skill parity, and agent guidance moved into the static `SYNC:agent-bootstrap` blocks of each agent file (`.claude/hooks/tests/test-all-hooks.cjs:649-654`). Two facts from this change bring it back in a narrow form:

- The built-in `Explore` and `Plan` agent types start **without** the root instruction file. The confirmation run found `CLAUDE.md` absent from both transcripts and present for a custom agent. Once the four root-carried protocols leave the skills, agent start is the only way those agents receive them.
- Agents that preload skills (`skills:` in their frontmatter) preload the converted skills, which now hold guide entries instead of bodies.

## Decision

### Hybrid delivery (D-1 as refined by R2-01)

1. **Converted skills keep guides.** Each protocol a converted skill follows becomes one guide entry in a `PROTOCOL-GUIDES` block: the tag, a one-line summary, when it applies, and the path of its published text. Its `:reminder` digest stays.
2. **Hooks deliver the full text** once per session per scope. Each of six groups is one entry file and one `additionalContext` string of at most 9,500 characters. Delivery re-arms after compaction and after 4,500,000 bytes of transcript growth (`reinjectAfterBytes`, the value used by `.claude/hooks/workflow-route-inject.cjs:73` and `.claude/hooks/lib/file-conventions.cjs:45-48`).
3. **Inline where hooks cannot carry the load.** The four review-family skills keep every full body (`inlineSkills` in `.claude/skills/shared/protocol-groups.json`). So do all `references/*.md` carriers and all agents. **The skill-entrypoint exception is superseded by the [2026-10-04 amendment](#amendment-2026-10-04-review-family-entrypoints-use-guides-with-full-source-fallback); reference and agent carriers remain full.**
4. **Universal rules.** The universal rules are hook-delivered only: one hook per authored bin (`protocol-inject-universal-<n>.cjs`) on the first prompt, after a compaction and at every agent start; no root file, skill or agent carries them. (This replaces the earlier decision that the root file carries four universal rules; see the amendments of 2026-09-30 and 2026-10-01.)
5. **Never silent.** A miss degrades to read-by-path. An unwritable ledger delivers without de-dup. This deliberately reverses the ledger's shipped "IO failure ⇒ caller skips delivery" (`.claude/hooks/lib/convention-ledger.cjs:176-178`) for protocol delivery. Only a live peer lock on the same record skips.
6. **Compliance gate.** Groups are converted one at a time. A review scored before and after on a fixed diff must not lose any check it passed; a confirmed regression holds the next group for the owner.

### The D-1 refinement: the four review-family skills stay inline

Six bins of 9,500 characters give a hook capacity of **57,000 characters per skill load**. The review-family skills carry more shared protocol text than that:

| Skill                     | SYNC characters |
| ------------------------- | --------------: |
| `changes-review`          |         139,257 |
| `code-quality-review`     |         117,191 |
| `why-review`              |          79,030 |
| `workflow-review-changes` |          63,871 |

Through hooks, most of that text would reach these skills as overflow paths, which is exactly the indirection the old policy warned about, and on the skills where compliance matters most. They keep their bodies inline, declare no guide tags and receive nothing from any group (the universal case included). A guide entry in one of them fails verification.

### Values confirmed by the delivery confirmation run (25 Sep 2026)

The run used Claude Code 2.1.282, codex-cli 0.156.1 and OpenCode 1.18.31 on Windows 11. A cell counted as delivered only when the host's own transcript held both markers at the right length, never on the model's self-report. **Stop-rule outcome: PROCEED.**

| Named default                                                                              | Decision        | Evidence                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6 groups (`review`, `evidence-trace`, `workflow-task`, `spec-test`, `design`, `universal`) | Confirmed       | Three 9,500-char strings on one event each arrived in full, capped separately                                                                                                                                                                                             |
| Bin 9,500 chars                                                                            | Confirmed       | Full on all four Claude paths. A 10,500-char string became a file plus a 2 KB preview (a hard cap with no setting)                                                                                                                                                        |
| Codex `additionalContextLimit` 3000 per protocol handler                                   | Confirmed       | The default 2,500 holds 9,500 chars and spills at 11,000 (estimate ≈ chars/4). At 3000, 11,000 fits and 12,500 spills                                                                                                                                                     |
| Codex inline list empty                                                                    | Confirmed       | Every Codex path delivered the full 9,500: `$skill` on UserPromptSubmit, PostToolUse `Bash` shell read, SubagentStart                                                                                                                                                     |
| Root-skipping built-ins `Explore`, `Plan`                                                  | Confirmed       | Root file absent for both, present for a custom agent; SubagentStart reached both in full                                                                                                                                                                                 |
| Lean Codex launcher for `protocol-inject-*.cjs`                                            | Confirmed       | No-op UserPromptSubmit median 437.5 ms lean vs 811.5 ms full; six-handler PostToolUse p90 1,885 vs 4,736 ms                                                                                                                                                               |
| Codex SubagentStart mirrored                                                               | Confirmed       | Fires; `agent_type` equals the mirrored TOML `name`; matchers honored; 9,500 delivered                                                                                                                                                                                    |
| OpenCode bridge `read` filter                                                              | Confirmed       | Without it, six serial early-exit spawns cost 2,937.6 ms median (5,950.1 p90) on every non-SKILL `read`                                                                                                                                                                   |
| **Codex PostToolUse shell mapping**                                                        | **Changed: ON** | With no `$` in the prompt, the model loaded the skill through the shell (`Get-Content -Raw …/SKILL.md`, tool name `Bash`), and UserPromptSubmit carried nothing for that load. The early exit matches `SKILL.md` **anywhere** in `tool_input.command`, not a `cat` prefix |

Further facts written into the spec as decided behaviour:

- **Claude needs both registrations.** A typed `/skill` fires only UserPromptExpansion; a model-invoked skill fires only PostToolUse `Skill`.
- **Claude re-fires UserPromptSubmit** each time a background sub-agent returns. The per-session ledger is therefore required, not an optimisation.
- **OpenCode names the skill in `tool_input.name`**, where Claude uses `tool_input.skill`. Delivery reads both.
- **Codex sub-agents inherit `AGENTS.md`** (checked in the forked rollout; the model's own report said otherwise). The root-skipping rule is therefore needed on Claude only.
- **Codex did not truncate a 12,066-byte SKILL.md** at 8,000 bytes on an explicit injection. No size cut forces a tag onto the Codex inline list.
- **Claude `"if": "Read(**/SKILL.md)"`** matched a Windows path. Across 36 non-SKILL reads it started 0 group processes, and the six groups' extra Read cost fell within noise (median 375 ms vs 326 ms baseline; 659 ms without `if`).
- **Codex trust.** A project-layer hook runs only after the project is trusted in the user config layer and the hook's `currentHash` is stored. A new or changed protocol handler is therefore skipped silently until the user reviews it in `/hooks`, and guides are the path until then. Existing handlers must render byte-identically so their trust holds.
- **OpenCode UserPromptSubmit (confirmation run: out of scope; corrected 2026-10-01).** On OpenCode 1.18.31 the bridge's context part without `id`, `sessionID` and `messageID` failed the turn, so the confirmation run kept UserPromptSubmit out of scope and the protocol load paths on OpenCode were the `skill` tool and `read` only. The final model differs: the generated bridge delivers UserPromptSubmit context through `chat.message` as a synthetic text part that carries those three fields, so the universal bundle reaches the main session on its first prompt. **Sub-agent delivery on OpenCode is UNVERIFIED.** The bridge has no `SubagentStart` mapping; a delegated (child) session receives the bundle only when OpenCode fires `chat.message` for that child's first message, and no run of OpenCode has observed a Task-tool child. Treat OpenCode sub-agents as possibly without the universal rules until that run is made.

### Per-event, per-host cost budget (BR-PDL-09)

The budget is the added wall time of all protocol entries on one event, measured through the host's real invocation path. For a non-matching event: at most one bare host-path spawn per registered entry, plus 10 ms each.

Reference baselines from the loaded confirmation machine (medians):

| Host                                                    | Baseline |
| ------------------------------------------------------- | -------: |
| Claude, bare `node -e 0` spawn                          |  56.8 ms |
| Codex no-op through the lean launcher, UserPromptSubmit | 437.5 ms |
| Codex no-op through the lean launcher, PostToolUse      |   581 ms |

Codex starts one event's handlers together. OpenCode runs them one after another, which is why its filter matters most.

Tests assert only the deterministic parts: no project module loaded on an early exit, 0 processes for a non-SKILL read, and no git step on the lean launcher.

### Narrowed agent-start injection

`SubagentStart` protocol handlers are registered under one matcher. It lists the frontmatter `name` of every `.claude/agents/*.md` that declares `skills:`, plus `Explore` and `Plan`. A preloading agent receives its converted skills' protocols. `Explore` and `Plan` receive the universal group only. The cost bound (PF-9) is the matcher itself: agent types off the list start no protocol process. Codex mirrors the handler with the same list.

### Stop rule (Q-F), as applied

Conversion proceeds per load path that delivers. If every Codex path had failed, the Codex mirror would have kept full text for every tag. If a Claude path had failed, release C would have paused for owner review. Neither happened.

## Consequences

**Positive**

- A converted skill carries one line per protocol instead of the body, and each protocol is paid for once per session per scope, not once per skill load.
- A guide entry keeps every protocol reachable on every host, including a host that runs no hooks.
- One owner holds the text: the canonical source feeds the published projection, the delivery, the full-text carriers and the Codex mirror.

**Negative / accepted costs**

- The six entry files add six hooks to the inventory. Every registered event pays a guarded early exit.
- With the shell mapping ON, every Codex shell command starts six early-exit protocol handlers. On the confirmation machine that cost about 1.5 s median per shell call (1,488 ms), within the per-event budget but real. It is the price of covering implicit skill loads on Codex.
- A new or changed protocol handler needs a user `/hooks` review on Codex before it runs. Until then Codex users read protocols by path.
- Review-family skills stay large. Their savings come from mode sections at point of use (`why-review` full mode, the fix loops, the reviewer injection template), not from delivery.
- An unwritable ledger can deliver a protocol twice. A duplicate is accepted over silence.
- The compliance gate is a manual before/after review score. The automated suites prove delivery, not compliance.

## Alternatives Considered

The report's options for protocol duplication (§6.6) and their dispositions (`option-coverage.md` §6.6/§6.12):

| Option                                            | Disposition                                                   | Reason                                                                                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F1** status quo (full inline copies everywhere) | Rejected                                                      | 51% duplication on every load, growing with every skill                                                                                                     |
| **F2** hook delivery once per session             | Adopted, for every skill except the four review-family skills | Full text in context without a read; the guide entry is the fallback for any miss                                                                           |
| **F3** compress canonical bodies                  | Adopted                                                       | Target ≤ 9,000 chars per tag (the reviewer injection template excepted); rule-by-rule parity review                                                         |
| **F4** only the protocols a skill needs           | Conditional                                                   | Runs only if delivered protocol text is still a top-three cost after de-dup; prunes only tags no mode of the skill uses, because the hook has no mode input |
| **F5** mode-only protocols at point of use        | Adopted                                                       | `why-review` full mode, the fix loops, the reviewer injection template; every SYNC body stays in the review skills' `SKILL.md`                              |
| **F6** per-host generation                        | Adopted in part                                               | A Codex inline list, empty by decision; its divergence is bounded to a tag list pinned by a mirror parity test                                              |
| **F7** root file carries universal rules          | Adopted first                                                 | The four root-carried tags leave the skills; the universal group covers projects and agents without the root file                                           |

Alternatives for the review-family capacity problem (R2-01):

- **More bins per group** (for example 12 × 9,500 for the review group). Rejected. Each bin is another handler per event, doubling the per-event cost on every host, and the largest skill would still need 13 bins. It also moves the problem rather than solving it: the next large skill needs more bins again.
- **Accept pointer overflow.** Rejected. The five skills would get most of their protocols as "read these" paths, which is the indirection the old policy measured as a compliance loss, and on the skills that gate every commit.

Alternatives for the record itself:

- **Change the policy text only.** Rejected. It loses the rationale trail, so the next maintainer who meets the old reason ("never reference by path") has no record of why it was reversed.
- **Record the agent-start reversal only in the hook docs.** Rejected. The design reason and its cost bound would live nowhere auditable.

## Revisit triggers

- **Plugin packaging (E5).** A packaged plugin changes how skills and hooks load and may change which load paths exist.
- **A Codex cap change.** A different `additionalContextLimit` ceiling, estimate or explicit-injection cut changes the Codex inline list decision.
- **Claude evaluating `if` on SubagentStart.** A tool-style filter there could replace the narrowed matcher.
- **Codex offering a per-handler tool filter.** That would remove the six early-exit starts per shell command.
- **A review-family skill falling under the capacity.** If compression and mode sections bring a review-family skill's SYNC text well under 57,000 characters, it can move off the inline list.

## Implementation Notes

- Group data and inline list: `.claude/skills/shared/protocol-groups.json`. Published text: `.claude/skills/shared/protocols/<tag>.md` plus `index.json`, built by `.claude/scripts/build-protocol-projection.cjs`, with a freshness check in the existing `scripts-tests` sync stage.
- Delivery lib: `.claude/hooks/lib/protocol-delivery.cjs`. Entry files: `.claude/hooks/protocol-inject-<group>.cjs`. Ledger store: `<project>/tmp/protocol-delivery`.
- Registration: `.claude/settings.json`. Codex generator: `.claude/scripts/codex/sync-hooks.mjs` (lean launcher, remapped UserPromptExpansion, shell mapping, SubagentStart). OpenCode generator: `.claude/scripts/opencode/sync-hooks.mjs` (bridge `if` check). Codex inline list: `.claude/scripts/codex/migrate-claude-to-codex.mjs`.
- Guide tooling: `.claude/scripts/sync-update-blocks.py` guide mode. It never touches agents, `inlineSkills` or `references/*.md`.

## Amendment (2026-09-29): leaf reviewer agents carry no review-loop orchestration

Decision 3 ("agents keep full protocol text") is narrowed, not reversed. An agent still carries in full every protocol it applies. It no longer carries protocols that only the orchestrating review skill executes: `review-protocol-injection`, `systematic-review-batching`, `double-round-trip-review`, `fresh-context-review` and `review-policy` join `EXCLUDED_ORCHESTRATION` in `.claude/scripts/agent_protocol_matrix.py`. That applies the matrix's existing rule (orchestration does not propagate to a headless leaf) to the review loop.

- **Why:** a measured external review run spent most of its tokens on standing context in fifteen sub-agents. `code-reviewer.md` alone was about 42k tokens, 87% synced protocol text, including the full reviewer-prompt template that every orchestrated brief already embeds. The exclusion cuts about 11k tokens per `code-reviewer` spawn and 2–10k per other reviewer agent. It also removes instructions that told a leaf to batch, loop and spawn reviewers it must not; on Claude, where `code-reviewer` still preloads `code-quality-review`, that skill's leaf-reviewer boundary says the same.
- **What stays:** the orchestrating skills (`changes-review`, `workflow-review-changes` and the other review skills) keep these bodies inline. An orchestrated review brief embeds the reviewer template, whose Reference Docs section now asks only for the docs resolved for that lane. A `code-reviewer` dispatched without it (for example from `fix` or `feature-implement`) still holds the template's leaf rules on every harness: it carries each as its own block, including `behavioral-delta-matrix` and `spec-tests-code-triangulation`, which only the template used to deliver. On Claude its preloaded `code-quality-review` skill also carries the template inline; that preload is kept on purpose. Codex and OpenCode render the preload as a pointer, so no rule depends on it.
- **Guard:** `review-lanes.test.cjs` (TC-RL-003) plus the matrix's orchestration-leak validation.
- **Related addition:** the whole-diff correctness lane (`SYNC:whole-diff-correctness`). Its history, comment and instruction lenses and its anchored 0–100 confidence scale are adapted from Anthropic's `code-review` plugin (claude-plugins-official, Apache-2.0), rewritten as intent-level guidance. No host-native reviewer is required, so the lane runs on any harness.

## Related

- `docs/specs/ContextDelivery/README.ProtocolDelivery.md`: BR-PDL-01…15 and TC-PDL-001…084.
- `plans/260924-1548-framework-lean-guided-refactor/goal.md`: D-1, SC-2, SC-4, SC-8.
- `plans/260924-1548-framework-lean-guided-refactor/option-coverage.md`: §6.6 and §6.12.
- `docs/adr/0003-config-driven-doc-and-spec-roots.md`: sibling precedent for reversing an unrecorded convention on the record.

## Amendment (2026-09-30): `code-reviewer` and `architect` carry no skill preload

The 2026-09-29 amendment kept `code-reviewer`'s `code-quality-review` preload on purpose. That is reversed, and `architect`'s `security-audit` and `performance-review` preloads go with it. Decision 3 stands: an agent still carries in full every protocol it applies.

- **Why:** a preload injects the whole skill body (about 173 KB for `code-quality-review`, 152 KB for the two architect skills) into every spawn, including spawns whose brief runs a different skill (whole-target `why-review`, `domain-entities-review`, `production-readiness-review`, `architecture-review`). The review wave already runs `security-audit` and `performance-review` in their own specialists. The preload was the largest single per-spawn cost in a review round.
- **Why it is standalone-safe:** the leaf rules each agent applies are agent-owned blocks in `AGENT_QUALITY_BLOCKS` (`.claude/scripts/agent_protocol_matrix.py`, `code-reviewer` and `architect` rows), so no rule depends on the preload on any host. Codex and OpenCode already rendered the preload as a pointer only. The connected-contract block (`AGENT_SKILL_CONNECTIONS`) is independent of `skills:` frontmatter and still names the skills. Where a brief carries no procedure, the agent loads the skill on demand: `code-reviewer` invokes `code-quality-review` for a plain quality review (Key Rules, "Skill on demand"), and `architect` invokes `security-audit` / `performance-review` only when the brief names them or the user asks for that audit (Workflow step 2). Otherwise it reads, in full and before applying the lenses, the `Architecture-Altitude Performance Review` section of `performance-review` and the design-altitude rule in the `Report-Only Mode` section of `security-audit`, which hold the design-time rules the agent body does not repeat. A wave brief that names no sibling specialist is not a request for a duplicate audit.
- **What changes downstream:** `SubagentStart` protocol delivery filters on agents that preload skills (`skillPreloadingAgents` in the host-mapping test; the registered matcher list in `.claude/settings.json`). Neither agent preloads a skill any more, so neither belongs in that list.

## Amendment (2026-09-30): the four universal protocols live once in the root file; `SubagentStart` has no matcher

> **Superseded in part by the 2026-10-01 amendment.** The root-file carrier, the `Root-carried protocols` pointer line, the `portability.requireUniversalGuides` opt-out and the `subagentFallback` delivery described in the first four bullets no longer exist; the universal rules are hook-delivered only. The `SubagentStart` registration without a matcher, and its cost trade-off, still hold. The text below records the 2026-09-30 decision as it was taken.

Decision 4 is completed, and the narrowed agent-start matcher (section "Narrowed agent-start injection") is removed. Decision 3 stands for every protocol except these four.

- **Universal-4 once in the root.** `project-reference-docs-guide`, `ai-mistake-prevention`, `project-protocol-overlay` and `critical-thinking-mindset` (the `universal` group of `.claude/skills/shared/protocol-groups.json`) are carried by the root instruction file. Every skill and agent holds one generated `Root-carried protocols` pointer line (`sync-update-blocks.py --mode=root-pointer`) and no body, reminder or guide line, so the inline review skills and the agents no longer repeat about 11 KB of identical text per file. The root file states the citation label, and points at `.claude/skills/shared/protocols/project-reference-docs-guide.md` for the exact `referenceDocs` semantics, custom-doc `purpose` routing and repair routes.
- **Who still gets a delivery.** The built-in `Explore` and `Plan` agents skip the root file, so the `universal` hook delivers the group to them. In a project with `portability.requireUniversalGuides: false` the hook also delivers it on every skill load and to every sub-agent start (the `subagentFallback` path), because that project's root file is not guaranteed to carry it.
- **Opt-out pointer and the OpenCode limit.** The generated pointer line tells a reader what to do when the root file does not carry the four rules: "if the root file is absent or does not include them (opt-out projects), read `.claude/skills/shared/protocols/<tag>.md` before you act". That read is the only delivery an OpenCode sub-agent gets in an opt-out project: the OpenCode bridge has no `SubagentStart` mapping (agent start is reported as not available on that host), and the agent mirror no longer carries the four bodies. On Claude and Codex the same project is covered by the `subagentFallback` delivery. Closing the OpenCode gap would mean emitting the four bodies into the OpenCode agent mirrors of opt-out projects or injecting the group from the bridge on a child session's first tool event; neither is built, so an opt-out OpenCode project relies on the agent reading the pointer.
- **Matcher removed.** The 2026-09-30 `code-reviewer` / `architect` amendment left the registered matcher list in place. The matcher is now dropped altogether: all six `protocol-inject-<group>.cjs` handlers are registered on `SubagentStart` for every agent type, on Claude and (derived by the sync) on Codex. A name list cannot cover `general-purpose` or a custom agent in an opt-out project, which are the fallback's targets.
- **Cost trade-off against PF-9.** PF-9 bounded the cost by the matcher: an agent type off the list started no protocol process. Now every sub-agent spawn starts the six handlers; each plans its delivery (agent file, protocol index, delivery ledger) and emits nothing for a group that does not apply to that agent, and the ledger keeps a group already delivered in the session scope from being delivered again. The price is six short-lived Node starts per spawn; it buys one copy of the four protocols instead of one per skill and agent, and correct delivery for opt-out projects.
- **Guard:** `TC-PDL-035` (pointer line, no body), `TC-PDL-018` / `018b` (opt-out skill loads), `TC-PDL-060` (registration admits every skill-preloading agent, `Explore`, `Plan` and `general-purpose`), and `TC-PDL-082` for the policy text in `.claude/docs/development-rules.md`.

## Amendment (2026-10-01): trigger-gated protocols arrive only when their subject is in scope

Decision 3 stands. A protocol whose subject applies to only some work (user-facing visual surfaces, domain-model changes, AI features) carries a `trigger` in `.claude/skills/shared/protocol-groups.json`; `deliveryTriggers` defines it (owner skills, a text `pattern`, a `pathPattern`). `BR-PDL-16` owns the rule.

- **When delivered.** A converted skill that declares a gated protocol receives the full text only when a loaded skill owns the subject, or the event text or the session's recorded prompts match the `pattern`, or the files the session touched (or those prompts) match the `pathPattern`. Otherwise the protocol is neither delivered nor named, no delivery record is written, and the skill's guide line stays the read-by-path fallback.
- **Fail-safe direction.** An unknown trigger name, an unusable pattern or an unreadable context delivers unconditionally; a broken rule never withholds a protocol. A context source that does not exist (no session id, no prompt record, no conversation record file yet) is a readable, empty context: it contributes nothing and the protocol stays withheld. A source that exists but fails to read (for example a locked or corrupt conversation record, or a failing context provider) makes the whole context unreadable and delivers.
- **Keyword list widened (user decision).** The `ui` pattern missed plain wording such as "signup form", "settings page with dark theme" and "navigation menu and sidebar". It now also matches forms, pages, navigation, menus, sidebars, toolbars, themes, dark mode, icons, tooltips, animations and carousels, and the common component and layout nouns (navbar, dropdowns, toasts and snackbars, tables, grids, charts, cards, components, mobile, tab bars, avatars, badges, hero, spinners, skeleton loaders), with word boundaries kept. The `ai-feature` pattern also matches model and vendor wording (GPT and ChatGPT, Copilot, Claude API/SDK/model names, "using/with/via Claude", an agent "using/with/calling" something, model calls/providers/prompts, token budgets, chat/text/LLM completions). Single generic words that fire on all work (agent, model, prompt, completion, test) stay out, and a bare `claude` stays out because every framework path and file name contains it. The alternative of delivering the design protocols on every load was rejected: gating stays closed by default.
- **Trade-off.** A non-UI prompt that contains one of these words (for example "the page size of the export" or "add a column to the users table") delivers the design protocols and costs tokens; a UI prompt that the list misses leaves the guide line as its only path. The widening accepts the first cost to shrink the second.
- **Guard:** the `protocol-delivery.test.cjs` tests "a trigger-gated protocol is delivered in full only when its trigger applies…" and "the shipped ui and ai-feature triggers recognize plain task wording and stay closed for unrelated work"; the unreadable-context case is guarded inside the first of them.

## Amendment (2026-10-01): the universal rules are hook-delivered only; hook-less hosts are unsupported

This amendment supersedes decision 4 and the 2026-09-30 amendment "the four universal protocols live once in the root file". Decision 3 stands.

- **Decision.** The `universal` group holds every framework rule all tasks follow, not four. No file carries them: not the root instruction files, not a skill (the four inline review skills included), not an agent definition. The `Root-carried protocols` pointer line, the `portability.requireUniversalGuides` opt-out, the `CK:UNIVERSAL-GUIDES` sentinel and the generated `CODEX_CONTEXT.md` protocol mirror are removed, together with every generator path that wrote protocol text into `AGENTS.md`, `.codex/CODEX_CONTEXT.md` or a mirrored skill.
- **Delivery.** The group carries an authored `bins` layout (`protocol-groups.json`); `build-protocol-projection.cjs` fails on a tag in no bin, a foreign or repeated tag, or a bin over 9,500 characters. One hook per bin (`protocol-inject-universal-<n>.cjs`) delivers it: on the session's first prompt, again only after about 200,000 tokens of growth since that bin's last delivery or after a compaction, and to every agent type at its start, once per spawn. Dedup uses the session ledger (`convention-ledger.cjs`) with one record per bin and scope. An unusable store or a session without an id delivers without a record: a duplicate is accepted over a miss. Codex and OpenCode register the same steps through their generators.
- **Hook-less hosts are unsupported.** A host that runs no hooks receives no universal rule and no workflow route. The earlier fallbacks (the pointer line, the opt-out path, the static protocol blocks in the mirrors) existed only to serve that case and are not kept. Claude Code, Codex and the OpenCode bridge are the supported hosts.
- **Compaction inside a long run (2026-10-01).** A compaction that no user prompt follows (a long autonomous run, a loop) would leave the main session without the bundle until the person types again, because the prompt hook is the only place re-delivery is evaluated. The four bins are therefore also registered on `SessionStart` with matcher `compact|clear` (never `startup` or `resume`: the first prompt delivers at startup; see the later amendment for `clear`). A compact report replaces the bin's own record in the session ledger and delivers, so the next prompt finds the bundle present and stays silent: one delivery per compaction. Codex mirrors the group through `codexSessionStartMirrors` (its `SessionStart` accepts the `compact` matcher); OpenCode runs the same group from `session.compacted` and injects it as system context. Cost: four more short Node processes per compaction. Guard: `TC-PDL-098` and `TC-PDL-099` (`universal-hook-delivery.test.cjs`).
- **Codex review prerequisite (2026-10-01).** On Codex the universal and overlay handlers (`protocol-inject-universal-<n>.cjs`, `skill-overlay-remind.cjs`) and the workflow route handler are new or changed project-layer handlers: Codex skips each one until the user reviews it in `/hooks` and its hash is stored. Until then a Codex session receives no universal rule and no workflow route. There is no static fallback, because a host without delivering hooks is unsupported. After any sync that changes a handler's rendered command, review the handlers in `/hooks` again.
- **Root file.** `CLAUDE.md` holds project information only (tl;dr line, Doc Lookup, path-scoped rules, development commands, skill activation, the hand-owned `## Project Rules & Context` section). `AGENTS.md` is a projection of those sections; its heading whitelist includes `## Project Rules & Context`.
- **Skill overlay reminder.** A second hook, `skill-overlay-remind.cjs`, reminds the assistant when a skill starts which project overlay files apply to it (at most three lines; once per skill and scope, again after about 100,000 tokens, a compaction or a changed overlay set). It replaces the overlay body injection the universal protocol used to carry.
- **Cost trade-off.** Every first prompt and every sub-agent spawn starts four short Node processes instead of reading a larger root file; a non-matching event still ends at one early exit before any project module loads. The price buys one copy of each rule and a root file that stays small for every adopting project.
- **Guard:** `TC-PDL-085` to `TC-PDL-099` (`universal-hook-delivery.test.cjs`), `TC-PDL-100` to `TC-PDL-109` (`skill-overlay-remind.test.cjs`), `TC-PDL-035` / `036` / `037` / `080` (no carrier holds universal text; bins cover the group), and `BR-PDL-18` / `BR-PDL-19` in the spec.

## Amendment (2026-10-01): `clear` re-delivers the bundle; an unreadable source is reported, never silent

This amendment refines the compaction bullet and the route hook of the amendment above. Decision 3 stands.

- **`/clear` delivers.** The universal bins and the Codex mirror register on `SessionStart` with matcher `compact|clear`. A host that keeps the session id across `/clear` while its conversation record shrinks leaves a delivery record that still says "delivered", so a prompt alone would never re-deliver. A `clear` report is handled exactly like `compact`: the bin's own record is dropped, the bin is delivered, and the new record makes the next prompt silent (one delivery per clear). `startup` and `resume` still deliver nothing. OpenCode has no clear event; its `session.compacted` path is unchanged. Guard: `TC-PDL-110`.
- **Host event order is absorbed by the ledger.** A host may write its `compact_boundary` transcript line after it fires `SessionStart(compact)`; read plainly, that later boundary is newer than the delivery just made and the next prompt would deliver the bundle a second time. A delivery made for a `compact` report therefore carries `expectBoundary` (`universal-delivery.cjs`), and the ledger attributes the first boundary stamped within `BOUNDARY_ATTRIBUTION_MS` (120 seconds) after that delivery to it: the record moves just past the boundary and the expectation is spent (`convention-ledger.cjs` `adoptExpectedBoundary`). A boundary beyond the window, a second boundary after the first was attributed, and any boundary after a `clear` (which writes none) are real compactions and re-deliver; with no boundary the byte re-arm is unchanged. Price: a genuine second compaction inside the window and before the next prompt reads as the same one and re-delivers only at the next boundary or the byte re-arm. Separately, a delivery is stamped no earlier than the latest condensation its own process observed (`convention-ledger.cjs` `deliverOnce`), so concurrent bins that read different clocks do not duplicate on an undated boundary line; `TC-PDL-098` pins that with fixed clocks and `TC-PDL-113` pins the late boundary. A record written while the conversation record did not exist yet counts as zero bytes of growth, so it still re-delivers at the 200,000-token window (`TC-PDL-114`).
- **A source file that cannot be read is reported.** The hooks are the only carriers, so silence on a corrupt shipped file would silently drop the whole route or every universal rule. `workflow-route-inject.cjs` still delivers the mode's gate when the catalog cannot be built, while its catalog output (`workflow-catalog-inject.cjs`) carries one line `workflow catalog unavailable: <reason>; read .claude/workflows.json`; the route output carries one line naming `workflow-first-gate.md` when the gate file itself is unreadable (`ask`, `auto` and `off` semantics are unchanged; `off` reads no file). Bin 1 of the universal bundle prints one line `universal protocols unavailable (<reason>): read the files under .claude/skills/shared/protocols/` when the bundle cannot be rendered at all (unreadable or malformed `protocol-groups.json` or `protocols/index.json`, a missing `protocols/` folder, no readable protocol file); bins 2 to 4 stay silent, the hook exits 0, and no delivery record is written, so the next event retries. A bundle that renders partly is not reported: an unreadable protocol file still drops only that protocol. Guard: `TC-WFR-020`, `TC-WFR-021`, `TC-PDL-111`, `TC-PDL-112`.

## Amendment (2026-10-03): incomplete universal bins are visible and retry

The project-reference reading review demonstrated that losing just one required protocol could remove the reading gate while surviving rules were recorded as complete. The owner approved a short missing-file warning and retry, accepting repeated context only while a bin is damaged. This supersedes the preceding amendment's silent partial-delivery decision; healthy delivery and total-bundle failure behavior remain unchanged.

Each incomplete bin retains readable rules, names unreadable or empty files, forgets its previous complete record and records nothing. Later eligible events retry that bin; complete bins keep their independent records. Repairing the original bytes therefore delivers once even when the pre-damage hash is identical. The payload remains within the existing message bound; oversized damaged bodies use explicit read paths. The shared universal-delivery owner implements this once for all four entries. Guard: BR-PDL-18 and TC-PDL-112, including prior healthy records, whole-bin loss, repeated prompts, compact/clear/delegated starts, empty content and oversized fallback.
- **Trade-off.** One short line, repeated while the file stays broken, replaces silence on a corrupt or merge-conflicted shipped file; the price is one extra message in a broken checkout and none in a healthy one.


## Amendment (2026-10-03): universal re-injection at 100K tokens

The owner requested a shorter reading-protocol injection dedup window. This supersedes the 200,000-token universal delivery interval in the 2026-10-01 amendments. Each of the four bins now re-arms after 100,000 tokens of conversation growth, measured with the existing 22-transcript-bytes-per-token proxy (2,200,000 bytes). The first prompt, compact/clear delivery, per-spawn delivery and independent per-bin records retain their existing behavior.

The shorter window refreshes the reading gate more often during long sessions. Its price is up to twice as many growth-triggered universal deliveries; it does not add a per-prompt delivery. The separate full-document loaded-content reuse horizon and the default per-file convention window remain approximately 200K tokens.

Guard: BR-PDL-18 and TC-PDL-088/095/111/114 in the canonical protocol-delivery spec; `UNIVERSAL_REINJECT_TOKENS` in `.claude/hooks/lib/universal-delivery.cjs` is the single runtime owner. TC-PDL-088 verifies silence one byte below the boundary, delivery at the boundary and silence on a repeat for all four bins.

## Amendment (2026-10-04): review-family entrypoints use guides with full-source fallback

This amendment supersedes the four review-family skill exceptions in Decision 3, its D-1 refinement and later statements retaining those exceptions. The owner approved guide transport for `changes-review`, `code-quality-review`, `why-review` and `workflow-review-changes`; the live registry's `inlineSkills` list is empty. Their entrypoints carry official guides and all role reminders. Hooks deliver the full applicable text; if delivery is absent or overflows, the reviewer reads every applicable unread published source before acting. A guide, tag or pointer never substitutes for consumed full text.

The change reduces repeated entrypoint text while retaining complete review rules. Its accepted cost is the required full-source read when delivery cannot carry the text. Guide transport changes discovery and loading cost, never coverage, validation, severity, material-decision ownership, recursion guards or dispatch obligations. A future full-body skill exception requires an explicit owner decision.

Agents retain their full applicable role protocols. Mode-only references retain their full SYNC bodies and load first on mode entry. Every fresh reviewer prompt still embeds the complete `review-protocol-injection` template, with all eleven full protocol bodies VERBATIM and only its declared placeholders replaced. Universal protocols retain their separate hook-only delivery contract.

Read `.claude/skills/shared/sync-inline-versions.md` → `SYNC:shared-protocol-duplication-policy` when updating transport or carriers; it is the canonical protocol owner. Read `docs/specs/ContextDelivery/README.ProtocolDelivery.md` → BR-PDL-07/11/12/14 when assessing guide fallback, mode loading and full-text retention. These current contracts supersede the historical skill exceptions above; required full text and review gates remain mandatory.


## Amendment (2026-10-07): periodic reminders at 150K tokens

The owner requested 150,000 tokens instead of 100,000 for the universal bundle, core principles, skill overlay discovery and AI-feature routing, including the UI/AI per-class windows. The full prompt content remains available. Periodic delivery intentionally refreshes attention during long work before compaction; the longer interval reduces growth-triggered repetition by one third for sustained conversation growth. This is a frequency decision, not a measured model-quality improvement. First delivery, content-change retry and compact/clear replay retain their existing behavior. Explicit configured intervals remain configurable; the separate approximately 200K full-document credit and generic convention horizon are unchanged.

The existing boundary assertions cover silence one byte below 150K, delivery at the edge and re-arming after compaction. Read the protocol-delivery and per-file convention specs when changing those contracts.
