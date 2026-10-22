# ADR-0006: Knowledge Base — Two Planes, Generated Indexes and Pointer-Only Delivery

- **Status:** Accepted
- **Date:** 2026-10-21
- **Plan:** the approved knowledge-base plan of 2026-10-21 (decisions D1–D16, validated with the owner; kept with the local planning artifacts, outside the repository). This record carries the decisions that shape the design.
- **Spec:** `docs/specs/ContextDelivery/README.KnowledgeDelivery.md` (feature code KNW)
- **Supersedes:** None. The four existing knowledge documents (`.claude/docs/architecture-knowledge.md`, `.claude/docs/ai-engineering-knowledge.md`, `.claude/docs/design-knowledge.md`, `.claude/skills/performance-review/references/performance-knowledge.md`) and their current wiring stay as they are.

## Context

Subject knowledge already ships with the framework: four knowledge documents of about 409 KB in total. Each one needed its own wiring before an assistant would read it at the right time:

- a 293-line prompt router for AI-feature work (`.claude/hooks/ai-feature-route.cjs`);
- a hard-coded convention class for design (`.claude/hooks/lib/file-conventions.cjs:295`);
- pointers written into 16 of the 25 agent definitions for performance.

Adding a subject meant writing code. Projects had no home for their own subject knowledge either:

- `/learn` deliberately keeps only rules worth reading on every task;
- skill overlays are tied to one skill and capped at 4 KB;
- custom prompts run only when a person invokes them.

Three forces shape the design:

1. **Cost.** Context is paid for on every turn. Anything read on every task (`CLAUDE.md`, `lessons.md`) must stay small, and a native skill per subject would add a description to every session's skill listing, which is already full.
2. **Authority.** An assistant treats text in its context as guidance. Knowledge written from model memory, or imported from a web page, can be wrong or can carry planted instructions.
3. **Portability.** Hooks are dependency-free CommonJS, the framework is copied into projects of any layout, and three hosts deliver different hook events.

## Decision

1. **Packs, in two planes.** Knowledge lives in packs: a Markdown document whose frontmatter declares identity, kind, sources, a reviewed date, a review state and triggers, with a required digest of at most 1,500 characters and optional clauses with stable identifiers.
    - The framework plane lives in `.claude/knowledge-base/`.
    - The project plane defaults to `docs/knowledge-base/`. A `**Packs directory:**` header in the skill-managed `knowledge-base-reference.md` names it, which follows the overlay and custom-prompt registry pattern rather than adding a `docsRoots` key.
    - A stub pack registers an existing document in place.
