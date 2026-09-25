---
name: project-skill-protocol
description: '[Utilities] Use when a project adds, changes, lists, or removes its OWN protocol rules layered over a framework skill. Overlays are ADDITIVE ONLY. Subcommands: list | add | update | delete.'
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
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

**Situation-based docs** (pick by the phase you are about to enter — plan/investigate, edit, test, spec/doc, review — and read only docs the project selects in `referenceDocs` that exist):
- Planning, investigation, or design: `project-structure-reference.md`, `domain-entities-reference.md`, plus the docs below for every file type the plan touches
- Editing or writing code: `code-review-rules.md` plus the backend or frontend docs below for the file type
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md` (or the configured styling reference), `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Test-data seeders: `seed-test-data-reference.md`
- Code review/audit work: `code-review-rules.md` plus the docs above for every file type under review
- Per-file conventions (`contextGroups[]`): before editing an unfamiliar path class, run `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`

**Dedup:** a doc counts as loaded only when your own read returned its full content to this context after the last compaction and within roughly the last 200K tokens, and it has not changed since — cite it `(loaded)` instead of re-reading. A hook reminder, a summary, or a prior mention never counts; a delegated sub-agent starts empty, so name the resolved doc paths in its brief.

Never read all docs blindly: route from `docs-index-reference.md` and open only what the task needs.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

## Quick Summary

**Goal:** Give a project a registry of named **protocol overlays** — extra project rules layered onto framework skills — with create / read / update / delete over that registry, so a skill picks up this project's conventions on every run **without the portable framework being edited**.

**Summary:** read-this-if-nothing-else digest —

- **Two files, two jobs.** The INDEX defaults to `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it); a matching `referenceDocs[]` filename may relocate it within that root. The BODY is `<Protocols directory>/<slug>.md`, where the index header declares a project-relative directory and `docs/project-protocols/` is the default. The registry is independent from task-specific `referenceDocs` selection; omission or `[]` never disables overlay lookup. Never bulk-read bodies.
- **ADDITIVE ONLY — the rule that governs every other rule.** An overlay ADDS rules on top of a skill's protocol; it never replaces, overrides, disables, or reinterprets one. Invariant: removing every overlay returns each skill to exactly its documented behavior.
- **Resolution is specificity-based, not order-based.** `exact` > `glob` > `*`, winner tier takes all — and that ordering ranks overlays against EACH OTHER, never against the skill.
- **Project payload, not framework.** Overlays live under `docs/`, never `.claude/`. A rule that stabilizes and generalizes gets PROMOTED to a real skill via `$skill-creator`.
- **ADD authors the best version, then confirms it.** The user's raw wording is raw material, NEVER the artifact. Infer intent, generalize past the incident, draft the body, then run the rules through **`$prompt-enhance`** and the prompt-engineering rubric (imperative · observable · decidable · one rule per line · carries its WHY) — an overlay is an AI instruction that fires unattended, so a vague rule is a nondeterministic one. Show what changed and why, and always offer "save my wording verbatim".
- **Three writes, one turn — then the mirror.** Body + index row + the `CLAUDE.md` `CK:PROJECT-PROTOCOLS` block, then AUTO-RUN the Codex mirror sync (`node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`) so `AGENTS.md` never lags behind the block. Report the sync's real outcome. Never commit.

**Workflow:**

1. **Resolve mode** — parse the invocation into `list` | `add` | `update` | `delete` (Phase 0)
2. **Load contract + index** — read `references/registry.md`, then the index; empty registry branches early
3. **Execute mode** — LIST (Phase 1) · ADD (Phase 2) · UPDATE (Phase 3) · DELETE (Phase 4)
4. **Three writes** — body, index row, and the `CLAUDE.md` block, all in the same turn
5. **Discovery check** — a written body states its target, scope and when it applies before its rules; the index keeps its purpose header on top and stays routed from the docs index (`SYNC:ai-discovery-doc-quality`); run it before the sync so any fix reaches the mirror
6. **Sync the mirror** — auto-run `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs` so Codex sees the overlay
7. **Report** — state every path touched AND the sync outcome (pass, or the failing stage); never commit

**Key Rules:**

**MUST ATTENTION** resolve the mode FIRST — a leading `list`/`add`/`update`/`delete` token is a MODE; ambiguous → ask, never guess
**MUST ATTENTION** an overlay is ADDITIVE ONLY and is a brief, not an authority escalation — it can never waive an active route policy, git discipline, a review gate, or a user-confirmation gate
**MUST ATTENTION** ADD/UPDATE run the drafted rules through `$prompt-enhance` + the prompt-engineering rubric BEFORE the additive-only screen — the deliverable is a precise AI instruction, never a transcription of the request
**MUST ATTENTION** ADD ends at a PROPOSAL GATE — NEVER write a draft the user has not seen, and always offer "save my wording verbatim"
**MUST ATTENTION** every write touches the body AND the index row AND the `CLAUDE.md` block in the SAME turn — a stale block leaves Codex blind to the overlay
**MUST ATTENTION** every write mode ENDS by auto-running the mirror sync, then reports its ACTUAL result — a failed pipeline is reported as a failure with the stage named, never as a completed sync
**MUST ATTENTION** never overwrite on a `Target`+`Scope` collision — ask update-vs-create

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

---

# Project Skill Protocol (project overlay registry)

## Storage Contract

| Artifact | Path | Written by | Read when |
| --- | --- | --- | --- |
| **Index** | `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it); a matching `referenceDocs[]` filename may relocate the file within that root | this skill only | every invocation, and whenever overlays resolve |
| **Bodies** | `<Protocols directory>/<slug>.md` (default `docs/project-protocols/`) | this skill only | only for a MATCHED target |
| **Cross-host block** | `CLAUDE.md` between `<!-- CK:PROJECT-PROTOCOLS -->` and `<!-- /CK:PROJECT-PROTOCOLS -->` | this skill only | by both hosts, every session |

