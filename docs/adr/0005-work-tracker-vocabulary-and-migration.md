# ADR-0005: Work Tracker Vocabulary, Read-Only Old Projects and Explicit Migration

- **Status:** Accepted
- **Date:** 2026-10-07
- **Plan:** `plans/goals/261007-task-track-vocabulary/goal.md` (goal contract and the owner's vocabulary choices); implementation plan `plans/261007-work-tracker-vocabulary/plan.md`.
- **Spec:** `docs/specs/WorkTracking/README.TaskTracking.md` (feature code TPT): BR-TPT-30, FR-TPT-056/057, AC-TPT-37/38, cases TC-TPT-242…252 in `README.TaskTracking-Part7.md`
- **Supersedes:** None. This ADR **extends** ADR-0001 → "Built-in Name Collision Renames (2026-09-29)" with a second direct-rename path (see Decision 6).

> Historical decision: the original sections and 2026-10-07/08 amendments describe vocabulary1→2 and are retained as history. The dated 2026-10-09 supersession below owns the current vocabulary3 interpretation; historical approval is not approval of every later implementation.

## Context

### Why the words change

The work tracker and the skills around it use Scrum words: PBI, epic, backlog, idea. The owner wants plain words instead: task, project, planned, initiative. The change covers stored records, record locations, command output, the local workspace, the status report, templates, skills, workflows, docs and the spec. Story and vision stay as they are. The estimate unit and the sprint field changed with the skills and templates; see [Amendments](#amendments).

| Concept                                          | Old word                                               | New word                                                             |
| ------------------------------------------------ | ------------------------------------------------------ | -------------------------------------------------------------------- |
| Delivery unit that counts toward progress (kind) | `pbi`                                                  | `task`                                                               |
| Supporting work with no delivery credit (kind)   | `task`                                                 | `subtask`                                                            |
| Captured intent (kind)                           | `idea`                                                 | `initiative`                                                         |
| Finite group (kind)                              | `epic`                                                 | `project`                                                            |
| Group purpose                                    | `initiative`                                           | `program`                                                            |
| Lifecycle state                                  | `backlog`                                              | `planned`                                                            |
| Link relation                                    | `idea`                                                 | `initiative`                                                         |
| Folders                                          | `pbis/`, `tasks/`, `ideas/`, `epics/`, `pbis/stories/` | `tasks/`, `subtasks/`, `initiatives/`, `projects/`, `tasks/stories/` |

### Why this is not a plain rename

A record's kind comes from two signals that must agree: the folder it sits in and the stored `tracking.kind` (`.claude/hooks/lib/task-artifact-store.cjs:146-147`, `:54`; folders at `.claude/hooks/lib/task-tracking-config.cjs:13`). A legacy record with no stored kind takes its kind from the folder alone.

The new vocabulary reuses two old words with a different meaning:

1. **`task`.** Old `task` is supporting work that earns no delivery credit. New `task` is the delivery unit that counts. Both the folder (`tasks/`) and the stored value (`task`) collide. Looking at one record, nothing says which meaning it has. Guessing wrong moves a record in or out of the progress denominator.
2. **`initiative`.** Old `initiative` is a group purpose. New `initiative` is a record kind. The values live in different fields, so they do not collide in storage, but they collide in every sentence a person reads.

Projects that adopted the tracker already hold records in the old words, and the goal requires those projects to keep reading correctly with the same progress numbers.

### What the code already gives us

- Request, configuration and record versions are each rejected when they are not `1` (`.claude/hooks/lib/task-tracking.cjs:70`, `.claude/hooks/lib/task-tracking-config.cjs:66`, `.claude/hooks/lib/task-artifact-store.cjs:54`). A version bump therefore fails closed without new machinery.
- A read pinned to a shared revision loads the configuration from that revision, so a marker stored in the project configuration travels with history.
- Skill names `subtask` and `tasks` are on the built-in name guard (`.claude/scripts/codex/tests/skill-builtin-names.test.mjs`). `task`, `initiative` and `project` are not, but no skill takes those names (see Decision 6).

## Decision

### 1. One project-level vocabulary marker

A project declares which vocabulary its stored records use: `taskTracking.schemaVersion` `1` means the old words, `2` means the new words. A project with no tracker configuration is inferred from the folders it holds: a folder that exists only in the old vocabulary (`pbis/`, `ideas/`, `epics/`) means old; a folder that exists only in the new one (`subtasks/`, `initiatives/`, `projects/`) means new. An unconfigured project holding folders from both families is refused, not counted.

The vocabulary is a property of the project, never of one record. Each record also carries a stamp (`tracking.schemaVersion` `2`) written by migration and by every new save. The stamp is a cross-check, not a second source of truth: in a project declared new, a record stamped `1`, or one sitting in an old-only folder, is flagged and left out of the counts (for example a file merged in from an older branch). A file with no tracker metadata carries no stamp either way and stays adoptable: migration leaves such files unstamped, so flagging every unstamped record would drop them and break the conserved counts. The cost is one blind spot: an untracked old supporting file that later lands in `tasks/` is read as a task.

### 2. One vocabulary owner

One module owns both word sets and the map between them: kinds, folders, states, group purposes and link relations. The exported constants (`KINDS`, `FOLDERS`, `GROUP_ROLES`, `STATES`, link roles) become the new words. Nothing else in the tracker spells an old word.

The reader turns an old project into the new words as it loads. In memory there is one vocabulary, so the workspace, the status report and command output show the new words for every project, and the progress arithmetic is untouched.

### 3. Old projects are readable and read-only

A project in the old vocabulary is fully readable, in the new words, with identical total, accepted, remaining and eligible work. Every save is refused with `MIGRATION_REQUIRED` and automatic upkeep is skipped. Nothing is written to an old project until it is migrated. (Owner decision.)

A project that cannot be read at all, because it holds both vocabularies or an unfinished migration, gets no status report: the request is refused with that project's own outcome (`MIXED_VOCABULARY` or `MIGRATION_IN_PROGRESS`) and the report made before is kept.

### 4. A save request written for the old vocabulary is refused

The save request version moves to `2`. A request at version `1` is refused by the existing version check. It is never reinterpreted, because `task` in an old request and `task` in a new one name different kinds.

### 5. Migration is explicit, journaled and one-way

`migrate` is its own action with a dry run. It never runs as a side effect of a read, a save or upkeep.

- **Preconditions.** The project is in the old vocabulary, uses the portable profile, is fully inspectable, has no unfinished deletion recovery, and none of the destination folders exists. In a Git checkout the record root holds no uncommitted or untracked file and the project configuration, when its declaration will be rewritten, has no uncommitted change (`RECORD_ROOT_NOT_CLEAN` names which); when Git cannot answer, the refusal `VERSION_CONTROL_UNAVAILABLE` is worded by its cause (no answer in time, too much output, `git` missing, `git` failed). Otherwise it is refused and nothing changes. A project outside any checkout, and a record root or configuration that Git ignores, are allowed: the preview says version control cannot restore them. Before the first write it captures total, accepted, remaining and eligible identities.
- **Journal.** It runs under the writer lock and keeps a durable progress record in the artifacts root. While that record exists every read and write returns `MIGRATION_IN_PROGRESS`, and running `migrate` again completes the work from the recorded step.
- **Abandoning.** An unfinished migration can be given up instead of completed, and only by an explicit request: `migrate --abandon`. The disk cannot tell a person who restored the project and wants out from one who wants to finish, and before the first folder has moved a restore changes nothing at all, so intent is never inferred. Every interrupted or failed result states the steps: restore the record root and the project configuration from version control or a backup, remove the folders the migration created, in `tasks/` keep the restored old records and remove only what moved in from `pbis/`, then run `migrate --abandon`. In every state the migration can have stopped in, that request checks that the old project is back whole (every old folder that held a record present, nothing the migration created left, the declaration not current, every record readable as old, conserved values equal to the capture), removes only the progress record and answers `abandoned` / `MIGRATION_ABANDONED`. Not whole, it answers `interrupted` / `RESTORE_INCOMPLETE`, lists what is not back or still remains and changes nothing. It never deletes or moves a folder; with no progress record it answers `current` / `NOTHING_TO_ABANDON`; with `--dry-run` it is refused. A plain `migrate` never abandons. It completes, and when the disk contradicts the progress record (a moved folder is back, or the declaration reads old again) it answers `interrupted` / `RESTORED_FROM_OUTSIDE`, changes nothing and names both ways on: the abandon steps, and what to undo so that a further plain run completes. An interruption alone never looks restored, because the migration puts nothing back, so a plain rerun still completes. A progress record that cannot be read or was not written by this migration (`INVALID_MIGRATION_RECORD`) is acted on by neither form: after a restore the person sets it aside by hand. (Owner decision by delegation, 2026-10-07.)
- **Order.** `tasks/` → `subtasks/` first, then `pbis/` → `tasks/` into the freed name, then `ideas/` → `initiatives/` and `epics/` → `projects/`. Stories move with their parent folder.
- **Rewrite.** Only tracker-owned stored values change: kind, current state, states in history, group purpose, link relation, link paths into moved folders, and the kind and owner path in saved receipts. Each record gets the stamp. A stored link path that differs from a moved folder only in letter case is mapped with the folder where the disk ignores case; where it does not, it names another folder, is left as written and is listed in the preview and the result.
- **Never touched.** Authored body, title, intent, reasons, identities, file names, members, the health owner, operation identities, actors, timestamps and revision.
- **Finish.** It sets the project marker to `2` and renames the `initiative` label key to `program`, wherever the project configuration sits, the checkout root included. It rereads the project, checks that total, accepted, remaining and eligible identities equal the captured values, and only then removes the journal; a difference is reported as failed with the journal kept.
- **Not conserved, and said.** A proof names the location and content of the record it was checked against, so work linked to a moved or rewritten record stops being currently verified. The preview (by rehearsing the rewrite in memory) and the result name the items whose verification goes stale, the items that leave the ready list and the items newly held by a prerequisite that is no longer verified. No proof is altered; each named item needs a new observation.
- **One-way.** Stored history states are rewritten too. Rollback is restoring the earlier version from version control or a backup. (Owner decision.)

Existing record identities and file names never change. Only the convention for new identities changes. After migration no stored value uses an old word.

### 6. Skills and workflows are renamed directly, with no alias

| Old name                              | New name                                     |
| ------------------------------------- | -------------------------------------------- |
| `/pbi`                                | `/work-item` (modes unchanged)               |
| `/idea`                               | `/initiative`                                |
| `workflow-idea-to-pbi`                | `workflow-initiative-to-task`                |
| `workflow-spec-to-pbi`                | `workflow-spec-to-task`                      |
| `workflow-idea-to-spec`               | `workflow-initiative-to-spec`                |
| `pbi-template.md`, `idea-template.md` | `task-template.md`, `initiative-template.md` |
| `releasable-pbi-contract.md`          | `releasable-task-contract.md`                |

`/pbi` becomes `/work-item`, not `/task`: the skill refines tasks and slices stories, so a kind name would be too narrow, and `/task` sits next to the built-in `tasks` and `subtask` names. The record kind is still `task`. (Owner decision.)

**How this extends ADR-0001.** ADR-0001 lets a skill be renamed directly only when its old name collides with a Claude Code built-in; every other removal goes through deprecate-then-GC. This ADR adds a second direct-rename path, for a **vocabulary retirement**, under these conditions:

1. The old name carries a word the owner has retired from the framework's vocabulary, and an ADR records that retirement.
2. The skill keeps its capability under the new name. A rename, never a removal.
3. Every framework consumer is updated in the same change.
4. The renamed skill carries a `Renamed: formerly …` note, and the adopter table in `.claude/config/README.md` → "Renamed skills — migrating an adopting project" gains the old → new row.

A deprecated shim under the old name is wrong here for the same kind of reason ADR-0001 gives for built-in collisions: the shim would keep the defect alive. An old `/pbi` shim would keep the retired word in every skill listing, and a stale copy of the old skill would keep producing version-1 save requests that mean something else. With no alias, a stale copy fails closed at the request version check and the person is told to move. ADR-0001's other rules are unchanged: a removal with no successor still goes through deprecate-then-GC.

## Consequences

**Positive**

- One vocabulary in memory. The workspace, report and command output need no per-project branching.
- Progress numbers cannot change through the rename: reading maps words only, and migration ends by proving the numbers equal.
- Old code is small and removable: one alias table, one marker branch, one action.
- A stale skill, a stale request or a half-migrated project is refused with a named outcome. None of them is guessed at.

**Negative / accepted costs**

- **Adopting projects are read-only until they migrate.** After upgrading the framework, a project cannot save tracker work, and automatic upkeep stops, until someone runs the migration. Adopters pay this once per project, on upgrade day.
- **History is rewritten, one-way.** Stored history states change from `backlog` to `planned`. Version control keeps the earlier bytes; the tracker does not.
- **Currently verified work drops at migration.** Work whose proof points at a moved or rewritten record must be verified again; the preview names it first. Accepted, total, remaining and eligible work are unaffected.
- **Migration is a large rename in version control.** Every record file moves or changes in one change set. Branches cut before the migration will conflict or bring old records back; those records are flagged and not counted until they are fixed by hand.
- **Stale copies of old skills fail closed.** A project that keeps an old `/pbi` or `/idea` copy gets a refusal, not a redirect.
- **One case inference cannot see.** An unconfigured old project that holds only `tasks/` (old supporting work, no `pbis/`, `ideas/` or `epics/`) looks exactly like a new project holding only delivery tasks. It would be read as new and its supporting work would count as delivery. The fix is manual: declare `taskTracking.schemaVersion: 1` in the project configuration before upgrading, then migrate. The adopter upgrade notes must say so.
- **Vocabulary collides with existing prose.** "Project" already means the selected working copy, and "initiative" used to mean a group purpose. Docs and spec need care during the sweep so each sentence has one meaning.

**Trade-off assessment**

| Decision                                   | Sacrifices                            | Gain                                                 | Who pays, when                | Verdict  | Material? | Confirmed?                                                                        |
| ------------------------------------------ | ------------------------------------- | ---------------------------------------------------- | ----------------------------- | -------- | --------- | --------------------------------------------------------------------------------- |
| Old projects read-only until migrated      | Saving in an un-migrated project      | No reverse map; one write path                       | Adopters, on upgrade          | WORTH IT | Yes       | Yes, owner                                                                        |
| Rewrite history states, one-way            | In-tracker rollback                   | No stored value in old words; one vocabulary forever | Adopters, at migration        | WORTH IT | Yes       | Yes, owner                                                                        |
| `/pbi` → `/work-item`, no alias            | Old command name; muscle memory       | Retired word gone; stale copies fail closed          | Skill users, on upgrade       | WORTH IT | Yes       | Yes, owner (name); no-alias rule recorded here                                    |
| Infer vocabulary for unconfigured projects | One undetectable case (only `tasks/`) | Unconfigured projects keep working with no setup     | The rare adopter in that case | WORTH IT | Yes       | Yes — owner accepted inference at plan approval (2026-10-07)                       |
| Abandon only by explicit request           | One more command option               | Intent is never inferred from the disk               | Maintainer, once              | WORTH IT | Yes       | Yes, owner by delegation (2026-10-07); inferring it from disk rejected            |

## Alternatives Considered

- **Detect the vocabulary per record (alias on read).** Rejected. `task` is undecidable: the same folder name and the same stored value mean supporting work in one vocabulary and delivery in the other. A record with no stored kind has only its folder to go on. A wrong guess silently changes the progress denominator.
- **Let old projects be written in the old words.** Rejected. It needs a reverse map on every write path and doubles the surface to test (requests, receipts, history, links, upkeep), and it keeps both vocabularies alive with no end date. The owner chose read-only.
- **Keep history as written and map it on read.** Rejected. Stored history would hold `backlog` forever, so the alias table could never be deleted and every history reader would need the map. The owner chose to rewrite.
- **Migrate implicitly on first save or first read.** Rejected. The spec forbids implicit migration (BR-TPT-02), and a silent rename of every record file inside an unrelated save is the kind of surprise that rule exists to prevent.
- **Keep deprecated aliases for the old skill names (ADR-0001's normal path).** Rejected. A shim keeps the retired word visible, and the old skill body produces requests in the old vocabulary. See Decision 6.
- **Name the skill `/task`.** Rejected by the owner in favour of `/work-item`.

## Removing the old vocabulary later

When no supported project is expected to hold old-vocabulary records, remove in one change:

1. the old word set and alias map in the vocabulary owner;
2. the marker branch that accepts `taskTracking.schemaVersion: 1` and the folder inference for the old family (version `1` then fails like any unsupported version);
3. the `migrate` action, its journal handling and the `MIGRATION_REQUIRED` / `MIGRATION_IN_PROGRESS` / `RESTORE_INCOMPLETE` / `RESTORED_FROM_OUTSIDE` / `MIGRATION_ABANDONED` / `NOTHING_TO_ABANDON` outcomes;
4. the matching spec cases (TC-TPT-242…251), marked deprecated, not deleted.

The stamp check and case TC-TPT-252 stay. Removal needs its own decision: a project that never migrated loses its read path.

## Revisit triggers

- An adopter cannot migrate (a native profile, or records the tracker cannot fully inspect) and needs to save. That reopens "read-only until migrated".
- Claude Code adds a built-in named `work-item`, `initiative` or `project`.
- A second vocabulary change is asked for. The marker then needs a version per vocabulary, and migration needs to chain.

## Implementation Notes

- Current constants: `KINDS`, `GROUP_ROLES`, `FOLDERS` in `.claude/hooks/lib/task-tracking-config.cjs:10-13`; `STATES` and link roles in `.claude/hooks/lib/task-tracking-policy.cjs:8-9`.
- Version checks to move: request `.claude/hooks/lib/task-tracking.cjs:70`; configuration `.claude/hooks/lib/task-tracking-config.cjs:66`; record `.claude/hooks/lib/task-artifact-store.cjs:54`.
- Report wording changes need a renderer version bump only.
- Order of work: vocabulary owner, reader and write refusal first; migration after that; workspace and report wording alongside migration; skills, workflows and templates with a single writer for `.claude/workflows.json` and `.claude/skills/shared/sync-inline-versions.md`; spec sweep, docs, provenance map and mirror sync last.
- The spec rule and planned cases are written before the code. The old words in the rest of the spec, and its `CoveredBy` titles, are renamed with the code in one sweep.

## Related

- `docs/adr/0001-skill-lifecycle.md` → "Built-in Name Collision Renames (2026-09-29)": the rule this ADR extends.
- `docs/specs/WorkTracking/README.TaskTracking.md`: BR-TPT-02 (no automatic migration), BR-TPT-27 (group purpose), BR-TPT-30 (vocabulary and migration).
- `docs/specs/WorkTracking/README.TaskTracking-Part7.md`: TC-TPT-242…252.
- `.claude/config/README.md` → "Renamed skills — migrating an adopting project".

## Amendments

### 2026-10-07 — estimate unit renamed to effort points; sprint field dropped from new records

The Context first said the sprint field and story-points wording stay as they are. The same change set retired both from the skills and templates, for the reason this ADR opens with: the owner wants plain words instead of Scrum words. The Context sentence is corrected and this entry records the decision. (Owner decision; reason confirmed 2026-10-07.)

- **Estimate unit.** Skills, agents and the commit estimate line say effort points (EP), and the task and story templates the skills ship write `effort_points`. The estimation protocol `SYNC:estimation-framework` (`.claude/skills/shared/sync-inline-versions.md`) owns the rule; the readiness checklist `SYNC:refinement-dor-checklist` names the same unit.
- **Existing estimates.** An artifact or commit that already carries `story_points` is not rewritten. A reader takes `effort_points` first and falls back to an authored `story_points` value.
- **Sprint field.** The task template and the story template no longer carry a `sprint` field.
- **Guard.** A shipped work-record template that carries `story_points` or `sprint` fails TC-ARS-001 (`.claude/hooks/tests/suites/task-tracking-authored-records.test.cjs`).
- **Tracker unaffected.** The tracker owns neither field. Reading and migration (Decision 5) leave an estimate or sprint value a record already carries as written; BR-TPT-30 states this.

### 2026-10-08 — a fourth group purpose, and project display labels for kinds

An adopter that tracks products, their domains, feature groups and cross-product programs could not name four levels with three purposes: products and domains both read as Area. Its readers also met the word initiative with two meanings, because their earlier tracker used it for a coordinated outcome. (Owner decisions; confirmed 2026-10-08. Plan: `plans/261008-0935-task-track-report-and-taxonomy/plan.md`.)

- **Fourth purpose.** `domain` joins `area`, `capability` and `program` as a group purpose with the default label Domain. It is descriptive only, like the other three, and enforces no nesting. The change is additive: the vocabulary version does not change and no migration runs. The earlier-vocabulary purpose list is derived from the current one, so it gains the same word.
- **Why built in.** Letting each project declare its own purposes was considered and not chosen: a closed list keeps every project's choices the same and needs the least code. The cost is that the next level word is another framework change. Revisit if a second request for a new level word arrives.
- **Kind display labels.** A project may declare a display label per kind, as it already can per group purpose. Labels are display text only: stored kinds, identities, record locations, link relations, requests and results keep the vocabulary words. A label equal to a word or default label of either vocabulary other than that kind's own (a kind, a state, a group purpose or a link relation), or equal to another kind's label, is refused, so a label cannot recreate the collision this ADR removed. The link relation that carries a kind's word is displayed under that kind's label; the stored relation word does not change. This narrows Decision 2: stored and exchanged words stay one vocabulary, while displayed words may differ per project.
- **Not adopted.** Switching a kind off by project configuration (records are read from their locations whatever the configuration says, and shipped workflows produce initiatives); an operation that changes a record's kind (a one-time adopter migration); a `feedback` purpose.
- **Compatibility.** A framework copy older than this change flags a group that stores `domain` as an invalid record and refuses a project configuration that carries a `domain` label or kind labels. Teams update every copy before using either.
- **Spec.** BR-TPT-27, BR-TPT-30 and the new BR-TPT-33; the existing purpose cases TC-TPT-211 and TC-TPT-231, and the new TC-TPT-261 in `README.TaskTracking-Part8.md`.

### 2026-10-09 — current-contract supersession for vocabulary3

**Provenance and scope.** The current-change review adjudicates the coherent current runtime, CLI/manual authoring contracts and existing assertion intents as vocabulary3. The 261007 vocabulary plan and 261008 group-label amendment remain evidence of their historical decisions; they are not silently rewritten as if they selected this later model. This amendment records the review’s current-contract decision, subject to the coordinator’s validation/application; it claims neither a fresh human product approval nor an executed migration or test result.

**Superseded current semantics.** Current kinds are initiative/task/story/subtask/area. Organizational affiliation belongs on the tagged record as area/initiative tags, replacing current project/vision member-list writes and purpose-only edits. Area level is optional application/product/module/feature, with acyclic multiple direct parents and direct stated-level ordering. Initiatives own type feedback/idea/initiative (default idea), optional priorityLevel and deadline, and a person-decided Draft/Approved/Committed/Done/Canceled lifecycle. Areas use Active/Canceled. Delivery lifecycles and applicable proof/acceptance remain distinct. Due/overdue is a read-date fact, not delivery credit.

**Compatibility and migration decision.** Supported earlier vocabulary2 remains readable without saving through the same pure mapping used by explicit migration. First vocabulary1 is unsupported and refused by name; this change adds no first-version conversion. Explicit protected2→3 migration conserves authored content, identities and exact eligible/accepted/remaining task sets, maps former memberships to owner tags, discloses organizational-edge/level and current-standing changes, and requires clean restorable owned Git paths or the person’s actual confirmed backup where Git cannot restore. Interrupted work requires safe explicit continuation or whole restoration then explicit abandonment. No real user record migration, new migration mechanism or migration test creation is authorized by this documentation repair.

**Trade-offs.** Record-owned tags let independent work owners affiliate without rewriting a shared group, at the cost of deriving scope from tagged records and needing complete coverage. Area transitivity and initiative directness express enduring organization versus finite intent, at the cost of requiring their differing scope meanings to remain visible. Independent initiative decisions preserve human commitment semantics while task evidence continues to own delivery. A one-way migration and unsupported first1 avoid guessed meaning; older users need an explicit supported upgrade/recovery path and an actual restore point.

**Canonical repair and evidence.** `docs/specs/WorkTracking/README.TaskTracking.md` §§3–7 and Parts6–9 own the current contract. Existing cases242–262 are amended by intent; six business cases263/268/272/275/278/326 are added, while202/231 remain deprecated historical bodies. Technical-only assertions remain technical evidence and do not inflate business cardinality. Primary annotations, CoveredBy, provenance and generated indexes must reconcile atomically before claiming complete traceability; all current cases remain Untested until actual execution. Revisit when a declared scope cannot conserve task sets, current compatibility is ambiguous, or the implementation/owner contract diverges.