2. **Generated indexes with a currency check.** Pack frontmatter is the only source of truth. A generator writes each plane's machine index (read by the hook) and reader list (read by people and agents), and `--check` fails when either is stale. Writes replace the index whole. When packs change by hand, the hook re-checks pack snapshots against disk on every event it handles and works from the packs as they are, without rewriting the stored index.
3. **Pointer-only delivery on three triggers.** One hook, `knowledge-route.cjs`, matches:
    - prompt phrases (whole words, the user's own text only, optional build/plan/review intent, silent on framework-maintenance prompts);
    - skill starts;
    - helper-agent roles.

    It delivers a pointer, never content: at most 3 packs and 700 characters per event, once per pack per window (re-armed by compaction, clear, or about 150k tokens), through the convention ledger's `deliverOnce`. **There is no file trigger.** The owner chose to add no process to every Read and Edit. Read telemetry uses a Read handler limited to pack paths by an `if` condition.

4. **Fixed precedence and trust labels.** Project reference docs and ADRs, then project packs, then framework packs, then model knowledge.
    - Every pointer frames pack content as reference material, not instructions, and states the precedence.
    - Packs sourced only from model knowledge are labelled unverified.
    - Imports stay unreviewed until a person reviews them.
    - Lines that instruct the assistant to bypass rules block a write.
5. **Defaults.** Skill and agent triggers are on. Prompt triggers are on by default only if a held-out evaluation passes: prompts written before the triggers, recall ≥0.90 and false delivery ≤0.05 per subject. Otherwise they ship off and opt-in. A `.ck.json` kill switch and an environment variable silence everything.
6. **Hookless fallback.** One generated Doc Lookup row in the root instructions points to the project index whenever that index exists (selected in `referenceDocs` or not, like the decisions folder), and that index also lists framework packs.

## Alternatives considered

| Alternative                                           | What it would have bought                                       | Why not                                                                                                                                           |
| ----------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| One native skill per subject                          | No routing code; host-native loading by description             | Every visible skill description is listed in every session, and the listing budget is already used; a pack is reference material, not a procedure |
| The agent reads the index on every task, with no hook | No code; works on every host                                    | Index tokens on every task, and misses prompts that never name the subject. Kept as the fallback route                                            |
| Embeddings or a vector store                          | Meaning-based matching                                          | A runtime dependency in a portable framework; keyword matching is enough at 30–300 packs                                                          |
| A hand-written registry table, like overlays          | No generator                                                    | Triggers are structured lists; parsing tables on every prompt is fragile; the generated JSON is read once per event                               |
| A file trigger inside `file-convention-inject.cjs`    | Pointers when code a pack covers is opened, at no extra process | The owner preferred no file axis at all; skill and prompt triggers cover the need                                                                 |
| Moving the existing documents into the new folder     | One location                                                    | Breaks 16 agent definitions, skill references and tests                                                                                           |

## Consequences

- **Adding a subject:** one pack file plus an index rebuild, with no code change. Adding a trigger kind touches at least seven places: the matcher (`knowledge-match.cjs`), the validator's trigger keys (`knowledge-pack.cjs`), the usage records (`knowledge-telemetry.cjs`, which records an unknown kind as `none`), the router's event handling (`knowledge-route.cjs`), the host registrations (`.claude/settings.json` and the Codex and OpenCode mappings) and the spec rules BR-KNW-09 and BR-KNW-20.
- **Hook cost:** one more hook process on the prompt, skill-start, agent-start and compaction (`SessionStart` with source `compact`) events, plus one on reads of pack files only.
- **Codex:** Codex never emits Read or Skill, so the skill-start trigger (except through `$skill` prompts) and read telemetry do not exist there. The spec's host table (BR-KNW-20) records this.
- **AI-feature route:** `ai-feature-route.cjs` and its spec stories (US-PFCI-10…12) are unchanged. Retiring it in favour of a registered pack is deferred until the evaluation covers that subject.
- **Deferred:** staleness tooling (review-by reminders) and packs shared across projects, both owned by the framework maintainers.

## Amendments

### 2026-10-22 — Two framework subject packs ship, unreviewed

- **Change:** besides the registered documents and the one example pack of D11, the framework plane ships two subject packs supplied by the framework maintainer: `distributed-systems` and `microservices-cost`.
- **Why kept:** the owner chose, in the 2026-10-22 review of the staged change, to keep them instead of moving them to a later change. D11's concern — upkeep and unverified value of textbook packs — is answered by shipping them `review: unreviewed`: every pointer labels them until a person checks them against primary sources. `microservices-cost` rests on one benchmark known through a secondary summary, so its figures are stated as that study's result, and its rule for splitting a service follows the measured-capacity protocol (organizational need, measured load or availability and fault isolation — never a speculative performance gain).
- **Limits:** they carry skill and helper-agent bindings only. Their prompt phrases were removed because no held-out evaluation measured those subjects, and the recorded prompt-trigger default covers only evaluated phrases (BR-KNW-11). With `architecture` they fill the three delivery slots of the `architect` role; `build` and `check` warn when a fourth pack binds it (BR-KNW-06).

### 2026-10-22 — Team settings layer for the knowledge router

- **Change:** `knowledgeRoute` (`enabled`, `promptTriggers`) is also read from the project config, between the framework-shipped `.claude/.ck.json` and the checkout's `.claude/.ck.local.json`; later wins, and `CK_KNOWLEDGE_ROUTE=0` overrides all three.
- **Why:** a framework refresh replaces `.claude/.ck.json`, which would silently drop a project's kill switch or prompt-trigger opt-in. The project config is project-owned, the same reason the `contextDelivery` team default lives there.
- **Scope:** the layer is an opt-in of `loadRouterSettings` that only this router takes. The other routers still read the two `.ck` files; moving them is a separate follow-up.

### 2026-10-22 — Flagged-line detection is a heuristic

- **Change:** the detector also flags piping a fetched script into a shell, putting credentials into a reply or a request, pushing straight to the main line and claims to be system instructions. A quoted ignore-earlier-instructions or system-instructions phrase counts as a mention only after a mention cue ("such as", "attackers write" …) and with nothing outside the quotes asking the reader to act; a warning is exempt only when its negation governs the step's own verb, and only for the clauses that negation opens. The document a stub refers to is checked too: its flagged lines warn and label the pack `flagged lines` instead of blocking.
- **Why:** pattern matching cannot recognise every instruction a page can plant. The control is the person's confirmed review of each draft, and imports stay unreviewed until then (BR-KNW-13, BR-KNW-16). Referred documents are existing references that quote and describe attacks (the shipped `ai-engineering` document among them); blocking on them would refuse a stub over wording its author may not own, so they warn and label instead.
- **Index hardening:** a stored index entry whose shape is damaged, or whose title or description fails the pack's own prose rule (one check, used by pack validation on the parsed value and by the stored-entry check), is not served as written; the plane is rebuilt in memory from its packs (BR-KNW-08). A pack file now linked outside its plane is not served from a current-looking index (BR-KNW-02).