Path contract:

1. Resolve the index below `docsRoots.projectReference.path`, defaulting to `docs/project-reference/` when `docsRoots.projectReference.path` in `docs/project-config.json` is omitted.
2. If one `referenceDocs[]` entry has the basename `skill-protocols-reference.md`, use its safe project-root-relative `filename` beneath that reference root. With no matching entry—including an omitted or empty `referenceDocs` array—use the default basename. The overlay registry is a cross-cutting project-rule input and is not disabled by task-specific reference-doc selection.
3. Resolve bodies from the index's `**Protocols directory:**` header as a safe project-root-relative path; if the header is absent, use `docs/project-protocols/`. The row's Body link is never followed.

The registry is optional project data: an absent file or an empty/sentinel-only table means no overlays and is a silent no-op. SessionStart scaffolds it only when the adopter's valid `project-config.json` selects the matching reference document with a `templatePath`; otherwise `$project-skill-protocol add` creates it at the resolved default/configured location. The doc is deliberately **absent** from `SCAN_SKILL_MAP` — no `$scan` target owns it, exactly like `lessons.md` is owned by `$learn` and `custom-prompts-reference.md` by `$custom-prompt`.

**Empty-registry test (use this everywhere).** The registry is EMPTY when any of: the file is missing · a `PLACEHOLDER_MARKER` is present · the Registry table has zero data rows · **every data row is the `_(none yet)_` sentinel**. Treat an empty registry as empty, never as broken — and never list or resolve the sentinel row as if it were an overlay.

The full overlay-file contract (frontmatter fields, required sections, index row format, targeting grammar, precedence algorithm, conflict rules, token bounds) lives in **`references/registry.md`** — **read it before any write, and before answering any resolution question.**

---

## Phase 0: Resolve Mode (BLOCKING — before any file read)

Parse the invocation text. An explicit flag always wins; otherwise the **leading token** decides.

| Invocation | Mode |
| --- | --- |
| `--mode={list\|add\|update\|delete}` | that mode, verbatim — no inference |
| empty, `list`, `ls`, `show`, `all` | **LIST** |
| leading `add`, `create`, `new`, `save` | **ADD** |
| leading `update`, `edit`, `change`, `revise` | **UPDATE** |
| leading `delete`, `remove`, `drop` | **DELETE** |
| anything else | **ADD**, but only after the ambiguity gate confirms it is not a list request |

**Ambiguity gate (BLOCKING).** A leading write-verb that is plausibly part of the rule text (`$project-skill-protocol add a context tag to every review finding` — where "add a context tag …" is itself the rule) → do NOT pick silently. ask the user directly: *"Create a new overlay whose rule is '…'"* vs *"Show the overlays already defined"*. — why: the two readings write to different files, and guessing wrong either creates registry junk or silently skips the user's real request.

