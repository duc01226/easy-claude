# ADR-0004: Hybrid Protocol Delivery and Narrowed Agent-Start Injection

- **Status:** Accepted
- **Date:** 2026-09-25
- **Plan:** `plans/260924-1548-framework-lean-guided-refactor/phase-21-spec-protocol-delivery.md` (owner decision D-1 in `goal.md`, refined in plan-review round 2 as R2-01; delivery confirmation run in `phase-20-protocol-spike.md`)
- **Spec:** `docs/specs/ContextDelivery/README.ProtocolDelivery.md` (feature code PDL)
- **Supersedes:** None. This ADR reverses two earlier decisions that were never recorded as ADRs: the no-reference duplication policy (`SYNC:shared-protocol-duplication-policy`, `.claude/skills/shared/sync-inline-versions.md:1336`) and the removal of agent-start context injection (`.claude/hooks/tests/test-all-hooks.cjs:649-654`).

## Context

### What the duplication policy bought

Every skill and agent carried each shared protocol it follows as a full inline copy between `SYNC:<tag>` fences. The policy forbade replacing a copy with a file reference: a model told to "read X" often does not, so a rule behind a file read is followed less reliably than a rule already in context. A skill was self-contained. Whatever path loaded it, the model had every rule in front of it.

### What it cost

The copies became the largest part of what the model reads. Shared protocol text is about 51% of all skill bytes, and a skill load pays for every protocol again even when the same session loaded the same protocol a minute earlier through another skill. Adopters measured this as a top token cost, and a second owner concern followed from it: a skill that is half repeated text dilutes the rules specific to that skill. The policy made the protocols reliable to deliver and expensive to carry, and the expense scaled with every new skill.

### Why the original reason no longer binds, and where it still does

The policy's reason was "a file read is skipped; inline text is not". Hook delivery puts the full text in context without asking the model to read anything, so the model gets the same text the inline copy gave it. The file path now exists only as the **fallback** for a missed delivery. Where a delivery can reach a skill only as paths, the original reason still applies in full. That is why the hybrid keeps inline text in exactly those places (the five review-family skills, reference files and agents), and why each converted group is held until a before/after review shows no compliance loss.

### Agent-start injection, removed and now re-added

Agent-start (`SubagentStart`) context injection was removed deliberately. The dispatchers were deleted for Claude/Codex skill parity, and agent guidance moved into the static `SYNC:agent-bootstrap` blocks of each agent file (`.claude/hooks/tests/test-all-hooks.cjs:649-654`). Two facts from this change bring it back in a narrow form:

- The built-in `Explore` and `Plan` agent types start **without** the root instruction file. The confirmation run found `CLAUDE.md` absent from both transcripts and present for a custom agent. Once the four root-carried protocols leave the skills, agent start is the only way those agents receive them.
- Agents that preload skills (`skills:` in their frontmatter) preload the converted skills, which now hold guide entries instead of bodies.

## Decision

### Hybrid delivery (D-1 as refined by R2-01)

1. **Converted skills keep guides.** Each protocol a converted skill follows becomes one guide entry in a `PROTOCOL-GUIDES` block: the tag, a one-line summary, when it applies, and the path of its published text. Its `:reminder` digest stays.
2. **Hooks deliver the full text** once per session per scope. Each of six groups is one entry file and one `additionalContext` string of at most 9,500 characters. Delivery re-arms after compaction and after 4,500,000 bytes of transcript growth (`reinjectAfterBytes`, the value used by `.claude/hooks/workflow-route-inject.cjs:54` and `.claude/hooks/lib/file-conventions.cjs:45-48`).
3. **Inline where hooks cannot carry the load.** The five review-family skills keep every full body (`inlineSkills` in `.claude/skills/shared/protocol-groups.json`). So do all `references/*.md` carriers and all agents.
4. **The root file carries the four universal rules.** They are delivered only to projects with `requireUniversalGuides: false` and to agents that skip the root file.
5. **Never silent.** A miss degrades to read-by-path. An unwritable ledger delivers without de-dup. This deliberately reverses the ledger's shipped "IO failure ⇒ caller skips delivery" (`.claude/hooks/lib/convention-ledger.cjs:176-178`) for protocol delivery. Only a live peer lock on the same record skips.
6. **Compliance gate.** Groups are converted one at a time. A review scored before and after on a fixed diff must not lose any check it passed; a confirmed regression holds the next group for the owner.

### The D-1 refinement: the five review-family skills stay inline

Six bins of 9,500 characters give a hook capacity of **57,000 characters per skill load**. The review-family skills carry more shared protocol text than that:

| Skill                     | SYNC characters |
| ------------------------- | --------------: |
| `changes-review`          |         121,781 |
| `code-review`             |         103,584 |
| `plan-review`             |          79,158 |
| `why-review`              |          76,648 |
| `workflow-review-changes` |          55,176 |

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
- **Out of scope for protocol delivery: OpenCode UserPromptSubmit.** On OpenCode 1.18.31, the bridge's context part without `id`, `sessionID` and `messageID` fails the turn. That fix belongs to the OpenCode hook generator, and the protocol load paths on OpenCode are the `skill` tool and `read` only.

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
| **F2** hook delivery once per session             | Adopted, for every skill except the five review-family skills | Full text in context without a read; the guide entry is the fallback for any miss                                                                           |
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

## Related

- `docs/specs/ContextDelivery/README.ProtocolDelivery.md`: BR-PDL-01…15 and TC-PDL-001…084.
- `plans/260924-1548-framework-lean-guided-refactor/goal.md`: D-1, SC-2, SC-4, SC-8.
- `plans/260924-1548-framework-lean-guided-refactor/option-coverage.md`: §6.6 and §6.12.
- `docs/adr/0003-config-driven-doc-and-spec-roots.md`: sibling precedent for reversing an unrecorded convention on the record.