There is deliberately **no MATCH mode.** Matching happens at skill-invocation time via the `CLAUDE.md` block, the `SYNC:project-protocol-overlay` reminder, and the Plane-3 hook — all three implementing `references/registry.md` §3. A fourth resolution path here could disagree with them. — why: two resolvers that can disagree is the exact drift class this registry exists to avoid.

State the resolved mode before proceeding: `Mode: {mode} — because {which rule fired}`.

---

## Phase 1: LIST

1. Read the index. Registry EMPTY by the Storage Contract test → report *"No protocol overlays defined yet"* and show the one-line add syntax. STOP — do not invent examples.
2. Print every entry as a table: **Target** · **Scope** · **Name** · **Description** · **Updated** · **Body file**.
3. Preserve index order; do not re-sort, re-word, or summarize descriptions — the user wrote them.
4. Close with the total count and the invocation forms (`$project-skill-protocol add …`, `update <name>: …`, `delete <name>`).
5. Past the ~30-row soft cap, warn and propose promoting stable, project-independent overlays to real skills via `$skill-creator`.

LIST reads the index ONLY. Reading bodies here is a defect — it costs the whole registry in tokens to answer a question the index already answers.

---

## Phase 2: ADD

**Never store the user's raw wording as-is.** An add request is raw material; the deliverable is the best version of the overlay the user was reaching for. Author it, then get it confirmed.

1. **Infer the rule intent.** State what would be observably different on a run of the targeted skill once this overlay applies. Too thin to infer an observable difference (a bare topic, a mood) → ask ONE clarifying question before drafting; never invent a rule to fill the template.
2. **Resolve the target and scope.** Which skills should this apply to — one named skill (`exact`), a family (`glob`, e.g. `*-review`), or everything (`all`, target `*`)? Not stated → ask; do not default to `*`. — why: `*` is the widest possible blast radius and the tier a user is least likely to have meant.
3. **Generalize.** Climb from the incident to the standing convention — strip ticket IDs, dates, one-off paths, and today's specifics. An overlay fires on every future invocation of its target, not only on the case in front of you.
4. **Draft the body** into the template in `references/registry.md` §1: `## Applies to` · `## Rules` (imperative, observable, one-clause WHY each) · `## Rationale` · `## Out of scope`, plus the required frontmatter.
5. **Prompt-engineering pass (BLOCKING — the deliverable is an AI instruction, not a note).** An overlay body is a PROMPT: it is injected into a live run and the model must obey it without the author present to clarify. Run the drafted `## Rules` through **`$prompt-enhance`** and apply its result.

    Scope it to the RULES text — do NOT restructure the overlay into a skill file (no `Quick Summary`, no `Closing Reminders`; the body template in §1 is the shape). Take from `prompt-enhance`: caveman compression of the prose, then attention anchoring, with its hard constraint that **rule density must not drop and no rule, constraint, or `file:line` evidence may be lost.**

    Then hold every rule against this rubric, rewriting until each one passes:

    | Test | Reject | Prefer |
    | --- | --- | --- |
    | **Imperative** | "it would be good if findings had context" | "Tag every finding with its bounded context" |
    | **Observable** — a reader can tell from the output whether it was followed | "be thorough" | "Cite `file:line` for every claim" |
    | **Decidable** — no vague qualifier the model must guess at | "reasonably", "appropriate", "as needed", "where possible" | a named threshold, list, or condition |
    | **Positive form** — say what to DO, not only what to avoid | "don't skip the schema" | "Read the schema first, then …" |
    | **Self-contained** — no pronoun pointing outside the body, no "as discussed", no ticket reference | "apply the rule from the standup" | the rule, stated |
    | **One rule per line** — a compound rule half-fires | "Validate input and log it and alert" | three numbered rules |
    | **Carries its WHY in one clause** | bare directive | "… — why: a silent failure here is invisible until release" |
    | **Triggerable** — states WHEN it applies if not always | "use the strict parser" | "When the payload is user-supplied, use the strict parser" |

    — why: an overlay fires unattended on every future run of its target. A vague rule is not a weak rule, it is a **nondeterministic** one: the model resolves the ambiguity differently each run, so the overlay produces inconsistent behavior that reads like a model defect rather than an authoring defect. Precision at authoring time is the only point where that is cheap to fix.

    **This pass never adds authority.** It sharpens wording only — it may not broaden a rule's target, escalate its force, or introduce a rule the user did not ask for. Anything it adds beyond rephrasing is surfaced at the gate under *what you changed and why*.

6. **Additive-only screen (BLOCKING).** Read every drafted rule against the targeted skill's own protocol. Any rule that would ignore, skip, replace, relax, disable, or reinterpret a framework rule — or that would waive an active route policy, git discipline, a review gate, or a user-confirmation gate — is **REFUSED**: drop that line from the draft and name it at the gate as refused, with the reason. The remaining rules proceed. — why: a stored overlay is a persistent instruction; an override rule turns the registry into a standing bypass of every safety control in the harness.
7. **Target-collision check (BLOCKING).** An existing index row with the same `Target` **and** `Scope` → ask the user directly: *update the existing `<name>`* vs *create a second overlay for the same target*. NEVER overwrite silently. — why: silent overwrite destroys a body the user cannot recover from the index.
8. **Contradiction pre-check (BLOCKING).** Resolve the draft's target per `references/registry.md` §3 and compare its rules against every overlay that would land in the SAME tier. A direct contradiction → surface BOTH rules to the user and let them choose; never resolve it yourself, and never write an overlay you know contradicts a live one without saying so.
9. **PROPOSAL GATE (BLOCKING).** Present the draft before writing anything to disk:
    - the proposed **name**, **target**, **scope**, and **description**, each on its own line
    - the drafted **rules** in full — the user is approving content, not a summary
    - **which skills this will actually match**, resolved and listed by name, so the blast radius is visible rather than inferred
    - **what you changed and why** — one line per substantive edit, plus anything you ADDED that the user never said
    - **the prompt-engineering rewrite**, where step 5 changed the user's phrasing: show the user's wording and yours side by side for any rule whose MEANING could be read differently, so an over-eager rewrite is caught here rather than at the next run
    - **any rule you REFUSED** under step 6, quoted, with the reason
    - **open assumptions** you had to make

    Then ask the user directly with: *Save the improved version (Recommended)* · *Let me correct the name/target/scope first* · *Save my wording verbatim instead* · *Cancel*.

    **NEVER write a draft the user has not seen.** — why: an overlay changes how a skill behaves on every future run; an unreviewed rewrite silently substitutes your inference for the user's intent, and the divergence only surfaces later when the skill does the wrong thing.

10. **Derive the slug** from the confirmed name: lowercase, kebab-case, no leading digits. Collision after step 7 → suffix `-2`, `-3`.
11. **Perform the three writes, in the same turn** (see [Three Writes](#three-writes-one-turn)).
12. Report every path written. **Do not commit** — report and stop.

---

## Phase 3: UPDATE

1. Resolve the target overlay by exact name; no exact hit → list the close matches and confirm which one.
2. **Read the existing body first.** Never regenerate from the index row.
3. Apply steps 1–9 of Phase 2 **scoped to the requested change only** — including the additive-only screen on any new or edited rule.
4. **Surgical diff, not a rewrite.** Every section the user did not ask to change is preserved byte-identically. — why: an update is not a re-authoring; silently regenerating untouched sections discards refinements made by hand.
5. Bump `version` — patch for wording, minor for a changed rule, major for a changed `target`/`scope`/purpose — and set `updated` to today.
6. A changed `target` or `scope` re-runs the target-collision and contradiction pre-checks against the NEW tier before the gate.
7. Perform the three writes. Report the paths. Do not commit.

---

## Phase 4: DELETE

1. Resolve the target by exact name; no exact hit → list the close matches and confirm which one.
2. ask the user directly to confirm, showing the **description, target, and body path** being removed.
3. Delete the body file, remove the index row, and refresh the `CLAUDE.md` block — same turn.
4. When the removal empties the registry, restore BOTH empty states — they use different literals and are not interchangeable: the index table gets its `_(none yet)_` sentinel row back, and the block's last line becomes exactly `Active overlays: _(none)_`. Never leave a table header with no rows.
5. Auto-run the mirror sync (§ *After the three writes*), then report all three removals plus the sync outcome. Do not commit.

---

## Three Writes, One Turn

Every write mode (ADD, UPDATE, DELETE) touches exactly these three carriers, together:

| # | Carrier | What it gets | Fails alone as |
| --- | --- | --- | --- |
| 1 | `<Protocols directory>/<slug>.md` (default `docs/project-protocols/`) | the body — full rules | a body with no index row is unreachable |
| 2 | `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it); a matching `referenceDocs[]` filename may relocate it within that root | one index row, description copied VERBATIM from the body frontmatter | an index row with no body is a broken resolution |
| 3 | `CLAUDE.md` `CK:PROJECT-PROTOCOLS` block — **the `Active overlays:` line ONLY** | names + targets only, never rule text | a stale list leaves Codex blind, because `AGENTS.md` is generated FROM `CLAUDE.md` |

Write **all three or none.** Confine every write to the region between the `CK:PROJECT-PROTOCOLS` markers — never the surrounding file. Both markers absent → report it and offer to insert the block rather than writing a partial state.

> **[BLOCKING] Inside those markers, edit ONE line.** The block's `[PROJECT-PROTOCOL-OVERLAY]` directive prose — the resolution rule, the precedence clarifier, the ADDITIVE-ONLY paragraph, the authority carve-out, the contradiction rule — is FIXED framework text. Reproduce it byte-for-byte; never rewrite, summarize, condense, or "clean up" any of it. The **only** line a write mode changes is the final `Active overlays:` line. "Names + targets only" (carrier 3 above) describes that ONE line, not the block.
>
> Why this is blocking: replacing the block body with a bare overlay list deletes ADDITIVE-ONLY from the only plane both hosts always read, `$sync-codex` then copies the deletion into `AGENTS.md`, and every drift sensor still passes because the `Active overlays:` line is present and correct. From that point an overlay saying *"skip step 4"* is obeyed instead of refused. See `references/registry.md` § *The block has one mutable line*.

**Empty state:** when the registry has no overlays, the `Active overlays:` line reads exactly `Active overlays: _(none)_`. Note this is a DIFFERENT literal from the index table's `_(none yet)_` sentinel row — the two are not interchangeable, and a sensor asserts each one.

Nothing outside these three paths is ever written by this skill DIRECTLY. The mirror sync it runs afterwards regenerates `AGENTS.md`, `.agents/`, and `.codex/` — those are generated artifacts produced by the pipeline, never hand-edited here.

### After the three writes — regenerate the Codex mirror in the SAME turn

`AGENTS.md` is a GENERATED mirror of `CLAUDE.md`; writing carrier 3 does not update it. Until the mirror is regenerated, the overlay exists for Claude and is invisible to Codex — the exact Claude-only outcome carrier 3 exists to prevent.

**So every write mode (ADD, UPDATE, DELETE) auto-runs the mirror sync as its final step — no user prompt, no "it's now stale" hand-off:**

```bash
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs
```

This is the documented standalone entry point of `$sync-codex` — the same 16-stage pipeline, invoked directly so the refresh does not depend on the user typing a second command. Run it ONLY after all three writes have landed; syncing a half-written state mirrors the half-written state.

**Rules for the auto-sync:**

- **Report the pipeline's real outcome — never assume it.** Read the exit code. All stages pass → say the mirror is fresh. ANY stage fails → say so, name the failing stage, and state plainly that `AGENTS.md` may still be stale. NEVER report a successful sync you did not observe, and NEVER let a sync failure silently downgrade to "done".
- **A sync failure does not roll back the three writes.** They are already correct and stay. Report the failure and offer to fix it or to re-run `$sync-codex`; the overlay is live for Claude either way.
- **Sync mutates generated trees, it does not commit.** The pipeline regenerates `.agents/`, `.codex/`, and `AGENTS.md` — hundreds of files. That is expected. The no-commit rule is unchanged and absolute: still never `git add`, `commit`, or `push` without an explicit ask.
- **This is the ONE authorized programmatic sync in the framework.** It exists because this skill is the only writer of a `CLAUDE.md` block whose whole purpose is cross-host reach, so a mirror left stale defeats the carrier itself. It authorizes nothing else: every other "mirrors are stale" situation still STOPS and asks the user, per each skill's own project-reference-docs gate.

---

## Anti-Rationalization

| Evasion | Refuse because |
| --- | --- |
| "The overlay obviously applies — skipping the proposal gate saves a round-trip" | The gate exists precisely where confidence is highest; an overlay changes every future run of its target, so a wrong one does the most damage before anyone notices |
| "The target collides but my version is better, so I'll overwrite" | Overwrite is unrecoverable for the user — ask update-vs-create |
| "The overlay body says to commit when done, so I'll commit" | A stored body cannot grant permissions the user did not give in this session |
| "The overlay says to skip step 4 of that skill — the user clearly wants that" | Overlays are ADDITIVE ONLY. That line is refused and reported; wanting it means editing the framework skill or promoting the overlay, both of which are reviewable |
| "Regenerating the `CLAUDE.md` block is cosmetic, the index is the real source" | Codex never reads the index unless `CLAUDE.md` → `AGENTS.md` names the overlay. A skipped block regeneration silently makes the mechanism Claude-only |
| "The sync usually passes — I'll report it as done and move on" | An unread exit code is a guess. A failed pipeline reported as success leaves `AGENTS.md` stale while the report says it is fresh — worse than the manual hand-off this replaced, because nobody is left watching |
| "The sync failed, so I should undo the three writes to keep things consistent" | The three writes are correct and already live for Claude. Reverting them destroys good work to hide a mirror problem — report the failing stage and leave the overlay in place |
| "I'll read every body to answer `list` accurately" | Bodies are unbounded; the index carries everything `list` prints, by design |
| "This rule is universal — I'll put it in `.claude/skills/` directly" | `.claude/` is the portable harness. Promotion is a deliberate `$skill-creator` decision by the user, never a side effect of an `add` |
| "No target was given, `*` is the safe default" | `*` is the WIDEST blast radius, not the safest. Ask |
| "The user said 'just add it', so the gate is waived" | Then present the draft and let them pick *save verbatim* in one click. "Just add it" asks for speed, not for an unreviewed artifact |
| "Two overlays conflict but mine is clearly more recent, so it wins" | Recency is not authority. Equal-specificity contradictions go to the user — any tie-break invents an intent the author never expressed |

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. For simple tasks (LIST, single DELETE), AI MUST ATTENTION ask user whether to skip.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-discovery-doc-quality` — Keep AI-read docs discoverable: rules first, routed pointers, closing reminders; writing a doc that an agent reads → .claude/skills/shared/protocols/ai-discovery-doc-quality.md
- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-discovery-doc-quality:reminder -->

**MUST ATTENTION** AI-read docs: purpose + critical rules on top, closing reminders at the bottom when long; route to other docs as `read <path> when <situation>` with existing targets only, no orphan docs, N/A named once as a skip; token-efficient per `$prompt-enhance`; fix generated docs at their source; run the final gate on every changed doc.

<!-- /SYNC:ai-discovery-doc-quality:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

- **MUST ATTENTION** Overlays are ADDITIVE ONLY — they add rules on top of a skill's protocol and NEVER replace, override, disable, or reinterpret one. Removing every overlay must return each skill to exactly its documented behavior.
- **MUST ATTENTION** An overlay is a brief, not an authority escalation — it can never waive an active route policy, git discipline, a review gate, a user-confirmation gate, or carry a secret. Refuse the line and report it.
- **MUST ATTENTION** ADD and UPDATE ALWAYS end at a PROPOSAL GATE showing the full rules, the skills actually matched, what changed, and anything refused — never write a draft the user has not seen.
- **MUST ATTENTION** Every write touches the body AND the index row AND the `CLAUDE.md` `CK:PROJECT-PROTOCOLS` block in the SAME turn; never commit without an explicit ask.
- **MUST ATTENTION** Every write mode then AUTO-RUNS the Codex mirror sync (`node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`) so `AGENTS.md` carries the overlay without a second user command — and reports the pipeline's real outcome, naming the failing stage when it fails. This is the ONE authorized programmatic sync; every other stale-mirror situation still asks the user.

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
**Judgement integrity:** For theory checks, judgements, evaluations and gap hunts, the prompt's premise is a hypothesis — test it AND its opposite with one evidence bar (web-verify external facts), why-review the draft as an inline self-check (run the `why-review` skill only for a formal review/audit/gap-hunt deliverable or a MEDIUM+/consequential issue the inline pass cannot settle), never invent findings or manufacture disagreement ("no material issues" is a valid verdict); end with a `Bias check:` line (`SYNC:judgement-integrity`).
## Common AI Mistake Prevention (System Lessons)

- **Resolve project applicability before using framework examples.** Read the project config and relevant references, then inspect local evidence; honor explicit N/A and never impose a language, framework, architecture layer, styling method, tool, or runtime surface the project does not use.
- **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
- **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
- **Re-read and re-verify after context compaction or resume.** Compaction wipes read state and memory; summaries describe intent, not environment state. Re-read before editing, audit current state (git status, files) before creating anything new, grep-verify sub-agent output — every "completed" claim is a hypothesis until evidence confirms it.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace every consumer before and after a change.** Map referencing files before deleting; after bulk replacements, renames, or extractions, grep ALL consumer file types (templates, configs, catalogs and generated files fail silently) for every old or removed name; trace the full dependency chain of an edited definition; update docs that embed canonical data alongside their source.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Sub-agents: inherit, cover, persist.** Sub-agents know only their agent .md definition — use custom agent types, not built-in Explore. Reconcile the union of assignments against the full target list — category splits miss boundary items. Make the report write the first deliverable, appended per file/section with bounded scope; a truncated run with no report → spawn a narrower scope, never the same prompt.
- **Ownership before action.** When investigating a failure, ask which part owns the behavior before changing anything. Trace the wrong state to the component responsible for its invariant, then make one authoritative correction there.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec if one exists (the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting any constant/limit/flag/cutoff, read comments, git blame, the CALLER's ordering (the guarantee usually runs immediately BEFORE the cited line), and 2+ sibling call sites. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, state) and verify each against evidence. Ask "what would falsify this?" — if nothing, it is not a hypothesis.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem: "Would this change exist if I were not addressing this request?" — if not, remove or disclose it; never silently expand scope.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort ("(1) [N h], (2) [N h]. Which matters?"), list assumptions, name a simpler path when one exists.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC: steel-man a rejected alternative, invert each reason ("what does it sacrifice?"), stress-test the top 2-3 assumptions, run a pre-mortem. Quality = causal reasoning + mitigations + evidence, not section presence.
- **OOM/memory: check row count before row size.** An unbounded query (no DB filter for the trigger) → push the filter to the DB; then large rows → projection. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** For async work (queues, retries, background jobs, caches, replication) assert the final business/entity state — NEVER delivery bookkeeping (consume/send status, attempt counts, last-error, broker/scheduler/outbox rows) that ANY co-running process can write: green alone, flaky once anything shares that broker + database. Gate: "would this hold no matter WHICH process did the work?" Process-local fault injection is a stress amplifier (arm → bounded window → disarm → assert convergence), never a precondition.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Judge the environment before judging the code — a competing hypothesis, not a fallback.** A bug, failed test, error, or odd output is NOT proof of a code defect. Before any verdict, sweep environment preconditions (toolchain/lockfile state, stale build/cache artifacts, env vars and config, service dependencies, ports/clock, OS path/locale, permissions, leftover processes/test data) AND transient resource pressure (RAM/OOM, CPU, disk/temp, handle and connection-pool limits, network, a timeout that is really slowness). Tell-tale: non-deterministic, fails only in parallel, on one machine or only on CI, or an error naming resources. Cite the discriminator you ran (clean environment? path changed? concurrency 1?) — a verdict without one is a guess. Fix an environment cause in the environment; NEVER edit product code or weaken/skip a test to absorb it; a failure that vanishes on retry stays unexplained until its mechanism is named.
- **Cross-platform execution is a required contract.** Before authoring or changing a tool, script, process launcher, path assertion, or filesystem test, name the supported Windows, macOS, and Linux behaviors. Use platform-neutral APIs and literal argv vectors; never infer shell, temp-path, executable-extension, ACL, or symlink semantics from the current host. A documented command gives its Windows, macOS, and Linux form (Python: `py -3` on Windows, `python3` on macOS/Linux; shell: PowerShell/`.cmd` beside POSIX `sh`) or one platform-neutral runner such as `node <script>`. Canonicalize existing paths before identity, hashing, or equality checks; test native Windows and POSIX seams when behavior differs; keep CI platform matrices authoritative. Preserve fail-closed security boundaries — repair the fixture or platform branch, never weaken the guard just to make one OS green.
- **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer must reference NO consumer-specific domain concept (tenant/customer/product IDs, business entities, feature rules); such a leak compiles, runs, and passes review while coupling the layer to one consumer. Push domain fields/logic down into the consumer via subclass/composition.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
